/*
 * libmedia Mpegts2RawFilter
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

import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import AVBSFilter from '../AVBSFilter'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { avRescaleQ } from 'avutil/util/rational'
import * as opus from 'avutil/codecs/opus'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import { addAVPacketData, getAVPacketData, unrefAVPacket } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'

export default class Mpegts2RawFilter extends AVBSFilter {

  private caches: {
    duration: number
    dts: bigint
    buffer: Uint8Array
  }[]

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {
    super.init(codecpar, timeBase)

    this.caches = []

    return 0
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    let i = 0

    let lastDts = avpacket.dts !== NOPTS_VALUE_BIGINT ? avpacket.dts : avpacket.pts

    const buffer = getAVPacketData(avpacket)

    while (i < buffer.length) {

      const syncWord = (buffer[i] << 3) | (buffer[i + 1] >> 5)

      if (syncWord !== 0x3ff) {
        logger.error(`MpegtsOpusParser found syncWord not 0x3ff, got: 0x${syncWord.toString(16)}`)
        return errorType.DATA_INVALID
      }

      const opusPendingTrimStart = (buffer[i + 1] & 0x10) !== 0
      const trimEnd = (buffer[i + 1] & 0x08) !== 0
      let index = i + 2
      let size = 0

      while (buffer[index] === 0xFF) {
        size += 255
        index++
      }
      size += buffer[index]
      index++

      index += opusPendingTrimStart ? 2 : 0
      index += trimEnd ? 2 : 0

      let samples = buffer.subarray(index, index + size)

      const sampleRate = this.inCodecpar.sampleRate > 0 ? this.inCodecpar.sampleRate : 48000

      const duration = avRescaleQ(
        static_cast<int64>(opus.getBufferSamples(samples) / sampleRate * AV_TIME_BASE),
        AV_TIME_BASE_Q,
        this.inTimeBase
      )

      this.caches.push({
        dts: lastDts,
        buffer: samples.slice(),
        duration: Number(duration),
      })
      lastDts += duration
      i = index + size
    }
  }

  public receiveAVPacket(avpacket: pointer<AVPacket>): number {
    if (this.caches.length) {

      unrefAVPacket(avpacket)

      const item = this.caches.shift()

      const data: pointer<uint8> = avMalloc(item.buffer.length)
      memcpyFromUint8Array(data, item.buffer.length, item.buffer)
      addAVPacketData(avpacket, data, item.buffer.length)

      avpacket.dts = avpacket.pts = item.dts
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      avpacket.duration = static_cast<int64>(item.duration)
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
