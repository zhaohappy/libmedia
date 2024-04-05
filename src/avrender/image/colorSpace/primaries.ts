/*
 * libmedia primary defined
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

import Matrix3 from 'common/math/Matrix3'
import { Vector3 } from 'common/math/Vector3'
import { concat3x3 } from 'common/math/matrix'
import { mvMul } from 'common/math/vector'

// Rec. ITU-R BT.709-6, value 1.
export const Rec709 = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06, 0.3127, 0.329]

// Rec. ITU-R BT.470-6 System M (historical), value 4.
export const Rec470SystemM = [0.67, 0.33, 0.21, 0.71, 0.14, 0.08, 0.31, 0.316]

// Rec. ITU-R BT.470-6 System B, G (historical), value 5.
export const Rec470SystemBG = [0.64, 0.33, 0.29, 0.60, 0.15, 0.06, 0.3127, 0.3290]

// Rec. ITU-R BT.601-7 525, value 6.
export const Rec601 = [0.630, 0.340, 0.310, 0.595, 0.155, 0.070, 0.3127, 0.3290]

// SMPTE ST 240, value 7 (functionally the same as value 6).
export const SMPTE_ST_240 = Rec601

// Generic film (colour filters using Illuminant C), value 8.
export const GenericFilm = [0.681, 0.319, 0.243, 0.692, 0.145, 0.049, 0.310, 0.316]

// Rec. ITU-R BT.2020-2, value 9.
export const Rec2020 = [0.708, 0.292, 0.170, 0.797, 0.131, 0.046, 0.3127, 0.3290]

// SMPTE ST 428-1, value 10.
export const SMPTE_ST_428_1 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0 / 3.0, 1.0 / 3.0]

// SMPTE RP 431-2, value 11.
export const SMPTE_RP_431_2 = [0.680, 0.320, 0.265, 0.690, 0.150, 0.060, 0.314, 0.351]

// SMPTE EG 432-1, value 12.
export const SMPTE_EG_432_1 = [0.680, 0.320, 0.265, 0.690, 0.150, 0.060, 0.3127, 0.3290]

// No corresponding industry specification identified, value 22.
// This is sometimes referred to as EBU 3213-E, but that document doesn't
// specify these values.
export const ITU_T_H273_VALUE22 = [0.630, 0.340, 0.295, 0.605, 0.155, 0.077, 0.3127, 0.3290]

// CSS Color Level 4 predefined and xyz color spaces.

// 'srgb'
export const SRGB = Rec709

// 'display-p3' (and also 'p3' as a color gamut).
export const P3 = SMPTE_EG_432_1

// 'a98-rgb'
export const A98RGB = [0.64, 0.33, 0.21, 0.71, 0.15, 0.06, 0.3127, 0.3290]

// 'prophoto-rgb'
export const ProPhotoRGB = [0.7347, 0.2653, 0.1596, 0.8404, 0.0366, 0.0001, 0.34567, 0.35850]

// 'rec2020' (as both a predefined color space and color gamut).
// The value kRec2020 is already defined above.

// 'xyzd50'
export const XYZD50 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.34567, 0.35850]

// 'xyz' and 'xyzd65'
export const XYZD65 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.3127, 0.3290]

// //////////////////////////////////////////////////////////////////////////////
// Additional helper color primaries.

// Invalid primaries, initialized to zero.
export const Invalid = [0, 0, 0, 0, 0, 0, 0, 0]

// The GenericRGB space on macOS.
export const AppleGenericRGB = [0.63002, 0.34000, 0.29505, 0.60498, 0.15501, 0.07701, 0.3127,  0.3290]

// Primaries where the colors are rotated and the gamut is huge. Good for
// testing.
export const WideGamutColorSpin = [0.01, 0.98, 0.01, 0.01, 0.98, 0.01, 0.3127, 0.3290]

function adaptToXYZ50(wx: float, wy: float) {
  const wXYZ = new Vector3([wx / wy, 1, (1 - wx - wy) / wy])
  const wXYZD50 = new Vector3([0.96422, 1.0, 0.82521])
  const xyzToLms = Matrix3.RowMajor([
    0.8951,  0.2664, -0.1614,
    -0.7502, 1.7135, 0.0367,
    0.0389, -0.0685, 1.0296
  ])
  const lmsToXyz  = Matrix3.RowMajor([
    0.9869929, -0.1470543, 0.1599627,
    0.4323053, 0.5183603, 0.0492912,
    -0.0085287, 0.0400428, 0.9684867
  ])

  const srcCone = mvMul(xyzToLms, wXYZ)
  const dstCone = mvMul(xyzToLms, wXYZD50)

  let toXYZD50 = new Matrix3([
    dstCone.x / srcCone.x, 0, 0,
    0, dstCone.y / srcCone.y, 0,
    0, 0, dstCone.z / srcCone.z
  ])

  toXYZD50 = concat3x3(toXYZD50, xyzToLms)
  toXYZD50 = concat3x3(lmsToXyz, toXYZD50)

  return toXYZD50
}

export function primariesToXYZD50(pri: float[]) {
  const matrix3 = Matrix3.RowMajor([
    pri[0], pri[2], pri[4],
    pri[1], pri[3], pri[5],
    1 - pri[0] - pri[1], 1 - pri[2] - pri[3], 1 - pri[4] - pri[5]
  ])

  const matrix3Inv = matrix3.copy().invert()

  const wXYZ = new Vector3([pri[6] / pri[7], 1, (1 - pri[6] - pri[7]) / pri[7]])

  const XYZ = mvMul(matrix3Inv, wXYZ)

  let toXYZ = new Matrix3([
    XYZ.x, 0, 0,
    0, XYZ.y, 0,
    0, 0, XYZ.z
  ])

  toXYZ = concat3x3(matrix3, toXYZ)

  const dxToD50 = adaptToXYZ50(pri[6], pri[7])

  return concat3x3(dxToD50, toXYZ)
}
