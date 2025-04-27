/*
 * libmedia demux util
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
import { AVIFormatContext } from './AVFormatContext'
import * as object from 'common/util/object'
import * as array from 'common/util/array'
import { AV_MILLI_TIME_BASE_Q, INT32_MAX, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVPacketSideDataType, AVCodecID, AVMediaType } from 'avutil/codec'
import { AVFormat, AVSeekFlags, IOFlags } from 'avutil/avformat'
import { checkStreamParameters } from './function/checkStreamParameters'
import { avD2Q, avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import { copyAVPacketData, createAVPacket, destroyAVPacket,
  getAVPacketSideData,
  hasAVPacketSideData, refAVPacket, unrefAVPacket
} from 'avutil/util/avpacket'
import { DURATION_MAX_READ_SIZE, SAMPLE_INDEX_STEP } from './config'
import * as errorType from 'avutil/error'
import AVStream from 'avutil/AVStream'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import WasmVideoDecoder from 'avcodec/wasmcodec/VideoDecoder'
import WasmAudioDecoder from 'avcodec/wasmcodec/AudioDecoder'
import { destroyAVFrame } from 'avutil/util/avframe'
import { mapUint8Array } from 'cheap/std/memory'
import roundStandardFramerate from './function/roundStandardFramerate'
import guessDelayFromPts from './function/guessDelayFromPts'
import guessDtsFromPts from './function/guessDtsFromPts'
import { AVChannelLayout, AVChannelOrder } from 'avutil/audiosamplefmt'

const MIN_ANALYZE_SAMPLES = 16

export interface DemuxOptions {
  /**
   * 只分析流的必要参数（设置 true 将不会分析视频帧率和音频每帧采用点数等参数）
   */
  fastOpen?: boolean
  /**
   * 最大流分析时长（毫秒）
   */
  maxAnalyzeDuration?: number
}

interface StreamDemuxPrivateData {
  delay?: int32
  dtsQueue?: int64[]
}

export const DefaultDemuxOptions = {
  fastOpen: false,
  maxAnalyzeDuration: 15000
}

/**
 * 打开流
 * 
 * @param formatContext 
 * @param options DemuxOptions 选项
 * @returns 成功返回 0，否则返回错误码
 */
export async function open(formatContext: AVIFormatContext, options: DemuxOptions = {}): Promise<int32> {
  const opts = object.extend({}, DefaultDemuxOptions, options)
  if (!formatContext.ioReader) {
    logger.fatal('need IOReader')
  }
  if (!formatContext.iformat) {
    logger.fatal('need iformat')
  }
  if (formatContext.iformat.type === AVFormat.MPEGTS) {
    // mpegts 的最小分析时长为 2 秒，mpegts 的 dts 一般从 1.4 秒开始
    opts.maxAnalyzeDuration = Math.max(opts.maxAnalyzeDuration, 2000)
  }
  formatContext.iformat.init(formatContext)
  formatContext.options = opts
  return formatContext.iformat.readHeader(formatContext)
}

