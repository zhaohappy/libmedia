/*
 * libmedia flv aac util
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
import { FlvCodecHeaderLength, FlvTag } from '../flv'
import Stream from '../../../AVStream'
import IOWriter from 'common/io/IOWriterSync'
import { AVCodecID } from 'avutil/codec'

export const enum AACPacketType {
  AAC_SEQUENCE_HEADER,
  AAC_RAW
}

export function writeDataHeader(ioWriter: IOWriter, type: AACPacketType) {
  ioWriter.writeUint8(type)
}

export function writeExtradata(ioWriter: IOWriter, stream: Stream, metadata: Uint8Array) {

  const now = ioWriter.getPos()

  flv.writeTagHeader(
    ioWriter,
    FlvTag.AUDIO,
    metadata.length + 1 + FlvCodecHeaderLength[AVCodecID.AV_CODEC_ID_AAC],
    0n
  )
  // tag header
  flv.writeAudioTagDataHeader(ioWriter, stream)

  // tag body
  writeDataHeader(ioWriter, AACPacketType.AAC_SEQUENCE_HEADER)
  ioWriter.writeBuffer(metadata)

  const length = Number(ioWriter.getPos() - now)
  ioWriter.writeUint32(length)

  return length
}
