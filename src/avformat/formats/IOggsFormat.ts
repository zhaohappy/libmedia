/*
 * libmedia oggs decoder
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
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { OggPage, PagePayload } from './oggs/OggPage'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import { OpusOggsIdPage, OpusOggsCommentPage } from './oggs/opus'
import { VorbisOggsIdPage, VorbisOggsCommentPage } from './oggs/vorbis'
import * as errorType from 'avutil/error'
import concatTypeArray from 'common/function/concatTypeArray'
import IFormat from './IFormat'
import { AVFormat } from '../avformat'
import { mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import IOReaderSync from 'common/io/IOReaderSync'
import IOWriterSync from 'common/io/IOWriterSync'

interface IOggFormatPrivateData {
  serialNumber: number
}

export default class IOggFormat extends IFormat {

  public type: AVFormat = AVFormat.OGGS

  public headerPagesPayload: PagePayload[]

  private page: OggPage

  private curSegIndex: number
  private curSegStart: number
  private currentPts: int64
  private segCount: number
  private lastGranulePosition: int64

  constructor() {
    super()
    this.page = new OggPage()
    this.headerPagesPayload = []
  }

  public init(formatContext: AVIFormatContext): void {

    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(false)
    }
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(false)
    }

    this.curSegIndex = -1
    this.curSegStart = 0
    this.currentPts = 0n
    this.segCount = 0
    this.lastGranulePosition = 0n
  }

  private async getNextSegment(formatContext: AVIFormatContext) {
    if (this.curSegIndex < 0) {
      if (this.page.granulePosition > 0n) {
        this.lastGranulePosition = this.page.granulePosition
      }
      this.page.reset()
      await this.page.read(formatContext.ioReader)
      this.curSegIndex = 0
      this.curSegStart = 0

      this.segCount = 0
      for (let i = 0; i < this.page.segmentTable.length; i++) {
        if (this.page.segmentTable[i] !== 255) {
          this.segCount++
        }
      }
    }

    let len = 0
    while (true) {
      const next = this.page.segmentTable[this.curSegIndex++]
      len += next
      if (next !== 255) {
        break
      }
    }
    const start = this.curSegStart
    this.curSegStart += len
    if (this.curSegIndex === this.page.segmentTable.length) {
      this.curSegIndex = -1
    }
    return this.page.payload.subarray(start, start + len)
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      let signature = await formatContext.ioReader.peekString(4)
      if (signature !== 'OggS') {
        logger.error('the file format is not oggs')
        return errorType.DATA_INVALID
      }

      let payload = await this.getNextSegment(formatContext)

      let ioReader = new IOReaderSync(payload.length, false)
      ioReader.appendBuffer(payload)

      signature = ioReader.peekString(8)

      if (signature === 'OpusHead') {
        const idPage = new OpusOggsIdPage()
        idPage.read(ioReader)

        const commentPage = new OpusOggsCommentPage()

        payload = await this.getNextSegment(formatContext)

        ioReader = new IOReaderSync(payload.length, false)
        ioReader.appendBuffer(payload)
        commentPage.read(ioReader)

        this.headerPagesPayload = [
          idPage,
          commentPage
        ]

        const stream = formatContext.createStream()
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_OPUS
        
        stream.codecpar.sampleRate = idPage.sampleRate
        stream.codecpar.chLayout.nbChannels = idPage.channels
        if (defined(API_OLD_CHANNEL_LAYOUT)) {
          stream.codecpar.channels = idPage.channels
        }
        stream.timeBase.den = stream.codecpar.sampleRate
        stream.timeBase.num = 1
        stream.privData = {
          serialNumber: this.page.serialNumber
        }

        if (this.onStreamAdd) {
          this.onStreamAdd(stream)
        }
      }
      else if (signature.slice(1, 7) === 'vorbis') {

        const buffers: Uint8Array[] = [payload]

        const idPage = new VorbisOggsIdPage()
        idPage.read(ioReader)

        const commentPage = new VorbisOggsCommentPage()

        payload = await this.getNextSegment(formatContext)

        ioReader = new IOReaderSync(payload.length, false)
        ioReader.appendBuffer(payload)
        commentPage.read(ioReader)

        buffers.push(payload)

        this.headerPagesPayload = [
          idPage,
          commentPage
        ]

        const stream = formatContext.createStream()
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VORBIS
        
        stream.codecpar.sampleRate = idPage.sampleRate
        stream.codecpar.chLayout.nbChannels = idPage.channels
        if (defined(API_OLD_CHANNEL_LAYOUT)) {
          stream.codecpar.channels = idPage.channels
        }
        stream.timeBase.den = stream.codecpar.sampleRate
        stream.timeBase.num = 1
        stream.privData = {
          serialNumber: this.page.serialNumber
        }

        // setup header
        buffers.push(await this.getNextSegment(formatContext))

        const extradataSize = buffers.reduce((pre, buffer) => {
          return pre + 2 + buffer.length
        }, 0)

        const data = avMalloc(extradataSize)

        const ioWriter = new IOWriterSync(extradataSize, true, mapSafeUint8Array(data, extradataSize))
        buffers.forEach((buffer) => {
          ioWriter.writeUint16(buffer.length)
          ioWriter.writeBuffer(buffer)
        })

        stream.codecpar.extradata = data
        stream.codecpar.extradataSize = extradataSize

        if (this.onStreamAdd) {
          this.onStreamAdd(stream)
        }
      }

      return 0
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    if (!this.headerPagesPayload.length) {
      return errorType.FORMAT_NOT_SUPPORT
    }

    avpacket.pos = formatContext.ioReader.getPos()

    try {
      const payload = await this.getNextSegment(formatContext)

      let pts = this.currentPts + (this.page.granulePosition - this.lastGranulePosition) / static_cast<int64>(this.segCount)

      avpacket.dts = avpacket.pts = this.currentPts
      this.currentPts = pts

      const stream: AVStream = formatContext.streams.find((stream) => {
        return (stream.privData as IOggFormatPrivateData).serialNumber === this.page.serialNumber
      })

      if (stream) {
        avpacket.streamIndex = stream.index
        avpacket.timeBase.den = stream.timeBase.den
        avpacket.timeBase.num = stream.timeBase.num
        if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }

      const buffers: Uint8Array[] = [payload]

      while (this.curSegIndex < 0) {
        try {
          let next = await formatContext.ioReader.peekBuffer(6)
          // 下一页是同一个 packet
          if (next[5] & 0x01) {
            buffers.push(await this.getNextSegment(formatContext))
          }
          else {
            break
          }
        }
        catch (error) {
          break
        }
      }

      const buffer = concatTypeArray(Uint8Array, buffers)

      const len = buffer.length
      const data = avMalloc(len)
      memcpyFromUint8Array(data, len, buffer)
      addAVPacketData(avpacket, data, len)

      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
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
