/*
 * libmedia wav decoder
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

import AVStream from 'avutil/AVStream'
import { AVIFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import { AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from 'avutil/avformat'
import { mapSafeUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import { readFormatTag } from './riff/iriff'
import { getBitsPerSample } from 'avutil/util/pcm'

const PACKET_SAMPLE_COUNT = 1024

export default class IWavFormat extends IFormat {

  public type: AVFormat = AVFormat.WAV

  private dataSize: int64
  private sampleCount: int64
  private pcmStartPos: int64
  private currentPts: int64

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    formatContext.ioReader.setEndian(false)
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const signature = await formatContext.ioReader.readString(4)

    switch (signature) {

      case 'RIFF':
      case 'RF64':
      case 'BW64':
        break
      case 'RIFX':
        formatContext.ioReader.setEndian(true)
        break
      default:
        logger.error('the file format is not wav')
        return errorType.DATA_INVALID
    }

    // chunk size
    await formatContext.ioReader.skip(4)

    const dataType = await formatContext.ioReader.readString(4)

    if (dataType !== 'WAVE') {
      logger.error(`invalid start code ${dataType} in RIFF header`)
      return errorType.DATA_INVALID
    }

    if (signature === 'RF64' || signature === 'BW64') {
      const tag = await formatContext.ioReader.readString(4)
      if (tag !== 'ds64') {
        return errorType.DATA_INVALID
      }
      const size = await formatContext.ioReader.readUint32()
      if (size < 24) {
        return errorType.DATA_INVALID
      }

      // riff size
      await formatContext.ioReader.skip(8)
      this.dataSize = await formatContext.ioReader.readUint64()
      this.sampleCount = await formatContext.ioReader.readUint64()

      if (this.dataSize < 0 || this.sampleCount < 0) {
        logger.error('negative data_size and/or sample_count in ds64')
        return errorType.DATA_INVALID
      }
      await formatContext.ioReader.skip(size - 24)
    }

    const stream = formatContext.createStream()

    const fileSize = await formatContext.ioReader.fileSize()

    let gotFmt = false
    let gotXma2 = false

    while (formatContext.ioReader.getPos() < fileSize) {
      const tag = await formatContext.ioReader.readString(4)
      const size = await formatContext.ioReader.readUint32()

      if (tag === 'fmt ') {
        if (!gotFmt) {
          let ret = await readFormatTag(formatContext.ioReader, addressof(stream.codecpar), size)
          if (ret < 0) {
            return ret
          }
        }
        else {
          logger.warn('found more than one \'fmt \' tag, ignore it')
        }
      }
      else if (tag === 'data') {
        this.pcmStartPos = formatContext.ioReader.getPos()
        if (!this.dataSize) {
          this.dataSize = static_cast<int64>(size)
        }
        if (this.pcmStartPos + this.dataSize === fileSize) {
          break
        }
        await formatContext.ioReader.seek(this.pcmStartPos + this.dataSize)
      }
      else {
        if (this.pcmStartPos + this.dataSize === fileSize) {
          break
        }
        await formatContext.ioReader.seek(formatContext.ioReader.getPos() + static_cast<int64>(size))
      }
    }

    if (!this.sampleCount) {
      this.sampleCount = (this.dataSize << 3n) / BigInt(stream.codecpar.chLayout.nbChannels * getBitsPerSample(stream.codecpar.codecId))
    }

    stream.timeBase.den = stream.codecpar.sampleRate
    stream.timeBase.num = 1

    if (this.sampleCount) {
      stream.duration = this.sampleCount
    }

    this.currentPts = 0n

    await formatContext.ioReader.seek(this.pcmStartPos)

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream: AVStream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
    })

    try {

      const length = (PACKET_SAMPLE_COUNT * stream.codecpar.chLayout.nbChannels * getBitsPerSample(stream.codecpar.codecId)) >>> 3

      const data: pointer<uint8> = avMalloc(length)
      addAVPacketData(avpacket, data, length)
      avpacket.dts = avpacket.pts = this.currentPts
      avpacket.pos = formatContext.ioReader.getPos()
      await formatContext.ioReader.readBuffer(length, mapSafeUint8Array(data, length))
      avpacket.streamIndex = stream.index
      avpacket.timeBase.den = stream.timeBase.den
      avpacket.timeBase.num = stream.timeBase.num

      this.currentPts += static_cast<int64>(PACKET_SAMPLE_COUNT)
      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    const now = formatContext.ioReader.getPos()
    if (flags & AVSeekFlags.BYTE) {
      const size = await formatContext.ioReader.fileSize()

      if (size <= 0n) {
        return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
      }

      if (timestamp < 0n) {
        timestamp = 0n
      }
      else if (timestamp > size) {
        timestamp = size
      }
      await formatContext.ioReader.seek(timestamp)

      if (!(flags & AVSeekFlags.ANY)) {
        this.currentPts = ((timestamp - this.pcmStartPos) << 3n) / BigInt( stream.codecpar.chLayout.nbChannels * getBitsPerSample(stream.codecpar.codecId))
      }
      return now
    }
    else {
      const pos = this.pcmStartPos + (timestamp * BigInt(stream.codecpar.chLayout.nbChannels * getBitsPerSample(stream.codecpar.codecId)) >> 3n)
      await formatContext.ioReader.seek(pos)
      this.currentPts = timestamp
      return now
    }
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
