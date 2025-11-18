/*
 * libmedia MeterWorkletProcessor
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

import AudioWorkletProcessorBase from '../base/AudioWorkletProcessorBase'

class MeterWorkletProcessor extends AudioWorkletProcessorBase {

  private audioLevel: number

  static get parameterDescriptors() {
    return [
      {
        name: 'averaging',
        defaultValue: 0.95
      },
      {
        name: 'output',
        defaultValue: 1
      }
    ]
  }
  constructor() {
    super()
    this.audioLevel = 0
  }

  public process(inputs: any, outputs: any, parameters: any) {

    let averaging: number
    let outputData: number

    if (parameters.averaging.length) {
      averaging = parameters.averaging[0]
    }
    else {
      averaging = parameters.averaging
    }
    if (parameters.output.length) {
      outputData = parameters.output[0]
    }
    else {
      outputData = parameters.output
    }

    const input = inputs[0]
    const output = outputs[0]

    const buf = input[0]

    if (!buf) {
      return true
    }

    const bufLength = buf.length
    let sum = 0.0
    let x: number

    for (let i = 0; i < bufLength; i++) {
      x = buf[i]
      sum += x * x
    }

    const rms = Math.sqrt(sum / bufLength)

    this.audioLevel = Math.max(rms, this.audioLevel * averaging)

    if (outputData) {
      for (let channel = 0; channel < input.length; channel++) {
        const inputChannel = input[channel]
        const outputChannel = output[channel]

        for (let i = 0; i < inputChannel.length; i++) {
          outputChannel[i] = inputChannel[i]
        }
      }
    }
    this.notify('audioLevel', {
      audioLevel: this.audioLevel
    })

    return true
  }
}
registerProcessor('meter-processor', MeterWorkletProcessor)
