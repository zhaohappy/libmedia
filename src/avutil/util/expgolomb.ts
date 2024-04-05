/*
 * libmedia expgolomb util
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
import BitWriter from 'common/io/BitWriter'

const UESizeTable = [
  // 0 的二进制所需的比特个数
  1,
  // 1 的二进制所需的比特个数    
  1,
  // 2~3 的二进制所需的比特个数   
  2, 2,
  // 4~7 的二进制所需的比特个数
  3, 3, 3, 3,
  // 8~15 的二进制所需的比特个数
  4, 4, 4, 4, 4, 4, 4, 4,
  // 16~31 的二进制所需的比特个数
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  // 32~63 的二进制所需的比特个数
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  // 64~127 的二进制所需的比特个数
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  // 128~255 的二进制所需的比特个数
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8
]

/**
 * ue(v) 指数哥伦布解码
 */
export function readUE(bitReader: BitReader) {
  let result = 0
  // leadingZeroBits
  let i = 0

  while (i < 32 && bitReader.readU1() === 0) {
    i++
  }
  // 计算 read_bits ( leadingZeroBits )
  result = bitReader.readU(i)
  // 计算 codeNum，1 << i 即为 2 的 i 次幂
  result += (1 << i) - 1

  return result
}

/**
 * se(v) 有符号指数哥伦布解码
 */
export function readSE(bitReader: BitReader) {
  let result = readUE(bitReader)

  // 判断 result 的奇偶性
  if (result & 0x01) {
    // 如果为奇数，说明编码前 > 0
    result = (result + 1) / 2
  }
  else {
    // 如果为偶数，说明编码前 <= 0
    result = -result / 2
  }
  return result
}

/**
 * te(v) 截断指数哥伦布解码
 */
export function readTE(bitReader: BitReader, x: number) {
  let result = 0
  // 判断取值上限
  if (x === 1) {
    // 如果为 1 则将读取到的比特值取反
    result = 1 - bitReader.readU1()
  }
  else if (x > 1) {
    // 否则按照 ue(v) 进行解码
    result = readUE(bitReader)
  }
  return result
}

/**
 * ue(v) 指数哥伦布编码
 */
export function writeUE(bitWriter: BitWriter, value: number) {
  let size = 0

  if (value === 0) {
    // 0 直接编码为 1
    bitWriter.writeU1(1)
  }
  else {
    let tmp = ++value
    // 判断所需比特个数是否大于 16 位
    if ( tmp >= 0x00010000 ) {
      size += 16
      tmp >>= 16
    }

    // 判断此时所需比特个数是否大于 8 位
    if ( tmp >= 0x100 ) {
      size += 8
      tmp >>= 8
    }
    // 最终 tmp 移位至 8 位以内，去查表
    size += UESizeTable[tmp]

    // 最终得出编码 value 所需的总比特数：2 * size - 1
    bitWriter.writeU(2 * size - 1, value)
  }
}

/**
 * se(v) 有符号指数哥伦布编码
 */
export function writeSE(bitWriter: BitWriter, value: number) {
  if (value <= 0) {
    writeUE(bitWriter, -value * 2)
  }
  else {
    writeUE(bitWriter, value * 2 - 1)
  }
}

/**
 * te(v) 截断指数哥伦布编码
 */
export function writeTE(bitWriter: BitWriter, x: number, value: number) {
  if (x === 1) {
    bitWriter.writeU1(1 & ~value)
  }
  else if (x > 1) {
    writeUE(bitWriter, value)
  }
}
