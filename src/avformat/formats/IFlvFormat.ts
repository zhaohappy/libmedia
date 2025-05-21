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
  FlvVideoCodecType2AVCodecID, FlvTag,
  AVCPacketType,
  VideoPacketType,
  VideoFrameType,
  VideoPacketModExType,
  AVMultiTrackType,
  AudioPacketType,
  AudioChannelOrder,
  AudioPacketModExType,
  AACPacketType
} from './flv/flv'

import * as h264 from 'avutil/codecs/h264'
import * as aac from 'avutil/codecs/aac'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import * as vp8 from 'avutil/codecs/vp8'
import * as flac from 'avutil/codecs/flac'
import * as opus from 'avutil/codecs/opus'
import * as ac3 from 'avutil/codecs/ac3'
import * as mp3 from 'avutil/codecs/mp3'

import * as errorType from 'avutil/error'
import { IOError } from 'common/io/error'
import AVStream, { AVDisposition, AVStreamMetadataKey } from 'avutil/AVStream'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags, IOFlags } from 'avutil/avformat'
import { mapSafeUint8Array, mapUint8Array } from 'cheap/std/memory'
import { avMalloc, avMallocz } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData, addSideData, createAVPacket, getAVPacketData, hasAVPacketSideData, hasSideData } from 'avutil/util/avpacket'
import mktag from '../function/mktag'
import { avD2Q, avRescaleQ, avRescaleQ3 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE, AV_MILLI_TIME_BASE_Q, AV_NANO_TIME_BASE, AV_NANO_TIME_BASE_Q, INT32_MAX, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as array from 'common/util/array'
import seekInBytes from '../function/seekInBytes'
import { BitFormat } from 'avutil/codecs/h264'
import isDef from 'common/function/isDef'
import { FlvColorInfo, FlvStreamContext } from './flv/type'
import * as amf from 'avutil/util/amf'
import { AVColorPrimaries, AVColorSpace, AVColorTransferCharacteristic } from 'avutil/pixfmt'
import { AVContentLightMetadata, AVMasteringDisplayMetadata } from 'avutil/struct/avframe'
import { Rational } from 'avutil/struct/rational'
import { initCustomChannelLayout, setChannelLayoutFromMask, unInitChannelLayout } from 'avutil/util/channel'
import { AVChannel } from 'avutil/audiosamplefmt'
import * as is from 'common/util/is'

export interface IFlvFormatOptions {
  useNanoTimestamp?: boolean
}

export default class IFlvFormat extends IFormat {

  public type: AVFormat = AVFormat.FLV

  public header: FlvHeader

  public script: FlvScriptTag

  public options: IFlvFormatOptions

  private firstTagPos: int64

  constructor(options: IFlvFormatOptions = {}) {
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

  private async readModEx(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>, mediaType: AVMediaType) {
    let exSize = await formatContext.ioReader.readUint8() + 1
    if (exSize === 256) {
      exSize = await formatContext.ioReader.readUint16() + 1
    }
    const exBuffer = await formatContext.ioReader.readBuffer(exSize)
    const type = await formatContext.ioReader.readUint8()

    const exType = type & 0xf0

    if (exType === VideoPacketModExType.TimestampOffsetNano
      && mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO
      || exType === AudioPacketModExType.TimestampOffsetNano
      && mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO
    ) {
      let nanoOffset = 0
      if (exBuffer.length === 3) {
        nanoOffset = (exBuffer[0] << 16) | (exBuffer[1] << 8) | exBuffer[2]
        if (this.options.useNanoTimestamp) {
          avpacket.dts += BigInt(nanoOffset)
        }
        else {
          // 还是使用毫秒时间精度
          avpacket.dts += BigInt(nanoOffset) / 1000000n
        }
        avpacket.pts = avpacket.dts
      }
      else {
        logger.warn(`Invalid ModEx size for Type TimestampOffsetNano!, need 3 but got ${exBuffer.length}`)
      }
    }
    else {
      logger.warn(`unknown ModEx type: ${exType}`)
    }
    return type & 0x0f
  }

  private async readCodecConfigurationRecord(formatContext: AVIFormatContext, stream: AVStream, avpacket: pointer<AVPacket>, len: int32) {
    const data: pointer<uint8> = avMalloc(reinterpret_cast<size>(len))
    if (stream.codecpar.extradata) {
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, reinterpret_cast<size>(len))
      await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, reinterpret_cast<size>(len)))
    }
    else {
      stream.codecpar.extradata = data
      stream.codecpar.extradataSize = len
      await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, reinterpret_cast<size>(len)))

      stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(data, reinterpret_cast<size>(len)).slice()

      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
        h264.parseAVCodecParameters(stream)
        stream.codecpar.bitFormat = BitFormat.AVCC
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        hevc.parseAVCodecParameters(stream)
        stream.codecpar.bitFormat = BitFormat.AVCC
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
        vvc.parseAVCodecParameters(stream)
        stream.codecpar.bitFormat = BitFormat.AVCC
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
        av1.parseAVCodecParameters(stream)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
        vp9.parseAVCodecParameters(stream)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP8) {
        vp8.parseAVCodecParameters(stream)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
        aac.parseAVCodecParameters(stream)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC) {
        flac.parseAVCodecParameters(stream)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
        opus.parseAVCodecParameters(stream)
      }
    }
  }

  private async readAVPacketData(formatContext: AVIFormatContext, stream: AVStream, avpacket: pointer<AVPacket>, len: int32) {
    const data: pointer<uint8> = avMalloc(reinterpret_cast<size>(len))
    addAVPacketData(avpacket, data, len)
    await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, reinterpret_cast<size>(len)))
  }

  private parseColorInfo(stream: AVStream, avpacket: pointer<AVPacket>, info: FlvColorInfo) {
    let hasMasteringPrimaries = false
    let hasMasteringLuminance = false
    if (info.hdrMdcv) {
      hasMasteringPrimaries = info.hdrMdcv.redX > 0
        && info.hdrMdcv.redY > 0
        && info.hdrMdcv.blueX > 0
        && info.hdrMdcv.blueY > 0
        && info.hdrMdcv.greenX > 0
        && info.hdrMdcv.greenY > 0
        && info.hdrMdcv.whitePointX > 0
        && info.hdrMdcv.whitePointY > 0

      hasMasteringLuminance = info.hdrMdcv.maxLuminance > 0 && info.hdrMdcv.minLuminance > 0
    }
    if (info.colorConfig.matrixCoefficients !== AVColorSpace.AVCOL_SPC_RESERVED) {
      stream.codecpar.colorSpace = info.colorConfig.matrixCoefficients
    }
    if (info.colorConfig.colorPrimaries !== AVColorPrimaries.AVCOL_PRI_RESERVED
      && info.colorConfig.colorPrimaries !== AVColorPrimaries.AVCOL_PRI_RESERVED0
    ) {
      stream.codecpar.colorPrimaries = info.colorConfig.colorPrimaries
    }
    if (info.colorConfig.transferCharacteristics !== AVColorTransferCharacteristic.AVCOL_TRC_RESERVED
      && info.colorConfig.transferCharacteristics !== AVColorTransferCharacteristic.AVCOL_TRC_RESERVED0
    ) {
      stream.codecpar.colorTrc = info.colorConfig.transferCharacteristics
    }
    if (info.hdrCll && info.hdrCll.maxCLL && info.hdrCll.maxFall) {
      const metadata: pointer<AVContentLightMetadata> = avMallocz(sizeof(AVContentLightMetadata))
      metadata.maxCLL = info.hdrCll.maxCLL as uint32
      metadata.maxFALL = info.hdrCll.maxFall as uint32
      if (hasSideData(addressof(stream.codecpar.codedSideData), addressof(stream.codecpar.nbCodedSideData), AVPacketSideDataType.AV_PKT_DATA_CONTENT_LIGHT_LEVEL)) {
        addAVPacketSideData(
          avpacket,
          AVPacketSideDataType.AV_PKT_DATA_CONTENT_LIGHT_LEVEL,
          metadata,
          sizeof(AVContentLightMetadata)
        )
      }
      else {
        addSideData(
          addressof(stream.codecpar.codedSideData),
          addressof(stream.codecpar.nbCodedSideData),
          AVPacketSideDataType.AV_PKT_DATA_CONTENT_LIGHT_LEVEL,
          metadata,
          sizeof(AVContentLightMetadata)
        )
      }
    }
    if (hasMasteringLuminance || hasMasteringPrimaries) {
      const metadata: pointer<AVMasteringDisplayMetadata> = avMallocz(sizeof(AVMasteringDisplayMetadata))

      function setQ(q: pointer<Rational>, d: double) {
        const s = avD2Q(d, INT32_MAX)
        q.den = s.den
        q.num = s.num
      }

      if (hasMasteringLuminance) {
        metadata.hasLuminance = 1
        setQ(addressof(metadata.maxLuminance), info.hdrMdcv.maxLuminance)
        setQ(addressof(metadata.minLuminance), info.hdrMdcv.minLuminance)
      }
      if (hasMasteringPrimaries) {
        metadata.hasPrimaries = 1
        setQ(addressof(metadata.displayPrimaries[0][0]), info.hdrMdcv.redX)
        setQ(addressof(metadata.displayPrimaries[0][1]), info.hdrMdcv.redY)
        setQ(addressof(metadata.displayPrimaries[1][0]), info.hdrMdcv.greenX)
        setQ(addressof(metadata.displayPrimaries[1][1]), info.hdrMdcv.greenY)
        setQ(addressof(metadata.displayPrimaries[2][0]), info.hdrMdcv.blueX)
        setQ(addressof(metadata.displayPrimaries[2][1]), info.hdrMdcv.blueY)
      }

      if (hasSideData(addressof(stream.codecpar.codedSideData), addressof(stream.codecpar.nbCodedSideData), AVPacketSideDataType.AV_PKT_DATA_MASTERING_DISPLAY_METADATA)) {
        addAVPacketSideData(
          avpacket,
          AVPacketSideDataType.AV_PKT_DATA_MASTERING_DISPLAY_METADATA,
          metadata,
          sizeof(AVMasteringDisplayMetadata)
        )
      }
      else {
        addSideData(
          addressof(stream.codecpar.codedSideData),
          addressof(stream.codecpar.nbCodedSideData),
          AVPacketSideDataType.AV_PKT_DATA_MASTERING_DISPLAY_METADATA,
          metadata,
          sizeof(AVMasteringDisplayMetadata)
        )
      }
    }
  }

  private findStream(formatContext: AVIFormatContext, mediaType: AVMediaType, trackId: uint8) {
    for (let i = 0; i < formatContext.streams.length; i++) {
      if (formatContext.streams[i].codecpar.codecType === mediaType) {
        const streamContext = formatContext.streams[i].privData as FlvStreamContext
        if (streamContext && streamContext.trackId === trackId) {
          return formatContext.streams[i]
        }
      }
    }
  }

  private createStream(formatContext: AVIFormatContext, mediaType: AVMediaType, avpacket: pointer<AVPacket>, trackId: uint8) {
    const stream = formatContext.createStream()
    stream.codecpar.codecType = mediaType
    stream.timeBase.den = this.options.useNanoTimestamp ? AV_NANO_TIME_BASE : AV_MILLI_TIME_BASE
    stream.timeBase.num = 1
    stream.startTime = avpacket.pts
    const streamContext: FlvStreamContext = {
      trackId
    }
    stream.privData = streamContext
    if (this.script.onMetaData?.duration) {
      stream.duration = avRescaleQ(
        static_cast<int64>(this.script.onMetaData.duration * 1000),
        AV_MILLI_TIME_BASE_Q,
        stream.timeBase
      )
    }
    if (mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      if (this.script.onMetaData?.width > 0) {
        stream.codecpar.width = this.script.onMetaData.width
      }
      if (this.script.onMetaData?.height > 0) {
        stream.codecpar.height = this.script.onMetaData.height
      }
      if (this.script.onMetaData?.videoTrackIdInfoMap?.[trackId]) {
        if (this.script.onMetaData.videoTrackIdInfoMap[trackId].title) {
          stream.metadata[AVStreamMetadataKey.TITLE] = this.script.onMetaData.videoTrackIdInfoMap[trackId].title
        }
        if (this.script.onMetaData.videoTrackIdInfoMap[trackId].lang) {
          stream.metadata[AVStreamMetadataKey.LANGUAGE] = this.script.onMetaData.videoTrackIdInfoMap[trackId].lang
        }
        if (this.script.onMetaData.videoTrackIdInfoMap[trackId].width > 0) {
          stream.codecpar.width = this.script.onMetaData.videoTrackIdInfoMap[trackId].width
        }
        if (this.script.onMetaData.videoTrackIdInfoMap[trackId].height > 0) {
          stream.codecpar.height = this.script.onMetaData.videoTrackIdInfoMap[trackId].height
        }
        if (this.script.onMetaData.videoTrackIdInfoMap[trackId].duration > 0) {
          stream.duration = avRescaleQ(
            static_cast<int64>(this.script.onMetaData.videoTrackIdInfoMap[trackId].duration * 1000),
            AV_MILLI_TIME_BASE_Q,
            stream.timeBase
          )
        }
      }
    }
    else if (mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      if (this.script.onMetaData?.audioTrackIdInfoMap?.[trackId]) {
        if (this.script.onMetaData.audioTrackIdInfoMap[trackId].title) {
          stream.metadata[AVStreamMetadataKey.TITLE] = this.script.onMetaData.audioTrackIdInfoMap[trackId].title
        }
        if (this.script.onMetaData.audioTrackIdInfoMap[trackId].lang) {
          stream.metadata[AVStreamMetadataKey.LANGUAGE] = this.script.onMetaData.audioTrackIdInfoMap[trackId].lang
        }
        if (this.script.onMetaData.audioTrackIdInfoMap[trackId].duration > 0) {
          stream.duration = avRescaleQ(
            static_cast<int64>(this.script.onMetaData.audioTrackIdInfoMap[trackId].duration * 1000),
            AV_MILLI_TIME_BASE_Q,
            stream.timeBase
          )
        }
      }
    }
    if (this.onStreamAdd) {
      this.onStreamAdd(stream)
    }
    return stream
  }

  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const now = formatContext.ioReader.getPos()

    avpacket.pos = now

    let needRedo = false
    const type = (await formatContext.ioReader.readUint8()) & 0x1f
    let size = await formatContext.ioReader.readUint24()
    let timestamp = await formatContext.ioReader.readUint24()
    const timestampExt = await formatContext.ioReader.readUint8()
    if (timestampExt) {
      timestamp = (timestampExt << 24) | timestamp
    }
    avpacket.dts = this.options.useNanoTimestamp
      ? avRescaleQ(static_cast<int64>(timestamp), AV_MILLI_TIME_BASE_Q, AV_NANO_TIME_BASE_Q)
      : static_cast<int64>(timestamp)
    avpacket.pts = avpacket.dts
    // streamId 总是 0
    await formatContext.ioReader.skip(3)

    if (type === FlvTag.AUDIO) {

      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY

      const audioHeader = await formatContext.ioReader.readUint8()
      size--
      const flvAudioCodecId = (audioHeader & 0xf0) >> 4
      // new, used to signal FOURCC mode
      if (flvAudioCodecId === 9) {
        let isAudioMultiTrack = false
        let audioPacketType = audioHeader & 0x0f
        while (audioPacketType === AudioPacketType.ModEx) {
          let now = formatContext.ioReader.getPos()
          audioPacketType = await this.readModEx(formatContext, avpacket, AVMediaType.AVMEDIA_TYPE_AUDIO)
          size -= static_cast<int32>(formatContext.ioReader.getPos() - now)
        }
        let tag: uint32 = 0
        let audioMultiTrackType = 0

        if (audioPacketType === AudioPacketType.MultiTrack) {
          isAudioMultiTrack = true
          const type = await formatContext.ioReader.readUint8()
          size--
          audioMultiTrackType = (type & 0xf0) >> 4
          audioPacketType = type & 0x0f

          if (audioMultiTrackType !== AVMultiTrackType.ManyTracksManyCodecs) {
            tag = await formatContext.ioReader.readUint32()
            size -= 4
          }
        }
        else {
          tag = await formatContext.ioReader.readUint32()
          size -= 4
        }

        let nextAVPacket = avpacket

        while (true) {
          let trackSize = size
          let trackId: uint8 = 0
          if (isAudioMultiTrack) {
            if (audioMultiTrackType === AVMultiTrackType.ManyTracksManyCodecs) {
              tag = await formatContext.ioReader.readUint32()
              size -= 4
            }
            trackId = await formatContext.ioReader.readUint8()
            size--
            if (audioMultiTrackType !== AVMultiTrackType.OneTrack) {
              trackSize = await formatContext.ioReader.readUint24()
              size -= 3
            }
            else {
              trackSize = size
            }
          }

          let stream = this.findStream(formatContext, AVMediaType.AVMEDIA_TYPE_AUDIO, trackId)
          if (!stream) {
            stream = this.createStream(formatContext, AVMediaType.AVMEDIA_TYPE_AUDIO, nextAVPacket, trackId)
            if (tag === mktag('ac-3')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AC3
            }
            else if (tag === mktag('ec-3')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_EAC3
            }
            else if (tag === mktag('Opus')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_OPUS
              stream.codecpar.sampleRate = 48000
            }
            else if (tag === mktag('.mp3')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_MP3
            }
            else if (tag === mktag('fLaC')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_FLAC
            }
            else if (tag === mktag('mp4a')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
            }
            else {
              logger.warn(`unknown codec fourcc(${tag.toString(16)})`)
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_NONE
            }
          }
          nextAVPacket.streamIndex = stream.index
          size -= trackSize

          if (audioPacketType === AudioPacketType.MultichannelConfig) {
            const channelOrder = await formatContext.ioReader.readUint8()
            const channelCount = await formatContext.ioReader.readUint8()
            trackSize -= 2
            unInitChannelLayout(addressof(stream.codecpar.chLayout))

            if (channelOrder === AudioChannelOrder.Custom) {
              initCustomChannelLayout(addressof(stream.codecpar.chLayout), channelCount)
              for (let i = 0; i < channelCount; i++) {
                const id = await formatContext.ioReader.readUint8()
                trackSize--
                if (id < 18) {
                  stream.codecpar.chLayout.u.map[i].id = id
                }
                else if (id >= 18 && id <= 23) {
                  stream.codecpar.chLayout.u.map[i].id = id - 18 + AVChannel.AV_CHANNEL_LOW_FREQUENCY_2
                }
                else if (id === 0xFE) {
                  stream.codecpar.chLayout.u.map[i].id = AVChannel.AV_CHANNEL_UNUSED
                }
                else {
                  stream.codecpar.chLayout.u.map[i].id = AVChannel.AV_CHANNEL_UNKNOWN
                }
              }
            }
            else if (channelOrder === AudioChannelOrder.Native) {
              let mask = static_cast<uint64>((await formatContext.ioReader.readUint32()) as uint32)
              trackSize -= 4
              mask = (mask & 0x3FFFFn) | ((mask & 0xFC0000n) << (BigInt(AVChannel.AV_CHANNEL_LOW_FREQUENCY_2) - 18n))
              setChannelLayoutFromMask(addressof(stream.codecpar.chLayout), mask)
            }
            needRedo = true
          }
          else if (audioPacketType === AudioPacketType.SequenceStart) {
            if (trackSize) {
              await this.readCodecConfigurationRecord(formatContext, stream, nextAVPacket, trackSize)
              trackSize = 0
              needRedo = false
              if (!hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)) {
                needRedo = true
              }
            }
            else {
              needRedo = true
            }
          }
          else if (audioPacketType === AudioPacketType.SequenceEnd) {
            nextAVPacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
            needRedo = false
          }
          else if (audioPacketType === AudioPacketType.CodedFrames) {
            await this.readAVPacketData(formatContext, stream, nextAVPacket, trackSize)
            if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3)
              && stream.codecpar.sampleRate === NOPTS_VALUE
            ) {
              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3
              ) {
                const info = ac3.parseHeader(getAVPacketData(nextAVPacket))
                if (!is.number(info)) {
                  stream.codecpar.sampleRate = reinterpret_cast<int32>(info.sampleRate)
                  stream.codecpar.chLayout.nbChannels = reinterpret_cast<int32>(info.channels)
                  stream.codecpar.bitrate = static_cast<int64>(info.bitrate)
                }
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
                mp3.parseAVCodecParameters(stream, getAVPacketData(nextAVPacket))
              }
            }
            needRedo = false
            trackSize = 0
          }
          else {
            logger.warn(`invalid audioPacketType ${audioPacketType}`)
          }
          if (trackSize) {
            await formatContext.ioReader.skip(trackSize)
          }

          if (nextAVPacket !== avpacket && !needRedo) {
            formatContext.interval.packetBuffer.push(nextAVPacket)
          }

          if (isAudioMultiTrack
            && audioMultiTrackType !== AVMultiTrackType.OneTrack
            && size
          ) {
            nextAVPacket = createAVPacket()
            nextAVPacket.pos = now
            nextAVPacket.timeBase = avpacket.timeBase
            nextAVPacket.dts = avpacket.dts
            nextAVPacket.pts = avpacket.pts
            nextAVPacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
            continue
          }
          break
        }
      }
      else {
        let stream = this.findStream(formatContext, AVMediaType.AVMEDIA_TYPE_AUDIO, 0)
        if (!stream) {
          stream = this.createStream(formatContext, AVMediaType.AVMEDIA_TYPE_AUDIO, avpacket, 0)
          stream.disposition |= AVDisposition.DEFAULT
          stream.codecpar.chLayout.nbChannels = (audioHeader & 0x01) === 1 ? 2 : 1
          stream.codecpar.sampleRate = 44100 << ((audioHeader & 0x0c) >>> 2) >> 3
          stream.codecpar.bitsPerCodedSample = (audioHeader & 0x02) ? 16 : 8
          // FLV_CODECID_PCM
          if (flvAudioCodecId === 0) {
            stream.codecpar.codecId = stream.codecpar.bitsPerCodedSample === 8 ? AVCodecID.AV_CODEC_ID_PCM_U8 : AVCodecID.AV_CODEC_ID_PCM_S16LE
          }
          // FLV_CODECID_PCM_LE
          else if (flvAudioCodecId === 3) {
            stream.codecpar.codecId = stream.codecpar.bitsPerCodedSample === 8 ? AVCodecID.AV_CODEC_ID_PCM_U8 : AVCodecID.AV_CODEC_ID_PCM_S16LE
          }
          else {
            stream.codecpar.codecId = FlvAudioCodecType2AVCodecID[flvAudioCodecId] ?? AVCodecID.AV_CODEC_ID_NONE
          }
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX) {
            stream.codecpar.sampleRate = 16000
            stream.codecpar.chLayout.nbChannels = 1
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_ALAW
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_MULAW
          ) {
            stream.codecpar.sampleRate = 8000
          }
        }
        avpacket.streamIndex = stream.index

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          const packetType = await formatContext.ioReader.readUint8()
          size--
          if (packetType === AACPacketType.AAC_SEQUENCE_HEADER) {
            this.readCodecConfigurationRecord(formatContext, stream, avpacket, size)
            size = 0
            if (!hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)) {
              needRedo = true
            }
          }
        }
        if (size) {
          await this.readAVPacketData(formatContext, stream, avpacket, size)
          size = 0
        }
      }
    }
    else if (type === FlvTag.VIDEO) {

      const videoHeader = await formatContext.ioReader.readUint8()
      const isExVideoHeader = videoHeader & 0x80
      const videoFrameType = (videoHeader & 0x70) >> 4
      size--

      if (videoFrameType === VideoFrameType.KeyFrame) {
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      }

      if (isExVideoHeader) {

        let processVideoBody = true
        let isVideoMultiTrack = false

        let videoPacketType = videoHeader & 0x0f

        while (videoPacketType === VideoPacketType.ModEx) {
          let now = formatContext.ioReader.getPos()
          videoPacketType = await this.readModEx(formatContext, avpacket, AVMediaType.AVMEDIA_TYPE_VIDEO)
          size -= static_cast<int32>(formatContext.ioReader.getPos() - now)
        }

        let tag: uint32 = 0
        let videoMultiTrackType = 0

        if (videoPacketType !== VideoPacketType.Metadata
          && videoFrameType === VideoFrameType.Command
        ) {
          processVideoBody = false
          needRedo = true
        }
        else if (videoPacketType === VideoPacketType.MultiTrack) {
          isVideoMultiTrack = true
          const type = await formatContext.ioReader.readUint8()
          size--
          videoMultiTrackType = (type & 0xf0) >> 4
          videoPacketType = type & 0x0f

          if (videoMultiTrackType !== AVMultiTrackType.ManyTracksManyCodecs) {
            tag = await formatContext.ioReader.readUint32()
            size -= 4
          }
        }
        else {
          tag = await formatContext.ioReader.readUint32()
          size -= 4
        }

        let nextAVPacket = avpacket

        while (processVideoBody) {
          let trackSize = size
          let trackId: uint8 = 0
          if (isVideoMultiTrack) {
            if (videoMultiTrackType === AVMultiTrackType.ManyTracksManyCodecs) {
              tag = await formatContext.ioReader.readUint32()
              size -= 4
            }
            trackId = await formatContext.ioReader.readUint8()
            size--
            if (videoMultiTrackType !== AVMultiTrackType.OneTrack) {
              trackSize = await formatContext.ioReader.readUint24()
              size -= 3
            }
            else {
              trackSize = size
            }
          }

          let stream = this.findStream(formatContext, AVMediaType.AVMEDIA_TYPE_VIDEO, trackId)
          if (!stream) {
            stream = this.createStream(formatContext, AVMediaType.AVMEDIA_TYPE_VIDEO, nextAVPacket, trackId)
            if (tag === mktag('avc1')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_H264
            }
            else if (tag === mktag('hvc1')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_HEVC
            }
            else if (tag === mktag('vvc1')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VVC
            }
            else if (tag === mktag('av01')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AV1
            }
            else if (tag === mktag('vp09')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VP9
            }
            else if (tag === mktag('vp08')) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VP8
            }
          }
          nextAVPacket.streamIndex = stream.index
          size -= trackSize
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          ) {
            avpacket.bitFormat = BitFormat.AVCC
          }
          if (videoPacketType === VideoPacketType.Metadata) {
            const now = formatContext.ioReader.getPos()
            const endPos = now + static_cast<int64>(trackSize)
            const key = await amf.parseValue(formatContext.ioReader, endPos)
            const value = await amf.parseValue(formatContext.ioReader, endPos)
            if (key === 'colorInfo') {
              this.parseColorInfo(stream, nextAVPacket, value)
            }
            else {
              logger.warn(`unknown metadata key ${key}`)
            }
            if (formatContext.ioReader.getPos() < endPos) {
              await formatContext.ioReader.seek(endPos)
            }
            needRedo = true
            trackSize = 0
          }
          else if (videoPacketType === VideoPacketType.SequenceStart) {
            if (trackSize) {
              await this.readCodecConfigurationRecord(formatContext, stream, nextAVPacket, trackSize)
              trackSize = 0
              needRedo = false
              if (!hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)) {
                needRedo = true
              }
            }
            else {
              needRedo = true
            }
          }
          else if (videoPacketType === VideoPacketType.SequenceEnd) {
            nextAVPacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
            needRedo = false
          }
          else if (videoPacketType === VideoPacketType.MPEG2TSSequenceStart) {
            if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
              // descriptor_tag + descriptor_length
              await this.readCodecConfigurationRecord(formatContext, stream, nextAVPacket, trackSize - 2)
              needRedo = false
              trackSize = 0
              if (!hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)) {
                needRedo = true
              }
            }
            else {
              needRedo = true
            }
          }
          else if (videoPacketType === VideoPacketType.CodedFrames || videoPacketType === VideoPacketType.CodedFramesX) {
            if (videoPacketType === VideoPacketType.CodedFrames
              && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
              )
            ) {
              const ct: int32 = await formatContext.ioReader.readInt24()
              nextAVPacket.pts = nextAVPacket.dts + (
                this.options.useNanoTimestamp
                  ? avRescaleQ3(static_cast<int64>(ct), AV_MILLI_TIME_BASE_Q, addressof(avpacket.timeBase))
                  : static_cast<int64>(ct)
              )
              trackSize -= 3
            }
            await this.readAVPacketData(formatContext, stream, nextAVPacket, trackSize)
            trackSize = 0
            needRedo = false
          }
          else {
            logger.warn(`invalid videoPacketType ${videoPacketType}`)
          }
          if (trackSize) {
            await formatContext.ioReader.skip(trackSize)
          }

          if (!needRedo && nextAVPacket !== avpacket) {
            formatContext.interval.packetBuffer.push(nextAVPacket)
          }

          if (isVideoMultiTrack
            && videoMultiTrackType !== AVMultiTrackType.OneTrack
            && size
          ) {
            nextAVPacket = createAVPacket()
            nextAVPacket.pos = now
            nextAVPacket.timeBase = avpacket.timeBase
            nextAVPacket.dts = avpacket.dts
            nextAVPacket.pts = avpacket.pts
            if (videoFrameType === VideoFrameType.KeyFrame) {
              nextAVPacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
            }
            continue
          }
          break
        }
      }
      else {
        if (videoFrameType !== VideoFrameType.Command) {
          let stream = this.findStream(formatContext, AVMediaType.AVMEDIA_TYPE_VIDEO, 0)
          if (!stream) {
            stream = this.createStream(formatContext, AVMediaType.AVMEDIA_TYPE_VIDEO, avpacket, 0)
            stream.disposition |= AVDisposition.DEFAULT
            stream.codecpar.codecId = FlvVideoCodecType2AVCodecID[videoHeader & 0x0f] ?? AVCodecID.AV_CODEC_ID_NONE
          }
          avpacket.streamIndex = stream.index

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          ) {
            avpacket.bitFormat = BitFormat.AVCC
            const packetType = await formatContext.ioReader.readUint8()
            const ct: int32 = await formatContext.ioReader.readInt24()
            size -= 4

            avpacket.pts = avpacket.dts + (
              this.options.useNanoTimestamp
                ? avRescaleQ3(static_cast<int64>(ct), AV_MILLI_TIME_BASE_Q, addressof(avpacket.timeBase))
                : static_cast<int64>(ct)
            )

            if (packetType === AVCPacketType.AVC_SEQUENCE_HEADER) {
              await this.readCodecConfigurationRecord(formatContext, stream, avpacket, size)
              if (!hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)) {
                needRedo = true
              }
            }
            else if (packetType === AVCPacketType.AVC_END_OF_ENQUENCE) {
              avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_END
            }
            else {
              await this.readAVPacketData(formatContext, stream, avpacket, size)
            }
          }
          else {
            await this.readAVPacketData(formatContext, stream, avpacket, size)
          }
          size = 0
        }
        else {
          needRedo = true
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
    else if (type === FlvTag.SCRIPT_AMF3) {
      logger.warn('not support script tag encoded by amf3, ignore it')
    }
    else {
      logger.warn(`invalid tag type: ${type}, try to sync to next tag`)
      await this.syncTag(formatContext)
      return this.readAVPacket_(formatContext, avpacket)
    }

    if (size) {
      await formatContext.ioReader.skip(size)
    }

    const tagSize = formatContext.ioReader.getPos() - now
    const prev = static_cast<int64>(await formatContext.ioReader.readUint32())

    if (tagSize !== prev) {
      logger.warn(`tag ${type} size not match, size: ${tagSize}, previousTagSize: ${prev}`)
      // 数据不合法，返回错误
      return errorType.DATA_INVALID
    }
    if (needRedo) {
      return this.readAVPacket_(formatContext, avpacket)
    }
    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      avpacket.timeBase.den = this.options.useNanoTimestamp ? AV_NANO_TIME_BASE : AV_MILLI_TIME_BASE
      avpacket.timeBase.num = 1
      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  public async syncTag(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 3

    while (true) {
      try {
        if (formatContext.ioReader.flags & IOFlags.ABORT) {
          break
        }
        const byte = await formatContext.ioReader.readUint8()
        if (byte === FlvTag.AUDIO || byte === FlvTag.VIDEO) {
          pos = formatContext.ioReader.getPos() - 1n
          const size = await formatContext.ioReader.readUint24()

          if (size > 10 * 1024 * 1024) {
            await formatContext.ioReader.seek(pos + 1n)
            continue
          }

          await formatContext.ioReader.skip(4)
          const streamId = await formatContext.ioReader.readUint24()
          if (streamId !== 0) {
            await formatContext.ioReader.seek(pos + 1n)
            continue
          }
          await formatContext.ioReader.skip(size)
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
    if (flags & AVSeekFlags.BYTE) {
      await formatContext.ioReader.seek(timestamp)
      if (!(flags & AVSeekFlags.ANY)) {
        await this.syncTag(formatContext)
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
    if (this.header.hasAudio || isDef(this.script.onMetaData.audiocodecid)) {
      count++
    }
    if (this.header.hasVideo || isDef(this.script.onMetaData.videocodecid)) {
      count++
    }

    return count
  }
}
