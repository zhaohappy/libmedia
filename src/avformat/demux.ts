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
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVPacketSideDataType, AVCodecID, AVMediaType } from 'avutil/codec'
import { AVFormat, AVSeekFlags } from './avformat'
import { checkStreamParameters } from './function/checkStreamParameters'
import { avRescaleQ } from 'avutil/util/rational'
import { copyAVPacketData, createAVPacket, destroyAVPacket,
  hasAVPacketSideData, refAVPacket, unrefAVPacket
} from 'avutil/util/avpacket'
import { IOFlags } from 'common/io/flags'
import { DURATION_MAX_READ_SIZE, SAMPLE_INDEX_STEP } from './config'
import * as errorType from 'avutil/error'
import AVStream from './AVStream'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import WasmVideoDecoder from 'avcodec/wasmcodec/VideoDecoder'
import WasmAudioDecoder from 'avcodec/wasmcodec/AudioDecoder'
import { destroyAVFrame } from 'avutil/util/avframe'

export interface DemuxOptions {
  // 只分析流的必要参数（设置 true 将不会分析视频帧率和音频每帧采用点数等参数）
  fastOpen?: boolean
  // 最大流分析时长（毫秒）
  maxAnalyzeDuration?: number
}

export const DefaultDemuxOptions = {
  fastOpen: false,
  maxAnalyzeDuration: 1000
}

// @ts-ignore
@deasync
export async function open(formatContext: AVIFormatContext, options: DemuxOptions = {}) {
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


// @ts-ignore
@deasync
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
    if (nextPos > 0n) {
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
              && Math.abs(Number(duration - stream.duration)) < 60 * stream.timeBase.den / stream.timeBase.num
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

// @ts-ignore
@deasync
export async function analyzeStreams(formatContext: AVIFormatContext) {
  const needStreams = formatContext.iformat.getAnalyzeStreamsCount()
  const streamFirstGotMap = {}
  const streamDtsMap: Record<number, bigint[]> = {}
  const streamBitMap: Record<number, number> = {}

  let avpacket: pointer<AVPacket> = nullptr
  const caches: pointer<AVPacket>[] = []
  let ret = 0

  const decoderMap: Record<number, WasmVideoDecoder | WasmAudioDecoder> = {}
  const pictureGot: Record<number, boolean> = {}

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

  while (true) {
    if (formatContext.streams.length >= needStreams
      && checkStreamParameters(formatContext)
      && (formatContext.options as DemuxOptions).fastOpen
      && checkPictureGot()
    ) {
      break
    }

    if (!avpacket) {
      avpacket = createAVPacket()
    }
    let packetCached = false
    ret = await readAVPacket(formatContext, avpacket)

    if (ret !== 0) {
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

      if (avpacket.pts < stream.startTime) {
        stream.startTime = avpacket.pts
      }

      if (streamDtsMap[stream.index]) {
        streamDtsMap[stream.index].push(avpacket.dts)
      }
      else {
        streamDtsMap[stream.index] = [avpacket.dts]
      }

      if (streamBitMap[stream.index]) {
        streamBitMap[stream.index] += avpacket.size
      }
      else {
        streamBitMap[stream.index] = avpacket.size
      }

      if (!pictureGot[stream.index] && formatContext.getDecoderResource && stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_VVC) {
        let decoder = decoderMap[stream.index]
        if (!decoder) {
          const resource = await formatContext.getDecoderResource(stream.codecpar.codecType, stream.codecpar.codecId)
          if (resource) {
            if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
              decoder = new WasmAudioDecoder({
                resource,
                onReceiveFrame: (avframe) => {
                  stream.codecpar.format = avframe.format
                  stream.codecpar.frameSize = avframe.nbSamples
                  destroyAVFrame(avframe)
                  pictureGot[stream.index] = true
                },
                onError: () => {
                  pictureGot[stream.index] = true
                }
              })
            }
            else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              if (resource.threadModule) {
                delete resource.threadModule
              }
              decoder = new WasmVideoDecoder({
                resource,
                onReceiveFrame: (avframe) => {
                  stream.codecpar.format = avframe.format
                  stream.codecpar.colorSpace = avframe.colorSpace
                  stream.codecpar.colorPrimaries = avframe.colorPrimaries
                  stream.codecpar.colorTrc = avframe.colorTrc
                  stream.codecpar.chromaLocation = avframe.chromaLocation
                  stream.codecpar.sampleAspectRatio = avframe.sampleAspectRatio
                  destroyAVFrame(avframe)
                  pictureGot[stream.index] = true
                },
                onError: () => {
                  pictureGot[stream.index] = true
                }
              })
            }
            await decoder.open(addressof(stream.codecpar))
            decoderMap[stream.index] = decoder
          }
        }
        if (decoder) {
          decoder.decode(avpacket)
        }
      }
    }

    if (streamDtsMap[stream.index] && streamDtsMap[stream.index].length === 12) {
      let count = 0n
      for (let i = 1; i < streamDtsMap[stream.index].length; i++) {
        count += streamDtsMap[stream.index][i] - streamDtsMap[stream.index][i - 1]
      }
      let value = Number(count) / (streamDtsMap[stream.index].length - 1)

      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        && stream.codecpar.sampleRate > 0
      ) {
        stream.codecpar.frameSize = Math.round(value / stream.timeBase.den * stream.timeBase.num * stream.codecpar.sampleRate)
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        const framerate = stream.timeBase.den * stream.timeBase.num / value
        stream.codecpar.framerate.num = Math.round(framerate)
        stream.codecpar.framerate.den = 1
      }
      const duration = Number(avpacket.dts - stream.firstDTS) * stream.timeBase.num / stream.timeBase.den

      if (duration) {
        stream.codecpar.bitRate = static_cast<int64>(streamBitMap[stream.index] * 8 / duration)
      }
    }

    if ((avpacket.dts - stream.startTime) > avRescaleQ(
      static_cast<int64>((formatContext.options as DemuxOptions).maxAnalyzeDuration),
      AV_MILLI_TIME_BASE_Q,
      stream.timeBase
    )
    ) {
      object.each(streamDtsMap, (list, id) => {
        const stream = formatContext.getStreamById(+id)
        if (list && list.length > 1) {
          let count = 0n
          for (let i = 1; i < list.length; i++) {
            count += list[i] - list[i - 1]
          }
          let value = Number(count) / (streamDtsMap[stream.index].length - 1)

          if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
            && stream.codecpar.sampleRate > 0
          ) {
            stream.codecpar.frameSize = Math.round(value / stream.timeBase.den * stream.timeBase.num * stream.codecpar.sampleRate)
          }
          else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            const framerate = stream.timeBase.den * stream.timeBase.num / value
            stream.codecpar.framerate.num = Math.round(framerate)
            stream.codecpar.framerate.den = 1
          }
          const duration = Number(avpacket.dts - stream.firstDTS) * stream.timeBase.num / stream.timeBase.den
          if (duration) {
            stream.codecpar.bitRate = static_cast<int64>(streamBitMap[stream.index] * 8 / duration)
          }
        }
      })
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

