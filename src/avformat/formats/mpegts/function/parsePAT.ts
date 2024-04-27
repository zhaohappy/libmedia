/*
 * libmedia parse PAT
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

import BufferReader from 'common/io/BufferReader'
import { PAT, TSSliceQueue } from '../struct'
import { MpegtsContext } from '../type'
import concatTypeArray from 'common/function/concatTypeArray'
import * as logger from 'common/util/logger'

export default function parsePAT(queue: TSSliceQueue, mpegtsContext: MpegtsContext) {

  let byte = 0

  const bufferReader = new BufferReader(concatTypeArray(Uint8Array, queue.slices), true)

  const tableId = bufferReader.readUint8()
  if (tableId !== 0x00) {
    logger.error(`parsePAT: table_id ${tableId} is not corresponded to PAT!`)
  }

  const sectionLength = bufferReader.readUint16() & 0x0fff

  const transportStreamId = bufferReader.readUint16()

  byte = bufferReader.readUint8()

  const versionNumber = (byte >> 1) & 0x1f
  const currentNextIndicator = byte & 0x01
  const sectionNumber = bufferReader.readUint8()
  const lastSectionNumber = bufferReader.readUint8()

  let pat: PAT

  if (currentNextIndicator === 1 && sectionNumber === 0) {
    pat = new PAT()
    pat.versionNumber = versionNumber
  }
  else {
    pat = mpegtsContext.pat

    if (!pat) {
      logger.error('can not found PAT in mpegts context')
      return
    }
  }

  const programBytes = sectionLength - 5 - 4

  const endPos = static_cast<int32>(bufferReader.getPos()) + programBytes

  let firstProgramNumber = -1
  let firstPmtPid = -1

  // program_number + program_map_PID + crc
  while (bufferReader.getPos() < endPos) {
    const programNumber = bufferReader.readUint16()
    const pid = bufferReader.readUint16() & 0x1fff

    // network_PID
    if (programNumber === 0) {
      pat.networkPid = pid
    }
    // program_map_PID
    else {
      pat.program2PmtPid.set(programNumber, pid)

      if (firstProgramNumber === -1) {
        firstProgramNumber = programNumber
      }
      if (firstPmtPid === -1) {
        firstPmtPid = pid
      }
    }
  }

  if (currentNextIndicator === 1 && sectionNumber === 0) {
    if (!mpegtsContext.pat) {
      logger.info('parsed first PAT')
    }
    mpegtsContext.pat = pat
    mpegtsContext.currentProgram = firstProgramNumber
    mpegtsContext.currentPmtPid = firstPmtPid

    if (defined(ENABLE_LOG_TRACE)) {
      logger.debug(`found PAT, current program: ${firstProgramNumber}, current PMT pid: ${firstPmtPid}`)
    }

    mpegtsContext.hasPAT = true
  }
}
