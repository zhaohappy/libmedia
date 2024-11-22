/*
 * libmedia mp4 ctts box write
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
import * as logger from 'common/util/logger'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {
  const context = stream.privData as MOVStreamContext

  const sampleCounts = context.cttsSampleCounts || []
  const sampleOffsets = context.cttsSampleOffsets || []

  if (sampleCounts.length !== sampleOffsets.length) {
    logger.warn('ctts sampleCounts\'s length is not match sampleOffsets\'s length')
  }

  const entryCount = Math.min(sampleCounts.length, sampleOffsets.length)

  // size
  ioWriter.writeUint32(16 + entryCount * 8)
  // tag
  ioWriter.writeString(BoxType.CTTS)

  // version use int
  ioWriter.writeUint8(1)
  // flags
  ioWriter.writeUint24(0)

  ioWriter.writeUint32(entryCount)

  for (let i = 0; i < entryCount; i++) {
    ioWriter.writeUint32(sampleCounts[i])
    ioWriter.writeInt32(sampleOffsets[i])
  }
}
