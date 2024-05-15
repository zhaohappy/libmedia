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

import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import AVBSFilter from '../AVBSFilter'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE } from 'avutil/constant'
import { MPEG4Channels, MPEG4SamplingFrequencies, avCodecParameters2Extradata } from '../../codecs/aac'
import { avRescaleQ } from 'avutil/util/rational'
import { avFree, avMalloc } from 'avutil/util/mem'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { addAVPacketData, addAVPacketSideData, unrefAVPacket } from 'avutil/util/avpacket'
import { AVPacketSideDataType } from 'avutil/codec'

export default class ADTS2RawFilter extends AVBSFilter {

  private streamMuxConfig: {
    profile: number
    sampleRate: number
    channels: number
  }

  private caches: {
    duration: number
    dts: bigint
    buffer: Uint8Array
    extradata: Uint8Array
  }[]

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {
    super.init(codecpar, timeBase)

    this.caches = []
    this.streamMuxConfig = {
      profile: NOPTS_VALUE,
      sampleRate: NOPTS_VALUE,
      channels: NOPTS_VALUE
    }

    return 0
  }

  /**
   * 
   * adts 封装转 raw
   * 
   * bits    
   * - 12  syncword
   * - 1   ID (MPEG 标识位，固定为 1)
   * - 2   Layer ( 固定为 0)
   * - 1   Protection Absent ( 指示是否有 CRC 校验，1 表示没有校验）
   * - 2   Profile
   * - 4   Sampling Frequency Index ( 采样率的索引）
   * - 1   Private Bit ( 保留位，一般设置为 0)
   * - 3   Channel Configuration ( 音频通道数）
   * - 1   Original Copy ( 原始拷贝标志位，一般设置为 0)
   * - 1   Home ( 保留位，一般设置为 0)
   * - 1   Copyright Identification Bit（置 0）
   * - 1   Copyright Identification Start（置 0）
   * - 13  Frame Length ( 帧长度，包括 ADTS 头和音频帧数据的长度）
   * - 11  Buffer Fullness ( 缓冲区满度，可用于音频流的同步）
   * - 2   Number of Raw Data Blocks in Frame ( 帧中原始数据块的数量）
   * - 16  CRC (Protection Absent 控制）
   * - N  raw aac data
   * 
   */
  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    let i = 0

    let lastDts = avpacket.dts || avpacket.pts
    const buffer = mapUint8Array(avpacket.data, avpacket.size).slice()

    while (i < buffer.length) {

      const syncWord = (buffer[i] << 4) | (buffer[i + 1] >> 4)

      if (syncWord !== 0xFFF) {
        logger.error(`found syncWord not 0xFFF, got: 0x${syncWord.toString(16)}`)
        return errorType.DATA_INVALID
      }

      /*
       * const id = (buffer[1] & 0x08) >>> 3
       * const layer = (buffer[1] & 0x06) >>> 1
       */
      const protectionAbsent = buffer[i + 1] & 0x01
      const profile = (buffer[i + 2] & 0xC0) >>> 6
      const samplingFrequencyIndex = (buffer[i + 2] & 0x3C) >>> 2
      const channelConfiguration = ((buffer[i + 2] & 0x01) << 2) | ((buffer[i + 3] & 0xC0) >>> 6)

      // adts_variable_header()
      const aacFrameLength = ((buffer[i + 3] & 0x03) << 11)
        | (buffer[i + 4] << 3)
        | ((buffer[i + 5] & 0xE0) >>> 5)

      const numberOfRawDataBlocksInFrame = buffer[i + 6] & 0x03

      let adtsHeaderLength = protectionAbsent === 1 ? 7 : 9
      let adtsFramePayloadLength = aacFrameLength - adtsHeaderLength

      const item = {
        dts: lastDts,
        buffer: null,
        extradata: null,
        duration: NOPTS_VALUE,
      }

      item.buffer = buffer.subarray(i + adtsHeaderLength, i + adtsHeaderLength + adtsFramePayloadLength)

      this.streamMuxConfig.profile = profile + 1
      this.streamMuxConfig.sampleRate = MPEG4SamplingFrequencies[samplingFrequencyIndex]
      this.streamMuxConfig.channels = MPEG4Channels[channelConfiguration]

      const hasNewExtraData = this.inCodecpar.profile !== this.streamMuxConfig.profile
        || this.inCodecpar.sampleRate !== this.streamMuxConfig.sampleRate
        || this.inCodecpar.chLayout.nbChannels !== this.streamMuxConfig.channels


      const duration = avRescaleQ(
        static_cast<int64>((numberOfRawDataBlocksInFrame + 1) * 1024 / this.streamMuxConfig.sampleRate * AV_TIME_BASE),
        AV_TIME_BASE_Q,
        this.inTimeBase
      )

      item.duration = Number(duration)

      if (hasNewExtraData) {
        this.inCodecpar.profile = this.streamMuxConfig.profile
        this.inCodecpar.sampleRate = this.streamMuxConfig.sampleRate
        this.inCodecpar.chLayout.nbChannels = this.streamMuxConfig.channels
        if (defined(API_OLD_CHANNEL_LAYOUT)) {
          this.inCodecpar.channels = this.streamMuxConfig.channels
        }

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

      i += aacFrameLength
      lastDts += duration
    }
  }

  public receiveAVPacket(avpacket: pointer<AVPacket>): number {
    if (this.caches.length) {

      unrefAVPacket(avpacket)

      const item = this.caches.shift()

      const data = avMalloc(item.buffer.length)
      memcpyFromUint8Array(data, item.buffer.length, item.buffer)
      addAVPacketData(avpacket, data, item.buffer.length)

      avpacket.dts = avpacket.pts = item.dts
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
}
