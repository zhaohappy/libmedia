/* libmedia AudioData to AVFrame utils
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

import { createAVFrame, getAudioBuffer } from '../util/avframe'
import { AVSampleFormat } from '../audiosamplefmt'
import AVFrame from '../struct/avframe'
import { sampleFormatIsPlanar } from '../util/sample'
import { mapUint8Array } from 'cheap/std/memory'
import { AV_TIME_BASE, NOPTS_VALUE_BIGINT } from '../constant'

function mapFormat(format: AudioSampleFormat) {
  switch (format) {
    case 'u8':
      return AVSampleFormat.AV_SAMPLE_FMT_U8
    case 's16':
      return AVSampleFormat.AV_SAMPLE_FMT_S16
    case 's32':
      return AVSampleFormat.AV_SAMPLE_FMT_S32
    case 'f32':
      return AVSampleFormat.AV_SAMPLE_FMT_FLT
    case 'u8-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_U8P
    case 's16-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_S16P
    case 's32-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_S32P
    case 'f32-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_FLTP
    default:
      throw new Error('not support')
  }
}

export function audioData2AVFrame(audioData: AudioData, avframe: pointer<AVFrame> = nullptr) {
  if (avframe === nullptr) {
    avframe = createAVFrame()
  }

  avframe.sampleRate = audioData.sampleRate
  avframe.nbSamples = audioData.numberOfFrames
  avframe.chLayout.nbChannels = audioData.numberOfChannels
  avframe.format = mapFormat(audioData.format)
  avframe.pts = audioData.timestamp < 0 ? NOPTS_VALUE_BIGINT : static_cast<int64>(audioData.timestamp)
  avframe.duration = static_cast<int64>(audioData.duration)
  avframe.timeBase.den = AV_TIME_BASE
  avframe.timeBase.num = 1

  getAudioBuffer(avframe)

  const planar = sampleFormatIsPlanar(avframe.format)
  const planes = planar ? avframe.chLayout.nbChannels : 1

  for (let i = 0; i < planes; i++) {
    audioData.copyTo(mapUint8Array(avframe.extendedData[i], reinterpret_cast<size>(avframe.linesize[0])), {
      planeIndex: i
    })
  }

  return avframe
}
