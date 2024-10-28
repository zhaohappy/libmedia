/*
 * libmedia av1 syntax util
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

import BitReader from 'common/io/BitReader'

export function f(bitReader: BitReader, n: number) {
  let x = 0
  for (let i = 0; i < n; i++ ) {
    x = 2 * x + bitReader.readU1()
  }
  return x
}

export function uvlc(bitReader: BitReader) {
  let leadingZeros = 0
  while (true) {
    let done = f(bitReader, 1)
    if (done) {
      break
    }
    leadingZeros++
  }
  if (leadingZeros >= 32) {
    return (1 << 32) - 1
  }
  const value =	f(bitReader, leadingZeros)
  return value + (1 << leadingZeros) - 1
}

export function le(bitReader: BitReader, n: number) {
  let t = 0
  for (let i = 0; i < n; i++) {
    let byte = f(bitReader, 8)
    t += (byte << (i * 8))
  }
  return t
}

export function leb128(bitReader: BitReader) {
  let value = 0
  for (let i = 0; i < 8; i++ ) {
    let next = f(bitReader, 8)
    value |= ((next & 0x7f) << (i * 7))
    if (!(next & 0x80)) {
      break
    }
  }
  return value
}

export function su(bitReader: BitReader, n: number) {
  let value = f(bitReader, n)
  let signMask = 1 << (n - 1)
  if (value & signMask) {
    value = value - 2 * signMask
  }
  return value
}

export function ns(bitReader: BitReader, n: number) {
  let w = Math.floor(Math.log2(n)) + 1
  let m = (1 << w) - n
  let v =	f(bitReader, w - 1)
  if (v < m) {
    return v
  }
  let extraBit =	f(bitReader, 1)
  return (v << 1) - m + extraBit
}

export function L(bitReader: BitReader, n: number) {
  let x = 0
  for (let i = 0 ; i < n; i++ ) {
    x = 2 * x + bitReader.readU1()
  }
  return x
}

export function NS(bitReader: BitReader, n: number) {
  let w = Math.floor(Math.log2(n)) + 1
  let m = (1 << w) - n
  let v =	L(bitReader, w - 1)
  if (v < m) {
    return v
  }
  let extraBit = L(bitReader, 1)
  return (v << 1) - m + extraBit
}
