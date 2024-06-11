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

import { AVPacketSideDataType } from 'avutil/codec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVPacket, { AVPacketFlags, AVPacketPool } from 'avutil/struct/avpacket'
import getAudioCodec from 'avcodec/function/getAudioCodec'
import AVFrame from 'avutil/struct/avframe'
import * as is from 'common/util/is'
import { avframe2AudioData } from 'avutil/function/avframe2AudioData'
import { addAVPacketData, addAVPacketSideData, createAVPacket } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { AV_TIME_BASE } from 'avutil/constant'

export type WebAudioEncoderOptions = {
  onReceivePacket: (avpacket: pointer<AVPacket>, avframe?: pointer<AVFrame>) => void
  onError: (error?: Error) => void
  avpacketPool?: AVPacketPool
}

export default class WebAudioEncoder {

  private encoder: AudioEncoder

  private options: WebAudioEncoderOptions

  private currentError: Error

  private pts: int64

  private avframeCache: pointer<AVFrame>[]

  constructor(options: WebAudioEncoderOptions) {

    this.options = options
    this.avframeCache = []
  }

  private async output(chunk: EncodedAudioChunk, metadata?: {
    decoderConfig: {
      codec: string
      sampleRate: number
      numberOfChannels: number
      description?: WebCodecBufferSource
    }
  }) {
    const avpacket = this.options.avpacketPool ? this.options.avpacketPool.alloc() : createAVPacket()
    avpacket.pts = this.pts
    avpacket.dts = this.pts
    avpacket.timeBase.den = AV_TIME_BASE
    avpacket.timeBase.num = 1
    avpacket.duration = static_cast<int64>(chunk.duration)
    avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    const data = avMalloc(chunk.byteLength)
    chunk.copyTo(mapUint8Array(data, chunk.byteLength))
    addAVPacketData(avpacket, data, chunk.byteLength)

    this.pts += avpacket.duration

    if (metadata) {
      if (metadata.decoderConfig?.description) {
        const extradata = avMalloc(metadata.decoderConfig.description.byteLength)
        let buffer: Uint8Array
        if (metadata.decoderConfig.description instanceof ArrayBuffer) {
          buffer = new Uint8Array(metadata.decoderConfig.description)
        }
        else {
          buffer = new Uint8Array(metadata.decoderConfig.description.buffer)
        }
        memcpyFromUint8Array(extradata, metadata.decoderConfig.description.byteLength, buffer)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, metadata.decoderConfig.description.byteLength)
      }
    }
    const avframe = this.avframeCache.shift()
    this.options.onReceivePacket(avpacket, avframe)
  }

  private error(error: Error) {
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>) {

    this.currentError = null

    const config: AudioEncoderConfig = {
      codec: getAudioCodec(parameters),
      sampleRate: parameters.sampleRate,
      numberOfChannels: parameters.chLayout.nbChannels,
      bitrate: static_cast<double>(parameters.bitRate)
    }

    const support = await AudioEncoder.isConfigSupported(config)

    if (!support.supported) {
      throw new Error('not support')
    }

    if (this.encoder && this.encoder.state !== 'closed') {
      this.encoder.close()
    }

    this.encoder = new AudioEncoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })

    this.encoder.reset()
    this.encoder.configure(config)

    if (this.currentError) {
      throw this.currentError
    }

    this.pts = 0n
  }

  public encode(frame: AudioData | pointer<AVFrame>) {
    if (is.number(frame)) {
      this.avframeCache.push(frame)
      frame = avframe2AudioData(frame)
    }
    try {
      this.encoder.encode(frame)
      return 0
    }
    catch (error) {
      return -1
    }
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
