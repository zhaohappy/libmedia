/*
 * libmedia mp4 dops box parser
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

import IOReader from 'common/io/IOReader'
import Stream from 'avutil/AVStream'
import { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'
import { avFree, avMalloc } from 'avutil/util/mem'
import { mapSafeUint8Array } from 'cheap/std/memory'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import * as opus from 'avutil/codecs/opus'
import BufferReader from 'common/io/BufferReader'
import BufferWriter from 'common/io/BufferWriter'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_OPUS

  // OpusSpecificBox version
  await ioReader.skip(1)

  const data: pointer<uint8> = avMalloc(atom.size + 8)
  const extradata = mapSafeUint8Array(data, atom.size + 8)

  const reader = new BufferReader(extradata)
  const writer = new BufferWriter(extradata, false)

  writer.writeString('OpusHead')
  writer.writeUint8(1)
  await ioReader.readBuffer(atom.size - 1, mapSafeUint8Array(data + 9, atom.size - 1))

  reader.seek(10)
  writer.seek(10)

  // 大端变小端
  writer.writeUint16(reader.readUint16())
  writer.writeUint32(reader.readUint32())
  writer.writeUint16(reader.readUint16())

  if (movContext.foundMoov) {
    stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = extradata.slice()
    avFree(data)
  }
  else {
    stream.codecpar.extradata = data
    stream.codecpar.extradataSize = extradata.length
    opus.parseAVCodecParameters(stream, extradata)
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read dops error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
