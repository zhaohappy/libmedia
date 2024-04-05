/*
 * libmedia rewrite value with pos
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

import IOWriter from 'common/io/IOWriterSync'

type Type = 'uint8' | 'int8' | 'uint16' | 'int16'
| 'uint32' | 'int32' | 'uint64' | 'int64' | 'float' | 'double'

export default function rewriteIO(
  ioWriter: IOWriter,
  pos: bigint,
  value: number | bigint,
  type: Type
) {
  const nowPos = ioWriter.getPos()
  const pointer = ioWriter.getPointer()
  const minPos = nowPos - static_cast<int64>(pointer)

  let inline = false

  if (pos < nowPos && pos >= minPos) {
    ioWriter.seekInline(pointer + Number(pos - nowPos))
    inline = true
  }
  else {
    ioWriter.seek(pos)
  }

  switch (type) {
    case 'uint8':
      ioWriter.writeUint8(static_cast<uint8>(value))
      break
    case 'int8':
      ioWriter.writeInt8(static_cast<int8>(value))
      break
    case 'uint16':
      ioWriter.writeUint16(static_cast<uint16>(value))
      break
    case 'int16':
      ioWriter.writeInt16(static_cast<int16>(value))
      break
    case 'uint32':
      ioWriter.writeUint32(static_cast<uint32>(value))
      break
    case 'int32':
      ioWriter.writeInt32(static_cast<int32>(value))
      break
    case 'uint64':
      ioWriter.writeUint64(static_cast<uint64>(value))
      break
    case 'int64':
      ioWriter.writeInt64(static_cast<int64>(value))
      break
    case 'float':
      ioWriter.writeFloat(static_cast<float>(value))
      break
    case 'double':
      ioWriter.writeDouble(static_cast<double>(value))
      break
  }

  if (inline) {
    ioWriter.seekInline(pointer)
  }
  else {
    ioWriter.seek(nowPos)
  }
}
