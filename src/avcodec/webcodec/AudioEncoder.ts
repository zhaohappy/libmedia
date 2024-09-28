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

import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVPacket, { AVPacketPool } from 'avutil/struct/avpacket'
import getAudioCodec from 'avcodec/function/getAudioCodec'
import AVFrame, { AVFramePool, AVFrameRef } from 'avutil/struct/avframe'
import { avframe2AudioData } from 'avutil/function/avframe2AudioData'
import { createAVPacket } from 'avutil/util/avpacket'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { Rational } from 'avutil/struct/rational'
import encodedAudioChunk2AVPacket from 'avutil/function/encodedAudioChunk2AVPacket'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_TIME_BASE_Q } from 'avutil/constant'
import isPointer from 'cheap/std/function/isPointer'
import * as logger from 'common/util/logger'

export type WebAudioEncoderOptions = {
  onReceivePacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  avpacketPool?: AVPacketPool
  avframePool?: AVFramePool
}

export default class WebAudioEncoder {

  private encoder: AudioEncoder

  private options: WebAudioEncoderOptions
  private parameters: pointer<AVCodecParameters>
  private timeBase: Rational

  private currentError: Error

  private pts: int64

  private avframeCache: pointer<AVFrame>[]

  private extradata: Uint8Array

  constructor(options: WebAudioEncoderOptions) {

    this.options = options
    this.avframeCache = []
  }

  private async output(chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) {

    const avpacket = this.options.avpacketPool ? this.options.avpacketPool.alloc() : createAVPacket()

    if (!this.extradata) {
      if (metadata?.decoderConfig?.description) {
        let buffer: Uint8Array
        if (metadata.decoderConfig.description instanceof ArrayBuffer) {
          buffer = new Uint8Array(metadata.decoderConfig.description)
        }
        else {
          buffer = new Uint8Array(metadata.decoderConfig.description.buffer)
        }
        this.extradata = buffer
      }
      encodedAudioChunk2AVPacket(chunk, avpacket)
    }
    else {
      encodedAudioChunk2AVPacket(chunk, avpacket, metadata)
    }

    avpacket.pts = avRescaleQ(this.pts, AV_TIME_BASE_Q, this.timeBase)
    avpacket.dts = avpacket.pts
    avpacket.timeBase.den = this.timeBase.den
    avpacket.timeBase.num = this.timeBase.num

    this.pts += avpacket.duration

    this.options.onReceivePacket(avpacket)

    const avframe = this.avframeCache.shift()
    if (avframe) {
      this.options.avframePool
        ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        : destroyAVFrame(avframe)
    }
  }

  private error(error: Error) {
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational) {

    this.currentError = null

    const config: AudioEncoderConfig = {
      codec: getAudioCodec(parameters),
      sampleRate: parameters.sampleRate,
      numberOfChannels: parameters.chLayout.nbChannels,
      bitrate: static_cast<double>(parameters.bitrate),
      bitrateMode: 'constant'
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
    this.parameters = parameters
    this.timeBase = timeBase
  }

  public encode(frame: AudioData | pointer<AVFrame>) {
    if (isPointer(frame)) {
      const cache = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
      refAVFrame(cache, frame)
      this.avframeCache.push(cache)
      cache.pts = 0n
      frame = avframe2AudioData(cache)
    }
    try {
      this.encoder.encode(frame)
      return 0
    }
    catch (error) {
      logger.error(`encode error, ${error}`)
      return -1
    }
  }

  public async flush() {
    await this.encoder.flush()
  }

  public close() {
    if (this.encoder) {
      if (this.encoder.state !== 'closed') {
        this.encoder.close()
      }
    }
    if (this.avframeCache.length) {
      this.avframeCache.forEach((avframe) => {
        this.options.avframePool
          ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe))
          : destroyAVFrame(avframe)
      })
    }
    this.encoder = null
  }

  public getExtraData() {
    return this.extradata
  }

  public getQueueLength() {
    return this.encoder.encodeQueueSize
  }

  static async isSupported(parameters: pointer<AVCodecParameters>) {
    const config: AudioEncoderConfig = {
      codec: getAudioCodec(parameters),
      sampleRate: parameters.sampleRate,
      numberOfChannels: parameters.chLayout.nbChannels,
      bitrate: static_cast<double>(parameters.bitrate),
      bitrateMode: 'constant'
    }

    const support = await AudioEncoder.isConfigSupported(config)

    return support.supported
  }
}
