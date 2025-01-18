/*
 * libmedia seek in bytes with timestamp
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

import { AVIFormatContext } from '../AVFormatContext'
import AVStream from 'avutil/AVStream'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import { getBytesByDuration } from './getBytesByDuration'
import { createAVPacket, destroyAVPacket } from 'avutil/util/avpacket'
import * as errorType from 'avutil/error'
import AVPacket from 'avutil/struct/avpacket'
import * as logger from 'common/util/logger'
import { IOFlags } from 'avutil/avformat'

export default async function seekInBytes(
  context: AVIFormatContext,
  stream: AVStream,
  timestamp: int64,
  firstPacketPos: int64,
  readAVPacket: (context: AVIFormatContext, avpacket: pointer<AVPacket>) => Promise<int32>,
  syncAVPacket: (context: AVIFormatContext) => Promise<void>
) {

  const now = context.ioReader.getPos()

  const fileSize = await context.ioReader.fileSize()
  let pos: int64 = NOPTS_VALUE_BIGINT
  let duration = timestamp
  if (stream.startTime !== NOPTS_VALUE_BIGINT) {
    duration -= stream.startTime
  }
  else {
    duration -= stream.firstDTS
  }

  const pointPts = avRescaleQ(timestamp, stream.timeBase, AV_MILLI_TIME_BASE_Q)

  // 头十秒直接回到开始位置
  if (pointPts < 10000n) {
    logger.debug(`seek pts is earlier then 10s, seek to first packet pos(${firstPacketPos}) directly`)
    await context.ioReader.seek(firstPacketPos)
    return now
  }

  let bytes = getBytesByDuration(context.streams, duration, stream.timeBase)
  // 最大到结尾往前 10 秒
  const max = fileSize - getBytesByDuration(context.streams, 10000n, AV_MILLI_TIME_BASE_Q)
  const length = getBytesByDuration(context.streams, 10000n, AV_MILLI_TIME_BASE_Q)
  if (bytes > max) {
    bytes = max
  }
  if (bytes < firstPacketPos) {
    await context.ioReader.seek(firstPacketPos)
    return now
  }
  const avpacket = createAVPacket()
  let seekMax = fileSize
  let seekMin = 0n

  while (true) {
    if (seekMax - seekMin < length) {
      pos = seekMin
      break
    }
    await context.ioReader.seek(bytes)
    await syncAVPacket(context)
    if (context.ioReader.flags & IOFlags.ABORT) {
      break
    }
    const now = context.ioReader.getPos()

    let ret = await readAVPacket(context, avpacket)

    if (ret >= 0) {
      const currentPts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
      const diff = currentPts - pointPts

      logger.debug(`try to seek to pos: ${bytes}, got packet pts: ${avpacket.pts}(${currentPts}ms), diff: ${diff}ms`)

      // seek 时间戳的前面 10 秒内
      if (diff <= 0n && -diff < 10000n) {
        pos = now
        break
      }
      // seek 后面
      else if (diff > 0n) {
        seekMax = bytes
        bytes = (seekMin + seekMax) >> 1n
      }
      // seek 前面 10 秒外
      else {
        seekMin = bytes
        bytes = (seekMin + seekMax) >> 1n
      }
    }
    else {
      // 失败了重新 seek 回原来的位置
      pos = NOPTS_VALUE_BIGINT
      break
    }
    if (context.ioReader.flags & IOFlags.ABORT) {
      break
    }
  }

  destroyAVPacket(avpacket)

  if (pos !== NOPTS_VALUE_BIGINT) {
    logger.debug(`finally seek to pos ${pos}`)

    await context.ioReader.seek(pos)
    await syncAVPacket(context)
    return now
  }
  else {
    await context.ioReader.seek(now)
    if (context.ioReader.flags & IOFlags.ABORT) {
      return static_cast<int64>(errorType.EOF)
    }
  }

  return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
}
