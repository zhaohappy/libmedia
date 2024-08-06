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
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import BufferWriter from 'common/io/BufferWriter'
import BufferReader from 'common/io/BufferReader'
import { AVPacketSideDataType } from 'avutil/codec'
import BitReader from 'common/io/BitReader'
import AVStream from '../AVStream'
import * as logger from 'common/util/logger'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { addAVPacketSideData, getAVPacketData } from 'avutil/util/avpacket'
import { naluUnescape, splitNaluByStartCode, isAnnexb } from 'avutil/util/nalu'
import { avMalloc } from 'avutil/util/mem'
import * as expgolomb from 'avutil/util/expgolomb'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as intread from 'avutil/util/intread'

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
  const resolution = width * height;
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

  const spss = []
  const ppss = []
  const spsExts = []

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

  const params = parserSPS(sps)

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

export function annexbExtradata2AvccExtradata(data: Uint8ArrayInterface) {
  let nalus = splitNaluByStartCode(data)
  if (nalus.length > 1) {
    const spss = []
    const ppss = []
    const spsExts = []

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
 * 
 * annexb 格式的 NALU 转 avcc NALU 
 * 
 */
export function annexb2Avcc(data: Uint8ArrayInterface) {

  let nalus = splitNaluByStartCode(data)
  let extradata: Uint8Array
  let key: boolean = false

  if (nalus.length > 1) {
    const spss = []
    const ppss = []
    const spsExts = []

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
      extradata = spsPps2Extradata(spss, ppss, spsExts)
    }

    nalus = nalus.filter((nalu) => {
      const type = nalu[0] & 0x1f
      return type !== H264NaluType.kSliceAUD
        && type !== H264NaluType.kSlicePPS
        && type !== H264NaluType.kSliceSPS
        && type !== H264NaluType.kSPSExt
    })
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

    const type = nalu[0] & 0x1f
    if (type === H264NaluType.kSliceIDR) {
      key = true
    }
  })

  return {
    bufferPointer,
    length,
    key,
    extradata
  }
}

/**
 * avcc 格式的 NALU 转 annexb NALU 
 * 
 */
export function avcc2Annexb(data: Uint8ArrayInterface, extradata?: Uint8ArrayInterface) {
  const naluLengthSizeMinusOne = extradata ? (extradata[4] & 0x03) : NALULengthSizeMinusOne
  let spss = []
  let ppss = []
  let spsExts = []
  let key = false

  if (extradata) {
    const result = extradata2SpsPps(extradata)
    spss = result.spss
    ppss = result.ppss
    spsExts = result.spsExts

    key = true
  }

  const nalus = []
  const seis = []

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

    const naluType = nalu[0] & 0x1f

    if (naluType === H264NaluType.kSliceSEI) {
      seis.push(nalu)
    }
    else if (naluType !== H264NaluType.kSliceAUD) {
      nalus.push(nalu)
    }
  }

  let length = spss.reduce((prev, sps) => {
    return prev + 4 + sps.length
  }, 0)
  length = ppss.reduce((prev, pps) => {
    return prev + 4 + pps.length
  }, length)
  length = spsExts.reduce((prev, ext) => {
    return prev + 4 + ext.length
  }, length)
  length = seis.reduce((prev, sei) => {
    return prev + 4 + sei.length
  }, length)
  length = nalus.reduce((prev, nalu, index) => {
    return prev + (index ? 3 : 4) + nalu.length
  }, length)

  const bufferPointer = avMalloc(length + 6)
  const bufferWriter = new BufferWriter(mapUint8Array(bufferPointer, length + 6))

  // AUD
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x00)
  bufferWriter.writeUint8(0x01)
  bufferWriter.writeUint8(0x09)
  bufferWriter.writeUint8(0xf0)

  array.each(seis, (sei) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(sei)
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
  array.each(spsExts, (ext) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(ext)
  })

  array.each(nalus, (nalu, index) => {
    bufferWriter.writeUint8(0x00)
    bufferWriter.writeUint8(0x00)
    if (!index) {
      bufferWriter.writeUint8(0x00)
    }
    bufferWriter.writeUint8(0x01)
    bufferWriter.writeBuffer(nalu)

    const type = nalu[0] & 0x1f
    if (type === H264NaluType.kSliceIDR) {
      key = true
    }
  })
  return {
    bufferPointer,
    length: length + 6,
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

  let spss = []
  let ppss = []
  let spsExts = []
  let others = []

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

    const naluType = nalu[0] & 0x1f

    if (naluType === H264NaluType.kSliceSPS) {
      spss.push(nalu)
    }
    else if (naluType === H264NaluType.kSlicePPS) {
      ppss.push(nalu)
    }
    else if (naluType === H264NaluType.kSPSExt) {
      spsExts.push(nalu)
    }
    else {
      others.push(nalu)
    }
  }

  if (spss.length || ppss.length) {
    const extradata = spsPps2Extradata(spss, ppss, spsExts)
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

  if (nalus.length > 1) {
    const spss = []
    const ppss = []
    const spsExts = []

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
      const extradata = spsPps2Extradata(spss, ppss, spsExts)
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

    stream.metadata.naluLengthSizeMinusOne = (extradata[4] & 0x03)

    const { spss } = extradata2SpsPps(extradata)

    if (spss.length) {
      const { profile, level, width, height } = parserSPS(spss[0])

      stream.codecpar.profile = profile
      stream.codecpar.level = level
      stream.codecpar.width = width
      stream.codecpar.height = height
    }
  }
}

export function isIDR(avpacket: pointer<AVPacket>, naluLengthSize: int32 = 4) {
  if (!(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)) {
    return false
  }
  if (avpacket.bitFormat === BitFormat.ANNEXB) {
    let nalus = splitNaluByStartCode(mapUint8Array(avpacket.data, avpacket.size))
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

  const buffer = naluUnescape(sps.subarray(offset))
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
  expgolomb.readUE(bitReader)

  const picOrderCntType = expgolomb.readUE(bitReader)

  if (picOrderCntType === 0) {
    // log2_max_pic_order_cnt_lsb_minus4
    expgolomb.readUE(bitReader)
  }
  else if (picOrderCntType === 1) {
    // delta_pic_order_always_zero_flag
    bitReader.readU1()

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

  return {
    profile,
    level,
    width,
    height,
    chromaFormatIdc,
    bitDepthLumaMinus8,
    bitDepthChromaMinus8
  }
}
