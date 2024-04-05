/*
 * libmedia AVBuffer defined
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

import { avFree } from '../util/mem'
import { Mutex } from 'cheap/thread/mutex'

export const enum AVBufferFlags {
  NONE = 0,
  READONLY = 1 << 0
}

@struct
export class AVBuffer {
  /**
   * data described by this buffer
   */
  data: pointer<uint8> = nullptr

  /**
   * size of data in bytes
   */
  size: size = 0

  /**
   *  number of existing AVBufferRef instances referring to this buffer
   */
  refcount: atomic_uint32 = 0

  /**
   * a callback for freeing the data
   */
  free: pointer<(opaque: pointer<void>, data: pointer<uint8>) => void> = nullptr

  /**
   * an opaque pointer, to be used by the freeing callback
   */
  opaque: pointer<void> = nullptr

  /**
   * A combination of AV_BUFFER_FLAG_*
   */
  flags: AVBufferFlags = AVBufferFlags.NONE

  /**
   * A combination of BUFFER_FLAG_*
   */
  flagsInternal: int32 = 0
}

function avbufferDefaultFree(opaque: pointer<void>, data: pointer<uint8>) {
  avFree(data)
}

@struct
export class AVBufferRef {
  buffer: pointer<AVBuffer> = nullptr

  /**
   * The data buffer. It is considered writable if and only if
   * this is the only reference to the buffer, in which case
   * av_buffer_is_writable() returns 1.
   */
  data: pointer<uint8> = nullptr

  /**
   * Size of data in bytes.
   */
  size: size = 0
}

@struct
export class AVBufferPool {
  mutex: Mutex

  pool: pointer<BufferPoolEntry> = nullptr

  /**
   *  number of existing AVBufferRef instances referring to this buffer
   */
  refcount: atomic_uint32 = 0

  /**
   * Size of data in bytes.
   */
  size: size = 0

  /**
   * an opaque pointer, to be used by the freeing callback
   */
  opaque: pointer<void> = nullptr
  alloc: pointer<(size: size) => AVBufferRef> = nullptr
  alloc2: pointer<(opaque: pointer<void>, size: size) => AVBufferRef> = nullptr
  poolFree: pointer<(opaque: pointer<void>) => void> = nullptr
}

@struct
export class BufferPoolEntry {
  data: pointer<uint8> = nullptr
  /**
   * an opaque pointer, to be used by the freeing callback
   */
  opaque: pointer<void> = nullptr

  /**
   * a callback for freeing the data
   */
  free: pointer<(opaque: pointer<void>, data: pointer<uint8>) => void> = nullptr

  pool: pointer<AVBufferPool> = nullptr

  next: pointer<BufferPoolEntry> = nullptr
  /*
   * An AVBuffer structure to (re)use as AVBuffer for subsequent uses
   * of this BufferPoolEntry.
   */
  buffer: AVBuffer
}
