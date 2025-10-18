/*
 * libmedia flac encoder
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
import type AVPacket from 'avutil/struct/avpacket'
import OFormat from './OFormat'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import { AVFormat } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import * as object from 'common/util/object'
import type AVStream from 'avutil/AVStream'
import { AVDisposition, AVStreamMetadataKey } from 'avutil/AVStream'
import * as errorType from 'avutil/error'
import { FLAC_STREAMINFO_SIZE, MetaDataBlockType } from 'avutil/codecs/flac'
import { mapUint8Array } from 'cheap/std/memory'
import { addVorbisComment } from './ogg/vorbis'
import * as text from 'common/util/text'
import { ID3v2Mime2CodecId, ID3v2PictureType } from './mp3/id3v2'
import { getBitsPerPixel } from 'avutil/pixelFormatDescriptor'
import type { AVPixelFormat } from 'avutil/pixfmt'
import { getAVPacketData, getAVPacketSideData } from 'avutil/util/avpacket'
import { avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q } from 'avutil/constant'
import BitReader from 'common/io/BitReader'
import type { FrameInfo } from './flac/type'
import { decodeFrameHeader } from './flac/iflac'

export interface OFlacFormatOptions {
}

const defaultOptions: OFlacFormatOptions = {
}


export default class OFlacFormat extends OFormat {

  public type: AVFormat = AVFormat.FLAC

  private options: OFlacFormatOptions

  private muxStream: AVStream

  private seekPoint: {
    pos: int64
    pts: int64
    samples: int16
  }[]

  private firstFramePos: int64
  private streamInfo: Uint8Array
  private bitReader: BitReader
  private frameInfo: FrameInfo
  private paddingPos: int64
  private paddingLen: int32

  constructor(options: OFlacFormatOptions = {}) {
    super()
    this.options = object.extend({}, defaultOptions, options)
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(true)
    this.seekPoint = []
    this.streamInfo = null
    this.bitReader = new BitReader(16)
    this.frameInfo = {
      sampleRate: 0,
      channels: 0,
      bps: 0,
      blocksize: 0,
      chMode: 0,
      frameOrSampleNum: 0n,
      isVarSize: 0
    }
    this.paddingLen = formatContext.metadataHeaderPadding
    if (this.paddingLen <= 0) {
      this.paddingLen = 8192
    }
    return 0
  }

  public writeHeader(formatContext: AVOFormatContext): number {

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        && stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC
    })

    if (!stream) {
      logger.error('can not found stream with mp3 codec')
      return errorType.INVALID_ARGUMENT
    }

    this.muxStream = stream

    formatContext.ioWriter.writeString('fLaC')

    formatContext.ioWriter.writeUint8(MetaDataBlockType.STREAMINFO)
    formatContext.ioWriter.writeUint24(FLAC_STREAMINFO_SIZE)
    if (stream.codecpar.extradata && stream.codecpar.extradataSize >= FLAC_STREAMINFO_SIZE) {
      formatContext.ioWriter.writeBuffer(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)).subarray(0, FLAC_STREAMINFO_SIZE))
    }
    else {
      formatContext.ioWriter.skip(FLAC_STREAMINFO_SIZE)
    }

    const list = addVorbisComment(formatContext.metadata)
    formatContext.ioWriter.writeUint8(MetaDataBlockType.VORBIS_COMMENT)
    const commentLenPos = formatContext.ioWriter.getPos()
    formatContext.ioWriter.writeUint24(0)
    formatContext.ioWriter.setEndian(false)
    const vendorString = text.encode(`libmedia-${defined(VERSION)}`)
    formatContext.ioWriter.writeUint32(vendorString.length)
    formatContext.ioWriter.writeBuffer(vendorString)
    formatContext.ioWriter.writeUint32(list.length)
    list.forEach((s) => {
      const b = text.encode(s)
      formatContext.ioWriter.writeUint32(b.length)
      formatContext.ioWriter.writeBuffer(b)
    })
    formatContext.ioWriter.setEndian(true)
    let now = formatContext.ioWriter.getPos()
    formatContext.ioWriter.seek(commentLenPos)
    formatContext.ioWriter.writeUint24(Number(now - commentLenPos) - 3)
    formatContext.ioWriter.seek(now)

    formatContext.streams.forEach((stream) => {
      if ((stream.disposition & AVDisposition.ATTACHED_PIC) && stream.attachedPic) {
        const mimeType: string = object.reverse(ID3v2Mime2CodecId)[stream.codecpar.codecId]
        if (mimeType) {
          let descriptionLen = 0
          if (stream.metadata[AVStreamMetadataKey.DESCRIPTION]) {
            descriptionLen = text.encode(stream.metadata[AVStreamMetadataKey.DESCRIPTION]).length
          }

          formatContext.ioWriter.writeUint8(MetaDataBlockType.PICTURE)
          formatContext.ioWriter.writeUint24(4 + 4 + mimeType.length + 4 + descriptionLen + 4 + 4 + 4 + 4 + 4 + stream.attachedPic.size)

          let type = 0
          if (stream.metadata[AVStreamMetadataKey.COMMENT]
            && ID3v2PictureType.indexOf(stream.metadata[AVStreamMetadataKey.COMMENT]) > -1
          ) {
            type = ID3v2PictureType.indexOf(stream.metadata[AVStreamMetadataKey.COMMENT])
          }
          formatContext.ioWriter.writeUint32(type)
          formatContext.ioWriter.writeUint32(mimeType.length)
          formatContext.ioWriter.writeBuffer(text.encode(mimeType))
          formatContext.ioWriter.writeUint32(descriptionLen)
          if (stream.metadata[AVStreamMetadataKey.DESCRIPTION]) {
            formatContext.ioWriter.writeBuffer(text.encode(stream.metadata[AVStreamMetadataKey.DESCRIPTION]))
          }
          formatContext.ioWriter.writeUint32(stream.codecpar.width)
          formatContext.ioWriter.writeUint32(stream.codecpar.height)
          const depth = getBitsPerPixel(stream.codecpar.format as AVPixelFormat)
          if (depth) {
            formatContext.ioWriter.writeUint32(depth)
          }
          else {
            formatContext.ioWriter.writeUint32(0)
          }
          formatContext.ioWriter.writeUint32(0)
          formatContext.ioWriter.writeUint32(stream.attachedPic.size)
          formatContext.ioWriter.writeBuffer(getAVPacketData(stream.attachedPic))
        }
      }
    })

    this.paddingPos = formatContext.ioWriter.getPos()
    formatContext.ioWriter.writeUint8(MetaDataBlockType.PADDING | 0x80)
    formatContext.ioWriter.writeUint24(this.paddingLen)
    formatContext.ioWriter.skip(this.paddingLen)

    this.firstFramePos = formatContext.ioWriter.getPos()

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

    const extradata = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
    if (extradata) {
      this.streamInfo = mapUint8Array(extradata.data, reinterpret_cast<size>(extradata.size)).slice()
    }
    if (avpacket.size >= 16) {
      const pts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), { den: stream.codecpar.sampleRate, num: 1 })
      if (!this.seekPoint.length
        || avRescaleQ(pts - this.seekPoint[this.seekPoint.length - 1].pts, { den: stream.codecpar.sampleRate, num: 1 }, AV_MILLI_TIME_BASE_Q) >= 5000
      ) {
        this.bitReader.reset()
        this.bitReader.appendBuffer(mapUint8Array(avpacket.data, 16))
        if (decodeFrameHeader(this.bitReader, this.frameInfo) >= 0) {
          this.seekPoint.push({
            pos: formatContext.ioWriter.getPos() - this.firstFramePos,
            pts,
            samples: reinterpret_cast<int16>(this.frameInfo.blocksize)
          })
        }
      }
      formatContext.ioWriter.writeBuffer(getAVPacketData(avpacket))
    }

    return 0
  }
  public writeTrailer(formatContext: AVOFormatContext): number {

    const now = formatContext.ioWriter.getPos()

    if (this.streamInfo) {
      formatContext.ioWriter.seek(8n)
      formatContext.ioWriter.writeBuffer(this.streamInfo.subarray(0, FLAC_STREAMINFO_SIZE))
    }

    if (this.seekPoint.length) {
      formatContext.ioWriter.seek(this.paddingPos)
      const paddingLen = this.paddingLen
      const max = Math.min(this.seekPoint.length, Math.floor((paddingLen - 4) / 18))
      formatContext.ioWriter.writeUint8(MetaDataBlockType.SEEKTABLE)
      formatContext.ioWriter.writeUint24(max * 18)
      let step = 1
      if (max < this.seekPoint.length) {
        step = (this.seekPoint.length - 1) / (max - 1)
      }
      for (let i = 0; i < max; i++) {
        const point = this.seekPoint[Math.floor(i * step)]
        formatContext.ioWriter.writeUint64(point.pts)
        formatContext.ioWriter.writeUint64(point.pos)
        formatContext.ioWriter.writeUint16(point.samples)
      }
      formatContext.ioWriter.writeUint8(MetaDataBlockType.PADDING | 0x80)
      formatContext.ioWriter.writeUint24(paddingLen - 4 - max * 18)
    }

    formatContext.ioWriter.seek(now)
    formatContext.ioWriter.flush()
    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

  getCapabilities() {
    return OFlacFormat.Capabilities
  }

  static Capabilities: AVCodecID[] = [AVCodecID.AV_CODEC_ID_FLAC]
}
