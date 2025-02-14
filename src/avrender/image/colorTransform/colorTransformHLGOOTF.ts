
/*
 * libmedia hlg ootf
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

import { ColorTransformOptions, GLType } from './options'

// The luminance vector in rec2020 linear space.
const kLr = 0.2627
const kLg = 0.6780
const kLb = 0.0593

export function computeHLGToneMapConstants(options: ColorTransformOptions) {
  options.metadata.hlgOOTFGammaMinusOne = 0.2
}

export default function colorTransformHLGOOTF(options: ColorTransformOptions) {
  if (options.type === GLType.kWebGL) {
    return `
      {
        vec4 luma_vec = vec4(${kLr}, ${kLg}, ${kLb}, 0.0);
        float L = dot(color, luma_vec);
        if (L > 0.0) {
          color.r *= pow(L, hlg_ootf_gamma_minus_one);
          color.g *= pow(L, hlg_ootf_gamma_minus_one);
          color.b *= pow(L, hlg_ootf_gamma_minus_one);
        }
      }
    `
  }
  else if (options.type === GLType.kWebGPU) {
    return `
      {
        let luma_vec: vec4<f32> = vec4(${kLr}, ${kLg}, ${kLb}, 0.0);
        let L: f32 = dot(color, luma_vec);
        if (L > 0.0) {
          color.r *= pow(L, hlg_ootf_gamma_minus_one);
          color.g *= pow(L, hlg_ootf_gamma_minus_one);
          color.b *= pow(L, hlg_ootf_gamma_minus_one);
        }
      }
    `
  }
  return ''
}
