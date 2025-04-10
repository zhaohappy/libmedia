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
import AVPacket from '../struct/avpacket'
import BufferWriter from 'common/io/BufferWriter'
import BufferReader from 'common/io/BufferReader'
import { AVPacketSideDataType } from '../codec'
import BitReader from 'common/io/BitReader'
import AVStream from '../AVStream'
import { mapUint8Array } from 'cheap/std/memory'
import * as naluUtil from '../util/nalu'
import { avMalloc } from '../util/mem'
import * as expgolomb from '../util/expgolomb'
import { Uint8ArrayInterface } from 'common/io/interface'
import { BitFormat } from './h264'
import * as intread from '../util/intread'
import * as intwrite from '../util/intwrite'
import { AVPixelFormat } from '../pixfmt'

export const HEVC_MAX_DPB_FRAMES = 16

export const enum HEVCProfile {
  Main = 1,
  Main10,
  MainStillPicture,
  Main444
}

export const HEVCProfile2Name: Record<HEVCProfile, string> = {
  [HEVCProfile.Main]: 'Main',
  [HEVCProfile.Main10]: 'Main10',
  [HEVCProfile.MainStillPicture]: 'MainStillPicture',
  [HEVCProfile.Main444]: 'Main444'
}

export const LevelCapabilities = [
  { level: 10, maxLumaSamplesPerSecond: 552960, maxLumaPictureSize: 36864, maxBitRate: { main: 128, main10: 150 } },
  { level: 20, maxLumaSamplesPerSecond: 3686400, maxLumaPictureSize: 122880, maxBitRate: { main: 1500, main10: 1875 } },
  { level: 21, maxLumaSamplesPerSecond: 7372800, maxLumaPictureSize: 245760, maxBitRate: { main: 3000, main10: 3750 } },
  { level: 30, maxLumaSamplesPerSecond: 16588800, maxLumaPictureSize: 552960, maxBitRate: { main: 6000, main10: 7500 } },
  { level: 31, maxLumaSamplesPerSecond: 33177600, maxLumaPictureSize: 983040, maxBitRate: { main: 10000, main10: 12500 } },
  { level: 40, maxLumaSamplesPerSecond: 66846720, maxLumaPictureSize: 2228224, maxBitRate: { main: 12000, main10: 15000 } },
  { level: 41, maxLumaSamplesPerSecond: 133693440, maxLumaPictureSize: 2228224, maxBitRate: { main: 20000, main10: 25000 } },
  { level: 50, maxLumaSamplesPerSecond: 267386880, maxLumaPictureSize: 8912896, maxBitRate: { main: 25000, main10: 40000 } },
  { level: 51, maxLumaSamplesPerSecond: 534773760, maxLumaPictureSize: 8912896, maxBitRate: { main: 40000, main10: 60000 } },
  { level: 52, maxLumaSamplesPerSecond: 1069547520, maxLumaPictureSize: 35651584, maxBitRate: { main: 60000, main10: 100000 } },
  { level: 60, maxLumaSamplesPerSecond: 1069547520, maxLumaPictureSize: 35651584, maxBitRate: { main: 60000, main10: 100000 } },
  { level: 61, maxLumaSamplesPerSecond: 2139095040, maxLumaPictureSize: 89128960, maxBitRate: { main: 120000, main10: 240000 } },
  { level: 62, maxLumaSamplesPerSecond: 4278190080, maxLumaPictureSize: 356515840, maxBitRate: { main: 240000, main10: 480000 } }
]

export function getLevelByResolution(profile: number, width: number, height: number, fps: number, bitrate: number) {

  bitrate /= 1000

  const selectedProfile = profile === HEVCProfile.Main ? 'main' : 'main10'
  const lumaSamplesPerSecond = width * height * fps
  for (const level of LevelCapabilities) {
    if (lumaSamplesPerSecond <= level.maxLumaSamplesPerSecond && width * height <= level.maxLumaPictureSize && bitrate <= level.maxBitRate[selectedProfile]) {
      return level.level
    }
  }
}

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


export const enum HEVCSliceType {
  kSliceNone = -1,
  kSliceB = 0,
  kSliceP = 1,
  kSliceI = 2
}

