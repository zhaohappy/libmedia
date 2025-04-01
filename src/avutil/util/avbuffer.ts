/*
 * libmedia avbuffer util
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

import { avFree, avFreep, avMalloc, avMallocz, avRealloc } from './mem'
import * as atomics from 'cheap/thread/atomics'
import { memcpy, memset } from 'cheap/std/memory'
import { AVBuffer, AVBufferPool, AVBufferRef, AVBufferFlags, BufferPoolEntry } from '../struct/avbuffer'
import * as mutex from 'cheap/thread/mutex'
import * as stack from 'cheap/stack'

const BUFFER_FLAG_REALLOCATABLE = 1

const enum BufferFlags {
  BUFFER_FLAG_REALLOCATABLE = 1,
  BUFFER_FLAG_NO_FREE = 2
}

export function bufferCreate(
  buf: pointer<AVBuffer>,
  data: pointer<uint8>,
  size: size,
  free: pointer<(opaque: pointer<void>, data: pointer<uint8>) => void> = nullptr,
  opaque: pointer<void> = nullptr,
  flags: int32 = 0
): pointer<AVBufferRef> {
  buf.data = data
  buf.size = size
  buf.free = free
  buf.opaque = opaque

  atomics.store(addressof(buf.refcount), 1)
  buf.flags = flags

  const ref = avMallocz(sizeof(AVBufferRef)) as pointer<AVBufferRef>

  if (!ref) {
    return nullptr
  }

  ref.buffer = buf
  ref.data = data
  ref.size = size
  return ref
}

export function avbufferCreate(
  data: pointer<uint8>,
  size: size,
  free: pointer<(opaque: pointer<void>, data: pointer<uint8>) => void> = nullptr,
  opaque: pointer<void> = nullptr,
  flags: int32 = 0
): pointer<AVBufferRef> {
  const buf = avMallocz(sizeof(AVBuffer)) as pointer<AVBuffer>
  if (!buf) {
    return nullptr
  }

  const ref = bufferCreate(buf, data, size, free, opaque, flags)

  if (!ref) {
    avFree(buf)
    return nullptr
  }

  return ref
}

export function avbufferAlloc(size: size) {
  const data = reinterpret_cast<pointer<uint8>>(avMalloc(size))
  return avbufferCreate(data, size)
}

export function avbufferAllocz(size: size) {
  const p = avbufferAlloc(size)
  memset(p.data, 0, size)
  return p
}

export function avbufferRef(buf: pointer<AVBufferRef>) {
  const ref: pointer<AVBufferRef> = reinterpret_cast<pointer<AVBufferRef>>(avMallocz(sizeof(AVBufferRef)))
  // @ts-ignore
  accessof(ref) <- accessof(buf)
  atomics.add(addressof(buf.buffer.refcount), 1)
  return ref
}

export function bufferReplace(dst: pointer<pointer<AVBufferRef>>, src: pointer<pointer<AVBufferRef>>) {
  const buf = accessof(dst).buffer
  if (src) {
    // @ts-ignore
    accessof(accessof(dst)) <- accessof(accessof(src))
    avFreep(src)
  }
  else {
    avFreep(dst)
  }
  if (atomics.sub(addressof(buf.refcount), 1) === 1) {
    const freeAVBuffer = !(buf.flagsInternal & BufferFlags.BUFFER_FLAG_NO_FREE)
    if (buf.opaque) {
      poolReleaseBuffer(buf.opaque, buf.data)
    }
    else {
      avFree(buf.data)
    }
    if (freeAVBuffer) {
      avFree(buf)
    }
  }
}

export function avbufferUnref(buf: pointer<pointer<AVBufferRef>>) {
  if (!buf || !accessof(buf)) {
    return
  }
  bufferReplace(buf, nullptr)
}

export function avbufferIsWritable(buf: pointer<AVBufferRef>) {
  if (buf.buffer.flags & AVBufferFlags.READONLY) {
    return 0
  }
  return atomics.load(addressof(buf.buffer.refcount)) === 1 ? 1 : 0
}

export function avbufferGetOpaque(buf: pointer<AVBufferRef>) {
  return buf.buffer.opaque
}

export function avbufferGetRefCount(buf: pointer<AVBufferRef>) {
  return atomics.load(addressof(buf.buffer.refcount))
}

export function avbufferMakeWritable(pbuf: pointer<pointer<AVBufferRef>>) {

  const buf = accessof(pbuf)

  if (!buf) {
    return -1
  }

  if (avbufferIsWritable(buf)) {
    return 0
  }

  const newbuf = avbufferAlloc(buf.size)

  memcpy(newbuf.data, buf.data, buf.size)

  let newbufp = reinterpret_cast<pointer<pointer<AVBufferRef>>>(stack.malloc(sizeof(pointer)))
  accessof(newbufp) <- newbuf

  bufferReplace(pbuf, newbufp)

  stack.free(sizeof(pointer))

  return 0
}

export function avbufferReplace(pdst: pointer<pointer<AVBufferRef>>, src: pointer<AVBufferRef>) {
  const dst = accessof(pdst)

  if (!src) {
    avbufferUnref(pdst)
    return 0
  }

  if (dst && dst.data === src.data) {
    dst.data = src.data
    dst.size = src.size
    return 0
  }

  const tmp = avbufferRef(src)

  avbufferUnref(pdst)

  accessof(pdst) <- tmp

  return 0
}

export function avbufferRealloc(pdst: pointer<pointer<AVBufferRef>>, size: size) {
  if (!accessof(pdst)) {
    const data = reinterpret_cast<pointer<uint8>>(avRealloc(nullptr, size))

    const buf = avbufferCreate(data, size)

    accessof(pdst) <- buf

    buf.buffer.flagsInternal |= BUFFER_FLAG_REALLOCATABLE

    return 0
  }

  const ref = accessof(pdst)
  const buf = ref.buffer

  if (ref.size === size) {
    return 0
  }

  if (!(buf.flagsInternal & BUFFER_FLAG_REALLOCATABLE)
    || !avbufferIsWritable(ref)
    || ref.data !== buf.data
  ) {
    let newRef = reinterpret_cast<pointer<pointer<AVBufferRef>>>(stack.malloc(sizeof(pointer)))
    accessof(newRef) <- nullptr

    const ret = avbufferRealloc(newRef, size)
    if (ret < 0) {
      stack.free(sizeof(pointer))
      return ret
    }
    memcpy(accessof(newRef).data, buf.data, Math.min(size, buf.size))

    bufferReplace(pdst, newRef)

    stack.free(sizeof(pointer))
    return 0
  }

  const tmp = reinterpret_cast<pointer<uint8>>(avRealloc(buf.data, size))

  ref.data = buf.data = tmp
  ref.size = buf.size = size

  return 0
}

export function bufferPoolFlush(pool: pointer<AVBufferPool>) {
  while (pool.pool) {
    const buf = reinterpret_cast<pointer<BufferPoolEntry>>(pool.pool)
    pool.pool = buf.next

    if (buf.opaque) {
      poolReleaseBuffer(buf.opaque, buf.data)
    }
    else {
      avFree(buf.data)
    }
    avFree(buf)
  }
}

export function bufferPoolFree(pool: pointer<AVBufferPool>) {
  bufferPoolFlush(pool)

  mutex.destroy(addressof(pool.mutex))

  avFree(pool)
}

export function poolReleaseBuffer(opaque: pointer<void>, data: pointer<void>) {
  const buf = reinterpret_cast<pointer<BufferPoolEntry>>(opaque)
  const pool = buf.pool

  mutex.lock(addressof(pool.mutex))

  buf.next = pool.pool
  pool.pool = buf

  mutex.unlock(addressof(pool.mutex))

  if (atomics.sub(addressof(pool.refcount), 1) === 1) {
    bufferPoolFree(pool)
  }
}
