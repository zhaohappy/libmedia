import { AVFormatContextInterface } from './AVFormatContext'
import { AVDisposition, AVStreamInterface } from './AVStream'
import * as object from 'common/util/object'
import * as stringEnum from 'avutil/stringEnum'
import * as is from 'common/util/is'
import { avQ2D, avReduce, avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE } from 'avutil/constant'
import * as string from 'common/util/string'
import toString from 'common/function/toString'
import { AVCodecID, AVMediaType } from 'avutil/codec'

import * as aac from './codecs/aac'
import * as opus from './codecs/opus'
import * as h264 from './codecs/h264'
import * as hevc from './codecs/hevc'
import * as vvc from './codecs/vvc'
import * as av1 from './codecs/av1'
import * as vp9 from './codecs/vp9'
import * as mp3 from './codecs/mp3'

export interface DumpIOInfo {
  from: string
  tag: 'Input' | 'Output'
}

export function dumpTime(time: int64) {
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

export function dumpCodecName(stream: AVStreamInterface) {
  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    return dumpKey(stringEnum.AudioCodecString2CodecId, stream.codecpar.codecId)
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
    return dumpKey(stringEnum.VideoCodecString2CodecId, stream.codecpar.codecId)
  }
  return 'unknown'
}

function dumpProfileName(codecId: AVCodecID, profile: int32) {
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

function dumpAVStreamInterface(stream: AVStreamInterface, index: number, prefix: string) {
  const mediaType = dumpKey(stringEnum.mediaType2AVMediaType, stream.codecpar.codecType)

  const list = []

  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    const profileName = dumpProfileName(stream.codecpar.codecId, stream.codecpar.profile)
    const codecName = dumpKey(stringEnum.AudioCodecString2CodecId, stream.codecpar.codecId)
    list.push(`${codecName}${profileName ? ` (${profileName})` : ''}`)

    list.push(`${stream.codecpar.sampleRate} Hz`)
    let channel = `${stream.codecpar.chLayout.nbChannels} channels`
    if (stream.codecpar.chLayout.nbChannels === 1) {
      channel = 'mono'
    }
    else if (stream.codecpar.chLayout.nbChannels === 2) {
      channel = 'stereo'
    }
    list.push(channel)
    list.push(dumpKey(stringEnum.SampleFmtString2SampleFormat, stream.codecpar.format))
    if (stream.codecpar.bitRate > 0n) {
      list.push(`${dumpBitrate(stream.codecpar.bitRate)}`)
    }
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
    const profileName = dumpProfileName(stream.codecpar.codecId, stream.codecpar.profile)
    const codecName = dumpKey(stringEnum.VideoCodecString2CodecId, stream.codecpar.codecId)
    list.push(`${codecName}${profileName ? ` (${profileName})` : ''}`)

    if (stream.codecpar.format !== NOPTS_VALUE) {
      const pixfmt = dumpKey(stringEnum.PixfmtString2AVPixelFormat, stream.codecpar.format)
      const range = dumpKey(stringEnum.colorRange2AVColorRange, stream.codecpar.colorRange, 'tv')
      const space = dumpKey(stringEnum.colorSpace2AVColorSpace, stream.codecpar.colorSpace, 'bt709')
      list.push(`${pixfmt}(${range}, ${space})`)
    }
    
    const dar = {
      num: stream.codecpar.width * stream.codecpar.sampleAspectRatio.num,
      den: stream.codecpar.height * stream.codecpar.sampleAspectRatio.den
    }
    avReduce(dar)

    list.push(`${stream.codecpar.width}x${stream.codecpar.height} [SAR: ${stream.codecpar.sampleAspectRatio.num}:${stream.codecpar.sampleAspectRatio.den} DAR ${dar.num}:${dar.den}]`)

    if (stream.codecpar.bitRate > 0n) {
      list.push(`${dumpBitrate(stream.codecpar.bitRate)}`)
    }
    if (avQ2D(stream.codecpar.framerate) > 0) {
      list.push(`${avQ2D(stream.codecpar.framerate).toFixed(2)} fps`)
      list.push(`${avQ2D(stream.codecpar.framerate).toFixed(2)} tbr`)
    }
    list.push(`${dumpInt64(static_cast<int64>(avQ2D({
      num: stream.timeBase.den,
      den: stream.timeBase.num
    })))} tbn`)

    if (stream.disposition) {
      let disposition = ''
      if (stream.disposition & AVDisposition.DEFAULT) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DEFAULT)}) `
      }
      if (stream.disposition & AVDisposition.DUB) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DUB)}) `
      }
      if (stream.disposition & AVDisposition.ORIGINAL) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.ORIGINAL)}) `
      }
      if (stream.disposition & AVDisposition.COMMENT) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.COMMENT)}) `
      }
      if (stream.disposition & AVDisposition.LYRICS) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.LYRICS)}) `
      }
      if (stream.disposition & AVDisposition.KARAOKE) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.KARAOKE)}) `
      }
      if (stream.disposition & AVDisposition.FORCED) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.FORCED)}) `
      }
      if (stream.disposition & AVDisposition.HEARING_IMPAIRED) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.HEARING_IMPAIRED)}) `
      }
      if (stream.disposition & AVDisposition.VISUAL_IMPAIRED) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.VISUAL_IMPAIRED)}) `
      }
      if (stream.disposition & AVDisposition.CLEAN_EFFECTS) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.CLEAN_EFFECTS)}) `
      }
      if (stream.disposition & AVDisposition.ATTACHED_PIC) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.ATTACHED_PIC)}) `
      }
      if (stream.disposition & AVDisposition.TIMED_THUMBNAILS) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.TIMED_THUMBNAILS)}) `
      }
      if (stream.disposition & AVDisposition.CAPTIONS) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.CAPTIONS)}) `
      }
      if (stream.disposition & AVDisposition.DESCRIPTIONS) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DESCRIPTIONS)}) `
      }
      if (stream.disposition & AVDisposition.METADATA) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.METADATA)}) `
      }
      if (stream.disposition & AVDisposition.DEPENDENT) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.DEPENDENT)}) `
      }
      if (stream.disposition & AVDisposition.STILL_IMAGE) {
        disposition += `(${dumpKey(stringEnum.disposition2AVDisposition, AVDisposition.STILL_IMAGE)}) `
      }
      if (disposition) {
        list.push(disposition)
      }
    }
  }
  else {
    if (stream.codecpar.bitRate > 0n) {
      list.push(`${dumpBitrate(stream.codecpar.bitRate)}`)
    }
  }

  let dump = `${prefix}Stream #${index}:${stream.index} ${mediaType}: ${list.join(', ')}\n`

  if (Object.keys(stream.metadata).length) {
    dump += `${prefix}  Metadata:\n`
    object.each(stream.metadata, (value, key) => {
      if (!is.object(value) || !is.array(value)) {
        dump += `${prefix}    ${key}: ${value}\n`
      }
    })
  }

  return dump
}

