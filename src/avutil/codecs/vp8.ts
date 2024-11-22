/*
 * libmedia vp8 util
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
import AVPacket from '../struct/avpacket'
import BitReader from 'common/io/BitReader'
import { Uint8ArrayInterface } from 'common/io/interface'

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
  bitReader.appendBuffer(extradata.subarray(4))
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

export function isIDR(avpacket: pointer<AVPacket>) {
  const first = accessof(avpacket.data)
  return !(first >>> 7)
}
