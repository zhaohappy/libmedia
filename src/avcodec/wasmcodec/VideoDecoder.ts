/*
 * libmedia wasm video decoder
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

import AVPacket from 'avutil/struct/avpacket'
import AVFrame, { AVFramePool, AVFrameRef } from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { createAVFrame, destroyAVFrame } from 'avutil/util/avframe'
import * as logger from 'common/util/logger'

export type WasmVideoDecoderOptions = {
  resource: WebAssemblyResource
  onReceiveFrame?: (frame: pointer<AVFrame>) => void
  onError?: (error?: Error) => void
  avframePool?: AVFramePool
}

/**
 * We leave some space between them for extensions (drop some
 * keyframes for intra-only or drop just some bidir frames). 
 */
export const enum AVDiscard {
  /**
   * discard nothing
   */
  AVDISCARD_NONE = -16,
  /**
   * discard useless packets like 0 size packets in avi
   */
  AVDISCARD_DEFAULT = 0,
  /**
   * discard all non reference
   */
  AVDISCARD_NONREF = 8,
  /**
   * discard all bidirectional frames
   */
  AVDISCARD_BIDIR = 16,
  /**
   * discard all non intra frames
   */
  AVDISCARD_NONINTRA = 24,
  /**
   * discard all frames except keyframes
   */
  AVDISCARD_NONKEY = 32,
  /**
   * discard all
   */
  AVDISCARD_ALL = 48
}

export default class WasmVideoDecoder {

  private options: WasmVideoDecoderOptions

  private decoder: WebAssemblyRunner

  private frame: pointer<AVFrame> | pointer<AVFrameRef>

  private parameters: pointer<AVCodecParameters>

  constructor(options: WasmVideoDecoderOptions) {
    this.options = options
    this.decoder = new WebAssemblyRunner(this.options.resource)
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

  public async open(parameters: pointer<AVCodecParameters>, threadCount: number = 1) {
    await this.decoder.run()
    let ret = this.decoder.call<int32>('decoder_open', parameters, nullptr, threadCount)
    if (ret < 0) {
      logger.fatal(`open video decoder failed, ret: ${ret}`)
    }
    this.parameters = parameters
    await this.decoder.childrenThreadReady()
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

    this.parameters = nullptr
  }

  public setSkipFrameDiscard(discard: AVDiscard) {
    this.decoder.call('decoder_discard', discard)
  }
}
