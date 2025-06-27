/*
 * libmedia vtt decoder
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
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags, IOFlags } from 'avutil/avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import * as array from 'common/util/array'
import * as text from 'common/util/text'
import { hhColonDDColonSSDotMill2Int64 } from 'common/util/time'
import { AV_MILLI_TIME_BASE_Q } from 'avutil/constant'
import { AVStreamMetadataKey } from 'avutil/AVStream'
import { avRescaleQ } from 'avutil/util/rational'

export default class IWebVttFormat extends IFormat {

  public type: AVFormat = AVFormat.WEBVTT

  private queue: {
    identifier?: string
    options?: string
    startTs: int64
    endTs: int64
    context: string
    pos: int64
  }[]
  private index: int32
  private baseTs: int64

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    this.queue = []
    this.baseTs = 0n
  }

  private async readChunk(formatContext: AVIFormatContext) {
    let chunk = ''
    const pos = formatContext.ioReader.getPos()
    while (true) {
      const line = await formatContext.ioReader.readLine()
      if (line === '' || line === 'WEBVTT') {
        break
      }
      chunk += line + '\n'
    }
    return { chunk: chunk.trim(), pos }
  }

  private async readCue(formatContext: AVIFormatContext, styles: { style: string, pos: int64 }[]) {
    while (true) {
      const { chunk, pos } = await this.readChunk(formatContext)

      if (chunk === '' || /^NOTE/.test(chunk) || chunk === 'WEBVTT') {
        continue
      }

      if (/^STYLE/.test(chunk)) {
        styles.push({
          style: chunk.replace(/STYLE[\s|\n]?/, ''),
          pos
        })
        continue
      }
      if (/^X-TIMESTAMP-MAP/.test(chunk)) {
        const value = chunk.split('=')[1]
        const items = value.split(',')
        let local = 0n
        let ts = 0n
        items.forEach((t) => {
          const l = t.split(':')
          if (l[0] === 'LOCAL') {
            l.shift()
            local = hhColonDDColonSSDotMill2Int64(l.join(':').trim())
          }
          else if (l[0] === 'MPEGTS') {
            ts = BigInt(+l[1]) * 1000n / 90000n
          }
        })
        this.baseTs = ts - local
        continue
      }

      const lines = chunk.split('\n')

      let identifier: string
      let options: string

      // identifier
      if (lines[0].indexOf('-->') === -1) {
        identifier = lines.shift().trim()
      }

      let times = lines.shift().split('-->')
      const startTs = hhColonDDColonSSDotMill2Int64(times.shift()) + this.baseTs

      times = times.shift().trim().split(' ')

      const endTs = hhColonDDColonSSDotMill2Int64(times.shift()) + this.baseTs

      if (endTs <= startTs) {
        continue
      }

      times = times.filter((t) => t !== '')

      if (times.length) {
        options = times.join(' ')
      }

      const context = lines.join('\n').trim()

      if (!context) {
        continue
      }
      return {
        identifier,
        options,
        context,
        startTs,
        endTs,
        pos
      }
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {

    const bom = await formatContext.ioReader.peekBuffer(3)

    if (bom[0] === 0xef && bom[1] === 0xbb && bom[2] === 0xbf) {
      await formatContext.ioReader.skip(3)
    }

    const signature = await formatContext.ioReader.peekString(6)
    if (signature !== 'WEBVTT') {
      logger.error('the file format is not vtt')
      return errorType.DATA_INVALID
    }

    const stream = formatContext.createStream()
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_WEBVTT
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
    stream.timeBase.den = 1000
    stream.timeBase.num = 1

    const header = await formatContext.ioReader.readLine()
    if (header.indexOf('-') > 0) {
      stream.metadata[AVStreamMetadataKey.TITLE] = header.split('-').pop().trim()
    }

    this.index = 0

    const styles: { style: string, pos: int64 }[] = []

    let lastStartTs = 0n

    try {
      while (true) {
        const cue = await this.readCue(formatContext, styles)
        stream.nbFrames++
        stream.duration = cue.endTs

        if (cue.startTs >= lastStartTs) {
          this.queue.push(cue)
          lastStartTs = cue.startTs
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
        if (formatContext.ioReader.flags & IOFlags.SLICE) {
          break
        }
      }
    }
    catch (error) {}
    stream.metadata[AVStreamMetadataKey.STYLES] = styles
    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE
    })

    if (formatContext.ioReader.flags & IOFlags.SLICE) {
      if (this.index >= this.queue.length) {
        try {
          const cue = await this.readCue(formatContext, stream.metadata[AVStreamMetadataKey.STYLES])
          if (this.queue.length) {
            const last = this.queue[this.queue.length - 1]
            // hls 的 字幕可能会重复
            if (last.startTs === cue.startTs
              && last.endTs === cue.endTs
              && last.context === cue.context
            ) {
              return this.readAVPacket(formatContext, avpacket)
            }
          }
          this.queue.push(cue)
          stream.nbFrames++
          stream.duration = cue.endTs
        }
        catch (error) {
          if (formatContext.ioReader.error !== IOError.END
            && formatContext.ioReader.error !== IOError.ABORT
          ) {
            logger.error(`read cue error, ${error}`)
            return errorType.DATA_INVALID
          }
          return formatContext.ioReader.error
        }
      }
    }
    else {
      if (!this.queue.length) {
        return errorType.DATA_INVALID
      }
      if (this.index >= this.queue.length) {
        return IOError.END
      }
    }

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
    if (cue.options) {
      const buffer = text.encode(cue.options)
      const data = avMalloc(buffer.length)
      memcpyFromUint8Array(data, buffer.length, buffer)
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_WEBVTT_SETTINGS, data, buffer.length)
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
    if (flags & AVSeekFlags.TIMESTAMP && (formatContext.ioReader.flags & IOFlags.SLICE)) {
      const seekTime = avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      await formatContext.ioReader.seek(seekTime, true)
      this.queue.length = 0
      this.index = 0
      return 0n
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