/**
 * 
 * avcc 格式的 extradata 转 annexb vps sps pps
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

  let vpss: Uint8ArrayInterface[] = []
  let spss: Uint8ArrayInterface[] = []
  let ppss: Uint8ArrayInterface[] = []

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

/**
 * annexb vps sps pps 转 avcc 格式的 extradata
 * 
 * @param vpss 
 * @param spss 
 * @param ppss 
 * @returns 
 */
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
  const spsData = parseSPS(sps)

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
  bufferWriter.writeUint8((0xff << 6) | spsData.chroma_format_idc)

  // bitDepthLumaMinus8
  bufferWriter.writeUint8((0xff << 5) | spsData.bit_depth_luma_minus8)

  // bitDepthChromaMinus8
  bufferWriter.writeUint8((0xff << 5) | spsData.bit_depth_chroma_minus8)

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
 * annexb extradata 转 avcc extradata
 * 
 * @param data 
 * @returns 
 */
export function annexbExtradata2AvccExtradata(data: Uint8ArrayInterface) {
  let nalus = naluUtil.splitNaluByStartCode(data)

  if (nalus.length >= 2) {
    const vpss: Uint8ArrayInterface[] = []
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []

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

    if (spss.length && ppss.length) {
      return vpsSpsPps2Extradata(vpss, spss, ppss)
    }
  }
}

/**
 * 从 annexb 码流里面生成 annexb extradata
 * 
 * 提取出 vps、 sps 和 pps
 * 
 * @param data 
 * @returns 
 */
export function generateAnnexbExtradata(data: Uint8ArrayInterface) {
  let nalus = naluUtil.splitNaluByStartCode(data)

  if (nalus.length >= 2) {
    const vpss: Uint8ArrayInterface[] = []
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []

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

    if (spss.length && ppss.length) {
      const nalus = [spss[0], ppss[0]]
      if (vpss.length) {
        nalus.unshift(vpss[0])
      }
      return naluUtil.joinNaluByStartCode(nalus, 0)
    }
  }
}

/**
 * 
 * annexb 格式的 NALU 转 avcc NALU 
 * 
 * 需要保证 data 是 safe 的
 * 
 */
export function annexb2Avcc(data: Uint8ArrayInterface) {

  let extradata: Uint8Array
  let key: boolean = false

  let nalus = naluUtil.splitNaluByStartCode(data)

  if (nalus.length) {
    const vpss: Uint8ArrayInterface[] = []
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []

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
      if (type === HEVCNaluType.kSliceIDR_W_RADL
        || type === HEVCNaluType.kSliceIDR_N_LP
        || type === HEVCNaluType.kSliceCRA_NUT
      ) {
        key = true
      }
    })
    if (spss.length && ppss.length) {
      extradata = vpsSpsPps2Extradata(vpss, spss, ppss)
      nalus = nalus.filter((nalu) => {
        const type = (nalu[0] >>> 1) & 0x3f
        return type !== HEVCNaluType.kSliceVPS
          && type !== HEVCNaluType.kSliceSPS
          && type !== HEVCNaluType.kSlicePPS
          && type !== HEVCNaluType.kSliceAUD
      })
    }
    else {
      nalus = nalus.filter((nalu) => {
        const type = (nalu[0] >>> 1) & 0x3f
        return type !== HEVCNaluType.kSliceAUD
      })
    }
  }

  const length = nalus.reduce((prev, nalu) => {
    return prev + NALULengthSizeMinusOne + 1 + nalu.length
  }, 0)

  const bufferPointer: pointer<uint8> = avMalloc(length)
  const buffer = mapUint8Array(bufferPointer, length)

  naluUtil.joinNaluByLength(nalus, NALULengthSizeMinusOne, buffer)

  return {
    bufferPointer,
    length,
    extradata,
    key
  }
}

/**
 * 
 * 需要保证 data 是 safe 的
 * 
 * @param vpss 
 * @param spss 
 * @param ppss 
 * @param nalus 
 * @returns 
 */
