/*
 * libmedia dump
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

import type { AVChapter, AVFormatContextInterface, AVIFormatContext, AVOFormatContext } from './AVFormatContext'
import { AVFormatContext } from './AVFormatContext'
import type { AVStreamGroup, AVStreamGroupInterface, AVStreamInterface } from 'avutil/AVStream'
import type AVStream from 'avutil/AVStream'
import { AVDisposition, AVStreamGroupParamsType } from 'avutil/AVStream'
import * as object from 'common/util/object'
import * as stringEnum from 'avutil/stringEnum'
import * as is from 'common/util/is'
import { avQ2D, avReduce, avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as string from 'common/util/string'
import toString from 'common/function/toString'
import { AVCodecID, AVMediaType } from 'avutil/codec'

import * as aac from 'avutil/codecs/aac'
import * as opus from 'avutil/codecs/opus'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import * as mp3 from 'avutil/codecs/mp3'
import type { AVFormat } from 'avutil/avformat'
import isHdr from 'avutil/function/isHdr'
import { layoutName2AVChannelLayout } from 'avutil/stringEnum'
import { AVChannelOrder } from 'avutil/audiosamplefmt'

export interface DumpIOInfo {
  from: string
  tag: 'Input' | 'Output'
  isLive?: boolean
}

export function dumpTime(time: int64) {
  if (time < 0) {
    time = 0n
  }
  const ms = static_cast<int32>(time % 1000n)
  const secs = static_cast<int32>(time / 1000n % 60n)
  const mins = static_cast<int32>(time / 1000n / 60n % 60n)
  const hours = static_cast<int32>(time / 1000n / 3600n)
  return string.format('%02d:%02d:%02d.%03d', hours, mins, secs, ms)
}

export function dumpInt64(v: int64) {
  if (v < 10000n) {
    return toString(static_cast<int32>(v))
  }
  return static_cast<int32>(v / 1000n) + 'k'
}

export function dumpBitrate(v: int64) {
  if (v < 10000n) {
    return toString(static_cast<int32>(v)) + ' bps/s'
  }
  return static_cast<int32>(v / 1000n) + ' kbps/s'
}

export function dumpKey<T>(obj: Record<string, T>, value: T, defaultValue: string = 'unknown') {
  let name = defaultValue
  object.each(obj, (v, k) => {
    if (value === v) {
      name = k
      return false
    }
  })
  return name
}

export function dumpCodecName(codecType: AVMediaType, codecId: AVCodecID) {
  if (codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    return dumpKey(stringEnum.AudioCodecString2CodecId, codecId)
  }
  else if (codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
    return dumpKey(stringEnum.VideoCodecString2CodecId, codecId)
  }
  else if (codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
    return dumpKey(stringEnum.SubtitleCodecString2CodecId, codecId)
  }
  return 'unknown'
}

export function dumpFormatName(format: AVFormat) {
  return dumpKey(stringEnum.Format2AVFormat, format)
}

export function dumpProfileName(codecId: AVCodecID, profile: int32) {
  switch (codecId) {
    case AVCodecID.AV_CODEC_ID_AAC:
      return aac.AACProfile2Name[profile] || 'LC'
    case AVCodecID.AV_CODEC_ID_MP3:
      return mp3.MP3Profile2Name[profile] || 'Layer3'
    case AVCodecID.AV_CODEC_ID_H264:
      return h264.H264Profile2Name[profile] || 'High'
    case AVCodecID.AV_CODEC_ID_HEVC:
      return hevc.HEVCProfile2Name[profile] || 'Main'
    case AVCodecID.AV_CODEC_ID_AV1:
      return av1.AV1Profile2Name[profile] || 'Main'
    case AVCodecID.AV_CODEC_ID_VP9:
      return vp9.VP9Profile2Name[profile] || 'Profile0'
  }
}

export function dumpDisposition(flags: int32) {
  let disposition = ''
  if (flags) {
    disposition = ' '
    if (flags & AVDisposition.DEFAULT) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DEFAULT)}) `
    }
    if (flags & AVDisposition.DUB) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DUB)}) `
    }
    if (flags & AVDisposition.ORIGINAL) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.ORIGINAL)}) `
    }
    if (flags & AVDisposition.COMMENT) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.COMMENT)}) `
    }
    if (flags & AVDisposition.LYRICS) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.LYRICS)}) `
    }
    if (flags & AVDisposition.KARAOKE) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.KARAOKE)}) `
    }
    if (flags & AVDisposition.FORCED) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.FORCED)}) `
    }
    if (flags & AVDisposition.HEARING_IMPAIRED) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.HEARING_IMPAIRED)}) `
    }
    if (flags & AVDisposition.VISUAL_IMPAIRED) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.VISUAL_IMPAIRED)}) `
    }
    if (flags & AVDisposition.CLEAN_EFFECTS) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.CLEAN_EFFECTS)}) `
    }
    if (flags & AVDisposition.ATTACHED_PIC) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.ATTACHED_PIC)}) `
    }
    if (flags & AVDisposition.TIMED_THUMBNAILS) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.TIMED_THUMBNAILS)}) `
    }
    if (flags & AVDisposition.CAPTIONS) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.CAPTIONS)}) `
    }
    if (flags & AVDisposition.DESCRIPTIONS) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DESCRIPTIONS)}) `
    }
    if (flags & AVDisposition.METADATA) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.METADATA)}) `
    }
    if (flags & AVDisposition.DEPENDENT) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DEPENDENT)}) `
    }
    if (flags & AVDisposition.STILL_IMAGE) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.STILL_IMAGE)}) `
    }
    if (flags & AVDisposition.THUMBNAIL) {
      disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.THUMBNAIL)}) `
    }
  }
  return disposition
}

function dumpVideoStream(stream: AVStreamInterface, list: string[]) {
  const profileName = dumpProfileName(stream.codecpar.codecId, stream.codecpar.profile)
  const codecName = dumpKey(stringEnum.VideoCodecString2CodecId, stream.codecpar.codecId)
  list.push(`${codecName}${profileName ? ` (${profileName})` : ''}`)

  if (stream.codecpar.format !== NOPTS_VALUE) {
    const pixfmt = dumpKey(stringEnum.PixfmtString2AVPixelFormat, stream.codecpar.format, `unknown(${stream.codecpar.format})`)
    const range = dumpKey(stringEnum.colorRange2AVColorRange, stream.codecpar.colorRange, 'tv')
    const space = dumpKey(stringEnum.colorSpace2AVColorSpace, stream.codecpar.colorSpace)
    const primary = dumpKey(stringEnum.colorPrimaries2AVColorPrimaries, stream.codecpar.colorPrimaries)
    const trc = dumpKey(stringEnum.colorTrc2AVColorTransferCharacteristic, stream.codecpar.colorTrc)
    const isHdr_ = isHdr(stream.codecpar)
    if (space === primary && primary === trc) {
      list.push(`${pixfmt}(${range}, ${space}, ${isHdr_ ? 'HDR' : 'SDR'})`)
    }
    else {
      list.push(`${pixfmt}(${range}, ${space}/${primary}/${trc}, ${isHdr_ ? 'HDR' : 'SDR'})`)
    }
    const dar = {
      num: stream.codecpar.width * stream.codecpar.sampleAspectRatio.num,
      den: stream.codecpar.height * stream.codecpar.sampleAspectRatio.den
    }
    avReduce(dar)

    list.push(`${stream.codecpar.width}x${stream.codecpar.height} [SAR: ${stream.codecpar.sampleAspectRatio.num}:${stream.codecpar.sampleAspectRatio.den} DAR ${dar.num}:${dar.den}]`)
  }
}

function dumpAudioStream(stream: AVStreamInterface, list: string[]) {
  const profileName = dumpProfileName(stream.codecpar.codecId, stream.codecpar.profile)
  const codecName = dumpKey(stringEnum.AudioCodecString2CodecId, stream.codecpar.codecId)
  list.push(`${codecName}${profileName ? ` (${profileName})` : ''}`)

  list.push(`${stream.codecpar.sampleRate} Hz`)
  let channel = `${stream.codecpar.chLayout.nbChannels} channels`

  if (stream.codecpar.chLayout.order === AVChannelOrder.AV_CHANNEL_ORDER_NATIVE) {
    const name = dumpKey(layoutName2AVChannelLayout, static_cast<double>(stream.codecpar.chLayout.u.mask), '')
    if (name) {
      channel = name
    }
  }
  list.push(channel)
  list.push(dumpKey(stringEnum.SampleFmtString2SampleFormat, stream.codecpar.format))
}

export function dumpAVStreamInterface(stream: AVStreamInterface, index: number, prefix: string) {
  const mediaType = dumpKey(stringEnum.mediaType2AVMediaType, stream.codecpar.codecType)

  const list = []

  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    dumpAudioStream(stream, list)
    if (stream.codecpar.bitrate > 0n && stream.nbFrames !== 1n) {
      list.push(`${dumpBitrate(stream.codecpar.bitrate)}`)
    }
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {

    dumpVideoStream(stream, list)

    if (stream.codecpar.bitrate > 0n && stream.nbFrames !== 1n) {
      list.push(`${dumpBitrate(stream.codecpar.bitrate)}`)
    }
    if (avQ2D(stream.codecpar.framerate) > 0) {
      list.push(`${avQ2D(stream.codecpar.framerate).toFixed(2)} fps`)
      list.push(`${avQ2D(stream.codecpar.framerate).toFixed(2)} tbr`)
    }
    list.push(`${dumpInt64(static_cast<int64>(avQ2D({
      num: stream.timeBase.den,
      den: stream.timeBase.num
    })))} tbn`)
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
    const codecName = dumpKey(stringEnum.SubtitleCodecString2CodecId, stream.codecpar.codecId)
    list.push(codecName)
    if (stream.codecpar.bitrate > 0n) {
      list.push(`${dumpBitrate(stream.codecpar.bitrate)}`)
    }
  }
  else {
    const codecName = dumpKey(stringEnum.DataCodecString2CodecId, stream.codecpar.codecId)
    list.push(codecName)
    if (stream.codecpar.bitrate > 0n) {
      list.push(`${dumpBitrate(stream.codecpar.bitrate)}`)
    }
  }

  let dump = `${prefix}Stream #${index}:${stream.index}[0x${string.format('%02x', stream.id)}] ${mediaType}: ${list.join(', ')}${dumpDisposition(stream.disposition)}\n`

  if (Object.keys(stream.metadata).length) {
    dump += `${prefix}  Metadata:\n`
    object.each(stream.metadata, (value, key) => {
      if (!is.object(value) && !is.array(value) && !is.arrayBuffer(value) && !ArrayBuffer.isView(value)) {
        if (is.string(value)) {
          value = value.replaceAll('\n', '\n' + ' '.repeat(6 + key.length))
        }
        dump += `${prefix}    ${key}: ${value}\n`
      }
      else if (key === 'matrix' && stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        dump += `${prefix}    ${key}: [${value.toString()}]\n`
      }
    })
  }

  return dump
}

export function dumpAVStreamGroupInterface(group: AVStreamGroupInterface, index: number, prefix: string, dumpedStream: Record<number, true>) {

  const groupType = dumpKey(stringEnum.streamGroup2ParamsType, group.type)

  const list = []

  if (group.type === AVStreamGroupParamsType.TILE_GRID) {
    const stream = group.streams[0]
    if (stream) {
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        dumpAudioStream(stream, list)
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        dumpVideoStream(stream, list)
        list.push(`${group.params.width}x${group.params.height}`)
      }
    }
  }

  let dump = `${prefix}Stream Group #${index}:${group.index} ${groupType}: ${list.join(', ')}${dumpDisposition(group.disposition)}\n`

  if (group.streams.length) {
    group.streams.forEach((stream) => {
      dump += dumpAVStreamInterface(stream, index, prefix + '  ')
      dumpedStream[stream.id] = true
    })
  }

  return dump
}

export function dumpChapter(chapter: AVChapter, index: number, cheapIndex: number, prefix: string) {
  let start = 'N/A'
  let end = 'N/A'

  if (chapter.start !== NOPTS_VALUE_BIGINT) {
    start = dumpTime(avRescaleQ(chapter.start, chapter.timeBase, AV_MILLI_TIME_BASE_Q))
  }
  if (chapter.end !== NOPTS_VALUE_BIGINT) {
    end = dumpTime(avRescaleQ(chapter.end, chapter.timeBase, AV_MILLI_TIME_BASE_Q))
  }

  let dump = `${prefix}Chapter #${index}:${cheapIndex} start: ${start}, end: ${end}\n`

  if (Object.keys(chapter.metadata).length) {
    dump += `${prefix}  Metadata:\n`
    object.each(chapter.metadata, (value, key) => {
      if (!is.object(value) && !is.array(value) && !is.arrayBuffer(value) && !ArrayBuffer.isView(value)) {
        if (is.string(value)) {
          value = value.replaceAll('\n', '\n' + ' '.repeat(6 + key.length))
        }
        dump += `${prefix}    ${key}: ${value}\n`
      }
    })
  }
  return dump
}

export function dumpAVFormatContextInterface(formatContext: AVFormatContextInterface, index: number, input: DumpIOInfo) {
  let dump = `${input.tag} #${index}, ${input.isLive ? 'live' : 'vod'}, ${dumpKey(stringEnum.Format2AVFormat, formatContext.format)}, from '${input.from}':\n`
  if (Object.keys(formatContext.metadata).length) {
    dump += '  Metadata:\n'
    object.each(formatContext.metadata, (value, key) => {
      if (!is.object(value) && !is.array(value) && !is.arrayBuffer(value) && !ArrayBuffer.isView(value)) {
        if (is.string(value)) {
          value = value.replaceAll('\n', '\n' + ' '.repeat(6 + key.length))
        }
        dump += `    ${key}: ${value}\n`
      }
    })
  }

  let duration = NOPTS_VALUE_BIGINT
  let bitrate = 0n
  let start = NOPTS_VALUE_BIGINT

  formatContext.streams.forEach((stream) => {
    const d = stream.duration !== NOPTS_VALUE_BIGINT
      ? avRescaleQ(stream.duration, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      : NOPTS_VALUE_BIGINT
    const s = stream.startTime !== NOPTS_VALUE_BIGINT
      ? avRescaleQ(stream.startTime, stream.timeBase, AV_MILLI_TIME_BASE_Q)
      : NOPTS_VALUE_BIGINT

    if (d > duration) {
      duration = d
    }
    if (s !== NOPTS_VALUE_BIGINT && s < start || start === NOPTS_VALUE_BIGINT) {
      start = s
    }
    bitrate += stream.codecpar.bitrate
  })

  dump += `  Duration: ${duration !== NOPTS_VALUE_BIGINT ? dumpTime(duration) : 'N/A'}, start: ${start !== NOPTS_VALUE_BIGINT ? dumpTime(start) : 'N/A'}, bitrate: ${bitrate ? dumpBitrate(bitrate) : 'N/A'}\n`

  if (formatContext.chapters?.length) {
    dump += '  Chapters:\n'
    formatContext.chapters.forEach((chapter, i) => {
      dump += dumpChapter(chapter, index, i, '    ')
    })
  }
  const dumpedStream: Record<number, true> = {}
  formatContext.streamGroups.forEach((group) => {
    dump += dumpAVStreamGroupInterface(group, index, '  ', dumpedStream)
  })
  formatContext.streams.forEach((stream) => {
    if (!dumpedStream[stream.id]) {
      dump += dumpAVStreamInterface(stream, index, '  ')
    }
  })
  return dump
}

export default function dump(formatContexts: (AVFormatContextInterface | AVIFormatContext | AVOFormatContext)[], inputs: DumpIOInfo[]) {
  let dump = ''
  formatContexts.forEach((formatContext, index) => {
    if (formatContext instanceof AVFormatContext) {
      const streams: AVStreamInterface[] = []
      const streamGroups: AVStreamGroupInterface[] = []
      for (let i = 0; i < formatContext.streams.length; i++) {
        const stream = formatContext.streams[i] as AVStream
        streams.push({
          index: stream.index,
          id: stream.id,
          codecpar: addressof(stream.codecpar),
          nbFrames: stream.nbFrames,
          metadata: stream.metadata,
          duration: stream.duration,
          startTime: stream.startTime,
          disposition: stream.disposition,
          timeBase: stream.timeBase,
          attachedPic: stream.attachedPic
        })
      }
      for (let i = 0; i < formatContext.streamGroups.length; i++) {
        const group = formatContext.streamGroups[i] as AVStreamGroup
        streamGroups.push({
          index: group.index,
          id: group.id,
          type: group.type,
          params: group.params,
          metadata: group.metadata,
          disposition: group.disposition,
          streams: group.streams.map((stream) => {
            return streams.find((s) => s.id === stream.id)
          })
        })
      }
      formatContext = {
        metadata: formatContext.metadata,
        format: formatContext.format,
        chapters: formatContext.chapters,
        streams,
        streamGroups
      }
    }
    dump += dumpAVFormatContextInterface(formatContext as AVFormatContextInterface, index, inputs[index])
  })
  return dump
}
