/*
 * libmedia rtmp packet
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

import { RtmpPacketType } from './rtmp'

export class RtmpPacket {
  /**
   * RTMP channel ID (nothing to do with audio/video channels though
   */
  channelId: int32
  /**
   * packet payload type
   */
  type: RtmpPacketType
  /**
   * packet full timestamp
   */
  timestamp: uint32
  /**
   * 24-bit timestamp or increment to the previous one, in milliseconds (latter only for media packets).
   * Clipped to a maximum of 0xFFFFFF, indicating an extended timestamp field.
   */
  tsField: uint32 = 0
  /**
   * probably an additional channel ID used during streaming data
   */
  extra: uint32 = 0
  /**
   * packet payload
   */
  payload: Uint8Array

  constructor(channelId: int32, type: RtmpPacketType, timestamp: uint32, size: int32 | Uint8Array) {
    this.channelId = channelId
    this.type = type
    this.timestamp = timestamp
    this.payload = size instanceof Uint8Array ? size : new Uint8Array(size)
  }
}

export class RtmpChunk {
  /**
 * RTMP channel ID (nothing to do with audio/video channels though
 */
  channelId: int32
  /**
  * packet payload type
  */
  type: RtmpPacketType
  /**
  * packet full timestamp
  */
  timestamp: uint32
  /**
  * 24-bit timestamp or increment to the previous one, in milliseconds (latter only for media packets).
  * Clipped to a maximum of 0xFFFFFF, indicating an extended timestamp field.
  */
  tsField: uint32 = 0
  /**
  * probably an additional channel ID used during streaming data
  */
  extra: uint32 = 0
  /**
   * packet payload
   */
  payload: Uint8Array
}

