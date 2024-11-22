/*
 * libmedia vvc util
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

import * as array from 'common/util/array'
import AVPacket, { AVPacketFlags } from '../struct/avpacket'
import BufferWriter from 'common/io/BufferWriter'
import BufferReader from 'common/io/BufferReader'
import { AVPacketSideDataType } from '../codec'
import BitReader from 'common/io/BitReader'
import AVStream from '../AVStream'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { naluUnescape, splitNaluByStartCode, isAnnexb } from '../util/nalu'
import { addAVPacketSideData, getAVPacketData } from '../util/avpacket'
import { avMalloc } from '../util/mem'
import * as expgolomb from '../util/expgolomb'
import { Uint8ArrayInterface } from 'common/io/interface'
import BitWriter from 'common/io/BitWriter'
import { Data } from 'common/types/type'
import { BitFormat } from './h264'
import * as intread from '../util/intread'

const NALULengthSizeMinusOne = 3

export const enum VVCNaluType {
  kTRAIL_NUT      = 0,
  kSTSA_NUT       = 1,
  kRADL_NUT       = 2,
  kRASL_NUT       = 3,
  kRSV_VCL_4      = 4,
  kRSV_VCL_5      = 5,
  kRSV_VCL_6      = 6,
  kIDR_W_RADL     = 7,
  kIDR_N_LP       = 8,
  kCRA_NUT        = 9,
  kGDR_NUT        = 10,
  kRSV_IRAP_11    = 11,
  kOPI_NUT        = 12,
  kDCI_NUT        = 13,
  kVPS_NUT        = 14,
  kSPS_NUT        = 15,
  kPPS_NUT        = 16,
  kPREFIX_APS_NUT = 17,
  kSUFFIX_APS_NUT = 18,
  kPH_NUT         = 19,
  kAUD_NUT        = 20,
  kEOS_NUT        = 21,
  kEOB_NUT        = 22,
  kPREFIX_SEI_NUT = 23,
  kSUFFIX_SEI_NUT = 24,
  kFD_NUT         = 25,
  kRSV_NVCL_26    = 26,
  kRSV_NVCL_27    = 27,
  kUNSPEC_28      = 28,
  kUNSPEC_29      = 29,
  kUNSPEC_30      = 30,
  kUNSPEC_31      = 31,
}

export const enum VVCSliceType {
  kSliceNone = -1,
  kSliceB = 0,
  kSliceP = 1,
  kSliceI = 2
}

export const enum VVCAPSType {
  kALF     = 0,
  kLMCS    = 1,
  kSCALING = 2
}

/* eslint-disable camelcase */
function parsePTL(bitReader: BitReader) {
  const olsIdx = bitReader.readU(9)
  const numSublayers = bitReader.readU(3)
  const constantFrameRate = bitReader.readU(2)
  const chromaFormatIdc = bitReader.readU(2)
  const bitDepthMinus8 = bitReader.readU(3)
  bitReader.readU(5)

  // VvcPTLRecord
  bitReader.readU(2)
  const num_bytes_constraint_info = bitReader.readU(6)
  const generalProfileIdc = bitReader.readU(7)
  const generalTierFlag = bitReader.readU(1)
  const generalLevelIdc = bitReader.readU(8)
  const ptlFrameOnlyConstraintFlag = bitReader.readU(1)
  const ptlMultilayerEnabledFlag = bitReader.readU(1)
  const generalConstraintInfo = []
  const sublayerLevelIdc = []

  if (num_bytes_constraint_info) {
    for (let i = 0; i < num_bytes_constraint_info - 1; i++) {
      generalConstraintInfo[i] = bitReader.readU(8)
    }
    generalConstraintInfo[num_bytes_constraint_info - 1] = bitReader.readU(6)
  }
  else {
    bitReader.readU(6)
  }
  if (numSublayers > 1) {
    let ptl_sublayer_present_mask = 0
    for (let j = numSublayers - 2; j >= 0; --j) {
      const val = bitReader.readU(1)
      ptl_sublayer_present_mask |= val << j
    }
    for (let j = numSublayers; j <= 8 && numSublayers > 1; ++j) {
      bitReader.readU(1)
    }

    for (let j = numSublayers - 2; j >= 0; --j) {
      if (ptl_sublayer_present_mask & (1 << j)) {
        sublayerLevelIdc[j] = bitReader.readU(8)
      }
    }
  }
  const ptl_num_sub_profiles = bitReader.readU(8)
  const generalSubProfileIdc = []
  if (ptl_num_sub_profiles) {
    for (let i = 0; i < ptl_num_sub_profiles; i++) {
      generalSubProfileIdc.push(bitReader.readU(8))
    }
  }

  const maxPictureWidth = bitReader.readU(16)
  const maxPictureHeight = bitReader.readU(16)
  const avgFramerate = bitReader.readU(16)

  return {
    olsIdx,
    numSublayers,
    bitDepthMinus8,
    chromaFormatIdc,
    constantFrameRate,
    generalProfileIdc,
    generalTierFlag,
    generalLevelIdc,
    ptlFrameOnlyConstraintFlag,
    ptlMultilayerEnabledFlag,
    generalConstraintInfo,
    sublayerLevelIdc,
    generalSubProfileIdc,
    maxPictureWidth,
    maxPictureHeight,
    avgFramerate
  }
}
/* eslint-enable camelcase */

