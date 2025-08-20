/*
 * libmedia Webcodec video decoder
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

import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import browser from 'common/util/browser'
import getVideoCodec from 'avutil/function/getVideoCodec'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { mapUint8Array } from 'cheap/std/memory'
import AVCodecParameters, { AVCodecParameterFlags } from 'avutil/struct/avcodecparameters'
import { addAVPacketData, getAVPacketData, getAVPacketSideData } from 'avutil/util/avpacket'
import { getHardwarePreference } from 'avutil/function/getHardwarePreference'
import avpacket2EncodedVideoChunk from 'avutil/function/avpacket2EncodedVideoChunk'
import * as logger from 'common/util/logger'
import os from 'common/util/os'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as errorType from 'avutil/error'
import * as array from 'common/util/array'
import { AV_TIME_BASE_Q } from 'avutil/constant'
import { avRescaleQ2 } from 'avutil/util/rational'

export type WebVideoDecoderOptions = {
  onReceiveVideoFrame: (frame: VideoFrame) => void
  onError: (error?: Error) => void
  enableHardwareAcceleration?: boolean
  optimizeForLatency?: boolean
}

export default class WebVideoDecoder {

  private decoder: VideoDecoder | undefined

  private options: WebVideoDecoderOptions
  private parameters: pointer<AVCodecParameters> = nullptr

  private extradata: Uint8Array | undefined

  private currentError: Error | null = null

  private inputQueue: number[]
  private outputQueue: VideoFrame[]
  private dtsQueue: double[]

  private sort: boolean

  private keyframeRequire: boolean = false
  private extradataRequire: boolean = false

  constructor(options: WebVideoDecoderOptions) {

    this.options = options
    this.inputQueue = []
    this.outputQueue = []
    this.dtsQueue = []

    // safari 输出帧在有 B 帧的情况下没有按 pts 排序递增输出，这里需要进行排序输出
    this.sort = !!(browser.safari || os.ios)
  }

  private async output(frame: VideoFrame) {
    if (this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS
      && this.dtsQueue.length
    ) {
      const old = frame
      frame = new VideoFrame(old, {
        timestamp: this.dtsQueue.shift()
      })
      old.close()
    }
    if (this.sort) {
      let i = 0
      for (; i < this.outputQueue.length; i++) {
        if (this.outputQueue[i].timestamp > frame.timestamp) {
          this.outputQueue.splice(i, 0, frame)
          break
        }
      }
      if (i === this.outputQueue.length) {
        this.outputQueue.push(frame)
      }

      while (this.outputQueue.length > 2
        && this.outputQueue[0].timestamp === this.inputQueue[0]
      ) {
        const output = this.outputQueue.shift()!
        if (this.options.onReceiveVideoFrame) {
          this.options.onReceiveVideoFrame(output)
        }
        else {
          output.close()
        }
        this.inputQueue.shift()
      }
    }
    else {
      if (this.options.onReceiveVideoFrame) {
        this.options.onReceiveVideoFrame(frame)
      }
      else {
        frame.close()
      }
    }
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  private changeExtraData(buffer: Uint8Array) {
    if (array.same(buffer, this.extradata!)) {
      return 0
    }

    this.currentError = null

    this.extradata = buffer.slice()

    // safari 创建 webcodecs 解码器需要准确的分辨率
    // 这里更新一下 width 和 height
    if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264) {
      h264.parseAVCodecParameters({
        codecpar: accessof(this.parameters),
        sideData: {},
        metadata: {}
      }, this.extradata)
    }
    else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
      hevc.parseAVCodecParameters({
        codecpar: accessof(this.parameters),
        sideData: {},
        metadata: {}
      }, this.extradata)
    }

    this.decoder!.reset()

    const config: VideoDecoderConfig = {
      codec: getVideoCodec(this.parameters, buffer),
      codedWidth: this.parameters.width,
      codedHeight: this.parameters.height,
      description: this.extradata,
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true)
    }
    if (this.options.optimizeForLatency) {
      config.optimizeForLatency = this.options.optimizeForLatency
    }

    this.decoder!.configure(config)

    if (this.currentError) {
      logger.error(`change extra data error, ${this.currentError}`)
      return errorType.CODEC_NOT_SUPPORT
    }

    this.keyframeRequire = true

    return 0
  }

  public async open(parameters: pointer<AVCodecParameters>): Promise<int32> {
    this.currentError = null
    this.extradata = undefined
    if (parameters.extradata !== nullptr) {
      this.extradata = mapUint8Array(parameters.extradata, reinterpret_cast<size>(parameters.extradataSize)).slice()
    }
    this.parameters = parameters

    const config: VideoDecoderConfig = {
      codec: getVideoCodec(parameters),
      codedWidth: parameters.width,
      codedHeight: parameters.height,
      description: (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) ? undefined : this.extradata,
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true)
    }
    if (this.options.optimizeForLatency) {
      config.optimizeForLatency = this.options.optimizeForLatency
    }

    if (!config.description) {
      // description 不是 arraybuffer 会抛错
      delete config.description
    }

    try {
      const support = await VideoDecoder.isConfigSupported(config)
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

    this.decoder = new VideoDecoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })

    this.decoder.reset()
    this.decoder.configure(config)

    if (this.currentError) {
      logger.error(`open video decoder error, ${this.currentError}`)
      return errorType.CODEC_NOT_SUPPORT
    }

    this.keyframeRequire = true
    if (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) {
      this.extradataRequire = true
    }
    if (this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS) {
      this.sort = false
    }

    this.inputQueue.length = 0
    this.outputQueue.length = 0
    this.dtsQueue.length = 0

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

    const key = avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY

    if (this.keyframeRequire) {
      if (!key) {
        return 0
      }
      if ((this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB)
        && this.extradata
        && this.extradataRequire
      ) {
        if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264) {
          if (!h264.generateAnnexbExtradata(getAVPacketData(avpacket))) {
            const data = h264.annexbAddExtradata(getAVPacketData(avpacket), this.extradata)
            if (data) {
              addAVPacketData(avpacket, data.bufferPointer, data.length)
            }
          }
        }
        else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          if (!hevc.generateAnnexbExtradata(getAVPacketData(avpacket))) {
            const data = hevc.annexbAddExtradata(getAVPacketData(avpacket), this.extradata)
            if (data) {
              addAVPacketData(avpacket, data.bufferPointer, data.length)
            }
          }
        }
        else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_VVC) {
          if (!vvc.generateAnnexbExtradata(getAVPacketData(avpacket))) {
            const data = vvc.annexbAddExtradata(getAVPacketData(avpacket), this.extradata)
            if (data) {
              addAVPacketData(avpacket, data.bufferPointer, data.length)
            }
          }
        }
        this.extradataRequire = false
      }
    }

    const videoChunk = avpacket2EncodedVideoChunk(avpacket)

    const timestamp = videoChunk.timestamp

    if (this.sort) {
      let i = 0
      for (; i < this.inputQueue.length; i++) {
        if (this.inputQueue[i] > timestamp) {
          this.inputQueue.splice(i, 0, timestamp)
          break
        }
      }
      if (i === this.inputQueue.length) {
        this.inputQueue.push(timestamp)
      }
    }

    try {
      this.decoder!.decode(videoChunk)
      if (this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS) {
        this.dtsQueue.push(static_cast<double>(avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_TIME_BASE_Q)))
      }
    }
    catch (error) {
      logger.error(`decode error, ${error}`)
      return errorType.DATA_INVALID
    }

    if (key) {
      this.keyframeRequire = false
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
    }
    catch (error) {
      logger.error(`flush error, ${error}`)
      return errorType.DATA_INVALID
    }
    if (this.sort) {
      while (this.outputQueue.length) {
        const frame = this.outputQueue.shift()!
        if (this.options.onReceiveVideoFrame) {
          this.options.onReceiveVideoFrame(frame)
        }
        else {
          frame.close()
        }
      }
    }
    this.keyframeRequire = true
    return 0
  }

  public close() {
    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close()
    }
    this.decoder = undefined
    this.currentError = null

    if (this.outputQueue?.length) {
      this.outputQueue.forEach((frame) => {
        frame.close()
      })
    }

    this.inputQueue.length = 0
    this.outputQueue.length = 0
  }

  public getQueueLength() {
    return this.decoder?.decodeQueueSize ?? 0
  }

  public setSkipFrameDiscard(discard: number) {

  }

  static async isSupported(parameters: pointer<AVCodecParameters>, enableHardwareAcceleration: boolean) {
    let extradata: Uint8Array | undefined
    if (parameters.extradata !== nullptr) {
      extradata = mapUint8Array(parameters.extradata, reinterpret_cast<size>(parameters.extradataSize)).slice()
    }
    const config = {
      codec: getVideoCodec(parameters),
      codedWidth: parameters.width,
      codedHeight: parameters.height,
      description: (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) ? undefined : extradata,
      hardwareAcceleration: getHardwarePreference(enableHardwareAcceleration ?? true)
    }

    if (!config.description) {
      // description 不是 arraybuffer 会抛错
      delete config.description
    }

    try {
      const support = await VideoDecoder.isConfigSupported(config)
      return support.supported
    }
    catch (error) {
      return false
    }
  }
}
