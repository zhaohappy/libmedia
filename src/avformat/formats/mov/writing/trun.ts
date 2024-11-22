/*
 * libmedia mp4 trun box write
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
import { MOVContext, MOVStreamContext } from '../type'
import IOWriter from 'common/io/IOWriterSync'
import { BoxType, TRUNFlags } from '../boxType'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {
  const streamContext = stream.privData as MOVStreamContext
  const track = movContext.currentFragment.tracks.find((track) => {
    return track.trackId === streamContext.trackId
  })

  const firstSampleFlags = track.firstSampleFlags || 0
  const dataOffset = track.dataOffset || 0
  const sampleDurations = track.sampleDurations
  const sampleSizes = track.sampleSizes
  const sampleFlags = track.sampleFlags
  const sampleCompositionTimeOffset = track.sampleCompositionTimeOffset
  const sampleCount = track.sampleCount

  const hasSampleDurations = sampleDurations.length > 0
  const hasSampleSizes = sampleSizes.length > 0
  const hasSampleFlags = sampleFlags.length > 0
  const hasSampleCompositionTimeOffset = sampleCompositionTimeOffset.length > 0
  const hasFirstFlag = firstSampleFlags !== 0

  let flags = TRUNFlags.DATA_OFFSET
  if (hasFirstFlag) {
    flags |= TRUNFlags.FIRST_FLAG
  }
  if (hasSampleDurations) {
    flags |= TRUNFlags.DURATION
  }
  if (hasSampleSizes) {
    flags |= TRUNFlags.SIZE
  }
  if (hasSampleFlags) {
    flags |= TRUNFlags.FLAGS
  }
  if (hasSampleCompositionTimeOffset) {
    flags |= TRUNFlags.CTS_OFFSET
  }

  const pos = ioWriter.getPos()

  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.TRUN)

  // version use int32
  ioWriter.writeUint8(1)
  // flags
  ioWriter.writeUint24(flags)

  ioWriter.writeUint32(sampleCount)

  track.dataOffsetPos = ioWriter.getPos()
  ioWriter.writeInt32(dataOffset)

  if (hasFirstFlag) {
    ioWriter.writeUint32(firstSampleFlags)
  }

  for (let i = 0; i < sampleCount; i++) {
    if (hasSampleDurations) {
      ioWriter.writeUint32(sampleDurations[i] || 0)
    }
    if (hasSampleSizes) {
      ioWriter.writeUint32(sampleSizes[i] || 0)
    }
    if (hasSampleFlags) {
      ioWriter.writeUint32(sampleFlags[i] || 0)
    }
    if (hasSampleCompositionTimeOffset) {
      ioWriter.writeInt32(sampleCompositionTimeOffset[i] || 0)
    }
  }

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.TRUN,
    size: Number(ioWriter.getPos() - pos)
  })
}