/**
 * 
 * vvcc 格式的 extradata 转 annexb vps sps pps
 * 
 * bits    
 * - 5   reserved (11111)
 * - 2   lengthSizeMinusOne
 * - 1   ptl_present_flag
 * if ptl_present_flag
 *   - 9   ols_idx
 *   - 3  num_sublayers
 *   - 2  constant_frame_rate
 *   - 2  chroma_format_idc
 *   - 3  bit_depth_minus8
 *   - 5  reserved (11111)
 *   VvcPTLRecord
 *   - 2 reserved (11)
 *   - 6 num_bytes_constraint_info
 *   - 7 general_profile_idc
 *   - 1 general_tier_flag
 *   - 8 general_level_idc
 *   - 1 general_level_idc
 *   - 1 ptl_multilayer_enabled_flag
 *   if num_bytes_constraint_info > 0
 *      for (i = 0; i < num_bytes_constraint_info - 1; i++)
 *        - 8 general_constraint_info[i]
 *      - 6 general_constraint_info[num_bytes_constraint_info - 1]
 *   else
 *      - 6 reserved
 *   if num_sublayers > 1
 *      - num_sublayers - 2 ptl_sublayer_level_present_flag
 *      - 8 - num_sublayers + 1 ptl_reserved_zero_bit
 *      for (i = num_sublayers -2; i >= 0; i--)
 *        if ptl_sublayer_present_mask & (1 << i)
 *          - 8 sublayer_level_idc[i]
 *    - 8 ptl_num_sub_profiles
 *    if ptl_num_sub_profiles
 *      for (i = 0; i < ptl_num_sub_profiles; i++)
 *        - 32 general_sub_profile_idc[i]
 *    - 16 max_picture_width
 *    - 16 max_picture_height
 *    - 16 avg_frame_rate
 * - 8   numOfArrays
 * - repeated of array (vps/sps/pps)
 * - 1   array_completeness
 * - 2   reserved (0)
 * - 5   NAL_unit_type
 * if nalu_type != VVC_NALU_DEC_PARAM && nalu_type != VVC_NALU_OPI
 *    - 16  numNalus
 * else
 *   numNalus = 1
 * - repeated once per NAL
 * - 16  nalUnitLength
 * - N   NALU data
 * 
 */
export function extradata2VpsSpsPps(extradata: Uint8ArrayInterface) {

  const bufferReader = new BufferReader(extradata, true)

  const ptlPresentFlag = bufferReader.readUint8() & 0x01

  if (ptlPresentFlag) {
    const bitReader = new BitReader()
    bitReader.appendBuffer(extradata.subarray(1))
    parsePTL(bitReader)
    bufferReader.skip(bitReader.getPointer())
  }

  let vpss = []
  let spss = []
  let ppss = []

  const arrayLen = bufferReader.readUint8()

  for (let i = 0; i < arrayLen; i++) {
    const naluType = bufferReader.readUint8() & 0x1f
    let count = 1

    if (naluType !== VVCNaluType.kDCI_NUT && naluType !== VVCNaluType.kOPI_NUT) {
      count = bufferReader.readUint16()
    }
    const list = []

    for (let j = 0; j < count; j++) {
      const len = bufferReader.readUint16()
      list.push(bufferReader.readBuffer(len))
    }

    if (naluType === VVCNaluType.kVPS_NUT) {
      vpss = list
    }
    else if (naluType === VVCNaluType.kSPS_NUT) {
      spss = list
    }
    else if (naluType === VVCNaluType.kPPS_NUT) {
      ppss = list
    }
  }

  return {
    vpss,
    spss,
    ppss
  }
}

