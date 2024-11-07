/*
 * libmedia rtmp util
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

import IOWriter from 'common/io/IOWriter'
import { RtmpPacket } from './RtmpPacket'
import { RtmpPacketHeaderSize } from './rtmp'
import IOReader from 'common/io/IOReader'
import concatTypeArray from 'common/function/concatTypeArray'
import * as logger from 'common/util/logger'

async function writeChannelId(ioWriter: IOWriter, channelId: int32, mode: int32) {
  if (channelId < 64) {
    await ioWriter.writeUint8(channelId | (mode << 6))
  }
  else if (channelId < 64 + 256) {
    await ioWriter.writeUint8(0 | (mode << 6))
    await ioWriter.writeUint8(channelId - 64)
  }
  else {
    await ioWriter.writeUint8(1 | (mode << 6))
    const id = channelId - 64
    await ioWriter.writeUint8(id & 0xff)
    await ioWriter.writeUint8(id >>> 8)
  }
}

export async function sendRtmpPacket(ioWriter: IOWriter, chunkSize: int32, packet: RtmpPacket, prevPacket: RtmpPacket) {
  const useDelta = prevPacket
    && prevPacket.extra === packet.extra
    && packet.timestamp >= prevPacket.timestamp

  let timestamp = packet.timestamp
  if (useDelta) {
    timestamp -= prevPacket.timestamp
  }
  if (timestamp > 0xFFFFFF) {
    packet.tsField = 0xFFFFFF
  }
  else {
    packet.tsField = timestamp
  }

  let mode = RtmpPacketHeaderSize.PS_TWELVE_BYTES
  if (useDelta) {
    if (packet.type === prevPacket.type
      && packet.payload.length === prevPacket.payload.length
    ) {
      mode = RtmpPacketHeaderSize.PS_FOUR_BYTES

      if (packet.tsField === prevPacket.tsField) {
        mode = RtmpPacketHeaderSize.PS_ONE_BYTE
      }
    }
    else {
      mode = RtmpPacketHeaderSize.PS_EIGHT_BYTES
    }
  }

  await writeChannelId(ioWriter, packet.channelId, mode)

  if (mode !== RtmpPacketHeaderSize.PS_ONE_BYTE) {
    await ioWriter.writeUint24(packet.tsField)
    if (mode !== RtmpPacketHeaderSize.PS_FOUR_BYTES) {
      await ioWriter.writeUint24(packet.payload.length)
      await ioWriter.writeUint8(packet.type)
      if (mode === RtmpPacketHeaderSize.PS_TWELVE_BYTES) {
        await ioWriter.writeUint8(packet.extra)
        await ioWriter.writeUint8(packet.extra >> 8)
        await ioWriter.writeUint8(packet.extra >> 16)
        await ioWriter.writeUint8(packet.extra >> 24)
      }
    }
  }
  if (packet.tsField === 0xFFFFFF) {
    await ioWriter.writeUint32(timestamp)
  }

  let offset = 0
  while (offset < packet.payload.length) {
    const len = Math.min(chunkSize, packet.payload.length - offset)
    await ioWriter.writeBuffer(packet.payload.subarray(offset, offset + len))

    offset += len

    if (offset < packet.payload.length) {
      await writeChannelId(ioWriter, packet.channelId, RtmpPacketHeaderSize.PS_ONE_BYTE)
      if (packet.tsField === 0xFFFFFF) {
        await ioWriter.writeUint32(timestamp)
      }
    }
  }
  await ioWriter.flush()
}

export async function readRtmpPacket(ioReader: IOReader, chunkSize: int32, prevPacketMap: Map<int32, RtmpPacket>) {
  const buffers: Uint8Array[] = []
  const header = await ioReader.readUint8()
  let channelId = header & 0x3F

  // special case for channel number >= 64
  if (channelId < 2) {
    const total = await ioReader.readUint8()
    if (total === 0) {
      channelId = (await ioReader.readUint8()) + 64
    }
    else {
      channelId = ((await ioReader.readUint8()) | ((await ioReader.readUint8()) << 8)) + 64
    }
  }
  const mode = header >>> 6

  const prevPacket = prevPacketMap.get(channelId)

  let size = prevPacket ? prevPacket.payload.length : 0
  let type = prevPacket ? prevPacket.type : 0
  let extra = prevPacket ? prevPacket.extra : 0
  let tsField = 0
  let timestamp = 0

  if (mode === RtmpPacketHeaderSize.PS_ONE_BYTE) {
    tsField = prevPacket.tsField
  }
  else {
    tsField = await ioReader.readUint24()
    if (mode !== RtmpPacketHeaderSize.PS_FOUR_BYTES) {
      size = await ioReader.readUint24()
      type = await ioReader.readUint8()

      if (mode === RtmpPacketHeaderSize.PS_TWELVE_BYTES) {
        extra = await ioReader.readUint8()
        extra |= (await ioReader.readUint8()) << 8
        extra |= (await ioReader.readUint8()) << 16
        extra |= (await ioReader.readUint8()) << 24
      }
    }
  }

  if (tsField === 0xFFFFFF) {
    timestamp = await ioReader.readUint32()
  }
  else {
    timestamp = tsField
  }
  if (mode !== RtmpPacketHeaderSize.PS_TWELVE_BYTES) {
    if (prevPacket) {
      timestamp += prevPacket.timestamp
    }
    else {
      logger.warn(`got invalid message fmt, channel id ${channelId} can not find prev message with fmt ${mode}`)
    }
  }
  if (size < chunkSize) {
    buffers.push(await ioReader.readBuffer(size))
  }
  else {
    let total = size
    while (total) {
      const len = Math.min(chunkSize, total)
      buffers.push(await ioReader.readBuffer(len))
      total -= len
      if (total) {
        const next = (await ioReader.readUint8()) & 0x3F
        if (next < 2) {
          await ioReader.skip(next + 1)
        }
        if (tsField === 0xFFFFFF) {
          await ioReader.skip(4)
        }
      }
    }
  }
  const packet = new RtmpPacket(channelId, type, timestamp, concatTypeArray(Uint8Array, buffers))
  packet.tsField = tsField
  packet.extra = extra

  return packet
}