async function estimateDurationFromPts(formatContext: AVIFormatContext) {
  const fileSize = await formatContext.ioReader.fileSize()
  if (fileSize <= 0n) {
    return
  }

  const cache = formatContext.interval.packetBuffer
  formatContext.interval.packetBuffer = []

  let now = formatContext.ioReader.getPos()

  let retry = 0
  while (retry < 4) {
    const pos = fileSize - static_cast<int64>(DURATION_MAX_READ_SIZE << retry)
    const nextPos = await formatContext.iformat.seek(formatContext, null, pos, AVSeekFlags.BYTE)
    if (nextPos < 0) {
      break
    }
    else if (!retry && nextPos > 0) {
      now = nextPos
    }
    const lastDurationMap: Record<number, int64> = {}

    const avpacket = createAVPacket()

    while (true) {
      const ret = await readAVPacket(formatContext, avpacket)

      if (ret < 0) {
        break
      }
      else {
        let duration = avpacket.pts
        const stream = formatContext.getStreamByIndex(avpacket.streamIndex)
        if (stream.startTime !== NOPTS_VALUE_BIGINT) {
          duration -= stream.startTime
        }
        else {
          duration -= stream.firstDTS
        }

        if (duration > 0n) {
          if (stream.duration === NOPTS_VALUE_BIGINT
            || !lastDurationMap[avpacket.streamIndex]
            || (
              stream.duration < duration
              && Math.abs(static_cast<double>(duration - stream.duration)) < 60 * stream.timeBase.den / stream.timeBase.num
            )
          ) {
            stream.duration = duration
          }
          lastDurationMap[avpacket.streamIndex] = duration
        }
      }
    }

    destroyAVPacket(avpacket)

    let hasDuration = true

    array.each(formatContext.streams, (stream) => {
      if (stream.duration === NOPTS_VALUE_BIGINT) {
        hasDuration = false
        return false
      }
    })

    if (hasDuration) {
      break
    }
    retry++
  }

  array.each(formatContext.interval.packetBuffer, (avpacket) => {
    destroyAVPacket(avpacket)
  })
  formatContext.interval.packetBuffer = cache
  await formatContext.iformat.seek(formatContext, null, now, AVSeekFlags.BYTE)
}

/**
 * 分析流 stream
 * 
 * @param formatContext 
 * @returns 成功返回 0，否则返回错误码
 */
