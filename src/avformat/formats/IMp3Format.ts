/*
 * libmedia mp3 format decode
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

import { AVIFormatContext } from '../AVFormatContext'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from 'avutil/avformat'
import { mapSafeUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import AVStream from 'avutil/AVStream'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as text from 'common/util/text'
import { IOFlags } from 'avutil/avformat'
import * as mp3 from 'avutil/codecs/mp3'
import { avRescaleQ } from 'avutil/util/rational'
import { ID3V2, Mp3MetaData, Mp3StreamContext } from './mp3/type'
import { ID3V1_SIZE, XING_TOC_COUNT, XingFlag } from './mp3/mp3'
import * as bigint from 'common/util/bigint'
import * as array from 'common/util/array'
import * as id3v2 from './mp3/id3v2'
import * as frameHeader from './mp3/frameHeader'
import { IOError } from 'common/io/error'
import { FrameHeader } from './mp3/frameHeader'
import * as errorType from 'avutil/error'

interface Mp3Context {
  firstFramePos: int64
  isVBR: boolean
  hasID3v1: boolean
  id3v2: ID3V2
  fileSize: int64
}

export default class IMp3Format extends IFormat {

  public type: AVFormat = AVFormat.MP3

  private context: Mp3Context

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
    this.context = {
      firstFramePos: NOPTS_VALUE_BIGINT,
      isVBR: false,
      hasID3v1: false,
      id3v2: {
        version: NOPTS_VALUE,
        revision: NOPTS_VALUE,
        flags: NOPTS_VALUE
      },
      fileSize: 0n
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const stream = formatContext.createStream()

    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_MP3
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
    stream.startTime = 0n
    stream.firstDTS = 0n

    const mp3Context: Mp3StreamContext = {
      frameHeader: new FrameHeader(),
      nbFrame: 0n,
      tocIndexes: [],
      nextDTS: 0n,
      frameLength: 0
    }

    stream.privData = mp3Context

    const metadata: Mp3MetaData = stream.metadata = {}

    const fileSize = await formatContext.ioReader.fileSize()

    if (formatContext.ioReader.flags & IOFlags.SEEKABLE) {
      if (fileSize > ID3V1_SIZE) {
        await formatContext.ioReader.seek(fileSize - static_cast<int64>(ID3V1_SIZE))

        const isID3V1 = (await formatContext.ioReader.readString(3)) === 'TAG'

        if (isID3V1) {
          let buffer = await formatContext.ioReader.readBuffer(30)
          metadata.title = text.decode(buffer).replace(/\s/g, '')

          buffer = await formatContext.ioReader.readBuffer(30)
          metadata.artist = text.decode(buffer).replace(/\s/g, '')

          buffer = await formatContext.ioReader.readBuffer(30)
          metadata.album = text.decode(buffer).replace(/\s/g, '')

          buffer = await formatContext.ioReader.readBuffer(4)
          metadata.date = text.decode(buffer).replace(/\s/g, '')

          buffer = await formatContext.ioReader.readBuffer(30)
          metadata.comment = text.decode(buffer).replace(/\s/g, '')

          if (buffer[28] === 0 && buffer[29] !== 0) {
            metadata.track = buffer[29] + ''
          }

          metadata.genre = await formatContext.ioReader.readUint8()

          this.context.hasID3v1 = true
        }
      }
    }

    await formatContext.ioReader.seek(0n)

    const hasID3 = (await formatContext.ioReader.peekString(3)) === 'ID3'

    if (hasID3) {
      await formatContext.ioReader.skip(3)

      this.context.id3v2.version = await formatContext.ioReader.readUint8()
      this.context.id3v2.revision = await formatContext.ioReader.readUint8()
      this.context.id3v2.flags = await formatContext.ioReader.readUint8()

      const len = (((await formatContext.ioReader.readUint8()) & 0x7F) << 21)
        | (((await formatContext.ioReader.readUint8()) & 0x7F) << 14)
        | (((await formatContext.ioReader.readUint8()) & 0x7F) << 7)
        | ((await formatContext.ioReader.readUint8()) & 0x7F)

      await id3v2.parse(formatContext.ioReader, len, this.context.id3v2, metadata)
    }

    this.context.firstFramePos = formatContext.ioReader.getPos()

    while (true) {
      const word = await formatContext.ioReader.peekUint16()
      if ((word & 0xffe0) === 0xffe0) {
        break
      }
      await formatContext.ioReader.skip(1)
    }

    if (this.context.firstFramePos !== formatContext.ioReader.getPos()) {
      logger.warn(`skipping ${formatContext.ioReader.getPos() - this.context.firstFramePos} bytes of junk at ${this.context.firstFramePos}`)
      this.context.firstFramePos = formatContext.ioReader.getPos()
    }

    stream.codecpar.extradataSize = 4
    stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(stream.codecpar.extradataSize))
    await formatContext.ioReader.peekBuffer(
      stream.codecpar.extradataSize,
      mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
    )
    frameHeader.parse(mp3Context.frameHeader, await formatContext.ioReader.readUint32())

    stream.codecpar.profile = mp3.getProfileByLayer(mp3Context.frameHeader.layer)
    stream.codecpar.frameSize = mp3.getFrameSizeByVersionLayer(mp3Context.frameHeader.version, mp3Context.frameHeader.layer)
    stream.codecpar.sampleRate = mp3.getSampleRateByVersionIndex(mp3Context.frameHeader.version, mp3Context.frameHeader.samplingFrequency)
    stream.timeBase.num = 1
    stream.timeBase.den = stream.codecpar.sampleRate

    const channels = mp3Context.frameHeader.mode === 3 ? 1 : 2

    stream.codecpar.chLayout.nbChannels = channels

    const bitrate = static_cast<int64>(mp3.getBitRateByVersionLayerIndex(
      mp3Context.frameHeader.version,
      mp3Context.frameHeader.layer,
      mp3Context.frameHeader.bitrateIndex
    ))

    const frameLength = frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate)

    const pos = formatContext.ioReader.getPos()

    const xingOffsetTable: number[][] = [[0, 9, 17], [0, 0, 0], [0, 9, 17], [0, 17, 32]]

    await formatContext.ioReader.skip(xingOffsetTable[mp3Context.frameHeader.version][stream.codecpar.chLayout.nbChannels])

    const tag = await formatContext.ioReader.readString(4)
    if (tag === 'Xing' || tag === 'Info') {
      this.context.isVBR = true
      const flags = await formatContext.ioReader.readUint32()
      if (flags & XingFlag.FRAMES) {
        mp3Context.nbFrame = static_cast<int64>(await formatContext.ioReader.readUint32())
      }
      if (flags & XingFlag.SIZE) {
        this.context.fileSize = static_cast<int64>(await formatContext.ioReader.readUint32())
      }
      const fSize = fileSize >= pos ? fileSize - pos : 0n

      if (fSize && this.context.fileSize) {
        const min = bigint.min(fSize, this.context.fileSize)
        const delta = bigint.max(fSize, this.context.fileSize) - min
        if (fSize > this.context.fileSize && delta > min >> 4n) {
          mp3Context.nbFrame = 0n
          logger.warn('invalid concatenated file detected - using bitrate for duration')
        }
        else if (delta > min >> 4n) {
          logger.warn('filesize and duration do not match (growing file?)')
        }
      }

      stream.duration = (mp3Context.nbFrame * static_cast<int64>(stream.codecpar.frameSize))
      if (flags & XingFlag.TOC) {
        for (let i = 0; i < XING_TOC_COUNT; i++) {
          const b = await formatContext.ioReader.readUint8()
          const pos = this.context.fileSize * static_cast<int64>(b) / 256n
          const dts = stream.duration / static_cast<int64>(XING_TOC_COUNT) * static_cast<int64>(i)
          const sample = {
            dts,
            pos,
          }
          mp3Context.tocIndexes.push(sample)
        }
      }

      if (flags & XingFlag.QSCALE) {
        await formatContext.ioReader.skip(4)
      }
      metadata.encoder = await formatContext.ioReader.readString(9)

      this.context.firstFramePos += static_cast<int64>(frameLength)
    }
    else {
      await formatContext.ioReader.seek(pos)
      const tag = await formatContext.ioReader.readString(4)
      if (tag === 'VBRI') {
        // check tag version
        if ((await formatContext.ioReader.readUint16()) === 1) {
          // skip delay and quality
          await formatContext.ioReader.skip(4)
          this.context.fileSize = static_cast<int64>(await formatContext.ioReader.readUint32())
          mp3Context.nbFrame = static_cast<int64>(await formatContext.ioReader.readUint32())
          stream.duration = (mp3Context.nbFrame * static_cast<int64>(stream.codecpar.frameSize))
        }
        this.context.firstFramePos += static_cast<int64>(frameLength)
      }
      else {
        this.context.isVBR = false
        stream.codecpar.bitrate = bitrate * 1000n
        mp3Context.nbFrame = (fileSize - this.context.firstFramePos - static_cast<int64>(ID3V1_SIZE)) / static_cast<int64>(frameLength)
        stream.duration = (mp3Context.nbFrame * static_cast<int64>(stream.codecpar.frameSize))
        mp3Context.frameLength = frameLength
        this.context.fileSize = fileSize
      }
    }

    await formatContext.ioReader.seek(this.context.firstFramePos)

    while (true) {
      const word = await formatContext.ioReader.peekUint16()
      if ((word & 0xffe0) === 0xffe0) {
        break
      }
      await formatContext.ioReader.skip(1)
    }

    if (this.context.firstFramePos !== formatContext.ioReader.getPos()) {
      logger.warn(`skipping ${formatContext.ioReader.getPos() - this.context.firstFramePos} bytes of junk at ${this.context.firstFramePos}`)
      this.context.firstFramePos = formatContext.ioReader.getPos()
    }

    if (mp3Context.tocIndexes.length) {
      for (let i = 0; i < XING_TOC_COUNT; i++) {
        mp3Context.tocIndexes[i].pos += this.context.firstFramePos
      }
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)

    const mp3Context = stream.privData as Mp3StreamContext

    const pos = formatContext.ioReader.getPos()

    if (this.context.hasID3v1 && (pos >= this.context.fileSize - static_cast<int64>(ID3V1_SIZE))) {
      return IOError.END
    }

    try {
      frameHeader.parse(mp3Context.frameHeader, await formatContext.ioReader.peekUint32())

      let frameLength = this.context.isVBR ? frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate) : mp3Context.frameLength

      avpacket.size = frameLength
      avpacket.pos = pos
      avpacket.streamIndex = stream.index
      avpacket.timeBase = stream.timeBase
      avpacket.duration = static_cast<int64>(stream.codecpar.frameSize)
      avpacket.dts = avpacket.pts = mp3Context.nextDTS
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY

      mp3Context.nextDTS += static_cast<int64>(stream.codecpar.frameSize)

      const data: pointer<uint8> = avMalloc(frameLength)
      addAVPacketData(avpacket, data, frameLength)
      await formatContext.ioReader.readBuffer(frameLength, mapSafeUint8Array(data, frameLength))
      return 0
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return formatContext.ioReader.error
    }
  }

  private async syncToFrame(formatContext: AVIFormatContext) {

    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 3

    const stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
    const mp3Context = stream.privData as Mp3StreamContext

    while (true) {
      try {
        const word = await formatContext.ioReader.peekUint16()
        if ((word & 0xffe0) === 0xffe0) {
          pos = formatContext.ioReader.getPos()

          frameHeader.parse(mp3Context.frameHeader, await formatContext.ioReader.peekUint32())

          let frameLength = this.context.isVBR
            ? frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate)
            : mp3Context.frameLength

          if (frameLength > 500 * 1024) {
            await formatContext.ioReader.skip(1)
            continue
          }

          await formatContext.ioReader.skip(frameLength)

          let count = 0
          while (count <= analyzeCount) {
            const word = await formatContext.ioReader.peekUint16()
            if ((word & 0xffe0) === 0xffe0) {
              frameHeader.parse(mp3Context.frameHeader, await formatContext.ioReader.peekUint32())
              let frameLength = this.context.isVBR
                ? frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate)
                : mp3Context.frameLength
              await formatContext.ioReader.skip(frameLength)
              count++
            }
            else {
              break
            }
          }
          if (count < analyzeCount) {
            await formatContext.ioReader.seek(pos + 1n)
            pos = NOPTS_VALUE_BIGINT
          }
          else {
            break
          }
        }
        await formatContext.ioReader.skip(1)
      }
      catch (error) {
        break
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {

    const now = formatContext.ioReader.getPos()
    const mp3Context = stream.privData as Mp3StreamContext

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
        await this.syncToFrame(formatContext)

        if (stream.duration && size) {
          mp3Context.nextDTS = timestamp / size * stream.duration
        }
      }
      return now
    }
    else {
      if (stream.sampleIndexes.length) {
        let index = array.binarySearch(stream.sampleIndexes, (item) => {
          if (item.pts > timestamp) {
            return -1
          }
          return 1
        })
        if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 10000n) {
          logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
          await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
          mp3Context.nextDTS = stream.sampleIndexes[index - 1].dts
          return now
        }
      }

      if (timestamp === 0n) {
        await formatContext.ioReader.seek(this.context.firstFramePos)
        return now
      }

      if (this.context.isVBR) {
        if (mp3Context.tocIndexes.length) {
          const sample = mp3Context.tocIndexes[static_cast<int32>(timestamp / (stream.duration / static_cast<int64>(XING_TOC_COUNT)))]
          if (sample) {
            logger.debug(`seek in xing toc indexes, pts: ${sample.dts}, pos: ${sample.pos}`)
            await formatContext.ioReader.seek(sample.pos)
            mp3Context.nextDTS = sample.dts
          }
          else {
            logger.debug('not found any keyframe index, try to seek in bytes')
            const frameLength = frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate)
            const frame = timestamp / static_cast<int64>(stream.codecpar.frameSize)
            const pos = frame * static_cast<int64>(frameLength) + this.context.firstFramePos
            mp3Context.nextDTS = frame * static_cast<int64>(stream.codecpar.frameSize)
            await formatContext.ioReader.seek(pos)
          }
        }
        else {
          logger.debug('not found any keyframe index, try to seek in bytes')
          const frameLength = frameHeader.getFrameLength(mp3Context.frameHeader, stream.codecpar.sampleRate)
          const frame = timestamp / static_cast<int64>(stream.codecpar.frameSize)
          const pos = frame * static_cast<int64>(frameLength) + this.context.firstFramePos
          mp3Context.nextDTS = frame * static_cast<int64>(stream.codecpar.frameSize)
          await formatContext.ioReader.seek(pos)
        }
      }
      else {
        const frame = timestamp / static_cast<int64>(stream.codecpar.frameSize)
        const pos = frame * static_cast<int64>(mp3Context.frameLength) + this.context.firstFramePos
        mp3Context.nextDTS = frame * static_cast<int64>(stream.codecpar.frameSize)
        await formatContext.ioReader.seek(pos)
      }

      await this.syncToFrame(formatContext)
    }

    return now
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
