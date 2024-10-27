/*
 * libmedia rtp parser
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

import { Uint8ArrayInterface } from 'common/io/interface'
import { RTPHeaderExtension, RTPPacket, RTPPacketHeader } from './RTPPacket'

export function parseRTPPacket(data: Uint8ArrayInterface) {
  const packet = new RTPPacket()
  const header = packet.header = new RTPPacketHeader()
  let offset = 0
  header.version = data[offset] >> 6
  header.padding = (data[offset] >> 5) & 0x01
  header.extension = (data[offset] >> 4) & 0x01
  header.csrc = data[offset] & 0x0f
  offset++

  header.masker = (data[offset] >> 7) & 0x01
  header.payloadType = data[offset] & 0x7f
  offset++

  header.sequence = (data[offset] << 8) | data[offset + 1]
  offset += 2

  header.timestamp = ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
  offset += 4

  header.ssrc = ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
  offset += 4

  for (let i = 0; i < header.csrc; i++) {
    header.csrcList.push(((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0)
    offset += 4
  }
  if (header.extension) {
    packet.headerExtension = packet.headerExtension = new RTPHeaderExtension()
    packet.headerExtension.id = (data[offset] << 8) | data[offset + 1]
    offset += 2

    packet.headerExtension.length = (data[offset] << 8) | data[offset + 1]
    offset += 2

    packet.headerExtension.extension = data.subarray(offset, packet.headerExtension.length * 4)
    offset += 4 * packet.headerExtension.length
  }
  packet.payload = data.subarray(offset, data.length - (header.padding ? data[data.length - 1] : 0))

  return packet
}
