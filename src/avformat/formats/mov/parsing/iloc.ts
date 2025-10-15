/*
 * libmedia mp4 iloc box parser
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

import type IOReader from 'common/io/IOReader'
import type Stream from 'avutil/AVStream'
import type { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {
  const now = ioReader.getPos()

  if (movContext.heif.foundIloc) {
    logger.warn('Duplicate iloc box found')
  }
  else {
    movContext.heif.foundIloc = true
    const version = await ioReader.readUint8()
    // flags
    await ioReader.skip(3)
    let value = await ioReader.readUint8()
    let offsetSize = (value >> 4) & 0xF
    let lengthSize = value & 0xF

    value = await ioReader.readUint8()
    let baseOffsetSize = (value >> 4) & 0xF
    let indexSize = !version ? 0 : (value & 0xF)

    let itemCount = (version < 2) ? await ioReader.readUint16() : await ioReader.readUint32()

    if (!movContext.heif.items) {
      movContext.heif.items = []
    }
    end: for (let i = 0; i < itemCount; i++) {
      let itemId = (version < 2) ? await ioReader.readUint16() : await ioReader.readUint32()
      let offsetType = (version > 0) ? (await ioReader.readUint16()) & 0xf : 0
      if (offsetType > 1) {
        logger.warn(`iloc offset type ${offsetType}`)
      }
      // data_reference_index.
      await ioReader.readUint16()
      let baseOffset = baseOffsetSize > 0 ? await ioReader['readUint' + baseOffsetSize * 8]() : 0
      let extentCount = await ioReader.readUint16()
      if (extentCount > 1) {
        logger.error('iloc: extent_count > 1')
        movContext.heif.foundIloc = false
        break end
      }
      let index = 0
      let size = 0
      let offset = 0
      for (let j = 0; j < extentCount; j++) {
        if (indexSize > 0) {
          index = await ioReader['readUint' + indexSize * 8]()
        }
        offset = offsetSize > 0 ? await ioReader['readUint' + offsetSize * 8]() : 0
        size = lengthSize > 0 ? await ioReader['readUint' + lengthSize * 8]() : 0
      }
      const item = movContext.heif.items.find((item) => item.id === itemId)
      if (item) {
        item.isIdatRelative = offsetType === 1
        item.extentOffset = baseOffset + offset
        item.extentIndex = index
        item.extentLength = size
      }
      else {
        movContext.heif.items.push({
          id: itemId,
          isIdatRelative: offsetType === 1,
          extentOffset: baseOffset + offset,
          extentIndex: index,
          extentLength: size
        })
      }
    }
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read iloc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
