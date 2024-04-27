/*
 * libmedia parse PMT
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
import { ESDescriptor, PMT, TSSliceQueue } from '../struct'
import { MpegtsContext } from '../type'
import concatTypeArray from 'common/function/concatTypeArray'
import * as logger from 'common/util/logger'

export default function parsePMT(queue: TSSliceQueue, mpegtsContext: MpegtsContext) {

  let byte = 0

  const bufferReader = new BufferReader(concatTypeArray(Uint8Array, queue.slices), true)

  const tableId = bufferReader.readUint8()
  if (tableId !== 0x02) {
    logger.error(`parse PMT: table_id ${tableId} is not corresponded to PAT!`)
  }

  const sectionLength = bufferReader.readUint16() & 0x0fff
  const programNumber = bufferReader.readUint16()

  byte = bufferReader.readUint8()

  const versionNumber = (byte >> 1) & 0x1f
  const currentNextIndicator = byte & 0x01

  const sectionNumber = bufferReader.readUint8()
  const lastSectionNumber = bufferReader.readUint8()

  let pmt: PMT

  if (currentNextIndicator === 1 && sectionNumber === 0) {
    pmt = new PMT()
    pmt.programNumber = programNumber
    pmt.versionNumber = versionNumber

    mpegtsContext.program2Pmt.set(programNumber, pmt)
    mpegtsContext.hasPMT = true
  }
  else {
    pmt = mpegtsContext.program2Pmt.get(programNumber)

    if (!pmt) {
      logger.error('can not found PMT in mpegts context')
      return
    }
  }

  pmt.pcrPid = bufferReader.readUint16() & 0x1fff
  const programInfoLength = bufferReader.readUint16() & 0x0fff

  bufferReader.skip(programInfoLength)

  let endPos = static_cast<int32>(bufferReader.getPos()) + (sectionLength - 9 - programInfoLength - 4)

  while (bufferReader.getPos() < endPos) {
    const streamType = bufferReader.readUint8()
    const elementaryPid = bufferReader.readUint16() & 0x1fff
    const esInfoLength = bufferReader.readUint16() & 0x0fff

    pmt.pid2StreamType.set(elementaryPid, streamType)

    if (defined(ENABLE_LOG_TRACE)) {
      logger.trace(`found stream, type: ${streamType}, pid: ${elementaryPid}`)
    }

    if (esInfoLength > 0) {

      const esDescriptorList = []

      const subEndPos = static_cast<int32>(bufferReader.getPos()) + esInfoLength
      while (bufferReader.getPos() < subEndPos) {
        const esDescriptor = new ESDescriptor()
        esDescriptor.tag = bufferReader.readUint8()
        const length = bufferReader.readUint8()
        if (length > 0) {
          esDescriptor.buffer = bufferReader.readBuffer(length)
        }
        esDescriptorList.push(esDescriptor)
      }
      pmt.pid2ESDescriptor.set(elementaryPid, esDescriptorList)
    }
  }

  if (programNumber === mpegtsContext.currentProgram) {
    if (!mpegtsContext.pmt) {
      logger.info('parsed first PMT')
    }
    mpegtsContext.pmt = pmt
  }
}
