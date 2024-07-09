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
import * as object from 'common/util/object'
import { AVPacketSideDataType, AVCodecID, AVMediaType } from 'avutil/codec'
import { AVCPacketType, AVCodecID2FlvCodecType, FlvCodecHeaderLength, FlvTag, PacketTypeExt } from './flv/flv'
import { FlvContext } from './flv/type'

import * as oflv from './flv/oflv'

import * as flvAAC from './flv/codecs/aac'
import * as flvH264 from './flv/codecs/h264'
import * as flvEnhanced from './flv/codecs/enhanced'

import concatTypeArray from 'common/function/concatTypeArray'
import { AVFormat } from '../avformat'
import { mapUint8Array } from 'cheap/std/memory'
import * as logger from 'common/util/logger'
import { getAVPacketSideData } from 'avutil/util/avpacket'
import { avQ2D, avRescaleQ } from 'avutil/util/rational'
import Annexb2AvccFilter from '../bsf/h2645/Annexb2AvccFilter'
import { BitFormat } from '../codecs/h264'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'


export interface FlvFormatOptions {
  hasKeyframes?: boolean
  live?: boolean
}

export default class OFlvFormat extends OFormat {

  public type: AVFormat = AVFormat.FLV

  private context: FlvContext

  public header: FlvHeader

  public script: FlvScriptTag

  public options: FlvFormatOptions

  private annexb2AvccFilter: Annexb2AvccFilter

