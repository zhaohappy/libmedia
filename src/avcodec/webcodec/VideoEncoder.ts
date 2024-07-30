/*
 * libmedia Webcodec video encoder
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

import AVPacket, { AVPacketPool } from 'avutil/struct/avpacket'
import { AVCodecID } from 'avutil/codec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVFrame, { AVFramePool, AVFrameRef } from 'avutil/struct/avframe'
import getVideoCodec from '../function/getVideoCodec'
import { getHardwarePreference } from '../function/getHardwarePreference'
import { avQ2D, avRescaleQ } from 'avutil/util/rational'
import * as is from 'common/util/is'
import { avframe2VideoFrame } from 'avutil/function/avframe2VideoFrame'
import { createAVPacket, getAVPacketData } from 'avutil/util/avpacket'
import { AV_MILLI_TIME_BASE, AV_MILLI_TIME_BASE_Q, AV_TIME_BASE_Q } from 'avutil/constant'
import { BitFormat } from 'avformat/codecs/h264'
import { PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { Rational } from 'avutil/struct/rational'
import encodedVideoChunk2AVPacket from 'avutil/function/encodedVideoChunk2AVPacket'
import { mapColorPrimaries, mapColorSpace, mapColorTrc } from 'avutil/function/videoFrame2AVFrame'

import * as av1 from 'avformat/codecs/av1'
import * as vp9 from 'avformat/codecs/vp9'

export type WebVideoEncoderOptions = {
  onReceivePacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  enableHardwareAcceleration?: boolean
  avpacketPool?: AVPacketPool
  avframePool?: AVFramePool
}

export default class WebVideoEncoder {

  private encoder: VideoEncoder

  private options: WebVideoEncoderOptions
  private parameters: pointer<AVCodecParameters>
  private timeBase: Rational

  private currentError: Error

  private avframeMap: Map<int64, pointer<AVFrame>>

  private framerate: int64

  private inputCounter: int64
  private outputCounter: int64

  private extradata: Uint8Array

  constructor(options: WebVideoEncoderOptions) {

    this.options = options

    this.avframeMap = new Map()
  }

  private async output(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata & {
    svc?: {
      temporalLayerId: number
    }
    alphaSideData?: BufferSource
  }) {

    const inputCounter = static_cast<int64>(chunk.timestamp)
    const pts = inputCounter * 1000000n / this.framerate
    const dts = static_cast<int64>(this.outputCounter++) * 1000000n / this.framerate

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
      if (metadata?.decoderConfig?.colorSpace) {
        this.parameters.colorSpace = mapColorSpace(metadata.decoderConfig.colorSpace.matrix)
        this.parameters.colorPrimaries = mapColorPrimaries(metadata.decoderConfig.colorSpace.primaries)
        this.parameters.colorTrc = mapColorTrc(metadata.decoderConfig.colorSpace.transfer)
      }

      encodedVideoChunk2AVPacket(chunk, avpacket)

      if (!this.extradata) {
        let extradata: Uint8Array
        if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_AV1) {
          extradata = av1.generateExtradata(this.parameters, getAVPacketData(avpacket))
        }
        else if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_VP9) {
          extradata = vp9.generateExtradata(this.parameters)
        }
        if (extradata) {
          this.extradata = extradata
        }
      }
    }
    else {
      encodedVideoChunk2AVPacket(chunk, avpacket, metadata)
    }

    avpacket.pts = avRescaleQ(pts, AV_TIME_BASE_Q, this.timeBase)
    avpacket.dts = avRescaleQ(dts, AV_TIME_BASE_Q, this.timeBase)
    avpacket.timeBase.den = this.timeBase.den
    avpacket.timeBase.num = this.timeBase.num

    if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || this.parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || this.parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      avpacket.bitFormat = this.parameters.bitFormat
    }

    this.options.onReceivePacket(avpacket)

    const avframe = this.avframeMap.get(inputCounter)

    if (avframe) {
      this.options.avframePool
        ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        : destroyAVFrame(avframe)
    }
    this.avframeMap.delete(inputCounter)
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational) {
    this.currentError = null

    const descriptor = PixelFormatDescriptorsMap[parameters.format]

    // webcodecs 目前还不支持 hdr
    if (!descriptor || descriptor.comp[0].depth > 8) {
      throw new Error(`format ${parameters.format} not support`)
    }

    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: static_cast<double>(parameters.bitRate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true),
      latencyMode: parameters.videoDelay ? 'quality' : 'realtime',
      alpha: descriptor && (descriptor.flags & PixelFormatFlags.ALPHA) ? 'keep' : 'discard'
    }

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      config.avc = {
        format: parameters.bitFormat === BitFormat.AVCC ? 'avc' : 'annexb'
      }
    }

    const support = await VideoEncoder.isConfigSupported(config)

    if (!support.supported) {
      throw new Error('not support')
    }

    if (this.encoder && this.encoder.state !== 'closed') {
      this.encoder.close()
    }

    this.encoder = new VideoEncoder({
      output: this.output.bind(this),
      error: this.error.bind(this)
    })

    this.encoder.reset()
    this.encoder.configure(config)

    if (this.currentError) {
      throw this.currentError
    }

    this.parameters = parameters
    this.timeBase = timeBase
    this.inputCounter = 0n
    this.outputCounter = 0n
    this.framerate = static_cast<int64>(avQ2D(parameters.framerate))
  }

  public encode(frame: VideoFrame | pointer<AVFrame>, key: boolean) {
    if (is.number(frame)) {
      const cache = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
      refAVFrame(cache, frame)
      cache.pts = this.inputCounter
      if (cache.duration) {
        cache.duration = avRescaleQ(cache.duration, frame.timeBase, AV_TIME_BASE_Q)
      }
      else {
        cache.duration = 1000000n / this.framerate
      }
      this.avframeMap.set(cache.pts, cache)
      frame = avframe2VideoFrame(cache)
    }
    else {
      frame = new VideoFrame(frame, {
        timestamp: static_cast<double>(this.inputCounter),
        duration: static_cast<double>(1000000n / this.framerate)
      })
    }
    try {
      this.encoder.encode(frame, {
        keyFrame: key
      })
      frame.close()
      this.inputCounter++
      return 0
    }
    catch (error) {
      frame.close()
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
    if (this.avframeMap.size) {
      this.avframeMap.forEach((avframe) => {
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

  public getColorSpace() {
    return {
      colorSpace: this.parameters.colorSpace,
      colorPrimaries: this.parameters.colorPrimaries,
      colorTrc: this.parameters.colorTrc,
    }
  }

  public getQueueLength() {
    return this.encoder.encodeQueueSize
  }

  static async isSupported(parameters: pointer<AVCodecParameters>, enableHardwareAcceleration: boolean) {
    const descriptor = PixelFormatDescriptorsMap[parameters.format]
    // webcodecs 目前还不支持 hdr
    if (!descriptor || descriptor.comp[0].depth > 8) {
      return false
    }
    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: static_cast<double>(parameters.bitRate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(enableHardwareAcceleration ?? true),
      latencyMode: parameters.videoDelay ? 'quality' : 'realtime',
      alpha: descriptor && (descriptor.flags & PixelFormatFlags.ALPHA) ? 'keep' : 'discard'
    }

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      config.avc = {
        format: parameters.bitFormat === BitFormat.AVCC ? 'avc' : 'annexb'
      }
    }

    const support = await VideoEncoder.isConfigSupported(config)

    return support.supported
  }
}
