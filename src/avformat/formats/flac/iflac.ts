/*
 * libmedia flac input util
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

import type { FrameInfo } from './type'
import { logger } from '@libmedia/common'
import { crc8 } from '@libmedia/common/math'
import type { BitReader } from '@libmedia/common/io'
import { errorType } from '@libmedia/avutil'
import { flac } from '@libmedia/avutil/internal'

export const MAX_FRAME_HEADER_SIZE = 16
export const MAX_FRAME_VERIFY_SIZE = MAX_FRAME_HEADER_SIZE + 1

export function getUtf8(reader: BitReader) {
  let value = static_cast<int64>(reader.readU(8))
  let top = (value & 128n) >> 1n
  if ((value & 0xc0n) === 0x80n || value >= 0xfen) {
    return -1n
  }
  while (value & top) {
    const tmp = static_cast<int64>(reader.readU(8)) - 128n
    if (tmp >> 6n) {
      return -1n
    }
    value = (value << 6n) + tmp
    top <<= 5n
  }
  value &= (top << 1n) - 1n

  return value
}

export function decodeFrameHeader(bitReader: BitReader, info: Partial<FrameInfo>, check: boolean = false) {

  const start = bitReader.getPointer()

  if ((bitReader.readU(15) & 0x7fff) != 0x7ffc) {
    !check && logger.error('invalid sync code')
    return errorType.DATA_INVALID
  }
  info.isVarSize = bitReader.readU1()

  const bsCode = bitReader.readU(4)
  const srCode = bitReader.readU(4)

  info.chMode = bitReader.readU(4)

  if (info.chMode < flac.FLAC_MAX_CHANNELS) {
    info.channels = info.chMode + 1
    info.chMode = flac.FlacCHMode.INDEPENDENT
  }
  else if (info.chMode < flac.FLAC_MAX_CHANNELS + flac.FlacCHMode.MID_SIDE) {
    info.channels = 2
    info.chMode -= flac.FLAC_MAX_CHANNELS - 1
  }
  else {
    !check && logger.error(`invalid channel mode: ${info.chMode}`)
    return errorType.DATA_INVALID
  }

  const bpsCode = bitReader.readU(3)
  if (bpsCode === 3) {
    !check && logger.error(`invalid sample size code: ${bpsCode}`)
    return errorType.DATA_INVALID
  }
  info.bps = flac.SampleSizeTable[bpsCode]

  if (bitReader.readU1()) {
    !check && logger.error('broken stream, invalid padding')
    return errorType.DATA_INVALID
  }

  info.frameOrSampleNum = getUtf8(bitReader)

  if (info.frameOrSampleNum < 0) {
    !check && logger.error('sample/frame number invalid')
    return errorType.DATA_INVALID
  }

  if (bsCode === 0) {
    !check && logger.error('reserved blocksize code: 0')
    return errorType.DATA_INVALID
  }
  else if (bsCode === 6) {
    info.blocksize = bitReader.readU(8) + 1
  }
  else if (bsCode === 7) {
    info.blocksize = bitReader.readU(16) + 1
  }
  else {
    info.blocksize = flac.BlockSizeTable[bsCode]
  }

  if (srCode < 12) {
    info.sampleRate = flac.SampleRateTable[srCode]
  }
  else if (srCode === 12) {
    info.sampleRate = bitReader.readU(8) * 1000
  }
  else if (srCode === 13) {
    info.sampleRate = bitReader.readU(16)
  }
  else if (srCode === 14) {
    info.sampleRate = bitReader.readU(16) * 10
  }
  else {
    !check && logger.error(`illegal sample rate code ${srCode}`)
    return errorType.DATA_INVALID
  }

  const crc = crc8(bitReader.getBuffer().subarray(start, bitReader.getPointer()))

  if (crc !== bitReader.readU(8)) {
    !check && logger.error('header crc mismatch')
    return errorType.DATA_INVALID
  }
  const bits = bitReader.remainingLength() * 8 + bitReader.getBitLeft()
  if (bits > 0) {
    // subframe zero bit
    if (bitReader.readU1()) {
      return errorType.DATA_INVALID
    }
    if (bits > 6) {
      // subframe type
      // 000000 : SUBFRAME_CONSTANT
      // 000001 : SUBFRAME_VERBATIM
      // 00001x : reserved
      // 0001xx : reserved
      // 001xxx : if(xxx <= 4) SUBFRAME_FIXED, xxx=order ; else reserved
      // 01xxxx : reserved
      // 1xxxxx : SUBFRAME_LPC, xxxxx=order-1
      const subFrameType = bitReader.readU(6)
      if (!(subFrameType === 0
        || subFrameType === 1
        || ((subFrameType >= 8) && (subFrameType <= 12))
        || (subFrameType >= 32)
      )) {
        return errorType.DATA_INVALID
      }
    }
  }

  return 0
}