export async function analyzeStreams(formatContext: AVIFormatContext): Promise<int32> {
  const streamFirstGotMap: Record<int32, boolean> = {}
  const streamDtsMap: Record<int32, int64[]> = {}
  const streamPtsMap: Record<int32, int64[]> = {}
  const streamBitMap: Record<int32, number> = {}
  const streamContextMap: Record<int32, StreamDemuxPrivateData> = {}
  const decoderMap: Record<int32, WasmVideoDecoder | WasmAudioDecoder> = {}
  const pictureGot: Record<int32, boolean> = {}

  const needStreams = formatContext.iformat.getAnalyzeStreamsCount()
  let avpacket: pointer<AVPacket> = nullptr
  const caches: pointer<AVPacket>[] = []
  let ret = 0

  function checkPictureGot() {
    if (!formatContext.getDecoderResource) {
      return true
    }
    for (let i = 0; i < formatContext.streams.length; i++) {
      if (decoderMap[formatContext.streams[i].index] && !pictureGot[formatContext.streams[i].index]) {
        return false
      }
    }
    return true
  }

  function calculate(stream: AVStream, end: boolean) {

    let dtsList = streamDtsMap[stream.index]
    const ptsList = streamPtsMap[stream.index]

    let delay = stream.codecpar.videoDelay

    if (ptsList?.length) {
      delay = Math.min(
        Math.max(guessDelayFromPts(ptsList), stream.codecpar.videoDelay),
        16
      )
      if (end) {
        stream.codecpar.videoDelay = delay
      }
    }

    if (!dtsList && ptsList?.length) {
      if (delay) {
        dtsList = guessDtsFromPts(delay, ptsList)
      }
      else {
        dtsList = ptsList.slice()
      }
      const context: StreamDemuxPrivateData = {
        delay,
        dtsQueue: dtsList
      }
      dtsList = []
      streamContextMap[stream.index] = context
      for (let i = 0; i < caches.length; i++) {
        if (stream.index === caches[i].streamIndex) {
          const dts = context.dtsQueue.shift()
          caches[i].dts = dts
          dtsList.push(dts)
          const sample = stream.sampleIndexes.find((sample) => {
            return sample.pts === caches[i].pts
          })
          if (sample) {
            sample.dts = caches[i].dts
          }
        }
      }
    }

    if (dtsList && dtsList.length > 1) {
      let count = 0n
      for (let i = 1; i < dtsList.length; i++) {
        count += dtsList[i] - dtsList[i - 1]
      }
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        && stream.codecpar.sampleRate > 0
        && !stream.codecpar.frameSize
      ) {
        let value = static_cast<double>(count) / (dtsList.length - 1)
        stream.codecpar.frameSize = Math.round(value / stream.timeBase.den * stream.timeBase.num * stream.codecpar.sampleRate)
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        const q = avD2Q((stream.timeBase.den * (dtsList.length - 1))
          / (reinterpret_cast<int32>(static_cast<double>(count)) * stream.timeBase.num), INT32_MAX)
        stream.codecpar.framerate.num = q.num
        stream.codecpar.framerate.den = q.den
        roundStandardFramerate(stream.codecpar.framerate)
      }
      const duration = static_cast<double>(dtsList[dtsList.length - 1] - stream.startTime) * stream.timeBase.num / stream.timeBase.den
      if (duration) {
        stream.codecpar.bitrate = static_cast<int64>(streamBitMap[stream.index] * 8 / duration)
      }
    }
  }

  function finalizeAnalyze() {
    formatContext.streams.forEach((stream) => {
      calculate(stream, true)
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        if (stream.codecpar.chLayout.nbChannels === 1) {
          stream.codecpar.chLayout.u.mask = static_cast<uint64>(AVChannelLayout.AV_CHANNEL_LAYOUT_MONO as uint32)
          stream.codecpar.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_NATIVE
        }
        else if (stream.codecpar.chLayout.nbChannels === 2) {
          stream.codecpar.chLayout.u.mask = static_cast<uint64>(AVChannelLayout.AV_CHANNEL_LAYOUT_STEREO as uint32)
          stream.codecpar.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_NATIVE
        }
      }
    })
  }

  while (true) {
    if (formatContext.streams.length >= needStreams
      && (formatContext.options as DemuxOptions).fastOpen
      && checkStreamParameters(formatContext)
    ) {
      finalizeAnalyze()
      break
    }

    if (!avpacket) {
      avpacket = createAVPacket()
    }
    let packetCached = false
    ret = await readAVPacket(formatContext, avpacket)

    if (ret !== 0) {
      finalizeAnalyze()
      break
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (avpacket.size) {
      packetCached = true
      caches.push(avpacket)

      if (!streamFirstGotMap[stream.index]) {
        stream.firstDTS = avpacket.dts
        stream.startTime = avpacket.pts
        streamFirstGotMap[stream.index] = true
      }
      else if (avpacket.pts < stream.startTime) {
        stream.startTime = avpacket.pts
      }

      if (avpacket.dts !== NOPTS_VALUE_BIGINT) {
        if (streamDtsMap[stream.index]) {
          streamDtsMap[stream.index].push(avpacket.dts)
        }
        else {
          streamDtsMap[stream.index] = [avpacket.dts]
        }
      }
      if (streamPtsMap[stream.index]) {
        streamPtsMap[stream.index].push(avpacket.pts)
      }
      else {
        streamPtsMap[stream.index] = [avpacket.pts]
      }

      if (streamBitMap[stream.index]) {
        streamBitMap[stream.index] += avpacket.size
      }
      else {
        streamBitMap[stream.index] = avpacket.size
      }

      if (!pictureGot[stream.index]
        && formatContext.getDecoderResource
        && !(formatContext.options as DemuxOptions).fastOpen
      ) {
        let decoder = decoderMap[stream.index]
        if (!decoder) {
          const resource = await formatContext.getDecoderResource(stream.codecpar.codecType, stream.codecpar.codecId)
          if (resource) {
            if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
              decoder = new WasmAudioDecoder({
                resource,
                onReceiveAVFrame: (avframe) => {
                  stream.codecpar.format = avframe.format
                  stream.codecpar.frameSize = avframe.nbSamples
                  stream.codecpar.sampleRate = avframe.sampleRate
                  stream.codecpar.chLayout = avframe.chLayout
                  destroyAVFrame(avframe)
                  pictureGot[stream.index] = true
                },
              })
            }
            else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              if (resource.threadModule) {
                delete resource.threadModule
              }
              decoder = new WasmVideoDecoder({
                resource,
                onReceiveAVFrame: (avframe) => {
                  stream.codecpar.format = avframe.format
                  stream.codecpar.colorRange = avframe.colorRange
                  stream.codecpar.colorSpace = avframe.colorSpace
                  stream.codecpar.colorPrimaries = avframe.colorPrimaries
                  stream.codecpar.colorTrc = avframe.colorTrc
                  stream.codecpar.chromaLocation = avframe.chromaLocation
                  stream.codecpar.sampleAspectRatio = avframe.sampleAspectRatio
                  stream.codecpar.width = avframe.width
                  stream.codecpar.height = avframe.height
                  destroyAVFrame(avframe)
                  pictureGot[stream.index] = true
                }
              })
            }
            const ret = await decoder.open(addressof(stream.codecpar))
            if (ret) {
              decoder.close()
              pictureGot[stream.index] = true
            }
            else {
              decoderMap[stream.index] = decoder
            }
          }
        }
        if (decoder) {
          const ret = decoder.decode(avpacket)
          if (ret) {
            pictureGot[stream.index] = true
          }
        }
      }
    }

    // fastOpen 的时候分析到最小 samples 数量
    if (streamPtsMap[stream.index] && streamPtsMap[stream.index].length === MIN_ANALYZE_SAMPLES) {
      calculate(stream, false)
    }

    if (stream.startTime !== NOPTS_VALUE_BIGINT
      && (avpacket.pts - stream.startTime) > avRescaleQ(
        static_cast<int64>((formatContext.options as DemuxOptions).maxAnalyzeDuration),
        AV_MILLI_TIME_BASE_Q,
        stream.timeBase
      )
      && (formatContext.streams.length >= needStreams
        || (avpacket.pts - stream.startTime) > avRescaleQ(
          15000n,
          AV_MILLI_TIME_BASE_Q,
          stream.timeBase
        )
      )
      && checkPictureGot()
    ) {
      finalizeAnalyze()
      if (packetCached) {
        avpacket = nullptr
      }
      break
    }
    if (packetCached) {
      avpacket = nullptr
    }
  }

  if (avpacket) {
    destroyAVPacket(avpacket)
  }
  if (caches.length) {
    formatContext.interval.packetBuffer = caches.concat(formatContext.interval.packetBuffer)
  }

  object.each(decoderMap, (decoder) => {
    if (decoder) {
      decoder.close()
    }
  })

  object.each(streamContextMap, (context, index) => {
    const stream = formatContext.getStreamByIndex(+index)
    if (stream.privateData2) {
      object.extend(stream.privateData2, context)
    }
    else {
      stream.privateData2 = context
    }
  })

  if (ret === IOError.END) {
    return 0
  }
  else if (ret !== 0) {
    return ret
  }

  if ((formatContext.iformat.type === AVFormat.MPEGTS)
    && (formatContext.ioReader.flags & IOFlags.SEEKABLE)
  ) {
    await estimateDurationFromPts(formatContext)
  }
  return 0
}

