/*
 * libmedia mpegts struct defined
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

import { NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { TSStreamType } from './mpegts'
import { PID } from './type'

export class TSPacketAdaptationFieldInfo {
  discontinuityIndicator: number = 0
  randomAccessIndicator: number = 0
  elementaryStreamPriorityIndicator: number = 0
  pcrFlag: number = 0
  opcrFlag: number = 0
  splicingPointFlag: number = 0
  transportPrivateDataFlag: number = 0
  adaptationFieldExtensionFlag: number = 0
  pcr: bigint = 0n
  opcr: bigint = 0n
  spliceCountDown: number = 0
  transportPrivateData: Uint8Array = null
  extension: Uint8Array = null
}

export class TSPacket {
  pos: bigint = NOPTS_VALUE_BIGINT
  payloadUnitStartIndicator: number = 0
  transportPriority: number = 0
  pid: PID = NOPTS_VALUE
  adaptationFieldControl: number = 0
  continuityCounter: number = 0
  transportScramblingControl: number = 0
  adaptationFieldInfo: TSPacketAdaptationFieldInfo = new TSPacketAdaptationFieldInfo()
  payload: Uint8Array = null
}

export class TSSliceQueue {
  slices: Uint8Array[] = []
  totalLength: number = 0
  expectedLength: number = NOPTS_VALUE
  randomAccessIndicator: number = 0
  pid: PID = NOPTS_VALUE
  streamType: TSStreamType = TSStreamType.NONE
  pos: bigint = NOPTS_VALUE_BIGINT
}

export class PAT {
  versionNumber: number = 0
  networkPid: PID = NOPTS_VALUE
  program2PmtPid: Map<number, PID> = new Map()
}

export class SectionPacket extends TSPacket {
}

export class ESDescriptor {
  tag: number
  buffer: Uint8Array
}

export class PMT {
  versionNumber: number = 0
  programNumber: number = 0
  pcrPid: PID = 0
  pid2StreamType: Map<number, TSStreamType> = new Map()
  pid2ESDescriptor: Map<number, ESDescriptor[]> = new Map()
}

export class PES {
  pid: PID = NOPTS_VALUE
  streamType: TSStreamType = TSStreamType.NONE
  streamId: number = NOPTS_VALUE
  dts: bigint = NOPTS_VALUE_BIGINT
  pts: bigint = NOPTS_VALUE_BIGINT
  pos: bigint = NOPTS_VALUE_BIGINT
  payload: Uint8Array = null
  data: Uint8Array = null
  randomAccessIndicator: number = 0
}
