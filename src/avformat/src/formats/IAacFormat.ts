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

import type { AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'
import LATM2RawFilter from '../bsf/aac/LATM2RawFilter'
import * as id3v2 from './mp3/id3v2'

import { memcpyFromUint8Array } from '@libmedia/cheap'

import {
  AVFormat,
  AVSeekFlags,
  IOFlags,
  AVMediaType,
  AVCodecID,
  type AVPacket,
  type AVStream,
  avMalloc,
  addAVPacketData,
  addAVPacketSideData,
  AVPacketFlags,
  NOPTS_VALUE,
  NOPTS_VALUE_BIGINT,
  AVPacketSideDataType,
  avRescaleQ,
  errorType
} from '@libmedia/avutil'

import {
  AV_MILLI_TIME_BASE_Q,
  AV_TIME_BASE,
  AV_TIME_BASE_Q,
  aac
} from '@libmedia/avutil/internal'

import {
  array,
  concatTypeArray,
  logger,
  is
} from '@libmedia/common'

import {
  IOError,
  BitReader
} from '@libmedia/common/io'

const enum FrameType {
  ADIF,
  ADTS,
  LATM
}

const PACKET_SIZE = 1024

export default class IAacFormat extends IFormat {

  public type: AVFormat = AVFormat.AAC

  private frameType: FrameType
  private fileSize: int64
  private currentPts: int64

  private latmFilter: LATM2RawFilter

  private encodeSampleRate: int32
  private currentPos: int64
  private pendingData: Uint8Array
  private firstFramePos: int64
  private pendingPos: int64
  private streamMuxConfig: {
    profile: number
    sampleRate: number
    channels: number
  }

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    this.currentPts = 0n
    this.currentPos = 0n
    this.firstFramePos = 0n
    this.streamMuxConfig = {
      profile: NOPTS_VALUE,
      sampleRate: NOPTS_VALUE,
      channels: NOPTS_VALUE
    }
  }

  public async destroy(formatContext: AVIFormatContext) {
    if (this.latmFilter) {
      this.latmFilter.destroy()
      this.latmFilter = null
    }
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

  private async parseTransportStreamTimestamp(formatContext: AVIFormatContext) {
    const hasID3 = (await formatContext.ioReader.peekString(3)) === 'ID3'
    if (hasID3) {
      await formatContext.ioReader.skip(3)

      const id3v2Context = {
        version: await formatContext.ioReader.readUint8(),
        revision: await formatContext.ioReader.readUint8(),
        flags: await formatContext.ioReader.readUint8()
      }
      const metadata = {}

      const len = (((await formatContext.ioReader.readUint8()) & 0x7F) << 21)
        | (((await formatContext.ioReader.readUint8()) & 0x7F) << 14)
        | (((await formatContext.ioReader.readUint8()) & 0x7F) << 7)
        | ((await formatContext.ioReader.readUint8()) & 0x7F)

      await id3v2.parse(formatContext.ioReader, len, id3v2Context, metadata)

      if (is.bigint(metadata['com.apple.streaming.transportStreamTimestamp'])) {
        return metadata['com.apple.streaming.transportStreamTimestamp']
      }
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {

    let transportStreamTimestamp: int64
    if (formatContext.ioReader.flags & IOFlags.SLICE) {
      transportStreamTimestamp = await this.parseTransportStreamTimestamp(formatContext)
    }

    const signature = await formatContext.ioReader.peekBuffer(4)

    this.fileSize = await formatContext.ioReader.fileSize()

    // ADIF
    if (signature[0] === 65 && signature[1] === 68 && signature[2] === 73 && signature[3] === 70) {
      const stream = formatContext.createStream()
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
      this.frameType = FrameType.ADIF

      stream.duration = this.fileSize

      const bitReader = new BitReader()
      bitReader.appendBuffer(await formatContext.ioReader.readBuffer(Math.min(20, static_cast<double>(this.fileSize))))
      bitReader.skip(32)
      // copyright_id_present
      if (bitReader.readU1()) {
        bitReader.skip(72)
      }
      // original_copy
      bitReader.skip(1)
      // home
      bitReader.skip(1)
      // bitstream_type
      bitReader.skip(1)
      const bitrate = bitReader.readU(23)
      stream.timeBase.den = PACKET_SIZE * 16
      stream.timeBase.num = 1
      if (bitrate) {
        stream.timeBase.den = bitrate
      }
      const numProgramConfigElements = bitReader.readU(4)
      if (formatContext.ioReader.getPos() < this.fileSize) {
        bitReader.appendBuffer(await formatContext.ioReader.readBuffer(Math.min(
          numProgramConfigElements * 312,
          static_cast<double>(this.fileSize - formatContext.ioReader.getPos())
        )))
      }

      for (let i = 0; i < numProgramConfigElements; i++) {
        bitReader.readU(4)
        const profile = bitReader.readU(2)
        const samplingFreqIndex = bitReader.readU(4)
        const numFront = bitReader.readU(4)
        const numSide = bitReader.readU(4)
        const numBack = bitReader.readU(4)
        const numLfe = bitReader.readU(2)
        const numAssoc = bitReader.readU(3)
        const numValid = bitReader.readU(4)

        // mono_mixdown_tag
        if (bitReader.readU1()) {
          bitReader.skip(4)
        }
        // stereo_mixdown_tag
        if (bitReader.readU1()) {
          bitReader.skip(4)
        }
        // mixdown_coeff_index and pseudo_surround
        if (bitReader.readU1()) {
          bitReader.skip(3)
        }
        let channels = numLfe
        for (i = 0; i < numFront; i++) {
          channels += bitReader.readU1() ? 2 : 1
          bitReader.skip(4)
        }
        for (i = 0; i < numSide; i++) {
          channels += bitReader.readU1() ? 2 : 1
          bitReader.skip(4)
        }
        for (i = 0; i < numBack; i++) {
          channels += bitReader.readU1() ? 2 : 1
          bitReader.skip(4)
        }
        for (i = 0; i < numLfe; i++) {
          bitReader.skip(4)
        }
        for (i = 0; i < numAssoc; i++) {
          bitReader.skip(4)
        }
        for (i = 0; i < numValid; i++) {
          bitReader.skip(5)
        }
        bitReader.skipPadding()
        const commentField = bitReader.readU(8)
        if (commentField) {
          bitReader.skip(commentField * 8)
        }
        if (!i) {
          stream.codecpar.profile = profile
          stream.codecpar.chLayout.nbChannels = channels
          stream.codecpar.sampleRate = aac.MPEG4SamplingFrequencies[samplingFreqIndex]
          const extradata = aac.avCodecParameters2Extradata(stream.codecpar)
          stream.codecpar.extradata = avMalloc(extradata.length)
          memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
          stream.codecpar.extradataSize = extradata.length
        }
      }
      bitReader.skipPadding()
      this.firstFramePos = bitReader.getPos()
      if (bitReader.remainingLength()) {
        this.pendingData = bitReader.getBuffer().slice(bitReader.getPointer())
        this.pendingPos = this.firstFramePos
      }
    }
    // ADTS
    else if (signature[0] === 0xff && (signature[1] & 0xf0) === 0xf0) {
      this.frameType = FrameType.ADTS
      const stream = formatContext.createStream()
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO

      const info = aac.parseADTSHeader(await formatContext.ioReader.peekBuffer(20))

      if (is.number(info)) {
        return errorType.DATA_INVALID
      }
      this.encodeSampleRate = info.sampleRate
      stream.codecpar.profile = info.profile
      stream.codecpar.sampleRate = info.sampleRate
      stream.codecpar.chLayout.nbChannels = info.channels
      const extradata = aac.avCodecParameters2Extradata(stream.codecpar)
      stream.codecpar.extradata = avMalloc(extradata.length)
      memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
      stream.codecpar.extradataSize = extradata.length
      stream.timeBase.den = stream.codecpar.sampleRate
      stream.timeBase.num = 1
      this.streamMuxConfig.profile = info.profile
      this.streamMuxConfig.sampleRate = info.sampleRate
      this.streamMuxConfig.channels = info.channels

      if (!(formatContext.ioReader.flags & IOFlags.SLICE)) {
        stream.duration = avRescaleQ(
          static_cast<int64>((await this.estimateTotalBlock(formatContext)) * 1024 / this.encodeSampleRate * AV_TIME_BASE),
          AV_TIME_BASE_Q,
          stream.timeBase
        )
      }
      else {
        if (is.bigint(transportStreamTimestamp)) {
          this.currentPts = avRescaleQ(
            transportStreamTimestamp,
            {
              num: 1,
              den: 90000
            },
            stream.timeBase
          )
        }
      }
    }
    // LATM
    else if (signature[0] === 0x56 && (signature[1] & 0xe0) === 0xe0) {
      this.frameType = FrameType.LATM
      const stream = formatContext.createStream()
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO

      const info = aac.parseLATMHeader(await formatContext.ioReader.peekBuffer(20))

      if (is.number(info)) {
        return errorType.DATA_INVALID
      }

      stream.codecpar.profile = info.profile
      stream.codecpar.sampleRate = info.sampleRate
      stream.codecpar.chLayout.nbChannels = info.channels
      const extradata = aac.avCodecParameters2Extradata(stream.codecpar)
      stream.codecpar.extradata = avMalloc(extradata.length)
      memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
      stream.codecpar.extradataSize = extradata.length

      stream.duration = NOPTS_VALUE_BIGINT
      stream.timeBase.den = info.sampleRate
      stream.timeBase.num = 1

      this.latmFilter = new LATM2RawFilter()

      this.latmFilter.init(addressof(stream.codecpar), addressof(stream.timeBase))

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

      if (formatContext.ioReader.flags & IOFlags.SLICE) {
        let transportStreamTimestamp = await this.parseTransportStreamTimestamp(formatContext)
        if (is.bigint(transportStreamTimestamp)) {
          this.currentPts = avRescaleQ(
            transportStreamTimestamp,
            {
              num: 1,
              den: 90000
            },
            stream.timeBase
          )
        }
      }

      let now = formatContext.ioReader.getPos()
      let nextFrame: Uint8Array

      if (this.frameType === FrameType.ADIF) {
        let len = PACKET_SIZE
        if (this.pendingData) {
          now = this.pendingPos
          nextFrame = this.pendingData.subarray(0, len)
          len -= nextFrame.length
          if (nextFrame.length < this.pendingData.length) {
            this.pendingData = this.pendingData.subarray(nextFrame.length)
            this.pendingPos += static_cast<int64>(nextFrame.length as uint32)
          }
          else {
            this.pendingData = null
          }
        }
        if (len) {
          const remainLen = Math.min(len, static_cast<int32>(this.fileSize - now))
          const remain = remainLen ? await formatContext.ioReader.readBuffer(remainLen) : undefined
          if (nextFrame && remain) {
            nextFrame = concatTypeArray(Uint8Array, [nextFrame, remain])
          }
          else if (remain) {
            nextFrame = remain
          }
        }
        if (!nextFrame) {
          return IOError.END
        }
        const data: pointer<uint8> = avMalloc(nextFrame.length)
        memcpyFromUint8Array(data, nextFrame.length, nextFrame)
        addAVPacketData(avpacket, data, nextFrame.length)
        avpacket.duration = static_cast<int64>(PACKET_SIZE)
        avpacket.pos = now
      }
      else if (this.frameType === FrameType.ADTS) {
        const header = await formatContext.ioReader.readBuffer(7)

        const protectionAbsent = header[1] & 0x01

        const profile = ((header[2] & 0xC0) >>> 6) + 1
        const samplingFrequencyIndex = (header[2] & 0x3C) >>> 2
        const channelConfiguration = ((header[2] & 0x01) << 2) | ((header[3] & 0xC0) >>> 6)

        const sampleRate = aac.MPEG4SamplingFrequencies[samplingFrequencyIndex]
        const channels = aac.MPEG4Channels[channelConfiguration]

        if (this.streamMuxConfig.profile !== profile
          || this.streamMuxConfig.sampleRate !== sampleRate
          || this.streamMuxConfig.channels !== channels
        ) {
          this.streamMuxConfig.profile = profile
          this.streamMuxConfig.sampleRate = sampleRate
          this.streamMuxConfig.channels = channels

          const extradata = aac.avCodecParameters2Extradata({
            profile,
            sampleRate,
            chLayout: {
              nbChannels: channels
            }
          })
          const data = avMalloc(extradata.length)
          memcpyFromUint8Array(data, extradata.length, extradata)
          addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, extradata.length)
        }

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
          static_cast<int64>((numberOfRawDataBlocksInFrame + 1) * 1024 / this.encodeSampleRate * AV_TIME_BASE),
          AV_TIME_BASE_Q,
          stream.timeBase
        )
        avpacket.duration = duration

        nextFrame = await formatContext.ioReader.readBuffer(adtsFramePayloadLength)

        const data: pointer<uint8> = avMalloc(nextFrame.length)
        memcpyFromUint8Array(data, nextFrame.length, nextFrame)
        addAVPacketData(avpacket, data, nextFrame.length)
        avpacket.pos = now
      }
      else if (this.frameType === FrameType.LATM) {
        if (now === this.fileSize) {
          return IOError.END
        }
        while (true) {
          let ret = this.latmFilter.receiveAVPacket(avpacket)
          if (ret === errorType.EOF) {
            if (formatContext.ioReader.getPos() === this.fileSize) {
              return IOError.END
            }
            avpacket.pos = formatContext.ioReader.getPos()
            nextFrame = await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.fileSize - now)))
            const data: pointer<uint8> = avMalloc(nextFrame.length)
            memcpyFromUint8Array(data, nextFrame.length, nextFrame)
            addAVPacketData(avpacket, data, nextFrame.length)
            this.latmFilter.sendAVPacket(avpacket)
            continue
          }
          else if (ret < 0) {
            return ret
          }
          else {
            avpacket.duration = 1024n
            avpacket.pos = this.currentPos
            this.currentPos += static_cast<int64>(avpacket.size)
            break
          }
        }
      }

      avpacket.streamIndex = stream.index
      avpacket.timeBase.den = stream.timeBase.den
      avpacket.timeBase.num = stream.timeBase.num
      avpacket.dts = avpacket.pts = this.currentPts
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      this.currentPts += avpacket.duration

      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END
        && formatContext.ioReader.error !== IOError.ABORT
      ) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  private async syncFrame(formatContext: AVIFormatContext) {

    if (this.frameType === FrameType.ADIF) {
      return
    }

    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 3

    const syncWord = this.frameType === FrameType.ADTS ? 0xFFF : 0x2B7
    const shift = this.frameType === FrameType.ADTS ? 4 : 5

    while (true) {
      try {
        let count = 0
        pos = formatContext.ioReader.getPos()
        while (true) {
          if (count === analyzeCount) {
            break
          }
          const word = (await formatContext.ioReader.peekUint16()) >>> shift
          if (word === syncWord) {
            const info = this.frameType === FrameType.ADTS
              ? aac.parseADTSHeader(await formatContext.ioReader.peekBuffer(9))
              : aac.parseLATMHeader(await formatContext.ioReader.peekBuffer(20))
            if (!is.number(info)) {
              count++
              await formatContext.ioReader.skip(info.headerLength + info.framePayloadLength)
              continue
            }
            else {
              break
            }
          }
          else {
            break
          }
        }
        if (count === analyzeCount) {
          break
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

    if (flags & AVSeekFlags.TIMESTAMP && (formatContext.ioReader.flags & IOFlags.SLICE)) {
      const seekTime = avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      await formatContext.ioReader.seek(seekTime, true)
      this.currentPts = timestamp
      return 0n
    }

    if (this.frameType === FrameType.ADTS
      || this.frameType === FrameType.LATM
    ) {
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

        if (this.frameType === FrameType.LATM) {
          return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
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
                static_cast<int64>((numberOfRawDataBlocksInFrame + 1) * 1024 / this.encodeSampleRate * AV_TIME_BASE),
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
    else if (this.frameType === FrameType.ADIF) {

      if (this.latmFilter) {
        this.latmFilter.reset()
      }

      const now = formatContext.ioReader.getPos()

      if (timestamp <= 0n) {
        timestamp = this.firstFramePos
      }
      else if (timestamp > this.fileSize) {
        timestamp = this.fileSize
      }
      await formatContext.ioReader.seek(timestamp)

      this.currentPts = timestamp

      return now
    }
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
