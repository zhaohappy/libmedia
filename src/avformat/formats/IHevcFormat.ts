/*
 * libmedia hevc decoder
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
import * as hevc from 'avutil/codecs/hevc'
import { AV_TIME_BASE } from 'avutil/constant'
import BitReader from 'common/io/BitReader'
import * as expgolomb from 'avutil/util/expgolomb'
import NaluReader from './nalu/NaluReader'
import { BitFormat } from 'avutil/codecs/h264'

export interface IHevcFormatOptions {
  framerate?: Rational
}

const DefaultIHevcFormatOptions: IHevcFormatOptions = {
  framerate: {
    num: 30,
    den: 1
  }
}

export default class IHevcFormat extends IFormat {

  public type: AVFormat = AVFormat.HEVC

  private options: IHevcFormatOptions

  private currentDts: int64
  private currentPts: int64
  private step: int64

  private slices: Uint8Array[]
  private naluPos: int64

  private queue: { avpacket: pointer<AVPacket>, poc: int32 }[]
  private bitReader: BitReader

  private sliceType: hevc.HEVCSliceType
  private poc: int32

  private pocTid0: int32

  private sps: hevc.HevcSPS
  private pps: hevc.HevcPPS

  private naluReader: NaluReader

  constructor(options: IHevcFormatOptions = {}) {
    super()
    this.options = object.extend({}, DefaultIHevcFormatOptions, options)
  }

  public init(formatContext: AVIFormatContext): void {

    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(false)
    }

    this.slices = []

    this.queue = []
    this.bitReader = new BitReader(50)
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
    const type = (data[(data[2] === 1 ? 3 : 4)] >>> 1) & 0x3f
    return type < hevc.HEVCNaluType.kSliceVPS
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

      const type = (next[(next[2] === 1 ? 3 : 4)] >>> 1) & 0x3f

      if (this.isFrameNalu(next)) {
        if (hasFrame) {
          const firstSliceInPicFlag = next[next[2] === 1 ? 5 : 6] >>> 7
          if (firstSliceInPicFlag) {
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
        && (type === hevc.HEVCNaluType.kSliceAUD
          || type === hevc.HEVCNaluType.kSliceSPS
          || type === hevc.HEVCNaluType.kSlicePPS
          || type === hevc.HEVCNaluType.kSliceVPS
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
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_HEVC
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

      const extradata = hevc.generateAnnexbExtradata(data)

      if (extradata) {
        stream.codecpar.extradata = avMalloc(extradata.length)
        memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
        stream.codecpar.extradataSize = extradata.length

        hevc.parseAVCodecParameters(stream, extradata)

        const sps = slices.find((n) => {
          const type = (n[(n[2] === 1 ? 3 : 4)] >>> 1) & 0x3f
          return type === hevc.HEVCNaluType.kSliceSPS
        })
        const pps = slices.find((n) => {
          const type = (n[(n[2] === 1 ? 3 : 4)] >>> 1) & 0x3f
          return type === hevc.HEVCNaluType.kSlicePPS
        })

        this.sps = hevc.parseSPS(sps)
        this.pps = hevc.parsePPS(pps)

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

  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

    const nalus = await this.readNaluFrame(formatContext)

    if (!nalus.length) {
      return IOError.END
    }

    this.sliceType = hevc.HEVCSliceType.kSliceNone
    let isKey = false
    let isFirst = true

    nalus.forEach((n) => {
      const header = n[2] === 1 ? n[3] : n[4]
      const type = (header >>> 1) & 0x3f
      const temporalId = (n[2] === 1 ? n[4] : n[5]) & 0x07

      if (type === hevc.HEVCNaluType.kSliceSPS) {
        this.sps = hevc.parseSPS(n)
      }
      if (type === hevc.HEVCNaluType.kSlicePPS) {
        this.pps = hevc.parsePPS(n)
      }

      if (type === hevc.HEVCNaluType.kSliceIDR_W_RADL
        || type === hevc.HEVCNaluType.kSliceIDR_N_LP
      ) {
        isKey = true
      }

      if (type < hevc.HEVCNaluType.kSliceVPS && isFirst) {
        isFirst = false
        this.bitReader.reset()
        this.bitReader.appendBuffer(n.subarray(n[2] === 1 ? 5 : 6, 50))

        const firstSliceInPicFlag = this.bitReader.readU1()
        if (type >= 16 && type <= 23) {
          isKey = true
          // no_output_of_prior_pics_flag
          this.bitReader.readU1()
        }
        // pps_id
        expgolomb.readUE(this.bitReader)

        if (!firstSliceInPicFlag) {
          if (this.pps.dependent_slice_segment_flag) {
            // dependent_slice_segment_flag
            this.bitReader.readU1()
          }
          const sliceAddressLength = Math.ceil(Math.log2(this.sps.ctb_width * this.sps.ctb_height))
          this.bitReader.readU(sliceAddressLength)
        }

        for (let i = 0; i < this.pps.num_extra_slice_header_bits; i++) {
          // slice_reserved_undetermined_flag
          this.bitReader.readU1()
        }

        this.sliceType = expgolomb.readUE(this.bitReader)

        if (this.pps.output_flag_present_flag) {
          // pic_output_flag
          this.bitReader.readU1()
        }
        if (this.sps.separate_colour_plane_flag) {
          // colour_plane_id
          this.bitReader.readU(2)
        }

        if (type === hevc.HEVCNaluType.kSliceIDR_W_RADL
          || type === hevc.HEVCNaluType.kSliceIDR_N_LP
        ) {
          this.poc = 0
        }
        else {
          const picOrderCntLsb = this.bitReader.readU(this.sps.log2_max_poc_lsb)
          let maxPocLsb  = 1 << this.sps.log2_max_poc_lsb
          let prevPocLsb = this.pocTid0 % maxPocLsb
          let prevPocMsb = this.pocTid0 - prevPocLsb
          let pocMsb = 0
          if (picOrderCntLsb < prevPocLsb && prevPocLsb - picOrderCntLsb >= maxPocLsb / 2) {
            pocMsb = prevPocMsb + maxPocLsb
          }
          else if (picOrderCntLsb > prevPocLsb && picOrderCntLsb - prevPocLsb > maxPocLsb / 2) {
            pocMsb = prevPocMsb - maxPocLsb
          }
          else {
            pocMsb = prevPocMsb
          }
          // For BLA picture types, POCmsb is set to 0.
          if (type == hevc.HEVCNaluType.kSliceBLA_W_LP
            || type == hevc.HEVCNaluType.kSliceBLA_W_RADL
            || type == hevc.HEVCNaluType.kSliceBLA_N_LP
          ) {
            pocMsb = 0
          }
          this.poc = pocMsb + picOrderCntLsb
        }

        if (temporalId == 0
          && type != hevc.HEVCNaluType.kSliceTRAIL_N
          && type != hevc.HEVCNaluType.kSliceTSA_N
          && type != hevc.HEVCNaluType.kSliceSTSA_N
          && type != hevc.HEVCNaluType.kSliceRADL_N
          && type != hevc.HEVCNaluType.kSliceRASL_N
          && type != hevc.HEVCNaluType.kSliceRADL_R
          && type != hevc.HEVCNaluType.kSliceRASL_R
        ) {
          this.pocTid0 = this.poc
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
        || (this.sliceType === hevc.HEVCSliceType.kSliceP
          || this.sliceType === hevc.HEVCSliceType.kSliceI
        )
      ) {
        if (ipFrameCount === 1
          || ((next.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
            && this.queue.length
          )
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
