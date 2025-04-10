/*
 * libmedia vvc decoder
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

import { AVIFormatContext } from '../AVFormatContext'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { IOError } from 'common/io/error'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat } from 'avutil/avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData, createAVPacket, destroyAVPacket, refAVPacket } from 'avutil/util/avpacket'
import AVStream from 'avutil/AVStream'
import { Rational } from 'avutil/struct/rational'
import * as object from 'common/util/object'
import concatTypeArray from 'common/function/concatTypeArray'
import * as vvc from 'avutil/codecs/vvc'
import { AV_TIME_BASE } from 'avutil/constant'
import BitReader from 'common/io/BitReader'
import * as expgolomb from 'avutil/util/expgolomb'
import NaluReader from './nalu/NaluReader'
import { BitFormat } from 'avutil/codecs/h264'

export interface IVvcFormatOptions {
  framerate?: Rational
}

const DefaultIVvcFormatOptions: IVvcFormatOptions = {
  framerate: {
    num: 30,
    den: 1
  }
}

export default class IHevcFormat extends IFormat {

  public type: AVFormat = AVFormat.HEVC

  private options: IVvcFormatOptions

  private currentDts: int64
  private currentPts: int64
  private step: int64

  private slices: Uint8Array[]
  private naluPos: int64

  private queue: { avpacket: pointer<AVPacket>, poc: int32 }[]
  private bitReader: BitReader

  private sliceType: vvc.VVCSliceType
  private naluType: vvc.VVCNaluType
  private poc: int32

  private pocTid0: int32

  private sps: vvc.VvcSPS

  private naluReader: NaluReader

  constructor(options: IVvcFormatOptions = {}) {
    super()
    this.options = object.extend({}, DefaultIVvcFormatOptions, options)
  }

  public init(formatContext: AVIFormatContext): void {

    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(false)
    }

    this.slices = []

    this.queue = []
    this.bitReader = new BitReader(500)
    this.naluReader = new NaluReader()
  }

  public async destroy(formatContext: AVIFormatContext) {
    if (this.queue.length) {
      for (let i = 0; i < this.queue.length; i++) {
        destroyAVPacket(this.queue[i].avpacket)
      }
      this.queue.length = 0
    }
  }

  private isFrameNalu(data: Uint8Array) {
    const type = (data[(data[2] === 1 ? 4 : 5)] >>> 3) & 0x1f
    return type < vvc.VVCNaluType.kOPI_NUT
  }

  private async readNaluFrame(formatContext: AVIFormatContext) {

    let hasFrame = false

    const nalus: Uint8Array[] = this.slices
    this.slices = []

    if (nalus.length) {
      hasFrame = this.isFrameNalu(nalus[0])
    }

    while (true) {
      const next = await this.naluReader.read(formatContext.ioReader)
      if (!next) {
        return nalus
      }

      const type = (next[(next[2] === 1 ? 4 : 5)] >>> 3) & 0x1f

      if (this.isFrameNalu(next)) {
        if (hasFrame) {
          const hasPh = next[next[2] === 1 ? 5 : 6] >>> 7
          if (hasPh) {
            this.slices.push(next)
            return nalus
          }
          else {
            nalus.push(next)
          }
        }
        else {
          nalus.push(next)
          hasFrame = true
        }
      }
      else if (hasFrame
        && (type === vvc.VVCNaluType.kAUD_NUT
          || type === vvc.VVCNaluType.kPH_NUT
          || type === vvc.VVCNaluType.kSPS_NUT
          || type === vvc.VVCNaluType.kVPS_NUT
          || type === vvc.VVCNaluType.kPPS_NUT
          || type === vvc.VVCNaluType.kOPI_NUT
          || type === vvc.VVCNaluType.kDCI_NUT
        )
      ) {
        this.slices.push(next)
        return nalus
      }
      else {
        nalus.push(next)
      }
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const stream = formatContext.createStream()
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_VVC
    stream.timeBase.den = AV_TIME_BASE
    stream.timeBase.num = 1
    stream.codecpar.bitFormat = BitFormat.ANNEXB
    this.currentDts = 0n
    this.currentPts = 0n
    this.naluPos = 0n
    this.poc = 0
    this.pocTid0 = 0
    this.step = static_cast<int64>((AV_TIME_BASE / this.options.framerate.num * this.options.framerate.den) as double)

    while (true) {
      const slices = await this.readNaluFrame(formatContext)

      if (!slices.length) {
        return IOError.END
      }

      const data = concatTypeArray(Uint8Array, slices)

      const extradata = vvc.generateAnnexbExtradata(data)

      if (extradata) {
        stream.codecpar.extradata = avMalloc(extradata.length)
        memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
        stream.codecpar.extradataSize = extradata.length

        vvc.parseAVCodecParameters(stream, extradata)

        const sps = slices.find((n) => {
          const type = (n[(n[2] === 1 ? 4 : 5)] >>> 3) & 0x1f
          return type === vvc.VVCNaluType.kSPS_NUT
        })
        this.sps = vvc.parseSPS(sps)

        const avpacket = createAVPacket()

        const dataP: pointer<uint8> = avMalloc(data.length)
        memcpyFromUint8Array(dataP, data.length, data)
        addAVPacketData(avpacket, dataP, data.length)

        avpacket.pos = this.naluPos
        this.naluPos += static_cast<int64>(data.length)

        avpacket.dts = this.currentDts
        this.currentDts += this.step
        avpacket.pts = this.currentPts
        this.currentPts += this.step

        avpacket.streamIndex = stream.index
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        avpacket.timeBase.num = stream.timeBase.num
        avpacket.timeBase.den = stream.timeBase.den
        avpacket.bitFormat = BitFormat.ANNEXB

        formatContext.interval.packetBuffer.push(avpacket)

        break
      }

      this.naluPos += static_cast<int64>(data.length)
    }

    return 0
  }

  private computePoc(naluType: vvc.VVCNaluType, temporalId: number, ph: Uint8Array, sliceHeader: boolean) {
    /* eslint-disable camelcase */
    this.bitReader.reset()
    this.bitReader.appendBuffer(ph.subarray(0, 500))

    if (sliceHeader) {
      // sh_picture_header_in_slice_header_flag
      this.bitReader.readU1()
    }
    const ph_gdr_or_irap_pic_flag = this.bitReader.readU1()
    const ph_non_ref_pic_flag = this.bitReader.readU1()
    let ph_gdr_pic_flag = 0
    if (ph_gdr_or_irap_pic_flag) {
      ph_gdr_pic_flag = this.bitReader.readU1()
    }
    const ph_inter_slice_allowed_flag = this.bitReader.readU1()
    if (ph_inter_slice_allowed_flag) {
      // ph_intra_slice_allowed_flag
      this.bitReader.readU1()
    }
    // ph_pic_parameter_set_id
    expgolomb.readUE(this.bitReader)
    const poc_lsb = this.bitReader.readU(this.sps.sps_log2_max_pic_order_cnt_lsb_minus4 + 4)
    if (ph_gdr_pic_flag) {
      // ph_recovery_poc_cnt
      expgolomb.readUE(this.bitReader)
    }
    for (let i = 0; i < this.sps.sps_num_extra_ph_bytes * 8; i++) {
      if (this.sps.sps_extra_ph_bit_present_flag[i]) {
        this.bitReader.readU1()
      }
    }
    let ph_poc_msb_cycle_val = 0
    let ph_poc_msb_cycle_present_flag = 0
    if (this.sps.sps_poc_msb_cycle_flag) {
      ph_poc_msb_cycle_present_flag = this.bitReader.readU1()
      if (ph_poc_msb_cycle_present_flag) {
        ph_poc_msb_cycle_val = this.bitReader.readU(this.sps.sps_poc_msb_cycle_len_minus1 + 1)
      }
    }

    const max_poc_lsb = 1 << (this.sps.sps_log2_max_pic_order_cnt_lsb_minus4 + 4)
    let poc_msb = 0
    if (naluType === vvc.VVCNaluType.kIDR_N_LP
      || naluType === vvc.VVCNaluType.kIDR_W_RADL
    ) {
      if (ph_poc_msb_cycle_present_flag) {
        poc_msb = ph_poc_msb_cycle_val * max_poc_lsb
      }
      else {
        poc_msb = 0
      }
    }
    else {
      const prev_poc = this.pocTid0
      const prev_poc_lsb = prev_poc & (max_poc_lsb - 1)
      const prev_poc_msb = prev_poc - prev_poc_lsb
      if (ph_poc_msb_cycle_present_flag) {
        poc_msb = ph_poc_msb_cycle_val * max_poc_lsb
      }
      else {
        if ((poc_lsb < prev_poc_lsb)
          && ((prev_poc_lsb - poc_lsb) >= (max_poc_lsb / 2))
        ) {
          poc_msb = prev_poc_msb + max_poc_lsb
        }
        else if ((poc_lsb > prev_poc_lsb)
          && ((poc_lsb - prev_poc_lsb) > (max_poc_lsb / 2))
        ) {
          poc_msb = prev_poc_msb - max_poc_lsb
        }
        else {
          poc_msb = prev_poc_msb
        }
      }
    }
    this.poc = poc_msb + poc_lsb

    if (temporalId == 0
      && !ph_non_ref_pic_flag
      && naluType !== vvc.VVCNaluType.kRADL_NUT
      && naluType !== vvc.VVCNaluType.kRASL_NUT
    ) {
      this.pocTid0 = this.poc
    }
    /* eslint-enable camelcase */
  }

  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

    const nalus = await this.readNaluFrame(formatContext)

    if (!nalus.length) {
      return IOError.END
    }

    this.sliceType = vvc.VVCSliceType.kSliceNone
    let isKey = false
    let isFirst = true

    nalus.forEach((n) => {
      const header = n[2] === 1 ? n[4] : n[5]
      const type = (header >>> 3) & 0x1f
      const temporalId = (header & 0x07) - 1

      if (type === vvc.VVCNaluType.kSPS_NUT) {
        this.sps = vvc.parseSPS(n)
      }

      if (type === vvc.VVCNaluType.kIDR_N_LP
        || type === vvc.VVCNaluType.kIDR_W_RADL
      ) {
        isKey = true
      }

      if (type === vvc.VVCNaluType.kPH_NUT) {
        this.computePoc(type, temporalId, n.subarray(n[2] === 1 ? 5 : 6), false)
      }

      if (type < vvc.VVCNaluType.kVPS_NUT && isFirst) {
        isFirst = false
        this.naluType = type
        const hasPh = n[n[2] === 1 ? 5 : 6] >>> 7
        if (hasPh) {
          this.computePoc(type, temporalId, n.subarray(n[2] === 1 ? 5 : 6), true)
        }
      }
    })

    const data = concatTypeArray(Uint8Array, nalus)

    const dataP: pointer<uint8> = avMalloc(data.length)
    memcpyFromUint8Array(dataP, data.length, data)
    addAVPacketData(avpacket, dataP, data.length)

    avpacket.pos = this.naluPos
    this.naluPos += static_cast<int64>(data.length)
    avpacket.dts = this.currentDts
    this.currentDts += this.step
    avpacket.streamIndex = stream.index
    avpacket.timeBase.num = stream.timeBase.num
    avpacket.timeBase.den = stream.timeBase.den
    avpacket.bitFormat = BitFormat.ANNEXB

    if (isKey) {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    let ipFrameCount = this.queue.length

    const output = () => {

      if (this.queue.length > 1) {
        this.queue.sort((a, b) => {
          return a.poc - b.poc > 0 ? 1 : -1
        })
      }

      for (let i = 0; i < this.queue.length; i++) {
        this.queue[i].avpacket.pts = this.currentPts
        this.currentPts += this.step
      }
      if (this.queue.length > 1) {
        this.queue.sort((a, b) => {
          return a.avpacket.dts - b.avpacket.dts > 0n ? 1 : -1
        })
      }
      if (this.queue.length) {
        refAVPacket(avpacket, this.queue[0].avpacket)
        destroyAVPacket(this.queue[0].avpacket)
      }
      for (let i = 1; i < this.queue.length; i++) {
        formatContext.interval.packetBuffer.push(this.queue[i].avpacket)
      }
      this.queue.length = 0
    }

    while (true) {
      const next = createAVPacket()
      let ret = await this.readAVPacket_(formatContext, next)
      if (ret < 0) {
        destroyAVPacket(next)
        if (this.queue.length) {
          output()
          return 0
        }
        else {
          return ret
        }
      }
      if ((next.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
        || this.naluType === vvc.VVCNaluType.kCRA_NUT
        || (this.sliceType === vvc.VVCSliceType.kSliceP
          || this.sliceType === vvc.VVCSliceType.kSliceI
        )
      ) {
        if (ipFrameCount === 1
          || (this.naluType === vvc.VVCNaluType.kCRA_NUT
              || (next.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
          )
            && this.queue.length
        ) {
          output()
          this.queue.push({
            avpacket: next,
            poc: this.poc
          })
          return 0
        }
        else {
          this.queue.push({
            avpacket: next,
            poc: this.poc
          })
          ipFrameCount++
        }
      }
      else {
        this.queue.push({
          avpacket: next,
          poc: this.poc
        })
      }
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }

}
