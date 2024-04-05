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
import getAudioCodec from '../function/getAudioCodec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { mapUint8Array } from 'cheap/std/memory'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { getAVPacketSideData } from 'avutil/util/avpacket'

export type WebAudioDecoderOptions = {
  onReceiveFrame?: (frame: AudioFrame | AudioData) => void
  onError: (error?: Error) => void
}

export default class WebAudioDecoder {

  private options: WebAudioDecoderOptions

  private decoder: AudioDecoder

  private codecId: number

  private profile: number

  private extradata: Uint8Array

  private sampleRate: number

  private channels: number

  constructor(options: WebAudioDecoderOptions) {
    this.options = options

    this.decoder = new AudioDecoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })
  }

  private output(frame: AudioFrame | AudioData) {
    if (this.options.onReceiveFrame) {
      this.options.onReceiveFrame(frame)
    }

    frame.close()
  }

  private error(error: Error) {
    this.options.onError(error)
  }


  public async open(parameters: pointer<AVCodecParameters>) {
    this.codecId = parameters.codecId
    this.profile = parameters.profile
    this.sampleRate = parameters.sampleRate
    this.channels = parameters.chLayout.nbChannels
    this.extradata = null
    if (parameters.extradata !== nullptr) {
      this.extradata = mapUint8Array(parameters.extradata, parameters.extradataSize).slice()
    }

    this.decoder.reset()
    this.decoder.configure({
      codec: getAudioCodec(this.codecId, this.profile),
      sampleRate: this.sampleRate,
      numberOfChannels: this.channels,
      description: this.extradata
    })
  }

  public changeExtraData(buffer: Uint8Array) {

    this.extradata = buffer.slice()

    this.decoder.reset()
    this.decoder.configure({
      codec: getAudioCodec(this.codecId, this.profile),
      sampleRate: this.sampleRate,
      numberOfChannels: this.channels,
      description: this.extradata
    })
  }

  public decode(avpacket: pointer<AVPacket>) {

    const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)

    if (element !== nullptr) {
      this.changeExtraData(mapUint8Array(element.data, element.size))
    }

    const timestamp = Number(avpacket.pts)
    const key = avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY

    const audioChunk = new EncodedAudioChunk({
      type: key ? 'key' : 'delta',
      timestamp,
      data: mapUint8Array(avpacket.data, avpacket.size)
    })
    this.decoder.decode(audioChunk)

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
}
