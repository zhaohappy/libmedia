/*
 * libmedia hevc util
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
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import BufferWriter from 'common/io/BufferWriter'
import BufferReader from 'common/io/BufferReader'
import { AVPacketSideDataType } from 'avutil/codec'
import BitReader from 'common/io/BitReader'
import AVStream from '../AVStream'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { naluUnescape, splitNaluByStartCode, isAnnexb } from 'avutil/util/nalu'
import { addAVPacketSideData, getAVPacketData } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as expgolomb from 'avutil/util/expgolomb'
import { Uint8ArrayInterface } from 'common/io/interface'

const NALULengthSizeMinusOne = 3

export const enum HEVCNaluType {
  kSliceTRAIL_N = 0,
  kSliceTRAIL_R = 1,
  kSliceTSA_N = 2,
  kSliceTSA_R = 3,
  kSliceSTSA_N = 4,
  kSliceSTSA_R = 5,
  kSliceRADL_N = 6,
  kSliceRADL_R = 7,
  kSliceRASL_N = 8,
  kSliceRASL_R = 9,
  kSliceBLA_W_LP = 16,
  kSliceBLA_W_RADL = 17,
  kSliceBLA_N_LP = 18,
  kSliceIDR_W_RADL = 19,
  kSliceIDR_N_LP = 20,
  kSliceCRA_NUT = 21,
  kSliceVPS = 32,
  kSliceSPS = 33,
  kSlicePPS = 34,
  kSliceAUD = 35,
  kSliceEOS_NUT = 36,
  kSliceEOB_NUT = 37,
  kSliceFD_NUT = 38,
  kSliceSEI_PREFIX = 39,
  kSliceSEI_SUFFIX = 40
}

/**
 * 
 * hvcc 格式的 extradata 转 annexb vps sps pps
 * 
 * bits    
 * - 8   configurationVersion( 固定   1)
 * - 2   general_profile_space
 * - 1   general_tier_flag
 * - 5   general_profile_idc
 * - 32  general_profile_compatibility_flags
 * - 48  general_constraint_indicator_flags (6 个 字节）
 * - 8   general_level_idc
 * - 4   reserved1 (1111)
 * - 4   min_spatial_segmentation_idc_L
 * - 8   min_spatial_segmentation_idc_H
 * - 6   reserved2 (111111)
 * - 2   parallelismType
 * - 6   reserved3 (111111)
 * - 2   chromaFormat
 * - 5   reserved4 (11111)
 * - 3   bitDepthLumaMinus8
 * - 5   reserved5(11111)
 * - 3   bitDepthChromaMinus8
 * - 16  avgFrameRate
 * - 2   constantFrameRate
 * - 3   numTemporalLayers
 * - 1   temporalIdNested
 * - 2   lengthSizeMinusOne
 * - 8   numOfArrays
 * - repeated of array (vps/sps/pps)
 * - 1   array_completeness
 * - 1   reserved (0)
 * - 6   NAL_unit_type
 * - 16  numNalus
 * - repeated once per NAL
 * - 16  nalUnitLength
 * - N   NALU data
 * 
 */
