/*
 * libmedia wasm subtitle decoder
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
import { createAVFrame, destroyAVFrame } from 'avutil/util/avframe'
import Decoder from './decoder/Decoder'
import { AVCodecID } from 'avutil/codec'
import * as errorType from 'avutil/error'
import WebVttDecoder from './decoder/WebVttDecoder'

export type SubtitleDecoderOptions = {
  onReceiveFrame?: (frame: pointer<AVFrame>) => void
  onError?: (error?: Error) => void
  avframePool?: AVFramePool
}

export default class SubtitleDecoder {

  private options: SubtitleDecoderOptions

  private frame: pointer<AVFrame>

  private decoder: Decoder

  constructor(options: SubtitleDecoderOptions) {
    this.options = options
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
    return this.decoder.receiveAVFrame(this.getAVFrame())
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    switch (parameters.codecId) {
      case AVCodecID.AV_CODEC_ID_WEBVTT:
        this.decoder = new WebVttDecoder()
        break
      default:
        return errorType.CODEC_NOT_SUPPORT
    }
    return 0
  }

  public decode(avpacket: pointer<AVPacket>) {
    let ret = this.decoder.sendAVPacket(avpacket)

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
    this.decoder.flush()
    while (1) {
      const ret = this.receiveAVFrame()
      if (ret < 1) {
        return
      }
      this.outputAVFrame()
    }
  }

  public close() {
    if (this.frame) {
      this.options.avframePool ? this.options.avframePool.release(this.frame as pointer<AVFrameRef>) : destroyAVFrame(this.frame)
      this.frame = nullptr
    }
  }
}
