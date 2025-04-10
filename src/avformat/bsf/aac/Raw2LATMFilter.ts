/*
 * libmedia Raw2LATMFilter
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
import { MPEG4SamplingFrequencyIndex, getAVCodecParameters } from 'avutil/codecs/aac'
import { mapUint8Array } from 'cheap/std/memory'
import { addAVPacketData, copyAVPacketProps, createAVPacket,
  destroyAVPacket, getAVPacketSideData, refAVPacket, unrefAVPacket
} from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as errorType from 'avutil/error'
import * as object from 'common/util/object'
import BitWriter from 'common/io/BitWriter'
import { AVPacketSideDataType } from 'avutil/codec'

export interface AACRaw2LATMFilterOptions {
  mod?: number
}

const defaultAACRaw2LATMFilterOptions = {
  mod: 20
}

const LATM_HEADER = new Uint8Array([0x56, 0xe0, 0x00])

export default class Raw2LATMFilter extends AVBSFilter {
  private cache: pointer<AVPacket>
  private cached: boolean
  private bitWriter: BitWriter
  private counter: number

  private options: AACRaw2LATMFilterOptions

  constructor(options: AACRaw2LATMFilterOptions = {}) {
    super()
    this.options = object.extend({}, defaultAACRaw2LATMFilterOptions, options)
  }

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<Rational>): number {
    super.init(codecpar, timeBase)
    this.cache = createAVPacket()
    this.cached = false

    this.counter = 0
    this.bitWriter = new BitWriter()

    return 0
  }

  public destroy(): void {
    super.destroy()
    destroyAVPacket(this.cache)
    this.cache = nullptr
  }

  private writeHeader() {
    this.bitWriter.writeU1(this.counter === 0 ? 0 : 1)

    // StreamMuxConfig
    if (this.counter === 0) {
      // audioMuxVersion
      this.bitWriter.writeU1(0)
      // allStreamsSameTimeFraming
      this.bitWriter.writeU1(1)
      // numSubFrames
      this.bitWriter.writeU(6, 0)
      // numProgram
      this.bitWriter.writeU(4, 0)
      // numLayer
      this.bitWriter.writeU(3, 0)

      // profile
      this.bitWriter.writeU(5, (this.inCodecpar.profile - 1) & 0x1f)
      // samplingFreqIndex
      this.bitWriter.writeU(4, MPEG4SamplingFrequencyIndex[this.inCodecpar.sampleRate] & 0x0f)
      // channelConfig
      this.bitWriter.writeU(4, this.inCodecpar.chLayout.nbChannels & 0x0f)
      // padding
      this.bitWriter.writeU(3, 0)

      // frameLengthType
      this.bitWriter.writeU(3, 0)

      // latmBufferFullness
      this.bitWriter.writeU(8, 0xff)

      // otherDataPresent
      this.bitWriter.writeU1(0)

      // crcCheckPresent
      this.bitWriter.writeU1(0)

    }

    this.counter++
    this.counter %= this.options.mod
  }

  private copyBytes(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) {
      this.bitWriter.writeU(8, data[i])
    }
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    if (!avpacket.data || !avpacket.size) {
      return 0
    }

    this.bitWriter.reset()

    const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
    if (element) {
      const { profile, sampleRate, channels } = getAVCodecParameters(mapUint8Array(element.data, element.size))
      this.inCodecpar.profile = profile
      this.inCodecpar.sampleRate = sampleRate
      this.inCodecpar.chLayout.nbChannels = channels
      this.counter = 0
    }

    this.writeHeader()

    let i = 0
    for (; i <= avpacket.size - 255; i += 255) {
      this.bitWriter.writeU(8, 255)
    }
    this.bitWriter.writeU(8, avpacket.size - i)

    const packetBuffer = mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))

    if ((packetBuffer[0] & 0xe1) === 0x81) {
      /*
       * Convert byte-aligned DSE to non-aligned.
       * Due to the input format encoding we know that
       * it is naturally byte-aligned in the input stream,
       * so there are no padding bits to account for.
       * To avoid having to add padding bits and rearrange
       * the whole stream we just remove the byte-align flag.
       * This allows us to remux our FATE AAC samples into latm
       * files that are still playable with minimal effort.
       */

      this.bitWriter.writeU(8, packetBuffer[0] & 0xfe)
      this.copyBytes(packetBuffer.subarray(1))
    }
    else {
      this.copyBytes(packetBuffer)
    }

    this.bitWriter.padding()

    const len = this.bitWriter.getPointer()

    const size = 3 + len
    const bufferPointer: pointer<uint8> = avMalloc(size)
    const buffer = mapUint8Array(bufferPointer, size)
    buffer.set(LATM_HEADER, 0)

    buffer[1] |= (len >> 8) & 0x1f
    buffer[2] |= len & 0xff

    buffer.set(this.bitWriter.getBuffer().subarray(0, len), 3)

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
