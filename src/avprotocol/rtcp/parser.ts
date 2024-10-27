/*
 * libmedia rtcp parser
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
import { Uint8ArrayInterface } from 'common/io/interface'
import { RTCPCommonHeader, RTCPSendReport, Report } from './RTCPPacket'

export function parseHeader(packet: RTCPCommonHeader, reader: BufferReader) {
  let byte = reader.readUint8()
  packet.version = byte >>> 6
  packet.padding = (byte >>> 5) & 0x01
  packet.count = byte & 0x1f
  packet.payloadType = reader.readUint8()
  packet.length = reader.readUint16()
}

export function parseRTCPSendReport(data: Uint8ArrayInterface) {
  const reader = new BufferReader(data)

  const sr = new RTCPSendReport()

  parseHeader(sr, reader)

  sr.ssrc = reader.readUint32()
  sr.ntp = reader.readUint64()
  sr.timestamp = reader.readUint32()

  sr.senderPacketCount = reader.readUint32()
  sr.senderOctetCount = reader.readUint32()

  for (let i = 0; i < sr.count; i++) {
    const report = new Report()
    report.ssrc = reader.readUint32()
    report.fractionLost = reader.readUint8()
    report.packetLost = reader.readUint24()
    report.highestSequence = reader.readUint32()
    report.interArrivalJitter = reader.readUint32()
    report.lsr = reader.readUint32()
    report.dlsr = reader.readUint32()
  }

  return sr
}
