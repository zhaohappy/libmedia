/*
 * libmedia mp4 colr box write
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
import { AVColorRange } from 'avutil/pixfmt'
import { AVPacketSideDataType } from 'avutil/codec'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const icc = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_ICC_PROFILE]

  if (icc) {
    // size
    ioWriter.writeUint32(12 + icc.length)
    // tag
    ioWriter.writeString(BoxType.COLR)

    ioWriter.writeString('prof')

    ioWriter.writeBuffer(icc)
  }
  else {
    const fullRange = stream.codecpar.colorRange === AVColorRange.AVCOL_RANGE_JPEG
    // size
    ioWriter.writeUint32(19)
    // tag
    ioWriter.writeString(BoxType.COLR)

    ioWriter.writeString('nclx')

    ioWriter.writeUint16(stream.codecpar.colorPrimaries)
    ioWriter.writeUint16(stream.codecpar.colorTrc)
    ioWriter.writeUint16(stream.codecpar.colorSpace)
    ioWriter.writeUint8(fullRange ? (1 << 7) : 0)
  }
}
