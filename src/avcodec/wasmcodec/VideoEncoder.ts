/*
 * libmedia wasm video encoder
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
import AVFrame, { AVPictureType } from 'avutil/struct/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import WebAssemblyRunner from 'cheap/webassembly/WebAssemblyRunner'
import AVPacket, { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { createAVPacket, destroyAVPacket, getAVPacketSideData } from 'avutil/util/avpacket'
import * as logger from 'common/util/logger'
import * as stack from 'cheap/stack'
import { Rational } from 'avutil/struct/rational'
import * as is from 'common/util/is'
import { BitFormat } from 'avformat/codecs/h264'
import { videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'
import { createAVFrame, destroyAVFrame, unrefAVFrame } from 'avutil/util/avframe'
import { mapUint8Array } from 'cheap/std/memory'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import { avQ2D } from 'avutil/util/rational'
import AVBSFilter from 'avformat/bsf/AVBSFilter'
import Annexb2AvccFilter from 'avformat/bsf/h2645/Annexb2AvccFilter'

export type WasmVideoEncoderOptions = {
  resource: WebAssemblyResource
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  avpacketPool?: AVPacketPool
}

export default class WasmVideoEncoder {

  private options: WasmVideoEncoderOptions

  private encoder: WebAssemblyRunner
  private parameters: pointer<AVCodecParameters>
  private timeBase: Rational

  private avpacket: pointer<AVPacket>

  private avframe: pointer<AVFrame>

  private encodeQueueSize: number
  private framerate: int64
  private inputCounter: int64

  private bitrateFilter: AVBSFilter

  private extradata: Uint8Array

  constructor(options: WasmVideoEncoderOptions) {
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
      if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264
        || this.parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || this.parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
      ) {
        // wasm 编码器给出的是 annexb 码流
        if (this.parameters.bitFormat === BitFormat.AVCC) {
          if (!this.bitrateFilter) {
            this.bitrateFilter = new Annexb2AvccFilter()
            const timeBaseP = reinterpret_cast<pointer<Rational>>(stack.malloc(sizeof(Rational)))
            timeBaseP.num = this.timeBase.num
            timeBaseP.den = this.timeBase.den
            this.bitrateFilter.init(this.parameters, timeBaseP)
            stack.free(sizeof(Rational))
          }
          this.bitrateFilter.sendAVPacket(this.avpacket)
          this.bitrateFilter.receiveAVPacket(this.avpacket)
        }

        if (!this.extradata) {
          const ele = getAVPacketSideData(this.avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
          if (ele) {
            this.extradata = mapUint8Array(ele.data, ele.size).slice()
          }
        }
        this.avpacket.bitFormat = this.parameters.bitFormat
      }
      this.avpacket.timeBase.den = this.timeBase.den
      this.avpacket.timeBase.num = this.timeBase.num
      this.options.onReceiveAVPacket(this.avpacket)
      this.avpacket = nullptr
      this.encodeQueueSize--
    }
  }

  private receiveAVPacket() {
    return this.encoder.call<int32>('encoder_receive', this.getAVPacket())
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational, threadCount: number = 1) {
    await this.encoder.run(null, threadCount)

    const timeBaseP = reinterpret_cast<pointer<Rational>>(stack.malloc(sizeof(Rational)))

    timeBaseP.num = timeBase.num
    timeBaseP.den = timeBase.den
    
    if (parameters.codecId === AVCodecID.AV_CODEC_ID_MPEG4) {
      this.encoder.call('encoder_set_flags', 1 << 22)
    }
    this.encoder.call('encoder_set_max_b_frame', parameters.videoDelay)

    let ret = this.encoder.call<int32>('encoder_open', parameters, timeBaseP, threadCount)

    stack.free(sizeof(Rational))

    if (ret < 0) {
      logger.fatal(`open video decoder failed, ret: ${ret}`)
    }
    await this.encoder.childrenThreadReady()

    this.parameters = parameters
    this.timeBase = timeBase

    this.encodeQueueSize = 0
    this.framerate = static_cast<int64>(avQ2D(parameters.framerate))
    this.inputCounter = 0n
  }

  public encode(frame: pointer<AVFrame> | VideoFrame, key: boolean) {

    if (!is.number(frame)) {
      if (this.avframe) {
        unrefAVFrame(this.avframe)
      }
      else {
        this.avframe = createAVFrame()
      }
      frame = videoFrame2AVFrame(frame, this.avframe)
    }

    if (key) {
      frame.pictType = AVPictureType.AV_PICTURE_TYPE_I
    }

    frame.duration = static_cast<int64>(this.timeBase.den) / this.framerate
    frame.pts = this.inputCounter * static_cast<int64>(this.timeBase.den / this.timeBase.num) / this.framerate
    frame.timeBase.den = this.timeBase.den
    frame.timeBase.num = this.timeBase.num

    let ret = this.encoder.call<int32>('encoder_encode', frame)
    this.encodeQueueSize++
    this.inputCounter++

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

  public async flush() {
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
    if (this.extradata) {
      return this.extradata
    }

    const pointer = this.encoder.call<pointer<uint8>>('encoder_get_extradata')
    const size = this.encoder.call<int32>('encoder_get_extradata_size')
    if (pointer && size) {
      return mapUint8Array(pointer, size).slice()
    }
    return null
  }

  public getColorSpace() {
    return {
      colorSpace: this.encoder.call<int32>('encoder_get_color_space'),
      colorPrimaries: this.encoder.call<int32>('encoder_get_color_primaries'),
      colorTrc: this.encoder.call<int32>('encoder_get_color_trc')
    }
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
    if (this.bitrateFilter) {
      this.bitrateFilter.destroy()
      this.bitrateFilter = null
    }
  }

  public getQueueLength() {
    return this.encodeQueueSize
  }
}
