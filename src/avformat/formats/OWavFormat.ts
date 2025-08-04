/*
 * libmedia wav encoder
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

import { AVOFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import OFormat from './OFormat'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { AVFormat } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import * as object from 'common/util/object'
import { WavTag2CodecId } from './riff/riff'
import { mapUint8Array } from 'cheap/std/memory'
import * as pcmUtil from 'avutil/util/pcm'
import gcd from 'common/math/gcd'
import { NOPTS_VALUE_BIGINT, UINT32_MAX, UINT64_MAX } from 'avutil/constant'
import { avRescaleQ } from 'avutil/util/rational'

export interface OWavFormatOptions {
  forceRF64?: boolean
}

const defaultOptions: OWavFormatOptions = {
  forceRF64: false
}


export default class OWavFormat extends OFormat {

  public type: AVFormat = AVFormat.WAV

  private options: OWavFormatOptions

  private minPts: int64
  private maxPts: int64
  private lastDuration: int64
  private sampleCount: int64
  private dataPos: int64
  private dsPos: int64

  constructor(options: OWavFormatOptions = {}) {
    super()
    this.options = object.extend({}, defaultOptions, options)
  }


  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(false)
    this.maxPts = 0n
    this.minPts = static_cast<int64>(UINT64_MAX)
    this.sampleCount = 0n
    this.lastDuration = 0n
    this.dataPos = -1n
    this.dsPos = -1n
    return 0
  }

  public writeHeader(formatContext: AVOFormatContext): number {

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)

    if (!stream.codecpar.codecTag || stream.codecpar.codecTag > 0xffff) {
      let subFormat = 0xfffe

      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F32LE
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F64LE
      ) {
        subFormat = 0x0003
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_U8
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16LE
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S24LE
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S32LE
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S64LE
      ) {
        subFormat = 0x0001
      }
      else {
        object.each(WavTag2CodecId, (codecId, key) => {
          if (codecId === stream.codecpar.codecId) {
            subFormat = +key
          }
        })
      }
      stream.codecpar.codecTag = subFormat
    }
    if (!stream.codecpar.bitsPerCodedSample) {
      stream.codecpar.bitsPerCodedSample = pcmUtil.getBitsPerSample(stream.codecpar.codecId)
    }
    if (!stream.codecpar.blockAlign) {
      stream.codecpar.blockAlign = stream.codecpar.bitsPerCodedSample * stream.codecpar.chLayout.nbChannels / gcd(8, stream.codecpar.bitsPerCodedSample)
    }

    formatContext.ioWriter.writeString('RIFF')
    formatContext.ioWriter.writeUint32(-1)
    formatContext.ioWriter.writeString('WAVE')

    this.dsPos = formatContext.ioWriter.getPos()
    formatContext.ioWriter.writeString('JUNK')
    formatContext.ioWriter.writeUint32(28)
    // riff size
    formatContext.ioWriter.writeUint64(0n)
    // data size
    formatContext.ioWriter.writeUint64(0n)
    // sample count
    formatContext.ioWriter.writeUint64(0n)
    formatContext.ioWriter.writeUint32(0)


    formatContext.ioWriter.writeString('fmt ')
    formatContext.ioWriter.writeUint32(16)
    formatContext.ioWriter.writeUint16(stream.codecpar.codecTag)
    formatContext.ioWriter.writeUint16(stream.codecpar.chLayout.nbChannels)
    formatContext.ioWriter.writeUint32(stream.codecpar.sampleRate)
    formatContext.ioWriter.writeUint32(static_cast<uint32>((stream.codecpar.bitrate / 8n) as uint64))
    formatContext.ioWriter.writeUint16(stream.codecpar.blockAlign)
    formatContext.ioWriter.writeUint16(stream.codecpar.bitsPerCodedSample)

    this.dataPos = formatContext.ioWriter.getPos()
    formatContext.ioWriter.writeString('data')
    formatContext.ioWriter.writeUint32(-1)

    return 0
  }
  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    if (!avpacket.size) {
      logger.warn(`packet\'s size is 0: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_AUDIO) {
      logger.warn(`packet\'s type is not audio: ${avpacket.streamIndex}, ignore it`)
      return
    }

    formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)))

    if (avpacket.pts < this.minPts) {
      this.minPts = avpacket.pts
    }
    if (avpacket.pts > this.maxPts) {
      this.maxPts = avpacket.pts
    }
    if (avpacket.duration !== NOPTS_VALUE_BIGINT) {
      this.lastDuration = avpacket.duration
    }

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F32LE
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F64LE
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_U8
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16LE
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S24LE
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S32LE
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S64LE
    ) {
      this.sampleCount += static_cast<int64>(Math.floor(avpacket.size / (stream.codecpar.chLayout.nbChannels * stream.codecpar.bitsPerCodedSample / 8)) as int32)
    }

    return 0
  }
  public writeTrailer(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)

    const fileSize = formatContext.ioWriter.getPos()
    const dataSize = fileSize - this.dataPos - 8n
    let rf64 = false
    if (this.options.forceRF64 || fileSize - 8n > static_cast<int64>(UINT32_MAX as uint32)) {
      rf64 = true
    }
    else {
      formatContext.ioWriter.seek(4n)
      formatContext.ioWriter.writeUint32(static_cast<uint32>((fileSize - 8n) as uint64))
      formatContext.ioWriter.seek(this.dataPos + 4n)
      formatContext.ioWriter.writeUint32(static_cast<uint32>(dataSize as uint64))
      formatContext.ioWriter.seek(fileSize)
    }

    if (rf64) {
      let sampleCount = this.sampleCount
      if (!this.sampleCount) {
        sampleCount = avRescaleQ(this.maxPts - this.minPts + this.lastDuration, stream.timeBase, {num: 1, den: stream.codecpar.sampleRate})
      }
      formatContext.ioWriter.seek(0n)
      formatContext.ioWriter.writeString('RF64')
      formatContext.ioWriter.writeUint32(-1)

      formatContext.ioWriter.seek(this.dsPos)
      formatContext.ioWriter.writeString('ds64')
      formatContext.ioWriter.writeUint32(28)
      // riff size
      formatContext.ioWriter.writeUint64(fileSize - 8n)
      // data size
      formatContext.ioWriter.writeUint64(dataSize)
      // sample count
      formatContext.ioWriter.writeUint64(sampleCount)
      formatContext.ioWriter.writeUint32(0)
      formatContext.ioWriter.seek(fileSize)
    }

    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

}
