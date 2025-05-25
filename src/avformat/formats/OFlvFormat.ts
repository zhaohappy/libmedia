/*
 * libmedia flv encoder
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

import OFormat from './OFormat'
import FlvHeader from './flv/FlvHeader'
import FlvScriptTag from './flv/FlvScriptTag'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVOFormatContext } from '../AVFormatContext'
import * as array from 'common/util/array'
import { AVPacketSideDataType, AVCodecID, AVMediaType } from 'avutil/codec'
import { AACPacketType, AVCPacketType, AVCodecID2FlvCodecTag, AVCodecID2FlvCodecType, AudioChannelOrder, AudioPacketType, FlvTag, VideoPacketType } from './flv/flv'
import { FlvColorInfo, FlvContext, FlvStreamContext } from './flv/type'
import concatTypeArray from 'common/function/concatTypeArray'
import { AVFormat } from 'avutil/avformat'
import { mapUint8Array } from 'cheap/std/memory'
import * as logger from 'common/util/logger'
import { createAVPacket, destroyAVPacket, getAVPacketSideData, getSideData } from 'avutil/util/avpacket'
import { avQ2D, avRescaleQ2 } from 'avutil/util/rational'
import Annexb2AvccFilter from '../bsf/h2645/Annexb2AvccFilter'
import { BitFormat } from 'avutil/codecs/h264'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import AVStream, { AVDisposition, AVStreamMetadataKey } from 'avutil/AVStream'
import mktag from '../function/mktag'
import { AVColorPrimaries, AVColorSpace, AVColorTransferCharacteristic } from 'avutil/pixfmt'
import { AVContentLightMetadata, AVMasteringDisplayMetadata } from 'avutil/struct/avframe'
import * as amf from 'avutil/util/amf'
import { AVChannelOrder, AVChannel } from 'avutil/audiosamplefmt'
import * as oflv from './flv/oflv'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as naluUtil from 'avutil/util/nalu'
import IOWriterSync from 'common/io/IOWriterSync'
export interface OFlvFormatOptions {
  addKeyframePositions?: boolean
  live?: boolean
  enableNanoTimestamp?: boolean
  useLegacyHevc?: boolean
}

export default class OFlvFormat extends OFormat {

  public type: AVFormat = AVFormat.FLV

  private context: FlvContext

  public header: FlvHeader

  public script: FlvScriptTag

  public options: OFlvFormatOptions

  private annexb2AvccFilter: Annexb2AvccFilter

  private avpacket: pointer<AVPacket>

  private headerWriter: IOWriterSync
  private headerBuffers: Uint8Array[]

  constructor(options: OFlvFormatOptions = {}) {
    super()

    this.header = new FlvHeader()
    this.script = new FlvScriptTag()
    this.headerWriter = new IOWriterSync(100 * 1000)
    this.headerBuffers = []
    this.headerWriter.onFlush = ((buffer) => {
      this.headerBuffers.push(buffer.slice())
      return 0
    })

    this.options = options

    this.context = {
      keyframeFilePositions: [],
      keyFrameTimes: [],
      lastkeyframelocation: 0,
      lastkeyframetimestamp: 0n,
      lasttimestamp: 0n,
      framerate: 0,
      filesize: 0,
      audioSize: 0,
      videosize: 0,
      datasize: 0,
      duration: 0,
      scriptWrote: false,
      frameCount: 0,
      firstKeyframePositionWrote: false,
      videoMetadataWrote: false,
      enableNanoTimestamp: options.enableNanoTimestamp,
      multiAudioTracks: false,
      multiVideoTracks: false,
      useLegacyHevc: options.useLegacyHevc
    }
  }

  private getDefaultStream(formatContext: AVOFormatContext, mediaType: AVMediaType) {
    let streams = formatContext.streams.filter((stream) => {
      return stream.codecpar.codecType === mediaType
    })
    if (streams.length < 2) {
      return streams[0]
    }
    const legacy = streams.filter((stream) => {
      return !this.isEnhancedStream(stream)
    })
    return legacy.find((stream) => !!(stream.disposition & AVDisposition.DEFAULT)) || legacy[0] || streams[0]
  }

  private isEnhancedStream(stream: AVStream) {
    if (this.context.enableNanoTimestamp) {
      return true
    }
    const streamContext = stream.privData as FlvStreamContext
    if (this.context.useLegacyHevc
      && stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
      && !streamContext.trackId
      && !this.context.multiVideoTracks
    ) {
      return false
    }
    return oflv.isEnhancedCodecId(stream.codecpar.codecId) || streamContext?.trackId > 0
  }

  public init(formatContext: AVOFormatContext): number {
    if (formatContext.ioWriter) {
      formatContext.ioWriter.setEndian(true)
    }

    const audioDefaultStream = this.getDefaultStream(formatContext, AVMediaType.AVMEDIA_TYPE_AUDIO)
    const videoDefaultStream = this.getDefaultStream(formatContext, AVMediaType.AVMEDIA_TYPE_VIDEO)

    let audioNextTrack = 1
    let videoNextTrack = 1

    formatContext.streams.forEach((stream) => {
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        this.header.hasAudio = true
        this.script.onMetaData.hasAudio = true
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX) {
          if (stream.codecpar.sampleRate !== 16000) {
            logger.fatal('flv speex only support 16000 sample rate')
          }
          if (stream.codecpar.chLayout.nbChannels !== 1) {
            logger.fatal('flv speex only support 1 channel')
          }
        }
        let trackId = 0
        if (stream === audioDefaultStream) {
          this.script.onMetaData.audiocodecid = AVCodecID2FlvCodecType[stream.codecpar.codecId] ?? mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId])
          this.script.onMetaData.stereo = stream.codecpar.chLayout.nbChannels > 1 ? true : false
          this.script.onMetaData.audiosamplerate = stream.codecpar.sampleRate || 0
          this.script.onMetaData.audiosamplesize = stream.codecpar.frameSize || 0
        }
        else {
          trackId = audioNextTrack++
          if (!this.script.onMetaData.audioTrackIdInfoMap) {
            this.script.onMetaData.audioTrackIdInfoMap = {}
          }
          this.script.onMetaData.audioTrackIdInfoMap[trackId] = {
            audiocodecid: AVCodecID2FlvCodecTag[stream.codecpar.codecId] ? mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId]) : AVCodecID2FlvCodecType[stream.codecpar.codecId],
            stereo: stream.codecpar.chLayout.nbChannels > 1 ? true : false,
            audiosamplerate: stream.codecpar.sampleRate || 0,
            audiosamplesize: stream.codecpar.frameSize || 0
          }
          if (stream.metadata[AVStreamMetadataKey.TITLE]) {
            this.script.onMetaData.audioTrackIdInfoMap[trackId].title = stream.metadata[AVStreamMetadataKey.TITLE]
          }
          if (stream.metadata[AVStreamMetadataKey.LANGUAGE]) {
            this.script.onMetaData.audioTrackIdInfoMap[trackId].lang = stream.metadata[AVStreamMetadataKey.LANGUAGE]
          }
        }
        stream.privData = {
          trackId
        }
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        this.header.hasVideo = true
        this.script.onMetaData.hasVideo = true
        if ((videoDefaultStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || videoDefaultStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || videoDefaultStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC)
          && !this.annexb2AvccFilter
        ) {
          this.annexb2AvccFilter = new Annexb2AvccFilter()
          this.annexb2AvccFilter.init(addressof(videoDefaultStream.codecpar), addressof(videoDefaultStream.timeBase))
        }
        let trackId = 0
        if (stream === videoDefaultStream) {
          this.script.onMetaData.videocodecid = AVCodecID2FlvCodecType[stream.codecpar.codecId] ?? mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId])
          this.script.onMetaData.width = stream.codecpar.width || 0
          this.script.onMetaData.height = stream.codecpar.height || 0
          this.script.onMetaData.framerate = avQ2D(stream.codecpar.framerate)
        }
        else {
          trackId = videoNextTrack++
          if (!this.script.onMetaData.videoTrackIdInfoMap) {
            this.script.onMetaData.videoTrackIdInfoMap = {}
          }
          this.script.onMetaData.videoTrackIdInfoMap[trackId] = {
            videocodecid: AVCodecID2FlvCodecTag[stream.codecpar.codecId] ? mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId]) : AVCodecID2FlvCodecType[stream.codecpar.codecId],
            width: stream.codecpar.width || 0,
            height: stream.codecpar.height || 0,
            framerate: avQ2D(stream.codecpar.framerate)
          }
          if (stream.metadata[AVStreamMetadataKey.TITLE]) {
            this.script.onMetaData.videoTrackIdInfoMap[trackId].title = stream.metadata[AVStreamMetadataKey.TITLE]
          }
          if (stream.metadata[AVStreamMetadataKey.LANGUAGE]) {
            this.script.onMetaData.videoTrackIdInfoMap[trackId].lang = stream.metadata[AVStreamMetadataKey.LANGUAGE]
          }
        }
        stream.privData = {
          trackId
        }
      }
    })

    if (audioNextTrack > 1) {
      this.context.multiAudioTracks = true
    }
    if (videoNextTrack > 1) {
      this.context.multiVideoTracks = true
    }

    this.avpacket = createAVPacket()

    return 0
  }

  public async destroy(formatContext: AVOFormatContext) {
    if (this.annexb2AvccFilter) {
      this.annexb2AvccFilter.destroy()
      this.annexb2AvccFilter = null
    }
    if (this.avpacket) {
      destroyAVPacket(this.avpacket)
      this.avpacket = nullptr
    }
  }

  private writeMetadata(formatContext: AVOFormatContext, stream: AVStream) {
    if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1
    )
      && this.isEnhancedStream(stream)
    ) {
      const lightLevel = getSideData(addressof(stream.codecpar.codedSideData), addressof(stream.codecpar.nbCodedSideData), AVPacketSideDataType.AV_PKT_DATA_CONTENT_LIGHT_LEVEL)
      const display = getSideData(addressof(stream.codecpar.codedSideData), addressof(stream.codecpar.nbCodedSideData), AVPacketSideDataType.AV_PKT_DATA_MASTERING_DISPLAY_METADATA)
      const colorInfo: FlvColorInfo = {
        colorConfig: {}
      }
      if (stream.codecpar.colorTrc !== AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED) {
        colorInfo.colorConfig.transferCharacteristics = stream.codecpar.colorTrc
      }
      if (stream.codecpar.colorSpace !== AVColorSpace.AVCOL_SPC_UNSPECIFIED) {
        colorInfo.colorConfig.matrixCoefficients = stream.codecpar.colorSpace
      }
      if (stream.codecpar.colorPrimaries !== AVColorPrimaries.AVCOL_PRI_UNSPECIFIED) {
        colorInfo.colorConfig.colorPrimaries = stream.codecpar.colorPrimaries
      }
      if (lightLevel) {
        const lightLevelData = reinterpret_cast<pointer<AVContentLightMetadata>>(lightLevel.data)
        colorInfo.hdrCll = {
          maxCLL: lightLevelData.maxCLL,
          maxFall: lightLevelData.maxFALL
        }
      }
      if (display) {
        const displayData = reinterpret_cast<pointer<AVMasteringDisplayMetadata>>(display.data)
        colorInfo.hdrMdcv = {}
        if (displayData.hasPrimaries) {
          colorInfo.hdrMdcv.redX = avQ2D(displayData.displayPrimaries[0][0])
          colorInfo.hdrMdcv.redY = avQ2D(displayData.displayPrimaries[0][1])
          colorInfo.hdrMdcv.greenX = avQ2D(displayData.displayPrimaries[1][0])
          colorInfo.hdrMdcv.greenY = avQ2D(displayData.displayPrimaries[1][1])
          colorInfo.hdrMdcv.blueX = avQ2D(displayData.displayPrimaries[2][0])
          colorInfo.hdrMdcv.blueY = avQ2D(displayData.displayPrimaries[2][1])
          colorInfo.hdrMdcv.whitePointX = avQ2D(displayData.whitePoint[0])
          colorInfo.hdrMdcv.whitePointY = avQ2D(displayData.whitePoint[1])
        }
        if (displayData.hasLuminance) {
          colorInfo.hdrMdcv.maxLuminance = avQ2D(displayData.maxLuminance)
          colorInfo.hdrMdcv.minLuminance = avQ2D(displayData.minLuminance)
        }
      }

      oflv.writeTag(
        formatContext.ioWriter,
        FlvTag.VIDEO,
        0n,
        (ioWriter) => {
          oflv.writeVideoHeader(
            ioWriter,
            stream,
            this.context,
            true,
            VideoPacketType.Metadata,
            AVPacketFlags.AV_PKT_FLAG_KEY,
            0n,
            nullptr
          )
        },
        (ioWriter) => {
          amf.writeValue(ioWriter, 'colorInfo'),
          amf.writeValue(ioWriter, colorInfo)
        }
      )
    }
  }

  private writeMultichannelConfig(formatContext: AVOFormatContext, stream: AVStream) {
    if (this.isEnhancedStream(stream) && stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      oflv.writeTag(
        formatContext.ioWriter,
        FlvTag.AUDIO,
        0n,
        (ioWriter) => {
          oflv.writeAudioHeader(
            ioWriter,
            stream,
            this.context,
            true,
            AudioPacketType.MultichannelConfig,
            0n,
            nullptr
          )
        },
        (ioWriter) => {
          switch (stream.codecpar.chLayout.order) {
            case AVChannelOrder.AV_CHANNEL_ORDER_NATIVE:
              ioWriter.writeUint8(AudioChannelOrder.Native)
              break
            case AVChannelOrder.AV_CHANNEL_ORDER_CUSTOM:
              ioWriter.writeUint8(AudioChannelOrder.Custom)
              break
            default:
              ioWriter.writeUint8(AudioChannelOrder.Unspecified)
              break
          }
          ioWriter.writeUint8(stream.codecpar.chLayout.nbChannels)
          if (stream.codecpar.chLayout.order === AVChannelOrder.AV_CHANNEL_ORDER_NATIVE) {
            let mask = stream.codecpar.chLayout.u.mask & 0x03FFFFn
            mask |= (stream.codecpar.chLayout.u.mask >> (BigInt(AVChannel.AV_CHANNEL_LOW_FREQUENCY_2) - 18n)) & 0xFC0000n
            ioWriter.writeUint32(static_cast<uint32>(mask as uint64))
          }
          else if (stream.codecpar.chLayout.order === AVChannelOrder.AV_CHANNEL_ORDER_CUSTOM) {
            for (let i = 0; i < stream.codecpar.chLayout.nbChannels; i++) {
              const id = stream.codecpar.chLayout.u.map[i].id
              if (id >= AVChannel.AV_CHANNEL_FRONT_LEFT && id <= AVChannel.AV_CHANNEL_TOP_BACK_RIGHT) {
                ioWriter.writeUint8(id - AVChannel.AV_CHANNEL_FRONT_LEFT)
              }
              else if (id >= AVChannel.AV_CHANNEL_LOW_FREQUENCY_2 && id <= AVChannel.AV_CHANNEL_BOTTOM_FRONT_RIGHT) {
                ioWriter.writeUint8(id - AVChannel.AV_CHANNEL_LOW_FREQUENCY_2 + 18)
              }
              else if (id === AVChannel.AV_CHANNEL_UNUSED) {
                ioWriter.writeUint8(0xfe)
              }
              else {
                ioWriter.writeUint8(0xff)
              }
            }
          }
        }
      )
    }
  }

  public writeHeader(formatContext: AVOFormatContext): number {
    this.header.write(formatContext.ioWriter)
    // previousTagSize0 总是 0
    formatContext.ioWriter.writeUint32(0)

    if (this.options.live) {
      this.script.write(formatContext.ioWriter)
      this.context.scriptWrote = true
    }

    formatContext.streams.forEach((stream) => {
      const streamContext = stream.privData as FlvStreamContext
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        if (stream.codecpar.extradata && (this.isEnhancedStream(stream) || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC)) {
          oflv.writeTag(
            formatContext.ioWriter,
            FlvTag.AUDIO,
            0n,
            (ioWriter) => {
              oflv.writeAudioHeader(
                ioWriter,
                stream,
                this.context,
                this.isEnhancedStream(stream),
                this.isEnhancedStream(stream) ? AudioPacketType.SequenceStart : AACPacketType.AAC_SEQUENCE_HEADER,
                0n,
                nullptr
              )
            },
            mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)),
            (previousTagSize) => {
              this.context.filesize += previousTagSize + 4
              if (!streamContext.trackId) {
                this.context.audioSize += stream.codecpar.extradataSize
                this.script.onMetaData.hasMetadata = true
              }
              this.context.datasize += stream.codecpar.extradataSize
            }
          )
        }
        this.writeMultichannelConfig(formatContext, stream)
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        if (stream.codecpar.extradata
          && (this.isEnhancedStream(stream)
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          )
        ) {
          let extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
          if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          )
            && naluUtil.isAnnexb(extradata)
          ) {
            if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
              extradata = h264.annexbExtradata2AvccExtradata(extradata)
            }
            else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
              extradata = hevc.annexbExtradata2AvccExtradata(extradata)
            }
            else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
              extradata = vvc.annexbExtradata2AvccExtradata(extradata)
            }
          }
          const now = formatContext.ioWriter.getPos()
          oflv.writeTag(
            formatContext.ioWriter,
            FlvTag.VIDEO,
            0n,
            (ioWriter) => {
              oflv.writeVideoHeader(
                ioWriter,
                stream,
                this.context,
                this.isEnhancedStream(stream),
                this.isEnhancedStream(stream) ? VideoPacketType.SequenceStart : AVCPacketType.AVC_SEQUENCE_HEADER,
                AVPacketFlags.AV_PKT_FLAG_KEY,
                0n,
                nullptr
              )
            },
            extradata,
            (previousTagSize) => {
              this.context.filesize += previousTagSize + 4
              if (!streamContext.trackId) {
                this.context.videosize += stream.codecpar.extradataSize
                this.script.onMetaData.hasMetadata = true
              }
              this.context.datasize += stream.codecpar.extradataSize
              this.context.keyFrameTimes.push(0)
              this.context.keyframeFilePositions.push(Number(now))
              this.context.videoMetadataWrote = true
            }
          )
        }
      }
      this.writeMetadata(formatContext, stream)
    })
    return 0
  }

  private isNewExtradata(extradata: Uint8Array, stream: AVStream) {
    if (extradata.length === stream.codecpar.extradataSize) {
      const old = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
      for (let i = 0; i < extradata.length; i++) {
        if (extradata[i] !== old[i]) {
          return true
        }
      }
    }
    return false
  }

  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const streamContext = stream.privData as FlvStreamContext

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      // 如果有 extradata，先写 extradata 为一个 tag
      const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element && (this.isEnhancedStream(stream) || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC)) {
        const extradata = mapUint8Array(element.data, element.size)
        if (this.isNewExtradata(extradata, stream)) {
          oflv.writeTag(
            formatContext.ioWriter,
            FlvTag.AUDIO,
            avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q),
            (ioWriter) => {
              oflv.writeAudioHeader(
                ioWriter,
                stream,
                this.context,
                this.isEnhancedStream(stream),
                this.isEnhancedStream(stream) ? AudioPacketType.SequenceStart : AACPacketType.AAC_SEQUENCE_HEADER,
                avpacket.dts,
                addressof(avpacket.timeBase)
              )
            },
            extradata,
            (previousTagSize) => {
              this.context.filesize += previousTagSize + 4
            }
          )
          if (!streamContext.trackId) {
            this.context.audioSize += extradata.length
          }
          this.context.datasize += extradata.length
        }
      }

      if (avpacket.size) {
        // 不使用 oflv.writeTag，这个方法太慢，引擎无法内联优化，只适合一两次调用那种
        // 这里直接写
        this.headerWriter.reset()
        this.headerBuffers.length = 0
        oflv.writeAudioHeader(
          this.headerWriter,
          stream,
          this.context,
          this.isEnhancedStream(stream),
          this.isEnhancedStream(stream) ? AudioPacketType.CodedFrames : AACPacketType.AAC_RAW,
          avpacket.dts,
          addressof(avpacket.timeBase)
        )
        this.headerWriter.flush()
        const header = concatTypeArray(Uint8Array, this.headerBuffers)
        const now = formatContext.ioWriter.getPos()
        // tagType
        formatContext.ioWriter.writeUint8(FlvTag.AUDIO)
        // size
        formatContext.ioWriter.writeUint24(avpacket.size + header.length)
        // timestamp
        const timestamp = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
        formatContext.ioWriter.writeUint24(Number(timestamp & 0xffffffn))
        formatContext.ioWriter.writeUint8(Number((timestamp >> 24n) & 0xffn))
        // streamId always 0
        formatContext.ioWriter.writeUint24(0)
        formatContext.ioWriter.writeBuffer(header)
        formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)))
        const previousTagSize = Number(formatContext.ioWriter.getPos() - now)
        formatContext.ioWriter.writeUint32(previousTagSize)
        this.context.filesize += previousTagSize + 4
      }
      if (!streamContext.trackId) {
        this.context.audioSize += avpacket.size
        this.context.lasttimestamp = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
      }
      this.context.datasize += avpacket.size
    }
    else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {

      if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
      ) && avpacket.bitFormat !== BitFormat.AVCC
      ) {
        this.annexb2AvccFilter.sendAVPacket(avpacket)
        this.annexb2AvccFilter.receiveAVPacket(this.avpacket)
        avpacket = this.avpacket
      }

      const keyframePos = formatContext.ioWriter.getPos()

      // 如果有 extradata，先写 extradata 为一个 tag
      const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element) {
        const extradata = mapUint8Array(element.data, element.size)
        if (this.isNewExtradata(extradata, stream)
          && (this.isEnhancedStream(stream)
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          )
        ) {
          oflv.writeTag(
            formatContext.ioWriter,
            FlvTag.VIDEO,
            avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q),
            (ioWriter) => {
              oflv.writeVideoHeader(
                ioWriter,
                stream,
                this.context,
                this.isEnhancedStream(stream),
                this.isEnhancedStream(stream) ? VideoPacketType.SequenceStart : AVCPacketType.AVC_SEQUENCE_HEADER,
                avpacket.flags,
                avpacket.dts,
                addressof(avpacket.timeBase)
              )
            },
            extradata,
            (previousTagSize) => {
              this.context.filesize += previousTagSize + 4
            }
          )
          if (!streamContext.trackId) {
            this.context.videosize += extradata.length
          }
          this.context.datasize += extradata.length
        }
      }

      if (avpacket.size) {
        let ct = 0
        if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
          ct = static_cast<int32>(avRescaleQ2(avpacket.pts - avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q))
        }

        const packetType = avpacket.dts !== avpacket.pts
          && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          )
          ? VideoPacketType.CodedFrames
          : VideoPacketType.CodedFramesX

        // 不使用 oflv.writeTag，这个方法太慢，引擎无法内联优化，只适合一两次调用那种
        // 这里直接写
        this.headerWriter.reset()
        this.headerBuffers.length = 0
        oflv.writeVideoHeader(
          this.headerWriter,
          stream,
          this.context,
          this.isEnhancedStream(stream),
          this.isEnhancedStream(stream) ? packetType : AVCPacketType.AVC_NALU,
          avpacket.flags,
          avpacket.dts,
          addressof(avpacket.timeBase),
          ct
        )
        this.headerWriter.flush()
        const header = concatTypeArray(Uint8Array, this.headerBuffers)
        const now = formatContext.ioWriter.getPos()
        // tagType
        formatContext.ioWriter.writeUint8(FlvTag.VIDEO)
        // size
        formatContext.ioWriter.writeUint24(avpacket.size + header.length)
        // timestamp
        const timestamp = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
        formatContext.ioWriter.writeUint24(Number(timestamp & 0xffffffn))
        formatContext.ioWriter.writeUint8(Number((timestamp >> 24n) & 0xffn))
        // streamId always 0
        formatContext.ioWriter.writeUint24(0)
        formatContext.ioWriter.writeBuffer(header)
        formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)))
        const previousTagSize = Number(formatContext.ioWriter.getPos() - now)
        formatContext.ioWriter.writeUint32(previousTagSize)
        this.context.filesize += previousTagSize + 4

        if (!streamContext.trackId) {
          this.context.frameCount++
          this.context.videosize += avpacket.size
          this.context.lasttimestamp = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
        }
        this.context.datasize += avpacket.size
        if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
          if (this.context.firstKeyframePositionWrote || !this.context.videoMetadataWrote) {
            this.context.lastkeyframetimestamp = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
            this.context.lastkeyframelocation = Number(keyframePos)
            this.context.keyFrameTimes.push(Number((Number(this.context.lastkeyframetimestamp) * avQ2D(AV_MILLI_TIME_BASE_Q)).toFixed(2)))
            this.context.keyframeFilePositions.push(this.context.lastkeyframelocation)
          }
          else {
            this.context.firstKeyframePositionWrote = true
          }
        }
      }
    }
    return 0
  }

  public writeTrailer(formatContext: AVOFormatContext): number {

    formatContext.streams.forEach((stream) => {
      const streamContext = stream.privData as FlvStreamContext
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        || this.isEnhancedStream(stream)
      ) {
        oflv.writeTag(
          formatContext.ioWriter,
          FlvTag.VIDEO,
          this.context.lasttimestamp,
          (ioWriter) => {
            oflv.writeVideoHeader(
              ioWriter,
              stream,
              this.context,
              this.isEnhancedStream(stream),
              this.isEnhancedStream(stream)
                ? (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
                  ? AudioPacketType.SequenceEnd
                  : VideoPacketType.SequenceEnd
                )
                : AVCPacketType.AVC_END_OF_ENQUENCE,
              AVPacketFlags.AV_PKT_FLAG_END,
              this.context.lasttimestamp,
              nullptr
            )
          },
          undefined,
          (previousTagSize) => {
            this.context.filesize += previousTagSize + 4
          }
        )
        if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO && !streamContext.trackId) {
          this.script.onMetaData.canSeekToEnd = true
        }
      }
    })

    if (!this.context.scriptWrote) {
      formatContext.ioWriter.flush()

      this.script.onMetaData.filesize = this.context.filesize
      this.script.onMetaData.audiosize = this.context.audioSize
      this.script.onMetaData.videosize = this.context.videosize
      this.script.onMetaData.datasize = this.context.datasize
      this.script.onMetaData.lasttimestamp = this.context.lasttimestamp

      if (this.options.addKeyframePositions) {
        this.script.onMetaData.lastkeyframetimestamp = this.context.lastkeyframetimestamp
        this.script.onMetaData.lastkeyframelocation = this.context.lastkeyframelocation
        if (this.context.keyFrameTimes.length > 1) {
          this.script.onMetaData.hasKeyframes = true
          this.script.onMetaData.keyframes = {
            filepositions: this.context.keyframeFilePositions,
            times: this.context.keyFrameTimes
          }
        }
        else {
          this.script.onMetaData.hasKeyframes = false
        }
      }
      else {
        this.script.onMetaData.hasKeyframes = false
      }

      this.script.onMetaData.duration = Number(this.context.lasttimestamp) / 1000
      this.script.onMetaData.audiodatarate = this.context.audioSize / this.script.onMetaData.duration / 1000 * 8
      this.script.onMetaData.videodatarate = this.context.videosize / this.script.onMetaData.duration / 1000 * 8
      this.script.onMetaData.framerate = this.context.frameCount / this.script.onMetaData.duration

      const size = this.script.computeSize()

      array.each(this.context.keyframeFilePositions, (item, index) => {
        this.context.keyframeFilePositions[index] = item + 11 + size + 4
      })

      if (this.script.onMetaData.keyframes) {
        this.script.onMetaData.keyframes.filepositions = this.context.keyframeFilePositions
      }

      this.context.filesize += 11 + size + 4
      this.script.onMetaData.filesize = this.context.filesize

      const buffers = []
      const oldFlush = formatContext.ioWriter.onFlush

      formatContext.ioWriter.onFlush = (buffer) => {
        buffers.push(buffer.slice())
        return 0
      }

      this.script.write(formatContext.ioWriter)

      formatContext.ioWriter.flush()
      formatContext.ioWriter.onFlush = oldFlush
      const data = concatTypeArray(Uint8Array, buffers)
      if (oldFlush) {
        oldFlush(data, 13n)
      }
    }
    else {
      formatContext.ioWriter.flush()
    }

    return 0
  }

  public flush(context: AVOFormatContext): number {
    context.ioWriter.flush()
    return 0
  }

}
