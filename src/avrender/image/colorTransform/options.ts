/*
 * libmedia ColorTransformOptions defined
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

import HdrMetadata from '../struct/HdrMetadata'

export const enum GLType {
  kWebGL,
  kWebGPU
}

export const DefaultSDRWhiteLevel = 203.0
// The maximum brightness of the reference display for HLG computations.
export const HLGRefMaxLumNits = 1000.0

// The maximum reference brightness of a PQ signal.
export const PQRefMaxLumNits = 10000.0

export interface ColorTransformOptions {
  type: GLType
  bitDepth: number
  toneMapPQAndHlgToDst?: boolean
  metadata?: HdrMetadata
  // Used for interpreting color spaces whose definition depends on an SDR
  // white point and for tone mapping.
  dstSdrMaxLuminanceNits?: float
  // The maximum luminance value for the destination, as a multiple of
  // `dst_sdr_max_luminance_nits` (so this is 1 for SDR displays).
  dstMaxLuminanceRelative?: float

  // The number of nits of SDR whit
  sdrWhiteLevel?: float
  // Max content light level (CLL), i.e. maximum brightness level present in the
  // stream), in nits.
  maxContentLightLevel?: float
  // Max frame-average light level (FALL), i.e. maximum average brightness of
  // the brightest frame in the stream), in nits.
  maxFrameAverageLightLevel?: float

  outputRGB?: boolean
}

export interface TransferFunction {
  g: float
  a: float
  b: float
  c: float
  d: float
  e: float
  f: float
}
