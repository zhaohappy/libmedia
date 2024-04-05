/*
 * libmedia flip vertex
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

export default function flipVertex(vertex: number[], flipHorizontal: boolean, flipVertical: boolean) {
  if (flipHorizontal) {
    let x = vertex[3]
    let y = vertex[4]
    vertex[3] = vertex[17]
    vertex[4] = vertex[18]
    vertex[17] = x
    vertex[18] = y

    x = vertex[10]
    y = vertex[11]
    vertex[10] = vertex[24]
    vertex[11] = vertex[25]
    vertex[24] = x
    vertex[25] = y
  }
  if (flipVertical) {
    let x = vertex[3]
    let y = vertex[4]
    vertex[3] = vertex[10]
    vertex[4] = vertex[11]
    vertex[10] = x
    vertex[11] = y

    x = vertex[17]
    y = vertex[18]
    vertex[17] = vertex[24]
    vertex[18] = vertex[25]
    vertex[24] = x
    vertex[25] = y
  }
}
