/*
 * libmedia audio stretch and pitcher
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

import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'

export interface StretchPitchParameters {
  channels: int32
  sampleRate: int32
}

export type StretchPitchOptions = {
  resource: WebAssemblyResource
}

export default class StretchPitcher {

  private processor: WebAssemblyRunner

  private options: StretchPitchOptions


  constructor(options: StretchPitchOptions) {
    this.options = options
    this.processor = new WebAssemblyRunner(this.options.resource)
  }

  public async open(parameters: StretchPitchParameters) {
    await this.processor.run()
    this.processor.invoke('stretchpitch_init')
    this.processor.invoke('stretchpitch_set_channels', parameters.channels)
    this.processor.invoke('stretchpitch_set_samplerate', parameters.sampleRate)
  }

  public setRate(rate: double) {
    this.processor.invoke('stretchpitch_set_rate', rate)
  }

  public setRateChange(change: double) {
    this.processor.invoke('stretchpitch_set_rate_change', change)
  }

  public setTempo(tempo: double) {
    this.processor.invoke('stretchpitch_set_tempo', tempo)
  }

  public setTempoChange(change: double) {
    this.processor.invoke('stretchpitch_set_tempo_change', change)
  }

  public setPitch(pitch: double) {
    this.processor.invoke('stretchpitch_set_pitch', pitch)
  }

  public setPitchOctaves(pitch: double) {
    this.processor.invoke('stretchpitch_set_pitch_octaves', pitch)
  }

  public setPitchSemiTones(pitch: double) {
    this.processor.invoke('stretchpitch_set_pitch_semi_tones', pitch)
  }

  public sendSamples(input: pointer<float>, nbSamples: int32) {
    this.processor.invoke('stretchpitch_send_samples', input, nbSamples)
  }

  public receiveSamples(output: pointer<float>, maxSamples: int32) {
    return this.processor.invoke<int32>('stretchpitch_receive_samples', output, maxSamples)
  }

  public flush() {
    this.processor.invoke('stretchpitch_flush')
  }

  public clear() {
    this.processor.invoke('stretchpitch_clear')
  }

  public getUnprocessedSamplesCount() {
    return this.processor.invoke<int32>('stretchpitch_get_unprocessed_samples_num')
  }

  public getInputOutputSamplesRatio() {
    return this.processor.invoke<int32>('stretchpitch_get_input_output_sample_ratio')
  }

  public getLatency() {
    return this.processor.invoke<int32>('get_latency')
  }

  public close() {
    this.processor.invoke('stretchpitch_destroy')
    this.processor.destroy()
  }
}