function addSample(stream: AVStream, avpacket: pointer<AVPacket>) {
  const index = array.binarySearch(stream.sampleIndexes, (sample) => {
    if (sample.pts < avpacket.pts) {
      return 1
    }
    else {
      return -1
    }
  })
  const sample = {
    dts: avpacket.dts,
    pts: avpacket.pts,
    pos: avpacket.pos,
    size: avpacket.size,
    duration: avpacket.duration,
    flags: avpacket.flags
  }
  if (index > -1) {
    stream.sampleIndexesPosMap.set(avpacket.pos, index)
    stream.sampleIndexes.splice(index, 0, sample)
  }
  else {
    stream.sampleIndexesPosMap.set(avpacket.pos, stream.sampleIndexes.length)
    stream.sampleIndexes.push(sample)
  }
}

async function packetNeedRead(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<int32> {
  const stream = formatContext.getStreamByIndex(avpacket.streamIndex)
  if (avpacket.dts === NOPTS_VALUE_BIGINT) {
    const demuxContext = stream.privateData2 as StreamDemuxPrivateData
    if (demuxContext) {
      if (demuxContext.delay) {
        array.sortInsert(demuxContext.dtsQueue, avpacket.pts, (a) => {
          if (a < avpacket.pts) {
            return 1
          }
          else {
            return -1
          }
        })
        if (demuxContext.dtsQueue.length > demuxContext.delay) {
          avpacket.dts = demuxContext.dtsQueue.shift()
        }
      }
      else {
        avpacket.dts = avpacket.pts
      }
    }
  }

  let ret = 0
  // h264 hevc aac 解析到 extradata，继续
  if (stream
    && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC
    )
  ) {
    if (!avpacket.size
      && hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
    ) {
      while (1) {
        const tmpPacket = createAVPacket()
        ret = await formatContext.iformat.readAVPacket(formatContext, tmpPacket)
        if (ret !== 0) {
          if (formatContext.interval.packetBuffer.length) {
            let cache = formatContext.interval.packetBuffer.shift()
            unrefAVPacket(avpacket)
            refAVPacket(avpacket, cache)
            destroyAVPacket(cache)
            return packetNeedRead(formatContext, avpacket)
          }
          return ret
        }
        if (tmpPacket.streamIndex === avpacket.streamIndex) {
          if (tmpPacket.size) {
            copyAVPacketData(avpacket, tmpPacket)
            avpacket.dts = tmpPacket.dts
            avpacket.pts = tmpPacket.pts
            destroyAVPacket(tmpPacket)
            return 0
          }
          else {
            unrefAVPacket(avpacket)
            refAVPacket(avpacket, tmpPacket)
            destroyAVPacket(tmpPacket)
            continue
          }
        }
        else {
          let i = formatContext.interval.packetBuffer.length - 1
          let needPush = true
          for (; i >= 0; i--) {
            if (formatContext.interval.packetBuffer[i].streamIndex === tmpPacket.streamIndex) {
              if (!formatContext.interval.packetBuffer[i].size
                && !tmpPacket.size
              ) {
                destroyAVPacket(formatContext.interval.packetBuffer[i])
                formatContext.interval.packetBuffer.splice(i, 1, tmpPacket)
                needPush = false
              }
              else if (!formatContext.interval.packetBuffer[i].size
                && tmpPacket.size
              ) {
                copyAVPacketData(formatContext.interval.packetBuffer[i], tmpPacket)
                destroyAVPacket(tmpPacket)
                needPush = false
              }
              break
            }
          }
          if (needPush) {
            formatContext.interval.packetBuffer.push(tmpPacket)
          }
        }
      }
    }
    else if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_END) {
      return readAVPacket(formatContext, avpacket)
    }
  }
  if (formatContext.ioReader.flags & IOFlags.SEEKABLE) {
    if (!stream.sampleIndexesPosMap.has(avpacket.pos)) {
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
          addSample(stream, avpacket)
        }
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        const index = array.binarySearch(stream.sampleIndexes, (sample) => {
          if (sample.pts < avpacket.pts) {
            return 1
          }
          else {
            return -1
          }
        })

        if (!stream.sampleIndexes.length
          || (index < 0
            && avRescaleQ2(
              avpacket.pts - stream.sampleIndexes[stream.sampleIndexes.length - 1].pts,
              addressof(avpacket.timeBase),
              AV_MILLI_TIME_BASE_Q
            ) >= SAMPLE_INDEX_STEP
          )
          || (index > 0
            && index < stream.sampleIndexes.length - 1
            && avRescaleQ2(
              avpacket.pts - stream.sampleIndexes[index - 1].pts,
              addressof(avpacket.timeBase),
              AV_MILLI_TIME_BASE_Q
            ) >= SAMPLE_INDEX_STEP
          )
          || (index === 0
            && avRescaleQ2(
              stream.sampleIndexes[0].pts - avpacket.pts,
              addressof(avpacket.timeBase),
              AV_MILLI_TIME_BASE_Q
            ) >= SAMPLE_INDEX_STEP
          )
        ) {
          addSample(stream, avpacket)
        }
      }
    }
  }
  return 0
}

