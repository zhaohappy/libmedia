/*
 * libmedia aac decoder
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import AVStream from '../AVStream'
import { AVIFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from '../avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as array from 'common/util/array'
import { MPEG4Channels, MPEG4SamplingFrequencies, avCodecParameters2Extradata } from '../codecs/aac'

const enum FrameType {
  ADIF,
  ADTS
}

const PACKET_SIZE = 1024

export default class IAacFormat extends IFormat {

  public type: AVFormat = AVFormat.AAC

  private frameType: FrameType
  private fileSize: int64
  private currentPts: int64

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    this.currentPts = 0n
  }

  private async estimateTotalBlock(formatContext: AVIFormatContext) {
    let duration = 0
    const now = formatContext.ioReader.getPos()
    while (true) {
      try {
        const nextFrame = await formatContext.ioReader.peekBuffer(7)
        const aacFrameLength = ((nextFrame[3] & 0x03) << 11)
          | (nextFrame[4] << 3)
          | ((nextFrame[5] & 0xE0) >>> 5)
        const numberOfRawDataBlocksInFrame = nextFrame[6] & 0x03
        duration += (numberOfRawDataBlocksInFrame + 1)
        await formatContext.ioReader.skip(aacFrameLength)
      }
      catch (error) {
        break
      }
    }

    await formatContext.ioReader.seek(now)

    return duration
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const signature = await formatContext.ioReader.peekBuffer(4)

    this.fileSize = await formatContext.ioReader.fileSize()

    // ADIF
    if (signature[0] === 65 && signature[1] === 68 && signature[2] === 73 && signature[3] === 70) {
      const stream = formatContext.createStream()
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
      this.frameType = FrameType.ADIF
    }
    // ADTS
    else if (signature[0] === 0xff && (signature[1] & 0xf0) === 0xf0) {
      this.frameType = FrameType.ADTS
      const stream = formatContext.createStream()
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO

      const nextFrame = await formatContext.ioReader.peekBuffer(7)

      const profile = (nextFrame[2] & 0xC0) >>> 6
      const samplingFrequencyIndex = (nextFrame[2] & 0x3C) >>> 2
      const channelConfiguration = ((nextFrame[2] & 0x01) << 2) | ((nextFrame[3] & 0xC0) >>> 6)

      stream.codecpar.profile = profile + 1
      stream.codecpar.sampleRate = MPEG4SamplingFrequencies[samplingFrequencyIndex]
      stream.codecpar.chLayout.nbChannels = MPEG4Channels[channelConfiguration]
      if (defined(API_OLD_CHANNEL_LAYOUT)) {
        stream.codecpar.channels = MPEG4Channels[channelConfiguration]
      }
      const extradata = avCodecParameters2Extradata(stream.codecpar)
      stream.codecpar.extradata = avMalloc(extradata.length)
      memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
      stream.codecpar.extradataSize = extradata.length
      stream.timeBase.den = stream.codecpar.sampleRate
      stream.timeBase.num = 1

      stream.duration = avRescaleQ(
        static_cast<int64>((await this.estimateTotalBlock(formatContext)) * 1024 / stream.codecpar.sampleRate * AV_TIME_BASE),
        AV_TIME_BASE_Q,
        stream.timeBase
      )
    }
    else {
      return errorType.DATA_INVALID
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream: AVStream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
    })

    try {
      const now = formatContext.ioReader.getPos()
      let nextFrame: Uint8Array

      if (this.frameType === FrameType.ADIF) {
        nextFrame = await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.fileSize - now)))
      }
      else if (this.frameType === FrameType.ADTS) {
        const header = await formatContext.ioReader.readBuffer(7)

        const protectionAbsent = header[1] & 0x01

        const aacFrameLength = ((header[3] & 0x03) << 11)
          | (header[4] << 3)
          | ((header[5] & 0xE0) >>> 5)

        const numberOfRawDataBlocksInFrame = header[6] & 0x03

        let adtsHeaderLength = protectionAbsent === 1 ? 7 : 9
        let adtsFramePayloadLength = aacFrameLength - adtsHeaderLength

        if (adtsHeaderLength === 9) {
          await formatContext.ioReader.skip(2)
        }

        const duration = avRescaleQ(
          static_cast<int64>((numberOfRawDataBlocksInFrame + 1) * 1024 / stream.codecpar.sampleRate * AV_TIME_BASE),
          AV_TIME_BASE_Q,
          stream.timeBase
        )
        avpacket.duration = duration

        nextFrame = await formatContext.ioReader.readBuffer(adtsFramePayloadLength)
      }

      const data = avMalloc(nextFrame.length)
      memcpyFromUint8Array(data, nextFrame.length, nextFrame)
      addAVPacketData(avpacket, data, nextFrame.length)
      avpacket.dts = avpacket.pts = this.currentPts

      avpacket.pos = now
      avpacket.streamIndex = stream.index
      avpacket.timeBase.den = stream.timeBase.den
      avpacket.timeBase.num = stream.timeBase.num
      this.currentPts += avpacket.duration

      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return formatContext.ioReader.error
    }
  }

  @deasync
  private async syncFrame(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 3

    while (true) {
      try {
        const word = (await formatContext.ioReader.peekUint16()) >>> 4
        if (word === 0xfff) {
          pos = formatContext.ioReader.getPos()
          const header = await formatContext.ioReader.peekBuffer(7)
          const aacFrameLength = ((header[3] & 0x03) << 11)
          | (header[4] << 3)
          | ((header[5] & 0xE0) >>> 5)

          if (aacFrameLength > 500 * 1024) {
            await formatContext.ioReader.skip(1)
            continue
          }

          await formatContext.ioReader.skip(aacFrameLength)
          let count = 0

          while (true) {
            if (count === analyzeCount) {
              break
            }
            const word = (await formatContext.ioReader.peekUint16()) >>> 4
            if (word === 0xfff) {
              count++
              const header = await formatContext.ioReader.peekBuffer(7)
              const aacFrameLength = ((header[3] & 0x03) << 11)
                | (header[4] << 3)
                | ((header[5] & 0xE0) >>> 5)
              if (aacFrameLength > 500 * 1024) {
                break
              }
              await formatContext.ioReader.skip(aacFrameLength)
            }
            else {
              break
            }
          }
          if (count === analyzeCount) {
            break
          }
        }
        await formatContext.ioReader.skip(1)
      }
      catch (error) {
        break
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    if (this.frameType === FrameType.ADTS) {
      const now = formatContext.ioReader.getPos()
      if (flags & AVSeekFlags.BYTE) {

        const size = await formatContext.ioReader.fileSize()

        if (size <= 0n) {
          return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
        }

        if (timestamp < 0n) {
          timestamp = 0n
        }
        else if (timestamp > size) {
          timestamp = size
        }
        await formatContext.ioReader.seek(timestamp)

        if (!(flags & AVSeekFlags.ANY)) {
          await this.syncFrame(formatContext)

          if (stream.duration && this.fileSize) {
            this.currentPts = timestamp / this.fileSize * stream.duration
          }
        }
        return now
      }
      else {
        if (stream && stream.sampleIndexes.length) {
          let index = array.binarySearch(stream.sampleIndexes, (item) => {
            if (item.pts > timestamp) {
              return -1
            }
            return 1
          })
          if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 5000n) {
            logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
            await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
            this.currentPts = timestamp
            return now
          }
        }

        logger.debug('not found any keyframe index, try to seek in bytes')

        if (stream.duration) {
          await formatContext.ioReader.seek(0n)
          let pts = 0n
          while (true) {
            try {
              if (pts >= timestamp) {
                this.currentPts = pts
                return now
              }
              const nextFrame = await formatContext.ioReader.peekBuffer(7)
              const aacFrameLength = ((nextFrame[3] & 0x03) << 11)
                | (nextFrame[4] << 3)
                | ((nextFrame[5] & 0xE0) >>> 5)
              const numberOfRawDataBlocksInFrame = nextFrame[6] & 0x03
              const duration = avRescaleQ(
                static_cast<int64>((numberOfRawDataBlocksInFrame + 1) * 1024 / stream.codecpar.sampleRate * AV_TIME_BASE),
                AV_TIME_BASE_Q,
                stream.timeBase
              )
              pts += duration
              await formatContext.ioReader.skip(aacFrameLength)
            }
            catch (error) {
              return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
            }
          }
        }
        else {
          return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
        }
      }
    }
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
