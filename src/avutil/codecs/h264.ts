/*
 * libmedia h264 util
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
import * as logger from 'common/util/logger'
import { mapUint8Array } from 'cheap/std/memory'
import * as naluUtil from '../util/nalu'
import { avMalloc } from '../util/mem'
import * as expgolomb from '../util/expgolomb'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as intread from '../util/intread'
import * as intwrite from '../util/intwrite'
import { AVPixelFormat } from '../pixfmt'

export const H264_MAX_DPB_FRAMES = 16

export const NALULengthSizeMinusOne = 3

export const enum BitFormat {
  AVCC = 1,
  ANNEXB
}

export const enum PictureType {
  I = 1,
  P,
  B,
  SPS,
  PPS,
  SEI
}

export const enum H264NaluType {
  kUnspecified = 0,
  kSliceNonIDR,
  kSliceDPA,
  kSliceDPB,
  kSliceDPC,
  kSliceIDR,
  kSliceSEI,
  kSliceSPS,
  kSlicePPS,
  kSliceAUD,
  kEndOfSequence,
  kEndOfStream,
  kFiller,
  kSPSExt,
  kReserved0
}

export const enum H264SliceType {
  kSliceNone = -1,
  kSliceP,
  kSliceB,
  kSliceI,
  kSliceSP = 5,
  kSliceSB,
  kSliceSI
}

export const enum H264Profile {
  kBaseline = 66,
  kMain = 77,
  kHigh = 100,
  kConstrained = kBaseline,
  kHigh10 = 110,
  kHigh422 = 122,
  kHigh444 = 244
}

export const H264Profile2Name: Record<H264Profile, string> = {
  [H264Profile.kBaseline]: 'Constrained Baseline',
  [H264Profile.kMain]: 'Main',
  [H264Profile.kHigh]: 'High',
  [H264Profile.kHigh10]: 'High10',
  [H264Profile.kHigh422]: 'High422',
  [H264Profile.kHigh444]: 'High444'
}

export const LevelCapabilities = [
  { level: 10, maxResolution: 25344, maxFrameRate: 15 },
  { level: 11, maxResolution: 25344, maxFrameRate: 30 },
  { level: 12, maxResolution: 101376, maxFrameRate: 30 },
  { level: 13, maxResolution: 101376, maxFrameRate: 30 },
  { level: 20, maxResolution: 101376, maxFrameRate: 30 },
  { level: 21, maxResolution: 202752, maxFrameRate: 30 },
  { level: 22, maxResolution: 414720, maxFrameRate: 30 },
  { level: 30, maxResolution: 414720, maxFrameRate: 30 },
  { level: 31, maxResolution: 921600, maxFrameRate: 30 },
  { level: 32, maxResolution: 1310720, maxFrameRate: 60 },
  { level: 40, maxResolution: 2097152, maxFrameRate: 30 },
  { level: 41, maxResolution: 2097152, maxFrameRate: 60 },
  { level: 42, maxResolution: 2228224, maxFrameRate: 60 },
  { level: 50, maxResolution: 8912896, maxFrameRate: 30 },
  { level: 51, maxResolution: 8912896, maxFrameRate: 60 },
  { level: 52, maxResolution: 8912896, maxFrameRate: 120 },
  { level: 60, maxResolution: 35651584, maxFrameRate: 30 },
  { level: 61, maxResolution: 35651584, maxFrameRate: 60 },
  { level: 62, maxResolution: 35651584, maxFrameRate: 120 }
]

export function getLevelByResolution(width: number, height: number, fps: number) {
  const resolution = width * height
  for (const level of LevelCapabilities) {
    if (resolution <= level.maxResolution && fps <= level.maxFrameRate) {
      return level.level
    }
  }
}

/**
 * 
 * avcc 格式的 extradata 转 annexb sps pps
 * 
 * bits    
 * - 8   version ( always 0x01 )
 * - 8   avc profile ( sps[0][1] )
 * - 8   avc compatibility ( sps[0][2] )
 * - 8   avc level ( sps[0][3] )
 * - 6   reserved ( all bits on )
 * - 2   NALULengthSizeMinusOne
 * - 3   reserved ( all bits on )
 * - 5   number of SPS NALUs (usually 1)
 * - repeated once per SPS:
 *   - 16         SPS size
 *   - variable   SPS NALU data
 * - 8 number of PPS NALUs (usually 1)
 * - repeated once per PPS:
 *   - 16       PPS size
 *   - variable PPS NALU data
 * 
 * - ext (profile !== 66 && profile !== 77 && profile !== 88)
 *  - 6 reserved ( all bits on )
 *  - 2 chroma_format_idc
 *  - 5 reserved ( all bits on )
 *  - 3 bit_depth_luma_minus8
 *  - 5 reserved ( all bits on )
 *  - 3 bit_depth_chroma_minus8
 *  - 8 number of SPS_EXT NALUs
 *    - 16 SPS_EXT size
 *    - variable   SPS_EXT NALU data
 * 
 */
