/*
 * libmedia AVPacket pool implement
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

import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import * as atomics from 'cheap/thread/atomics'
import * as mutex from 'cheap/thread/mutex'
import { avMallocz } from '../util/mem'
import { AVPacketPool, AVPacketRef } from '../struct/avpacket'
import { getAVPacketDefault, unrefAVPacket } from '../util/avpacket'

export default class AVPacketPoolImpl implements AVPacketPool {

  private list: List<pointer<AVPacketRef>>

  private mutex: pointer<Mutex>

  constructor(list: List<pointer<AVPacketRef>>, mutex?: pointer<Mutex>) {
    this.list = list
    this.mutex = mutex
  }

  public alloc(): pointer<AVPacketRef> {
    let avpacket = this.list.find((avpacket) => {
      return atomics.compareExchange(addressof(avpacket.refCount), -1, 1) === -1
    })
    if (!avpacket) {
      avpacket = avMallocz(sizeof(AVPacketRef))
      getAVPacketDefault(avpacket)

      atomics.store(addressof(avpacket.refCount), 1)

      if (defined(ENABLE_THREADS)) {
        assert(this.mutex)
        mutex.lock(this.mutex)
      }

      this.list.push(avpacket)

      if (defined(ENABLE_THREADS)) {
        mutex.unlock(this.mutex)
      }
    }

    return avpacket
  }
  public release(avpacket: pointer<AVPacketRef>): void {
    if (atomics.load(addressof(avpacket.refCount)) <= 0) {
      return
    }
    if (atomics.sub(addressof(avpacket.refCount), 1) === 1) {
      unrefAVPacket(avpacket)
      atomics.store(addressof(avpacket.refCount), -1)
    }
  }
}
