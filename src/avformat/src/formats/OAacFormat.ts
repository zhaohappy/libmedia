/*
 * libmedia aac encoder
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
import type AVBSFilter from '../bsf/AVBSFilter'
import Raw2ADTSFilter from '../bsf/aac/Raw2ADTSFilter'
import Raw2LATMFilter from '../bsf/aac/Raw2LATMFilter'

import {
  AVFormat,
  getAVPacketData,
  AVMediaType,
  AVCodecID,
  type AVPacket,
  type AVStream,
  AVDisposition,
  errorType
} from '@libmedia/avutil'

import {
  object,
  logger
} from '@libmedia/common'

export interface OAacFormatOptions {
  frameType?: 'adts' | 'latm'
}

const defaultOptions: OAacFormatOptions = {
  frameType: 'adts'
}


export default class OAacFormat extends OFormat {

  public type: AVFormat = AVFormat.AAC

  private options: OAacFormatOptions

  private muxStream: AVStream

  private filter: AVBSFilter

  constructor(options: OAacFormatOptions = {}) {
    super()
    this.options = object.extend({}, defaultOptions, options)
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(true)
    return 0
  }

  public writeHeader(formatContext: AVOFormatContext): number {

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        && stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC
    })

    if (!stream) {
      logger.error('can not found stream with aac codec')
      return errorType.INVALID_ARGUMENT
    }

    this.muxStream = stream

    if (this.options.frameType === 'adts') {
      this.filter = new Raw2ADTSFilter()
      this.filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
    }
    else if (this.options.frameType === 'latm') {
      this.filter = new Raw2LATMFilter()
      this.filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
    }

    return 0
  }
  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream || (stream.disposition & AVDisposition.ATTACHED_PIC)) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (stream !== this.muxStream) {
      logger.warn(`packet\'s type is not audio: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (this.filter) {
      this.filter.sendAVPacket(avpacket)
      this.filter.receiveAVPacket(avpacket)
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
    return OAacFormat.Capabilities
  }

  static Capabilities: AVCodecID[] = [AVCodecID.AV_CODEC_ID_AAC]
}
