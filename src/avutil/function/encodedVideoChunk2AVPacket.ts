/* libmedia EncodedVideoChunk to AVPacket utils
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

import { addAVPacketData, addAVPacketSideData, createAVPacket } from '../util/avpacket'
import AVPacket, { AVPacketFlags } from '../struct/avpacket'
import { avMalloc } from '../util/mem'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { AV_TIME_BASE } from '../constant'
import { AVPacketSideDataType } from '../codec'

export default function encodedVideoChunk2AVPacket(chunk: EncodedVideoChunk, avpacket: pointer<AVPacket> = nullptr, metadata?: EncodedVideoChunkMetadata & {
  svc?: {
    temporalLayerId: number
  }
  alphaSideData?: BufferSource
}) {
  if (avpacket === nullptr) {
    avpacket = createAVPacket()
  }

  avpacket.pts = static_cast<int64>(chunk.timestamp)
  avpacket.timeBase.den = AV_TIME_BASE
  avpacket.timeBase.num = 1
  avpacket.duration = static_cast<int64>(chunk.duration)
  const data: pointer<uint8> = avMalloc(chunk.byteLength)
  chunk.copyTo(mapUint8Array(data, chunk.byteLength))

  addAVPacketData(avpacket, data, chunk.byteLength)

  if (metadata) {
    if (metadata.decoderConfig?.description) {
      let buffer: Uint8Array
      if (metadata.decoderConfig.description instanceof ArrayBuffer) {
        buffer = new Uint8Array(metadata.decoderConfig.description)
      }
      else {
        buffer = new Uint8Array(metadata.decoderConfig.description.buffer)
      }
      const extradata = avMalloc(buffer.length)
      memcpyFromUint8Array(extradata, buffer.length, buffer)
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, buffer.length)
    }
    if (metadata.alphaSideData) {
      const extradata = avMalloc(metadata.alphaSideData.byteLength)
      let buffer: Uint8Array
      if (metadata.alphaSideData instanceof ArrayBuffer) {
        buffer = new Uint8Array(metadata.alphaSideData)
      }
      else {
        buffer = new Uint8Array(metadata.alphaSideData.buffer)
      }
      memcpyFromUint8Array(extradata, buffer.length, buffer)
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL, extradata, buffer.length)
    }
  }

  if (chunk.type === 'key') {
    avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
  }
}
