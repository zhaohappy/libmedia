/*
 * libmedia mpegts decode util
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

import * as mpegts from './mpegts'
import { IOError } from 'common/io/error'
import analyzeTSLength from './function/analyzeTSLength'
import { MpegtsContext } from './type'
import * as logger from 'common/util/logger'
import { TSPacket } from './struct'
import parseAdaptationField from './function/parseAdaptationField'
import IOReader from 'common/io/IOReader'
import median from 'common/math/median'

export async function getPacketSize(ioReader: IOReader): Promise<number> {
  let buffer: Uint8Array
  try {
    buffer = await ioReader.peekBuffer(mpegts.PROBE_PACKET_MAX_BUF)
  }
  catch (error) {
    if (ioReader.error !== IOError.END) {
      buffer = await ioReader.peekBuffer(ioReader.remainingLength())
    }
  }

  if (buffer && buffer.length >= mpegts.TS_PACKET_SIZE) {
    const score = analyzeTSLength(buffer, mpegts.TS_PACKET_SIZE, false)
    const dvhsScore = analyzeTSLength(buffer, mpegts.TS_DVHS_PACKET_SIZE, false)
    const fecScore = analyzeTSLength(buffer, mpegts.TS_FEC_PACKET_SIZE, false)

    let margin = median([score, fecScore, dvhsScore])

    if (buffer.length < mpegts.PROBE_PACKET_MAX_BUF) {
      margin += mpegts.PROBE_PACKET_MARGIN
    }

    let size = mpegts.TS_PACKET_SIZE

    if (score > margin) {
      size = mpegts.TS_PACKET_SIZE
    }
    else if (dvhsScore > margin) {
      size = mpegts.TS_DVHS_PACKET_SIZE
    }
    else if (fecScore > margin) {
      size = mpegts.TS_FEC_PACKET_SIZE
    }

    logger.debug(`got ts packet size: ${size}`)

    return size
  }
  return 0
}

export async function parseTSPacket(ioReader: IOReader, mpegtsContext: MpegtsContext): Promise<TSPacket> {

  const pos = ioReader.getPos()
  let byte = 0

  if (mpegtsContext.tsPacketSize === mpegts.TS_DVHS_PACKET_SIZE) {
    // skip ATS field (2-bits copy-control + 30-bits timestamp) for m2ts
    await ioReader.skip(4)
  }

  const syncByte = await ioReader.readUint8()

  if (syncByte !== 0x47) {
    logger.fatal(`found syncByte not 0x47, value: ${syncByte.toString(16)}`)
  }

  const tsPacket = new TSPacket()
  tsPacket.pos = pos

  byte = await ioReader.readUint16()
  tsPacket.payloadUnitStartIndicator = (byte >> 14) & 0x01
  tsPacket.transportPriority = (byte >> 13) & 0x01
  tsPacket.pid = byte & 0x1fff

  byte = await ioReader.readUint8()
  tsPacket.adaptationFieldControl = (byte >> 4) & 0x03
  tsPacket.continuityCounter = byte & 0x0f

  let payloadStartIndex = 4

  if (tsPacket.adaptationFieldControl === 0x02 || tsPacket.adaptationFieldControl === 0x03) {
    const adaptationFieldLength = await ioReader.readUint8()
    if (5 + adaptationFieldLength === mpegts.TS_PACKET_SIZE) {
      parseAdaptationField(await ioReader.readBuffer(adaptationFieldLength), tsPacket)
      if (mpegtsContext.tsPacketSize === mpegts.TS_FEC_PACKET_SIZE) {
        await ioReader.skip(16)
      }
      return tsPacket
    }
    else {
      if (adaptationFieldLength > 0) {
        parseAdaptationField(await ioReader.readBuffer(adaptationFieldLength), tsPacket)
      }
      payloadStartIndex = 4 + 1 + adaptationFieldLength
    }
  }
  if (tsPacket.adaptationFieldControl === 0x01 || tsPacket.adaptationFieldControl === 0x03) {
    tsPacket.payload = await ioReader.readBuffer(mpegts.TS_PACKET_SIZE - payloadStartIndex)
  }

  if (mpegtsContext.tsPacketSize === mpegts.TS_FEC_PACKET_SIZE) {
    await ioReader.skip(16)
  }

  return tsPacket
}
