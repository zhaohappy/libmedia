/*
 * libmedia handle mpegts section slice
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

import { MpegtsContext } from '../type'
import { TSPacket, TSSliceQueue } from '../struct'
import clearTSSliceQueue from '../function/clearTSSliceQueue'
import parseSection from '../function/parseSection'

export default function handleSectionSlice(tsPacket: TSPacket, mpegtsContext: MpegtsContext) {
  const tsSliceQueue = mpegtsContext.tsSliceQueueMap.get(tsPacket.pid)

  if (tsPacket.payloadUnitStartIndicator) {
    const pointerField = tsPacket.payload[0]
    if (tsSliceQueue && tsSliceQueue.totalLength > 0) {
      const remain = tsPacket.payload.slice(1, Math.min(1 + pointerField, tsPacket.payload.length))
      tsSliceQueue.slices.push(remain)
      tsSliceQueue.totalLength += remain.length

      if (tsSliceQueue.totalLength === tsSliceQueue.expectedLength) {
        parseSection(tsPacket.pid, tsSliceQueue, mpegtsContext)
        clearTSSliceQueue(tsSliceQueue)
      }
      else {
        clearTSSliceQueue(tsSliceQueue)
        mpegtsContext.tsSliceQueueMap.delete(tsPacket.pid)
      }
    }

    for (let i = 1 + pointerField; i < tsPacket.payload.length;) {
      const tableId = tsPacket.payload[i]
      if (tableId === 0xff) {
        break
      }
      const sectionLength = ((tsPacket.payload[i + 1] & 0x0f) << 8) | tsPacket.payload[i + 2]

      const tsSliceQueue = new TSSliceQueue()
      tsSliceQueue.pid = tsPacket.pid
      tsSliceQueue.expectedLength = sectionLength + 3
      tsSliceQueue.randomAccessIndicator = tsPacket.adaptationFieldInfo?.randomAccessIndicator ?? 0

      const remain = tsPacket.payload.slice(
        i,
        Math.min(i + tsSliceQueue.expectedLength - tsSliceQueue.totalLength, tsPacket.payload.length)
      )

      tsSliceQueue.slices.push(remain)
      tsSliceQueue.totalLength += remain.length
      mpegtsContext.tsSliceQueueMap.set(tsPacket.pid, tsSliceQueue)

      if (tsSliceQueue.totalLength === tsSliceQueue.expectedLength) {
        parseSection(tsPacket.pid, tsSliceQueue, mpegtsContext)
        clearTSSliceQueue(tsSliceQueue)
      }
      else {
        clearTSSliceQueue(tsSliceQueue)
        mpegtsContext.tsSliceQueueMap.delete(tsPacket.pid)
      }

      i += remain.length
    }
  }
  else if (tsSliceQueue && tsSliceQueue.totalLength !== 0) {
    const remain = tsPacket.payload.slice(
      0,
      Math.min(tsSliceQueue.expectedLength - tsSliceQueue.totalLength, tsPacket.payload.length)
    )
    tsSliceQueue.slices.push(remain)
    tsSliceQueue.totalLength += remain.length

    if (tsSliceQueue.totalLength === tsSliceQueue.expectedLength) {
      parseSection(tsPacket.pid, tsSliceQueue, mpegtsContext)
      clearTSSliceQueue(tsSliceQueue)
    }
    else {
      clearTSSliceQueue(tsSliceQueue)
      mpegtsContext.tsSliceQueueMap.delete(tsPacket.pid)
    }
  }
}
