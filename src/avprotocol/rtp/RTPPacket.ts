/*
 * libmedia rtp packet
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

export class RTPPacketHeader {
  version: bit<uint8, 2>
  padding: bit<uint8, 1>
  extension: bit<uint8, 1>
  csrc: bit<uint8, 4>
  masker: bit<uint8, 1>
  payloadType: bit<uint8, 7>
  sequence: uint16
  timestamp: uint32
  ssrc: uint32
  csrcList: uint32[] = []
}

export class RTPHeaderExtension {
  id: uint16
  length: uint16
  extension: Uint8Array

  headers: Map<int8, Uint8Array> = new Map()

  public hasOneByteExtensions() {
    return this.id === 0xBEDE
  }

  public hasTwoBytesExtensions() {
    return (this.id & 0b1111111111110000) == 0b0001000000000000
  }

  public parse() {
    if (this.hasOneByteExtensions()) {
      for (let i = 0; i < this.extension.length; i++) {
        const id = (this.extension[i] & 0xf0) >>> 4
        const len = (this.extension[i] & 0x0f) + 1
        // id=15 in One-Byte extensions means "stop parsing here".
        if (id === 15) {
          break
        }
        if (id !== 0) {
          this.headers.set(id, this.extension.subarray(i + 1, i + 1 + len))

          i += 1 + len
        }
        else {
          i++
        }
      }
    }
    else if (this.hasTwoBytesExtensions()) {
      for (let i = 0; i < this.extension.length; i++) {
        const id = this.extension[i]
        const len = this.extension[i + 1]
        if (id !== 0) {
          this.headers.set(id, this.extension.subarray(i + 2, i + 2 + len))
          i += 2 + len
        }
        else {
          i++
        }
      }
    }
  }
}

export class RTPPacket {
  header: RTPPacketHeader
  headerExtension: RTPHeaderExtension
  payload: Uint8Array
}
