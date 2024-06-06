/*
 * libmedia avframe to AudioData utils
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

import { mapFloat32Array, mapInt16Array, mapInt32Array, mapUint8Array } from 'cheap/std/memory'
import AVFrame from '../struct/avframe'
import { AVSampleFormat } from 'avutil/audiosamplefmt'

function mapFormat(avframe: pointer<AVFrame>) {
  switch (avframe.format) {
    case AVSampleFormat.AV_SAMPLE_FMT_U8:
      return 'u8'
    case AVSampleFormat.AV_SAMPLE_FMT_S16:
      return 's16'
    case AVSampleFormat.AV_SAMPLE_FMT_S32:
      return 's32'
    case AVSampleFormat.AV_SAMPLE_FMT_FLT:
      return 'f32'
    case AVSampleFormat.AV_SAMPLE_FMT_U8P:
      return 'u8-planar'
    case AVSampleFormat.AV_SAMPLE_FMT_S16P:
      return 's16-planar'
    case AVSampleFormat.AV_SAMPLE_FMT_S32P:
      return 's32-planar'
    case AVSampleFormat.AV_SAMPLE_FMT_FLTP:
      return 'f32-planar'
    default:
      throw new Error('not support')
  }
}

function mapBuffer(avframe: pointer<AVFrame>) {
  switch (avframe.format) {
    case AVSampleFormat.AV_SAMPLE_FMT_U8:
    case AVSampleFormat.AV_SAMPLE_FMT_U8P:
      return mapUint8Array(accessof(avframe.extendedData), avframe.chLayout.nbChannels * avframe.nbSamples)
    case AVSampleFormat.AV_SAMPLE_FMT_S16:
    case AVSampleFormat.AV_SAMPLE_FMT_S16P:
      return mapInt16Array(reinterpret_cast<pointer<int16>>(accessof(avframe.extendedData)), avframe.chLayout.nbChannels * avframe.nbSamples)
    case AVSampleFormat.AV_SAMPLE_FMT_S32:
    case AVSampleFormat.AV_SAMPLE_FMT_S32P:
      return mapInt32Array(reinterpret_cast<pointer<int32>>(accessof(avframe.extendedData)), avframe.chLayout.nbChannels * avframe.nbSamples)
    case AVSampleFormat.AV_SAMPLE_FMT_FLT:
    case AVSampleFormat.AV_SAMPLE_FMT_FLTP:
      return mapFloat32Array(reinterpret_cast<pointer<float>>(accessof(avframe.extendedData)), avframe.chLayout.nbChannels * avframe.nbSamples)
    default:
      throw new Error('not support')
  }
}

export function avframe2AudioData(avframe: pointer<AVFrame>) {
  const audioData = new AudioData({
    data: mapBuffer(avframe),
    format: mapFormat(avframe),
    sampleRate: avframe.sampleRate,
    numberOfFrames: avframe.nbSamples,
    numberOfChannels: avframe.chLayout.nbChannels,
    timestamp: static_cast<double>(avframe.pts),
  })
  return audioData
}