export function vpsSpsPps2Extradata(vpss: Uint8ArrayInterface[], spss: Uint8ArrayInterface[], ppss: Uint8ArrayInterface[]) {

  const sps = spss[0]
  let ptl: Uint8Array
  if (sps) {
    const spsParams = parseSPS(sps)
    let generalConstraintInfo = spsParams.generalConstraintInfo
    if (!generalConstraintInfo.length) {
      generalConstraintInfo = new Array(12).fill(0)
    }
    const biWriter = new BitWriter()
    biWriter.writeU(9, 0)
    biWriter.writeU(3, spsParams.spsMaxSublayersMinus1 + 1)
    biWriter.writeU(2, 1)
    biWriter.writeU(2, spsParams.chromaFormatIdc)
    biWriter.writeU(3, spsParams.bitDepthMinus8)
    biWriter.writeU(5, 0b11111)
    biWriter.writeU(2, 0)
    biWriter.writeU(6, generalConstraintInfo.length)
    biWriter.writeU(7, spsParams.profile)
    biWriter.writeU1(spsParams.tierFlag)
    biWriter.writeU(8, spsParams.level)
    biWriter.writeU1(spsParams.ptlFrameOnlyConstraintFlag)
    biWriter.writeU1(spsParams.ptlMultilayerEnabledFlag)

    if (generalConstraintInfo.length) {
      for (let i = 0; i < generalConstraintInfo.length - 1; i++) {
        biWriter.writeU(8, generalConstraintInfo[i])
      }
      biWriter.writeU(6, generalConstraintInfo[generalConstraintInfo.length - 1])
    }
    else {
      biWriter.writeU(6, 0b111111)
    }

    if (spsParams.spsMaxSublayersMinus1 + 1 > 1) {
      let ptlSubLayerLevelPresentFlags = 0
      for (let i = spsParams.spsMaxSublayersMinus1 - 1; i >= 0; i--) {
        ptlSubLayerLevelPresentFlags = (ptlSubLayerLevelPresentFlags << 1 | spsParams.ptlSublayerLevelPresentFlag[i])
      }
      biWriter.writeU(spsParams.spsMaxSublayersMinus1, ptlSubLayerLevelPresentFlags)

      for (let j = spsParams.spsMaxSublayersMinus1 + 1; j <= 8 && spsParams.spsMaxSublayersMinus1 > 0; ++j) {
        biWriter.writeU1(0)
      }
      for (let i = spsParams.spsMaxSublayersMinus1 - 1; i >= 0; i--) {
        if (spsParams.ptlSublayerLevelPresentFlag[i]) {
          biWriter.writeU(8, spsParams.sublayerLevelIdc[i])
        }
      }
    }
    biWriter.writeU(8, spsParams.generalSubProfileIdc.length)
    for (let i = 0; i < spsParams.generalSubProfileIdc.length; i++) {
      biWriter.writeU(8, spsParams.sublayerLevelIdc[i])
    }
    biWriter.writeU(16, spsParams.width)
    biWriter.writeU(16, spsParams.height)
    biWriter.writeU(16, 0)
    biWriter.padding()
    ptl = biWriter.getBuffer().subarray(0, biWriter.getPointer())
  }

  let length = 2 + (ptl ? ptl.length : 0)

  if (vpss.length) {
    // type + count
    length += 3
    length = vpss.reduce((prev, value) => {
      // length + data
      return prev + 2 + value.length
    }, length)
  }

  if (spss.length) {
    // type + count
    length += 3
    length = spss.reduce((prev, value) => {
      // length + data
      return prev + 2 + value.length
    }, length)
  }

  if (ppss.length) {
    // type + count
    length += 3
    length = ppss.reduce((prev, value) => {
      // length + data
      return prev + 2 + value.length
    }, length)
  }

  const buffer = new Uint8Array(length)
  const bufferWriter = new BufferWriter(buffer, true)

  bufferWriter.writeUint8(NALULengthSizeMinusOne << 1 | (ptl ? 1 : 0) | 0xf8)

  if (ptl) {
    bufferWriter.writeBuffer(ptl)
  }

  // numOfArrays
  let numOfArrays = 0
  if (vpss.length) {
    numOfArrays++
  }
  if (spss.length) {
    numOfArrays++
  }
  if (ppss.length) {
    numOfArrays++
  }
  bufferWriter.writeUint8(numOfArrays)

  // vps
  if (vpss.length) {
    bufferWriter.writeUint8((1 << 7) | VVCNaluType.kVPS_NUT)
    bufferWriter.writeUint16(vpss.length)
    array.each(vpss, (vps) => {
      bufferWriter.writeUint16(vps.length)
      bufferWriter.writeBuffer(vps)
    })
  }

  // sps
  if (spss.length) {
    bufferWriter.writeUint8((1 << 7) | VVCNaluType.kSPS_NUT)
    bufferWriter.writeUint16(spss.length)
    array.each(spss, (sps) => {
      bufferWriter.writeUint16(sps.length)
      bufferWriter.writeBuffer(sps)
    })
  }

  // pps
  if (ppss.length) {
    bufferWriter.writeUint8((1 << 7) | VVCNaluType.kPPS_NUT)
    bufferWriter.writeUint16(ppss.length)
    array.each(ppss, (pps) => {
      bufferWriter.writeUint16(pps.length)
      bufferWriter.writeBuffer(pps)
    })
  }

  return buffer
}

