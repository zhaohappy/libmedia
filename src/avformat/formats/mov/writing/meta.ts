/*
 * libmedia mp4 meta box write
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

import type Stream from 'avutil/AVStream'
import type { MOVContext } from '../type'
import type IOWriter from 'common/io/IOWriterSync'
import { BoxType } from '../boxType'
import { AVStreamMetadataKey } from 'avutil/AVStream'
import * as is from 'common/util/is'
import { iTunesKeyMap } from '../iTunes'
import * as object from 'common/util/object'
import mktag from '../../../function/mktag'
import * as text from 'common/util/text'

export default function write(ioWriter: IOWriter, stream: Stream, movContext: MOVContext) {

  const pos = ioWriter.getPos()

  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.META)

  // flags + version
  ioWriter.writeUint32(0)

  ioWriter.writeUint32(33)
  ioWriter.writeString(BoxType.HDLR)
  ioWriter.writeUint32(0)
  ioWriter.writeString('dhlr')
  ioWriter.writeString(movContext.useMetadataTags ? 'mdta' : 'mdir')
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(0)
  ioWriter.writeUint8(0)

  let keys: string[] = []
  let tags: {
    key: number
    value: string | Uint8Array | number
  }[] = []

  const iTunesKeyMapRevert = object.reverse(iTunesKeyMap)

  function getKey(key: string) {
    if (movContext.useMetadataTags) {
      keys.push(key)
      return keys.length
    }
    else {
      if (iTunesKeyMapRevert[key] || key.length === 4) {
        return mktag(iTunesKeyMapRevert[key] || key)
      }
    }
  }

  tags.push({
    key: getKey(AVStreamMetadataKey.ENCODER),
    value: `libmedia-${defined(VERSION)}`
  })

  if (movContext.metadata) {
    object.each(movContext.metadata, (value, key) => {
      if ((is.string(value) || is.number(value) || value instanceof Uint8Array)
        && key.toLocaleLowerCase() !== AVStreamMetadataKey.ENCODER
      ) {
        let keyValue = getKey(key)
        if (keyValue) {
          tags.push({
            key: keyValue,
            value
          })
        }
      }
    })
  }

  if (keys.length) {
    ioWriter.writeUint32(16 + keys.reduce((prev, current) => {
      return prev + (8 + current.length)
    }, 0))
    ioWriter.writeString('keys')
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(keys.length)

    keys.forEach((key) => {
      ioWriter.writeUint32(key.length + 8)
      ioWriter.writeString('mdta')
      ioWriter.writeString(key)
    })
  }

  if (tags.length) {
    const pos = ioWriter.getPos()

    ioWriter.writeUint32(0)
    ioWriter.writeString('ilst')

    tags.forEach((tag) => {
      let dataType = 0
      let dataSize = 0
      let dataBuffer: Uint8Array
      if (is.number(tag.value)) {
        if (Math.trunc(tag.value) === tag.value) {
          if (tag.value < 0) {
            dataType = 21
          }
          else {
            dataType = 22
          }
        }
        else {
          dataType = 23
        }
        dataSize = 4
      }
      else if (tag.value instanceof Uint8Array) {
        dataType = 0
        dataSize = tag.value.length
      }
      else if (is.string(tag.value)) {
        dataType = 1
        dataBuffer = text.encode(tag.value)
        dataSize = dataBuffer.length
      }
      else {
        return
      }

      ioWriter.writeUint32(24 + dataSize)
      ioWriter.writeUint32(tag.key)

      // data
      ioWriter.writeUint32(16 + dataSize)
      ioWriter.writeString('data')
      ioWriter.writeUint32(dataType)
      ioWriter.writeUint32(0)

      if (dataType === 0) {
        ioWriter.writeBuffer(tag.value as Uint8Array)
      }
      else if (dataType === 1) {
        ioWriter.writeBuffer(dataBuffer)
      }
      else if (dataType === 21) {
        ioWriter.writeInt32(tag.value as number)
      }
      else if (dataType === 22) {
        ioWriter.writeUint32(tag.value as number)
      }
      else if (dataType === 23) {
        ioWriter.writeFloat(tag.value as number)
      }

    })

    movContext.boxsPositionInfo.push({
      pos,
      type: 'ilst' as BoxType,
      size: Number(ioWriter.getPos() - pos)
    })
  }

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.META,
    size: Number(ioWriter.getPos() - pos)
  })
}
