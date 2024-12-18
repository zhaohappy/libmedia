/*
 * libmedia NaluReader
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
import * as nalu from 'avutil/util/nalu'
import concatTypeArray from 'common/function/concatTypeArray'

export default class NaluReader {

  private buffer: Uint8Array
  private pos: int32
  private end: int32
  private ended: boolean

  constructor() {
    this.buffer = new Uint8Array(100 * 1024)
    this.pos = 0
    this.end = 0
    this.ended = false
  }

  public async read(ioReader: IOReader) {
    if (this.ended && this.pos >= this.end) {
      return
    }

    const slices: Uint8Array[] = []

    if (this.pos < this.end - 4) {
      let next = nalu.getNextNaluStart(this.buffer.subarray(this.pos, this.end - 4), 3)
      if (next.offset > -1) {
        const nalu = this.buffer.slice(this.pos, this.pos + next.offset)
        this.pos += next.offset
        return nalu
      }
      else {
        slices.push(this.buffer.slice(this.pos, this.end - 4))
        this.buffer.copyWithin(0, this.end - 4, this.end)
        this.pos = 0
        this.end = 4
      }
    }

    while (true) {
      if (!this.ended && this.end < this.buffer.length) {
        try {
          const len = await ioReader.readToBuffer(this.buffer.length - this.end, this.buffer.subarray(this.end))
          this.end += len
        }
        catch (error) {
          this.ended = true
          if (this.pos >= this.end) {
            return slices.length ? concatTypeArray(Uint8Array, slices) : null
          }
        }
      }

      let next = nalu.getNextNaluStart(this.buffer.subarray(this.pos, this.end - 4), slices.length ? 0 : 3)

      if (next.offset > -1) {
        slices.push(this.buffer.slice(this.pos, this.pos + next.offset))
        this.pos += next.offset
        return concatTypeArray(Uint8Array, slices)
      }
      else {
        if (this.ended) {
          slices.push(this.buffer.slice(this.pos, this.end))
          this.pos = this.end = 0
          return concatTypeArray(Uint8Array, slices)
        }
        else {
          slices.push(this.buffer.slice(this.pos, this.end - 4))
          this.buffer.copyWithin(0, this.end - 4, this.end)
          this.pos = 0
          this.end = 4
        }
      }
    }
  }

  public reset() {
    this.pos = 0
    this.end = 0
    this.ended = false
  }
}
