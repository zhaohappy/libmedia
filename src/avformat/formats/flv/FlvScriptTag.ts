/*
 * libmedia flv script tag format
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

import IOReader from 'common/io/IOReader'
import IOWriterSync from 'common/io/IOWriterSync'

import * as is from 'common/util/is'
import * as array from 'common/util/array'
import * as object from 'common/util/object'
import concatTypeArray from 'common/function/concatTypeArray'
import * as logger from 'common/util/logger'
import { FlvMetaData } from './type'
import { FlvTag } from './flv'

import * as flv from './oflv'
import * as errorType from 'avutil/error'

export default class FlvScriptTag {

  public onMetaData: Partial<FlvMetaData>

  constructor() {
    this.onMetaData = {
      audiocodecid: 10,
      canSeekToEnd: false,
      width: 0,
      height: 0,
      stereo: true,
      videocodecid: 7
    }
  }

  @deasync
  private async parseObject(ioReader: IOReader, endPos: bigint) {
    const key = await ioReader.readString(await ioReader.readUint16())
    const value = await this.parseValue(ioReader, endPos)
    return {
      key,
      value
    }
  }

  @deasync
  private async parseValue(ioReader: IOReader, endPos: bigint) {
    const type = await ioReader.readUint8()
    let value: any

    switch (type) {
      // double
      case 0:
        value = await ioReader.readDouble()
        break
        // boolean
      case 1:
        value = await ioReader.readUint8() ? true : false
        break
        // string
      case 2:
        value = await ioReader.readString(await ioReader.readUint16())
        break
        // object
      case 3:
        value = {}
        while (ioReader.getPos() < endPos) {
          const { key, value: val } = await this.parseObject(ioReader, endPos)
          value[key] = val
          if (((await ioReader.peekUint24()) & 0x00FFFFFF) === 9) {
            await ioReader.skip(3)
            break
          }
        }
        break
        // ECMA array type (Mixed array)
      case 8:
        value = {}
        // skip ECMAArrayLength(UI32)
        ioReader.skip(4)
        while (ioReader.getPos() < endPos) {
          const { key, value: val } = await this.parseObject(ioReader, endPos)
          value[key] = val
          if (((await ioReader.peekUint24()) & 0x00FFFFFF) === 9) {
            ioReader.skip(3)
            break
          }
        }
        break
        // ScriptDataObjectEnd
      case 9:
        value = null
        break
        // Strict array type
      case 10:
        value = []
        const length = await ioReader.readUint32()
        for (let i = 0; i < length; i++) {
          value.push(await this.parseValue(ioReader, endPos))
        }
        break
        // Date
      case 11:
        const timestamp = await ioReader.readDouble()
        const localTimeOffset = await ioReader.readInt16()
        value = new Date(timestamp + localTimeOffset * 60 * 1000)
        break
        // Long string type
      case 12:
        value = await ioReader.readString(await ioReader.readUint32())
        break
      default:

    }

    return value
  }

  @deasync
  public async read(ioReader: IOReader, size: number) {
    const now = ioReader.getPos()
    const endPos = now + static_cast<int64>(size)
    const key = await this.parseValue(ioReader, endPos)
    const value = await this.parseValue(ioReader, endPos)
    this[key] = value

    const tagSize = Number(ioReader.getPos() - now)
    const prev = await ioReader.readUint32()

    if (tagSize + 11 !== prev) {
      logger.warn(`script size not match, size: ${tagSize + 11}, previousTagSize: ${prev}`)

      return errorType.DATA_INVALID
    }

    return 0
  }

  private writeValue(ioWriter: IOWriterSync, value: any) {
    // double
    if (is.number(value)) {
      ioWriter.writeUint8(0)
      ioWriter.writeDouble(value)
    }
    else if (is.bigint(value)) {
      ioWriter.writeUint8(0)
      ioWriter.writeDouble(Number(value))
    }
    // boolean
    else if (is.boolean(value)) {
      ioWriter.writeUint8(1)
      ioWriter.writeUint8(value ? 1 : 0)
    }
    // string
    else if (is.string(value)) {
      // long string
      if (value.length >= 65536) {
        ioWriter.writeUint8(12)
        ioWriter.writeUint32(value.length)
        ioWriter.writeString(value)
      }
      // string
      else {
        ioWriter.writeUint8(2)
        ioWriter.writeUint16(value.length)
        ioWriter.writeString(value)
      }
    }
    // array type
    else if (is.array(value)) {
      ioWriter.writeUint8(10)
      ioWriter.writeUint32(value.length)
      array.each(value, (value) => {
        this.writeValue(ioWriter, value)
      })
    }
    // object
    else if (is.object(value)) {
      ioWriter.writeUint8(3)
      object.each(value, (item, key) => {
        ioWriter.writeUint16(key.length)
        ioWriter.writeString(key)
        this.writeValue(ioWriter, item)
      })
      // object end flag
      ioWriter.writeUint24(9)
    }
    else if (value instanceof Date) {
      ioWriter.writeUint8(11)
      ioWriter.writeDouble(value.getTime())
      ioWriter.writeInt16(0)
    }
  }
  public computeSize() {
    const cache = []
    const cacheWriter = new IOWriterSync()
    cacheWriter.onFlush = (data) => {
      cache.push(data.slice())
      return 0
    }
    this.writeValue(cacheWriter, 'onMetaData')
    this.writeValue(cacheWriter, this.onMetaData)

    cacheWriter.flush()

    const buffer = concatTypeArray(Uint8Array, cache)

    return buffer.length
  }

  public write(ioWriter: IOWriterSync) {
    if (this.onMetaData) {
      const cache = []
      const cacheWriter = new IOWriterSync()
      cacheWriter.onFlush = (data) => {
        cache.push(data.slice())
        return 0
      }

      this.writeValue(cacheWriter, 'onMetaData')
      this.writeValue(cacheWriter, this.onMetaData)

      cacheWriter.flush()

      const buffer = concatTypeArray(Uint8Array, cache)

      const now = ioWriter.getPos()

      // tag header
      flv.writeTagHeader(ioWriter, FlvTag.SCRIPT, buffer.length, 0n)

      // tag body
      ioWriter.writeBuffer(buffer)

      // previousTagSize
      ioWriter.writeUint32(Number(ioWriter.getPos() - now))
    }
  }

  public dts2Position(dts: number) {
    if (this.canSeek()) {
      let index = -1
      const times = this.onMetaData.keyframes.times
      const position = this.onMetaData.keyframes.filepositions

      let i: number
      for (i = 0; i < times.length; i++) {
        if (times[i] === dts) {
          index = i
          break
        }
        else if (times[i] > dts) {
          index = Math.max(i - 1, 0)
          break
        }
      }
      if (i && i === times.length) {
        index = times.length - 1
      }
      return {
        pos: position[index],
        dts: times[index]
      }
    }

    return {
      pos: -1,
      dts: -1
    }
  }

  public position2DTS(pos: number) {
    if (this.canSeek()) {
      let index = -1
      const times = this.onMetaData.keyframes.times
      const position = this.onMetaData.keyframes.filepositions
      let i = 0
      for (i = 0; i < position.length; i++) {
        if (position[i] > pos) {
          index = i
          break
        }
      }
      if (i === position.length) {
        return this.onMetaData.duration ?? times[times.length - 1]
      }
      return times[index]
    }
    return -1
  }

  public canSeek(): boolean {
    return !!(this.onMetaData.keyframes
      && this.onMetaData.keyframes.filepositions
      && this.onMetaData.keyframes.filepositions.length)
  }
}
