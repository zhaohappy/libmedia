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

import AVPacket, { AVPacketFlags, AVPacketPool } from 'avutil/struct/avpacket'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVFrame from 'avutil/struct/avframe'
import getVideoCodec from '../function/getVideoCodec'
import { getHardwarePreference } from '../function/getHardwarePreference'
import { avQ2D } from 'avutil/util/rational'
import * as is from 'common/util/is'
import { avframe2VideoFrame } from 'avutil/function/avframe2VideoFrame'
import { addAVPacketData, addAVPacketSideData, createAVPacket } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { AV_TIME_BASE } from 'avutil/constant'
import { BitFormat } from 'avformat/codecs/h264'
import { PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'

export type WebVideoEncoderOptions = {
  onReceivePacket: (avpacket: pointer<AVPacket>, avframe?: pointer<AVFrame>) => void
  onError: (error?: Error) => void
  enableHardwareAcceleration?: boolean
  avpacketPool?: AVPacketPool
}

export default class WebVideoEncoder {

  private encoder: VideoEncoder

  private options: WebVideoEncoderOptions

  private currentError: Error

  private avframeMap: Map<int64, pointer<AVFrame>>

  private framerate: int64

  private inputCounter: int64
  private outputCounter: int64

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
    avpacket.pts = pts
    avpacket.dts = dts
    avpacket.timeBase.den = AV_TIME_BASE
    avpacket.timeBase.num = 1
    avpacket.duration = static_cast<int64>(chunk.duration)
    const data = avMalloc(chunk.byteLength)
    chunk.copyTo(mapUint8Array(data, chunk.byteLength))
    addAVPacketData(avpacket, data, chunk.byteLength)

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
      if (metadata.alphaSideData) {
        const extradata = avMalloc(metadata.alphaSideData.byteLength)
        let buffer: Uint8Array
        if (metadata.alphaSideData instanceof ArrayBuffer) {
          buffer = new Uint8Array(metadata.alphaSideData)
        }
        else {
          buffer = new Uint8Array(metadata.alphaSideData.buffer)
        }
        memcpyFromUint8Array(extradata, metadata.alphaSideData.byteLength, buffer)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL, extradata, metadata.alphaSideData.byteLength)
      }
    }

    if (chunk.type === 'key') {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    const avframe = this.avframeMap.get(inputCounter)
    this.options.onReceivePacket(avpacket, avframe)
    this.avframeMap.delete(inputCounter)
  }

  private error(error: Error) {
    this.currentError = error
    this.options.onError(error)
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    this.currentError = null

    const descriptor = PixelFormatDescriptorsMap[parameters.format]

    const config: VideoEncoderConfig = {
      codec: getVideoCodec(parameters),
      width: parameters.width,
      height: parameters.height,
      bitrate: static_cast<double>(parameters.bitRate),
      framerate: avQ2D(parameters.framerate),
      hardwareAcceleration: getHardwarePreference(this.options.enableHardwareAcceleration ?? true),
      latencyMode: parameters.videoDelay ? 'quality' : 'realtime',
      alpha: (descriptor.flags & PixelFormatFlags.ALPHA) ? 'keep' : 'discard'
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

    this.inputCounter = 0n
    this.outputCounter = 0n
    this.framerate = static_cast<int64>(avQ2D(parameters.framerate))
  }

  public encode(frame: VideoFrame | pointer<AVFrame>, key: boolean) {
    if (is.number(frame)) {
      frame.pts = this.inputCounter
      this.avframeMap.set(frame.pts, frame)
      frame = avframe2VideoFrame(frame)
    }
    else {
      frame = new VideoFrame(frame, {
        timestamp: static_cast<double>(this.inputCounter)
      })
    }
    try {
      this.encoder.encode(frame, {
        keyFrame: key
      })
      this.inputCounter++
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
