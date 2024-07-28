/*
 * libmedia webvtt decode
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

import AVFrame from 'avutil/struct/avframe'
import AVPacket from 'avutil/struct/avpacket'
import Decoder from './Decoder'
import * as text from 'common/util/text'
import { getAVPacketData } from 'avutil/util/avpacket'
import { avbufferAlloc } from 'avutil/util/avbuffer'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { Rational } from 'avutil/struct/rational'

function formatTime(time: string) {
  time = time.trim()
  let list = time.split(':')

  let ts = 0n

  if (list.length === 3) {
    ts += BigInt(+(list.shift().trim())) * 3600000n
  }
  ts += BigInt(+(list.shift().trim())) * 60000n

  list = list.shift().trim().split('.')
  ts += BigInt(+(list.shift().trim())) * 1000n
  ts += BigInt(+(list.shift().trim()))

  return ts
}

export default class WebVttDecoder extends Decoder {

  private queue: {
    pts: int64
    duration: int64
    context: string
    timeBase: Rational
  }[]

  constructor() {
    super()
  }

  private findTimelineTag(constant: string) {
    const start = constant.indexOf('<')
    if (start >= 0) {
      const end = constant.indexOf('>', start)
      if (end > start) {
        if (/^(\d{2,}:)?\d{2}:\d{2}\.\d{1,3}$/.test(constant.substring(start + 1, end))) {
          return {
            start,
            end
          }
        }
      }
    }
    return {
      start: -1,
      end: -1,
    }
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): int32 {
    let context = text.decode(getAVPacketData(avpacket))
    let startPts = avpacket.pts
    const endPts = startPts + avpacket.duration

    const cache: string[] = []

    while (true) {
      const { start, end } = this.findTimelineTag(context)
      if (start < 0) {
        break
      }
      const pts = formatTime(context.substring(start + 1, end))

      cache.push(context.substring(0, start))

      this.queue.push({
        context: cache.join(''),
        pts: startPts,
        duration: pts - startPts,
        timeBase: {
          den: avpacket.timeBase.den,
          num: avpacket.timeBase.num
        }
      })

      startPts = pts
      context = context.substring(end + 1)
    }

    cache.push(context)

    this.queue.push({
      context: cache.join(''),
      pts: startPts,
      duration: endPts - startPts,
      timeBase: {
        den: avpacket.timeBase.den,
        num: avpacket.timeBase.num
      }
    })

    return 0
  }

  public receiveAVFrame(avframe: pointer<AVFrame>): int32 {
    if (this.queue.length) {
      const item = this.queue.shift()
      avframe.pts = item.pts
      avframe.duration = item.duration

      const buffer = text.encode(item.context)

      const ref = avbufferAlloc(buffer.length)

      memcpyFromUint8Array(ref.data, buffer.length, buffer)

      avframe.buf[0] = ref
      avframe.data[0] = ref.data
      avframe.linesize[0] = buffer.length
      avframe.timeBase.den = item.timeBase.den
      avframe.timeBase.num = item.timeBase.num

      return 1
    }
    return 0
  }

  public flush(): int32 {
    return 0
  }
}
