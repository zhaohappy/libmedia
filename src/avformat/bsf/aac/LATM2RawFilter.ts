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
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE } from 'avutil/constant'
import { MPEG4Channels, MPEG4SamplingFrequencies, avCodecParameters2Extradata } from '../../codecs/aac'
import { avRescaleQ } from 'avutil/util/rational'
import { avFree, avMalloc } from 'avutil/util/mem'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { addAVPacketData, addAVPacketSideData, unrefAVPacket } from 'avutil/util/avpacket'
import { AVPacketSideDataType } from 'avutil/codec'
import BitReader from 'common/io/BitReader'


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

  private getLATMValue() {
    const bytesForValue = this.bitReader.readU(2)
    let value = 0

    for (let i = 0; i <= bytesForValue; i++) {
      value = value << 8
      value = value | this.bitReader.readU(8)
    }

    return value
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {

    const buffer = mapUint8Array(avpacket.data, avpacket.size)

    this.bitReader.clear()
    this.bitReader.appendBuffer(buffer)

    let lastDts = avpacket.dts || avpacket.pts

    while (this.bitReader.remainingLength() > 3) {

      const syncWord = this.bitReader.readU(11)

      if (syncWord !== 0x2B7) {
        logger.error(`AACLATMParser found syncWord not 0x2B7, got: 0x${syncWord.toString(16)}`)
        this.bitReader.clear()
        return errorType.DATA_INVALID
      }
      const audioMuxLengthBytes = this.bitReader.readU(13)

      if (audioMuxLengthBytes > this.bitReader.remainingLength()) {
        break
      }

      const useSameStreamMux = this.bitReader.readU1() === 0x01

      if (!useSameStreamMux) {
        const audioMuxVersion = this.bitReader.readU1() === 0x01
        const audioMuxVersionA = audioMuxVersion && this.bitReader.readU1() === 0x01
        if (audioMuxVersionA) {
          logger.error('audioMuxVersionA is Not Supported')
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }
        if (audioMuxVersion) {
          this.getLATMValue()
        }
        const allStreamsSameTimeFraming = this.bitReader.readU1() === 0x01
        if (!allStreamsSameTimeFraming) {
          logger.error('allStreamsSameTimeFraming zero is Not Supported')
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }
        const numSubFrames = this.bitReader.readU(6)
        if (numSubFrames !== 0) {
          logger.error('more than 2 numSubFrames Not Supported')
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }

        const numProgram = this.bitReader.readU(4)
        if (numProgram !== 0) {
          logger.error('more than 2 numProgram Not Supported')
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }

        const numLayer = this.bitReader.readU(3)
        if (numLayer !== 0) {
          logger.error('more than 2 numLayer Not Supported\'')
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }

        let fillBits = audioMuxVersion ? this.getLATMValue() : 0

        const audioObjectType = this.bitReader.readU(5)
        fillBits -= 5

        const samplingFreqIndex = this.bitReader.readU(4)
        fillBits -= 4

        const channelConfig = this.bitReader.readU(4)
        fillBits -= 4

        this.bitReader.readU(3)
        fillBits -= 3

        if (fillBits > 0) {
          this.bitReader.readU(fillBits)
        }

        const frameLengthType = this.bitReader.readU(3)
        if (frameLengthType === 0) {
          this.bitReader.readU(8)
        }
        else {
          logger.error(`frameLengthType = ${frameLengthType}, only frameLengthType = 0 supported`)
          this.bitReader.clear()
          return errorType.DATA_INVALID
        }

        const otherDataPresent = this.bitReader.readU1() === 0x01
        if (otherDataPresent) {
          if (audioMuxVersion) {
            this.getLATMValue()
          }
          else {
            let otherDataLenBits = 0
            while (true) {
              otherDataLenBits = otherDataLenBits << 8
              const otherDataLenEsc = this.bitReader.readU1() === 0x01
              const otherDataLenTmp = this.bitReader.readU(8)
              otherDataLenBits += otherDataLenTmp
              if (!otherDataLenEsc) {
                break
              }
            }
          }
        }

        const crcCheckPresent = this.bitReader.readU1() === 0x01
        if (crcCheckPresent) {
          this.bitReader.readU(8)
        }

        this.streamMuxConfig.profile = audioObjectType + 1
        this.streamMuxConfig.sampleRate = MPEG4SamplingFrequencies[samplingFreqIndex]
        this.streamMuxConfig.channels = MPEG4Channels[channelConfig]
      }

      let length = 0
      while (true) {
        const tmp = this.bitReader.readU(8)
        length += tmp
        if (tmp !== 0xff) {
          break
        }
      }
      const rawData = new Uint8Array(length)
      for (let i = 0; i < length; i++) {
        rawData[i] = this.bitReader.readU(8)
      }

      const item = {
        dts: lastDts,
        buffer: rawData,
        extradata: null
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
      lastDts += this.refSampleDuration

      this.bitReader.skipPadding()
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
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      if (item.extradata) {
        const extradata = avMalloc(item.extradata.length)
        memcpyFromUint8Array(extradata, item.extradata.length, item.extradata)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, item.extradata.length)
      }
      return 0
    }
    else {
      return errorType.DATA_INVALID
    }
  }
}
