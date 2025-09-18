/*
 * libmedia mp4 chpl box write
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
import { AVStreamMetadataKey } from 'avutil/AVStream'
import * as is from 'common/util/is'
import { avRescaleQ } from 'avutil/util/rational'
import * as text from 'common/util/text'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const pos = ioWriter.getPos()

  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.CHPL)

  // flags + version
  ioWriter.writeUint32(0x01000000)

  // unknown
  ioWriter.writeUint32(0)

  const chapters = movContext.chapters

  ioWriter.writeUint8(chapters.length)

  chapters.forEach((chapter) => {
    ioWriter.writeUint64(avRescaleQ(chapter.start, chapter.timeBase, { num: 1, den: 10000000 }))
    let title = chapter.metadata[AVStreamMetadataKey.TITLE]
    if (title && is.string(title)) {
      let buffer = text.encode(title)
      if (buffer.length > 255) {
        buffer = buffer.slice(0, 255)
      }
      ioWriter.writeUint8(buffer.length)
      ioWriter.writeBuffer(buffer)
    }
    else {
      ioWriter.writeUint8(0)
    }
  })

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.CHPL,
    size: Number(ioWriter.getPos() - pos)
  })
}
