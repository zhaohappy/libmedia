/*
 * libmedia flac decoder
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
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from 'avutil/avformat'
import { mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import { MetaDataBlockType } from 'avutil/codecs/flac'
import { FlacContext, FrameInfo } from './flac/type'
import { decodeFrameHeader } from './flac/iflac'
import BitReader from 'common/io/BitReader'
import concatTypeArray from 'common/function/concatTypeArray'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import seekInBytes from '../function/seekInBytes'
import * as array from 'common/util/array'
import { avRescaleQ } from 'avutil/util/rational'
import { AVStreamMetadataKey } from 'avutil/AVStream'
import { parseVorbisComment } from './ogg/vorbis'

const PACKET_SIZE = 1024

export default class IFlacFormat extends IFormat {

  public type: AVFormat = AVFormat.FLAC

  context: FlacContext

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    formatContext.ioReader.setEndian(true)

    this.context = {
      streamInfo: {
        minimumBlockSize: 0,
        maximumBlockSize: 0,
        minimumFrameSize: 0,
        maximumFrameSize: 0,
        sampleRate: 0,
        channels: 0,
        bitPerSample: 0,
        samples: 0n,
        md5: ''
      },
      frameInfo: {
        sampleRate: 0,
        channels: 0,
        bps: 0,
        blocksize: 0,
        chMode: 0,
        frameOrSampleNum: 0n,
        isVarSize: 0
      },
      seekPoints: [],
      cueSheet: {
        catalogNumber: '',
        leadInSamples: 0n,
        compactDisc: false,
        tracks: []
      },
      picture: {
        type: 0,
        mimeType: '',
        description: '',
        width: 0,
        height: 0,
        colorDepth: 0,
        indexedColor: 0,
        data: null
      },

      cacheBuffer: null,
      cachePos: 0n,
      bitReader: new BitReader(16),
      fileSize: 0n,
      firstFramePos: 0n,
      isVarSize: -1
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {

    const signature = await formatContext.ioReader.readString(4)

    if (signature !== 'fLaC') {
      logger.error('the file format is not flac')
      return errorType.DATA_INVALID
    }

    this.context.fileSize = await formatContext.ioReader.fileSize()

    const stream = formatContext.createStream()
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
    stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_FLAC

    while (true) {
      const blockHeader = await formatContext.ioReader.readUint8()
      const blockLen = await formatContext.ioReader.readUint24()
      const blockType = blockHeader & (~0x80)

      if (blockType === MetaDataBlockType.STREAMINFO) {
        stream.codecpar.extradata = avMalloc(blockLen)
        stream.codecpar.extradataSize = blockLen
        memcpyFromUint8Array(stream.codecpar.extradata, blockLen, await formatContext.ioReader.peekBuffer(blockLen))

        this.context.streamInfo.minimumBlockSize = await formatContext.ioReader.readUint16()
        this.context.streamInfo.maximumBlockSize = await formatContext.ioReader.readUint16()

        this.context.streamInfo.minimumFrameSize = await formatContext.ioReader.readUint24()
        this.context.streamInfo.maximumFrameSize = await formatContext.ioReader.readUint24()

        const sampleRate = await formatContext.ioReader.readUint24()
        stream.codecpar.sampleRate = (sampleRate >> 4)
        stream.codecpar.chLayout.nbChannels = ((sampleRate & 0x0f) >>> 1) + 1

        this.context.streamInfo.sampleRate = stream.codecpar.sampleRate
        this.context.streamInfo.channels = stream.codecpar.chLayout.nbChannels

        const bitPerSample = await formatContext.ioReader.readUint8()
        stream.codecpar.bitsPerRawSample = (((sampleRate & 0x01) << 4) | ((bitPerSample & 0xf0) >>> 4)) + 1

        this.context.streamInfo.bitPerSample = stream.codecpar.bitsPerRawSample

        const samplesLow = await formatContext.ioReader.readUint32()

        const samples = (static_cast<int64>(bitPerSample & 0x0f) << 32n) | static_cast<int64>(samplesLow)
        this.context.streamInfo.samples = samples

        stream.timeBase.den = stream.codecpar.sampleRate
        stream.timeBase.num = 1
        stream.duration = samples
        stream.startTime = 0n

        this.context.streamInfo.md5 = await formatContext.ioReader.readString(16)
      }
      else if (blockType === MetaDataBlockType.APPLICATION) {
        const stream = formatContext.createStream()
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA
        stream.codecpar.codecTag = await formatContext.ioReader.readUint32()
        stream.codecpar.extradata = avMalloc(blockLen - 4)
        stream.codecpar.extradataSize = blockLen - 4
        await formatContext.ioReader.readBuffer(blockLen - 4, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
      }
      else if (blockType === MetaDataBlockType.SEEKTABLE) {
        for (let i = 0; i < blockLen / 18; i++) {
          const pts = await formatContext.ioReader.readUint64()
          const pos = await formatContext.ioReader.readUint64()
          const samples = await formatContext.ioReader.readUint16()
          this.context.seekPoints.push({
            pts,
            pos,
            samples
          })
        }
      }
      else if (blockType === MetaDataBlockType.VORBIS_COMMENT) {
        formatContext.ioReader.setEndian(false)
        const vendorStringLength = await formatContext.ioReader.readUint32()
        const vendorString = await formatContext.ioReader.readString(vendorStringLength)
        const userCommentListLength = await formatContext.ioReader.readUint32()
        const comments: string[] = []
        for (let i = 0; i < userCommentListLength; i++) {
          const length = await formatContext.ioReader.readUint32()
          comments.push(await formatContext.ioReader.readString(length))
        }
        stream.metadata[AVStreamMetadataKey.VENDOR] = vendorString
        parseVorbisComment(comments, stream.metadata)
        formatContext.ioReader.setEndian(true)
      }
      else if (blockType === MetaDataBlockType.CUESHEET) {
        this.context.cueSheet.catalogNumber = await formatContext.ioReader.readString(128)
        this.context.cueSheet.leadInSamples = await formatContext.ioReader.readUint64()
        this.context.cueSheet.compactDisc = !!((await formatContext.ioReader.readUint8()) >>> 7)
        await formatContext.ioReader.skip(258)

        const trackCount = await formatContext.ioReader.readUint8()
        for (let i = 0; i < trackCount; i++) {
          const offset = await formatContext.ioReader.readUint64()
          const number = await formatContext.ioReader.readUint8()
          const isrc = await formatContext.ioReader.readBuffer(12)
          const flags = await formatContext.ioReader.readUint8()
          await formatContext.ioReader.skip(13)
          const pointCount = await formatContext.ioReader.readUint8()

          const points = []
          for (let j = 0; j < pointCount; j++) {
            points.push({
              offset: await formatContext.ioReader.readUint64(),
              point: await formatContext.ioReader.readUint8()
            })
            await formatContext.ioReader.skip(3)
          }

          this.context.cueSheet.tracks.push({
            offset,
            number,
            isrc,
            type: flags >>> 7,
            preEmphasisFlag: (flags >>> 6) & 0x01,
            points
          })
        }
      }
      else if (blockType === MetaDataBlockType.PICTURE) {
        this.context.picture.type = await formatContext.ioReader.readUint32()
        let len = await formatContext.ioReader.readUint32()
        this.context.picture.mimeType = await formatContext.ioReader.readString(len)
        len = await formatContext.ioReader.readUint32()
        this.context.picture.description = await formatContext.ioReader.readString(len)
        this.context.picture.width = await formatContext.ioReader.readUint32()
        this.context.picture.height = await formatContext.ioReader.readUint32()
        this.context.picture.colorDepth = await formatContext.ioReader.readUint32()
        this.context.picture.indexedColor = await formatContext.ioReader.readUint32()
        len = await formatContext.ioReader.readUint32()
        this.context.picture.data = await formatContext.ioReader.readBuffer(len)
      }
      else {
        await formatContext.ioReader.skip(blockLen)
      }
      if (blockHeader & 0x80) {
        break
      }
    }

    this.context.firstFramePos = formatContext.ioReader.getPos()

    stream.privData = this.context

    return 0
  }

  private async getNextFrame(formatContext: AVIFormatContext) {
    const buffers: Uint8Array[] = []
    while (true) {

      if (formatContext.ioReader.getPos() === this.context.fileSize) {
        if (this.context.cacheBuffer) {
          buffers.push(this.context.cacheBuffer)
          this.context.cacheBuffer = null
        }
        break
      }

      if (!this.context.cacheBuffer) {
        this.context.cachePos = formatContext.ioReader.getPos()
        this.context.cacheBuffer = await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.context.fileSize - formatContext.ioReader.getPos())))
      }
      else if (this.context.cacheBuffer.length < 17) {
        this.context.cacheBuffer = concatTypeArray(
          Uint8Array,
          [
            this.context.cacheBuffer,
            await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.context.fileSize - formatContext.ioReader.getPos())))
          ]
        )
      }

      let i = buffers.length ? 0 : 2

      const sync = this.context.isVarSize < 0 ? [0xf8, 0xf9] : (this.context.isVarSize ? [0xf9] : [0xf8])

      const end = this.context.cacheBuffer.length - 2
      for (; i < end; i++) {
        if (this.context.cacheBuffer[i] === 0xff && array.has(sync, this.context.cacheBuffer[i + 1])) {
          if (i) {
            buffers.push(this.context.cacheBuffer.subarray(0, i))
            this.context.cacheBuffer = this.context.cacheBuffer.subarray(i)
            this.context.cachePos += static_cast<int64>(i)
          }
          break
        }
      }

      if (i === end) {
        if (formatContext.ioReader.getPos() === this.context.fileSize) {
          buffers.push(this.context.cacheBuffer)
          this.context.cachePos += static_cast<int64>(this.context.cacheBuffer.length)
          this.context.cacheBuffer = null
        }
        else {
          buffers.push(this.context.cacheBuffer.subarray(0, i))
          this.context.cachePos += static_cast<int64>(i)
          this.context.cacheBuffer = this.context.cacheBuffer.subarray(i)
        }
        continue
      }

      if (this.context.cacheBuffer.length < 16) {
        this.context.cacheBuffer = concatTypeArray(
          Uint8Array,
          [
            this.context.cacheBuffer,
            await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.context.fileSize - formatContext.ioReader.getPos())))
          ]
        )
      }

      this.context.bitReader.reset()
      this.context.bitReader.appendBuffer(this.context.cacheBuffer.subarray(0, 16))

      const info: Partial<FrameInfo> = {}
      // 检查下一帧的数据是否合法，不合法说明和前面的是同一帧数据
      if (decodeFrameHeader(this.context.bitReader, info, true) < 0
        // || info.sampleRate !== this.context.frameInfo.sampleRate
        // || info.channels !== this.context.frameInfo.channels
        || ((info.frameOrSampleNum - this.context.frameInfo.frameOrSampleNum !== static_cast<int64>(this.context.frameInfo.blocksize))
          && (info.frameOrSampleNum !== this.context.frameInfo.frameOrSampleNum + 1n)
        )
      ) {
        buffers.push(this.context.cacheBuffer.subarray(0, 2))
        this.context.cachePos += 2n
        this.context.cacheBuffer = this.context.cacheBuffer.subarray(2)
      }
      else {
        break
      }
    }

    if (buffers.length === 1) {
      return buffers[0]
    }
    return concatTypeArray(Uint8Array, buffers)
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const stream: AVStream = formatContext.streams.find((stream) => {
      return stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
    })

    try {
      let now = formatContext.ioReader.getPos()

      if (now === this.context.fileSize) {
        return IOError.END
      }

      this.context.bitReader.reset()

      if (this.context.cacheBuffer) {
        now = this.context.cachePos
        if (this.context.cacheBuffer.length < 16) {
          this.context.cacheBuffer = concatTypeArray(
            Uint8Array,
            [
              this.context.cacheBuffer,
              await formatContext.ioReader.readBuffer(Math.min(PACKET_SIZE, static_cast<int32>(this.context.fileSize - formatContext.ioReader.getPos())))
            ]
          )
        }
        this.context.bitReader.appendBuffer(this.context.cacheBuffer.subarray(0, 16))
      }
      else {
        this.context.bitReader.appendBuffer(await formatContext.ioReader.peekBuffer(16))
      }

      if (decodeFrameHeader(this.context.bitReader, this.context.frameInfo) < 0) {
        return errorType.DATA_INVALID
      }

      const nextFrame = await this.getNextFrame(formatContext)

      const data: pointer<uint8> = avMalloc(nextFrame.length)
      memcpyFromUint8Array(data, nextFrame.length, nextFrame)
      addAVPacketData(avpacket, data, nextFrame.length)

      avpacket.pos = now
      avpacket.streamIndex = stream.index
      avpacket.timeBase.den = stream.timeBase.den
      avpacket.timeBase.num = stream.timeBase.num
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      avpacket.dts = avpacket.pts = this.context.frameInfo.isVarSize
        ? this.context.frameInfo.frameOrSampleNum
        : this.context.frameInfo.frameOrSampleNum * static_cast<int64>(this.context.frameInfo.blocksize)

      if (this.context.isVarSize < 0) {
        this.context.isVarSize = this.context.frameInfo.isVarSize
      }

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

  private async syncFrame(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT
    while (true) {
      try {
        const word = await formatContext.ioReader.peekUint16()
        if (word === 0xfff9 || word === 0xfff8) {
          pos = formatContext.ioReader.getPos()
          this.context.bitReader.reset()
          this.context.bitReader.appendBuffer(await formatContext.ioReader.peekBuffer(16))
          if (!decodeFrameHeader(this.context.bitReader, {}, true)) {
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

    const context = stream.privData as FlacContext

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
        await this.syncFrame(formatContext)
      }
      return now
    }

    if (stream && stream.sampleIndexes.length) {
      let index = array.binarySearch(stream.sampleIndexes, (item) => {
        if (item.pts > timestamp) {
          return -1
        }
        return 1
      })
      if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 5000n) {
        logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
        await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
        context.cacheBuffer = null
        return now
      }
    }

    if (context.seekPoints.length) {
      let index = 0
      for (let i = 0; i < context.seekPoints.length; i++) {
        if (context.seekPoints[i].pts === timestamp) {
          index = i
          break
        }
        else if (context.seekPoints[i].pts > timestamp) {
          index = Math.max(i - 1, 0)
          break
        }
      }
      const cue =  context.seekPoints[index]
      logger.debug(`seek in seekPoints, found index: ${index}, pts: ${cue.pts}, pos: ${cue.pos + context.firstFramePos}`)
      await formatContext.ioReader.seek(cue.pos + context.firstFramePos)
      context.cacheBuffer = null
      return now
    }

    logger.debug('not found any keyframe index, try to seek in bytes')

    const ret = await seekInBytes(
      formatContext,
      stream,
      timestamp,
      context.firstFramePos,
      this.readAVPacket.bind(this),
      this.syncFrame.bind(this)
    )
    if (ret > 0) {
      context.cacheBuffer = null
    }
    return ret
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
