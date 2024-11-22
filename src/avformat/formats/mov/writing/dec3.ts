/*
 * libmedia mp4 dec3 box write
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
import BitWriter from 'common/io/BitWriter'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const info = movContext.ac3Info

  const bitWriter = new BitWriter(2 + ((34 * (info.numIndSub + 1) + 7) >> 3))

  bitWriter.writeU(13, info.dataRate)
  bitWriter.writeU(3, info.numIndSub)
  for (let i = 0; i < info.numIndSub; i++) {
    bitWriter.writeU(2, info.substream[i].fscod)
    bitWriter.writeU(5, info.substream[i].bsid)
    bitWriter.writeU(1, 0)
    bitWriter.writeU(1, 0)
    bitWriter.writeU(3, info.substream[i].bsmod)
    bitWriter.writeU(3, info.substream[i].acmod)
    bitWriter.writeU(1, info.substream[i].lfeon)
    bitWriter.writeU(5, 0)
    bitWriter.writeU(4, info.substream[i].numDepSub)

    if (!info.substream[i].numDepSub) {
      bitWriter.writeU(1, 0)
    }
    else {
      bitWriter.writeU(9, info.substream[i].chanLoc)
    }
  }

  bitWriter.padding()
  const size = bitWriter.getPointer()
  // size
  ioWriter.writeUint32(8 + size)
  // tag
  ioWriter.writeString(BoxType.DEC3)

  ioWriter.writeBuffer(bitWriter.getBuffer().subarray(0, size))
}
