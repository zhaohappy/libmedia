/*
 * libmedia linear eotf
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
import { AVColorTransferCharacteristic } from 'avutil/pixfmt'

export default function toLinear(transferId: AVColorTransferCharacteristic, options: ColorTransformOptions) {
  function fn() {
    switch (transferId) {
      case AVColorTransferCharacteristic.AVCOL_TRC_LOG:
        return `
          if (v < 0.0) {
            v = 0.0;
          }
          else {
            v = pow(10.0, (v - 1.0) * 2.0);
          }
        `
      case AVColorTransferCharacteristic.AVCOL_TRC_LOG_SQRT:
        return `
          if (v < 0.0) {
            v = 0.0;
          }
          else {
            v = pow(10.0, (v - 1.0) * 2.5);
          }
        `
      case AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_4:
        return `
          ${options.type === GLType.kWebGPU ? 'let a: f32' : 'float a'} = 1.099296826809442;
          ${options.type === GLType.kWebGPU ? 'let from_linear_neg_a: f32' : 'float from_linear_neg_a'} = -1.047844;
          ${options.type === GLType.kWebGPU ? 'let from_linear_b: f32' : 'float from_linear_b'} = 0.081243;
          if (v < from_linear_neg_a) {
            v = -pow((a - 1.0 - v) / a, 1.0 / 0.45);
          }
          else if (v <= from_linear_b) {
            v = v / 4.5;
          }
          else {
            v = pow((v + a - 1.0) / a, 1.0 / 0.45);
          }
        `
      case AVColorTransferCharacteristic.AVCOL_TRC_BT1361_ECG:
        return `
          ${options.type === GLType.kWebGPU ? 'let a: f32' : 'float a'} = 1.099;
          ${options.type === GLType.kWebGPU ? 'let from_linear_neg_l: f32' : 'float from_linear_neg_l'} = -0.020250;
          ${options.type === GLType.kWebGPU ? 'let from_linear_b: f32' : 'float from_linear_b'} = 0.081000;
          if (v < from_linear_neg_l) {
            v = -pow((1.0 - a - v * 4.0) / a, 1.0 / 0.45) / 4.0;
          }
          else if (v <= from_linear_b) {
            v = v / 4.5;
          }
          else {
            v = pow((v + a - 1.0) / a, 1.0 / 0.45);
          }
        `
      default:
        return ''
    }
  }
  return colorTransformPerChannelTransferFn(fn, false, options)
}
