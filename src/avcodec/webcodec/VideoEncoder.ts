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
import getVideoCodec from 'avutil/function/getVideoCodec'
import { getHardwarePreference } from 'avutil/function/getHardwarePreference'
import { avQ2D, avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import { avframe2VideoFrame } from 'avutil/function/avframe2VideoFrame'
import { createAVPacket, getAVPacketData } from 'avutil/util/avpacket'
import { BitFormat } from 'avutil/codecs/h264'
import { getAVPixelFormatDescriptor, AVPixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { Rational } from 'avutil/struct/rational'
import encodedVideoChunk2AVPacket from 'avutil/function/encodedVideoChunk2AVPacket'
import { mapColorPrimaries, mapColorSpace, mapColorTrc } from 'avutil/function/videoFrame2AVFrame'
import browser from 'common/util/browser'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'

import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import isPointer from 'cheap/std/function/isPointer'
import { AV_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVPixelFormat } from 'avutil/pixfmt'

export type WebVideoEncoderOptions = {
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  enableHardwareAcceleration?: boolean
  avpacketPool?: AVPacketPool
  avframePool?: AVFramePool
}

// chrome bug: https://issues.chromium.org/issues/357902526
function fixChromeConstraintSetFlagsBug(desc: Uint8Array) {
  const constraintSetFlag = desc[2]
  // 如果最高位是 0，最低位是 1，说明是 chrome 将这个值的二进制顺序搞反了
  if (constraintSetFlag >> 7 === 0 && (constraintSetFlag & 1) === 1) {
    let binaryString = constraintSetFlag
      .toString(2)
      .padStart(8, '0')
      .split('')
      .reverse()
      .join('')

    desc[2] = parseInt(binaryString, 2)
  }
}

export default class WebVideoEncoder {

  private encoder: VideoEncoder | undefined

  private options: WebVideoEncoderOptions
  private parameters: pointer<AVCodecParameters> = nullptr
  private timeBase: Rational | undefined

  private currentError: Error | null = null

  private avframeMap: Map<int64, pointer<AVFrame>>

  private framerateTimebase: Rational | undefined

  private inputCounter: int64 = 0n
  private outputCounter: int64 = 0n

  private extradata: Uint8Array | undefined

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

    const pts = static_cast<int64>(chunk.timestamp as uint32)
    const dts = avRescaleQ(this.outputCounter++, this.framerateTimebase!, this.timeBase!)

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
        if (browser.chrome && !browser.checkVersion(browser.version, '130', true)) {
          fixChromeConstraintSetFlagsBug(buffer)
        }
        this.extradata = buffer
      }
      if (metadata?.decoderConfig?.colorSpace) {
        this.parameters.colorSpace = mapColorSpace(metadata.decoderConfig.colorSpace.matrix || '')
        this.parameters.colorPrimaries = mapColorPrimaries(metadata.decoderConfig.colorSpace.primaries || '')
        this.parameters.colorTrc = mapColorTrc(metadata.decoderConfig.colorSpace.transfer || '')
      }

      encodedVideoChunk2AVPacket(chunk, avpacket)

      if (!this.extradata) {
        let extradata: Uint8Array | undefined
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

    avpacket.pts = pts
    avpacket.dts = dts
    avpacket.timeBase.den = this.timeBase!.den
    avpacket.timeBase.num = this.timeBase!.num
    avpacket.duration = avRescaleQ(1n, this.framerateTimebase!, this.timeBase!)

    if (this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || this.parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || this.parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      avpacket.bitFormat = this.parameters.bitFormat
    }

    this.options.onReceiveAVPacket(avpacket)

    const avframe = this.avframeMap.get(pts)

    if (avframe) {
      this.options.avframePool
        ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        : destroyAVFrame(avframe)
    }
    this.avframeMap.delete(pts)
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>, timeBase: Rational): Promise<int32> {
    this.currentError = null

    const descriptor = getAVPixelFormatDescriptor(parameters.format as AVPixelFormat)

    // webcodecs 目前还不支持 hdr
    if (!descriptor || descriptor.comp[0].depth > 8) {
      logger.error(`format ${parameters.format} not support`)
      return errorType.CODEC_NOT_SUPPORT
    }

    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: static_cast<double>(parameters.bitrate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true),
      latencyMode: parameters.videoDelay ? 'quality' : 'realtime',
      alpha: descriptor && (descriptor.flags & AVPixelFormatFlags.ALPHA) ? 'keep' : 'discard'
    }

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      config.avc = {
        format: parameters.bitFormat === BitFormat.AVCC ? 'avc' : 'annexb'
      }
    }

    try {
      const support = await VideoEncoder.isConfigSupported(config)
      if (!support.supported) {
        logger.error('not support')
        return errorType.INVALID_PARAMETERS
      }
    }
    catch (error) {
      logger.error(`${error}`)
      return errorType.CODEC_NOT_SUPPORT
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
      logger.error(`open video encoder error, ${this.currentError}`)
      return errorType.CODEC_NOT_SUPPORT
    }

    this.parameters = parameters
    this.timeBase = timeBase
    this.inputCounter = 0n
    this.outputCounter = 0n
    this.framerateTimebase = {
      den: parameters.framerate.num,
      num: parameters.framerate.den
    }

    return 0
  }

  public encode(frame: VideoFrame | pointer<AVFrame>, key: boolean): int32 {

    if (this.currentError) {
      logger.error(`encode error, ${this.currentError}`)
      return errorType.DATA_INVALID
    }

    let pts = avRescaleQ(this.inputCounter, this.framerateTimebase!, this.timeBase!)

    if (isPointer(frame) && frame.pts !== NOPTS_VALUE_BIGINT && frame.timeBase.den !== 0 && frame.timeBase.num !== 0
      || !isPointer(frame) && frame.timestamp >= 0
    ) {
      pts = isPointer(frame)
        ? avRescaleQ2(
          frame.pts,
          addressof(frame.timeBase),
          this.timeBase!
        )
        : avRescaleQ(
          static_cast<int64>(frame.timestamp as uint32),
          AV_TIME_BASE_Q,
          this.timeBase!
        )
    }

    if (isPointer(frame)) {
      const cache = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
      refAVFrame(cache, frame)
      cache.pts = pts
      this.avframeMap.set(cache.pts, cache)
      cache.duration = avRescaleQ(1n, this.framerateTimebase!, cache.timeBase)
      frame = avframe2VideoFrame(cache, pts)
    }
    else {
      frame = new VideoFrame(frame, {
        timestamp: static_cast<double>(pts),
        duration: static_cast<double>(avRescaleQ(1n, this.framerateTimebase!, this.timeBase!))
      })
    }
    try {
      this.encoder!.encode(frame, {
        keyFrame: key
      })
      frame.close()
      this.inputCounter++
      return 0
    }
    catch (error) {
      logger.error(`encode error, ${error}`)
      frame.close()
      return errorType.DATA_INVALID
    }
  }

  public async flush(): Promise<int32> {
    if (this.currentError) {
      logger.error(`flush error, ${this.currentError}`)
      return errorType.DATA_INVALID
    }
    try {
      await this.encoder!.flush()
      return 0
    }
    catch (error) {
      logger.error(`flush error, ${error}`)
      return errorType.DATA_INVALID
    }
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
    this.encoder = undefined
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
    return this.encoder?.encodeQueueSize ?? 0
  }

  static async isSupported(parameters: pointer<AVCodecParameters>, enableHardwareAcceleration: boolean) {
    const descriptor = getAVPixelFormatDescriptor(parameters.format as AVPixelFormat)
    // webcodecs 目前还不支持 hdr
    if (!descriptor || descriptor.comp[0].depth > 8) {
      return false
    }
    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: static_cast<double>(parameters.bitrate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(enableHardwareAcceleration ?? true),
      latencyMode: parameters.videoDelay ? 'quality' : 'realtime',
      alpha: descriptor && (descriptor.flags & AVPixelFormatFlags.ALPHA) ? 'keep' : 'discard'
    }

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_H264
      || parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || parameters.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      config.avc = {
        format: parameters.bitFormat === BitFormat.AVCC ? 'avc' : 'annexb'
      }
    }

    try {
      const support = await VideoEncoder.isConfigSupported(config)
      return support.supported
    }
    catch (error) {
      return false
    }
  }
}
