/*
 * libmedia audio sample util
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

import { memset } from 'cheap/std/memory'
import { AVSampleFormat } from '../audiosamplefmt'
import { INT32_MAX } from '../constant'
import alignFunc from 'common/math/align'
import { avFree, avMalloc } from '../util/mem'
import { AVSampleFormatDescriptors } from '../sampleFormatDescriptor'

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

  memset(audioData, 0, planar ? reinterpret_cast<int32>(sizeof(accessof(audioData))) * channels : sizeof(accessof(audioData)))

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

  const buf: pointer<uint8> = avMalloc(bufSize)

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
