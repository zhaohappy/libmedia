/*
 * libmedia Raw2MpegtsFilter
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
import { mapUint8Array } from 'cheap/std/memory'
import { addAVPacketData, copyAVPacketProps, createAVPacket,
  destroyAVPacket, getAVPacketSideData, refAVPacket, unrefAVPacket
} from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as errorType from 'avutil/error'
import * as opus from 'avutil/codecs/opus'
import { AVPacketSideDataType } from 'avutil/codec'

export default class Raw2MpegtsFilter extends AVBSFilter {

  private cache: pointer<AVPacket>

  private cached: boolean

  private opusPendingTrimStart: number

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {

    super.init(codecpar, timeBase)
    this.cache = createAVPacket()
    this.cached = false

    this.opusPendingTrimStart = (this.inCodecpar.initialPadding > 0 ? this.inCodecpar.initialPadding : 0)
    * 48000 / this.inCodecpar.sampleRate

    return 0
  }

  public destroy(): void {
    super.destroy()
    destroyAVPacket(this.cache)
    this.cache = nullptr
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    if (!avpacket.data || !avpacket.size) {
      return
    }

    const packetBuffer = mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))

    const opusSamples = opus.getBufferSamples(packetBuffer)
    let sideData = null
    const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_SKIP_SAMPLES)
    if (element) {
      sideData = mapUint8Array(element.data, element.size)
    }
    let trimEnd = 0

    if (sideData && sideData.length >= 10) {
      const value = (sideData[4] << 24) | (sideData[5] << 16) | (sideData[6] << 8) | sideData[9]
      trimEnd = value * 48000 / this.inCodecpar.sampleRate
    }

    let ctrlHeaderSize = packetBuffer.length + 2 + packetBuffer.length / 255 + 1
    if (this.opusPendingTrimStart) {
      ctrlHeaderSize += 2
    }
    if (trimEnd) {
      ctrlHeaderSize += 2
    }

    const bufferPointer: pointer<uint8> = avMalloc(ctrlHeaderSize)
    const buffer = mapUint8Array(bufferPointer, ctrlHeaderSize)

    buffer[0] = 0x7f
    buffer[1] = 0xe0
    if (this.opusPendingTrimStart) {
      buffer[1] |= 0x10
    }

    if (trimEnd) {
      buffer[1] |= 0x08
    }

    let n = packetBuffer.length
    let i = 2
    do {
      buffer[i] = Math.min(n, 255)
      n -= 255
      i++
    }
    while (n >= 0)

    let trimStart = 0
    if (this.opusPendingTrimStart) {
      trimStart = Math.min(this.opusPendingTrimStart, opusSamples)
      buffer[i] = (trimStart & 0xff00) >> 8
      buffer[i + 1] = trimStart & 0xff
      i += 2
      this.opusPendingTrimStart -= trimStart
    }
    if (trimEnd) {
      trimEnd = Math.min(trimEnd, opusSamples - trimStart)
      buffer[i] = (trimEnd & 0xff00) >> 8
      buffer[i + 1] = trimEnd & 0xff
      i += 2
    }

    buffer.set(packetBuffer, i)

    copyAVPacketProps(this.cache, avpacket)
    addAVPacketData(this.cache, bufferPointer, ctrlHeaderSize)
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
      return errorType.DATA_INVALID
    }
  }

  public reset(): number {
    return 0
  }
}
