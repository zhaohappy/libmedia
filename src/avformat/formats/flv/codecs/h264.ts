/*
 * libmedia flv h264 util
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

import * as flv from '../oflv'
import Stream from '../../../AVStream'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { FlvTag } from '../flv'
import IOWriter from 'common/io/IOWriterSync'
import { FlvCodecHeaderLength } from '../flv'
import { AVCodecID } from 'avutil/codec'

export const enum AVCPacketType {
  AVC_SEQUENCE_HEADER,
  AVC_NALU,
  AVC_END_OF_ENQUENCE
}

export function writeDataHeader(ioWriter: IOWriter, type: AVCPacketType, ct: number) {
  ioWriter.writeUint8(type)
  ioWriter.writeUint24(ct)
}

/**
 * 写 extradata 数据
 * 
 * @param ioWriter 
 * @param stream 
 * @param data 
 * @param metadata 
 */
export function writeExtradata(
  ioWriter: IOWriter,
  stream: Stream,
  metadata: Uint8Array,
  flags: AVPacketFlags
) {

  const now = ioWriter.getPos()

  flv.writeTagHeader(
    ioWriter,
    FlvTag.VIDEO,
    metadata.length + 1 + FlvCodecHeaderLength[AVCodecID.AV_CODEC_ID_H264],
    0n
  )
  flv.writeVideoTagDataHeader(ioWriter, stream, flags)

  writeDataHeader(ioWriter, AVCPacketType.AVC_SEQUENCE_HEADER, 0)
  ioWriter.writeBuffer(metadata)

  const length = Number(ioWriter.getPos() - now)
  ioWriter.writeUint32(length)

  return length
}
