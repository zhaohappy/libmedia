/*
 * libmedia pq eotf
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

import colorTransformPerChannelTransferFn from './colorTransformPerChannelTransferFn'
import { ColorTransformOptions, GLType } from '../options'

export default function pq2Linear(options: ColorTransformOptions) {
  function fn() {
    let source = `
      v = max(0.0, v);
      ${options.type === GLType.kWebGPU ? 'let m1: f32' : 'float m1'} = (2610.0 / 4096.0) / 4.0;
      ${options.type === GLType.kWebGPU ? 'let m2: f32' : 'float m2'} = (2523.0 / 4096.0) * 128.0;
      ${options.type === GLType.kWebGPU ? 'let c1: f32' : 'float c1'} = 3424.0 / 4096.0;
      ${options.type === GLType.kWebGPU ? 'let c2: f32' : 'float c2'} = (2413.0 / 4096.0) * 32.0;
      ${options.type === GLType.kWebGPU ? 'let c3: f32' : 'float c3'} = (2392.0 / 4096.0) * 32.0;
      
      ${options.type === GLType.kWebGL ? `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        highp float v2 = v;
        #else
        float v2 = v;
        #endif
      ` : 'var v2: f32 = v;'}
  
      v2 = pow(max(pow(v2, 1.0 / m2) - c1, 0.0) / (c2 - c3 * pow(v2, 1.0 / m2)), 1.0 / m1);
      v = v2;
    `
    return source
  }
  return colorTransformPerChannelTransferFn(fn, false, options)
}
