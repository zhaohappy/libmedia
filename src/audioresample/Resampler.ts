/*
 * libmedia audio resampler
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

import { AVSampleFormat } from 'avutil/audiosamplefmt'
import { AVChannelLayout } from 'avutil/struct/audiosample'
import AVPCMBuffer from 'avutil/struct/avpcmbuffer'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'

export interface PCMParameters {
  channels: int32
  sampleRate: int32
  format: AVSampleFormat
  layout?: pointer<AVChannelLayout>
}

export type ResamplerOptions = {
  resource: WebAssemblyResource
}

export default class Resampler {

  private resampler: WebAssemblyRunner

  private options: ResamplerOptions

  private inputParameters: PCMParameters | undefined
  private outputParameters: PCMParameters | undefined

  constructor(options: ResamplerOptions) {
    this.options = options

    this.resampler = new WebAssemblyRunner(this.options.resource)

  }

  public async open(input: PCMParameters, output: PCMParameters): Promise<int32> {

    this.inputParameters = input
    this.outputParameters = output

    await this.resampler.run()

    this.resampler.invoke(
      'resample_set_input_parameters',
      input.sampleRate,
      input.channels,
      input.format,
      input.layout || nullptr
    )
    this.resampler.invoke(
      'resample_set_output_parameters',
      output.sampleRate,
      output.channels,
      output.format,
      output.layout || nullptr
    )

    let ret = this.resampler.invoke<int32>('resample_init')
    if (ret < 0) {
      logger.error(`open resampler failed, ret: ${ret}`)
      return errorType.INVALID_PARAMETERS
    }
    return 0
  }

  public resample(input: pointer<pointer<uint8>>, output: pointer<AVPCMBuffer>, numberOfFrames: int32) {
    return this.resampler.invoke<int32>('resample_process', input, output, numberOfFrames)
  }

  public getOutputSampleCount(numberOfFrames: int32) {
    return this.resampler.invoke<int32>('resample_nb_sample', numberOfFrames)
  }

  public close() {
    this.resampler.invoke('resample_destroy')
    this.resampler.destroy()
  }

  public getInputPCMParameters() {
    return this.inputParameters
  }

  public getOutputPCMParameters() {
    return this.outputParameters
  }
}