export function annexbExtradata2AvccExtradata(data: Uint8ArrayInterface) {
  let nalus = splitNaluByStartCode(data)

  if (nalus.length >= 2) {
    const vpss = []
    const spss = []
    const ppss = []

    nalus.forEach((nalu) => {
      const type = (nalu[1] >>> 3) & 0x1f
      if (type === VVCNaluType.kVPS_NUT) {
        vpss.push(nalu)
      }
      else if (type === VVCNaluType.kSPS_NUT) {
        spss.push(nalu)
      }
      else if (type === VVCNaluType.kPPS_NUT) {
        ppss.push(nalu)
      }
    })

    if (spss.length && ppss.length) {
      return vpsSpsPps2Extradata(vpss, spss, ppss)
    }
  }
}

/**
 * 
 * annexb 格式的 NALU 转 avcc NALU 
 * 
 */
export function annexb2Avcc(data: Uint8ArrayInterface) {
  let extradata: Uint8Array
  let key: boolean = false

  let nalus = splitNaluByStartCode(data)

  if (nalus.length >= 2) {
    const vpss = []
    const spss = []
    const ppss = []

    nalus.forEach((nalu) => {
      const type = (nalu[1] >>> 3) & 0x1f
      if (type === VVCNaluType.kVPS_NUT) {
        vpss.push(nalu)
      }
      else if (type === VVCNaluType.kSPS_NUT) {
        spss.push(nalu)
      }
      else if (type === VVCNaluType.kPPS_NUT) {
        ppss.push(nalu)
      }
    })

    if (spss.length && ppss.length) {
      extradata = vpsSpsPps2Extradata(vpss, spss, ppss)

      nalus = nalus.filter((nalu) => {
        const type = (nalu[1] >>> 3) & 0x1f
        return type !== VVCNaluType.kVPS_NUT
          && type !== VVCNaluType.kSPS_NUT
          && type !== VVCNaluType.kPPS_NUT
          && type !== VVCNaluType.kAUD_NUT
      })
    }
  }

  const length = nalus.reduce((prev, nalu) => {
    return prev + NALULengthSizeMinusOne + 1 + nalu.length
  }, 0)

  const bufferPointer = avMalloc(length)
  const buffer = mapUint8Array(bufferPointer, length)

  const bufferWriter = new BufferWriter(buffer)

  array.each(nalus, (nalu) => {
    if (NALULengthSizeMinusOne === 3) {
      bufferWriter.writeUint32(nalu.length)
    }
    else if (NALULengthSizeMinusOne === 2) {
      bufferWriter.writeUint24(nalu.length)
    }
    else if (NALULengthSizeMinusOne === 1) {
      bufferWriter.writeUint16(nalu.length)
    }
    else {
      bufferWriter.writeUint8(nalu.length)
    }
    bufferWriter.writeBuffer(nalu.subarray(0))

    const type = (nalu[1] >>> 3) & 0x1f
    if (type === VVCNaluType.kIDR_N_LP
      || type === VVCNaluType.kIDR_W_RADL
      || type === VVCNaluType.kCRA_NUT
      || type === VVCNaluType.kGDR_NUT
    ) {
      key = true
    }
  })

  return {
    bufferPointer,
    length,
    extradata,
    key
  }
}

