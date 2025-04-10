/*
 * libmedia ass decoder
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

import AVStream from 'avutil/AVStream'
import { AVIFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from 'avutil/avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import * as array from 'common/util/array'
import * as text from 'common/util/text'
import * as iass from './ass/iass'
import { AssEventsFormat } from './ass/ass'

export default class IAssFormat extends IFormat {

  public type: AVFormat = AVFormat.ASS

  private queue: {
    startTs: int64
    endTs: int64
    context: string
    pos: int64
  }[]
  private index: int32

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    this.queue = []
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {

    const line = await formatContext.ioReader.readLine()

    if (line.trim() !== '[Script Info]') {
      logger.error('the file format is not ass')
      return errorType.DATA_INVALID
    }

    const stream = formatContext.createStream()
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_ASS
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
    stream.timeBase.den = 1000
    stream.timeBase.num = 1

    let extradata: string = line + '\n'
    let hasEvent = false

    let eventFormats: string[]
    let startIndex = 0
    let endIndex = 0

    while (true) {
      const line = await formatContext.ioReader.readLine()

      if (/^;/.test(line)) {
        continue
      }

      if (line.trim() === '[Events]') {
        hasEvent = true
      }
      if (/^Format:/.test(line) && hasEvent) {
        extradata += line
        eventFormats = iass.parseEventFormat(line.trim())

        for (let i = 0; i < eventFormats.length; i++) {
          if (eventFormats[i] === AssEventsFormat.Start) {
            startIndex = i
          }
          else if (eventFormats[i] === AssEventsFormat.End) {
            endIndex = i
          }
        }

        break
      }
      extradata += line + '\n'
    }

    const buffer = text.encode(extradata)

    stream.codecpar.extradata = avMalloc(buffer.length)
    stream.codecpar.extradataSize = buffer.length
    memcpyFromUint8Array(stream.codecpar.extradata, buffer.length, buffer)

    this.index = 0

    let lastStartTs = 0n

    try {
      while (true) {

        const pos = formatContext.ioReader.getPos()

        const line = (await formatContext.ioReader.readLine()).trim()

        if (/^;/.test(line) || /^Comment:/.test(line)) {
          continue
        }

        const { start: startTs, end: endTs } = iass.getEventLineTime(eventFormats, line, startIndex, endIndex)

        stream.nbFrames++
        stream.duration = endTs

        const cue = {
          context: line,
          startTs,
          endTs,
          pos
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
    const index = array.binarySearch(this.queue, (item) => {
      if (item.startTs > timestamp) {
        return -1
      }
      return 1
    })
    if (index >= 0) {
      logger.debug(`seek in cues, found index: ${index}, pts: ${this.queue[index].startTs}, pos: ${this.queue[index].pos}`)
      this.index = Math.max(index - 1, 0)
      while (this.index > 0) {
        if (this.queue[this.index - 1].startTs === this.queue[this.index].startTs
          || this.queue[this.index - 1].endTs > timestamp
        ) {
          this.index--
        }
        else {
          break
        }
      }
      return 0n
    }
    return static_cast<int64>(errorType.DATA_INVALID)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
