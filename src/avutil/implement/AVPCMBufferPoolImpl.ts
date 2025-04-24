/*
 * libmedia AVPCMBuffer pool implement
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

import { AVPCMBufferPool, AVPCMBufferRef } from '../struct/avpcmbuffer'
import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import * as atomics from 'cheap/thread/atomics'
import * as mutex from 'cheap/thread/mutex'
import { avMallocz } from '../util/mem'

export default class AVPCMBufferPoolImpl implements AVPCMBufferPool {

  private list: List<pointer<AVPCMBufferRef>>

  private mutex: pointer<Mutex>

  constructor(list: List<pointer<AVPCMBufferRef>>, mutex?: pointer<Mutex>) {
    this.list = list
    this.mutex = mutex
  }

  public alloc(): pointer<AVPCMBufferRef> {
    let buffer = this.list.find((buffer) => {
      return atomics.compareExchange(addressof(buffer.refCount), -1, 1) === -1
    })
    if (!buffer) {
      buffer = avMallocz(sizeof(AVPCMBufferRef))

      atomics.store(addressof(buffer.refCount), 1)

      if (defined(ENABLE_THREADS)) {
        assert(this.mutex)
        mutex.lock(this.mutex)
      }

      this.list.push(buffer)

      if (defined(ENABLE_THREADS)) {
        mutex.unlock(this.mutex)
      }
    }

    return buffer
  }
  public release(buffer: pointer<AVPCMBufferRef>): void {
    if (atomics.load(addressof(buffer.refCount)) <= 0) {
      return
    }
    if (atomics.sub(addressof(buffer.refCount), 1) === 1) {
      atomics.store(addressof(buffer.refCount), -1)
    }
  }
}
