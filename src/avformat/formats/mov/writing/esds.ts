/*
 * libmedia mp4 esds box write
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
import { BoxType, MP4Tag } from '../boxType'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { AVCodecID2Mp4a } from '../mov'
import { mapUint8Array } from 'cheap/std/memory'

function writeDescriptorLength(ioWriter: IOWriter, tag: MP4Tag, size: number) {
  ioWriter.writeUint8(tag)
  for (let i = 3; i > 0; i--) {
    ioWriter.writeUint8((size >> (7 * i)) | 0x80)
  }
  ioWriter.writeUint8(size & 0x7F)
}

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const streamContext = stream.privData as MOVStreamContext

  const decoderSpecificInfoLen = stream.codecpar.extradata ? 5 + stream.codecpar.extradataSize : 0

  const pos = ioWriter.getPos()
  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.ESDS)

  // version = 0
  ioWriter.writeUint32(0)

  // ES descriptor
  writeDescriptorLength(ioWriter, MP4Tag.MP4_ES_DESCR_TAG, 3 + 5 + 13 + decoderSpecificInfoLen + 5 + 1)
  ioWriter.writeUint16(streamContext.trackId)
  // ioWriter
  ioWriter.writeUint8(0x00)

  // DecoderConfig descriptor
  writeDescriptorLength(ioWriter, MP4Tag.MP4_DEC_CONFIG_DESCR_TAG, 13 + decoderSpecificInfoLen)

  // Object type indication
  if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP2 || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3)
    && stream.codecpar.sampleRate > 24000
  ) {
    // 11172-3
    ioWriter.writeUint8(0x6B)
  }
  else {
    ioWriter.writeUint8(AVCodecID2Mp4a[stream.codecpar.codecId])
  }

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DVD_SUBTITLE) {
    // flags (= NeroSubpicStream)
    ioWriter.writeUint8((0x38 << 2) | 1)
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    // flags (= Audiostream)
    ioWriter.writeUint8(0x15)
  }
  else {
    // flags (= Visualstream)
    ioWriter.writeUint8(0x11)
  }

  //  Buffersize DB
  ioWriter.writeUint24(0)
  // maxbitrate
  ioWriter.writeUint32(0)
  // avgbitrate
  ioWriter.writeUint32(0)

  if (stream.codecpar.extradata) {
    writeDescriptorLength(ioWriter, MP4Tag.MP4_DEC_SPECIFIC_DESCR_TAG, stream.codecpar.extradataSize)
    ioWriter.writeBuffer(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
  }

  // SL descriptor
  writeDescriptorLength(ioWriter, MP4Tag.MP4_SL_DESCR_TAG, 1)
  ioWriter.writeUint8(0x02)

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.ESDS,
    size: Number(ioWriter.getPos() - pos)
  })
}
