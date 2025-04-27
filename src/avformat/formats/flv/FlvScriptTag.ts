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

import concatTypeArray from 'common/function/concatTypeArray'
import * as logger from 'common/util/logger'
import { FlvMetaData } from './type'
import { FlvTag } from './flv'

import * as flv from './oflv'
import * as errorType from 'avutil/error'
import { parseValue, writeValue } from 'avutil/util/amf'

export default class FlvScriptTag {

  public onMetaData: Partial<FlvMetaData>

  constructor() {
    this.onMetaData = {
      canSeekToEnd: false
    }
  }

  public async read(ioReader: IOReader, size: number) {
    const now = ioReader.getPos()
    const endPos = now + static_cast<int64>(size)
    const key = await parseValue(ioReader, endPos)
    const value = await parseValue(ioReader, endPos)
    this[key] = value

    if (endPos > ioReader.getPos()) {
      await ioReader.skip(static_cast<int32>(endPos - ioReader.getPos()))
    }

    const tagSize = Number(ioReader.getPos() - now)
    const prev = await ioReader.readUint32()

    if (tagSize + 11 !== prev) {
      logger.warn(`script size not match, size: ${tagSize + 11}, previousTagSize: ${prev}`)

      return errorType.DATA_INVALID
    }

    return 0
  }

  public computeSize() {
    const cache = []
    const cacheWriter = new IOWriterSync()
    cacheWriter.onFlush = (data) => {
      cache.push(data.slice())
      return 0
    }
    writeValue(cacheWriter, 'onMetaData')
    writeValue(cacheWriter, this.onMetaData)

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

      writeValue(cacheWriter, 'onMetaData')
      writeValue(cacheWriter, this.onMetaData)

      cacheWriter.flush()

      const buffer = concatTypeArray(Uint8Array, cache)
      flv.writeTag(ioWriter, FlvTag.SCRIPT, 0n, undefined, buffer)
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
