/*
 * libmedia wasm audio decoder
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
import AVPacket from 'avutil/struct/avpacket'
import AVFrame, { AVFramePool, AVFrameRef } from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import { createAVFrame, destroyAVFrame } from 'avutil/util/avframe'
import * as logger from 'common/util/logger'

export type WasmAudioDecoderOptions = {
  resource: WebAssemblyResource
  onReceiveFrame: (frame: pointer<AVFrame>) => void
  onError: (error?: Error) => void
  avframePool?: AVFramePool
}

export default class WasmAudioDecoder {

  private options: WasmAudioDecoderOptions

  private decoder: WebAssemblyRunner

  private frame: pointer<AVFrame>

  constructor(options: WasmAudioDecoderOptions) {
    this.options = options
    this.decoder = new WebAssemblyRunner(options.resource)
  }

  private getAVFrame() {
    if (this.frame) {
      return this.frame
    }
    return this.frame = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
  }

  private outputAVFrame() {
    if (this.frame) {
      if (this.options.onReceiveFrame) {
        this.options.onReceiveFrame(this.frame)
      }
      else {
        this.options.avframePool ? this.options.avframePool.release(this.frame as pointer<AVFrameRef>) : destroyAVFrame(this.frame)
      }

      this.frame = nullptr
    }
  }

  private receiveAVFrame() {
    return this.decoder.call<int32>('decoder_receive', this.getAVFrame())
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    await this.decoder.run()
    let ret = this.decoder.call<int32>('decoder_open', parameters, nullptr, 1)
    if (ret < 0) {
      logger.fatal(`open audio decoder failed, ret: ${ret}`)
    }
  }

  public decode(avpacket: pointer<AVPacket>) {
    let ret = this.decoder.call<int32>('decoder_decode', avpacket)

    if (ret) {
      return ret
    }

    while (true) {
      ret = this.receiveAVFrame()
      if (ret === 1) {
        this.outputAVFrame()
      }
      else if (ret < 0) {
        return ret
      }
      else {
        break
      }
    }

    return 0
  }

  public async flush() {
    this.decoder.call('decoder_flush')
    while (1) {
      const ret = this.receiveAVFrame()
      if (ret < 1) {
        return
      }
      this.outputAVFrame()
    }
  }

  public close() {
    this.decoder.call('decoder_close')
    this.decoder.destroy()
    this.decoder = null

    if (this.frame) {
      this.options.avframePool ? this.options.avframePool.release(this.frame as pointer<AVFrameRef>) : destroyAVFrame(this.frame)
      this.frame = nullptr
    }
  }
}
