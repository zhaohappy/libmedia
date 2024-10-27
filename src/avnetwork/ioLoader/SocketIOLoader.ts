/*
 * libmedia abstract socket loader
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

import { Uint8ArrayInterface } from 'common/io/interface'
import IOLoader, { IOLoaderOptions, IOLoaderStatus } from './IOLoader'
import { IOError } from 'common/io/error'
import { Data } from 'common/types/type'

export default abstract class SocketIOLoader extends IOLoader {
  protected readQueue: Uint8Array[]

  protected consume: (value: void | PromiseLike<void>) => void

  constructor(options: IOLoaderOptions = {}) {
    super(options)
    this.readQueue = []
  }

  public abstract send(buffer: Uint8ArrayInterface): Promise<int32>
  public abstract open(info: Data): Promise<int32>

  private async readInterval(buffer: Uint8ArrayInterface, preLen: int32 = 0): Promise<number> {
    let pos = 0
    while (this.readQueue.length && pos < buffer.length) {
      const cache = this.readQueue.shift()
      if (cache.length > buffer.length - pos) {
        buffer.set(cache.subarray(0, buffer.length - pos), pos)
        this.readQueue.unshift(cache.subarray(buffer.length - pos))
        pos = buffer.length
      }
      else {
        buffer.set(cache, pos)
        pos += cache.length
      }
    }

    if (pos > 0 || preLen) {
      return pos + preLen
    }

    if (this.status === IOLoaderStatus.COMPLETE || this.status === IOLoaderStatus.IDLE) {
      return pos > 0 ? (pos + preLen) : (preLen > 0 ? preLen : IOError.END)
    }

    if (this.status === IOLoaderStatus.ERROR) {
      return pos > 0 ? (pos + preLen) : (preLen > 0 ? preLen : IOError.NETWORK_ERROR)
    }

    await new Promise<void>((resolve) => {
      this.consume = resolve
    })

    this.consume = null

    return this.readInterval(buffer, preLen)
  }

  public async read(buffer: Uint8ArrayInterface) {
    return this.readInterval(buffer)
  }

  public async write(buffer: Uint8ArrayInterface): Promise<int32> {
    return this.send(buffer)
  }
}
