/*
 * libmedia parse PES
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

import { PES } from '../struct'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as logger from 'common/util/logger'
import { TSStreamId, TSStreamType } from '../mpegts'
import * as errorType from 'avutil/error'

export default function parsePES(pes: PES) {

  const data = pes.data
  const streamId = data[3]
  const pesPacketLength = (data[4] << 8) | data[5]

  let headerSize = 0
  let offset = 0
  let flags = 0

  if (streamId !== TSStreamId.PROGRAM_STREAM_MAP
    && streamId !== TSStreamId.PADDING_STREAM
    && streamId !== TSStreamId.PRIVATE_STREAM_2
    && streamId !== TSStreamId.ECM_STREAM
    && streamId !== TSStreamId.EMM_STREAM
    && streamId !== TSStreamId.PROGRAM_STREAM_DIRECTORY
    && streamId !== TSStreamId.DSMCC_STREAM
    && streamId !== TSStreamId.TYPE_E_STREAM
  ) {

    let pts: int64 = NOPTS_VALUE_BIGINT
    let dts: int64 = NOPTS_VALUE_BIGINT

    while (true) {
      if (6 + offset >= data.length) {
        return errorType.DATA_INVALID
      }
      flags = data[6 + offset]
      if (flags !== 0xff) {
        break
      }
      offset++
    }

    if ((flags & 0xc0) === 0x40) {
      offset += 2
      flags = data[6 + offset]
    }
    if ((flags & 0xe0) == 0x20) {

      headerSize += 5

      pts = pts = static_cast<int64>((data[6 + offset] & 0x0E) * 536870912
        + (data[7 + offset] & 0xFF) * 4194304
        + (data[8 + offset] & 0xFE) * 16384
        + (data[9 + offset] & 0xFF) * 128
        + (data[10 + offset] & 0xFE) / 2)

      if (flags & 0x10) {
        dts = static_cast<int64>((data[11 + offset] & 0x0E) * 536870912
          + (data[12 + offset] & 0xFF) * 4194304
          + (data[13 + offset] & 0xFE) * 16384
          + (data[14 + offset] & 0xFF) * 128
          + (data[15 + offset] & 0xFE) / 2)

        headerSize += 5
      }
      else {
        dts = pts
      }
    }
    else if ((flags & 0xc0) == 0x80) {
      // const pesScramblingControl = (data[6] & 0x30) >>> 4
      const ptsDtsFlags = (data[7 + offset] & 0xC0) >>> 6
      headerSize = 3 + data[8 + offset]

      if (ptsDtsFlags === 0x02 || ptsDtsFlags === 0x03) {
        pts = static_cast<int64>((data[9 + offset] & 0x0E) * 536870912
          + (data[10 + offset] & 0xFF) * 4194304
          + (data[11 + offset] & 0xFE) * 16384
          + (data[12 + offset] & 0xFF) * 128
          + (data[13 + offset] & 0xFE) / 2)

        if (ptsDtsFlags === 0x03) {
          dts = static_cast<int64>((data[14 + offset] & 0x0E) * 536870912
            + (data[15 + offset] & 0xFF) * 4194304
            + (data[16 + offset] & 0xFE) * 16384
            + (data[17 + offset] & 0xFF) * 128
            + (data[18 + offset] & 0xFE) / 2)
        }
        else {
          dts = pts
        }
      }
    }
    else if (flags === 0xf) {
      headerSize = 1
    }
    else {
      logger.error('invalid data')
      return errorType.DATA_INVALID
    }

    pes.dts = dts
    pes.pts = pts

    const payloadStartIndex = 6 + offset + headerSize
    let payloadLength: number = 0

    if (pesPacketLength !== 0) {
      if (pesPacketLength < offset + headerSize) {
        logger.error('Malformed PES: PES_packet_length < 3 + PES_header_data_length')
        return errorType.DATA_INVALID
      }
      payloadLength = pesPacketLength - (offset + headerSize)
    }
    else {
      // PES_packet_length === 0
      payloadLength = data.byteLength - payloadStartIndex
    }

    pes.payload = data.subarray(payloadStartIndex, payloadStartIndex + payloadLength)
  }
  else if (streamId === TSStreamId.PROGRAM_STREAM_MAP
    || streamId === TSStreamId.PRIVATE_STREAM_2
    || streamId === TSStreamId.ECM_STREAM
    || streamId === TSStreamId.EMM_STREAM
    || streamId === TSStreamId.PROGRAM_STREAM_DIRECTORY
    || streamId === TSStreamId.DSMCC_STREAM
    || streamId === TSStreamId.TYPE_E_STREAM
  ) {
    if (pes.streamId === TSStreamType.PRIVATE_DATA) {
      const payloadStartIndex = 6
      let payloadLength: number = 0

      if (pesPacketLength !== 0) {
        payloadLength = pesPacketLength
      }
      else {
        // PES_packet_length === 0
        payloadLength = data.byteLength - payloadStartIndex
      }
      pes.payload = data.subarray(payloadStartIndex, payloadStartIndex + payloadLength)
    }
  }
  return 0
}
