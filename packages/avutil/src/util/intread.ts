/*
 * libmedia int read util
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

export function r8(p: pointer<void>): uint8 {
  return accessof(reinterpret_cast<pointer<uint8>>(p))
}

export function rl16(p: pointer<void>): uint16 {
  return (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) | r8(p)
}

export function rb16(p: pointer<void>): uint16 {
  return (r8(p) << 8) | r8(reinterpret_cast<pointer<uint8>>(p + 1))
}

export function rl24(p: pointer<void>): int32 {
  return (r8(reinterpret_cast<pointer<uint8>>(p + 2)) << 16) | (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) + r8(p)
}

export function rb24(p: pointer<void>): int32 {
  return (r8(p) << 16) | (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) | r8(reinterpret_cast<pointer<uint8>>(p + 2))
}

export function rl32(p: pointer<void>): int32 {
  return (rl16(reinterpret_cast<pointer<uint8>>(p + 2)) << 16) | rl16(p)
}

export function rb32(p: pointer<void>): int32 {
  return (rb16(p) << 16) | rb16(reinterpret_cast<pointer<uint8>>(p + 2))
}

export function rl64(p: pointer<void>): int64 {
  return (BigInt(rl32(reinterpret_cast<pointer<uint8>>(p + 4))) << 32n) | BigInt(rl32(p))
}

export function rb64(p: pointer<void>): int64 {
  return (BigInt(rb32(p)) << 32n) | BigInt(rb32(reinterpret_cast<pointer<uint8>>(p + 4)))
}
