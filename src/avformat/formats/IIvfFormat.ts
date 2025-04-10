/*
 * libmedia lvf decoder
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

import { AVIFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat } from 'avutil/avformat'
import { mapSafeUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import AVStream from 'avutil/AVStream'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'

export const enum IVFCodec {
  VP8 = 'VP80',
  VP9 = 'VP90'
}

const IVFCodec2CodecId = {
  [IVFCodec.VP8]: AVCodecID.AV_CODEC_ID_VP8,
  [IVFCodec.VP9]: AVCodecID.AV_CODEC_ID_VP9,
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

export default class IIVFFormat extends IFormat {

  public type: AVFormat = AVFormat.IVF

  public header: IVFHeader

  constructor() {
    super()

    this.header = new IVFHeader()
  }

  public init(formatContext: AVIFormatContext): void {

    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(false)
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      const signature = await formatContext.ioReader.readString(4)
      if (signature !== 'DKIF') {
        logger.error('the file format is not ivf')
        return errorType.DATA_INVALID
      }

      this.header.version = await formatContext.ioReader.readUint16()
      await formatContext.ioReader.skip(2)
      this.header.codec = await formatContext.ioReader.readString(4) as IVFCodec
      this.header.width = await formatContext.ioReader.readUint16()
      this.header.height = await formatContext.ioReader.readUint16()
      this.header.denominator = await formatContext.ioReader.readUint32()
      this.header.numerator = await formatContext.ioReader.readUint32()
      this.header.framesCount = await formatContext.ioReader.readUint32()

      // unused
      await formatContext.ioReader.skip(4)

      const stream = formatContext.createStream()
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
      stream.codecpar.codecId = IVFCodec2CodecId[this.header.codec]
      stream.timeBase.den = this.header.denominator
      stream.timeBase.num = this.header.numerator
      stream.codecpar.width = this.header.width
      stream.codecpar.height = this.header.height
      stream.nbFrames = static_cast<int64>(this.header.framesCount)

      if (this.onStreamAdd) {
        this.onStreamAdd(stream)
      }

      return 0
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {

      const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

      if (stream) {
        const pos = formatContext.ioReader.getPos()
        const size = await formatContext.ioReader.readUint32()
        const pts = await formatContext.ioReader.readUint64()

        const data: pointer<uint8> = avMalloc(size)
        addAVPacketData(avpacket, data, size)
        await formatContext.ioReader.readBuffer(size, mapSafeUint8Array(data, size))

        avpacket.pos = pos
        avpacket.pts = avpacket.dts = pts
        avpacket.timeBase.den = this.header.denominator
        avpacket.timeBase.num = this.header.numerator
        avpacket.streamIndex = stream.index

        if (stream.startTime === NOPTS_VALUE_BIGINT) {
          stream.startTime = avpacket.pts || avpacket.dts
        }
      }
      else {
        return errorType.DATA_INVALID
      }

      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }

}
