/*
 * libmedia abstract format decoder
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

/** Bounded random access for optical disc images. All offsets are bytes. */
export class DiscError extends Error {
  constructor(message: string, public code: number = -2) {
    super(message)
  }
}

export class DiscAbortError extends DiscError {
  constructor() {
    super('Disc read cancelled')
    this.name = 'AbortError'
  }
}

export function check(value: unknown, message: string): asserts value {
  if (!value) {
    throw new DiscError(message)
  }
}

export class Bytes {
  private view: DataView
  constructor(public data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }
  range(pos: number, size: number) {
    check(Number.isSafeInteger(pos) && pos >= 0 && size >= 0 && pos + size <= this.data.length, 'Truncated disc metadata')
    return this.data.subarray(pos, pos + size)
  }
  u8(pos: number) {
    return this.range(pos, 1)[0]
  }
  u16(pos: number, le = false) {
    this.range(pos, 2); return this.view.getUint16(pos, le)
  }
  u32(pos: number, le = false) {
    this.range(pos, 4); return this.view.getUint32(pos, le)
  }
  u64(pos: number) {
    this.range(pos, 8); return this.view.getBigUint64(pos, true)
  }
  text(pos: number, size: number) {
    return String.fromCharCode(...this.range(pos, size))
  }
}

export interface Extent { offset: bigint, length: bigint }
export interface DiscFile { size: bigint, extents: Extent[], directory: boolean, inline?: Uint8Array }

export default class DiscReader {
  private cache = new Map<bigint, Uint8Array>()
  private queue: Promise<unknown> = Promise.resolve()
  private generation = 0
  constructor(public size: bigint, private readAt: (pos: bigint, length: number) => Promise<Uint8Array | number>) {
    check(size > 0n && size <= BigInt(Number.MAX_SAFE_INTEGER), 'Invalid disc size')
  }
  cancel() {
    this.generation++
    // Validated blocks belong to this immutable image, not to a seek. Keep the
    // bounded cache; generation checks reject pending reads before publication.
  }
  async read(pos: bigint, length: number): Promise<Uint8Array> {
    check(Number.isSafeInteger(length) && length >= 0 && length <= 16 * 1024 * 1024
      && pos >= 0n && pos + BigInt(length) <= this.size, 'Disc read outside image')
    const generation = this.generation
    const run = async () => {
      const result = new Uint8Array(length)
      let done = 0
      while (done < length) {
        if (generation !== this.generation) {
          throw new DiscAbortError()
        }
        const at = pos + BigInt(done)
        const block = at / 65536n * 65536n
        let data = this.cache.get(block)
        if (!data) {
          const remaining = this.size - block
          const wanted = BigInt(Math.min(1024 * 1024, Math.ceil((Number(at - block) + length - done) / 65536) * 65536))
          const count = Number(remaining < wanted ? remaining : wanted)
          const bytes = await this.readAt(block, count)
          if (generation !== this.generation) {
            throw new DiscAbortError()
          }
          if (typeof bytes === 'number') {
            throw new DiscError(`Disc range read failed (${bytes})`, bytes)
          }
          check(bytes.length === count, 'Short disc range read')
          for (let offset = 0; offset < count; offset += 65536) {
            if (this.cache.size >= 64) {
              this.cache.delete(this.cache.keys().next().value)
            }
            this.cache.set(block + BigInt(offset), bytes.slice(offset, Math.min(offset + 65536, count)))
          }
          data = this.cache.get(block)
        }
        else {
          this.cache.delete(block)
          this.cache.set(block, data)
        }
        const offset = Number(at - block)
        const count = Math.min(length - done, data.length - offset)
        result.set(data.subarray(offset, offset + count), done)
        done += count
      }
      return result
    }
    const result = this.queue.then(run)
    this.queue = result.catch(() => {})
    return result
  }
  async file(file: DiscFile, pos = 0n, length = Number(file.size)): Promise<Uint8Array> {
    check(Number.isSafeInteger(length) && length >= 0 && length <= 16 * 1024 * 1024
      && pos >= 0n && pos + BigInt(length) <= file.size, 'Invalid disc file range')
    if (file.inline) {
      return file.inline.slice(Number(pos), Number(pos) + length)
    }
    const result = new Uint8Array(length)
    let done = 0
    for (const extent of file.extents) {
      if (pos >= extent.length) {
        pos -= extent.length; continue
      }
      const count = Number(extent.length - pos < BigInt(length - done) ? extent.length - pos : BigInt(length - done))
      result.set(await this.read(extent.offset + pos, count), done)
      done += count
      pos = 0n
      if (done === length) {
        return result
      }
    }
    check(done === length, 'Incomplete disc file extents')
    return result
  }
}

export function sliceFile(file: DiscFile, from: bigint, to: bigint): DiscFile {
  check(from >= 0n && to >= from && to <= file.size, 'Invalid disc extent slice')
  const result: DiscFile = { size: to - from, extents: [], directory: false }
  if (file.inline) {
    result.inline = file.inline.slice(Number(from), Number(to)); return result
  }
  let pos = 0n
  for (const extent of file.extents) {
    const start = from > pos ? from - pos : 0n
    const end = to < pos + extent.length ? to - pos : extent.length
    if (end > start) {
      result.extents.push({ offset: extent.offset + start, length: end - start })
    }
    pos += extent.length
    if (pos >= to) {
      break
    }
  }
  check(pos >= to, 'Truncated disc file extents')
  return result
}