  constructor(options: FlvFormatOptions = {}) {
    super()

    this.header = new FlvHeader()
    this.script = new FlvScriptTag()

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
      videoMetadataWrote: false
    }
  }

  public init(formatContext: AVOFormatContext): number {
    if (formatContext.ioWriter) {
      formatContext.ioWriter.setEndian(true)
    }

    const audioStream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
    const videoStream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

    if (audioStream) {
      this.header.hasAudio = true
      this.script.onMetaData.hasAudio = true

      if (audioStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX) {
        if (audioStream.codecpar.sampleRate !== 16000) {
          logger.fatal('flv speex only support 16000 sample rate')
        }
        if (audioStream.codecpar.chLayout.nbChannels !== 1) {
          logger.fatal('flv speex only support 1 channel')
        }
      }

      if (object.has(AVCodecID2FlvCodecType, audioStream.codecpar.codecId as number)) {
        this.script.onMetaData.audiocodecid = AVCodecID2FlvCodecType[audioStream.codecpar.codecId]
        this.script.onMetaData.stereo = audioStream.codecpar.chLayout.nbChannels > 1 ? true : false
        this.script.onMetaData.audiosamplerate = audioStream.codecpar.sampleRate || 0
        this.script.onMetaData.audiosamplesize = audioStream.codecpar.frameSize || 0
      }

      audioStream.timeBase.den = 1000
      audioStream.timeBase.num = 1
    }
    if (videoStream) {
      this.header.hasVideo = true
      this.script.onMetaData.hasVideo = true
      if (object.has(AVCodecID2FlvCodecType, videoStream.codecpar.codecId as number)) {
        this.script.onMetaData.videocodecid = AVCodecID2FlvCodecType[videoStream.codecpar.codecId]
        this.script.onMetaData.width = videoStream.codecpar.width || 0
        this.script.onMetaData.height = videoStream.codecpar.height || 0
        this.script.onMetaData.framerate = avQ2D(videoStream.codecpar.framerate)
      }
      videoStream.timeBase.den = 1000
      videoStream.timeBase.num = 1

      this.annexb2AvccFilter = new Annexb2AvccFilter()
      this.annexb2AvccFilter.init(addressof(videoStream.codecpar), addressof(videoStream.timeBase))
    }

    return 0
  }

  public destroy(formatContext: AVOFormatContext): void {
    super.destroy(formatContext)
    if (this.annexb2AvccFilter) {
      this.annexb2AvccFilter.destroy()
      this.annexb2AvccFilter = null
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

    const audioStream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
    const videoStream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

    if (audioStream && audioStream.codecpar.extradata) {
      if (audioStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
        const length = flvAAC.writeExtradata(
          formatContext.ioWriter,
          audioStream,
          mapUint8Array(audioStream.codecpar.extradata, audioStream.codecpar.extradataSize)
        )

        this.context.filesize += length + 4
        this.context.audioSize += audioStream.codecpar.extradataSize
        this.context.datasize += audioStream.codecpar.extradataSize
      }

      this.script.onMetaData.hasMetadata = true
    }
    if (videoStream && videoStream.codecpar.extradata) {
      if (videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
      ) {

        const now = formatContext.ioWriter.getPos()

        const usdEnhanced = videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
          || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1

        const length = usdEnhanced
          ? flvEnhanced.writeExtradata(
            formatContext.ioWriter,
            videoStream,
            mapUint8Array(videoStream.codecpar.extradata, videoStream.codecpar.extradataSize),
            AVPacketFlags.AV_PKT_FLAG_KEY
          )
          : flvH264.writeExtradata(
            formatContext.ioWriter,
            videoStream,
            mapUint8Array(videoStream.codecpar.extradata, videoStream.codecpar.extradataSize),
            AVPacketFlags.AV_PKT_FLAG_KEY
          )
        this.context.filesize += length + 4
        this.context.videosize += videoStream.codecpar.extradataSize
        this.context.datasize += videoStream.codecpar.extradataSize

        this.context.keyFrameTimes.push(0)
        this.context.keyframeFilePositions.push(Number(now))
        this.context.videoMetadataWrote = true
      }

      this.script.onMetaData.hasMetadata = true
    }

    return 0
  }

  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      // 如果有 metadata，先写 metadata 为一个 tag
      const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element) {
        const extradata = mapUint8Array(element.data, element.size)
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          flvAAC.writeExtradata(
            formatContext.ioWriter,
            stream,
            extradata
          )
        }
      }

      if (avpacket.size) {
        const now = formatContext.ioWriter.getPos()

        oflv.writeTagHeader(
          formatContext.ioWriter,
          FlvTag.AUDIO,
          avpacket.size + 1 + FlvCodecHeaderLength[stream.codecpar.codecId],
          avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase)
        )

        oflv.writeAudioTagDataHeader(formatContext.ioWriter, stream)

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          flvAAC.writeDataHeader(formatContext.ioWriter, flvAAC.AACPacketType.AAC_RAW)
        }

        formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, avpacket.size))

        const previousTagSize = Number(formatContext.ioWriter.getPos() - now)
        formatContext.ioWriter.writeUint32(previousTagSize)

        this.context.audioSize += previousTagSize
        this.context.filesize += previousTagSize + 4
        this.context.lasttimestamp = avRescaleQ(avpacket.pts, avpacket.timeBase, stream.timeBase)
        this.context.datasize += avpacket.size || 0
      }
    }
    else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {

      if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
      ) && avpacket.bitFormat !== BitFormat.AVCC
      ) {
        this.annexb2AvccFilter.sendAVPacket(avpacket)
        this.annexb2AvccFilter.receiveAVPacket(avpacket)
      }

      const keyframePos = formatContext.ioWriter.getPos()

      // 如果有 extradata，先写 extradata 为一个 tag
      const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element) {
        const extradata = mapUint8Array(element.data, element.size)
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        ) {
          flvH264.writeExtradata(
            formatContext.ioWriter,
            stream,
            extradata,
            AVPacketFlags.AV_PKT_FLAG_KEY
          )
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1
        ) {
          flvEnhanced.writeExtradata(
            formatContext.ioWriter,
            stream,
            mapUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize),
            AVPacketFlags.AV_PKT_FLAG_KEY
          )
        }
      }

      if (avpacket.size) {
        const now = formatContext.ioWriter.getPos()
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        ) {
          oflv.writeTagHeader(
            formatContext.ioWriter,
            FlvTag.VIDEO,
            avpacket.size + 1 + FlvCodecHeaderLength[stream.codecpar.codecId],
            avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase)
          )

          oflv.writeVideoTagDataHeader(formatContext.ioWriter, stream, avpacket.flags)

          let ct = 0
          if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
            ct = static_cast<int32>(avRescaleQ(avpacket.pts - avpacket.dts, avpacket.timeBase, stream.timeBase))
          }
          flvH264.writeDataHeader(formatContext.ioWriter, AVCPacketType.AVC_NALU, ct)
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1
        ) {
          const packetType = avpacket.dts !== avpacket.pts
            && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
            )
            ? PacketTypeExt.PacketTypeCodedFrames
            : PacketTypeExt.PacketTypeCodedFramesX
          
          oflv.writeTagHeader(
            formatContext.ioWriter,
            FlvTag.VIDEO,
            avpacket.size + 1 + FlvCodecHeaderLength[stream.codecpar.codecId]
              + (packetType === PacketTypeExt.PacketTypeCodedFrames ? 3 : 0),
            avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase)
          )
          oflv.writeVideoTagExtDataHeader(formatContext.ioWriter, stream, packetType, avpacket.flags)
        
          flvEnhanced.writeCodecTagHeader(formatContext.ioWriter, stream.codecpar.codecId)

          if (packetType === PacketTypeExt.PacketTypeCodedFrames) {
            let ct = 0
            if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
              ct = static_cast<int32>(avRescaleQ(avpacket.pts - avpacket.dts, avpacket.timeBase, stream.timeBase))
            }
            formatContext.ioWriter.writeUint24(ct)
          }
        }

        formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, avpacket.size))

        const previousTagSize = Number(formatContext.ioWriter.getPos() - now)
        formatContext.ioWriter.writeUint32(previousTagSize)

        this.context.videosize += previousTagSize
        this.context.filesize += previousTagSize + 4
        this.context.lasttimestamp = avRescaleQ(avpacket.pts, avpacket.timeBase, stream.timeBase)
        this.context.datasize += avpacket.size || 0
        this.context.frameCount++

        if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
          if (this.context.firstKeyframePositionWrote || !this.context.videoMetadataWrote) {
            this.context.lastkeyframetimestamp = avRescaleQ(avpacket.pts, avpacket.timeBase, stream.timeBase)
            this.context.lastkeyframelocation = Number(keyframePos)
            this.context.keyFrameTimes.push(Number((Number(this.context.lastkeyframetimestamp) * avQ2D(stream.timeBase)).toFixed(2)))
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

    const videoStream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
    if (videoStream
      && (videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
      )
    ) {
      const usdEnhanced = videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9
        || videoStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1

      oflv.writeTagHeader(
        formatContext.ioWriter,
        FlvTag.VIDEO,
        1 + FlvCodecHeaderLength[videoStream.codecpar.codecId],
        0n
      )
      if (usdEnhanced) {
        oflv.writeVideoTagExtDataHeader(formatContext.ioWriter, videoStream, PacketTypeExt.PacketTypeSequenceEnd, AVPacketFlags.AV_PKT_FLAG_KEY)
        flvEnhanced.writeCodecTagHeader(formatContext.ioWriter, videoStream.codecpar.codecId)
      }
      else {
        oflv.writeVideoTagDataHeader(formatContext.ioWriter, videoStream, AVPacketFlags.AV_PKT_FLAG_KEY)
        flvH264.writeDataHeader(formatContext.ioWriter, AVCPacketType.AVC_END_OF_ENQUENCE, 0)
      }
      formatContext.ioWriter.writeUint32(11 + 1 + FlvCodecHeaderLength[videoStream.codecpar.codecId])
      this.context.videosize += 11 + 1 + FlvCodecHeaderLength[videoStream.codecpar.codecId]
      this.context.filesize += 11 + 1 + FlvCodecHeaderLength[videoStream.codecpar.codecId] + 4

      this.script.onMetaData.canSeekToEnd = true
    }

    if (!this.context.scriptWrote) {
      formatContext.ioWriter.flush()

      this.script.onMetaData.filesize = this.context.filesize
      this.script.onMetaData.audiosize = this.context.audioSize
      this.script.onMetaData.videosize = this.context.videosize
      this.script.onMetaData.datasize = this.context.datasize
      this.script.onMetaData.lasttimestamp = this.context.lasttimestamp

      if (this.options.hasKeyframes) {
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

      this.script.onMetaData.duration = Number((Number(this.context.lasttimestamp) / 1000).toFixed(2))
      this.script.onMetaData.audiodatarate = Number((this.context.audioSize / this.script.onMetaData.duration / 1000).toFixed(2))
      this.script.onMetaData.videodatarate = Number((this.context.videosize / this.script.onMetaData.duration / 1000).toFixed(2))
      this.script.onMetaData.framerate = Math.floor(this.context.frameCount / this.script.onMetaData.duration)

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
