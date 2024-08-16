/*
 * libmedia wasm audio encoder
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
import AVFrame from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import AVPacket, { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { createAVPacket, destroyAVPacket } from 'avutil/util/avpacket'
import * as logger from 'common/util/logger'
import { audioData2AVFrame } from 'avutil/function/audioData2AVFrame'
import * as stack from 'cheap/stack'
import { createAVFrame, destroyAVFrame, getAudioBuffer, unrefAVFrame } from 'avutil/util/avframe'
import { Rational } from 'avutil/struct/rational'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { getBytesPerSample, sampleFormatIsPlanar, sampleSetSilence } from 'avutil/util/sample'
import { AVSampleFormat } from 'avutil/audiosamplefmt'
import { avRescaleQ } from 'avutil/util/rational'
import support from 'common/util/support'
import isPointer from 'cheap/std/function/isPointer'
import { AVDictionary } from 'avutil/struct/avdict'
import { Data } from 'common/types/type'
import * as object from 'common/util/object'
import * as dict from 'avutil/util/avdict'
import * as is from 'common/util/is'
import { avMallocz } from 'avutil/util/mem'

export type WasmAudioEncoderOptions = {
  resource: WebAssemblyResource
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  avpacketPool?: AVPacketPool
}

class AudioFrameResizer {

  private parameters: pointer<AVCodecParameters>

  private data: Uint8Array[]

  private planes: int32

  private pos: int32
  private posEnd: int32

  private bufferLength: int32
  private bytesPerSample: int32
  private planar: boolean
  private channels: int32
  private frameSize: int32

  private pts: int64

  constructor(parameters: pointer<AVCodecParameters>, frameSize: int32) {
    this.parameters = parameters
    this.frameSize = frameSize

    this.planar = sampleFormatIsPlanar(parameters.format as AVSampleFormat)
    this.planes = this.planar ? parameters.chLayout.nbChannels : 1
    this.channels = parameters.chLayout.nbChannels

    this.bufferLength = 500 * 1024
    this.data = []
    for (let i = 0; i < this.planes; i++) {
      this.data[i] = new Uint8Array(this.bufferLength)
    }
    this.pos = 0
    this.posEnd = 0
    this.bytesPerSample = getBytesPerSample(parameters.format as AVSampleFormat)
    this.pts = 0n
  }

  public sendAVFrame(avframe: pointer<AVFrame>) {
    const size = avframe.nbSamples * this.bytesPerSample * (this.planar ? 1 : this.channels)
    if (this.posEnd + size >= this.bufferLength) {
      const len = this.posEnd - this.pos
      for (let i = 0; i < this.planes; i++) {
        this.data[i].set(this.data[i].subarray(this.pos, this.posEnd), 0)
      }
      this.pos = 0
      this.posEnd = len
    }

    for (let i = 0; i < this.planes; i++) {
      this.data[i].set(mapUint8Array(avframe.data[i], size), this.posEnd)
    }

    this.posEnd += size
  }

  public remainFrameSize() {
    const step = this.bytesPerSample * (this.planar ? 1 : this.channels)
    return (this.posEnd - this.pos) / step
  }

  private handleData(avframe: pointer<AVFrame>, size: int32) {
    unrefAVFrame(avframe)

    avframe.sampleRate = this.parameters.sampleRate
    avframe.nbSamples = this.frameSize
    avframe.chLayout.nbChannels = this.parameters.chLayout.nbChannels
    avframe.format = this.parameters.format
    avframe.pts = this.pts
    avframe.timeBase.den = this.parameters.sampleRate
    avframe.timeBase.num = 1

    getAudioBuffer(avframe)

    for (let i = 0; i < this.planes; i++) {
      memcpyFromUint8Array(avframe.data[i], avframe.linesize[0], this.data[i].subarray(this.pos, this.pos + size))
    }

    this.pos += size
    this.pts += static_cast<int64>(this.frameSize)
  }

  public receiveAVFrame(avframe: pointer<AVFrame>) {
    const size = this.frameSize * this.bytesPerSample * (this.planar ? 1 : this.channels)
    const remainingSize = (this.posEnd - this.pos)
    if (remainingSize < size) {
      return -1
    }
    this.handleData(avframe, size)
    return 0
  }

  public flush(avframe: pointer<AVFrame>) {
    const size = this.posEnd - this.pos
    const frameSize = size / (this.bytesPerSample * (this.planar ? 1 : this.channels))
    this.handleData(avframe, size)
    sampleSetSilence(
      addressof(avframe.data),
      frameSize,
      this.parameters.format as AVSampleFormat,
      this.frameSize - frameSize,
      this.parameters.chLayout.nbChannels
    )
    return 0
  }
}

export default class WasmAudioEncoder {

  private options: WasmAudioEncoderOptions

  private encoder: WebAssemblyRunner
  private parameters: pointer<AVCodecParameters>
  private timeBase: Rational

  private avpacket: pointer<AVPacket>

  private avframe: pointer<AVFrame>

  private pts: int64
  private frameSize: int32
  private audioFrameResizer: AudioFrameResizer

  private encoderOptions: pointer<AVDictionary> = nullptr

  constructor(options: WasmAudioEncoderOptions) {
    this.options = options
    this.encoder = new WebAssemblyRunner(this.options.resource)
  }

  private getAVPacket() {
    if (this.avpacket) {
      return this.avpacket
    }
    return this.avpacket = this.options.avpacketPool ? this.options.avpacketPool.alloc() : createAVPacket()
  }

  private outputAVPacket() {
    if (this.avpacket) {
      this.avpacket.pts = this.pts
      this.avpacket.dts = this.pts
      this.pts += this.avpacket.duration
      this.avpacket.timeBase.den = this.timeBase.den
      this.avpacket.timeBase.num = this.timeBase.num
      this.options.onReceiveAVPacket(this.avpacket)
      this.avpacket = nullptr
    }
  }

  private receiveAVPacket() {
    return this.encoder.call<int32>('encoder_receive', this.getAVPacket())
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational, opts: Data = {}) {
    await this.encoder.run()

    const timeBaseP = reinterpret_cast<pointer<Rational>>(stack.malloc(sizeof(Rational)))

    timeBaseP.num = timeBase.num
    timeBaseP.den = timeBase.den

    this.encoder.call('encoder_set_flags', 1 << 22)

    if (object.keys(opts).length) {
      if (this.encoderOptions) {
        dict.freeAVDict2(this.encoderOptions)
        free(this.encoderOptions)
        this.encoderOptions = nullptr
      }
      this.encoderOptions = avMallocz(sizeof(AVDictionary))
      object.each(opts, (value, key) => {
        if (is.string(value) || is.string(key)) {
          dict.avDictSet(this.encoderOptions, key, value)
        }
      })
    }

    let ret = 0

    if (support.jspi) {
      ret = await this.encoder.callAsync<int32>('encoder_open', parameters, timeBaseP, 1, this.encoderOptions)
    }
    else {
      ret = this.encoder.call<int32>('encoder_open', parameters, timeBaseP, 1, this.encoderOptions)
      await this.encoder.childrenThreadReady()
    }

    this.frameSize = this.encoder.call<int32>('encoder_get_framesize_size')

    stack.free(sizeof(Rational))

    if (ret < 0) {
      logger.fatal(`open audio encoder failed, ret: ${ret}`)
    }
    await this.encoder.childrenThreadReady()

    this.parameters = parameters
    this.timeBase = timeBase

    this.pts = 0n
  }

  private encode_(avframe: pointer<AVFrame>) {
    let ret = this.encoder.call<int32>('encoder_encode', avframe)
    if (ret) {
      return ret
    }
    while (true) {
      ret = this.receiveAVPacket()
      if (ret === 1) {
        this.outputAVPacket()
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

  public encode(avframe: pointer<AVFrame> | AudioData) {

    if (!isPointer(avframe)) {
      if (this.avframe) {
        unrefAVFrame(this.avframe)
      }
      else {
        this.avframe = createAVFrame()
      }
      avframe = audioData2AVFrame(avframe, this.avframe)
    }

    avframe.timeBase.den = this.timeBase.den
    avframe.timeBase.num = this.timeBase.num

    if (this.frameSize > 0 && avframe.nbSamples !== this.frameSize || this.audioFrameResizer) {
      if (!this.audioFrameResizer) {
        this.audioFrameResizer = new AudioFrameResizer(this.parameters, this.frameSize)
      }
      this.audioFrameResizer.sendAVFrame(avframe)
      while (true) {
        let ret = this.audioFrameResizer.receiveAVFrame(avframe)
        if (ret < 0) {
          return 0
        }
        avframe.pts = avRescaleQ(avframe.pts, avframe.timeBase, this.timeBase)
        this.encode_(avframe)
      }
    }
    else {
      return this.encode_(avframe)
    }
  }

  public async flush() {
    if (this.audioFrameResizer && this.audioFrameResizer.remainFrameSize() > 0) {
      const avframe = createAVFrame()
      this.audioFrameResizer.flush(avframe)
      avframe.pts = avRescaleQ(avframe.pts, avframe.timeBase, this.timeBase)
      this.encode_(avframe)
      destroyAVFrame(avframe)
    }

    this.encoder.call('encoder_flush')
    while (1) {
      const ret = this.receiveAVPacket()
      if (ret < 1) {
        return
      }
      this.outputAVPacket()
    }
  }

  public getExtraData() {
    const pointer = this.encoder.call<pointer<uint8>>('encoder_get_extradata')
    const size = this.encoder.call<int32>('encoder_get_extradata_size')

    if (pointer && size) {
      return mapUint8Array(pointer, size).slice()
    }
    return null
  }

  public close() {
    this.encoder.call('encoder_close')
    this.encoder.destroy()
    this.encoder = null

    if (this.avpacket) {
      this.options.avpacketPool
        ? this.options.avpacketPool.release(this.avpacket as pointer<AVPacketRef>)
        : destroyAVPacket(this.avpacket)
      this.avpacket = nullptr
    }

    if (this.avframe) {
      destroyAVFrame(this.avframe)
      this.avframe = nullptr
    }
    if (this.encoderOptions) {
      dict.freeAVDict2(this.encoderOptions)
      free(this.encoderOptions)
      this.encoderOptions = nullptr
    }
  }
}
