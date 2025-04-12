/*
 * libmedia mp4 edts box write
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
import { BoxType } from '../boxType'
import { INT32_MAX, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { avRescaleQ } from 'avutil/util/rational'
import getSampleDuration from '../function/getSampleDuration'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {
  const streamContext = stream.privData as MOVStreamContext
  let duration = avRescaleQ(
    getSampleDuration(streamContext),
    stream.timeBase,
    {
      den: movContext.timescale,
      num: 1
    }
  )
  let startCT = streamContext.startCT
  const delay = avRescaleQ(
    streamContext.startDts + static_cast<int64>(startCT),
    stream.timeBase,
    {
      den: movContext.timescale,
      num: 1
    }
  )

  let version = duration < INT32_MAX ? 0 : 1
  version |= delay < INT32_MAX ? 0 : 1

  const entrySize = (version === 1) ? 20 : 12
  const entryCount = 1 + (delay > 0 ? 1 : 0)
  const size = 24 + entryCount * entrySize

  // size
  ioWriter.writeUint32(size)
  // tag
  ioWriter.writeString(BoxType.EDTS)

  ioWriter.writeUint32(size - 8)
  ioWriter.writeString(BoxType.ELST)

  ioWriter.writeUint8(version)
  ioWriter.writeUint24(0)

  ioWriter.writeUint32(entryCount)

  if (delay > 0) {
    if (version === 1) {
      ioWriter.writeUint64(delay)
      ioWriter.writeInt64(NOPTS_VALUE_BIGINT)
    }
    else {
      ioWriter.writeUint32(Number(delay))
      ioWriter.writeInt32(-1)
    }
    ioWriter.writeUint32(0x00010000)
  }
  else {
    startCT  = -Math.min(Number(streamContext.startDts), 0)
    duration += delay
  }

  if (movContext.fragment) {
    duration = 0n
  }

  if (version === 1) {
    ioWriter.writeUint64(duration)
    ioWriter.writeInt64(static_cast<int64>(startCT))
  }
  else {
    ioWriter.writeUint32(Number(duration))
    ioWriter.writeInt32(startCT)
  }
  ioWriter.writeUint32(0x00010000)
}