/**
 * avcc 格式的 NALU 转 annexb NALU 
 * 
 */
export function avcc2Annexb(data: Uint8ArrayInterface, extradata?: Uint8ArrayInterface) {
  const naluLengthSizeMinusOne = extradata ? ((extradata[0] >>> 1) & 0x03) : NALULengthSizeMinusOne

  let vpss = []
  let spss = []
  let ppss = []
  let key = false

  if (extradata) {
    const result = extradata2VpsSpsPps(extradata)
    vpss = result.vpss
    spss = result.spss
    ppss = result.ppss
    key = true
  }

  const nalus = []

  const bufferReader = new BufferReader(data)
  while (bufferReader.remainingSize() > 0) {
    let length = 0
    if (naluLengthSizeMinusOne === 3) {
      length = bufferReader.readUint32()
    }
    else if (naluLengthSizeMinusOne === 2) {
      length = bufferReader.readUint24()
    }
    else if (naluLengthSizeMinusOne === 1) {
      length = bufferReader.readUint16()
    }
    else {
      length = bufferReader.readUint8()
    }
    nalus.push(bufferReader.readBuffer(length))
  }

  let length = vpss.reduce((prev, vps) => {
    return prev + 4 + vps.length
  }, 0)
  length = spss.reduce((prev, sps) => {
    return prev + 4 + sps.length
  }, length)
  length = ppss.reduce((prev, pps) => {
    return prev + 4 + pps.length
  }, length)
  length = nalus.reduce((prev, nalu, index) => {
    return prev + (index ? 3 : 4) + nalu.length
  }, length)

  const bufferPointer = avMalloc(length + 7)
  const buffer = mapUint8Array(bufferPointer, length + 7)

  const bufferWriter = new BufferWriter(buffer)

  // AUD
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x01)
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(VVCNaluType.kAUD_NUT << 3)
  bufferWriter.writeUint8(0xf0)

  array.each(vpss, (vps) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(vps)
  })

  array.each(spss, (sps) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(sps)
  })

  array.each(ppss, (pps) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(pps)
  })

  array.each(nalus, (nalu, index) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    if (!index) {
      bufferWriter.writeUint8(0x00)
    }
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(nalu)

    const type = (nalu[1] >>> 3) & 0x1f
    if (type === VVCNaluType.kIDR_N_LP
      || type === VVCNaluType.kIDR_W_RADL
      || type === VVCNaluType.kCRA_NUT
      || type === VVCNaluType.kGDR_NUT
    ) {
      key = true
    }
  })

  return {
    bufferPointer,
    length: length + 7,
    key
  }
}

export function parseAvccExtraData(avpacket: pointer<AVPacket>, stream: AVStream) {
  if (!(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)) {
    return
  }

  const data = getAVPacketData(avpacket)

  if (isAnnexb(data)) {
    return
  }

  const naluLengthSizeMinusOne = stream.metadata.naluLengthSizeMinusOne ?? NALULengthSizeMinusOne

  let vpss = []
  let spss = []
  let ppss = []

  const bufferReader = new BufferReader(data)
  while (bufferReader.remainingSize() > 0) {
    let length = 0
    if (naluLengthSizeMinusOne === 3) {
      length = bufferReader.readUint32()
    }
    else if (naluLengthSizeMinusOne === 2) {
      length = bufferReader.readUint24()
    }
    else if (naluLengthSizeMinusOne === 1) {
      length = bufferReader.readUint16()
    }
    else {
      length = bufferReader.readUint8()
    }

    const nalu = data.subarray(static_cast<int32>(bufferReader.getPos()), static_cast<int32>(bufferReader.getPos()) + length)
    bufferReader.skip(length)

    const naluType = (nalu[1] >>> 3) & 0x1f

    if (naluType === VVCNaluType.kSPS_NUT) {
      spss.push(nalu)
    }
    else if (naluType === VVCNaluType.kPPS_NUT) {
      ppss.push(nalu)
    }
    else if (naluType === VVCNaluType.kVPS_NUT) {
      vpss.push(nalu)
    }
  }

  if (spss.length || ppss.length || vpss.length) {
    const extradata = vpsSpsPps2Extradata(vpss, spss, ppss)
    const extradataPointer = avMalloc(extradata.length)
    memcpyFromUint8Array(extradataPointer, extradata.length, extradata)
    addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradataPointer, extradata.length)
  }
}

