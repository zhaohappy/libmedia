/*
 * libmedia mp4 trun box parser
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
import Stream from '../../../AVStream'
import { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'
import { TRUNFlags } from '../boxType'

// @ts-ignore
@deasync
export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  const version = await ioReader.readUint8()

  const flags = await ioReader.readUint24()

  const track = movContext.currentFragment.currentTrack

  if (track) {
    track.sampleCount = await ioReader.readUint32()
    if (flags & TRUNFlags.DATA_OFFSET) {
      track.dataOffset = await ioReader.readInt32()
    }
    if (flags & TRUNFlags.FIRST_FLAG) {
      track.firstSampleFlags = await ioReader.readUint32()
    }
    for (let i = 0; i < track.sampleCount; i++) {
      if (flags & TRUNFlags.DURATION) {
        track.sampleDurations.push(await ioReader.readUint32())
      }
      if (flags & TRUNFlags.SIZE) {
        track.sampleSizes.push(await ioReader.readUint32())
      }
      if (flags & TRUNFlags.FLAGS) {
        track.sampleFlags.push(await ioReader.readUint32())
      }
      if (flags & TRUNFlags.CTS_OFFSET) {
        if (version === 0) {
          track.sampleCompositionTimeOffset.push(await ioReader.readUint32())
        }
        else {
          track.sampleCompositionTimeOffset.push(await ioReader.readInt32())
        }
      }
    }
  }


  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read vpcc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
