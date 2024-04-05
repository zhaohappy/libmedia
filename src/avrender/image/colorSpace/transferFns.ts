/*
 * libmedia transfer defined
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

export const TransferFnRec709 = {
  g: 2.222222222222, a: 0.909672415686, b: 0.090327584314, c: 0.222222222222, d: 0.081242858299, e: 0.0, f: 0.0
}
export const TransferFn470SystemM = {
  g: 2.2, a: 1.0, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0
}
export const TransferFn470SystemBG = {
  g: 2.8, a: 1.0, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0
}

export const TransferFnSMPTEST240 = {
  g: 2.222222222222, a: 0.899626676224, b: 0.100373323776, c: 0.25, d: 0.091286342118, e: 0.0, f: 0.0
}
export const TransferFnLinear = {
  g: 1.0, a: 1.0, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0
}
export const TransferFnSRGB = {
  g: 2.4, a: 1.0 / 1.055, b: 0.055 / 1.055, c: 1 / 12.92, d: 0.04045, e: 0.0, f: 0.0
}
// eslint-disable-next-line camelcase
export  const TransferFnSMPETST428_1 = {
  g: 2.6, a: 1.034080527699, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0
}

export const TransferFn2Dot2 = {
  g: 2.2, a: 1.0, b: 0.0, c: 0.0, d: 0.0, e: 0.0, f: 0.0
}

export const TransferFnRec2020 = {
  g: 2.22222, a: 0.909672, b: 0.0903276, c: 0.222222, d: 0.0812429, e: 0.0, f: 0.0
}

export const TransferFnPQ = {
  g: -2.0, a: -107 / 128.0, b: 1.0, c: 32 / 2523, d: 2413 / 128, e: -2392 / 128, f: 8192 / 1305
}

export const TransferFnHLG = {
  g: -3.0, a: 2.0, b: 2.0, c: 1 / 0.17883277, d: 0.28466892, e: 0.55991073, f: 0.0
}
