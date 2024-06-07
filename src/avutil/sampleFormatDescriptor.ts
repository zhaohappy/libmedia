import { memset } from 'cheap/std/memory'
import { AVSampleFormat } from './audiosamplefmt'
import { INT32_MAX } from './constant'
import { alignFunc } from './util/common'
import { avFree, avMalloc } from './util/mem'

export interface AVSampleFormatDescriptor {
  bits: number
  planar: boolean
}

export const AVSampleFormatDescriptors: Partial<Record<AVSampleFormat, AVSampleFormatDescriptor>> = {
  [AVSampleFormat.AV_SAMPLE_FMT_U8]: {
    bits: 8,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S16]: {
    bits: 16,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S32]: {
    bits: 32,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S64]: {
    bits: 64,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_FLT]: {
    bits: 32,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_DBL]: {
    bits: 64,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_U8P]: {
    bits: 8,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S16P]: {
    bits: 16,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S32P]: {
    bits: 32,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S64P]: {
    bits: 64,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_FLTP]: {
    bits: 32,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_DBLP]: {
    bits: 64,
    planar: true
  },
}

export function getBytesPerSample(format: AVSampleFormat) {
  return (format < 0 || format >= AVSampleFormat.AV_SAMPLE_FMT_NB)
    ? 0
    : AVSampleFormatDescriptors[format].bits >> 3
}

export function sampleFormatIsPlanar(format: AVSampleFormat) {
  return (format < 0 || format >= AVSampleFormat.AV_SAMPLE_FMT_NB)
    ? false
    : AVSampleFormatDescriptors[format].planar
}

export function sampleFormatGetLinesize(format: AVSampleFormat, channels: int32, nbSamples: int32, align?: int32) {
  const sampleSize = getBytesPerSample(format)
  const planar = sampleFormatIsPlanar(format)

  if (!sampleSize || nbSamples <= 0 || channels <= 0) {
    return -1
  }

  if (!align) {
    align = 1
    nbSamples = alignFunc(nbSamples, 32)
  }

  if (channels > INT32_MAX / align || channels * nbSamples > (INT32_MAX - align * channels) / sampleSize) {
    return -1
  }

  return planar ? alignFunc(nbSamples * sampleSize, align) : alignFunc(nbSamples * sampleSize * channels, align)
}

export function sampleFillArrays(
  audioData: pointer<pointer<uint8>>,
  buf: pointer<uint8>,
  format: AVSampleFormat,
  linesize: int32,
  channels: int32
) {
  const planar = sampleFormatIsPlanar(format)

  memset(audioData, 0, planar ? sizeof(accessof(audioData)) * channels : sizeof(accessof(audioData)))

  if (!buf) {
    return -1
  }

  audioData[0] = buf

  if (planar) {
    for (let i = 1; i < channels; i++) {
      audioData[i] = reinterpret_cast<pointer<uint8>>(audioData[i - 1] + linesize)
    }
  }
  return 0
}

export function sampleAlloc(
  audioData: pointer<pointer<uint8>>,
  format: AVSampleFormat,
  linesize: int32,
  channels: int32
) {
  const planar = sampleFormatIsPlanar(format)
  const bufSize = planar ? linesize * channels : linesize

  if (bufSize < 0) {
    return bufSize
  }

  const buf = avMalloc(bufSize)

  const ret = sampleFillArrays(audioData, buf, format, linesize, channels)

  if (ret < 0) {
    avFree(buf)
    return ret
  }

  return 0
}

export function sampleSetSilence(
  audioData: pointer<pointer<uint8>>,
  offset: int32,
  format: AVSampleFormat,
  nbSamples: int32,
  channels: int32
) {
  const planar = sampleFormatIsPlanar(format)
  const planes = planar ? channels : 1
  const blockAlign = getBytesPerSample(format) * (planar ? 1 : channels)
  const dataSize = nbSamples * blockAlign
  const fillChar = (format === AVSampleFormat.AV_SAMPLE_FMT_U8 || format === AVSampleFormat.AV_SAMPLE_FMT_U8P)
    ? 0x80
    : 0x00

  offset *= blockAlign

  for (let i = 0; i < planes; i++) {
    memset(audioData[i] + offset, fillChar, dataSize)
  }
}