export function nalus2Annexb(
  vpss: Uint8ArrayInterface[],
  spss: Uint8ArrayInterface[],
  ppss: Uint8ArrayInterface[],
  nalus: Uint8ArrayInterface[]
) {
  const lengths = [
    naluUtil.joinNaluByStartCodeLength(vpss, 0),
    naluUtil.joinNaluByStartCodeLength(spss, 0),
    naluUtil.joinNaluByStartCodeLength(ppss, 0),
    naluUtil.joinNaluByStartCodeLength(nalus, 2)
  ]

  let length = lengths.reduce((prev, length) => {
    return prev + length
  }, 0)

  const bufferPointer: pointer<uint8> = avMalloc(length + 7)
  let offset = bufferPointer

  // AUD
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 1)
  intwrite.w8(offset++, HEVCNaluType.kSliceAUD << 1)
  intwrite.w8(offset++, 0x01)
  intwrite.w8(offset++, 0x50)

  if (vpss.length) {
    naluUtil.joinNaluByStartCode(vpss, 0, mapUint8Array(offset, lengths[0]))
    offset = reinterpret_cast<pointer<uint8>>(offset + lengths[0])
  }
  if (spss.length) {
    naluUtil.joinNaluByStartCode(spss, 0, mapUint8Array(offset, lengths[1]))
    offset = reinterpret_cast<pointer<uint8>>(offset + lengths[1])
  }
  if (ppss.length) {
    naluUtil.joinNaluByStartCode(ppss, 0, mapUint8Array(offset, lengths[2]))
    offset = reinterpret_cast<pointer<uint8>>(offset + lengths[2])
  }
  if (nalus.length) {
    naluUtil.joinNaluByStartCode(nalus, 2, mapUint8Array(offset, lengths[3]))
  }

  return {
    bufferPointer,
    length: length + 7,
  }
}

/**
 * annexb 添加 sps pps
 * 
 * @param data 
 * @param extradata 
 */
export function annexbAddExtradata(data: Uint8ArrayInterface, extradata: Uint8ArrayInterface) {
  let nalus = naluUtil.splitNaluByStartCode(data).concat(naluUtil.splitNaluByStartCode(extradata))
  if (nalus.length) {
    let vpss: Uint8ArrayInterface[] = []
    let spss: Uint8ArrayInterface[] = []
    let ppss: Uint8ArrayInterface[] = []
    let others: Uint8ArrayInterface[] = []

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
      else if (type !== HEVCNaluType.kSliceAUD) {
        others.push(nalu)
      }
    })
    return nalus2Annexb(vpss, spss, ppss, others)
  }
}

/**
 * avcc 格式的 NALU 转 annexb NALU 
 * 
 * 需要保证 data 是 safe 的
 * 
 */
export function avcc2Annexb(data: Uint8ArrayInterface, extradata?: Uint8ArrayInterface) {
  const naluLengthSizeMinusOne = extradata ? (extradata[21] & 0x03) : NALULengthSizeMinusOne

  let vpss: Uint8ArrayInterface[] = []
  let spss: Uint8ArrayInterface[] = []
  let ppss: Uint8ArrayInterface[] = []
  let key = false

  if (extradata) {
    const result = extradata2VpsSpsPps(extradata)
    vpss = result.vpss
    spss = result.spss
    ppss = result.ppss
    key = true
  }

  const nalus = naluUtil.splitNaluByLength(data, naluLengthSizeMinusOne).filter((nalu) => {
    const type = (nalu[0] >>> 1) & 0x3f
    return type !== HEVCNaluType.kSliceAUD
  })

  return {
    ...nalus2Annexb(vpss, spss, ppss, nalus),
    key
  }
}

/* eslint-disable camelcase */

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  let sps: Uint8ArrayInterface
  if (extradata && naluUtil.isAnnexb(extradata)) {
    array.each(naluUtil.splitNaluByStartCode(extradata), (nalu) => {
      const type = (nalu[0] >>> 1) & 0x3f
      if (type === HEVCNaluType.kSliceSPS) {
        sps = nalu
        return false
      }
    })
  }
  else if (extradata && extradata.length >= 6) {
    stream.metadata.naluLengthSizeMinusOne = (extradata[21] & 0x03)
    const { spss } = extradata2VpsSpsPps(extradata)
    if (spss.length) {
      sps = spss[0]
    }
  }
  if (sps) {
    const { profile, level, width, height, video_delay, chroma_format_idc, bit_depth_luma_minus8 } = parseSPS(sps)
    stream.codecpar.profile = profile
    stream.codecpar.level = level
    stream.codecpar.width = width
    stream.codecpar.height = height
    stream.codecpar.videoDelay = video_delay

    switch (bit_depth_luma_minus8) {
      case 0:
        if (chroma_format_idc === 3) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV444P
        }
        else if (chroma_format_idc === 2) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV422P
        }
        else {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV420P
        }
        break
      case 2:
        if (chroma_format_idc === 3) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV444P10LE
        }
        else if (chroma_format_idc === 2) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV422P10LE
        }
        else {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV420P10LE
        }
        break
    }
  }
}

