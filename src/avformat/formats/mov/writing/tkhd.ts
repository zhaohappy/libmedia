/*
 * libmedia mp4 tkhd box write
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
import { BoxType, TKHDFlags } from '../boxType'
import { UINT16_MAX, UINT32_MAX } from 'avutil/constant'
import writeMatrix from './function/writeMatrix'
import { AVMediaType } from 'avutil/codec'
import { avRescaleQ } from 'avutil/util/rational'
import getSampleDuration from '../function/getSampleDuration'
import { AVStreamMetadataKey } from 'avutil/AVStream'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const streamContext = stream.privData as MOVStreamContext

  const duration = avRescaleQ(
    getSampleDuration(streamContext),
    stream.timeBase,
    {
      den: movContext.timescale,
      num: 1
    }
  )
  const creationTime = stream.metadata[AVStreamMetadataKey.CREATION_TIME] || 0
  const modificationTime = stream.metadata[AVStreamMetadataKey.MODIFICATION_TIME] || 0
  const layer = streamContext.layer || 0
  const alternateGroup = streamContext.alternateGroup || 0
  let width = stream.codecpar.width > 0 ? stream.codecpar.width : 0
  let height = stream.codecpar.height > 0 ? stream.codecpar.height : 0

  if (width < UINT16_MAX) {
    width = width << 16
  }
  if (height < UINT16_MAX) {
    height = height << 16
  }

  let version = duration < static_cast<int64>(UINT32_MAX) ? 0 : 1
  version = creationTime < UINT32_MAX ? 0 : 1
  version = modificationTime < UINT32_MAX ? 0 : 1

  let flags = TKHDFlags.IN_MOVIE

  if (streamContext.flags & TKHDFlags.ENABLED) {
    flags |= TKHDFlags.ENABLED
  }

  // size
  ioWriter.writeUint32(version === 1 ? 100 : 92)
  // tag
  ioWriter.writeString(BoxType.TKHD)

  // version
  ioWriter.writeUint8(version)
  // flags
  ioWriter.writeUint24(flags)

  if (version === 1) {
    ioWriter.writeUint64(static_cast<int64>(creationTime))
    ioWriter.writeUint64(static_cast<int64>(modificationTime))
  }
  else {
    ioWriter.writeUint32(Number(creationTime))
    ioWriter.writeUint32(Number(modificationTime))
  }

  // trackId
  ioWriter.writeUint32(streamContext.trackId)
  // reserved
  ioWriter.writeUint32(0)

  if (version === 1) {
    ioWriter.writeUint64(duration)
  }
  else {
    ioWriter.writeUint32(Number(duration))
  }

  // reserved
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(0)

  ioWriter.writeInt16(layer)
  ioWriter.writeInt16(streamContext.perStreamGrouping ? alternateGroup : stream.codecpar.codecType)

  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    ioWriter.writeInt16(0x0100)
  }
  else {
    ioWriter.writeInt16(0)
  }

  // reserved
  ioWriter.writeInt16(0)
  const matrix = stream.metadata[AVStreamMetadataKey.MATRIX]
  if (matrix) {
    writeMatrix(ioWriter, matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7])
  }
  else {
    writeMatrix(ioWriter, 1, 0, 0, 1, 0, 0)
  }

  ioWriter.writeUint32(width)
  ioWriter.writeUint32(height)
}
