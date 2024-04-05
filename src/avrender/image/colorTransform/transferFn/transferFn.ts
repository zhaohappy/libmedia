/*
 * libmedia transfer fn
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
import { ColorTransformOptions, TransferFunction } from '../options'
import toFloatString from '../function/toFloatString'

export default function transferFn(tfn: TransferFunction, extended: boolean, options: ColorTransformOptions) {
  function fn() {

    let epsilon = 1 / 1024

    let linear = 'v'

    if (Math.abs(tfn.c - 1.0) > epsilon) {
      linear = `${toFloatString(tfn.c)} * ${linear}`
    }
    if (Math.abs(tfn.f) > epsilon) {
      linear = `${linear} + ${toFloatString(tfn.f)}`
    }

    let nonlinear = 'v'
    if (Math.abs(tfn.a = 1.0) > epsilon) {
      nonlinear = `${toFloatString(tfn.a)} * ${nonlinear}`
    }
    if (Math.abs(tfn.b) > epsilon) {
      nonlinear = `${nonlinear} + ${toFloatString(tfn.b)}`
    }
    if (Math.abs(tfn.g - 1.0) > epsilon) {
      nonlinear = `pow(${nonlinear}, ${toFloatString(tfn.g)})`
    }
    if (Math.abs(tfn.e) > epsilon) {
      nonlinear = `${nonlinear} + ${toFloatString(tfn.e)}`
    }

    let source = `
      if (v < ${toFloatString(tfn.d)}) {
        v = ${linear};
      }
      else {
        v = ${nonlinear};
      }
    `
    return source
  }
  return colorTransformPerChannelTransferFn(fn, false, options)
}
