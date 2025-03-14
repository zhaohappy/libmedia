/*
 * libmedia video scaler
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

import { AVPixelFormat } from 'avutil/pixfmt'
import AVFrame from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'

export const enum ScaleAlgorithm {
  FAST_BILINEAR = 1,
  BILINEAR = 2,
  BICUBIC = 4,
  X = 8,
  POINT = 0x10,
  AREA = 0x20,
  BICUBLIN = 0x40,
  GAUSS = 0x80,
  SINC = 0x100,
  LANCZOS = 0x200,
  SPLINE = 0x400
}

export interface ScaleParameters {
  width: int32
  height: int32
  format: AVPixelFormat
}

export type VideoScalerOptions = {
  resource: WebAssemblyResource
}

export default class VideoScaler {

  private scaler: WebAssemblyRunner

  private options: VideoScalerOptions

  private inputParameters: ScaleParameters | undefined
  private outputParameters: ScaleParameters | undefined

  constructor(options: VideoScalerOptions) {
    this.options = options
    this.scaler = new WebAssemblyRunner(this.options.resource)
  }

  public async open(input: ScaleParameters, output: ScaleParameters, algorithm: ScaleAlgorithm = ScaleAlgorithm.BILINEAR): Promise<int32> {

    this.inputParameters = input
    this.outputParameters = output

    await this.scaler.run()

    this.scaler.invoke(
      'scale_set_input_parameters',
      input.width,
      input.height,
      input.format
    )
    this.scaler.invoke(
      'scale_set_output_parameters',
      output.width,
      output.height,
      output.format
    )

    let ret = this.scaler.invoke<int32>('scale_init', algorithm)
    if (ret < 0) {
      logger.error(`open scaler failed, ret: ${ret}`)
      return errorType.INVALID_PARAMETERS
    }
    return 0
  }

  public scale(src: pointer<AVFrame>, dst: pointer<AVFrame>) {
    return this.scaler.invoke<int32>('scale_process', src, dst)
  }

  public close() {
    this.scaler.invoke('scale_destroy')
    this.scaler.destroy()
  }

  public getInputScaleParameters() {
    return this.inputParameters
  }

  public getOutputScaleParameters() {
    return this.outputParameters
  }
}
