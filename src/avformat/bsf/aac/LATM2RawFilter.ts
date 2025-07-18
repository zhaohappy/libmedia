/*
 * libmedia LATM2RawFilter
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
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { avCodecParameters2Extradata } from 'avutil/codecs/aac'
import { avRescaleQ } from 'avutil/util/rational'
import { avFree, avMalloc } from 'avutil/util/mem'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { addAVPacketData, addAVPacketSideData, unrefAVPacket } from 'avutil/util/avpacket'
import { AVPacketSideDataType } from 'avutil/codec'
import BitReader from 'common/io/BitReader'
import * as aac from 'avutil/codecs/aac'
import * as is from 'common/util/is'


export default class LATM2RawFilter extends AVBSFilter {

  private bitReader: BitReader

  private streamMuxConfig: {
    profile: number
    sampleRate: number
    channels: number
  }

  private caches: {
    dts: bigint
    buffer: Uint8Array
    extradata: Uint8Array
    pos: int64
  }[]

  private refSampleDuration: bigint

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {

    super.init(codecpar, timeBase)

    this.caches = []
    this.refSampleDuration = 0n

    this.bitReader = new BitReader()
    this.streamMuxConfig = {
      profile: NOPTS_VALUE,
      sampleRate: NOPTS_VALUE,
      channels: NOPTS_VALUE
    }

    return 0
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {

    const buffer = mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))

    this.bitReader.appendBuffer(buffer)

    let lastDts = avpacket.dts !== NOPTS_VALUE_BIGINT ? avpacket.dts : avpacket.pts

    while (this.bitReader.remainingLength() >= 20) {

      const now = this.bitReader.getPointer()

      const info = aac.parseLATMHeader(null, this.bitReader)

      if (is.number(info)) {
        let synced = false
        while (this.bitReader.remainingLength() >= 20) {
          const syncWord = this.bitReader.peekU(11)
          if (syncWord === 0x2B7) {
            synced = true
            break
          }
          this.bitReader.readU1()
        }
        if (synced) {
          continue
        }
        logger.error('AACLATMParser parse failed')
        this.bitReader.reset()
        return errorType.DATA_INVALID
      }

      if (info.framePayloadLength >= this.bitReader.remainingLength()) {
        this.bitReader.skipPadding()
        this.bitReader.setPointer(now)
        break
      }

      if (!info.useSameStreamMux) {
        this.streamMuxConfig.profile = info.profile
        this.streamMuxConfig.sampleRate = info.sampleRate
        this.streamMuxConfig.channels = info.channels
      }

      const length = info.framePayloadLength

      const rawData = new Uint8Array(length)
      for (let i = 0; i < length; i++) {
        rawData[i] = this.bitReader.readU(8)
      }

      const item = {
        dts: lastDts,
        buffer: rawData,
        extradata: null,
        pos: avpacket.pos
      }

      const hasNewExtraData = this.inCodecpar.profile !== this.streamMuxConfig.profile
        || this.inCodecpar.sampleRate !== this.streamMuxConfig.sampleRate
        || this.inCodecpar.chLayout.nbChannels !== this.streamMuxConfig.channels

      if (hasNewExtraData) {

        this.refSampleDuration = avRescaleQ(
          static_cast<int64>(1024 / this.streamMuxConfig.sampleRate * AV_TIME_BASE),
          AV_TIME_BASE_Q,
          this.inTimeBase
        )

        this.inCodecpar.profile = this.streamMuxConfig.profile
        this.inCodecpar.sampleRate = this.streamMuxConfig.sampleRate
        this.inCodecpar.chLayout.nbChannels = this.streamMuxConfig.channels

        const extradata = avCodecParameters2Extradata(accessof(this.inCodecpar))

        if (this.inCodecpar.extradata) {
          avFree(this.inCodecpar.extradata)
        }
        this.inCodecpar.extradata = avMalloc(extradata.length)
        memcpyFromUint8Array(this.inCodecpar.extradata, extradata.length, extradata)
        this.inCodecpar.extradataSize = extradata.length
        item.extradata = extradata
      }

      this.caches.push(item)
      lastDts += this.refSampleDuration

      this.bitReader.skipPadding()
    }
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
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      avpacket.duration = this.refSampleDuration
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
    this.bitReader.reset()
    this.caches.length = 0
    return 0
  }
}