// @ts-ignore
@deasync
async function packetNeedRead(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>) {
  const stream = formatContext.getStreamById(avpacket.streamIndex)
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
          formatContext.interval.packetBuffer.push(tmpPacket)
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
            && avRescaleQ(
              avpacket.pts - stream.sampleIndexes[stream.sampleIndexes.length - 1].pts,
              avpacket.timeBase,
              AV_MILLI_TIME_BASE_Q
            ) >= SAMPLE_INDEX_STEP
          )
          || (index > 0
            && index < stream.sampleIndexes.length - 1
            && avRescaleQ(
              avpacket.pts - stream.sampleIndexes[index - 1].pts,
              avpacket.timeBase,
              AV_MILLI_TIME_BASE_Q
            ) >= SAMPLE_INDEX_STEP
          )
          || (index === 0
            && avRescaleQ(
              stream.sampleIndexes[0].pts - avpacket.pts,
              avpacket.timeBase,
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

// @ts-ignore
@deasync
export async function readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>) {
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

// @ts-ignore
@deasync
export async function seek(formatContext: AVIFormatContext, streamIndex: number, timestamp: int64, flags: int32): Promise<int64> {

  let stream = formatContext.streams[streamIndex]

  if (!stream) {
    stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
    if (!stream) {
      stream = formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
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
      destroyAVPacket(avpacket)
    })
    formatContext.interval.packetBuffer.length = 0
    return 0n
  }

  return ret
}
