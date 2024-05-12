/*
 * libmedia mov decoder
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

import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVIFormatContext } from '../AVFormatContext'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'

import { IOError } from 'common/io/error'
import { MOVContext, MOVStreamContext, MovFormatOptions } from './mov/type'
import mktag from '../function/mktag'
import { BoxType } from './mov/boxType'
import * as imov from './mov/imov'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import IFormat from './IFormat'
import { getNextSample } from './mov/function/getNextSample'
import createMovContext from './mov/function/createMovContext'
import { AVFormat, AVSeekFlags } from '../avformat'
import * as array from 'common/util/array'
import { mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData } from 'avutil/util/avpacket'
import { avRescaleQ } from 'avutil/util/rational'
import AVStream from '../AVStream'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { IOFlags } from 'common/io/flags'
import { BitFormat } from '../codecs/h264'

export default class IMovFormat extends IFormat {

  public type: AVFormat = AVFormat.MOV

  private context: MOVContext

  public options: MovFormatOptions

  constructor(options: MovFormatOptions = {}) {
    super()

    this.options = options

    this.context = createMovContext()
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      let ret = 0

      let size = await formatContext.ioReader.readUint32()
      let type = await formatContext.ioReader.readUint32()

      if (type !== mktag(BoxType.FTYP)) {
        logger.error('the file format is not mp4')
        return errorType.DATA_INVALID
      }

      await imov.readFtyp(formatContext.ioReader, this.context, {
        type,
        size: size - 8
      })

      let firstMdatPos = 0n

      while (!this.context.foundMoov) {
        const pos = formatContext.ioReader.getPos()
        size = await formatContext.ioReader.readUint32()
        type = await formatContext.ioReader.readUint32()

        if (size < 8) {
          logger.error(`invalid box size ${size}`)
          return errorType.DATA_INVALID
        }

        if (type === mktag(BoxType.MDAT)) {
          if (!this.context.foundMdat) {
            firstMdatPos = pos
          }
          this.context.foundMdat = true
          await formatContext.ioReader.seek(pos + static_cast<int64>(size))
        }
        else if (type === mktag(BoxType.MOOV)) {
          await imov.readMoov(formatContext.ioReader, formatContext, this.context, {
            size: size - 8,
            type
          })
          this.context.foundMoov = true
        }
        else {
          await formatContext.ioReader.seek(pos + static_cast<int64>(size))
        }
      }

      if (!this.context.fragment && !this.context.foundMdat) {
        const nextType = (await formatContext.ioReader.peekUint64()) >> 32n
        if (Number(nextType) === mktag(BoxType.MOOF)) {
          this.context.fragment = true
        }
      }

      if (this.context.fragment && formatContext.ioReader.flags & IOFlags.SEEKABLE) {
        const now = formatContext.ioReader.getPos()
        const fileSize = await formatContext.ioReader.fileSize()

        if (fileSize > 16n) {
          await formatContext.ioReader.seek(fileSize - 12n)
          let type = await formatContext.ioReader.readUint32()
          if (type === mktag(BoxType.MFRO)) {
            await formatContext.ioReader.skip(4)
            const mfraSize = await formatContext.ioReader.readUint32()
            await formatContext.ioReader.seek(fileSize - static_cast<int64>(mfraSize))
            const size = await formatContext.ioReader.readUint32()
            type = await formatContext.ioReader.readUint32()
            if (type === mktag(BoxType.MFRA)) {
              await imov.readMfra(formatContext.ioReader, formatContext, this.context, {
                size: size - 8,
                type
              })
            }
          }
          await formatContext.ioReader.seek(now)
        }
      }

      if (!this.context.fragment && this.context.foundMdat) {
        await formatContext.ioReader.seek(firstMdatPos)
      }

      return ret
    }
    catch (error) {

      logger.error(error.message)

      if (!this.context.foundMoov) {
        logger.error('moov not found')
      }

      return formatContext.ioReader.error
    }
  }

  @deasync
  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const { sample, stream } = getNextSample(formatContext, this.context)

    if (sample) {
      avpacket.streamIndex = stream.index
      avpacket.dts = sample.dts
      avpacket.pts = sample.pts
      avpacket.duration = static_cast<int64>(sample.duration)
      avpacket.flags |= sample.flags
      avpacket.pos = sample.pos
      avpacket.timeBase.den = stream.timeBase.den
      avpacket.timeBase.num = stream.timeBase.num

      if (stream.startTime === NOPTS_VALUE_BIGINT) {
        stream.startTime = avpacket.pts || avpacket.dts
      }

      await formatContext.ioReader.seek(avpacket.pos)

      const len = sample.size
      const data = avMalloc(len)
      addAVPacketData(avpacket, data, len)
      await formatContext.ioReader.readBuffer(len, mapSafeUint8Array(data, len))

      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
      ) {
        avpacket.bitFormat = BitFormat.AVCC
      }

      if (stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
        const len = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA].length
        const extradata = avMalloc(len)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, len)
        memcpyFromUint8Array(extradata, len, stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA])
        delete stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
      }
    }
    else {
      return IOError.END
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      if (this.context.fragment && !this.context.currentFragment) {
        while (!this.context.currentFragment) {
          const pos = formatContext.ioReader.getPos()
          const size = await formatContext.ioReader.readUint32()
          const type = await formatContext.ioReader.readUint32()

          if (type === mktag(BoxType.MOOF)) {
            this.context.currentFragment = {
              pos: pos,
              size,
              sequence: 0,
              tracks: [],
              currentTrack: null
            }

            await imov.readMoof(
              formatContext.ioReader,
              formatContext,
              this.context,
              {
                type,
                size: size - 8
              }
            )
          }
          else if (type === mktag(BoxType.MOOV)) {
            await imov.readMoov(formatContext.ioReader, formatContext, this.context, {
              size: size - 8,
              type
            })
          }
          else {
            await formatContext.ioReader.skip(size - 8)
          }
        }
      }

      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return formatContext.ioReader.error
    }
  }


  public async seek(
    formatContext: AVIFormatContext,
    stream: AVStream,
    timestamp: int64,
    flags: int32
  ): Promise<int64> {

    assert(stream)

    const pts = timestamp

    const streamContext = stream.privData as MOVStreamContext

    // dash 使用时间戳去 seek
    if (flags & AVSeekFlags.TIMESTAMP && this.context.fragment) {
      const seekTime = avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      await formatContext.ioReader.seek(seekTime, true)
      this.context.currentFragment = null
      return 0n
    }

    if (this.context.fragment) {
      if (streamContext.fragIndexes.length) {
        let index = array.binarySearch(streamContext.fragIndexes, (item) => {
          if (item.time > pts) {
            return -1
          }
          else if (item.time === pts) {
            return 0
          }
          return 1
        })
        if (index > -1) {
          await formatContext.ioReader.seek(streamContext.fragIndexes[index].pos, true)
          this.context.currentFragment = null
          return 0n
        }
      }
      return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
    }

    let index = array.binarySearch(streamContext.samplesIndex, (item) => {
      if (item.pts > pts) {
        return -1
      }
      else if (item.pts === pts) {
        return 0
      }
      return 1
    })

    if (index > -1 && stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      let i = index
      for (; i >= 0; i--) {
        if (streamContext.samplesIndex[i].flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
          index = i
          break
        }
      }
      if (i < 0) {
        index = -1
      }
    }

    if (index > -1) {
      streamContext.currentSample = index
      streamContext.sampleEnd = false
      array.each(formatContext.streams, (st) => {
        if (st !== stream) {
          const stContext = st.privData as MOVStreamContext
          let seeked = false
          let timestamp = avRescaleQ(streamContext.samplesIndex[streamContext.currentSample].pts, stream.timeBase, st.timeBase)
          array.each(stContext.samplesIndex, (sample, i) => {
            if (sample.pts >= timestamp) {
              stContext.currentSample = i
              seeked = true
              return false
            }
          })

          if (!seeked) {
            stContext.sampleEnd = true
            stContext.currentSample = stContext.samplesIndex.length
          }
          else {
            stContext.sampleEnd = false
          }
        }
      })
      return 0n
    }
    return static_cast<int64>(errorType.DATA_INVALID)
  }

  public getAnalyzeStreamsCount(): number {
    // mov 在 readheader 时分析了 moov，不需要在进行流分析
    return 0
  }
}