export function isIDR(avpacket: pointer<AVPacket>, naluLengthSize: int32 = 4) {
  if (avpacket.bitFormat === BitFormat.ANNEXB) {
    let nalus = naluUtil.splitNaluByStartCode(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)))
    return nalus.some((nalu) => {
      const type = (nalu[0] >>> 1) & 0x3f
      return type === HEVCNaluType.kSliceIDR_N_LP || type === HEVCNaluType.kSliceIDR_W_RADL
    })
  }
  else {
    const size = avpacket.size
    let i = 0
    while (i < (size - naluLengthSize)) {
      const type = (intread.r8(avpacket.data + (i + naluLengthSize)) >>> 1) & 0x3f
      if (type === HEVCNaluType.kSliceIDR_N_LP || type === HEVCNaluType.kSliceIDR_W_RADL) {
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
export interface HevcSPS {
  profile: number
  level: number
  width: number
  height: number
  chroma_format_idc: number
  bit_depth_luma_minus8: number
  bit_depth_chroma_minus8: number
  general_profile_space: number
  general_tier_flag: number
  general_profile_compatibility_flags: number
  constraint_flags: number
  separate_colour_plane_flag: number
  log2_min_cb_size: number
  log2_diff_max_min_coding_block_size: number
  log2_min_tb_size: number
  log2_diff_max_min_transform_block_size: number
  log2_max_trafo_size: number
  log2_ctb_size: number
  log2_min_pu_size: number
  ctb_width: number
  ctb_height: number
  ctb_size: number
  min_cb_width: number
  min_cb_height: number
  min_tb_width: number
  min_tb_height: number
  min_pu_width: number
  min_pu_height: number
  log2_max_poc_lsb: number
  video_delay: number
}

export function parseSPS(sps: Uint8ArrayInterface): HevcSPS {

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
  let bit_depth_luma_minus8 = 0
  let bit_depth_chroma_minus8 = 0
  let chroma_format_idc = 1
  let general_profile_space = 0
  let general_tier_flag = 0
  let general_profile_compatibility_flags = 0
  let constraint_flags = 0

  const buffer = naluUtil.naluUnescape(sps.subarray(offset))
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

  let separate_colour_plane_flag = 0

  if (spsMaxSubLayersMinus1 <= 6) {
    // profile_tier_level(sps_max_sub_layers_minus1)

    // general_profile_space
    general_profile_space = bitReader.readU(2)
    // general_tier_flag
    general_tier_flag = bitReader.readU1()
    // general_profile_idc
    profile = bitReader.readU(5)
    // general_profile_compatibility_flag[32]
    general_profile_compatibility_flags = bitReader.readU(32)

    /**
     * 1 general_progressive_source_flag
     * 1 general_interlaced_source_flag
     * 1 general_non_packed_constraint_flag
     * 1 general_frame_only_constraint_flag
     * 44 general_reserved_zero_44bits
     */
    constraint_flags = bitReader.readU(48)

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
    chroma_format_idc = expgolomb.readUE(bitReader)

    if (chroma_format_idc === 3) {
      // separate_colour_plane_flag
      separate_colour_plane_flag = bitReader.readU(1)
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

    bit_depth_luma_minus8 = expgolomb.readUE(bitReader)
    bit_depth_chroma_minus8 = expgolomb.readUE(bitReader)


    let SubWidthC = 2
    let SubHeightC = 2

    if (chroma_format_idc === 0) {
      SubWidthC = SubHeightC = 0
    }
    else if (chroma_format_idc === 2) {
      SubWidthC = 2
      SubHeightC = 1
    }
    else if (chroma_format_idc === 3) {
      SubWidthC = SubHeightC = 1
    }

    const cropUnitX = SubWidthC * (1 << (bit_depth_luma_minus8 + 1))
    const cropUnitY = SubHeightC * (1 << (bit_depth_luma_minus8 + 1))

    width -= cropUnitX * (confWinLeftOffset + confWinRightOffset)
    height -= cropUnitY * (confWinTopOffset + confWinBottomOffset)
  }

  const log2_max_poc_lsb = expgolomb.readUE(bitReader) + 4

  const sublayer_ordering_info_flag = bitReader.readU1()
  const start = sublayer_ordering_info_flag ? 0 : spsMaxSubLayersMinus1
  let video_delay = 0
  for (let i = start; i < (spsMaxSubLayersMinus1 + 1); i++) {
    // max_dec_pic_buffering
    expgolomb.readUE(bitReader)
    // num_reorder_pics
    video_delay = Math.max(video_delay, Math.min(expgolomb.readUE(bitReader), HEVC_MAX_DPB_FRAMES))
    // max_latency_increase
    expgolomb.readUE(bitReader)
  }

  const log2_min_cb_size = expgolomb.readUE(bitReader) + 3
  const log2_diff_max_min_coding_block_size = expgolomb.readUE(bitReader)
  const log2_min_tb_size = expgolomb.readUE(bitReader) + 2
  const log2_diff_max_min_transform_block_size = expgolomb.readUE(bitReader)
  const log2_max_trafo_size = log2_diff_max_min_transform_block_size + log2_min_tb_size

  const log2_ctb_size = log2_min_cb_size + log2_diff_max_min_coding_block_size
  const log2_min_pu_size = log2_min_cb_size - 1

  const ctb_width  = (width  + (1 << log2_ctb_size) - 1) >> log2_ctb_size
  const ctb_height = (height + (1 << log2_ctb_size) - 1) >> log2_ctb_size
  const ctb_size   = ctb_width * ctb_height

  const min_cb_width  = width  >> log2_min_cb_size
  const min_cb_height = height >> log2_min_cb_size
  const min_tb_width  = width  >> log2_min_tb_size
  const min_tb_height = height >> log2_min_tb_size
  const min_pu_width  = width  >> log2_min_pu_size
  const min_pu_height = height >> log2_min_pu_size

  return {
    profile,
    level,
    width,
    height,
    chroma_format_idc,
    bit_depth_luma_minus8,
    bit_depth_chroma_minus8,
    general_profile_space,
    general_tier_flag,
    general_profile_compatibility_flags,
    constraint_flags,
    separate_colour_plane_flag,
    log2_min_cb_size,
    log2_diff_max_min_coding_block_size,
    log2_min_tb_size,
    log2_diff_max_min_transform_block_size,
    log2_max_trafo_size,
    log2_ctb_size,
    log2_min_pu_size,
    ctb_width,
    ctb_height,
    ctb_size,
    min_cb_width,
    min_cb_height,
    min_tb_width,
    min_tb_height,
    min_pu_width,
    min_pu_height,
    log2_max_poc_lsb,
    video_delay
  }
}

export interface HevcPPS {
  pps_pic_parameter_set_id: number
  pps_seq_parameter_set_id: number
  dependent_slice_segment_flag: number
  output_flag_present_flag: number
  num_extra_slice_header_bits: number
}

export function parsePPS(pps: Uint8ArrayInterface): HevcPPS {
  if (!pps || pps.length < 3) {
    return
  }

  let offset = 0
  if (pps[0] === 0x00
    && pps[1] === 0x00
    && pps[2] === 0x00
    && pps[3] === 0x01
  ) {
    offset = 4
  }

  const buffer = naluUtil.naluUnescape(pps.subarray(offset))
  const bitReader = new BitReader(buffer.length)
  bitReader.appendBuffer(buffer)

  const pps_pic_parameter_set_id = expgolomb.readUE(bitReader)
  const pps_seq_parameter_set_id = expgolomb.readUE(bitReader)
  const dependent_slice_segment_flag = bitReader.readU1()
  const output_flag_present_flag = bitReader.readU1()
  const num_extra_slice_header_bits = bitReader.readU(3)

  return {
    pps_pic_parameter_set_id,
    pps_seq_parameter_set_id,
    dependent_slice_segment_flag,
    output_flag_present_flag,
    num_extra_slice_header_bits
  }
}
