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

import {
  type AVCodecParameters,
  type AVPacket,
  type AVPacketPool,
  type AVPacketRef,
  type AVFrame,
  createAVPacket,
  destroyAVPacket,
  getAVPacketData,
  getAVPacketSideData,
  AVDictionary,
  avdict,
  avMallocz,
  errorType,
  createAVFrame,
  destroyAVFrame,
  refAVFrame,
  unrefAVFrame,
  AVRational,
  avRescaleQ,
  avRescaleQ2,
  NOPTS_VALUE_BIGINT,
  AVPacketFlags,
  AVCodecParameterFlags,
  AVPictureType,
  AVCodecID,
  AVPacketSideDataType
} from '@libmedia/avutil'

import {
  av1,
  vp9
} from '@libmedia/avutil/internal'

import {
  type WebAssemblyResource,
  WebAssemblyRunner,
  mapUint8Array,
  stack
} from '@libmedia/cheap'

import { logger, support, object, is, type Data } from '@libmedia/common'
import { type AVBSFilter, Annexb2AvccFilter } from '@libmedia/avformat/internal'

export type WasmVideoEncoderOptions = {
  resource: WebAssemblyResource
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  avpacketPool?: AVPacketPool
  copyTs?: boolean
}

export default class WasmVideoEncoder {

  private options: WasmVideoEncoderOptions

  private encoder: WebAssemblyRunner
  private parameters: pointer<AVCodecParameters> = nullptr
  private timeBase: AVRational | undefined
  private framerateTimebase: AVRational | undefined
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
        this.avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB
        if (!(this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB)) {
          if (!this.bitrateFilter) {
            this.bitrateFilter = new Annexb2AvccFilter()
            const timeBaseP = reinterpret_cast<pointer<AVRational>>(stack.malloc(sizeof(AVRational)))
            timeBaseP.num = this.timeBase!.num
            timeBaseP.den = this.timeBase!.den
            this.bitrateFilter.init(this.parameters, timeBaseP)
            stack.free(sizeof(AVRational))
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

  private receiveAVPacketAsync() {
    return this.encoder.invokeAsync<int32>('encoder_receive', this.getAVPacket())
  }

  /**
   * 打开编码器
   * 
   * @param parameters 
   * @param timeBase 
   * @param threadCount 
   * @param opts 
   * @returns 
   */
  public async open(parameters: pointer<AVCodecParameters>, timeBase: AVRational, threadCount: number = 1, opts: Data = {}): Promise<int32> {
    await this.encoder.run(undefined, threadCount)

    const timeBaseP = reinterpret_cast<pointer<AVRational>>(malloc(sizeof(AVRational)))
    const optsP = reinterpret_cast<pointer<pointer<AVDictionary>>>(malloc(sizeof(pointer)))

    timeBaseP.num = timeBase.num
    timeBaseP.den = timeBase.den
    accessof(optsP) <- nullptr

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_MPEG4 && !(parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB)) {
      this.encoder.invoke('encoder_set_flags', 1 << 22)
    }
    this.encoder.invoke('encoder_set_max_b_frame', parameters.videoDelay)

    if (object.keys(opts).length) {
      if (this.encoderOptions) {
        avdict.freeAVDict2(this.encoderOptions)
        free(this.encoderOptions)
        this.encoderOptions = nullptr
      }
      this.encoderOptions = reinterpret_cast<pointer<AVDictionary>>(avMallocz(sizeof(AVDictionary)))
      object.each(opts, (value, key) => {
        if (is.string(value) || is.string(key)) {
          avdict.avDictSet(this.encoderOptions, key, value)
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

    if (this.options.copyTs
      && frame.pts !== NOPTS_VALUE_BIGINT
      && frame.timeBase.den !== 0
      && frame.timeBase.num !== 0
    ) {
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

  /**
   * 同步编码
   * 
   * 多线程解码时可能会阻塞当前线程，若在浏览器环境请保证在 worker 中调用
   * 
   * @param frame 
   * @param key 
   * @returns 
   */
  public encode(frame: pointer<AVFrame>, key: boolean): int32 {
    frame = this.preEncode(frame, key)

    let ret = this.encoder.invoke<int32>('encoder_encode', frame)
    if (ret) {
      return ret
    }
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

  /**
   * 异步编码
   * 
   * 支持在浏览器主线程中进行多线程编码，需要支持 JSPI 和 Atomics.waitAsync
   * 
   * @param frame 
   * @param key 
   * @returns 
   */
  public async encodeAsync(frame: pointer<AVFrame>, key: boolean): Promise<int32> {
    frame = this.preEncode(frame, key)

    let ret = await this.encoder.invokeAsync<int32>('encoder_encode', frame)
    if (ret) {
      return ret
    }
    this.encodeQueueSize++
    while (true) {
      let ret = await this.receiveAVPacketAsync()
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

  /**
   * 刷出编码队列中所有缓存的包
   * 
   * @returns 
   */
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

  /**
   * 刷出编码队列中所有缓存的包
   * 
   * 在浏览器环境主线程做多线程编码使用此方法，需要支持 JSPI 和 Atomics.waitAsync
   * 
   * @returns 
   */
  public async flushAsync(): Promise<int32> {
    await this.encoder.invokeAsync('encoder_flush')
    while (1) {
      const ret = await this.receiveAVPacketAsync()
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
      avdict.freeAVDict2(this.encoderOptions)
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
