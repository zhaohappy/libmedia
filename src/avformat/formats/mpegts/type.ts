/*
 * libmedia mpegts interface defined
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

import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { PAT, PES, PMT, TSPacket, TSSliceQueue } from './struct'
import AVBSFilter from '../../bsf/AVBSFilter'
import List from 'cheap/std/collection/List'
import { AVPacketRef } from 'avutil/struct/avpacket'

export type PID = number

export interface MpegtsContext {
  currentProgram: number
  currentPmtPid: number
  tsPacketSize: number
  hasPAT: boolean
  hasPMT: boolean
  tsSliceQueueMap: Map<PID, TSSliceQueue>
  pat: PAT,
  pmt: PMT,
  program2Pmt: Map<number, PMT>
  ioEnd: boolean

  startPid: number
  delay: bigint
}

export interface MpegtsStreamContext {
  pid: number
  filter: AVBSFilter
  tsPacket: TSPacket
  pes: PES
  continuityCounter: number
  pesSlices: {
    total: number
    buffers: Uint8Array[]
  },
  latm: boolean
}

export interface MpegpsSlice {
  pts: int64
  dts: int64
  pos: int64
  buffers: Uint8Array[]
}

export interface MpegpsContext {
  headerState: int32
  psmType: Map<int32, int32>
  pes: PES
  slices: Map<int32, MpegpsSlice>
  lastPtsMap: Map<int32, int64>
  imkhCctv: boolean
  sofdec: boolean
  ioEnded: boolean
  paddingPES: PES
}

export interface MpegpsStreamContext {
  streamId: number
  streamType: number
  filter: AVBSFilter
  paddingPES: PES
}