export function extradata2VpsSpsPps(extradata: Uint8ArrayInterface) {
  const bufferReader = new BufferReader(extradata, true)
  bufferReader.skip(22)

  let vpss = []
  let spss = []
  let ppss = []

  const arrayLen = bufferReader.readUint8()

  for (let i = 0; i < arrayLen; i++) {
    const naluType = bufferReader.readUint8() & 0x3f
    const count = bufferReader.readUint16()
    const list = []

    for (let j = 0; j < count; j++) {
      const len = bufferReader.readUint16()
      list.push(bufferReader.readBuffer(len))
    }

    if (naluType === HEVCNaluType.kSliceVPS) {
      vpss = list
    }
    else if (naluType === HEVCNaluType.kSliceSPS) {
      spss = list
    }
    else if (naluType === HEVCNaluType.kSlicePPS) {
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

  let length = 23


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
  const spsData = parserSPS(sps)

  bufferWriter.writeUint8(0x01)
  bufferWriter.writeUint8(sps[1])
  bufferWriter.writeUint8(sps[2])
  bufferWriter.writeUint8(sps[3])
  bufferWriter.writeUint8(sps[4])
  bufferWriter.writeUint8(sps[5])

  // general_constraint_indicator_flags
  bufferWriter.writeUint8(sps[6])
  bufferWriter.writeUint8(sps[7])
  bufferWriter.writeUint8(sps[8])
  bufferWriter.writeUint8(sps[9])
  bufferWriter.writeUint8(sps[10])
  bufferWriter.writeUint8(sps[11])

  bufferWriter.writeUint8(spsData.level)

  // min_spatial_segmentation_idc
  bufferWriter.writeUint8((0xff << 2) | 0)
  bufferWriter.writeUint8(0)

  // parallelismType
  bufferWriter.writeUint8((0xff << 6) | 0)

  // chromaFormat
  bufferWriter.writeUint8((0xff << 6) | spsData.chromaFormatIdc)

  // bitDepthLumaMinus8
  bufferWriter.writeUint8((0xff << 5) | spsData.bitDepthLumaMinus8)

  // bitDepthChromaMinus8
  bufferWriter.writeUint8((0xff << 5) | spsData.bitDepthChromaMinus8)

  // avgFrameRate
  bufferWriter.writeUint16(0)

  // constantFrameRate numTemporalLayers temporalIdNested lengthSizeMinusOne
  bufferWriter.writeUint8((0 << 6) | (1 << 3) | ((sps[0] & 0x01) << 2) | NALULengthSizeMinusOne)

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
    bufferWriter.writeUint8((1 << 7) | HEVCNaluType.kSliceVPS)
    bufferWriter.writeUint16(vpss.length)
    array.each(vpss, (vps) => {
      bufferWriter.writeUint16(vps.length)
      bufferWriter.writeBuffer(vps)
    })
  }

  // sps
  if (spss.length) {
    bufferWriter.writeUint8((1 << 7) | HEVCNaluType.kSliceSPS)
    bufferWriter.writeUint16(spss.length)
    array.each(spss, (sps) => {
      bufferWriter.writeUint16(sps.length)
      bufferWriter.writeBuffer(sps)
    })
  }

  // pps
  if (ppss.length) {
    bufferWriter.writeUint8((1 << 7) | HEVCNaluType.kSlicePPS)
    bufferWriter.writeUint16(ppss.length)
    array.each(ppss, (pps) => {
      bufferWriter.writeUint16(pps.length)
      bufferWriter.writeBuffer(pps)
    })
  }

  return buffer
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

  if (nalus.length > 2) {
    const vpss = []
    const spss = []
    const ppss = []

    nalus.forEach((nalu) => {
      const type = (nalu[0] >>> 1) & 0x3f
      if (type === HEVCNaluType.kSliceVPS) {
        vpss.push(nalu)
      }
      else if (type === HEVCNaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === HEVCNaluType.kSlicePPS) {
        ppss.push(nalu)
      }
    })

    if (vpss.length && spss.length && ppss.length) {
      extradata = vpsSpsPps2Extradata(vpss, spss, ppss)

      nalus = nalus.filter((nalu) => {
        const type = (nalu[0] >>> 1) & 0x3f
        return type !== HEVCNaluType.kSliceVPS
          && type !== HEVCNaluType.kSliceSPS
          && type !== HEVCNaluType.kSlicePPS
          && type !== HEVCNaluType.kSliceAUD
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

    const type = (nalu[0] >>> 1) & 0x3f
    if (type === HEVCNaluType.kSliceIDR_W_RADL
      || type === HEVCNaluType.kSliceIDR_N_LP
      || type === HEVCNaluType.kSliceCRA_NUT
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
  const naluLengthSizeMinusOne = extradata ? (extradata[21] & 0x03) : NALULengthSizeMinusOne

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
  bufferWriter.writeUint8(HEVCNaluType.kSliceAUD << 1)
  bufferWriter.writeUint8(0x00)
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

    const type = (nalu[0] >>> 1) & 0x3f
    if (type === HEVCNaluType.kSliceIDR_W_RADL
      || type === HEVCNaluType.kSliceIDR_N_LP
      || type === HEVCNaluType.kSliceCRA_NUT
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

    const naluType = (nalu[0] >>> 1) & 0x3f

    if (naluType === HEVCNaluType.kSliceSPS) {
      spss.push(nalu)
    }
    else if (naluType === HEVCNaluType.kSlicePPS) {
      ppss.push(nalu)
    }
    else if (naluType === HEVCNaluType.kSliceVPS) {
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
      const type = (nalu[0] >>> 1) & 0x3f
      if (type === HEVCNaluType.kSliceVPS) {
        vpss.push(nalu)
      }
      else if (type === HEVCNaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === HEVCNaluType.kSlicePPS) {
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

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length >= 6) {

    stream.metadata.naluLengthSizeMinusOne = (extradata[21] & 0x03)

    const { spss } = extradata2VpsSpsPps(extradata)

    if (spss.length) {
      const { profile, level, width, height } = parserSPS(spss[0])

      stream.codecpar.profile = profile
      stream.codecpar.level = level
      stream.codecpar.width = width
      stream.codecpar.height = height
    }
  }
}

export function parserSPS(sps: Uint8ArrayInterface) {

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
  let bitDepthLumaMinus8 = 0
  let bitDepthChromaMinus8 = 0
  let chromaFormatIdc = 1
  let generalProfileSpace = 0
  let generalTierFlag = 0
  let generalProfileCompatibilityFlag = 0
  let constraintFlags = 0

  const buffer = naluUnescape(sps.subarray(offset))
  const bitReader = new BitReader(buffer.length)
  bitReader.appendBuffer(buffer)

  // forbidden_zero_bit
  bitReader.readU1()

  // nalu type
  bitReader.readU(6)

  // layerId
  bitReader.readU(6)

  // tid
  bitReader.readU(3)

  // sps_video_parameter_set_id
  bitReader.readU(4)

  // The value of sps_max_sub_layers_minus1 shall be in the range of 0 to 6, inclusive.
  const spsMaxSubLayersMinus1 = bitReader.readU(3)

  // sps_temporal_id_nesting_flag
  bitReader.readU1()

  if (spsMaxSubLayersMinus1 <= 6) {
    // profile_tier_level(sps_max_sub_layers_minus1)

    // general_profile_space
    generalProfileSpace = bitReader.readU(2)
    // general_tier_flag
    generalTierFlag = bitReader.readU1()
    // general_profile_idc
    profile = bitReader.readU(5)
    // general_profile_compatibility_flag[32]
    generalProfileCompatibilityFlag = bitReader.readU(32)

    /**
     * 1 general_progressive_source_flag
     * 1 general_interlaced_source_flag
     * 1 general_non_packed_constraint_flag
     * 1 general_frame_only_constraint_flag
     * 44 general_reserved_zero_44bits
     */
    constraintFlags = bitReader.readU(48)

    // general_level_idc
    level = bitReader.readU(8)

    const subLayerProfilePresentFlag = new Array(6)
    const subLayerLevelPresentFlag = new Array(6)
    for (let i = 0; i < spsMaxSubLayersMinus1; i++) {
      subLayerProfilePresentFlag[i] = bitReader.readU1()
      subLayerLevelPresentFlag[i] = bitReader.readU1()
    }

    if (spsMaxSubLayersMinus1 > 0) {
      for (let i = spsMaxSubLayersMinus1; i < 8; i++) {
        // reserved_zero_2bits
        bitReader.readU(2)
      }
    }

    for (let i = 0; i < spsMaxSubLayersMinus1; i++) {
      if (subLayerProfilePresentFlag[i]) {
        // sub_layer_profile_space[i]
        bitReader.readU(2)
        // sub_layer_tier_flag[i]
        bitReader.readU(1)
        // sub_layer_profile_idc[i]
        bitReader.readU(5)
        // sub_layer_profile_compatibility_flag[i][32]
        bitReader.readU(32)
        // sub_layer_progressive_source_flag[i]
        bitReader.readU(1)
        // sub_layer_interlaced_source_flag[i]
        bitReader.readU(1)
        // sub_layer_non_packed_constraint_flag[i]
        bitReader.readU(1)
        // sub_layer_frame_only_constraint_flag[i]
        bitReader.readU(1)
        // sub_layer_reserved_zero_44bits[i]
        bitReader.readU(44)
      }

      if (subLayerLevelPresentFlag[i]) {
        // sub_layer_level_idc[i]
        bitReader.readU(8)
      }
    }

    // "The  value  of sps_seq_parameter_set_id shall be in the range of 0 to 15, inclusive."
    expgolomb.readUE(bitReader)
    chromaFormatIdc = expgolomb.readUE(bitReader)

    if (chromaFormatIdc === 3) {
      // separate_colour_plane_flag
      bitReader.readU(1)
    }

    width = expgolomb.readUE(bitReader)
    height = expgolomb.readUE(bitReader)

    const conformanceWindowFlag = bitReader.readU1()

    let confWinLeftOffset = 0
    let confWinRightOffset = 0
    let confWinTopOffset = 0
    let confWinBottomOffset = 0

    if (conformanceWindowFlag) {
      confWinLeftOffset = expgolomb.readUE(bitReader)
      confWinRightOffset = expgolomb.readUE(bitReader)
      confWinTopOffset = expgolomb.readUE(bitReader)
      confWinBottomOffset = expgolomb.readUE(bitReader)
    }

    bitDepthLumaMinus8 = expgolomb.readUE(bitReader)
    bitDepthChromaMinus8 = expgolomb.readUE(bitReader)


    let SubWidthC = 2
    let SubHeightC = 2

    if (chromaFormatIdc === 0) {
      SubWidthC = SubHeightC = 0
    }
    else if (chromaFormatIdc === 2) {
      SubWidthC = 2
      SubHeightC = 1
    }
    else if (chromaFormatIdc === 3) {
      SubWidthC = SubHeightC = 1
    }

    const cropUnitX = SubWidthC * (1 << (bitDepthLumaMinus8 + 1))
    const cropUnitY = SubHeightC * (1 << (bitDepthLumaMinus8 + 1))

    width -= cropUnitX * (confWinLeftOffset + confWinRightOffset)
    height -= cropUnitY * (confWinTopOffset + confWinBottomOffset)
  }


  return {
    profile,
    level,
    width,
    height,
    chromaFormatIdc,
    bitDepthLumaMinus8,
    bitDepthChromaMinus8,
    generalProfileSpace,
    generalTierFlag,
    generalProfileCompatibilityFlag,
    constraintFlags
  }
}
