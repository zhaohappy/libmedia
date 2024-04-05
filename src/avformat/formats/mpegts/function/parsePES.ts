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

import Stream from '../../../AVStream'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { PES } from '../struct'
import { addAVPacketData } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVCodecID } from 'avutil/codec'
import { BitFormat } from '../../../codecs/h264'

export default function parsePES(pes: PES, avpacket: pointer<AVPacket>, stream: Stream) {

  if (pes.randomAccessIndicator) {
    avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
  }

  const codecId = stream.codecpar.codecId
  if (codecId === AVCodecID.AV_CODEC_ID_H264 || codecId === AVCodecID.AV_CODEC_ID_H265) {
    avpacket.bitFormat = BitFormat.ANNEXB
  }

  avpacket.streamIndex = stream.index

  avpacket.dts = pes.dts
  avpacket.pts = pes.pts
  avpacket.pos = pes.pos
  avpacket.timeBase.den = 90000
  avpacket.timeBase.num = 1

  if (stream.startTime === NOPTS_VALUE_BIGINT) {
    stream.startTime = avpacket.pts || avpacket.dts
  }

  const data = avMalloc(pes.payload.length)
  memcpyFromUint8Array(data, pes.payload.length, pes.payload)
  addAVPacketData(avpacket, data, pes.payload.length)
}
