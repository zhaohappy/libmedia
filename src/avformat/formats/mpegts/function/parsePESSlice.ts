/*
 * libmedia parse PES slice
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

import { PES, TSSliceQueue } from '../struct'
import * as logger from 'common/util/logger'
import { TSStreamId, TSStreamType } from '../mpegts'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'

export default function parsePESSlice(queue: TSSliceQueue): PES {
  let data = new Uint8Array(queue.totalLength)
  for (let i = 0, offset = 0; i < queue.slices.length; i++) {
    let slice = queue.slices[i]
    data.set(slice, offset)
    offset += slice.byteLength
  }

  const streamId = data[3]
  const pesPacketLength = (data[4] << 8) | data[5]

  const pes = new PES()
  pes.data = data
  pes.pid = queue.pid
  pes.streamId = streamId
  pes.streamType = queue.streamType
  pes.pos = queue.pos
  pes.randomAccessIndicator = queue.randomAccessIndicator

  if (streamId !== TSStreamId.PROGRAM_STREAM_MAP
    && streamId !== TSStreamId.PADDING_STREAM
    && streamId !== TSStreamId.PRIVATE_STREAM_2
    && streamId !== TSStreamId.ECM_STREAM
    && streamId !== TSStreamId.EMM_STREAM
    && streamId !== TSStreamId.PROGRAM_STREAM_DIRECTORY
    && streamId !== TSStreamId.DSMCC_STREAM
    && streamId !== TSStreamId.TYPE_E_STREAM
  ) {
    // const pesScramblingControl = (data[6] & 0x30) >>> 4
    const ptsDtsFlags = (data[7] & 0xC0) >>> 6
    const pesHeaderDataLength = data[8]

    let pts: bigint = NOPTS_VALUE_BIGINT
    let dts: bigint = NOPTS_VALUE_BIGINT

    if (ptsDtsFlags === 0x02 || ptsDtsFlags === 0x03) {
      pts = static_cast<int64>((data[9] & 0x0E) * 536870912
        + (data[10] & 0xFF) * 4194304
        + (data[11] & 0xFE) * 16384
        + (data[12] & 0xFF) * 128
        + (data[13] & 0xFE) / 2)

      if (ptsDtsFlags === 0x03) {
        dts = static_cast<int64>((data[14] & 0x0E) * 536870912
          + (data[15] & 0xFF) * 4194304
          + (data[16] & 0xFE) * 16384
          + (data[17] & 0xFF) * 128
          + (data[18] & 0xFE) / 2)
      }
      else {
        dts = pts
      }
    }

    pes.dts = dts
    pes.pts = pts

    const payloadStartIndex = 6 + 3 + pesHeaderDataLength
    let payloadLength: number = 0

    if (pesPacketLength !== 0) {
      if (pesPacketLength < 3 + pesHeaderDataLength) {
        logger.error('Malformed PES: PES_packet_length < 3 + PES_header_data_length')
        return
      }
      payloadLength = pesPacketLength - 3 - pesHeaderDataLength
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
  return pes
}
