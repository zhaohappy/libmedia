/*
 * libmedia parse adaptation field
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

import { TSPacket } from '../struct'

export default function parseAdaptationField(buffer: Uint8Array, tsPacket: TSPacket) {
  let i = 0
  let byte = buffer[i++]
  tsPacket.adaptationFieldInfo.discontinuityIndicator = (byte >> 7) & 0x01
  tsPacket.adaptationFieldInfo.randomAccessIndicator = (byte >> 6) & 0x01
  tsPacket.adaptationFieldInfo.elementaryStreamPriorityIndicator = (byte >> 5) & 0x01
  tsPacket.adaptationFieldInfo.pcrFlag = (byte >> 4) & 0x01
  tsPacket.adaptationFieldInfo.opcrFlag = (byte >> 3) & 0x01
  tsPacket.adaptationFieldInfo.splicingPointFlag = (byte >> 2) & 0x01
  tsPacket.adaptationFieldInfo.transportPrivateDataFlag = (byte >> 1) & 0x01
  tsPacket.adaptationFieldInfo.adaptationFieldExtensionFlag = byte & 0x01

  if (tsPacket.adaptationFieldInfo.pcrFlag) {
    const pcrHigh = static_cast<int64>(buffer[i++] << 25
      | buffer[i++] << 17
      | buffer[i++] << 9
      | buffer[i++] << 1
      | buffer[i] >> 7)
    const prcLow = static_cast<int64>((buffer[i++] & 0x01) << 8 | buffer[i++])
    tsPacket.adaptationFieldInfo.pcr = pcrHigh * 300n + prcLow
  }
  if (tsPacket.adaptationFieldInfo.opcrFlag) {
    const pcrHigh = static_cast<int64>(buffer[i++] << 25
      | buffer[i++] << 17
      | buffer[i++] << 9
      | buffer[i++] << 1
      | buffer[i] >> 7)
    const prcLow = static_cast<int64>((buffer[i++] & 0x01) << 8 | buffer[i++])
    tsPacket.adaptationFieldInfo.pcr = pcrHigh * 300n + prcLow
  }
  if (tsPacket.adaptationFieldInfo.splicingPointFlag) {
    tsPacket.adaptationFieldInfo.spliceCountDown = buffer[i++]
  }
  if (tsPacket.adaptationFieldInfo.transportPrivateDataFlag) {
    const len = buffer[i++]
    tsPacket.adaptationFieldInfo.transportPrivateData = buffer.subarray(i, i + len)
    i += len
  }
  if (tsPacket.adaptationFieldInfo.adaptationFieldExtensionFlag) {
    const len = buffer[i++]
    tsPacket.adaptationFieldInfo.extension = buffer.subarray(i, i + len)
    i += len
  }
}
