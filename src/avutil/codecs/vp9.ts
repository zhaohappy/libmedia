/*
 * libmedia vp9 util
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

import AVStream from '../AVStream'
import { AVPacketSideDataType } from '../codec'
import { Uint8ArrayInterface } from 'common/io/interface'
import BitReader from 'common/io/BitReader'
import AVCodecParameters from '../struct/avcodecparameters'
import { NOPTS_VALUE } from '../constant'
import { getAVPixelFormatDescriptor } from '../pixelFormatDescriptor'
import { avQ2D } from '../util/rational'
import { AVChromaLocation, AVColorRange, AVPixelFormat } from '../pixfmt'
import BufferWriter from 'common/io/BufferWriter'
import AVPacket from '../struct/avpacket'

export const enum VP9Profile {
  Profile0,
  Profile1,
  Profile2,
  Profile3
}

export const VP9Profile2Name: Record<VP9Profile, string> = {
  [VP9Profile.Profile0]: 'Profile0',
  [VP9Profile.Profile1]: 'Profile1',
  [VP9Profile.Profile2]: 'Profile2',
  [VP9Profile.Profile3]: 'Profile3'
}

export const LevelCapabilities = [
  { level: 10, maxResolution: 512 * 384, maxFrameRate: 30 },
  { level: 11, maxResolution: 512 * 384, maxFrameRate: 60 },
  { level: 20, maxResolution: 960 * 540, maxFrameRate: 30 },
  { level: 21, maxResolution: 960 * 540, maxFrameRate: 60 },
  { level: 30, maxResolution: 1920 * 1080, maxFrameRate: 30 },
  { level: 31, maxResolution: 1920 * 1080, maxFrameRate: 60 },
  { level: 40, maxResolution: 2560 * 1440, maxFrameRate: 30 },
  { level: 41, maxResolution: 2560 * 1440, maxFrameRate: 60 },
  { level: 50, maxResolution: 3840 * 2160, maxFrameRate: 30 },
  { level: 51, maxResolution: 3840 * 2160, maxFrameRate: 60 },
  { level: 60, maxResolution: 4096 * 2160, maxFrameRate: 30 },
  { level: 61, maxResolution: 4096 * 2160, maxFrameRate: 60 },
  { level: 70, maxResolution: 8192 * 4320, maxFrameRate: 30 },
  { level: 71, maxResolution: 8192 * 4320, maxFrameRate: 60 }
]

export function getLevelByResolution(width: number, height: number, fps: number) {
  const resolution = width * height
  for (const level of LevelCapabilities) {
    if (resolution <= level.maxResolution && fps <= level.maxFrameRate) {
      return level.level
    }
  }
}

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length >= 6) {
    const params = parseExtraData(extradata)
    stream.codecpar.profile = params.profile
    stream.codecpar.level = params.level
  }
}

/**
 * - 1 byte profile
 * - 1 byte level
 * - 4 bit bitdepth
 * - 3 bit chroma_subsampling
 * - 1 bit full_range_flag
 * - 1 byte color_primaries
 * - 1 byte color_trc
 * - 1 byte color_space
 * 
 * @param extradata 
 */
export function parseExtraData(extradata: Uint8ArrayInterface) {
  const bitReader = new BitReader(extradata.length)
  bitReader.appendBuffer(extradata)
  const profile = bitReader.readU(8)
  const level = bitReader.readU(8)
  let bitDepth = bitReader.readU(4)
  const chromaSubsampling = bitReader.readU(3)
  const fullRangeFlag = bitReader.readU1()
  const colorPrimaries = bitReader.readU(8)
  const colorTrc = bitReader.readU(8)
  const colorSpace = bitReader.readU(8)

  return {
    profile,
    level,
    bitDepth,
    chromaSubsampling,
    fullRangeFlag,
    colorPrimaries,
    colorTrc,
    colorSpace
  }
}

const enum VPX_CHROMA_SUBSAMPLING {
  VPX_SUBSAMPLING_420_VERTICAL = 0,
  VPX_SUBSAMPLING_420_COLLOCATED_WITH_LUMA = 1,
  VPX_SUBSAMPLING_422 = 2,
  VPX_SUBSAMPLING_444 = 3
}

function getVpccFeature(codecpar: pointer<AVCodecParameters>) {
  let profile = codecpar.profile
  let level = codecpar.level
  if (level === NOPTS_VALUE) {
    level = getLevelByResolution(codecpar.width, codecpar.height, avQ2D(codecpar.framerate))
  }
  const desc = getAVPixelFormatDescriptor(codecpar.format as AVPixelFormat)

  let bitDepth = codecpar.bitsPerCodedSample
  let chromaSubsampling = VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_420_COLLOCATED_WITH_LUMA
  if (desc) {
    bitDepth = desc.comp[0].depth
    if (desc.log2ChromaW === 1 && desc.log2ChromaH === 1) {
      if (codecpar.chromaLocation === AVChromaLocation.AVCHROMA_LOC_LEFT) {
        chromaSubsampling = VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_420_VERTICAL
      }
    }
    else if (desc.log2ChromaW === 1 && desc.log2ChromaH === 0) {
      chromaSubsampling = VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_422
    }
    else if (desc.log2ChromaW === 0 && desc.log2ChromaH === 0) {
      chromaSubsampling = VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_444
    }
  }
  const fullRange = codecpar.colorRange === AVColorRange.AVCOL_RANGE_JPEG ? 1 : 0

  if (profile === NOPTS_VALUE && bitDepth) {
    if (chromaSubsampling == VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_420_VERTICAL
      || chromaSubsampling == VPX_CHROMA_SUBSAMPLING.VPX_SUBSAMPLING_420_COLLOCATED_WITH_LUMA
    ) {
      profile = (bitDepth == 8) ? VP9Profile.Profile0 : VP9Profile.Profile2
    }
    else {
      profile = (bitDepth == 8) ? VP9Profile.Profile1 : VP9Profile.Profile3
    }
  }
  return {
    profile,
    level,
    bitDepth,
    chromaSubsampling,
    fullRange
  }
}

export function generateExtradata(codecpar: pointer<AVCodecParameters>) {
  const ioWriter = new BufferWriter(new Uint8Array(8))
  const vpcc = getVpccFeature(codecpar)
  ioWriter.writeUint8(vpcc.profile)
  ioWriter.writeUint8(vpcc.level)
  ioWriter.writeUint8((vpcc.bitDepth << 4) | (vpcc.chromaSubsampling << 1) | vpcc.fullRange)
  ioWriter.writeUint8(codecpar.colorPrimaries)
  ioWriter.writeUint8(codecpar.colorTrc)
  ioWriter.writeUint8(codecpar.colorSpace)
  ioWriter.writeUint16(0)
  return ioWriter.getWroteBuffer()
}

export function isIDR(avpacket: pointer<AVPacket>) {
  const first = accessof(avpacket.data)

  const version = (first >>> 5) & 0x01
  const high = (first >>> 4) & 0x01
  const profile = (high << 1) + version

  const showExistingFrame = (first >>> (profile === VP9Profile.Profile3 ? 2 : 3)) & 0x01

  if (showExistingFrame) {
    return false
  }

  return !((first >>> (profile === VP9Profile.Profile3 ? 1 : 2)) & 0x01)
}
