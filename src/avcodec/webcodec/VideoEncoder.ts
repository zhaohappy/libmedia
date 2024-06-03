/*
 * libmedia Webcodec video encoder
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
import browser from 'common/util/browser'
import AVPacket, { AVPacketPool } from 'avutil/struct/avpacket'
import { AVCodecID } from 'avutil/codec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVFrame from 'avutil/struct/avframe'
import getVideoCodec from '../function/getVideoCodec'
import { getHardwarePreference } from '../function/getHardwarePreference'
import { avQ2D } from 'avutil/util/rational'

export type WebVideoEncoderOptions = {
  onReceivePacket?: (avpacket: pointer<AVPacket>, avframe: pointer<AVFrame>) => void
  onError: (error?: Error) => void
  enableHardwareAcceleration?: boolean
  avpacketPool?: AVPacketPool
}

export default class WebVideoEncoder {

  private encoder: VideoEncoder

  private options: WebVideoEncoderOptions

  private currentError: Error

  private parameters: pointer<AVCodecParameters>

  constructor(options: WebVideoEncoderOptions) {

    this.options = options

    this.encoder = new VideoEncoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })
  }

  private async output(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) {
    if (this.options.onReceivePacket) {

    }
  }

  private error(error: Error) {
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    this.currentError = null
    this.parameters = parameters

    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: Number(parameters.bitRate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true)
    }

    const support = await VideoEncoder.isConfigSupported(config)

    if (!support.supported) {
      throw new Error('not support')
    }

    if (this.encoder && this.encoder.state !== 'closed') {
      this.encoder.close()
    }

    this.encoder = new VideoEncoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })

    this.encoder.reset()
    this.encoder.configure(config)

    if (this.currentError) {
      throw this.currentError
    }

  }

  public encode(frame: VideoFrame | pointer<AVFrame>, key: boolean) {

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
