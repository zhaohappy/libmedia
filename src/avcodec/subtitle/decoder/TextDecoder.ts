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
import { getAVPacketData } from 'avutil/util/avpacket'
import { avbufferAlloc } from 'avutil/util/avbuffer'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { Rational } from 'avutil/struct/rational'

export default class TextDecoder extends Decoder {

  private queue: {
    pts: int64
    duration: int64
    data: Uint8Array
    timeBase: Rational
  }[]

  constructor() {
    super()
    this.queue = []
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): int32 {
    this.queue.push({
      data: getAVPacketData(avpacket).slice(),
      pts: avpacket.pts,
      duration: avpacket.duration,
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

      const buffer = item.data

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
