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
import * as errorType from 'avutil/error'
import concatTypeArray from 'common/function/concatTypeArray'
import IFormat from './IFormat'
import { AVFormat } from '../avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avFree, avMalloc } from 'avutil/util/mem'
import { addAVPacketData, getAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import IOReaderSync from 'common/io/IOReaderSync'

interface IOggFormatPrivateData {
  serialNumber: number
}

export default class IOggFormat extends IFormat {

  public type: AVFormat = AVFormat.OGGS

  public headerPagesPayload: PagePayload[]

  private page: OggPage

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
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      let signature = await formatContext.ioReader.peekString(4)
      if (signature !== 'OggS') {
        logger.error('the file format is not oggs')
        return errorType.DATA_INVALID
      }

      await this.page.read(formatContext.ioReader)

      let ioReader = new IOReaderSync(this.page.payload.length, false)
      ioReader.appendBuffer(this.page.payload)

      signature = ioReader.peekString(8)

      if (signature === 'OpusHead') {

        const idPage = new OpusOggsIdPage()
        idPage.read(ioReader)

        const commentPage = new OpusOggsCommentPage()

        this.page.reset()
        await this.page.read(formatContext.ioReader)

        ioReader = new IOReaderSync(this.page.payload.length, false)
        ioReader.appendBuffer(this.page.payload)
        commentPage.read(ioReader)

        this.headerPagesPayload = [
          idPage,
          commentPage
        ]

        const stream = formatContext.createStream()
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_OPUS
        stream.codecpar.sampleRate = (this.headerPagesPayload[0] as OpusOggsIdPage).sampleRate
        stream.codecpar.chLayout.nbChannels = (this.headerPagesPayload[0] as OpusOggsIdPage).channels
        if (defined(API_OLD_CHANNEL_LAYOUT)) {
          stream.codecpar.channels = (this.headerPagesPayload[0] as OpusOggsIdPage).channels
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

      return 0
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    if (!this.headerPagesPayload.length || this.headerPagesPayload[0].signature !== 'OpusHead') {
      return errorType.FORMAT_NOT_SUPPORT
    }

    avpacket.pos = formatContext.ioReader.getPos()

    let isProcessNext = false

    try {
      this.page.reset()
      await this.page.read(formatContext.ioReader)

      avpacket.dts = avpacket.pts = this.page.granulePosition

      const len = this.page.payload.length
      const data = avMalloc(len)
      memcpyFromUint8Array(data, len, this.page.payload)
      addAVPacketData(avpacket, data, len)

      let stream: AVStream = formatContext.streams.find((stream) => {
        return (stream.privData as IOggFormatPrivateData).serialNumber === this.page.serialNumber
      })

      if (stream) {
        avpacket.streamIndex = stream.index
        avpacket.timeBase.den = stream.timeBase.den
        avpacket.timeBase.num = stream.timeBase.num

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }

      isProcessNext = true

      let next = await formatContext.ioReader.peekBuffer(6)
      // 下一页是同一个 packet
      while (next[5] & 0x01) {
        this.page.reset()
        await this.page.read(formatContext.ioReader)
        avpacket.dts = avpacket.pts = this.page.granulePosition

        const buffer = concatTypeArray(Uint8Array, [getAVPacketData(avpacket), this.page.payload])

        avFree(avpacket.data)
        const data = avMalloc(buffer.length)
        memcpyFromUint8Array(data, buffer.length, buffer)
        avpacket.data = data
        avpacket.size = buffer.length

        next = await formatContext.ioReader.peekBuffer(6)
      }

      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return isProcessNext ? 0 : formatContext.ioReader.error
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
