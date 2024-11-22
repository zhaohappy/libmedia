/*
 * libmedia mp4 mvhd box write
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
import { MOVContext } from '../type'
import IOWriter from 'common/io/IOWriterSync'
import { BoxType } from '../boxType'
import { UINT32_MAX } from 'avutil/constant'
import writeMatrix from './function/writeMatrix'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const duration = movContext.duration
  const creationTime = movContext.creationTime || 0
  const modificationTime = movContext.modificationTime || 0
  const timescale = movContext.timescale || 0
  let nextTrackId = movContext.nextTrackId || 1

  if (movContext.fragment) {
    nextTrackId = 2
  }

  let version = duration < static_cast<int64>(UINT32_MAX) ? 0 : 1
  version = creationTime < UINT32_MAX ? 0 : 1
  version = modificationTime < UINT32_MAX ? 0 : 1

  // size
  ioWriter.writeUint32(version === 1 ? 120 : 108)
  // tag
  ioWriter.writeString(BoxType.MVHD)

  // version
  ioWriter.writeUint8(version)
  // flags
  ioWriter.writeUint24(0)

  if (version === 1) {
    ioWriter.writeUint64(static_cast<int64>(creationTime))
    ioWriter.writeUint64(static_cast<int64>(modificationTime))
  }
  else {
    ioWriter.writeUint32(Number(creationTime))
    ioWriter.writeUint32(Number(modificationTime))
  }

  // timescale
  ioWriter.writeUint32(timescale)

  if (version === 1) {
    ioWriter.writeUint64(duration)
  }
  else {
    ioWriter.writeUint32(Number(duration))
  }

  // reserved (preferred rate) 1.0 = normal
  ioWriter.writeUint32(0x00010000)
  // reserved (preferred volume) 1.0 = normal
  ioWriter.writeUint16(0x0100)
  // reserved
  ioWriter.writeUint16(0)
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(0)

  writeMatrix(ioWriter, 1, 0, 0, 1, 0, 0)

  // reserved (preview time)
  ioWriter.writeUint32(0)
  // reserved (preview duration)
  ioWriter.writeUint32(0)
  // reserved (poster time)
  ioWriter.writeUint32(0)
  // reserved (selection time)
  ioWriter.writeUint32(0)
  // reserved (selection time)
  ioWriter.writeUint32(0)
  // reserved (current time)
  ioWriter.writeUint32(0)

  ioWriter.writeUint32(nextTrackId)
}
