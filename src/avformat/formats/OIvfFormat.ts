/*
 * libmedia lvf encoder
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
import { AVMediaType } from 'avutil/codec'
import { AVFormat } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import { avRescaleQ2 } from 'avutil/util/rational'
import { getAVPacketData } from 'avutil/util/avpacket'

export const enum IVFCodec {
  VP8 = 'VP80',
  VP9 = 'VP90'
}

export class IVFHeader {
  // version (should be 0)
  public version: number
  // length of header in bytes
  public length: number
  // FourCC (e.g., 'VP80')
  public codec: IVFCodec
  // width in pixels
  public width: number
  // height in pixels
  public height: number
  // denominator
  public denominator: number
  // numerator
  public numerator: number
  // number of frames in file
  public framesCount: number

  constructor() {
    this.version = 0
    this.length = 32
    this.codec = IVFCodec.VP8
    this.width = 0
    this.height = 0
    this.framesCount = 0
    this.denominator = 1
    this.numerator = 0
  }
}

export default class OIVFFormat extends OFormat {

  public type: AVFormat = AVFormat.IVF

  public header: IVFHeader

  constructor() {
    super()

    this.header = new IVFHeader()
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(false)
    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
    if (stream) {
      this.header.width = stream.codecpar.width
      this.header.height = stream.codecpar.height
      this.header.numerator = stream.timeBase.num
      this.header.denominator = stream.timeBase.den
    }
    return 0
  }

  public writeHeader(formatContext: AVOFormatContext): number {
    // byte 0-3 signature: 'DKIF'
    formatContext.ioWriter.writeString('DKIF')
    // byte 4-5 version (should be 0)
    formatContext.ioWriter.writeUint16(this.header.version)
    // byte 6-7 length of header in bytes
    formatContext.ioWriter.writeUint16(32)
    // bytes 8-11 codec FourCC (e.g., 'VP80')
    formatContext.ioWriter.writeString(this.header.codec)
    // bytes 12-13 width in pixels
    formatContext.ioWriter.writeUint16(this.header.width)
    // bytes 14-15 height in pixels
    formatContext.ioWriter.writeUint16(this.header.height)
    // bytes 16-19 denominator
    formatContext.ioWriter.writeUint32(this.header.denominator)
    // bytes 19-23 numerator
    formatContext.ioWriter.writeUint32(this.header.numerator)
    // bytes 24-27 number of frames in file
    formatContext.ioWriter.writeUint32(this.header.framesCount)
    // bytes 28-31 unused
    formatContext.ioWriter.writeUint32(0)

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

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
      if (stream) {
        formatContext.ioWriter.writeUint32(avpacket.size)
        formatContext.ioWriter.writeUint64(avRescaleQ2(avpacket.pts || avpacket.dts, addressof(avpacket.timeBase), stream.timeBase))
        formatContext.ioWriter.writeBuffer(getAVPacketData(avpacket))
        this.header.framesCount++
      }
    }

    return 0
  }

  public writeTrailer(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.seek(24n)
    // 更新 framesCount
    formatContext.ioWriter.writeUint32(this.header.framesCount)

    formatContext.ioWriter.flush()

    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

}
