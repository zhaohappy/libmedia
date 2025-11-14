/*
 * libmedia h26x encoder
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

import type { AVOFormatContext } from '../AVFormatContext'
import OFormat from './OFormat'
import Avcc2AnnexbFilter from '../bsf/h2645/Avcc2AnnexbFilter'

import { memcpyFromUint8Array, mapUint8Array } from '@libmedia/cheap'

import {
  AVFormat,
  AVDisposition,
  AVCodecID,
  type AVPacket,
  type AVStream,
  avMalloc,
  getAVPacketData,
  getAVPacketSideData,
  addAVPacketSideData,
  AVCodecParameterFlags,
  AVPacketSideDataType,
  errorType
} from '@libmedia/avutil'

import {
  h264,
  hevc,
  vvc
} from '@libmedia/avutil/internal'

import {
  logger
} from '@libmedia/common'

export default class OH26XFormat extends OFormat {

  public type: AVFormat = AVFormat.H264

  private filter: Avcc2AnnexbFilter

  private muxStream: AVStream

  private extradata: Uint8Array

  constructor() {
    super()
  }

  public init(formatContext: AVOFormatContext): number {
    return 0
  }

  public async destroy(formatContext: AVOFormatContext) {
    if (this.filter) {
      this.filter.destroy()
    }
  }

  public writeHeader(formatContext: AVOFormatContext): number {

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
    })

    if (!stream) {
      logger.error('can not found stream with h264, hevc, vvc codec')
      return errorType.INVALID_ARGUMENT
    }

    this.muxStream = stream

    if (!(stream.codecpar.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB)) {
      this.filter = new Avcc2AnnexbFilter()
      this.filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
    }

    if (stream.codecpar.extradataSize) {
      this.extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)).slice()
    }

    return 0
  }
  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    if (!avpacket.size) {
      logger.warn(`packet\'s size is 0: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream || (stream.disposition & AVDisposition.ATTACHED_PIC) || stream !== this.muxStream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (this.filter) {
      if (this.extradata) {
        const element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        if (!element) {
          const extradata = avMalloc(this.extradata.length)
          memcpyFromUint8Array(extradata, this.extradata.length, this.extradata)
          addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, this.extradata.length)
        }
        this.extradata = null
      }

      this.filter.sendAVPacket(avpacket)
      this.filter.receiveAVPacket(avpacket)
    }
    else if (this.extradata) {
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          && !h264.generateAnnexbExtradata(getAVPacketData(avpacket))
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          && !hevc.generateAnnexbExtradata(getAVPacketData(avpacket))
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          && !vvc.generateAnnexbExtradata(getAVPacketData(avpacket))
      ) {
        formatContext.ioWriter.writeBuffer(this.extradata)
      }
      this.extradata = null
    }

    formatContext.ioWriter.writeBuffer(getAVPacketData(avpacket))

    return 0
  }
  public writeTrailer(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

  public getCapabilities() {
    return OH26XFormat.Capabilities
  }

  static Capabilities: AVCodecID[] = [
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VVC
  ]
}
