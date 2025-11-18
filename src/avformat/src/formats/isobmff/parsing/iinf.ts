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

import type { Atom, IsobmffContext } from '../type'
import { logger } from '@libmedia/common'
import { type IOReader } from '@libmedia/common/io'
import { type AVStream } from '@libmedia/avutil'

export default async function read(ioReader: IOReader, stream: AVStream, atom: Atom, isobmffContext: IsobmffContext) {
  const now = ioReader.getPos()

  if (isobmffContext.heif.foundIinf) {
    logger.warn('Duplicate iinf box found')
  }
  else {
    isobmffContext.heif.foundIinf = true

    const version = await ioReader.readUint8()
    await ioReader.skip(3)
    let entryCount = version ? await ioReader.readUint32() : await ioReader.readUint16()

    if (!isobmffContext.heif.items) {
      isobmffContext.heif.items = []
    }

    end: for (let i = 0; i < entryCount; i++) {
      let size = await ioReader.readUint32()
      const tag = await ioReader.readString(4)

      size -= 8
      if (tag === 'infe') {
        const version = await ioReader.readUint8()
        await ioReader.skip(3)
        size -= 4

        if (version < 2) {
          logger.error('infe version < 2')
          isobmffContext.heif.foundIinf = false
          break end
        }

        let itemId = version > 2 ? await ioReader.readUint32() : await ioReader.readUint16()

        size -= version > 2 ? 4 : 2
        // item_protection_index
        await ioReader.readUint16()
        let itemType = await ioReader.readString(4)

        size -= 6

        let name = ''
        if (size > 0) {
          name = await ioReader.readString(size)
          if (name.charCodeAt(name.length - 1) === 0) {
            name = name.substring(0, name.length - 1)
          }
        }
        const item = isobmffContext.heif.items.find((item) => item.id === itemId)
        if (item) {
          item.name = name
          item.type = itemType
        }
        else {
          isobmffContext.heif.items.push({
            id: itemId,
            name,
            type: itemType
          })
        }
      }
      else {
        await ioReader.skip(size - 8)
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