export function extradata2SpsPps(extradata: Uint8ArrayInterface) {
  const bufferReader = new BufferReader(extradata)
  bufferReader.skip(5)

  const spss: Uint8ArrayInterface[] = []
  const ppss: Uint8ArrayInterface[] = []
  const spsExts: Uint8ArrayInterface[] = []

  const spsLength = bufferReader.readUint8() & 0x1f
  for (let i = 0; i < spsLength; i++) {
    const length = bufferReader.readUint16()
    spss.push(bufferReader.readBuffer(length))
  }

  const ppsLength = bufferReader.readUint8()
  for (let i = 0; i < ppsLength; i++) {
    const length = bufferReader.readUint16()
    ppss.push(bufferReader.readBuffer(length))
  }

  if (bufferReader.remainingSize() > 4) {
    bufferReader.skip(3)
    const spsExtLength = bufferReader.readUint8()
    if (spsExtLength > 0) {
      for (let i = 0; i < spsExtLength; i++) {
        const length = bufferReader.readUint16()
        spsExts.push(bufferReader.readBuffer(length))
      }
    }
  }

  return {
    spss,
    ppss,
    spsExts
  }
}

/**
 * annexb sps pps 转 avcc 格式的 extradata
 * 
 * @param spss 
 * @param ppss 
 * @param spsExts 
 * @returns 
 */
