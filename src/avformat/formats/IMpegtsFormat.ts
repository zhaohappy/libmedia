/*
 * libmedia mpegts decoder
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

import { IOError } from 'common/io/error'
import { MpegtsContext, MpegtsStreamContext } from './mpegts/type'
import createMpegtsContext from './mpegts/function/createMpegtsContext'
import * as impegts from './mpegts/impegts'
import * as mpegts from './mpegts/mpegts'
import handleSectionSlice from './mpegts/function/handleSectionSlice'
import * as errorType from 'avutil/error'
import parsePES from './mpegts/function/parsePES'
import parsePESSlice from './mpegts/function/parsePESSlice'
import clearTSSliceQueue from './mpegts/function/clearTSSliceQueue'
import { TSSliceQueue } from './mpegts/struct'
import IFormat from './IFormat'
import initStream from './mpegts/function/initStream'
import { AVFormat, AVSeekFlags } from 'avutil/avformat'
import { addAVPacketData, createAVPacket, deleteAVPacketSideData,
  destroyAVPacket, getAVPacketData, getAVPacketSideData
} from 'avutil/util/avpacket'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import AVStream from 'avutil/AVStream'
import seekInBytes from '../function/seekInBytes'
import { avRescaleQ } from 'avutil/util/rational'
import * as array from 'common/util/array'
import * as mp3 from 'avutil/codecs/mp3'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as aac from 'avutil/codecs/aac'
import * as opus from 'avutil/codecs/opus'
import * as ac3 from 'avutil/codecs/ac3'
import * as dts from 'avutil/codecs/dts'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import { avMalloc } from 'avutil/util/mem'
import { memcpy, mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { BitFormat } from 'avutil/codecs/h264'
import * as is from 'common/util/is'

export default class IMpegtsFormat extends IFormat {

  public type: AVFormat = AVFormat.MPEGTS

  private context: MpegtsContext

  private firstTSPacketPos: int64

  private cacheAVPacket: pointer<AVPacket>

  constructor() {
    super()
    this.context = createMpegtsContext()
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
    this.cacheAVPacket = nullptr
  }

  public async destroy(formatContext: AVIFormatContext) {
    if (this.cacheAVPacket) {
      destroyAVPacket(this.cacheAVPacket)
      this.cacheAVPacket = nullptr
    }
    array.each(formatContext.streams, (stream) => {
      const streamContext = stream.privData as MpegtsStreamContext
      if (streamContext.filter) {
        streamContext.filter.destroy()
        streamContext.filter = null
      }
    })
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      let ret = 0

      let packetSize = await impegts.getPacketSize(formatContext.ioReader)

      if (!packetSize) {
        packetSize = mpegts.TS_PACKET_SIZE
      }

      this.context.tsPacketSize = packetSize

      // 码流可能存在一些非 ts packet 数据，跳过
      if (this.context.tsPacketSize !== mpegts.TS_DVHS_PACKET_SIZE
        && (await formatContext.ioReader.peekUint8() !== 0x47)
      ) {
        await this.syncTSPacket(formatContext, false)
      }

      while ((!this.context.hasPAT || !this.context.hasPMT)) {
        const tsPacket = await impegts.parseTSPacket(formatContext.ioReader, this.context)

        if (!tsPacket.payload) {
          continue
        }

        if (tsPacket.pid === 0
          || tsPacket.pid === this.context.currentPmtPid
          || this.context.pmt.pid2StreamType.get(tsPacket.pid) === mpegts.TSStreamType.kSCTE35
        ) {
          handleSectionSlice(tsPacket, this.context)
        }
      }

      if (!this.context.hasPAT || !this.context.hasPMT) {
        return errorType.DATA_INVALID
      }
      else {
        this.firstTSPacketPos = formatContext.ioReader.getPos()
      }

      return ret
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }

  }

  private checkExtradata(avpacket: pointer<AVPacket>, stream: AVStream) {
    if (!stream.codecpar.extradata) {
      let element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (!element) {
        return
      }
      stream.codecpar.extradata = avMalloc(element.size)
      memcpy(stream.codecpar.extradata, element.data, element.size)
      stream.codecpar.extradataSize = static_cast<int32>(element.size)
      deleteAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)

      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
        aac.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
        opus.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
      }
    }
  }

  private parsePESSlice(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>, queue: TSSliceQueue, stream: AVStream) {
    const pes = parsePESSlice(queue)

    let ret = parsePES(pes)

    if (ret) {
      return ret
    }

    if (pes.randomAccessIndicator || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H265
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      avpacket.bitFormat = BitFormat.ANNEXB
    }

    avpacket.streamIndex = stream.index

    avpacket.dts = pes.dts
    avpacket.pts = pes.pts
    avpacket.pos = pes.pos
    avpacket.timeBase.den = 90000
    avpacket.timeBase.num = 1

    if (stream.startTime === NOPTS_VALUE_BIGINT) {
      stream.startTime = avpacket.pts || avpacket.dts
    }

    const payload: pointer<uint8> = avMalloc(pes.payload.length)
    memcpyFromUint8Array(payload, pes.payload.length, pes.payload)
    addAVPacketData(avpacket, payload, pes.payload.length)

    clearTSSliceQueue(queue)

    const streamContext = stream.privData as MpegtsStreamContext
    if (streamContext.filter) {
      let ret = 0
      ret = streamContext.filter.sendAVPacket(avpacket)

      if (ret < 0) {
        logger.error('send avpacket to bsf failed')
        return errorType.DATA_INVALID
      }

      ret = streamContext.filter.receiveAVPacket(avpacket)

      if (ret < 0) {
        logger.error('receive avpacket from bsf failed')
        return errorType.DATA_INVALID
      }

      avpacket.timeBase.den = 90000
      avpacket.timeBase.num = 1
      avpacket.streamIndex = stream.index

      this.checkExtradata(avpacket, stream)

      while (true) {
        const avpacket = this.cacheAVPacket || createAVPacket()
        ret = streamContext.filter.receiveAVPacket(avpacket)
        if (ret === 0) {
          avpacket.timeBase.den = 90000
          avpacket.timeBase.num = 1
          avpacket.streamIndex = stream.index
          this.checkExtradata(avpacket, stream)
          formatContext.interval.packetBuffer.push(avpacket)
          this.cacheAVPacket = nullptr
        }
        else {
          this.cacheAVPacket = avpacket
          break
        }
      }
    }
    else {
      const streamType = this.context.pmt.pid2StreamType.get(streamContext.pid)
      if (streamType === mpegts.TSStreamType.AUDIO_MPEG1
        || streamType === mpegts.TSStreamType.AUDIO_MPEG2
      ) {
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY

        const buffer = getAVPacketData(avpacket)

        const ver = (buffer[1] >>> 3) & 0x03
        const layer = (buffer[1] & 0x06) >> 1
        // const bitrateIndex = (buffer[2] & 0xF0) >>> 4
        const samplingFreqIndex = (buffer[2] & 0x0C) >>> 2

        const channelMode = (buffer[3] >>> 6) & 0x03

        const channelCount = channelMode !== 3 ? 2 : 1
        const profile = mp3.getProfileByLayer(layer)
        const sampleRate = mp3.getSampleRateByVersionIndex(ver, samplingFreqIndex)

        const hasNewExtraData = stream.codecpar.profile !== profile
          || stream.codecpar.sampleRate !== sampleRate
          || stream.codecpar.chLayout.nbChannels !== channelCount

        if (hasNewExtraData) {
          stream.codecpar.profile = profile
          stream.codecpar.sampleRate = sampleRate
          stream.codecpar.chLayout.nbChannels = channelCount
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
        if (!stream.codecpar.extradata) {
          const extradata = h264.generateAnnexbExtradata(getAVPacketData(avpacket))
          if (extradata) {
            stream.codecpar.extradata = avMalloc(extradata.length)
            memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
            stream.codecpar.extradataSize = extradata.length
            h264.parseAVCodecParameters(stream, extradata)
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
          }
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        if (!stream.codecpar.extradata) {
          const extradata = hevc.generateAnnexbExtradata(getAVPacketData(avpacket))
          if (extradata) {
            stream.codecpar.extradata = avMalloc(extradata.length)
            memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
            stream.codecpar.extradataSize = extradata.length
            hevc.parseAVCodecParameters(stream, extradata)
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
          }
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
        if (!stream.codecpar.extradata) {
          const extradata = vvc.generateAnnexbExtradata(getAVPacketData(avpacket))
          if (extradata) {
            stream.codecpar.extradata = avMalloc(extradata.length)
            memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
            stream.codecpar.extradataSize = extradata.length
            vvc.parseAVCodecParameters(stream, extradata)
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
          }
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3
      ) {
        if (stream.codecpar.sampleRate === NOPTS_VALUE) {
          const info = ac3.parseHeader(getAVPacketData(avpacket))
          if (!is.number(info)) {
            stream.codecpar.sampleRate = reinterpret_cast<int32>(info.sampleRate)
            stream.codecpar.chLayout.nbChannels = reinterpret_cast<int32>(info.channels)
          }
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS) {
        if (stream.codecpar.sampleRate === NOPTS_VALUE) {
          const info = dts.parseHeader(getAVPacketData(avpacket))
          if (!is.number(info)) {
            stream.codecpar.sampleRate = reinterpret_cast<int32>(info.sampleRate)
            stream.codecpar.chLayout.nbChannels = reinterpret_cast<int32>(info.channels)
          }
        }
      }
    }
    return 0
  }

  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    if (this.context.ioEnd) {
      if (!this.context.tsSliceQueueMap.size) {
        return IOError.END
      }

      const it = this.context.tsSliceQueueMap.values()

      let queue: TSSliceQueue

      while (true) {
        const next = it.next()

        if (next.value && next.value.slices.length) {
          queue = next.value
          break
        }

        if (next.done) {
          break
        }
      }

      if (!queue) {
        return IOError.END
      }

      const stream = formatContext.streams.find((stream) => {
        return (stream.privData as MpegtsStreamContext).pid === queue.pid
      })

      if (stream) {
        return this.parsePESSlice(formatContext, avpacket, queue, stream)
      }
      else {
        clearTSSliceQueue(queue)
        return this.readAVPacket_(formatContext, avpacket)
      }
    }
    else {
      try {
        while (true) {
          // 码流可能存在一些非 ts packet 数据，跳过
          if (this.context.tsPacketSize !== mpegts.TS_DVHS_PACKET_SIZE
            && (await formatContext.ioReader.peekUint8() !== 0x47)
          ) {
            // 将剩余缓冲区移动到头部，方便 syncTSPacket 往回 seek
            // m3u8 切片是不支持通过字节位置 seek 的
            try {
              await formatContext.ioReader.flush()
            }
            catch (e) {}
            await this.syncTSPacket(formatContext, false)
          }
          const tsPacket = await impegts.parseTSPacket(formatContext.ioReader, this.context)
          if (!tsPacket.payload) {
            continue
          }

          if (tsPacket.pid === 0
            || tsPacket.pid === this.context.currentPmtPid
            || this.context.pmt.pid2StreamType.get(tsPacket.pid) === mpegts.TSStreamType.kSCTE35
          ) {
            handleSectionSlice(tsPacket, this.context)
            continue
          }

          const streamType = this.context.pmt.pid2StreamType.get(tsPacket.pid)

          if (!streamType) {
            continue
          }

          let stream = formatContext.streams.find((stream) => {
            return (stream.privData as MpegtsStreamContext).pid === tsPacket.pid
          })

          if (!stream) {
            stream = formatContext.createStream()
            initStream(tsPacket.pid, stream, this.context)
          }

          let pesPacketLength = (tsPacket.payload[4] << 8) | tsPacket.payload[5]

          let pesSliceQueue = this.context.tsSliceQueueMap.get(tsPacket.pid)

          let packetGot = false

          if (pesSliceQueue) {
            if (pesSliceQueue.totalLength > 0 && tsPacket.payloadUnitStartIndicator) {
              const ret = this.parsePESSlice(formatContext, avpacket, pesSliceQueue, stream)
              if (ret < 0) {
                return ret
              }
              packetGot = true
            }
          }
          else {
            if (!tsPacket.payloadUnitStartIndicator) {
              if (defined(ENABLE_LOG_TRACE)) {
                logger.trace('got ts packet before payload unit start indicator, ignore it')
              }
              continue
            }
            pesSliceQueue = new TSSliceQueue()
            this.context.tsSliceQueueMap.set(tsPacket.pid, pesSliceQueue)
          }

          if (tsPacket.payloadUnitStartIndicator) {
            pesSliceQueue.randomAccessIndicator = tsPacket.adaptationFieldInfo?.randomAccessIndicator ?? 0
            pesSliceQueue.pos = tsPacket.pos
            pesSliceQueue.pid = tsPacket.pid
            pesSliceQueue.streamType = streamType
            pesSliceQueue.expectedLength = pesPacketLength === 0 ? 0 : pesPacketLength + 6
          }

          pesSliceQueue.slices.push(tsPacket.payload)
          pesSliceQueue.totalLength += tsPacket.payload.length

          if (pesSliceQueue.expectedLength > 0 && pesSliceQueue.expectedLength === pesSliceQueue.totalLength) {
            const ret = this.parsePESSlice(formatContext, avpacket, pesSliceQueue, stream)
            if (ret < 0) {
              return ret
            }
            packetGot = true
          }

          if (packetGot) {
            return 0
          }
        }
      }
      catch (error) {
        if (formatContext.ioReader.error === IOError.END && !this.context.ioEnd) {
          this.context.ioEnd = true
          return this.readAVPacket_(formatContext, avpacket)
        }
        else if (formatContext.ioReader.error === IOError.END) {
          return IOError.END
        }
        else {
          logger.error(`read packet error, ${error}`)
          return errorType.DATA_INVALID
        }
      }
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      return this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(error.message)
      }
      return formatContext.ioReader.error
    }
  }

  private async syncTSPacket(formatContext: AVIFormatContext, syncPES: boolean = true) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    const analyzeCount = 10

    while (true) {
      try {
        const byte = await formatContext.ioReader.readUint8()
        if (byte === 0x47) {
          if (this.context.tsPacketSize === mpegts.TS_DVHS_PACKET_SIZE) {
            pos = formatContext.ioReader.getPos() - 5n
          }
          else {
            pos = formatContext.ioReader.getPos() - 1n
          }
          let count = 0
          let now = formatContext.ioReader.getPos()
          while (count <= analyzeCount) {
            await formatContext.ioReader.skip(this.context.tsPacketSize - 1)

            const byte = await formatContext.ioReader.readUint8()

            if (byte === 0x47) {
              count++
            }
            else {
              break
            }
          }
          if (count < analyzeCount) {
            pos = NOPTS_VALUE_BIGINT
            await formatContext.ioReader.seek(now)
            continue
          }
          else {
            break
          }
        }
      }
      catch (error) {
        pos = NOPTS_VALUE_BIGINT
        break
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      // 移动到 ts packet 的开始
      await formatContext.ioReader.seek(pos)
      if (syncPES) {
        while (true) {
          const tsPacket = await impegts.parseTSPacket(formatContext.ioReader, this.context)
          // 移动到下一个 pes 的开始
          if (tsPacket.payloadUnitStartIndicator) {
            // 返回到上一个 ts packet 的开始
            await formatContext.ioReader.seek(pos)
            formatContext.streams.forEach((stream) => {
              let pesSliceQueue = this.context.tsSliceQueueMap.get((stream.privData as MpegtsStreamContext).pid)
              if (pesSliceQueue) {
                clearTSSliceQueue(pesSliceQueue)
              }
            })
            break
          }
          pos = formatContext.ioReader.getPos()
        }
      }
    }
  }

  public async seek(
    formatContext: AVIFormatContext,
    stream: AVStream,
    timestamp: int64,
    flags: int32
  ): Promise<int64> {

    let now = formatContext.ioReader.getPos()

    this.context.tsSliceQueueMap.forEach((queue) => {
      if (queue.slices.length && queue.pos < now) {
        now = queue.pos
      }
      clearTSSliceQueue(queue)
    })

    this.context.pmt.pid2StreamType.forEach((streamType, pid) => {
      this.context.tsSliceQueueMap.delete(pid)
    })

    // m3u8 使用时间戳去 seek
    if (flags & AVSeekFlags.TIMESTAMP) {
      const seekTime = avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      await formatContext.ioReader.seek(seekTime, true)
      this.context.ioEnd = false
      return 0n
    }

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
        await this.syncTSPacket(formatContext)
      }

      this.context.ioEnd = false

      return now
    }
    else {

      if (stream && stream.sampleIndexes.length) {
        let index = array.binarySearch(stream.sampleIndexes, (item) => {
          if (item.pts > timestamp) {
            return -1
          }
          return 1
        })
        if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 10000n) {
          logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
          await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
          this.context.ioEnd = false
          return now
        }
      }

      logger.debug('not found any keyframe index, try to seek in bytes')

      let ret = await seekInBytes(
        formatContext,
        stream,
        timestamp,
        this.firstTSPacketPos,
        this.readAVPacket.bind(this),
        this.syncTSPacket.bind(this)
      )
      if (ret >= 0) {
        this.context.ioEnd = false
      }
      return ret
    }
  }

  public getAnalyzeStreamsCount(): number {
    return this.context.pmt?.pid2StreamType.size ?? 1
  }
}
