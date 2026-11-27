/*
 * libmedia isom dovi
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

import type { AVDOVIDecoderConfigurationRecord } from '@libmedia/avutil'
import { BitWriter, type Uint8ArrayInterface } from '@libmedia/common/io'

export const ISOM_DVCC_DVVC_SIZE = 24

export function parseDVDecoderConfigurationRecord(data: Uint8ArrayInterface) {
  const dovi = make<AVDOVIDecoderConfigurationRecord>()

  let ptr = 0

  dovi.dvVersionMajor = data[ptr++]
  dovi.dvVersionMinor = data[ptr++]

  let buf = data[ptr++] << 8
  buf |= data[ptr++]

  dovi.dvProfile = (buf >>> 9) & 0x7f
  dovi.dvLevel = (buf >>> 3) & 0x3f
  dovi.rpuPresentFlag = (buf >>> 2) & 0x01
  dovi.elPresentFlag = (buf >>> 1) & 0x01
  dovi.blPresentFlag = buf & 0x01

  if (data.length >= 5) {
    dovi.dvBlSignalCompatibilityId = (data[ptr++] >> 4) & 0x0f
  }
  else {
    dovi.dvBlSignalCompatibilityId = 0
  }
  return dovi
}

export function writeDVDecoderConfigurationRecord(dovi: AVDOVIDecoderConfigurationRecord) {
  const bitWriter = new BitWriter(ISOM_DVCC_DVVC_SIZE)
  bitWriter.writeU(8, dovi.dvVersionMajor)
  bitWriter.writeU(8, dovi.dvVersionMinor)
  bitWriter.writeU(7, dovi.dvProfile & 0x7f)
  bitWriter.writeU(6, dovi.dvLevel & 0x3f)
  bitWriter.writeU(1, dovi.rpuPresentFlag)
  bitWriter.writeU(1, dovi.elPresentFlag)
  bitWriter.writeU(1, dovi.blPresentFlag)
  bitWriter.writeU(4, dovi.dvBlSignalCompatibilityId & 0x0f)

  bitWriter.writeU(28, 0)
  bitWriter.writeU(32, 0)
  bitWriter.writeU(32, 0)
  bitWriter.writeU(32, 0)
  bitWriter.writeU(32, 0)

  bitWriter.padding()

  return bitWriter.getBuffer()
}
