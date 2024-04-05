/*
 * libmedia piecewise HDR
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

import ColorSpace from '../../colorSpace/ColorSpace'
import { ColorTransformOptions, GLType, TransferFunction } from '../options'
import colorTransformPerChannelTransferFn from './colorTransformPerChannelTransferFn'

export function getPiecewiseHDRPar(space: ColorSpace) {

  const tfn = {
    g: 1,
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    f: 1
  }

  // TODO

  return {
    tfn,
    p: 0,
    q: 0,
    r: 0
  }
}

export function invertPiecewiseHDRPar(space: ColorSpace, tfn: TransferFunction, p: float, q: float, r: float) {

  // TODO

  return {
    tfn,
    p: 0,
    q: 0,
    r: 0
  }
}

export default function piecewiseHDR(tfn: TransferFunction, p: float, q: float, r: float, options: ColorTransformOptions) {
  function fn() {
    return `
      if (v < 0.0) {
        v = 0.0;
      }
      else if (v < ${tfn.d}) {
        v = ${tfn.c} * v + ${tfn.f};
      }
      else if (v < ${p}) {
        v = pow(${tfn.a} * v + ${tfn.b}, ${tfn.g}) + ${tfn.e};
      }
      else {
        v = ${q} * v + ${r};
      }
    `
  }
  return colorTransformPerChannelTransferFn(fn, false, options)
}
