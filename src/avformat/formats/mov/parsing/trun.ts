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
import Stream from 'avutil/AVStream'
import { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'
import { TRUNFlags } from '../boxType'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  const version = await ioReader.readUint8()

  const flags = await ioReader.readUint24()

  const track = movContext.currentFragment.currentTrack
  const trex = movContext.trexs.find((trex) => {
    return trex.trackId === track.trackId
  })

  if (track) {
    const sampleCount = await ioReader.readUint32()
    if (flags & TRUNFlags.DATA_OFFSET) {
      if (track.sampleCount) {
        track.remainDataOffsets.push(await ioReader.readInt32())
        track.remainDataOffsetIndex.push(track.sampleCount)
      }
      else {
        track.dataOffset = await ioReader.readInt32()
      }
    }
    let firstSampleFlags = -1
    if (flags & TRUNFlags.FIRST_FLAG) {
      firstSampleFlags = await ioReader.readUint32()
    }
    for (let i = 0; i < sampleCount; i++) {
      if (flags & TRUNFlags.DURATION) {
        track.sampleDurations.push(await ioReader.readUint32())
      }
      else {
        track.sampleDurations.push(track.defaultSampleDuration || trex?.duration)
      }
      if (flags & TRUNFlags.SIZE) {
        track.sampleSizes.push(await ioReader.readUint32())
      }
      else {
        track.sampleSizes.push(track.defaultSampleSize || trex?.size)
      }
      if (flags & TRUNFlags.FLAGS) {
        track.sampleFlags.push(await ioReader.readUint32())
      }
      else {
        track.sampleFlags.push(track.defaultSampleFlags || trex?.flags)
      }
      if (flags & TRUNFlags.CTS_OFFSET) {
        if (version === 0) {
          track.sampleCompositionTimeOffset.push(await ioReader.readUint32())
        }
        else {
          track.sampleCompositionTimeOffset.push(await ioReader.readInt32())
        }
      }
      else {
        track.sampleCompositionTimeOffset.push(0)
      }
      if (firstSampleFlags > -1 && i === 0) {
        track.sampleFlags.pop()
        track.sampleFlags.push(firstSampleFlags)
      }
    }
    track.sampleCount += sampleCount
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read vpcc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
