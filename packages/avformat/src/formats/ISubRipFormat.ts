/*
 * libmedia subrip decoder
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

import type { AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'

import { memcpyFromUint8Array } from '@libmedia/cheap'

import {
  AVFormat,
  AVSeekFlags,
  AVMediaType,
  AVCodecID,
  type AVPacket,
  type AVStream,
  avMalloc,
  addAVPacketData,
  addAVPacketSideData,
  AVPacketSideDataType,
  errorType
} from '@libmedia/avutil'

import {
  array,
  text,
  time
} from '@libmedia/common'

import {
  IOError
} from '@libmedia/common/io'


export default class IWebVttFormat extends IFormat {

  public type: AVFormat = AVFormat.SUBRIP

  private queue: {
    identifier?: string
    startTs: int64
    endTs: int64
    context: string
  }[]
  private index: int32

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    this.queue = []
  }

  private async readText(formatContext: AVIFormatContext) {
    const reader = formatContext.ioReader
    const buffer = new Uint8Array(reader.getBufferSize())
    const decoder = new TextDecoder()
    let content = ''
    try {
      while (true) {
        const length = await reader.readToBuffer(buffer.length, buffer)
        content += decoder.decode(buffer.subarray(0, length), { stream: true })
        if (length < buffer.length) {
          break
        }
      }
    }
    catch (error) {
      if (reader.error !== IOError.END) {
        throw error
      }
    }
    return content + decoder.decode()
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const stream = formatContext.createStream()
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_SUBRIP
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
    stream.timeBase.den = 1000
    stream.timeBase.num = 1

    this.index = 0
    let lastStartTs = 0n

    try {
      const content = await this.readText(formatContext)
      for (const block of content.split(/(?:\r\n|\n|\r(?!\n)){2,}/)) {
        const chunk = block.trim()
        if (chunk === '') {
          continue
        }

        const lines = chunk.split(/\r\n|\n|\r/)

        let identifier: string = lines.shift().trim()

        let times = lines.shift().split(/--?>/)
        const startTs = time.hhColonDDColonSSCommaMill2Int64(times[0])
        const endTs = time.hhColonDDColonSSCommaMill2Int64(times[1])

        if (endTs <= startTs) {
          continue
        }

        const context = lines.join('\n').trim()

        if (!context) {
          continue
        }

        stream.nbFrames++
        stream.duration = endTs

        const cue = {
          identifier,
          context,
          startTs,
          endTs
        }

        if (startTs >= lastStartTs) {
          this.queue.push(cue)
          lastStartTs = startTs
        }
        else {
          array.sortInsert(
            this.queue,
            cue,
            (a) => {
              if (a.startTs < cue.startTs) {
                return 1
              }
              else {
                return -1
              }
            }
          )
        }
      }
    }
    catch (error) {
      return 0
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    if (!this.queue.length) {
      return errorType.DATA_INVALID
    }
    if (this.index >= this.queue.length) {
      return IOError.END
    }

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE
    })

    const cue = this.queue[this.index++]

    avpacket.streamIndex = stream.index
    avpacket.timeBase.den = stream.timeBase.den
    avpacket.timeBase.num = stream.timeBase.num

    avpacket.dts = avpacket.pts = cue.startTs
    avpacket.duration = cue.endTs - cue.startTs

    if (cue.identifier) {
      const buffer = text.encode(cue.identifier)
      const data = avMalloc(buffer.length)
      memcpyFromUint8Array(data, buffer.length, buffer)
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_WEBVTT_IDENTIFIER, data, buffer.length)
    }
    const buffer = text.encode(cue.context)
    const data: pointer<uint8> = avMalloc(buffer.length)
    memcpyFromUint8Array(data, buffer.length, buffer)
    addAVPacketData(avpacket, data, buffer.length)

    return 0
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    if (flags & AVSeekFlags.BYTE) {
      return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
    }
    if (timestamp <= 0n) {
      this.index = 0
      return 0n
    }
    // Cues are ordered by start time and can overlap. Resume at the first cue
    // that has not expired, or at EOF when every cue has ended.
    const index = this.queue.findIndex((cue) => cue.endTs > timestamp)
    this.index = index < 0 ? this.queue.length : index
    return 0n
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