/**
 * 读取一个包
 * 
 * @param formatContext AVIFormatContext 上下文
 * @param avpacket 
 * @returns 成功返回 0，否则返回错误码
 */
export async function readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<int32> {
  let ret = 0
  unrefAVPacket(avpacket)
  if (formatContext.interval.packetBuffer.length) {
    const cache = formatContext.interval.packetBuffer.shift()
    refAVPacket(avpacket, cache)
    destroyAVPacket(cache)
    return packetNeedRead(formatContext, avpacket)
  }

  ret = await formatContext.iformat.readAVPacket(formatContext, avpacket)

  if (ret !== 0) {
    unrefAVPacket(avpacket)
    return ret
  }
  return packetNeedRead(formatContext, avpacket)
}

/**
 * 
 * seek 到指定位置
 * 
 * @param formatContext AVIFormatContext 上下文
 * @param streamIndex 指定流 index
 * @param timestamp seek 的位置或时间戳（毫秒）
 * @param flags AVSeekFlags 标志
 * @returns 错误返回负数，否则返回 seek 之前的 pos，方便 seek 回来
 */
export async function seek(formatContext: AVIFormatContext, streamIndex: number, timestamp: int64, flags: int32): Promise<int64> {

  let stream = streamIndex > -1 ? formatContext.streams.find((stream) => stream.index === streamIndex) : null

  if (!stream) {
    stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
    if (!stream) {
      stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
    }
    if (!stream) {
      stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_SUBTITLE)
    }
  }

  if (!stream) {
    logger.error(`not found any stream to seek, streamIndex: ${stream.index}`)
    return static_cast<int64>(errorType.DATA_INVALID)
  }

  logger.debug(`seek in ${stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
    ? 'video'
    : 'audio'
  } stream, streamIndex: ${stream.index}, timestamp: ${timestamp}, flags: ${flags}`)

  timestamp = avRescaleQ(timestamp, AV_MILLI_TIME_BASE_Q, stream.timeBase)

  const ret = await formatContext.iformat.seek(formatContext, stream, timestamp, flags)

  if (ret >= 0n) {
    array.each(formatContext.interval.packetBuffer, (avpacket) => {
      if (formatContext.ioReader.flags & IOFlags.SLICE) {
        const newSideData = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        const stream = formatContext.streams[avpacket.streamIndex]
        if (!stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] && newSideData) {
          stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(newSideData.data, newSideData.size).slice()
        }
      }
      destroyAVPacket(avpacket)
    })
    formatContext.interval.packetBuffer.length = 0

    // 重新分析 dts
    const oldDelay: Record<int32, int32> = {}
    formatContext.streams.forEach((stream) => {
      const context = stream.privateData2 as StreamDemuxPrivateData
      if (context?.dtsQueue) {
        context.dtsQueue.length = 0
        if (context.delay) {
          oldDelay[stream.index] = context.delay
          context.delay = MIN_ANALYZE_SAMPLES
        }
      }
    })
    const cache: pointer<AVPacket>[] = []
    while (formatContext.streams.some((stream) => {
      const context = stream.privateData2 as StreamDemuxPrivateData
      return context && context.dtsQueue && context.dtsQueue.length < context.delay
    })) {
      const avpacket = createAVPacket()
      const ret = await readAVPacket(formatContext, avpacket)
      if (ret) {
        destroyAVPacket(avpacket)
        break
      }
      cache.push(avpacket)
    }
    formatContext.streams.forEach((stream) => {
      const context = stream.privateData2 as StreamDemuxPrivateData
      if (context?.delay) {
        context.delay = oldDelay[stream.index]
        context.dtsQueue = guessDtsFromPts(context.delay, context.dtsQueue)
        for (let i = 0; i < cache.length; i++) {
          if (stream.index === cache[i].streamIndex) {
            cache[i].dts = context.dtsQueue.shift()
            const sample = stream.sampleIndexes.find((sample) => {
              return sample.pts === cache[i].pts
            })
            if (sample) {
              sample.dts = cache[i].dts
            }
          }
        }
      }
    })
    formatContext.interval.packetBuffer = cache.concat(formatContext.interval.packetBuffer)
    return 0n
  }

  return ret
}
