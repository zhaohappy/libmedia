/*
 * libmedia color transform matrix
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

import Matrix4 from 'common/math/Matrix4'
import { ColorTransformOptions, GLType } from './options'

export default function colorTransformMatrix(matrix: Matrix4, options: ColorTransformOptions) {

  let mat4String = ''
  let vec4String = ''

  if (options.type === GLType.kWebGL) {
    mat4String = 'mat4'
    vec4String = 'vec4'
  }
  else if (options.type === GLType.kWebGPU) {
    mat4String = 'mat4x4'
    vec4String = 'vec4'
  }

  if (!mat4String || !vec4String) {
    return ''
  }

  let source = `
      color = ${mat4String}(
        ${matrix.rc(0, 0)}, ${matrix.rc(1, 0)}, ${matrix.rc(2, 0)}, 0,
        ${matrix.rc(0, 1)}, ${matrix.rc(1, 1)}, ${matrix.rc(2, 1)}, 0,
        ${matrix.rc(0, 2)}, ${matrix.rc(1, 2)}, ${matrix.rc(2, 2)}, 0,
        0, 0, 0, 1
      ) * color;
    `

  if (matrix.rc(0, 3) !== 0 || matrix.rc(1, 3) !== 0 || matrix.rc(2, 3) !== 0) {
    source += `
        color += ${vec4String}(${matrix.rc(0, 3)}, ${matrix.rc(1, 3)}, ${matrix.rc(2, 3)}, 0);
      `
  }
  return source
}
