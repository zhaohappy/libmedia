/*
 * libmedia mp3 FrameHeader utils
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

import * as mp3 from 'avutil/codecs/mp3'

export class FrameHeader {
  version: uint32
  layer: uint32
  protection: uint32
  bitrateIndex: uint32
  samplingFrequency: uint32
  padding: uint32
  private: uint32
  mode: uint32
  modeExtension: uint32
  copyright: uint32
  original: uint32
  emphasis: uint32
}

export function parse(header: FrameHeader, value: uint32) {
  header.version = (value >> 19) & 3
  header.layer = (value >> 17) & 3
  header.protection = (value >> 16) & 1
  header.bitrateIndex = (value >> 12) & 0x0f
  header.samplingFrequency = (value >> 10) & 3
  header.padding = (value >> 9) & 1
  header.mode = (value >> 6) & 3
  header.modeExtension = (value >> 4) & 3
  header.copyright = (value >> 3) & 1
  header.original = (value >> 2) & 1
  header.emphasis = value & 3
}

export function getFrameLength(header: FrameHeader, sampleRate: int32) {

  let frameSize = mp3.getBitRateByVersionLayerIndex(
    header.version,
    header.layer,
    header.bitrateIndex
  )

  switch (header.layer) {
    case 1:
    default:
      // Layer 3
      frameSize = ((frameSize * 144000) / (sampleRate << ((header.version === 3) ? 0 : 1))) >>> 0
      frameSize += header.padding
      break
    case 2:
      // Layer 2
      frameSize = ((frameSize * 144000) / sampleRate) >>> 0
      frameSize += header.padding
      break
    case 3:
      // Layer 1
      frameSize = ((frameSize * 12000) / sampleRate) >>> 0
      frameSize = (frameSize + header.padding) * 4
      break
  }

  return frameSize
}
