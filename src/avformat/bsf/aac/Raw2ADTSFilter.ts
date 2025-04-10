/*
 * libmedia Raw2ADTSFilter
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

import AVPacket from 'avutil/struct/avpacket'
import AVBSFilter from '../AVBSFilter'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { MPEG4SamplingFrequencyIndex } from 'avutil/codecs/aac'
import { mapUint8Array } from 'cheap/std/memory'
import { addAVPacketData, copyAVPacketProps, createAVPacket,
  destroyAVPacket, refAVPacket, unrefAVPacket
} from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as errorType from 'avutil/error'

export default class Raw2ADTSFilter extends AVBSFilter {

  private cache: pointer<AVPacket>
  private cached: boolean

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {
    super.init(codecpar, timeBase)
    this.cache = createAVPacket()

    return 0
  }

  public destroy(): void {
    super.destroy()
    destroyAVPacket(this.cache)
    this.cache = nullptr
    this.cached = false
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    if (!avpacket.data || !avpacket.size) {
      return 0
    }

    const size = 7 + avpacket.size
    const bufferPointer: pointer<uint8> = avMalloc(size)
    const buffer = mapUint8Array(bufferPointer, size)

    // syncword 0xfff
    buffer[0] = 0xff
    buffer[1] = 0xf0

    // ID
    buffer[1] |= 1 << 3

    // Protection Absent
    buffer[1] |= 1

    // profile
    buffer[2] = ((this.inCodecpar.profile - 1) & 0x03) << 6

    // Sampling Frequency Index
    buffer[2] |= (MPEG4SamplingFrequencyIndex[this.inCodecpar.sampleRate] & 0x0f) << 2

    // Channel Configuration 第三位
    buffer[2] |= (this.inCodecpar.chLayout.nbChannels & 0x04) >> 2

    // Channel Configuration 后两位
    buffer[3] = (this.inCodecpar.chLayout.nbChannels & 0x03) << 6

    // Frame Length 高 2 位
    buffer[3] |= (buffer.length >> 11) & 0x03

    // Frame Length 中 8 位
    buffer[4] = (buffer.length >> 3) & 0xff

    // Frame Length 低 3 位
    buffer[5] = (buffer.length & 0x07) << 5

    // Buffer Fullness 全 1
    buffer[5] |= 0x1f
    buffer[6] = 0xfc

    buffer.set(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)), 7)

    copyAVPacketProps(this.cache, avpacket)
    addAVPacketData(this.cache, bufferPointer, size)
    this.cached = true

    return 0
  }

  public receiveAVPacket(avpacket: pointer<AVPacket>): number {
    if (this.cached) {
      unrefAVPacket(avpacket)
      refAVPacket(avpacket, this.cache)
      this.cached = false
      return 0
    }
    else {
      return errorType.EOF
    }
  }

  public reset(): number {
    return 0
  }
}
