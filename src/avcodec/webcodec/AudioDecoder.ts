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
import * as errorType from 'avutil/error'

export type WebAudioDecoderOptions = {
  onReceiveAudioData: (frame: AudioData) => void
  onError: (error?: Error) => void
}

export default class WebAudioDecoder {

  private options: WebAudioDecoderOptions

  private decoder: AudioDecoder | undefined
  private parameters: pointer<AVCodecParameters> = nullptr

  private extradata: Uint8Array | undefined

  private currentError: Error | null = null

  constructor(options: WebAudioDecoderOptions) {
    this.options = options
  }

  private output(frame: AudioData) {
    if (this.options.onReceiveAudioData) {
      this.options.onReceiveAudioData(frame)
    }
    else {
      frame.close()
    }
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>): Promise<int32> {
    this.currentError = null
    this.parameters = parameters
    this.extradata = undefined
    if (parameters.extradata !== nullptr) {
      this.extradata = mapUint8Array(parameters.extradata, reinterpret_cast<size>(parameters.extradataSize)).slice()
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

    try {
      const support = await AudioDecoder.isConfigSupported(config)
      if (!support.supported) {
        logger.error('not support')
        return errorType.INVALID_PARAMETERS
      }
    }
    catch (error) {
      logger.error(`${error}`)
      return errorType.CODEC_NOT_SUPPORT
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
      logger.error(`open audio decoder error, ${this.currentError}`)
      return errorType.CODEC_NOT_SUPPORT
    }
    return 0
  }

  public changeExtraData(buffer: Uint8Array) {
    if (buffer.length === this.extradata!.length) {
      let same = true
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== this.extradata![i]) {
          same = false
          break
        }
      }
      if (same) {
        return 0
      }
    }

    this.currentError = null

    this.extradata = buffer.slice()

    this.decoder!.reset()
    this.decoder!.configure({
      codec: getAudioCodec(this.parameters),
      sampleRate: this.parameters.sampleRate,
      numberOfChannels: this.parameters.chLayout.nbChannels,
      description: this.extradata
    })

    if (this.currentError) {
      logger.error(`change extra data error, ${this.currentError}`)
      return errorType.CODEC_NOT_SUPPORT
    }
    return 0
  }

  public decode(avpacket: pointer<AVPacket>): int32 {

    if (this.currentError) {
      logger.error(`decode error, ${this.currentError}`)
      return errorType.DATA_INVALID
    }

    const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)

    if (element !== nullptr) {
      let ret = this.changeExtraData(mapUint8Array(element.data, element.size))
      if (ret) {
        return ret
      }
    }

    const audioChunk = avpacket2EncodedAudioChunk(avpacket)

    try {
      this.decoder!.decode(audioChunk)
    }
    catch (error) {
      logger.error(`decode error, ${error}`)
      return errorType.DATA_INVALID
    }

    return 0
  }

  public async flush(): Promise<int32> {
    if (this.currentError) {
      logger.error(`flush error, ${this.currentError}`)
      return errorType.DATA_INVALID
    }
    try {
      await this.decoder!.flush()
      return 0
    }
    catch (error) {
      logger.error(`flush error, ${error}`)
      return errorType.DATA_INVALID
    }
  }

  public close() {
    if (this.decoder!.state !== 'closed') {
      this.decoder!.close()
    }
    this.decoder = undefined
  }

  public getQueueLength() {
    return this.decoder?.decodeQueueSize ?? 0
  }

  static async isSupported(parameters: pointer<AVCodecParameters>) {
    let extradata: Uint8Array | undefined = undefined
    if (parameters.extradata !== nullptr) {
      extradata = mapUint8Array(parameters.extradata, reinterpret_cast<size>(parameters.extradataSize)).slice()
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

    try {
      const support = await AudioDecoder.isConfigSupported(config)
      return support.supported
    }
    catch (error) {
      return false
    }
  }
}
