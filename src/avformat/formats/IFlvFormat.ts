/*
 * libmedia flv decoder
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

import FlvHeader from './flv/FlvHeader'
import FlvScriptTag from './flv/FlvScriptTag'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVIFormatContext } from '../AVFormatContext'
import * as logger from 'common/util/logger'
import { AVPacketSideDataType, AVCodecID, AVMediaType } from 'avutil/codec'
import { FlvAudioCodecType2AVCodecID,
  FlvVideoCodecType2AVCodecID, FlvTag, PacketTypeExt
} from './flv/flv'

import * as flvAAC from './flv/codecs/aac'
import * as flvH264 from './flv/codecs/h264'

import * as h264 from '../codecs/h264'
import * as aac from '../codecs/aac'
import * as hevc from '../codecs/hevc'
import * as vvc from '../codecs/vvc'
import * as av1 from '../codecs/av1'
import * as vp9 from '../codecs/vp9'

import * as errorType from 'avutil/error'
import { IOError } from 'common/io/error'
import AVStream from '../AVStream'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from '../avformat'
import { mapSafeUint8Array, mapUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData } from 'avutil/util/avpacket'
import mktag from '../function/mktag'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as array from 'common/util/array'
import seekInBytes from '../function/seekInBytes'
import { BitFormat } from '../codecs/h264'


export interface FlvFormatOptions {
  hasKeyframes?: boolean
  live?: boolean
}

export default class IFlvFormat extends IFormat {

  public type: AVFormat = AVFormat.FLV

  public header: FlvHeader

  public script: FlvScriptTag

  public options: FlvFormatOptions

  private firstTagPos: int64

  constructor(options: FlvFormatOptions = {}) {
    super()

    this.header = new FlvHeader()
    this.script = new FlvScriptTag()

    this.options = options
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      const signature = await formatContext.ioReader.peekString(3)
      if (signature !== 'FLV') {
        logger.error('the file format is not flv')
        return errorType.DATA_INVALID
      }

      await this.header.read(formatContext.ioReader)
      const prev = await formatContext.ioReader.readUint32()
      if (prev !== 0) {
        logger.warn('the previousTagSize0 is not 0')
      }

      let ret = 0

      const type = await formatContext.ioReader.peekUint8()
      if (type === FlvTag.SCRIPT) {
        await formatContext.ioReader.skip(1)
        const size = await formatContext.ioReader.readUint24()
        await formatContext.ioReader.skip(7)
        ret = await this.script.read(formatContext.ioReader, size)
      }
      if (ret >= 0) {
        this.firstTagPos = formatContext.ioReader.getPos()
      }
      return ret
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }
  }

  @deasync
  private async readCodecConfigurationRecord(formatContext: AVIFormatContext, stream: AVStream, len: int32) {
    const data = avMalloc(len)
    stream.codecpar.extradata = data
    stream.codecpar.extradataSize = len
    await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))

    stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(data, len).slice()

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264 || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4) {
      h264.parseAVCodecParameters(stream)
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
      hevc.parseAVCodecParameters(stream)
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
      vvc.parseAVCodecParameters(stream)
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
      av1.parseAVCodecParameters(stream)
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
      vp9.parseAVCodecParameters(stream)
    }
  }

  @deasync
  private async readAVPacketData(formatContext: AVIFormatContext, stream: AVStream, avpacket: pointer<AVPacket>, len: int32) {
    const data = avMalloc(len)
    addAVPacketData(avpacket, data, len)
    await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
      h264.parseAvccExtraData(avpacket, stream)
      avpacket.bitFormat = BitFormat.AVCC
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
      hevc.parseAvccExtraData(avpacket, stream)
      avpacket.bitFormat = BitFormat.AVCC
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
      vvc.parseAvccExtraData(avpacket, stream)
      avpacket.bitFormat = BitFormat.AVCC
    }
  }

  @deasync
  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const now = formatContext.ioReader.getPos()

    avpacket.pos = now

    const type = await formatContext.ioReader.readUint8()
    const size = await formatContext.ioReader.readUint24()
    let timestamp = await formatContext.ioReader.readUint24()
    const timestampExt = await formatContext.ioReader.readUint8()
    if (timestampExt) {
      timestamp = (timestampExt << 24) | timestamp
    }
    avpacket.dts = avpacket.pts = static_cast<int64>(timestamp)
    // streamId 总是 0
    await formatContext.ioReader.skip(3)

    if (type === FlvTag.AUDIO) {
      let stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
      if (stream) {
        avpacket.streamIndex = stream.index
      }

      const audioHeader = await formatContext.ioReader.readUint8()

      if (stream) {
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          const packetType = await formatContext.ioReader.readUint8()
          if (packetType === flvAAC.AACPacketType.AAC_SEQUENCE_HEADER) {
            const len = size - 2
            const data = avMalloc(len)
            addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, len)
            await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))
            // aac.parseAVCodecParameters(stream, mapUint8Array(data, len))
          }
          else {
            await this.readAVPacketData(formatContext, stream, avpacket, size - 2)
          }
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
        else {
          await this.readAVPacketData(formatContext, stream, avpacket, size - 1)
        }
      }
      else {
        stream = formatContext.createStream()
        avpacket.streamIndex = stream.index
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
        stream.timeBase.den = 1000
        stream.timeBase.num = 1
        stream.startTime = avpacket.pts || avpacket.dts
        if (this.script.onMetaData.duration) {
          stream.duration = static_cast<int64>(this.script.onMetaData.duration * 1000)
        }

        stream.codecpar.chLayout.nbChannels = (audioHeader & 0x01) === 1 ? 2 : 1
        stream.codecpar.sampleRate = 44100 << ((audioHeader & 0x0c) >>> 2) >> 3
        stream.codecpar.bitsPerCodedSample = (audioHeader & 0x02) ? 16 : 8

        const flvAudioCodecId = (audioHeader & 0xf0) >> 4

        // FLV_CODECID_PCM
        if (flvAudioCodecId === 0) {
          stream.codecpar.codecId = stream.codecpar.bitsPerCodedSample === 8 ? AVCodecID.AV_CODEC_ID_PCM_U8 : AVCodecID.AV_CODEC_ID_PCM_S16LE
        }
        // FLV_CODECID_PCM_LE
        else if (flvAudioCodecId === 3) {
          stream.codecpar.codecId = stream.codecpar.bitsPerCodedSample === 8 ? AVCodecID.AV_CODEC_ID_PCM_U8 : AVCodecID.AV_CODEC_ID_PCM_S16LE
        }
        else {
          stream.codecpar.codecId = FlvAudioCodecType2AVCodecID[flvAudioCodecId]
        }

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          const packetType = await formatContext.ioReader.readUint8()
          if (packetType === flvAAC.AACPacketType.AAC_SEQUENCE_HEADER) {
            const len = size - 2
            const data = avMalloc(len)
            stream.codecpar.extradata = data
            stream.codecpar.extradataSize = len
            await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))
            stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(data, len).slice()

            aac.parseAVCodecParameters(stream)
          }
          else {
            await this.readAVPacketData(formatContext, stream, avpacket, size - 2)
          }
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX) {
          stream.codecpar.sampleRate = 16000
          stream.codecpar.chLayout.nbChannels = 1
          await this.readAVPacketData(formatContext, stream, avpacket, size - 1)
        }
        else {
          await this.readAVPacketData(formatContext, stream, avpacket, size - 1)
        }

        if (this.onStreamAdd) {
          this.onStreamAdd(stream)
        }
      }
    }
    else if (type === FlvTag.VIDEO) {
      let stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
      if (stream) {
        avpacket.streamIndex = stream.index
      }

      const videoHeader = await formatContext.ioReader.readUint8()

      if (stream) {

        if ((((videoHeader & 0x70) >> 4)) === 1) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
        // https://veovera.github.io/enhanced-rtmp/enhanced-rtmp.pdf
        if (videoHeader & 0x80) {
          await formatContext.ioReader.skip(4)

          const packetType = videoHeader & 0x0f

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          ) {
            avpacket.bitFormat = BitFormat.AVCC
          }

          if (packetType === PacketTypeExt.PacketTypeSequenceStart) {
            const len = size - 5
            const data = avMalloc(len)
            addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, len)
            await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))
          }
          else if (packetType === PacketTypeExt.PacketTypeSequenceEnd) {
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
          }
          else if (packetType === PacketTypeExt.PacketTypeCodedFrames || packetType === PacketTypeExt.PacketTypeCodedFramesX) {
            if (packetType === PacketTypeExt.PacketTypeCodedFrames && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC)) {
              const ct = await formatContext.ioReader.readUint24()
              avpacket.pts = avpacket.dts + static_cast<int64>(ct)
              await this.readAVPacketData(formatContext, stream, avpacket, size - 8)
            }
            else {
              await this.readAVPacketData(formatContext, stream, avpacket, size - 5)
            }
          }
        }
        else {
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          ) {
            avpacket.bitFormat = BitFormat.AVCC
            const packetType = await formatContext.ioReader.readUint8()
            const ct = await formatContext.ioReader.readUint24()

            avpacket.pts = avpacket.dts + static_cast<int64>(ct)

            if (packetType === flvH264.AVCPacketType.AVC_SEQUENCE_HEADER) {
              const len = size - 5
              const data = avMalloc(len)
              addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, len)
              await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))
            }
            else if (packetType === flvH264.AVCPacketType.AVC_END_OF_ENQUENCE) {
              avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
            }
            else {
              await this.readAVPacketData(formatContext, stream, avpacket, size - 5)
            }
          }
          else {
            await this.readAVPacketData(formatContext, stream, avpacket, size - 1)
          }
        }
      }
      else {
        stream = formatContext.createStream()
        avpacket.streamIndex = stream.index
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
        stream.timeBase.den = 1000
        stream.timeBase.num = 1
        stream.startTime = avpacket.pts || avpacket.dts
        if (this.script.onMetaData.duration) {
          stream.duration = static_cast<int64>(this.script.onMetaData.duration * 1000)
        }
        if (this.script.onMetaData.width > 0) {
          stream.codecpar.width = this.script.onMetaData.width
        }
        if (this.script.onMetaData.height > 0) {
          stream.codecpar.height = this.script.onMetaData.height
        }

        if ((((videoHeader & 0x70) >> 4)) === 1) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }

        if (videoHeader & 0x80) {
          const tag = await formatContext.ioReader.readUint32()
          if (tag === mktag('hvc1')) {
            stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_HEVC
            avpacket.bitFormat = BitFormat.AVCC
          }
          if (tag === mktag('vvc1')) {
            stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VVC
            avpacket.bitFormat = BitFormat.AVCC
          }
          else if (tag === mktag('av01')) {
            stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AV1
          }
          else if (tag === mktag('vp09')) {
            stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VP9
          }

          const packetType = videoHeader & 0x0f

          if (packetType === PacketTypeExt.PacketTypeSequenceStart) {
            await this.readCodecConfigurationRecord(formatContext, stream, size - 5)
          }
          else if (packetType === PacketTypeExt.PacketTypeSequenceEnd) {
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
          }
          else if (packetType === PacketTypeExt.PacketTypeCodedFrames || packetType === PacketTypeExt.PacketTypeCodedFramesX) {
            if (packetType === PacketTypeExt.PacketTypeCodedFrames && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC)) {
              const ct = await formatContext.ioReader.readUint24()
              avpacket.pts = avpacket.dts + static_cast<int64>(ct)
              await this.readAVPacketData(formatContext, stream, avpacket, size - 8)
            }
            else {
              await this.readAVPacketData(formatContext, stream, avpacket, size - 5)
            }
          }
        }
        else {
          stream.codecpar.codecId = FlvVideoCodecType2AVCodecID[videoHeader & 0x0f]

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          ) {
            avpacket.bitFormat = BitFormat.AVCC
            const packetType = await formatContext.ioReader.readUint8()
            const ct = await formatContext.ioReader.readUint24()

            avpacket.pts = avpacket.dts + static_cast<int64>(ct)

            if (packetType === flvH264.AVCPacketType.AVC_SEQUENCE_HEADER) {
              await this.readCodecConfigurationRecord(formatContext, stream, size - 5)
            }
            else if (packetType === flvH264.AVCPacketType.AVC_END_OF_ENQUENCE) {
              avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
            }
            else {
              await this.readAVPacketData(formatContext, stream, avpacket, size - 5)
            }
          }
          else {
            await this.readAVPacketData(formatContext, stream, avpacket, size - 1)
          }
        }
        if (this.onStreamAdd) {
          this.onStreamAdd(stream)
        }
      }
    }
    else if (type === FlvTag.SCRIPT) {
      let ret = await this.script.read(formatContext.ioReader, size)
      if (ret < 0) {
        return ret
      }
      return await this.readAVPacket_(formatContext, avpacket)
    }
    else {
      logger.warn(`invalid tag type: ${type}, try to sync to next tag`)
      await this.syncTag(formatContext)
      return this.readAVPacket_(formatContext, avpacket)
    }

    const tagSize = formatContext.ioReader.getPos() - now
    const prev = static_cast<int64>(await formatContext.ioReader.readUint32())

    if (tagSize !== prev) {
      logger.warn(`tag ${type} size not match, size: ${tagSize}, previousTagSize: ${prev}`)
      // 数据不合法，返回错误
      return errorType.DATA_INVALID
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      avpacket.timeBase.den = 1000
      avpacket.timeBase.num = 1
      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return formatContext.ioReader.error
    }
  }

  @deasync
  public async syncTag(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 3

    while (true) {
      try {
        const byte = await formatContext.ioReader.readUint8()
        if (byte === FlvTag.AUDIO || byte === FlvTag.VIDEO) {
          pos = formatContext.ioReader.getPos() - 1n
          const size = await formatContext.ioReader.readUint24()

          if (size > 10 * 1024 * 1024) {
            await formatContext.ioReader.seek(pos + 1n)
            continue
          }

          await formatContext.ioReader.skip(7 + size)
          const tagSize = formatContext.ioReader.getPos() - pos
          const prev = static_cast<int64>(await formatContext.ioReader.readUint32())

          if (tagSize === prev) {
            let count = 0
            while (count <= analyzeCount) {
              const now = formatContext.ioReader.getPos()
              const type = await formatContext.ioReader.readUint8()
              if (type === FlvTag.AUDIO || type === FlvTag.VIDEO || type === FlvTag.SCRIPT) {
                const size = await formatContext.ioReader.readUint24()
                await formatContext.ioReader.skip(7 + size)
                const tagSize = formatContext.ioReader.getPos() - now
                const prev = static_cast<int64>(await formatContext.ioReader.readUint32())

                if (tagSize === prev) {
                  count++
                }
                else {
                  break
                }
              }
              else {
                break
              }
            }
            if (count < analyzeCount) {
              await formatContext.ioReader.seek(pos + 1n)
              pos = NOPTS_VALUE_BIGINT
            }
            else {
              break
            }
          }
          else {
            await formatContext.ioReader.seek(pos + 1n)
            pos = NOPTS_VALUE_BIGINT
            continue
          }
        }
      }
      catch (error) {
        break
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
  }

  public async seek(
    formatContext: AVIFormatContext,
    stream: AVStream,
    timestamp: int64,
    flags: int32
  ): Promise<int64> {
    const now = formatContext.ioReader.getPos()
    if (stream && stream.sampleIndexes.length) {
      let index = array.binarySearch(stream.sampleIndexes, (item) => {
        if (item.pts > timestamp) {
          return -1
        }
        return 1
      })
      if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 10000n) {
        logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
        await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
        return now
      }
    }

    if (this.script.canSeek()) {
      const { pos, dts } = this.script.dts2Position(Number(avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q) / 1000n))
      if (pos > 0) {
        logger.debug(`seek in filepositions, found pts: ${dts}, pos: ${pos}`)
        await formatContext.ioReader.seek(static_cast<int64>(pos))

        const nextTag = await formatContext.ioReader.peekUint8()
        if (nextTag !== FlvTag.AUDIO && nextTag !== FlvTag.VIDEO && nextTag !== FlvTag.SCRIPT) {
          await this.syncTag(formatContext)
        }
        return now
      }
    }
    if (flags & AVSeekFlags.BYTE) {
      await formatContext.ioReader.seek(timestamp)
      if (!(flags & AVSeekFlags.ANY)) {
        await this.syncTag(formatContext)
      }
      return now
    }
    else {
      logger.debug('not found any keyframe index, try to seek in bytes')
      return seekInBytes(
        formatContext,
        stream,
        timestamp,
        this.firstTagPos,
        this.readAVPacket.bind(this),
        this.syncTag.bind(this)
      )
    }
  }

  public getAnalyzeStreamsCount(): number {
    let count = 0
    if (this.header.hasAudio) {
      count++
    }
    if (this.header.hasVideo) {
      count++
    }

    return count
  }
}
