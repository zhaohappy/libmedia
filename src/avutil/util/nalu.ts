/*
 * libmedia nalu util
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

import StreamReader from 'common/io/StreamReader'
import StreamWriter from 'common/io/StreamWriter'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as array from 'common/util/array'

export function isAnnexb(data: Uint8ArrayInterface) {
  return data.length > 4
  && data[0] === 0
  && data[1] === 0
  && (
    data[2] === 1
    || data[2] === 0 && data[3] === 1
  )
}

function getNextNaluStart(data: Uint8ArrayInterface, offset: number) {
  let t = 0
  for (let i = offset; i < data.length; i++) {
    switch (data[i]) {
      case 0:
        t++
        break
      case 1:
        if (t >= 2) {
          return {
            offset: i - Math.min(t, 3),
            startCode: Math.min(t + 1, 4)
          }
        }
        t = 0
        break
      default:
        t = 0
    }
  }
  return {
    offset: -1,
    startCode: 0
  }
}

export function splitNaluByStartCode<T extends Uint8ArrayInterface>(buffer: T): T[] {
  const list = []
  let offset = 0
  let current = getNextNaluStart(buffer, offset)
  let next = {
    offset: -1,
    startCode: 0
  }
  while (next = getNextNaluStart(buffer, current.offset + current.startCode), next.offset > -1) {
    list.push(buffer.subarray(current.offset + current.startCode, next.offset, true))
    current = next
  }
  list.push(buffer.subarray(current.offset + current.startCode, undefined, true))

  return list
}

export function splitNaluByLength<T extends Uint8ArrayInterface>(buffer: T, naluLengthSizeMinusOne: int32): T[] {
  const list = []
  const streamReader = new StreamReader(buffer)
  while (streamReader.remainingSize() > 0) {
    let length = 0
    if (naluLengthSizeMinusOne === 3) {
      length = streamReader.readUint32()
    }
    else if (naluLengthSizeMinusOne === 2) {
      length = streamReader.readUint24()
    }
    else if (naluLengthSizeMinusOne === 1) {
      length = streamReader.readUint16()
    }
    else {
      length = streamReader.readUint8()
    }
    const nalu = buffer.subarray(streamReader.getPos(), streamReader.getPos() + length, true)
    streamReader.skip(length)
    list.push(nalu)
  }
  return list
}

export function joinNaluByStartCode(nalus: Uint8ArrayInterface[], output?: Uint8Array, slice: boolean = false): Uint8Array {
  if (!output) {
    let length = nalus.reduce((prev, nalu, index) => {
      return prev + ((index && slice) ? 3 : 4) + nalu.length
    }, 0)
    output = new Uint8Array(length)
  }

  const streamWriter = new StreamWriter(output)

  array.each(nalus, (nalu, index) => {
    streamWriter.writeUint8(0x00)
    streamWriter.writeUint8(0x00)
    if (!index && slice) {
      streamWriter.writeUint8(0x00)
    }
    streamWriter.writeUint8(0x01)
    streamWriter.writeBuffer(nalu)
  })

  return output
}

export function joinNaluByLength(nalus: Uint8Array[], naluLengthSizeMinusOne: int32, output?: Uint8Array): Uint8Array {
  if (!output) {
    const length = nalus.reduce((prev, nalu) => {
      return prev + naluLengthSizeMinusOne + 1 + nalu.length
    }, 0)
    output = new Uint8Array(length)
  }
  const streamWriter = new StreamWriter(output)

  array.each(nalus, (nalu) => {
    if (naluLengthSizeMinusOne === 3) {
      streamWriter.writeUint32(nalu.length)
    }
    else if (naluLengthSizeMinusOne === 2) {
      streamWriter.writeUint24(nalu.length)
    }
    else if (naluLengthSizeMinusOne === 1) {
      streamWriter.writeUint16(nalu.length)
    }
    else {
      streamWriter.writeUint8(nalu.length)
    }
    streamWriter.writeBuffer(nalu)
  })
  return output
}

export function naluUnescape(data: Uint8Array, start = 0, end?: number) {

  if (!end) {
    end = data.length
  }

  const buffer = new Uint8Array(data.length)

  let zeroCount = 0
  let pos = 0
  for (let i = 0; i < data.length; i++) {
    if (i >= start && i < end) {
      if (data[i] === 0) {
        zeroCount++
      }
      else {
        if (data[i] === 3 && zeroCount === 2 && i + 1 < data.length && data[i + 1] <= 3) {
          i++
          if (i === data.length) {
            break
          }
          else {
            if (data[i] === 0) {
              zeroCount = 1
            }
            else {
              zeroCount = 0
            }
          }
        }
        else {
          zeroCount = 0
        }
      }
    }
    buffer[pos++] = data[i]
  }

  return buffer.slice(0, pos)
}

export function naluEscape(data: Uint8Array, start: number = 0, end?: number) {
  if (!end) {
    end = data.length
  }

  const indexes = []
  let zeroCount = 0
  for (let i = start; i < end; i++) {

    if (i >= end) {
      break
    }

    if (data[i] === 0) {
      zeroCount++
    }
    else {
      if (data[i] <= 3 && zeroCount === 2) {
        indexes.push(i)
      }
      zeroCount = 0
    }
  }

  if (indexes.length) {
    const buffer = new Uint8Array(data.length + indexes.length)
    let pos = 0
    let subData = data.subarray(0, indexes[0])
    buffer.set(subData, pos)
    pos += subData.length

    buffer[pos++] = 3

    for (let i = 1; i < indexes.length; i++) {
      subData = data.subarray(indexes[i - 1], indexes[i])
      buffer.set(subData, pos)
      pos += subData.length
      buffer[pos++] = 3
    }

    subData = data.subarray(indexes[indexes.length - 1], data.length)
    buffer.set(subData, pos)
    pos += subData.length

    return buffer
  }
  else {
    return data
  }
}
