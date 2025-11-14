/*
 * libmedia ADTS2RawFilter
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
  avFree,
  avMalloc,
  type AVCodecParameters,
  type AVRational,
  AVPacketSideDataType,
  addAVPacketData,
  addAVPacketSideData,
  unrefAVPacket
} from '@libmedia/avutil'

import {
  AV_TIME_BASE,
  AV_TIME_BASE_Q,
  aac
} from '@libmedia/avutil/internal'

interface CacheItem {
  duration: number
  dts: bigint
  buffer: Uint8Array
  extradata: Uint8Array
  pos: int64
}

interface PendingItem extends CacheItem {
  miss: number
}

export default class ADTS2RawFilter extends AVBSFilter {

  private streamMuxConfig: {
    profile: number
    sampleRate: number
    channels: number
  }

  private caches: CacheItem[]
  private pendingItem: PendingItem

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<AVRational>): number {
    super.init(codecpar, timeBase)

    this.caches = []
    this.streamMuxConfig = {
      profile: NOPTS_VALUE,
      sampleRate: NOPTS_VALUE,
      channels: NOPTS_VALUE
    }

    return 0
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    let i = 0

    let lastDts = avpacket.dts !== NOPTS_VALUE_BIGINT ? avpacket.dts : avpacket.pts
    let buffer = mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)).slice()

    if (this.pendingItem) {
      this.pendingItem.buffer = concatTypeArray(Uint8Array, [this.pendingItem.buffer, buffer.subarray(0, this.pendingItem.miss)])
      buffer = buffer.subarray(this.pendingItem.miss)
      this.caches.push(this.pendingItem)
      this.pendingItem = null
    }

    while (i < buffer.length) {

      const info = aac.parseADTSHeader(buffer.subarray(i))

      if (is.number(info)) {
        let j = i + 1
        for (; j < buffer.length - 1; j++) {
          const syncWord = (buffer[j] << 4) | (buffer[j + 1] >> 4)
          if (syncWord === 0xfff) {
            i = j
            break
          }
        }
        if (j < buffer.length - 1) {
          continue
        }
        logger.error('AACADTSParser parse failed')
        return errorType.DATA_INVALID
      }

      const item: CacheItem = {
        dts: lastDts,
        buffer: null,
        extradata: null,
        duration: NOPTS_VALUE,
        pos: avpacket.pos
      }

      item.buffer = buffer.subarray(i + info.headerLength, i + info.headerLength + info.framePayloadLength)

      this.streamMuxConfig.profile = info.profile
      this.streamMuxConfig.sampleRate = info.sampleRate
      this.streamMuxConfig.channels = info.channels

      const hasNewExtraData = this.inCodecpar.profile !== this.streamMuxConfig.profile
        || this.inCodecpar.sampleRate !== this.streamMuxConfig.sampleRate
        || this.inCodecpar.chLayout.nbChannels !== this.streamMuxConfig.channels


      const duration = avRescaleQ(
        static_cast<int64>((info.numberOfRawDataBlocksInFrame + 1) * 1024 / this.streamMuxConfig.sampleRate * AV_TIME_BASE),
        AV_TIME_BASE_Q,
        this.inTimeBase
      )

      item.duration = Number(duration)

      if (hasNewExtraData) {
        this.inCodecpar.profile = this.streamMuxConfig.profile
        this.inCodecpar.sampleRate = this.streamMuxConfig.sampleRate
        this.inCodecpar.chLayout.nbChannels = this.streamMuxConfig.channels

        const extradata = aac.avCodecParameters2Extradata(accessof(this.inCodecpar))

        if (this.inCodecpar.extradata) {
          avFree(this.inCodecpar.extradata)
        }
        this.inCodecpar.extradata = avMalloc(extradata.length)
        memcpyFromUint8Array(this.inCodecpar.extradata, extradata.length, extradata)
        this.inCodecpar.extradataSize = extradata.length
        item.extradata = extradata
      }

      if (item.buffer.length < info.framePayloadLength) {
        this.pendingItem = {
          ...item,
          miss: info.framePayloadLength - item.buffer.length
        }
      }
      else {
        this.caches.push(item)
      }

      i += info.aacFrameLength
      lastDts += duration
    }
    return 0
  }

  public receiveAVPacket(avpacket: pointer<AVPacket>): number {
    if (this.caches.length) {

      unrefAVPacket(avpacket)

      const item = this.caches.shift()!

      const data: pointer<uint8> = avMalloc(item.buffer.length)
      memcpyFromUint8Array(data, item.buffer.length, item.buffer)
      addAVPacketData(avpacket, data, item.buffer.length)

      avpacket.dts = avpacket.pts = item.dts
      avpacket.pos = item.pos
      avpacket.duration = static_cast<int64>(item.duration)
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      if (item.extradata) {
        const extradata = avMalloc(item.extradata.length)
        memcpyFromUint8Array(extradata, item.extradata.length, item.extradata)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, item.extradata.length)
      }
      return 0
    }
    else {
      return errorType.EOF
    }
  }

  public reset(): number {
    this.pendingItem = null
    this.caches.length = 0
    return 0
  }
}
