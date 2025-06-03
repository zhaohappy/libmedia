/*
 * libmedia mov fragment indexes
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

import Stream from 'avutil/AVStream'
import { FragmentTrack, MOVContext, MOVStreamContext, Sample } from '../type'
import { SampleFlags } from '../boxType'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { IOFlags } from 'avutil/avformat'


export function buildFragmentIndex(stream: Stream, track: FragmentTrack, movContext: MOVContext, ioFlag: int32 = 0) {
  const context = stream.privData as MOVStreamContext

  let currentOffset = track.baseDataOffset + static_cast<int64>(track.dataOffset)
  if (track.baseIsMoof) {
    currentOffset += movContext.currentFragment.pos
  }
  let currentDts = track.baseMediaDecodeTime

  const sampleSizes = track.sampleSizes
  const sampleDurations = track.sampleDurations
  const sampleFlags = track.sampleFlags
  const sampleCompositionTimeOffset = track.sampleCompositionTimeOffset
  const remainDataOffsets = track.remainDataOffsets
  const remainDataOffsetIndex = track.remainDataOffsetIndex
  let remainDataOffsetPointer = 0

  const samplesIndex: Sample[] = []

  for (let i = 0; i < track.sampleCount; i++) {

    if (remainDataOffsetIndex[remainDataOffsetPointer] === i) {
      currentOffset = track.baseDataOffset + static_cast<int64>(remainDataOffsets[remainDataOffsetPointer])
      if (track.baseIsMoof) {
        currentOffset += movContext.currentFragment.pos
      }
      remainDataOffsetPointer++
    }

    const sample: Sample = {
      dts: currentDts,
      pts: currentDts + static_cast<int64>(sampleCompositionTimeOffset[i]),
      pos: currentOffset,
      size: sampleSizes[i],
      duration: sampleDurations[i],
      flags: 0
    }

    currentDts += static_cast<int64>(sample.duration)
    currentOffset += static_cast<int64>(sample.size)

    let currentFlags = sampleFlags[i]

    if (!(currentFlags & (SampleFlags.IS_NON_SYN | SampleFlags.DEPENDS_YES))) {
      sample.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    if (i === 0 && sampleSizes.length > 1 && (ioFlag & IOFlags.SLICE)) {
      // 切片的第一个帧强制为关键帧
      sample.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    samplesIndex.push(sample)
  }

  context.samplesIndex = samplesIndex
}
