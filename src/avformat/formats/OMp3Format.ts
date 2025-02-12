/*
 * libmedia lvf encoder
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

import { AVOFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import OFormat from './OFormat'
import { AVCodecID } from 'avutil/codec'
import { AVFormat } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import { Mp3FormatOptions, Mp3MetaData } from './mp3/type'
import * as errorType from 'avutil/error'
import * as mp3 from 'avutil/codecs/mp3'
import { INT32_MAX } from 'avutil/constant'
import * as bigint from 'common/util/bigint'
import { FrameHeader } from './mp3/frameHeader'
import * as frameHeader from './mp3/frameHeader'
import { ID3V1_SIZE, XING_SIZE, XING_TOC_COUNT } from './mp3/mp3'
import BufferWriter from 'common/io/BufferWriter'
import * as id3v2 from './mp3/id3v2'
import { mapUint8Array } from 'cheap/std/memory'
import * as text from 'common/util/text'
import * as object from 'common/util/object'
import { AVStreamMetadataKey } from 'avutil/AVStream'

const XING_NUM_BAGS = 400

export interface Mp3Context {
  size: uint32
  frames: uint32
  seen: uint32
  want: uint32
  bag: uint32[]
  pos: uint32

  initialBitrate: int32
  hasVariableBitrate: boolean
  padding: int32
  delay: int32

  frameHeader: FrameHeader,
  xingOffset: int32
  xingFrameSize: int32
  xingFrameOffset: int64
  xingFramePos: int64
  audioSize: int32

  id3SizePos: int64
}

const defaultMp3FormatOptions: Mp3FormatOptions = {
  id3v2Version: 4,
  hasID3v1: false,
  hasXing: true
}

export default class OMp3Format extends OFormat {

  public type: AVFormat = AVFormat.MP3

  private options: Mp3FormatOptions

  private context: Mp3Context

  private xingWriter: BufferWriter

  constructor(options: Mp3FormatOptions = {}) {
    super()
    this.options = object.extend({}, defaultMp3FormatOptions, options)
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(true)

    this.context = {
      size: 0,
      frames: 0,
      seen: 0,
      want: 1,
      bag: [],
      pos: 0,

      initialBitrate: 0,
      hasVariableBitrate: false,
      padding: 0,
      delay: 0,

      frameHeader: new FrameHeader(),
      xingOffset: -1,
      xingFrameSize: 0,
      xingFrameOffset: 0n,
      xingFramePos: 0n,
      audioSize: 0,

      id3SizePos: 0n
    }

    this.xingWriter = new BufferWriter(new Uint8Array(5000))

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
    })

    if (!stream) {
      logger.error('can not found stream with mp3 codec')
      return errorType.INVALID_ARGUMENT
    }

    return 0
  }

  private writeXingTag(formatContext: AVOFormatContext) {
    if (!this.options.hasXing) {
      return
    }

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
    })

    let rateIdx = -1
    let channels = 0
    let bitrateIdx = -1
    let bestBitrateIdx = -1
    let bestBitrateError = static_cast<int64>(INT32_MAX)
    let ver = 0
    let bytesNeeded = 0

    const freqTab = [44100, 48000, 32000]

    for (let i = 0; i < freqTab.length; i++) {
      const freq = freqTab[i]
      if (stream.codecpar.sampleRate === freq) {
        // MPEG 1
        ver = 0x3
      }
      else if (stream.codecpar.sampleRate === freq / 2) {
        // MPEG 2
        ver = 0x2
      }
      else if (stream.codecpar.sampleRate === freq / 4) {
        // MPEG 2.5
        ver = 0x0
      }
      else {
        continue
      }
      rateIdx = i
    }
    if (rateIdx === freqTab.length) {
      logger.warn('unsupported sample rate, not writing Xing header.')
      return
    }

    switch (stream.codecpar.chLayout.nbChannels) {
      case 1:
        // MPA_MONO
        channels = 3
        break
      case 2:
        // MPA_STEREO
        channels = 0
        break
      default:
        logger.warn('unsupported number of channels, not writing Xing header.')
        return
    }

    // sync
    let header = 0xff << 24
    // sync/audio-version/layer 3/no crc*/
    header |= (0x7 << 5 | ver << 3 | 0x1 << 1 | 0x1) << 16
    header |= (rateIdx << 2) << 8
    header |= channels << 6

    for (bitrateIdx = 1; bitrateIdx < 15; bitrateIdx++) {
      let bitrate = static_cast<int64>(1000 * mp3.getBitRateByVersionLayerIndex(ver, 3 - 1, bitrateIdx))
      let error = bigint.abs(bitrate - stream.codecpar.bitrate)

      if (error < bestBitrateError) {
        bestBitrateError = error
        bestBitrateIdx = bitrateIdx
      }
    }

    for (bitrateIdx = bestBitrateIdx; ; bitrateIdx++) {
      let mask = bitrateIdx << (4 + 8)
      if (15 == bitrateIdx) {
        return
      }
      header |= mask

      frameHeader.parse(this.context.frameHeader, header)

      const xingOffsetTable: number[][] = [[0, 9, 17], [0, 0, 0], [0, 9, 17], [0, 17, 32]]

      this.context.xingOffset = xingOffsetTable[this.context.frameHeader.version][stream.codecpar.chLayout.nbChannels] + 4
      bytesNeeded = this.context.xingOffset + XING_SIZE

      if (bytesNeeded <= frameHeader.getFrameLength(this.context.frameHeader, stream.codecpar.sampleRate)) {
        break
      }

      header &= ~mask
    }

    this.xingWriter.writeUint32(header)
    this.xingWriter.writeBuffer(new Uint8Array(this.context.xingOffset - 4).fill(0))
    this.xingWriter.writeString('Xing')
    // frames / size / TOC / vbr scale
    this.xingWriter.writeUint32(0x01 | 0x02 | 0x04 | 0x08)

    this.context.size = frameHeader.getFrameLength(this.context.frameHeader, stream.codecpar.sampleRate)
    this.context.want = 1
    this.context.seen = 0
    this.context.pos = 0
    // frames
    this.xingWriter.writeUint32(0)
    // size
    this.xingWriter.writeUint32(0)

    for (let i = 0; i < XING_TOC_COUNT; i++) {
      this.xingWriter.writeUint8((255 * i / XING_TOC_COUNT) >>> 0)
    }

    // vbr quality
    // we write it, because some (broken) tools always expect it to be present
    this.xingWriter.writeUint32(0)

    const metadata = stream.metadata as Mp3MetaData || {}

    if (metadata[AVStreamMetadataKey.ENCODER]) {
      const buffer = text.encode(metadata[AVStreamMetadataKey.ENCODER])
      this.xingWriter.writeBuffer(buffer.subarray(0, 9))
    }
    else {
      this.xingWriter.writeString('Lavf')
      this.xingWriter.writeBuffer(new Uint8Array(5).fill(0))
    }

    // tag revision 0 / unknown vbr method
    this.xingWriter.writeUint8(0)

    // unknown lowpass filter value
    this.xingWriter.writeUint8(0)

    // empty replaygain fields
    this.xingWriter.writeBuffer(new Uint8Array(8).fill(0))

    // unknown encoding flags
    this.xingWriter.writeUint8(0)
    // unknown abr/minimal bitrate
    this.xingWriter.writeUint8(0)
    // empty encoder delay/padding
    this.xingWriter.writeUint24(0)

    // misc
    this.xingWriter.writeUint8(0)
    // mp3gain
    this.xingWriter.writeUint8(0)
    // preset
    this.xingWriter.writeUint16(0)

    // music length
    this.xingWriter.writeUint32(0)
    // music crc
    this.xingWriter.writeUint16(0)
    // tag crc
    this.xingWriter.writeUint16(0)

    this.xingWriter.writeBuffer(new Uint8Array(this.context.size - bytesNeeded).fill(0))

    this.context.xingFrameSize = this.xingWriter.getPos()

    this.context.xingFrameOffset = formatContext.ioWriter.getPos()

    formatContext.ioWriter.writeBuffer(this.xingWriter.getWroteBuffer())

    this.context.audioSize = this.context.xingFrameSize
  }

  private xingAddFrame(avpacket: pointer<AVPacket>) {
    this.context.frames++
    this.context.seen++
    this.context.size += avpacket.size

    if (this.context.want === this.context.seen) {
      this.context.bag[this.context.pos] = this.context.size

      if (++this.context.pos === XING_NUM_BAGS) {
        /* shrink table to half size by throwing away each second bag. */
        for (let i = 1; i < XING_NUM_BAGS; i += 2) {
          this.context.bag[i >> 1] = this.context.bag[i]
        }
        /* double wanted amount per bag. */
        this.context.want *= 2
        /* adjust current position to half of table size. */
        this.context.pos = XING_NUM_BAGS >> 1
      }
      this.context.seen = 0
    }
  }

  private updateXing(formatContext: AVOFormatContext) {
    if (this.context.hasVariableBitrate) {
      this.xingWriter.seek(this.context.xingOffset)
      this.xingWriter.writeString('Info')
    }
    this.xingWriter.seek(this.context.xingOffset + 8)
    this.xingWriter.writeUint32(this.context.frames)
    this.xingWriter.writeUint32(this.context.size)

    this.xingWriter.seek(this.context.xingFrameSize)

    const toc = this.xingWriter.getWroteBuffer().subarray(this.context.xingOffset + 16)
    toc[0] = 0
    for (let i = 1; i < XING_TOC_COUNT; i++) {
      let j = (i * this.context.pos / XING_TOC_COUNT) >>> 0
      const seekPoint = (256 * this.context.bag[j] / this.context.size) >>> 0
      toc[i] = Math.min(seekPoint, 255)
    }

    const now = formatContext.ioWriter.getPos()
    formatContext.ioWriter.seek(this.context.xingFrameOffset)
    formatContext.ioWriter.writeBuffer(this.xingWriter.getWroteBuffer())
    formatContext.ioWriter.seek(now)
  }

  public writeHeader(formatContext: AVOFormatContext): number {

    const stream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
    })

    if (this.options.id3v2Version) {
      id3v2.write(formatContext.ioWriter, this.options.id3v2Version, formatContext.metadataHeaderPadding, stream.metadata)
    }

    if (this.options.hasXing) {
      this.writeXingTag(formatContext)
    }

    return 0
  }
  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    if (!avpacket.size) {
      logger.warn(`packet\'s size is 0: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_MP3) {
      logger.warn(`packet\'s codecId is not mp3: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (avpacket.data && avpacket.size > 4) {
      frameHeader.parse(this.context.frameHeader, accessof(reinterpret_cast<pointer<uint32>>(avpacket.data)))

      const bitrate = mp3.getBitRateByVersionLayerIndex(
        this.context.frameHeader.version,
        this.context.frameHeader.layer,
        this.context.frameHeader.bitrateIndex
      )
      if (!this.context.initialBitrate) {
        this.context.initialBitrate = bitrate
      }
      else if (bitrate !== this.context.initialBitrate) {
        this.context.hasVariableBitrate = true
      }

      this.xingAddFrame(avpacket)

      formatContext.ioWriter.writeBuffer(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)))
    }

    return 0
  }

  public writeTrailer(formatContext: AVOFormatContext): number {

    if (this.options.hasID3v1) {

      const stream = formatContext.streams.find((stream) => {
        return stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
      })

      const metadata = stream.metadata as Mp3MetaData || {}

      const id1Buffer = new Uint8Array(ID3V1_SIZE)
      const id1Writer = new BufferWriter(id1Buffer)
      id1Writer.writeString('TAG')

      function writeText(str: string) {
        const buffer = text.encode(str)
        id1Writer.writeBuffer(buffer.subarray(0, 30))
        if (buffer.length < 30) {
          id1Writer.skip(30 - buffer.length)
        }
      }

      if (metadata[AVStreamMetadataKey.TITLE]) {
        writeText(metadata[AVStreamMetadataKey.TITLE])
      }
      else {
        id1Writer.skip(30)
      }
      if (metadata[AVStreamMetadataKey.ARTIST]) {
        writeText(metadata[AVStreamMetadataKey.ARTIST])
      }
      else {
        id1Writer.skip(30)
      }
      if (metadata[AVStreamMetadataKey.ALBUM]) {
        writeText(metadata[AVStreamMetadataKey.ALBUM])
      }
      else {
        id1Writer.skip(30)
      }

      id1Buffer[127] = 0xff
      if (metadata[AVStreamMetadataKey.GENRE]) {
        id1Buffer[127] = +metadata[AVStreamMetadataKey.GENRE]
      }

      formatContext.ioWriter.writeBuffer(id1Buffer)
    }

    if (this.options.hasXing) {
      this.updateXing(formatContext)
    }

    formatContext.ioWriter.flush()

    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    return 0
  }

}
