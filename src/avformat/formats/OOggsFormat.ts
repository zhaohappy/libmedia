/*
 * libmedia oggs encoder
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

import IOWriter from 'common/io/IOWriterSync'
import Stream from '../AVStream'
import { AVOFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import OFormat from './OFormat'
import { OggPage, PagePayload } from './oggs/OggPage'
import { AVMediaType } from 'avutil/codec'
import { AVFormat } from '../avformat'
import * as logger from 'common/util/logger'
import { getAVPacketData } from 'avutil/util/avpacket'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'

const PAGE_MAX = 255 * 255

interface OggsStreamPrivData {
  /**
   * 对于音频表示已经写入的 pcm 采样数
   * 对于视频表示写入的 frame count
   * 
   */
  granulePosition: bigint

  /**
   * page 序列号
   */
  pageSequenceLast: number
}

export default class OOggFormat extends OFormat {

  public type: AVFormat = AVFormat.OGGS

  private checksumTable: number[]

  public headerPagesPayload: PagePayload[]

  private cacheWriter: IOWriter

  private page: OggPage

  constructor() {
    super()
    this.checksumTable = []
    this.page = new OggPage()
    this.headerPagesPayload = []
  }

  private initChecksumTab() {
    for ( let i = 0; i < 256; i++ ) {
      let r = i << 24
      for ( let j = 0; j < 8; j++ ) {
        r = ((r & 0x80000000) != 0) ? ((r << 1) ^ 0x04c11db7) : (r << 1)
      }
      this.checksumTable[i] = (r & 0xffffffff)
    }
  }

  private getChecksum(data: Uint8Array) {
    let checksum = 0
    for (let i = 0; i < data.length; i++ ) {
      checksum = (checksum << 8) ^ this.checksumTable[((checksum >>> 24) & 0xff) ^ data[i]]
    }
    return checksum >>> 0
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(false)

    this.initChecksumTab()

    this.cacheWriter = new IOWriter(PAGE_MAX, false)

    if (this.headerPagesPayload) {
      for (let i = 0; i < this.headerPagesPayload.length; i++) {
        this.headerPagesPayload[i].setCodec(formatContext.getStreamByIndex(this.headerPagesPayload[i].streamIndex).codecpar)
      }
    }

    if (formatContext.streams) {
      formatContext.streams.forEach((stream) => {
        stream.privData = {
          granulePosition: 0n,
          pageSequenceLast: 0
        }
      })
    }
    return 0
  }

  private writePage(stream: Stream, ioWriter: IOWriter, buffer: Uint8Array, headerTypeFlag: number) {
    let length = buffer.length
    let realLength = length
    let offset = 0
    while (length > 0) {
      const len = Math.min(PAGE_MAX, length)
      const payload = buffer.subarray(offset, offset + len)

      const isLast = offset + len === realLength
      const isStart = offset === 0


      this.page.reset()
      this.page.serialNumber = stream.index
      if (!isLast) {
        this.page.granulePosition = NOPTS_VALUE_BIGINT
      }
      else {
        this.page.granulePosition = (stream.privData as OggsStreamPrivData).granulePosition
      }
      this.page.pageSequenceNumber = (stream.privData as OggsStreamPrivData).pageSequenceLast
      this.page.crcCheckSum = 0
      this.page.headerTypeFlag = headerTypeFlag || 0

      if (!isStart) {
        // 与前一页属于同一个 packet
        this.page.headerTypeFlag != 0x01
      }

      this.page.payload = payload

      this.cacheWriter.reset()
      this.page.write(this.cacheWriter)
      const crc = this.getChecksum(this.cacheWriter.getBuffer())

      const pointer = this.cacheWriter.getPointer()
      this.cacheWriter.seekInline(22)
      this.cacheWriter.writeUint32(crc)
      this.cacheWriter.seekInline(pointer)

      ioWriter.writeBuffer(this.cacheWriter.getBuffer())

      length -= len
      offset += len
    }

    ++(stream.privData as OggsStreamPrivData).pageSequenceLast

    if ((stream.privData as OggsStreamPrivData).pageSequenceLast > Math.pow(2, 32) - 1) {
      (stream.privData as OggsStreamPrivData).pageSequenceLast = 0
    }
  }

  public writeHeader(formatContext: AVOFormatContext): number {
    if (this.headerPagesPayload) {
      for (let i = 0; i < this.headerPagesPayload.length; i++) {

        const stream = formatContext.getStreamByIndex(this.headerPagesPayload[i].streamIndex)

        if (stream) {
          this.cacheWriter.reset()
          this.headerPagesPayload[i].write(this.cacheWriter)
          this.writePage(stream, formatContext.ioWriter, this.cacheWriter.getBuffer().slice(), i === 0 ? 2 : 0)
        }
      }
    }

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

    this.writePage(stream, formatContext.ioWriter, getAVPacketData(avpacket), 0)

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      (stream.privData as OggsStreamPrivData).granulePosition += static_cast<int64>(stream.codecpar.frameSize)
    }
    else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      (stream.privData as OggsStreamPrivData).granulePosition++
    }

    return 0
  }
  public writeTrailer(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

}
