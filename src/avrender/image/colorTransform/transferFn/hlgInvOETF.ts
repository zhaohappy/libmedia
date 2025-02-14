/*
 * libmedia hlg oetf
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

import { ColorTransformOptions, GLType } from '../options'
import colorTransformPerChannelTransferFn from './colorTransformPerChannelTransferFn'

export default function hlgInvOETF(options: ColorTransformOptions) {
  /**
   * pec: http://www.arib.or.jp/english/html/overview/doc/2-STD-B67v1_0.pdf
   */
  function fn() {
    let source = `
      v = max(0.0, v);
      ${options.type === GLType.kWebGPU ? 'let a: f32' : 'float a'} = 0.17883277;
      ${options.type === GLType.kWebGPU ? 'let b: f32' : 'float b'} = 0.28466892;
      ${options.type === GLType.kWebGPU ? 'let c: f32' : 'float c'} = 0.55991073;
      if (v <= 0.5) {
        v = v * v * 4.0;
      }
      else {
        v = exp((v - c) / a) + b;
      }
      v = v / 12.0;
    `
    return source
  }
  return colorTransformPerChannelTransferFn(fn, false, options)
}
