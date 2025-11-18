
/*
 * libmedia int write util
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

export function w8(p: pointer<void>, value: number) {
  accessof(reinterpret_cast<pointer<uint8>>(p)) <- reinterpret_cast<uint8>(value & 0xff)
}

export function wl16(p: pointer<void>, value: uint16) {
  w8(p, value)
  w8(p + 1, value >>> 8)
}

export function wb16(p: pointer<void>, value: uint16) {
  w8(p, value >>> 8)
  w8(p + 1, value)
}

export function wl24(p: pointer<void>, value: uint32) {
  w8(p, value)
  w8(p + 1, value >>> 8)
  w8(p + 2, value >>> 16)
}

export function wb24(p: pointer<void>, value: uint32) {
  w8(p, value >>> 16)
  w8(p + 1, value >>> 8)
  w8(p + 2, value)
}

export function wl32(p: pointer<void>, value: uint32) {
  wl16(p, value & 0xffff)
  wl16(p + 2, value >>> 16)
}

export function wb32(p: pointer<void>, value: uint32) {
  wb16(p, value >>> 16)
  wb16(p + 2, value & 0xffff)
}

export function wl64(p: pointer<void>, value: uint64) {
  wl32(p, static_cast<uint32>(value))
  wl32(p + 4, static_cast<uint32>(value >> 32n))
}

export function wb64(p: pointer<void>, value: uint64) {
  wb32(p, static_cast<uint32>(value >> 32n))
  wb32(p + 4, static_cast<uint32>(value))
}
