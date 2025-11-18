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

import {
  type AVCodecParameters,
  type AVPacket,
  type AVPacketPool,
  type AVFrame,
  createAVPacket,
  getAVPacketData,
  errorType,
  createAVFrame,
  destroyAVFrame,
  refAVFrame,
  type AVRational,
  avQ2D,
  avRescaleQ,
  avRescaleQ2,
  NOPTS_VALUE_BIGINT,
  AVPacketFlags,
  AVCodecParameterFlags,
  AVCodecID,
  type AVFramePool,
  type AVFrameRef,
  getVideoCodec,
  avframe2VideoFrame,
  getAVPixelFormatDescriptor,
  AVPixelFormatFlags,
  encodedVideoChunk2AVPacket,
  type AVPixelFormat
} from '@libmedia/avutil'

import {
  AV_TIME_BASE_Q,
  av1,
  vp9,
  getHardwarePreference,
  mapColorPrimaries,
  mapColorSpace,
  mapColorTrc
} from '@libmedia/avutil/internal'

import {
  isPointer
} from '@libmedia/cheap'

import { logger, browser, object } from '@libmedia/common'

export type WebVideoEncoderOptions = {
  onReceiveAVPacket: (avpacket: pointer<AVPacket>) => void
  onError: (error?: Error) => void
  avpacketPool?: AVPacketPool
  avframePool?: AVFramePool
  enableHardwareAcceleration?: boolean
  bitrateMode?: BitrateMode
  scalabilityMode?: string
  contentHint?: string
  latencyMode?: LatencyMode
  copyTs?: boolean
}

// chrome bug: https://issues.chromium.org/issues/357902526
function fixChromeConstraintSetFlagsBug(desc: Uint8Array) {
  const constraintSetFlag = desc[2]
  // 如果 constraint_set_flags 字节二进制 第 0 位或第 1 位值为 1
  // 说明取值错误，忽略该字段避免解码异常
  if (constraintSetFlag !== undefined && constraintSetFlag.toString(2).slice(-2).includes('1')) {
    desc[2] = 0
  }
}

export default class WebVideoEncoder {

  private encoder: VideoEncoder | undefined

  private options: WebVideoEncoderOptions
  private parameters: pointer<AVCodecParameters> = nullptr
  private timeBase: AVRational | undefined

  private currentError: Error | null = null

  private avframeMap: Map<int64, pointer<AVFrame>>

  private framerateTimebase: AVRational | undefined

  private inputCounter: int64 = 0n
  private outputCounter: int64 = 0n

  private extradata: Uint8Array | undefined

  private ptsQueue: int64[] = []

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
    let dts = avRescaleQ(this.outputCounter++, this.framerateTimebase!, this.timeBase!)
    if (this.options.copyTs && this.ptsQueue.length) {
      dts = this.ptsQueue.shift()!
    }

    const avpacket = this.options.avpacketPool ? this.options.avpacketPool.alloc() : createAVPacket()

    if (!this.extradata) {
      if (metadata?.decoderConfig?.description) {
        let buffer: Uint8Array
        if (metadata.decoderConfig.description instanceof ArrayBuffer) {
          buffer = new Uint8Array(metadata.decoderConfig.description)
        }
        else {
          // @ts-ignore
          buffer = new Uint8Array(metadata.decoderConfig.description.buffer)
        }
        if (browser.chrome
          && !browser.checkVersion(browser.version, '130', true)
          && this.parameters.codecId === AVCodecID.AV_CODEC_ID_H264
        ) {
          fixChromeConstraintSetFlagsBug(buffer)
        }
        this.extradata = buffer
      }
      if (metadata?.decoderConfig?.colorSpace) {
        this.parameters.colorSpace = mapColorSpace(metadata.decoderConfig.colorSpace.matrix!)
        this.parameters.colorPrimaries = mapColorPrimaries(metadata.decoderConfig.colorSpace.primaries!)
        this.parameters.colorTrc = mapColorTrc(metadata.decoderConfig.colorSpace.transfer!)
      }

      encodedVideoChunk2AVPacket(chunk, avpacket, metadata ? object.extend({}, metadata, { decoderConfig: undefined }) : undefined)

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
      if (this.parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) {
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB
      }
      else {
        avpacket.flags &= ~AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB
      }
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

  public async open(parameters: pointer<AVCodecParameters>, timeBase: AVRational): Promise<int32> {
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
    if (this.options.latencyMode) {
      config.latencyMode = this.options.latencyMode
    }
    if (this.options.bitrateMode) {
      config.bitrateMode = this.options.bitrateMode
    }
    if (this.options.contentHint) {
      config.contentHint = this.options.contentHint
    }
    if (this.options.scalabilityMode) {
      config.scalabilityMode = this.options.scalabilityMode
    }

    if (parameters.codecId === AVCodecID.AV_CODEC_ID_H264) {
      config.avc = {
        format: (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) ? 'annexb' : 'avc'
      }
    }
    else if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
      // @ts-ignore
      config.hevc = {
        format: (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) ? 'annexb' : 'hevc'
      }
    }
    else if (parameters.codecId === AVCodecID.AV_CODEC_ID_VVC) {
      // @ts-ignore
      config.vvc = {
        format: (parameters.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) ? 'annexb' : 'vvc'
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
    this.ptsQueue.length = 0
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

    if (this.options.copyTs
      && (isPointer(frame) && frame.pts !== NOPTS_VALUE_BIGINT && frame.timeBase.den !== 0 && frame.timeBase.num !== 0
        || !isPointer(frame) && frame.timestamp >= 0
      )
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
      this.ptsQueue.push(pts)
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
      colorTrc: this.parameters.colorTrc
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

    try {
      const support = await VideoEncoder.isConfigSupported(config)
      return support.supported
    }
    catch (error) {
      return false
    }
  }
}
