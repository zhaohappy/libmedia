/*
 * libmedia Dts2RawFilter
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

import AVBSFilter from '../AVBSFilter'

import {
  mapUint8Array,
  memcpyFromUint8Array
} from '@libmedia/cheap'

import {
  is,
  concatTypeArray,
  logger
} from '@libmedia/common'

import {
  type AVPacket,
  AVPacketFlags,
  errorType,
  NOPTS_VALUE,
  NOPTS_VALUE_BIGINT,
  avRescaleQ,
  avMalloc,
  type AVCodecParameters,
  type AVRational,
  addAVPacketData,
  unrefAVPacket
} from '@libmedia/avutil'

import {
  AV_TIME_BASE,
  AV_TIME_BASE_Q,
  dts
} from '@libmedia/avutil/internal'

export default class Dts2RawFilter extends AVBSFilter {

  private caches: {
    duration: number
    dts: bigint
    buffer: Uint8Array
    pos: int64
  }[]

  private cache: Uint8Array
  private lastDts: int64

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<AVRational>): number {
    super.init(codecpar, timeBase)

    this.caches = []

    return 0
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    let i = 0

    let lastDts = this.lastDts || (avpacket.dts !== NOPTS_VALUE_BIGINT ? avpacket.dts : avpacket.pts)
    let buffer: Uint8Array<ArrayBufferLike> = mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)).slice()
    let firstGot = false
    let hasCache = !!this.cache

    if (hasCache) {
      buffer = concatTypeArray(Uint8Array, [this.cache, buffer])
      this.cache = null
    }

    while (i < buffer.length) {

      if (i > buffer.length - 6) {
        this.cache = buffer.subarray(i)
        this.lastDts = lastDts
        return 0
      }

      const info = dts.parseHeader(buffer.subarray(i))

      if (is.number(info)) {
        let j = i + 1
        for (; j < buffer.length - 3; j++) {
          const syncWord = (buffer[j] << 24) | (buffer[j + 1] << 16) | (buffer[j + 2] << 8) | buffer[j + 3]
          if (syncWord === 0x7ffe8001 || syncWord === 0xfe7f0180) {
            i = j
            break
          }
        }
        if (j < buffer.length - 3) {
          continue
        }

        logger.error('parse dts header failed')
        return errorType.DATA_INVALID
      }

      const item = {
        dts: lastDts,
        buffer: null,
        duration: NOPTS_VALUE,
        pos: avpacket.pos
      }

      let frameLength = info.frameSize

      item.buffer = buffer.subarray(i, i + frameLength)

      if (i + frameLength > buffer.length) {
        this.cache = buffer.subarray(i)
        this.lastDts = lastDts
        return 0
      }

      const duration = avRescaleQ(
        static_cast<int64>(((info.sampleBlock * dts.DTS_PCMBLOCK_SAMPLES) / info.sampleRate * AV_TIME_BASE) as double),
        AV_TIME_BASE_Q,
        this.inTimeBase
      )

      item.duration = Number(duration)

      this.caches.push(item)

      i += frameLength
      lastDts += duration

      if (!firstGot && hasCache) {
        firstGot = true
        lastDts = avpacket.dts || avpacket.pts
      }
    }
    this.lastDts = 0n

    return 0
  }

  public receiveAVPacket(avpacket: pointer<AVPacket>): number {
    if (this.caches.length) {

      unrefAVPacket(avpacket)

      const item = this.caches.shift()

      const data: pointer<uint8> = avMalloc(item.buffer.length)
      memcpyFromUint8Array(data, item.buffer.length, item.buffer)
      addAVPacketData(avpacket, data, item.buffer.length)

      avpacket.dts = avpacket.pts = item.dts
      avpacket.pos = item.pos
      avpacket.duration = static_cast<int64>(item.duration)
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      return 0
    }
    else {
      return errorType.EOF
    }
  }

  public reset(): number {
    this.cache = null
    this.lastDts = 0n
    this.caches.length = 0
    return 0
  }
}
