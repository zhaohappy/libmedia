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

import type { AVSampleFormat, AVChannelLayout, AVPCMBuffer } from '@libmedia/avutil'
import { errorType } from '@libmedia/avutil'
import { type WebAssemblyResource, WebAssemblyRunner } from '@libmedia/cheap'
import { logger } from '@libmedia/common'

export interface PCMParameters {
  channels: int32
  sampleRate: int32
  format: AVSampleFormat
  layout?: pointer<AVChannelLayout>
}

export type ResamplerOptions = {
  resource: WebAssemblyResource
  /**
   * 下混到更少声道时中置声道的电平，不设置使用 swresample 的默认值 0.707（-3dB）
   *
   * Level of the center channel when downmixing to fewer channels, swresample's default 0.707 (-3dB) when unset
   */
  centerMixLevel?: double
}

export default class Resampler {

  private resampler: WebAssemblyRunner

  private options: ResamplerOptions

  private inputParameters: PCMParameters | undefined
  private outputParameters: PCMParameters | undefined

  private opened: boolean

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

    if (this.options.centerMixLevel != null) {
      this.resampler.invoke('resample_set_center_mix_level', this.options.centerMixLevel)
    }

    let ret = this.resampler.invoke<int32>('resample_init')
    if (ret < 0) {
      logger.error(`open resampler failed, ret: ${ret}`)
      return errorType.INVALID_PARAMETERS
    }
    this.opened = true
    return 0
  }

  public resample(input: pointer<pointer<uint8>>, output: pointer<AVPCMBuffer>, numberOfFrames: int32) {
    return this.resampler.invoke<int32>('resample_process', input, output, numberOfFrames)
  }

  /**
   * 设置下混到更少声道时中置声道的电平，已打开时立即生效
   *
   * Set the level of the center channel when downmixing to fewer channels, applied at once if already opened
   *
   * @param level 0.707 为 -3dB（默认），1 为 0dB，1.414 为 +3dB / 0.707 is -3dB (default), 1 is 0dB, 1.414 is +3dB
   */
  public setCenterMixLevel(level: double) {
    this.options.centerMixLevel = level
    if (!this.opened) {
      return 0
    }
    const ret = this.resampler.invoke<int32>('resample_set_center_mix_level', level)
    if (ret < 0) {
      logger.error(`set center mix level failed, ret: ${ret}`)
      return errorType.INVALID_PARAMETERS
    }
    return 0
  }

  public getOutputSampleCount(numberOfFrames: int32) {
    return this.resampler.invoke<int32>('resample_nb_sample', numberOfFrames)
  }

  public close() {
    this.opened = false
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
