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
import { createAVPacket, destroyAVPacket, getAVPacketData, getAVPacketSideData } from 'avutil/util/avpacket'
import * as logger from 'common/util/logger'
import * as stack from 'cheap/stack'
import { Rational } from 'avutil/struct/rational'
import { BitFormat } from 'avutil/codecs/h264'
import { videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'
import { createAVFrame, destroyAVFrame, refAVFrame, unrefAVFrame } from 'avutil/util/avframe'
import { mapUint8Array } from 'cheap/std/memory'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import AVBSFilter from 'avformat/bsf/AVBSFilter'
import Annexb2AvccFilter from 'avformat/bsf/h2645/Annexb2AvccFilter'
import support from 'common/util/support'
import isPointer from 'cheap/std/function/isPointer'
import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import { AVDictionary } from 'avutil/struct/avdict'
import { Data } from 'common/types/type'
import * as object from 'common/util/object'
import * as dict from 'avutil/util/avdict'
import * as is from 'common/util/is'
import { avMallocz } from 'avutil/util/mem'
import { avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as errorType from 'avutil/error'

export type WasmVideoEncoderOptions = {
  resource: WebAssemblyResource
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  avpacketPool?: AVPacketPool
}

export default class WasmVideoEncoder {

  private options: WasmVideoEncoderOptions

  private encoder: WebAssemblyRunner
  private parameters: pointer<AVCodecParameters> = nullptr
  private timeBase: Rational | undefined
  private framerateTimebase: Rational | undefined
  private inputCounter: int64 = 0n

  private avpacket: pointer<AVPacket> = nullptr

  private avframe: pointer<AVFrame> = nullptr

  private encodeQueueSize: number = 0

  private bitrateFilter: AVBSFilter | undefined

  private extradata: Uint8Array | null = null

  private encoderOptions: pointer<AVDictionary> = nullptr

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
            timeBaseP.num = this.timeBase!.num
            timeBaseP.den = this.timeBase!.den
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
      else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_AV1) {
        if (!this.extradata) {
          this.extradata = av1.generateExtradata(this.parameters, getAVPacketData(this.avpacket))
        }
      }
      else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_VP9) {
        if (!this.extradata) {
          this.extradata = vp9.generateExtradata(this.parameters)
        }
      }

      this.avpacket.timeBase.den = this.timeBase!.den
      this.avpacket.timeBase.num = this.timeBase!.num
      this.avpacket.duration = avRescaleQ(1n, this.framerateTimebase!, this.timeBase!)

      this.options.onReceiveAVPacket(this.avpacket)
      this.avpacket = nullptr
      this.encodeQueueSize--
    }
  }

  private receiveAVPacket() {
    return this.encoder.invoke<int32>('encoder_receive', this.getAVPacket())
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational, threadCount: number = 1, opts: Data = {}): Promise<int32> {
    await this.encoder.run(undefined, threadCount)

    const timeBaseP = reinterpret_cast<pointer<Rational>>(malloc(sizeof(Rational)))
    const optsP = reinterpret_cast<pointer<pointer<AVDictionary>>>(malloc(sizeof(pointer)))

    timeBaseP.num = timeBase.num
    timeBaseP.den = timeBase.den
    accessof(optsP) <- nullptr

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_MPEG4 && parameters.bitFormat === BitFormat.AVCC) {
      this.encoder.invoke('encoder_set_flags', 1 << 22)
    }
    this.encoder.invoke('encoder_set_max_b_frame', parameters.videoDelay)

    if (object.keys(opts).length) {
      if (this.encoderOptions) {
        dict.freeAVDict2(this.encoderOptions)
        free(this.encoderOptions)
        this.encoderOptions = nullptr
      }
      this.encoderOptions = reinterpret_cast<pointer<AVDictionary>>(avMallocz(sizeof(AVDictionary)))
      object.each(opts, (value, key) => {
        if (is.string(value) || is.string(key)) {
          dict.avDictSet(this.encoderOptions, key, value)
        }
      })
      accessof(optsP) <- this.encoderOptions
    }

    let ret = 0

    if (support.jspi) {
      ret = await this.encoder.invokeAsync<int32>('encoder_open', parameters, timeBaseP, threadCount, optsP)
    }
    else {
      ret = this.encoder.invoke<int32>('encoder_open', parameters, timeBaseP, threadCount, optsP)
      await this.encoder.childThreadsReady()
    }

    this.encoderOptions = accessof(optsP)

    free(optsP)
    free(timeBaseP)

    if (ret < 0) {
      logger.error(`open video encoder failed, ret: ${ret}`)
      return errorType.CODEC_NOT_SUPPORT
    }

    this.parameters = parameters
    this.timeBase = timeBase
    this.inputCounter = 0n
    this.framerateTimebase = {
      den: parameters.framerate.num,
      num: parameters.framerate.den
    }

    this.encodeQueueSize = 0
    return 0
  }

  private preEncode(frame: pointer<AVFrame>, key: boolean): pointer<AVFrame> {
    if (this.avframe) {
      unrefAVFrame(this.avframe)
    }
    else {
      this.avframe = createAVFrame()
    }
    refAVFrame(this.avframe, frame)
    frame = this.avframe

    if (key) {
      frame.pictType = AVPictureType.AV_PICTURE_TYPE_I
    }

    if (frame.pts !== NOPTS_VALUE_BIGINT && frame.timeBase.den !== 0 && frame.timeBase.num !== 0) {
      frame.pts = avRescaleQ2(frame.pts, addressof(frame.timeBase), this.timeBase!)
    }
    else {
      frame.pts = avRescaleQ(this.inputCounter, this.framerateTimebase!, this.timeBase!)
    }
    this.inputCounter++
    frame.timeBase.den = this.timeBase!.den
    frame.timeBase.num = this.timeBase!.num

    return frame
  }

  private postEncode() {
    this.encodeQueueSize++
    while (true) {
      let ret = this.receiveAVPacket()
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

  public async encodeAsync(frame: pointer<AVFrame>, key: boolean): Promise<int32> {
    frame = this.preEncode(frame, key)

    let ret = await this.encoder.invokeAsync<int32>('encoder_encode', frame)
    if (ret) {
      return ret
    }
    return this.postEncode()
  }

  public encode(frame: pointer<AVFrame>, key: boolean): int32 {
    frame = this.preEncode(frame, key)

    let ret = this.encoder.invoke<int32>('encoder_encode', frame)
    if (ret) {
      return ret
    }

    return this.postEncode()
  }

  public async flush(): Promise<int32> {
    this.encoder.invoke('encoder_flush')
    while (1) {
      const ret = this.receiveAVPacket()
      if (ret < 1) {
        return ret
      }
      this.outputAVPacket()
    }
    return 0
  }

  public getExtraData() {
    if (this.extradata) {
      return this.extradata
    }

    const pointer = this.encoder.invoke<pointer<uint8>>('encoder_get_extradata')
    const size = this.encoder.invoke<int32>('encoder_get_extradata_size')
    if (pointer && size) {
      return mapUint8Array(pointer, reinterpret_cast<size>(size)).slice()
    }
    return null
  }

  public getColorSpace() {
    return {
      colorSpace: this.encoder.invoke<int32>('encoder_get_color_space'),
      colorPrimaries: this.encoder.invoke<int32>('encoder_get_color_primaries'),
      colorTrc: this.encoder.invoke<int32>('encoder_get_color_trc')
    }
  }

  public close() {
    this.encoder.invoke('encoder_close')
    this.encoder.destroy()

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
      this.bitrateFilter = undefined
    }
    if (this.encoderOptions) {
      dict.freeAVDict2(this.encoderOptions)
      free(this.encoderOptions)
      this.encoderOptions = nullptr
    }
  }

  public getQueueLength() {
    return this.encodeQueueSize
  }

  public getChildThreadCount() {
    if (this.encoder) {
      return this.encoder.getChildThreadCount()
    }
    return 0
  }
}
