/*
 * libmedia mp4 mdhd box parser
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
import { AVStreamMetadataKey } from 'avutil/AVStream'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {
  const now = ioReader.getPos()

  const version = await ioReader.readUint8()
  // flags
  await ioReader.skip(3)

  let creationTime: bigint = 0n
  let modificationTime: bigint = 0n
  let timescale = 0
  let duration: bigint = 0n

  if (version === 1) {
    creationTime = await ioReader.readUint64()
    modificationTime = await ioReader.readUint64()
    timescale = await ioReader.readUint32()
    duration = await ioReader.readUint64()
  }
  else {
    creationTime = static_cast<int64>(await ioReader.readUint32())
    modificationTime = static_cast<int64>(await ioReader.readUint32())
    timescale = await ioReader.readUint32()
    duration = static_cast<int64>(await ioReader.readUint32())
  }

  stream.duration = duration
  stream.timeBase.den = timescale
  stream.timeBase.num = 1
  stream.metadata[AVStreamMetadataKey.CREATION_TIME] = creationTime
  stream.metadata[AVStreamMetadataKey.MODIFICATION_TIME] = modificationTime


  const language = await ioReader.readUint16()
  const chars = []
  chars[0] = (language >> 10) & 0x1F
  chars[1] = (language >> 5) & 0x1F
  chars[2] = language & 0x1F

  const languageString = String.fromCharCode(chars[0] + 0x60, chars[1] + 0x60, chars[2] + 0x60)

  stream.metadata[AVStreamMetadataKey.LANGUAGE] = language
  stream.metadata[AVStreamMetadataKey.LANGUAGE_STRING] = languageString

  await ioReader.skip(2)

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read mdhd error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