function dumpAVFormatContextInterface(formatContext: AVFormatContextInterface, index: number, input: DumpIOInfo) {
  let dump = `${input.tag} #${index}, ${dumpKey(stringEnum.Format2AVFormat, formatContext.format)}, from '${input.from}:'\n`
  if (Object.keys(formatContext.metadata).length) {
    dump += `  Metadata:\n`
    object.each(formatContext.metadata, (value, key) => {
      if (!is.object(value) || !is.array(value)) {
        dump += `    ${key}: ${value}\n`
      }
    })
  }

  let duration = 0n
  let bitrate = 0n
  let start = -1n

  formatContext.streams.forEach((stream) => {
    const d = avRescaleQ(stream.duration, accessof(stream.timeBase), AV_MILLI_TIME_BASE_Q)
    const s = avRescaleQ(stream.startTime, accessof(stream.timeBase), AV_MILLI_TIME_BASE_Q)

    if (d > duration) {
      duration = d
    }
    if (s < start || start === -1n) {
      start = s
    }
    bitrate += stream.codecpar.bitRate
  })

  dump += `  Duration: ${dumpTime(duration)}, start: ${dumpTime(start)}, bitrate: ${dumpBitrate(bitrate)}\n`
  formatContext.streams.forEach((stream, i) => {
    dump += dumpAVStreamInterface(stream, index, '  ')
  })
  return dump
}

export default function dump(formatContexts: AVFormatContextInterface[], inputs: DumpIOInfo[]) {
  let dump = ''
  formatContexts.forEach((formatContext, index) => {
    dump += dumpAVFormatContextInterface(formatContext, index, inputs[index])
  })
  return dump
}