export function parseAnnexbExtraData(avpacket: pointer<AVPacket>, force: boolean = false) {
  if (!(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) && !force) {
    return
  }

  const data = getAVPacketData(avpacket)

  if (!isAnnexb(data)) {
    return
  }

  let nalus = splitNaluByStartCode(data)

  if (nalus.length > 2) {
    const vpss = []
    const spss = []
    const ppss = []

    nalus.forEach((nalu) => {
      const type = (nalu[1] >>> 3) & 0x1f
      if (type === VVCNaluType.kVPS_NUT) {
        vpss.push(nalu)
      }
      else if (type === VVCNaluType.kSPS_NUT) {
        spss.push(nalu)
      }
      else if (type === VVCNaluType.kPPS_NUT) {
        ppss.push(nalu)
      }
    })

    if (vpss.length && spss.length && ppss.length) {
      const extradata = vpsSpsPps2Extradata(vpss, spss, ppss)
      const extradataPointer = avMalloc(extradata.length)
      memcpyFromUint8Array(extradataPointer, extradata.length, extradata)
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradataPointer, extradata.length)
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }
  }
}

export function parseAVCodecParametersBySps(stream: AVStream, sps: Uint8Array) {
  const { profile, level, width, height } = parseSPS(sps)
  stream.codecpar.profile = profile
  stream.codecpar.level = level
  stream.codecpar.width = width
  stream.codecpar.height = height
}

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length >= 6) {

    stream.metadata.naluLengthSizeMinusOne = (extradata[0] >>> 1) & 0x03

    const { spss } = extradata2VpsSpsPps(extradata)

    if (spss.length) {
      parseAVCodecParametersBySps(stream, spss[0])
    }
  }
}

export function isIDR(avpacket: pointer<AVPacket>, naluLengthSize: int32 = 4) {
  if (avpacket.bitFormat === BitFormat.ANNEXB) {
    let nalus = splitNaluByStartCode(mapUint8Array(avpacket.data, avpacket.size))
    return nalus.some((nalu) => {
      const type = (nalu[1] >>> 3) & 0x1f
      return type === VVCNaluType.kIDR_N_LP || type === VVCNaluType.kIDR_W_RADL
    })
  }
  else {
    const size = avpacket.size
    let i = 0
    while (i < (size - naluLengthSize)) {
      const type = (intread.r8(avpacket.data + (i + naluLengthSize + 1)) >>> 3) & 0x1f
      if (type === VVCNaluType.kIDR_N_LP || type === VVCNaluType.kIDR_W_RADL) {
        return true
      }
      if (naluLengthSize === 4) {
        i += intread.rb32(avpacket.data + i)
      }
      else if (naluLengthSize === 3) {
        i += intread.rb24(avpacket.data + i)
      }
      else if (naluLengthSize === 2) {
        i += intread.rb16(avpacket.data + i)
      }
      else {
        i += intread.r8(avpacket.data + i)
      }
      i += naluLengthSize
    }
    return false
  }
}

/* eslint-disable camelcase */
export interface VvcSPS {
  profile: number
  level: number
  width: number
  height: number
  chromaFormatIdc: number
  bitDepthMinus8: number
  generalProfileSpace: number
  tierFlag: number
  generalConstraintInfo: number[]
  generalSubProfileIdc: number[]
  ptlFrameOnlyConstraintFlag: number
  ptlMultilayerEnabledFlag: number
  spsMaxSublayersMinus1: number
  ptlSublayerLevelPresentFlag: number[]
  sublayerLevelIdc: number[]
  sps_log2_max_pic_order_cnt_lsb_minus4: number
  sps_poc_msb_cycle_flag: number
  sps_poc_msb_cycle_len_minus1: number
  sps_num_extra_ph_bytes: number
  sps_extra_ph_bit_present_flag: number[]
}