export function spsPps2Extradata(spss: Uint8ArrayInterface[], ppss: Uint8ArrayInterface[], spsExts: Uint8ArrayInterface[] = []) {

  if (spss.length > 32) {
    logger.warn(`h264 metadata\'s sps max length is 32, but get ${spss.length}`)
    spss = spss.slice(0, 32)
  }
  if (spss.length > 256) {
    logger.warn(`h264 metadata\'s pps max length is 256, but get ${spss.length}`)
    spss = spss.slice(0, 256)
  }

  let length = 7
  length = spss.reduce((prev, sps) => {
    return prev + 2 + sps.length
  }, length)
  length = ppss.reduce((prev, pps) => {
    return prev + 2 + pps.length
  }, length)

  const sps = spss[0]

  const params = parseSPS(sps)

  if (params.profile !== 66 && params.profile !== 77 && params.profile !== 88) {
    length += 4

    if (spsExts.length) {
      length = spsExts.reduce((prev, ext) => {
        return prev + 2 + ext.length
      }, length)
    }
  }

  const buffer = new Uint8Array(length)
  const bufferWriter = new BufferWriter(buffer)

  bufferWriter.writeUint8(0x01)
  bufferWriter.writeUint8(sps[1])
  bufferWriter.writeUint8(sps[2])
  bufferWriter.writeUint8(sps[3])
  bufferWriter.writeUint8(0xfc | NALULengthSizeMinusOne)

  // sps
  bufferWriter.writeUint8(0xe0 | (spss.length & 0x1f))
  array.each(spss, (sps) => {
    bufferWriter.writeUint16(sps.length)
    bufferWriter.writeBuffer(sps)
  })

  // pps
  bufferWriter.writeUint8(ppss.length)
  array.each(ppss, (pps) => {
    bufferWriter.writeUint16(pps.length)
    bufferWriter.writeBuffer(pps)
  })

  if (params.profile !== 66 && params.profile !== 77 && params.profile !== 88) {
    bufferWriter.writeUint8(0xfc | params.chromaFormatIdc)
    bufferWriter.writeUint8(0xf8 | params.bitDepthLumaMinus8)
    bufferWriter.writeUint8(0xf8 | params.bitDepthChromaMinus8)

    if (spsExts.length) {
      array.each(spsExts, (ext) => {
        bufferWriter.writeUint16(ext.length)
        bufferWriter.writeBuffer(ext)
      })
    }
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
  if (nalus.length > 1) {
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []
    const spsExts: Uint8ArrayInterface[] = []

    nalus.forEach((nalu) => {
      const type = nalu[0] & 0x1f
      if (type === H264NaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === H264NaluType.kSlicePPS) {
        ppss.push(nalu)
      }
      else if (type === H264NaluType.kSPSExt) {
        spsExts.push(nalu)
      }
    })
    if (spss.length && ppss.length) {
      return spsPps2Extradata(spss, ppss, spsExts)
    }
  }
}

/**
 * 从 annexb 码流里面生成 annexb extradata
 * 
 * 提取出 sps 和 pps
 * 
 * @param data 
 * @returns 
 */
export function generateAnnexbExtradata(data: Uint8ArrayInterface) {
  let nalus = naluUtil.splitNaluByStartCode(data)
  if (nalus.length > 1) {
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []
    const spsExts: Uint8ArrayInterface[] = []

    nalus.forEach((nalu) => {
      const type = nalu[0] & 0x1f
      if (type === H264NaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === H264NaluType.kSlicePPS) {
        ppss.push(nalu)
      }
      else if (type === H264NaluType.kSPSExt) {
        spsExts.push(nalu)
      }
    })
    if (spss.length && ppss.length) {
      const nalus = [spss[0], ppss[0]]
      if (spsExts.length) {
        nalus.push(spsExts[0])
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
 */
export function annexb2Avcc(data: Uint8ArrayInterface) {

  let nalus = naluUtil.splitNaluByStartCode(data)
  let extradata: Uint8Array
  let key: boolean = false

  if (nalus.length) {
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []
    const spsExts: Uint8ArrayInterface[] = []

    nalus.forEach((nalu) => {
      const type = nalu[0] & 0x1f
      if (type === H264NaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === H264NaluType.kSlicePPS) {
        ppss.push(nalu)
      }
      else if (type === H264NaluType.kSPSExt) {
        spsExts.push(nalu)
      }
      else if (type === H264NaluType.kSliceIDR) {
        key = true
      }
    })

    if (spss.length && ppss.length) {
      extradata = spsPps2Extradata(spss, ppss, spsExts)
      nalus = nalus.filter((nalu) => {
        const type = nalu[0] & 0x1f
        return type !== H264NaluType.kSliceAUD
          && type !== H264NaluType.kSlicePPS
          && type !== H264NaluType.kSliceSPS
          && type !== H264NaluType.kSPSExt
      })
    }
    else {
      nalus = nalus.filter((nalu) => {
        const type = nalu[0] & 0x1f
        return type !== H264NaluType.kSliceAUD
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
    key,
    extradata
  }
}

/**
 * 需要保证 data 是 safe 的
 * 
 * @param spss 
 * @param ppss 
 * @param spsExts 
 * @param seis 
 * @param others  
 * @returns 
 */
export function nalus2Annexb(
  spss: Uint8ArrayInterface[],
  ppss: Uint8ArrayInterface[],
  spsExts: Uint8ArrayInterface[],
  seis: Uint8ArrayInterface[],
  others: Uint8ArrayInterface[]
) {
  const lengths = [
    naluUtil.joinNaluByStartCodeLength(seis, 0),
    naluUtil.joinNaluByStartCodeLength(spss, 0),
    naluUtil.joinNaluByStartCodeLength(ppss, 0),
    naluUtil.joinNaluByStartCodeLength(spsExts, 0),
    naluUtil.joinNaluByStartCodeLength(others, 2)
  ]

  let length = lengths.reduce((prev, length) => {
    return prev + length
  }, 0)

  const bufferPointer: pointer<uint8> = avMalloc(length + 6)

  let offset = bufferPointer
  // AUD
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 0)
  intwrite.w8(offset++, 1)
  intwrite.w8(offset++, H264NaluType.kSliceAUD)
  intwrite.w8(offset++, 0xf0)

  if (seis.length) {
    naluUtil.joinNaluByStartCode(seis, 0, mapUint8Array(offset, lengths[0]))
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
  if (spsExts.length) {
    naluUtil.joinNaluByStartCode(spsExts, 0, mapUint8Array(offset, lengths[3]))
    offset = reinterpret_cast<pointer<uint8>>(offset + lengths[3])
  }
  if (others.length) {
    naluUtil.joinNaluByStartCode(others, 2, mapUint8Array(offset, lengths[4]))
  }

  return {
    bufferPointer,
    length: length + 6,
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
    const spss: Uint8ArrayInterface[] = []
    const ppss: Uint8ArrayInterface[] = []
    const spsExts: Uint8ArrayInterface[] = []
    const seis: Uint8ArrayInterface[] = []
    const others: Uint8ArrayInterface[] = []

    nalus.forEach((nalu) => {
      const type = nalu[0] & 0x1f
      if (type === H264NaluType.kSliceSPS) {
        spss.push(nalu)
      }
      else if (type === H264NaluType.kSlicePPS) {
        ppss.push(nalu)
      }
      else if (type === H264NaluType.kSPSExt) {
        spsExts.push(nalu)
      }
      else if (type === H264NaluType.kSliceSEI) {
        seis.push(nalu)
      }
      else if (type !== H264NaluType.kSliceAUD) {
        others.push(nalu)
      }
    })
    return nalus2Annexb(spss, ppss, spsExts, seis, others)
  }
}

/**
 * avcc 格式的 NALU 转 annexb NALU 
 * 
 * 需要保证 data 是 safe 的
 */
export function avcc2Annexb(data: Uint8ArrayInterface, extradata?: Uint8ArrayInterface) {
  const naluLengthSizeMinusOne = extradata ? (extradata[4] & 0x03) : NALULengthSizeMinusOne
  let spss: Uint8ArrayInterface[] = []
  let ppss: Uint8ArrayInterface[] = []
  let spsExts: Uint8ArrayInterface[] = []
  let key = false

  if (extradata) {
    const result = extradata2SpsPps(extradata)
    spss = result.spss
    ppss = result.ppss
    spsExts = result.spsExts
    key = true
  }

  const others: Uint8ArrayInterface[] = []
  const seis: Uint8ArrayInterface[] = []
  const nalus = naluUtil.splitNaluByLength(data, naluLengthSizeMinusOne)
  nalus.forEach((nalu) => {
    const naluType = nalu[0] & 0x1f
    if (naluType === H264NaluType.kSliceSEI) {
      seis.push(nalu)
    }
    else if (naluType !== H264NaluType.kSliceAUD) {
      others.push(nalu)
    }
    if (naluType === H264NaluType.kSliceIDR) {
      key = true
    }
  })

  return {
    ...nalus2Annexb(spss, ppss, spsExts, seis, others),
    key
  }
}

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }

  let sps: Uint8ArrayInterface
  if (extradata && naluUtil.isAnnexb(extradata)) {
    array.each(naluUtil.splitNaluByStartCode(extradata), (nalu) => {
      const type = nalu[0] & 0x1f
      if (type === H264NaluType.kSliceSPS) {
        sps = nalu
        return false
      }
    })
  }
  else if (extradata && extradata.length >= 6) {
    stream.metadata.naluLengthSizeMinusOne = (extradata[4] & 0x03)
    const { spss } = extradata2SpsPps(extradata)
    if (spss.length) {
      sps = spss[0]
    }
  }
  if (sps) {
    const { profile, level, width, height, videoDelay, chromaFormatIdc, bitDepthLumaMinus8 } = parseSPS(sps)
    stream.codecpar.profile = profile
    stream.codecpar.level = level
    stream.codecpar.width = width
    stream.codecpar.height = height
    stream.codecpar.videoDelay = videoDelay
    switch (bitDepthLumaMinus8) {
      case 0:
        if (chromaFormatIdc === 3) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV444P
        }
        else if (chromaFormatIdc === 2) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV422P
        }
        else {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV420P
        }
        break
      case 1:
        if (chromaFormatIdc === 3) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV444P9LE
        }
        else if (chromaFormatIdc === 2) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV422P9LE
        }
        else {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV420P9LE
        }
        break
      case 2:
        if (chromaFormatIdc === 3) {
          stream.codecpar.format = AVPixelFormat.AV_PIX_FMT_YUV444P10LE
        }
        else if (chromaFormatIdc === 2) {
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
      const type = nalu[0] & 0x1f
      return type === H264NaluType.kSliceIDR
    })
  }
  else {
    const size = avpacket.size
    let i = 0
    while (i < (size - naluLengthSize)) {
      const type = intread.r8(avpacket.data + (i + naluLengthSize)) & 0x1f
      if (type === H264NaluType.kSliceIDR) {
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

export interface H264SPS {
  profile: number
  level: number
  width: number
  height: number
  chromaFormatIdc: number
  bitDepthLumaMinus8: number
  bitDepthChromaMinus8: number
  frameMbsOnlyFlag: number
  picOrderCntType: number
  log2MaxPicOrderCntLsbMinus4: number
  deltaPicOrderAlwaysZeroFlag: number
  log2MaxFrameNumMinus4: number
  videoDelay: number
}

export function parseSPS(sps: Uint8ArrayInterface): H264SPS {

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

  const buffer = naluUtil.naluUnescape(sps.subarray(offset))
  const bitReader = new BitReader(buffer.length)
  bitReader.appendBuffer(buffer)

  // forbidden_zero_bit
  bitReader.readU1()
  // nal_ref_idc
  bitReader.readU(2)
  // nal_unit_type
  bitReader.readU(5)

  const profile = bitReader.readU(8)

  // constraint_set0_flag
  bitReader.readU1()
  // constraint_set1_flag
  bitReader.readU1()
  // constraint_set2_flag
  bitReader.readU1()
  // constraint_set3_flag
  bitReader.readU1()
  // constraint_set4_flag
  bitReader.readU1()
  // constraint_set4_flag
  bitReader.readU1()
  // reserved_zero_2bits
  bitReader.readU(2)

  const level = bitReader.readU(8)

  // seq_parameter_set_id
  expgolomb.readUE(bitReader)

  // 摄像机出图大部分格式是 4:2:0
  let chromaFormatIdc = 1
  let bitDepthLumaMinus8 = 0
  let bitDepthChromaMinus8 = 0

  if (profile == 100 || profile == 110 || profile == 122
    || profile == 244 || profile == 44 || profile == 83
    || profile == 86 || profile == 118 || profile == 128
    || profile == 138 || profile == 139 || profile == 134 || profile == 135
  ) {
    chromaFormatIdc = expgolomb.readUE(bitReader)
    if (chromaFormatIdc === 3) {
      // separate_colour_plane_flag
      bitReader.readU1()
    }
    // bit_depth_luma_minus8
    bitDepthLumaMinus8 = expgolomb.readUE(bitReader)
    // bit_depth_chroma_minus8
    bitDepthChromaMinus8 = expgolomb.readUE(bitReader)
    // qpprime_y_zero_transform_bypass_flag
    bitReader.readU1()

    let seqScalingMatrixPresentFlag = bitReader.readU1()
    if (seqScalingMatrixPresentFlag) {
      const seqScalingListPresentFlag = new Array(8)
      for (let i = 0; i < ((chromaFormatIdc != 3) ? 8 : 12); i++) {
        seqScalingListPresentFlag[i] = bitReader.readU1()
      }
    }
  }

  // log2_max_frame_num_minus4
  const log2MaxFrameNumMinus4 = expgolomb.readUE(bitReader)

  const picOrderCntType = expgolomb.readUE(bitReader)
  let log2MaxPicOrderCntLsbMinus4 = 0
  let deltaPicOrderAlwaysZeroFlag = 0

  if (picOrderCntType === 0) {
    // log2_max_pic_order_cnt_lsb_minus4
    log2MaxPicOrderCntLsbMinus4 = expgolomb.readUE(bitReader)
  }
  else if (picOrderCntType === 1) {
    // delta_pic_order_always_zero_flag
    deltaPicOrderAlwaysZeroFlag = bitReader.readU1()

    // offset_for_non_ref_pic
    expgolomb.readSE(bitReader)
    // offset_for_top_to_bottom_field
    expgolomb.readSE(bitReader)

    const numRefFramesInPicOrderCntCycle = expgolomb.readUE(bitReader)
    for (let i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
      expgolomb.readSE(bitReader)
    }
  }

  // max_num_ref_frames
  expgolomb.readUE(bitReader)
  // gaps_in_frame_num_value_allowed_flag
  bitReader.readU1()

  const picWidthInMbsMinus1 = expgolomb.readUE(bitReader)
  const picHeightInMapUnitsMinus1 = expgolomb.readUE(bitReader)
  const frameMbsOnlyFlag = bitReader.readU1()

  let width = (picWidthInMbsMinus1 + 1) * 16
  let height = (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16

  if (!frameMbsOnlyFlag) {
    // mb_adaptive_frame_field_flag
    bitReader.readU1()
  }

  // direct_8x8_inference_flag
  bitReader.readU1()

  const frameCroppingFlag = bitReader.readU1()
  if (frameCroppingFlag) {
    const frameCropLeftOffset = expgolomb.readUE(bitReader)
    const frameCropRightOffset = expgolomb.readUE(bitReader)
    const frameCropTopOffset = expgolomb.readUE(bitReader)
    const frameCropBottomOffset = expgolomb.readUE(bitReader)

    let cropUnitX = 1
    let cropUnitY = 2 - frameCroppingFlag

    if (chromaFormatIdc === 1) {
      cropUnitX = 2
      cropUnitY = 2 * (2 - frameCroppingFlag)
    }
    else if (frameCroppingFlag === 2) {
      cropUnitX = 2
      cropUnitY = 2 - frameCroppingFlag
    }

    width -= cropUnitX * (frameCropLeftOffset + frameCropRightOffset)
    height -= cropUnitY * (frameCropTopOffset + frameCropBottomOffset)

  }

  let videoDelay = 0

  const vuiParametersPresentFlag = bitReader.readU1()
  if (vuiParametersPresentFlag) {
    // aspect_ratio_info_present_flag
    let flag = bitReader.readU1()
    if (flag) {
      const aspectRatioIdc = bitReader.readU(8)
      if (aspectRatioIdc >= 17) {
        // sar.num
        bitReader.readU(16)
        // sar.num
        bitReader.readU(16)
      }
    }
    // overscan_info_present_flag
    flag = bitReader.readU1()
    if (flag) {
      // overscan_appropriate_flag
      bitReader.readU1()
    }
    // video_signal_type_present_flag
    flag = bitReader.readU1()
    if (flag) {
      // video_format
      bitReader.readU(3)
      // video_full_range_flag
      bitReader.readU1()
      // colour_description_present_flag
      flag = bitReader.readU1()
      if (flag) {
        // colour_primaries
        bitReader.readU(8)
        // transfer_characteristics
        bitReader.readU(8)
        // matrix_coeffs
        bitReader.readU(8)
      }
    }
    // chroma_loc_info_present_flag
    flag = bitReader.readU1()
    if (flag) {
      // chroma_sample_loc_type_top_field
      expgolomb.readUE(bitReader)
      // chroma_sample_loc_type_bottom_field
      expgolomb.readUE(bitReader)
    }
    // timing_info_present_flag
    flag = bitReader.readU1()
    if (flag) {
      // num_units_in_tick
      bitReader.readU(32)
      // time_scale
      bitReader.readU(32)
      // fixed_frame_rate_flag
      bitReader.readU1()
    }
    function parseHrdParameters() {
      const cpbCount = expgolomb.readUE(bitReader) + 1
      // bit_rate_scale
      bitReader.readU(4)
      // cpb_size_scale
      bitReader.readU(4)
      for (let i = 0; i < cpbCount; i++) {
        // bit_rate_value
        expgolomb.readUE(bitReader)
        // cpb_size_value
        expgolomb.readUE(bitReader)
        // cpr_flag
        bitReader.readU1()
      }
      // initial_cpb_removal_delay_length
      bitReader.readU(5)
      // cpb_removal_delay_length
      bitReader.readU(5)
      // dpb_output_delay_length
      bitReader.readU(5)
      // time_offset_length
      bitReader.readU(5)
    }
    // nal_hrd_parameters_present_flag
    let flag1 = bitReader.readU1()
    if (flag1) {
      parseHrdParameters()
    }
    // vcl_hrd_parameters_present_flag
    let flag2 = bitReader.readU1()
    if (flag2) {
      parseHrdParameters()
    }
    if (flag1 || flag2) {
      // low_delay_hrd_flag
      bitReader.readU1()
    }
    // pic_struct_present_flag
    bitReader.readU1()
    // bitstream_restriction_flag
    flag = bitReader.readU1()
    if (flag) {
      // motion_vectors_over_pic_boundaries_flag
      bitReader.readU1()
      // max_bytes_per_pic_denom
      expgolomb.readUE(bitReader)
      // max_bits_per_mb_denom
      expgolomb.readUE(bitReader)
      // log2_max_mv_length_horizontal
      expgolomb.readUE(bitReader)
      // log2_max_mv_length_vertical
      expgolomb.readUE(bitReader)

      videoDelay = Math.min(expgolomb.readUE(bitReader), H264_MAX_DPB_FRAMES)
    }
  }

  return {
    profile,
    level,
    width,
    height,
    chromaFormatIdc,
    bitDepthLumaMinus8,
    bitDepthChromaMinus8,
    frameMbsOnlyFlag,
    picOrderCntType,
    log2MaxPicOrderCntLsbMinus4,
    deltaPicOrderAlwaysZeroFlag,
    log2MaxFrameNumMinus4,
    videoDelay
  }
}
