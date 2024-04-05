/*
 * libmedia Webcodec audio encoder
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

import * as logger from 'common/util/logger'
import isAudioData from '../function/isAudioData'
import { AVCodecID } from 'avutil/codec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVPacket from 'avutil/struct/avpacket'

export type WebAudioEncoderOptions = {
  onReceivePacket: (avpacket: AVPacket) => void
  onError: (error?: Error) => void
}

export default class WebAudioEncoder {

  private encoder: AudioEncoder

  private options: WebAudioEncoderOptions

  constructor(options: WebAudioEncoderOptions) {

    this.options = options

    this.encoder = new AudioEncoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })
  }

  private async output(chunk: EncodedAudioChunk, metadata?: {
    decoderConfig: {
      codec: string
      sampleRate: number
      numberOfChannels: number
      description?: WebCodecBufferSource
    }
  }) {
    if (this.options.onReceivePacket) {

    }
  }

  private error(error: Error) {
    this.options.onError(error)
  }

  public open(parameters: AVCodecParameters) {

  }

  public encode(frame: AudioFrame | AudioData) {
    this.encoder.encode(frame)
    frame.close()
  }

  public async flush() {
    await this.encoder.flush()
  }

  public close() {
    this.encoder.close()
    this.encoder = null
  }

  public getQueueLength() {
    return this.encoder.encodeQueueSize
  }
}