export function parseSPS(sps: Uint8ArrayInterface): VvcSPS {
  if (!sps || sps.length < 3) {
    return
  }

  let offset = 0
  if (sps[0] === 0x00
    && sps[1] === 0x00
    && sps[2] === 0x00
    && sps[3] === 0x01
  ) {
    offset = 4
  }

  let profile = 0
  let level = 0
  let width = 0
  let height = 0
  let bitDepthMinus8 = 0
  let chromaFormatIdc = 1
  let generalProfileSpace = 0
  let tierFlag = 0
  let ptlFrameOnlyConstraintFlag = 0
  let ptlMultilayerEnabledFlag = 0

  const generalConstraintInfo = []
  const ptlSublayerLevelPresentFlag = []
  const sublayerLevelIdc = []
  const generalSubProfileIdc = []

  const buffer = naluUnescape(sps.subarray(offset))
  const bitReader = new BitReader(buffer.length)
  bitReader.appendBuffer(buffer)

  // forbidden_zero_bit
  bitReader.readU1()
  // nuh_reserved_zero_bit
  bitReader.readU1()
  // layerId
  bitReader.readU(6)
  // nalu type
  bitReader.readU(5)
  // tid
  bitReader.readU(3)

  // sps_seq_parameter_set_id && sps_video_parameter_set_id
  bitReader.readU(8)

  const spsMaxSublayersMinus1 = bitReader.readU(3)
  chromaFormatIdc = bitReader.readU(2)
  const sps_log2_ctu_size_minus5 = bitReader.readU(2)
  const sps_ptl_dpb_hrd_params_present_flag = bitReader.readU(1)
  if (sps_ptl_dpb_hrd_params_present_flag) {
    profile = bitReader.readU(7)
    tierFlag = bitReader.readU(1)
    level = bitReader.readU(8)
    ptlFrameOnlyConstraintFlag = bitReader.readU(1)
    ptlMultilayerEnabledFlag = bitReader.readU(1)
    const gci_present_flag = bitReader.readU(1)
    if (gci_present_flag) {
      for (let j = 0; j < 8; j++) {
        generalConstraintInfo[j] = bitReader.readU(8)
      }
      generalConstraintInfo[8] = bitReader.readU(7)
      const gci_num_reserved_bits = bitReader.readU(8)
      bitReader.readU(gci_num_reserved_bits)
    }
    bitReader.skipPadding()
    for (let i = spsMaxSublayersMinus1 - 1; i >= 0; i--) {
      ptlSublayerLevelPresentFlag[i] = bitReader.readU(1)
    }
    bitReader.skipPadding()
    for (let i = spsMaxSublayersMinus1 - 1; i >= 0; i--) {
      if (ptlSublayerLevelPresentFlag[i]) {
        sublayerLevelIdc[i] = bitReader.readU(8)
      }
    }

    const ptl_num_sub_profiles = bitReader.readU(8)
    if (ptl_num_sub_profiles) {
      for (let i = 0; i < ptl_num_sub_profiles; i++) {
        generalSubProfileIdc[i] = bitReader.readU(32)
      }
    }
  }

  // sps_gdr_enabled_flag
  bitReader.readU1()
  const sps_ref_pic_resampling_enabled_flag = bitReader.readU1()
  if (sps_ref_pic_resampling_enabled_flag) {
    // sps_res_change_in_clvs_allowed_flag
    bitReader.readU1()
  }

  const sps_pic_width_max_in_luma_samples = width = expgolomb.readUE(bitReader)
  const sps_pic_height_max_in_luma_samples = height = expgolomb.readUE(bitReader)

  if (bitReader.readU1()) {
    // sps_conf_win_left_offset
    expgolomb.readUE(bitReader)
    // sps_conf_win_right_offset
    expgolomb.readUE(bitReader)
    // sps_conf_win_top_offset
    expgolomb.readUE(bitReader)
    // sps_conf_win_bottom_offset
    expgolomb.readUE(bitReader)
  }

  if (bitReader.readU1()) {
    const sps_num_subpics_minus1 = expgolomb.readUE(bitReader)
    const ctb_log2_size_y = sps_log2_ctu_size_minus5 + 5
    const ctb_size_y      = 1 << ctb_log2_size_y
    const tmp_width_val   = sps_pic_width_max_in_luma_samples / (1 << ctb_log2_size_y)
    const tmp_height_val  = sps_pic_height_max_in_luma_samples / (1 << ctb_log2_size_y)
    const wlen            = Math.ceil(Math.log2(tmp_width_val))
    const hlen            = Math.ceil(Math.log2(tmp_height_val))

    let sps_subpic_id_len = 0
    let sps_subpic_same_size_flag = 0
    let sps_independent_subpics_flag = 0
    // sps_num_subpics_minus1
    if (sps_num_subpics_minus1 > 0) {
      sps_independent_subpics_flag = bitReader.readU1()
      sps_subpic_same_size_flag = bitReader.readU1()
    }
    for (let i = 0; sps_num_subpics_minus1 > 0 && i <= sps_num_subpics_minus1; i++) {
      if (!sps_subpic_same_size_flag || i == 0) {
        if (i > 0 && sps_pic_width_max_in_luma_samples > ctb_size_y) {
          bitReader.readU(wlen)
        }
        if (i > 0 && sps_pic_height_max_in_luma_samples > ctb_size_y) {
          bitReader.readU(hlen)
        }
        if (i < sps_num_subpics_minus1 && sps_pic_width_max_in_luma_samples > ctb_size_y) {
          bitReader.readU(wlen)
        }
        if (i < sps_num_subpics_minus1 && sps_pic_height_max_in_luma_samples > ctb_size_y) {
          bitReader.readU(hlen)
        }
      }
      if (!sps_independent_subpics_flag) {
        // sps_subpic_treated_as_pic_flag && sps_loop_filter_across_subpic_enabled_flag
        bitReader.readU(2)
      }
    }
    sps_subpic_id_len = expgolomb.readUE(bitReader) + 1
    // sps_subpic_id_mapping_explicitly_signalled_flag
    if (bitReader.readU(1)) {
      // sps_subpic_id_mapping_present_flag
      if (bitReader.readU(1)) {
        for (let i = 0; i <= sps_num_subpics_minus1; i++) {
          // sps_subpic_id[i]
          bitReader.readU(sps_subpic_id_len)
        }
      }
    }
  }

  bitDepthMinus8 = expgolomb.readUE(bitReader)

  // sps_entropy_coding_sync_enabled_flag
  bitReader.readU(1)
  // sps_entry_point_offsets_present_flag
  bitReader.readU(1)

  const sps_log2_max_pic_order_cnt_lsb_minus4 = bitReader.readU(4)
  const sps_poc_msb_cycle_flag = bitReader.readU(1)
  let sps_poc_msb_cycle_len_minus1 = 0
  if (sps_poc_msb_cycle_flag) {
    sps_poc_msb_cycle_len_minus1 = expgolomb.readUE(bitReader)
  }
  const sps_extra_ph_bit_present_flag: number[] = []
  const sps_num_extra_ph_bytes = bitReader.readU(2)
  for (let i = 0; i < (sps_num_extra_ph_bytes * 8); i++) {
    sps_extra_ph_bit_present_flag[i] = bitReader.readU(1)
  }

  return {
    profile,
    level,
    width,
    height,
    chromaFormatIdc,
    bitDepthMinus8,
    generalProfileSpace,
    tierFlag,
    generalConstraintInfo,
    generalSubProfileIdc,
    ptlFrameOnlyConstraintFlag,
    ptlMultilayerEnabledFlag,
    spsMaxSublayersMinus1,
    ptlSublayerLevelPresentFlag,
    sublayerLevelIdc,
    sps_log2_max_pic_order_cnt_lsb_minus4,
    sps_poc_msb_cycle_flag,
    sps_poc_msb_cycle_len_minus1,
    sps_num_extra_ph_bytes,
    sps_extra_ph_bit_present_flag
  }
}

export function parseExtraData(extradata: Uint8ArrayInterface) {

  if (extradata[0] === 0 && extradata[1] === 0 && extradata[2] === 0 && extradata[3] === 1) {
    extradata = annexbExtradata2AvccExtradata(extradata)
  }

  const bitReader = new BitReader()
  bitReader.appendBuffer(extradata)
  const ptlPresentFlag = bitReader.readU(8) & 0x01
  if (ptlPresentFlag) {
    return parsePTL(bitReader)
  }
  return {} as Data
}
