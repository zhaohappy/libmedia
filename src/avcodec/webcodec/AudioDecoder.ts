/*
 * libmedia Webcodec audio decoder
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

import { AVPacketSideDataType } from 'avutil/codec'
import getAudioCodec from 'avutil/function/getAudioCodec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { mapUint8Array } from 'cheap/std/memory'
import AVPacket from 'avutil/struct/avpacket'
import { getAVPacketSideData } from 'avutil/util/avpacket'
import avpacket2EncodedAudioChunk from 'avutil/function/avpacket2EncodedAudioChunk'
import * as logger from 'common/util/logger'

export type WebAudioDecoderOptions = {
  onReceiveFrame: (frame: AudioData) => void
  onError: (error?: Error) => void
}

export default class WebAudioDecoder {

  private options: WebAudioDecoderOptions

  private decoder: AudioDecoder
  private parameters: pointer<AVCodecParameters>

  private extradata: Uint8Array

  private currentError: Error

  constructor(options: WebAudioDecoderOptions) {
    this.options = options
  }

  private output(frame: AudioData) {
    if (this.options.onReceiveFrame) {
      this.options.onReceiveFrame(frame)
    }
    else {
      frame.close()
    }
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    this.currentError = null
    this.parameters = parameters
    this.extradata = null
    if (parameters.extradata !== nullptr) {
      this.extradata = mapUint8Array(parameters.extradata, parameters.extradataSize).slice()
    }

    const config: AudioDecoderConfig = {
      codec: getAudioCodec(this.parameters),
      sampleRate: parameters.sampleRate,
      numberOfChannels: parameters.chLayout.nbChannels,
      description: this.extradata
    }

    if (!config.description) {
      // description 不是 arraybuffer 会抛错
      delete config.description
    }

    const support = await AudioDecoder.isConfigSupported(config)

    if (!support.supported) {
      throw new Error('not support')
    }

    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close()
    }

    this.decoder = new AudioDecoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })

    this.decoder.reset()
    this.decoder.configure(config)

    if (this.currentError) {
      throw this.currentError
    }
  }

  public changeExtraData(buffer: Uint8Array) {
    if (buffer.length === this.extradata.length) {
      let same = true
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== this.extradata[i]) {
          same = false
          break
        }
      }
      if (same) {
        return
      }
    }

    this.extradata = buffer.slice()

    this.decoder.reset()
    this.decoder.configure({
      codec: getAudioCodec(this.parameters),
      sampleRate: this.parameters.sampleRate,
      numberOfChannels: this.parameters.chLayout.nbChannels,
      description: this.extradata
    })

    if (this.currentError) {
      throw this.currentError
    }
  }

  public decode(avpacket: pointer<AVPacket>, pts?: int64) {

    const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)

    if (element !== nullptr) {
      this.changeExtraData(mapUint8Array(element.data, element.size))
    }

    const audioChunk = avpacket2EncodedAudioChunk(avpacket, pts)

    try {
      this.decoder.decode(audioChunk)
    }
    catch (error) {
      logger.error(`decode error, ${error}`)
      return -1
    }

    return 0
  }

  public async flush() {
    await this.decoder.flush()
  }

  public close() {
    if (this.decoder.state !== 'closed') {
      this.decoder.close()
    }
    this.decoder = null
  }

  public getQueueLength() {
    return this.decoder.decodeQueueSize
  }

  static async isSupported(parameters: pointer<AVCodecParameters>) {
    let extradata: Uint8Array = null
    if (parameters.extradata !== nullptr) {
      extradata = mapUint8Array(parameters.extradata, parameters.extradataSize).slice()
    }
    const config: AudioDecoderConfig = {
      codec: getAudioCodec(parameters),
      sampleRate: parameters.sampleRate,
      numberOfChannels: parameters.chLayout.nbChannels,
      description: extradata
    }

    if (!config.description) {
      // description 不是 arraybuffer 会抛错
      delete config.description
    }

    const support = await AudioDecoder.isConfigSupported(config)

    return support.supported
  }
}
