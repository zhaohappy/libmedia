/*
 * libmedia mp4 wave box write
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
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import { mapUint8Array } from 'cheap/std/memory'
import esds from './esds'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {
  const pos = ioWriter.getPos()

  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.WAVE)

  if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_QDM2) {
    ioWriter.writeUint32(12)
    ioWriter.writeString(BoxType.FRMA)
    ioWriter.writeUint32(stream.codecpar.codecTag)
  }

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
    // seless atom needed by mplayer, ipod, not needed by quicktime
    ioWriter.writeUint32(12)
    ioWriter.writeString(BoxType.MP4A)
    ioWriter.writeUint32(0)
    esds(ioWriter, stream, movContext)
  }
  else {
    if (movContext.fragment) {
      if (stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
        ioWriter.writeBuffer(stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA])
        delete stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
      }
      else {
        if (stream.codecpar.extradata) {
          ioWriter.writeBuffer(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
        }
      }
    }
    else {
      if (stream.codecpar.extradata) {
        ioWriter.writeBuffer(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
      }
    }
  }

  // null tag
  ioWriter.writeUint32(8)
  ioWriter.writeUint32(0)

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.WAVE,
    size: Number(ioWriter.getPos() - pos)
  })
}
