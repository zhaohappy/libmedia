/*
 * libmedia Avcc2AnnexbFilter
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
  mapSafeUint8Array,
  mapUint8Array
} from '@libmedia/cheap'

import {
  logger
} from '@libmedia/common'

import {
  AVCodecID,
  AVPacketSideDataType,
  type AVPacket,
  AVPacketFlags,
  errorType,
  avMalloc,
  type AVCodecParameters,
  type AVRational,
  addAVPacketData,
  unrefAVPacket,
  addAVPacketSideData,
  copyAVPacketProps,
  createAVPacket,
  destroyAVPacket,
  refAVPacket,
  getAVPacketSideData,
  nalu
} from '@libmedia/avutil'

import {
  h264,
  hevc,
  vvc
} from '@libmedia/avutil/internal'

export default class Avcc2AnnexbFilter extends AVBSFilter {
  private cache: pointer<AVPacket>
  private cached: boolean
  private naluLengthSizeMinusOne: number

  public init(codecpar: pointer<AVCodecParameters>, timeBase: pointer<AVRational>): number {
    super.init(codecpar, timeBase)
    this.cache = createAVPacket()
    this.cached = false
    if (codecpar.extradata) {
      const extradata = mapUint8Array(codecpar.extradata, reinterpret_cast<size>(codecpar.extradataSize))
      if (!nalu.isAnnexb(extradata)) {
        if (codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
          this.naluLengthSizeMinusOne = extradata[4] & 0x03
        }
        else if (codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          this.naluLengthSizeMinusOne = extradata[21] & 0x03
        }
        else if (codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
          this.naluLengthSizeMinusOne = (extradata[0] >>> 1) & 0x03
        }
      }
    }
    return 0
  }

  public destroy(): void {
    super.destroy()
    destroyAVPacket(this.cache)
    this.cache = nullptr
  }

  public sendAVPacket(avpacket: pointer<AVPacket>): number {
    if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB) {
      refAVPacket(this.cache, avpacket)
    }
    else {
      copyAVPacketProps(this.cache, avpacket)

      let convert: {
        bufferPointer: pointer<uint8>,
        length: number,
        key: boolean
      }

      const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      let extradata = null
      if (element) {
        extradata = mapSafeUint8Array(element.data, element.size)

        if (!nalu.isAnnexb(extradata)) {
          if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
            this.naluLengthSizeMinusOne = extradata[4] & 0x03
          }
          else if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
            this.naluLengthSizeMinusOne = extradata[21] & 0x03
          }
          else if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
            this.naluLengthSizeMinusOne = (extradata[0] >>> 1) & 0x03
          }
        }
      }

      const buffer = mapSafeUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))

      if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
        convert = h264.avcc2Annexb(buffer, extradata, this.naluLengthSizeMinusOne)
      }
      else if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        convert = hevc.avcc2Annexb(buffer, extradata, this.naluLengthSizeMinusOne)
      }
      else if (this.inCodecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
        convert = vvc.avcc2Annexb(buffer, extradata, this.naluLengthSizeMinusOne)
      }
      else {
        logger.fatal(`not support for codecId: ${this.inCodecpar.codecId}`)
      }

      this.cache.flags |= AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB

      addAVPacketData(this.cache, convert.bufferPointer, convert.length)

      if (convert.key) {
        this.cache.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      }
    }
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
