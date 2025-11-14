/*
 * libmedia mp4 ipma box parser
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

  const version = await ioReader.readUint8()
  await ioReader.readUint24()

  if (version > 1) {
    logger.error(`Unknown iref box version ${version}`)
  }
  else {
    let total = atom.size - 4
    while (total) {
      const size = await ioReader.readUint32()
      const type = await ioReader.readString(4)
      const now = ioReader.getPos()
      if (type === 'dimg') {
        let fromItemId = version ? await ioReader.readUint32() : await ioReader.readUint16()
        const item = isobmffContext.heif.items?.find((item) => item.id === fromItemId)
        if (item
          && (item.type === 'grid' || item.type === 'iovl')
        ) {
          const entries = await ioReader.readUint16()
          let tileIdList: number[] = []
          for (let i = 0; i < entries; i++) {
            tileIdList.push(version ? await ioReader.readUint32() : await ioReader.readUint16())
          }
          if (!isobmffContext.heif.grid) {
            isobmffContext.heif.grid = []
          }
          isobmffContext.heif.grid.push({
            item,
            tileIdList
          })
        }
      }
      else if (type === 'thmb' || type === 'cdsc') {
        let fromItemId = version ? await ioReader.readUint32() : await ioReader.readUint16()
        let entries = await ioReader.readUint16()
        if (entries > 1) {
          logger.error('thmb in iref referencing several items')
        }
        else {
          let toItemId = version ? await ioReader.readUint32() : await ioReader.readUint16()
          const item = isobmffContext.heif.items?.find((item) => item.id === toItemId)
          if (item) {
            if (!item.refs) {
              item.refs = {}
            }
            item.refs[type] = fromItemId
          }
        }
      }
      else {
        await ioReader.skip(size - 8)
      }
      let remaining = size - 8 - Number(ioReader.getPos() - now)
      if (remaining) {
        await ioReader.skip(remaining)
      }
      total -= size
    }
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read ipma error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
