/*
 * libmedia round to standard framerate
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

import { Rational } from 'avutil/struct/rational'
import { avQ2D, avReduce } from 'avutil/util/rational'

const MAX_STD_FRAMERATE = 30 * 12 + 30 + 3 + 6

function getStdFramerate(index: number) {
  if (index < 30 * 12) {
    return (index + 1) * 1001
  }
  index -= 30 * 12
  if (index < 30) {
    return (index + 31) * 1001 * 12
  }
  index -= 30
  if (index < 3) {
    return [80, 120, 240][index] * 1001 * 12
  }
  index -= 3
  return [24, 30, 60, 12, 15, 48][index] * 1000 * 12
}

export default function roundStandardFramerate(framerate: Rational) {
  let bestFps = 0
  let bestError = 0.01
  for (let i = 0; i < MAX_STD_FRAMERATE; i++) {
    const error = Math.abs(avQ2D(framerate) / avQ2D({ num: getStdFramerate(i), den: 12 * 1001}) - 1)
    if (error < bestError) {
      bestError = error
      bestFps = getStdFramerate(i)
    }
  }
  if (bestFps) {
    const f = { num: bestFps, den: 12 * 1001}
    avReduce(f)
    framerate.num = f.num
    framerate.den = f.den
  }
}
