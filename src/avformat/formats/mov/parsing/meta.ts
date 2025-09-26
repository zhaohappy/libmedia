/*
 * libmedia mp4 meta box parser
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
import * as is from 'common/util/is'
import { iTunesKeyMap } from '../iTunes'
import digital2Tag from '../../../function/digital2Tag'
import type { Data } from 'common/types/type'

export async function readITunesTagValue(ioReader: IOReader, tagSize: int32) {
  const data: (string | Uint8Array | number)[] = []

  if ((await ioReader.peekUint16()) + 4 === tagSize) {
    let len = await ioReader.readUint16()
    // lang
    await ioReader.skip(2)
    data.push(await ioReader.readString(len))
    tagSize -= (len + 4)
  }
  else {
    while (tagSize > 16) {
      let dataSize = await ioReader.readUint32()

      tagSize -= dataSize

      // data
      await ioReader.skip(4)
      const dateType = await ioReader.readUint32()
      await ioReader.skip(4)

      dataSize -= 16

      if (dateType === 21) {
        switch (dataSize) {
          case 1:
            if (dataSize >= 1) {
              data.push(await ioReader.readInt8())
              dataSize--
            }
            break
          case 2:
            if (dataSize >= 2) {
              data.push(await ioReader.readInt16())
              dataSize -= 2
            }
            break
          case 3:
            if (dataSize >= 3) {
              data.push(await ioReader.readInt24())
              dataSize -= 3
            }
            break
          case 4:
            if (dataSize >= 4) {
              data.push(await ioReader.readInt32())
              dataSize -= 4
            }
            break
        }
      }
      else if (dateType === 22) {
        switch (dataSize) {
          case 1:
            if (dataSize >= 1) {
              data.push(await ioReader.readUint8())
              dataSize--
            }
            break
          case 2:
            if (dataSize >= 2) {
              data.push(await ioReader.readUint16())
              dataSize -= 2
            }
            break
          case 3:
            if (dataSize >= 3) {
              data.push(await ioReader.readUint24())
              dataSize -= 3
            }
            break
          case 4:
            if (dataSize >= 4) {
              data.push(await ioReader.readUint32())
              dataSize -= 4
            }
            break
        }
      }
      else if (dateType === 23 && dataSize >= 4) {
        data.push(await ioReader.readFloat())
        dataSize -= 4
      }
      else if (dateType === 1) {
        data.push(await ioReader.readString(dataSize))
        dataSize = 0
      }
      else {
        data.push(await ioReader.readBuffer(dataSize))
        dataSize = 0
      }

      if (dataSize) {
        await ioReader.skip(dataSize)
      }
    }
  }

  if (tagSize) {
    await ioReader.skip(tagSize)
  }
  return data
}

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  let size = atom.size

  if (size > 12) {
    if (['hdlr', 'mhdr', 'keys', 'ilst', 'ctry', 'lang'].indexOf((await ioReader.peekString(12)).substring(8)) >= 0) {
      // full box(flags version)
      await ioReader.skip(4)
      size -= 4
    }
  }

  // key index 从 1 开始
  let keys: string[] = ['']
  let handler: string
  let tags: {
    key: string | number
    value: string | Uint8Array | number | (string | Uint8Array | number)[]
  }[] = []

  while (size >= 8) {
    let itemSize = await ioReader.readUint32()
    const type = await ioReader.readString(4)

    let itemSize_ = itemSize

    itemSize -= 8

    if (type === 'keys') {
      await ioReader.skip(4)
      const count = await ioReader.readUint32()
      itemSize -= 8
      for (let i = 0; i < count; i++) {
        const len = await ioReader.readUint32()
        await ioReader.skip(4)
        keys.push(await ioReader.readString(len - 8))
        itemSize -= len
      }
    }
    else if (type === 'hdlr') {
      if (itemSize >= 12) {
        await ioReader.skip(8)
        handler = await ioReader.readString(4)
        itemSize -= 12
      }
    }
    else if (type === 'ilst') {
      while (itemSize > 8) {
        let tagSize = await ioReader.readUint32()
        let tagKey: string | number = await ioReader.readUint32()
        if (handler !== 'mdta') {
          tagKey = digital2Tag(tagKey, 4)
        }

        const data = await readITunesTagValue(ioReader, tagSize - 8)

        if (data.length) {
          tags.push({
            key: tagKey,
            value: data.length === 1 ? data[0] : data
          })
        }

        itemSize -= tagSize
      }
    }
    else {
      if (itemSize < size - 8) {
        await ioReader.skip(itemSize)
        itemSize = 0
      }
      else {
        break
      }
    }
    if (itemSize) {
      await ioReader.skip(itemSize)
    }

    size -= itemSize_
  }

  let metadata: Data

  if (stream) {
    metadata = stream.metadata
  }
  else {
    if (!movContext.metadata) {
      movContext.metadata = {}
    }
    metadata = movContext.metadata
  }

  tags.forEach((tag) => {
    let key = tag.key
    if (is.number(key)) {
      if (keys[key]) {
        key = keys[key]
      }
    }
    else {
      if (iTunesKeyMap[key]) {
        key = iTunesKeyMap[key]
      }
    }
    metadata[key] = tag.value
  })

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read meta error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
