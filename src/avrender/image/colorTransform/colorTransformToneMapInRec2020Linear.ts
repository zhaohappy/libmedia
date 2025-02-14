/*
 * libmedia colorTransform tone map in rec2020 linear
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

import { AVColorTransferCharacteristic } from 'avutil/pixfmt'
import ColorSpace from '../colorSpace/ColorSpace'
import { ColorTransformOptions, DefaultSDRWhiteLevel, GLType, HLGRefMaxLumNits } from './options'

function computeSrcMaxLumRelative(src: ColorSpace, options: ColorTransformOptions) {
  let srcMaxLumNits = HLGRefMaxLumNits
  if (src.getTransferId() !== AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67) {
    if (options.maxContentLightLevel > 0) {
      srcMaxLumNits = options.maxContentLightLevel
    }
  }
  let sdrWhiteNits = DefaultSDRWhiteLevel
  if (options.sdrWhiteLevel) {
    sdrWhiteNits = options.sdrWhiteLevel
  }
  return srcMaxLumNits / sdrWhiteNits
}

export function computeTonemapAB(src: ColorSpace, options: ColorTransformOptions) {
  const srcMaxLumRelative = computeSrcMaxLumRelative(src, options)
  if (srcMaxLumRelative > options.dstMaxLuminanceRelative) {
    options.metadata.pqTonemapA = options.dstMaxLuminanceRelative /
        (srcMaxLumRelative * srcMaxLumRelative)
    options.metadata.pqTonemapB = 1.0 / options.dstMaxLuminanceRelative
  }
  else {
    options.metadata.pqTonemapA = 0
    options.metadata.pqTonemapB = 0
  }
}

export default function colorTransformToneMapInRec2020Linear(options: ColorTransformOptions) {
  return `
    {
      ${options.type === GLType.kWebGPU ? 'let maximum: f32' : 'float maximum'} = max(color.r, max(color.g, color.b));
      if (maximum > 0.0) {
        color.r *= (1.0 + pq_tonemap_a * maximum) / (1.0 + pq_tonemap_b * maximum);
        color.g *= (1.0 + pq_tonemap_a * maximum) / (1.0 + pq_tonemap_b * maximum);
        color.b *= (1.0 + pq_tonemap_a * maximum) / (1.0 + pq_tonemap_b * maximum);
      }
    }
 `
}
