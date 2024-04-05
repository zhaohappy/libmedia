/*
 * libmedia wasm audio encoder
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

import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVFrame from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import { Rational } from 'avutil/struct/rational'

export type WasmAudioEncoderOptions = {
  resource: WebAssemblyResource
  onReceiveFrame?: (frame: AVFrame) => void
  onError: (error?: Error) => void
}

export default class WasmAudioEncoder {

  private options: WasmAudioEncoderOptions

  private encoder: WebAssemblyRunner

  constructor(options: WasmAudioEncoderOptions) {
    this.options = options
    this.encoder = new WebAssemblyRunner(this.options.resource)
  }

  public async open(parameters: AVCodecParameters, timeBase: Rational) {
    await this.encoder.run()
    this.encoder.call('encoder_open', [addressof(parameters), addressof(timeBase)])
  }

  public encode(frame: pointer<AVFrame>) {
    let ret = this.encoder.call('encoder_encode', [frame])
    return ret
  }

  public async flush() {
    this.encoder.call('encoder_flush')
  }

  public close() {
    this.encoder.call('encoder_close')
    this.encoder.destroy()
    this.encoder = null
  }
}
