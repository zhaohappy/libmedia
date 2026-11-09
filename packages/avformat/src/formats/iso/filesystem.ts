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

import type DiscReader from './reader'
import { Bytes, check, DiscError, sliceFile, type DiscFile } from './reader'

const SECTOR = 2048n
const MAX_METADATA = 16 * 1024 * 1024
interface Address { block: number, partition: number }
interface Partition { start: number, length: number }
interface PartitionMap { partition: number, metadata?: DiscFile, metadataBlock?: number, mirrorBlock?: number }

/** Read-only ISO9660 and UDF filesystem. Only requested directories are traversed. */
export default class DiscFilesystem {
  private root: DiscFile
  private udf = false
  private partitions = new Map<number, Partition>()
  private maps: PartitionMap[] = []
  private directories = new Map<string, Map<string, DiscFile>>()
  constructor(public reader: DiscReader) {}

  private async sector(block: bigint) {
    return new Bytes(await this.reader.read(block * SECTOR, 2048))
  }

  async open() {
    let iso: DiscFile
    let hasUdf = false
    for (let i = 16; i < 48 && BigInt(i + 1) * SECTOR <= this.reader.size; i++) {
      const b = await this.sector(BigInt(i))
      const id = b.text(1, 5)
      if (id === 'NSR02' || id === 'NSR03') {
        hasUdf = true
      }
      if (id === 'CD001' && b.u8(0) === 1) {
        check(b.u16(128, true) === 2048, 'Unsupported ISO9660 sector size')
        iso = this.isoRecord(b, 156)
      }
    }
    if (hasUdf) {
      await this.openUdf(); this.udf = true
    }
    else {
      check(iso, 'Not an ISO9660/UDF image'); this.root = iso
    }
  }

  private isoRecord(b: Bytes, at: number): DiscFile {
    const length = b.u8(at)
    check(length >= 34, 'Invalid ISO9660 directory record')
    b.range(at, length)
    check(!b.u8(at + 26) && !b.u8(at + 27), 'Interleaved ISO9660 files are unsupported')
    const offset = BigInt(b.u32(at + 2, true) + b.u8(at + 1)) * SECTOR
    const size = BigInt(b.u32(at + 10, true))
    check(offset + size <= this.reader.size, 'ISO9660 extent outside image')
    return { size, extents: [{ offset, length: size }], directory: !!(b.u8(at + 25) & 2) }
  }

  private tag(b: Bytes, id?: number) {
    b.range(0, 16)
    let sum = 0
    for (let i = 0; i < 16; i++) {
      if (i !== 4) {
        sum += b.u8(i)
      }
    }
    check((sum & 255) === b.u8(4) && (id === undefined || b.u16(0, true) === id), 'Invalid UDF descriptor tag')
    const length = b.u16(10, true)
    b.range(16, length)
    let crc = 0
    for (const byte of b.range(16, length)) {
      crc ^= byte << 8
      for (let bit = 0; bit < 8; bit++) {
        crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
      }
    }
    check(crc === b.u16(8, true), 'Invalid UDF descriptor CRC')
  }

  private async openUdf() {
    const blocks = this.reader.size / SECTOR
    let anchor: Bytes
    for (const block of [256n, blocks - 256n, blocks - 1n]) {
      if (block < 0n || block >= blocks) {
        continue
      }
      const b = await this.sector(block)
      if (b.u16(0, true) === 2) {
        try {
          this.tag(b, 2); anchor = b; break
        }
        catch (error) { /* Try the backup anchor. */ }
      }
    }
    check(anchor, 'Missing UDF anchor')
    const length = anchor.u32(16, true)
    const start = anchor.u32(20, true)
    check(length > 0 && length <= MAX_METADATA, 'Invalid UDF descriptor sequence')
    let logical: Bytes
    for (let offset = 0; offset < length; offset += 2048) {
      const b = await this.sector(BigInt(start + offset / 2048))
      this.tag(b)
      const id = b.u16(0, true)
      if (id === 8) {
        break
      }
      if (id === 5) {
        this.partitions.set(b.u16(22, true), { start: b.u32(188, true), length: b.u32(192, true) })
      }
      if (id === 6) {
        logical = b
      }
    }
    check(logical && logical.u32(212, true) === 2048, 'Unsupported UDF logical volume')
    const mapLength = logical.u32(264, true)
    const count = logical.u32(268, true)
    check(count > 0 && count <= 16, 'Unsupported UDF partition map count')
    logical.range(440, mapLength)
    let at = 440
    for (let i = 0; i < count; i++) {
      const type = logical.u8(at)
      const size = logical.u8(at + 1)
      check(size >= 6 && at + size <= 440 + mapLength, 'Invalid UDF partition map')
      if (type === 1 && size === 6) {
        this.maps.push({ partition: logical.u16(at + 4, true) })
      }
      else if (type === 2 && size === 64 && logical.text(at + 5, 23).replace(/\0+$/, '') === '*UDF Metadata Partition') {
        this.maps.push({ partition: logical.u16(at + 38, true), metadataBlock: logical.u32(at + 40, true), mirrorBlock: logical.u32(at + 44, true) })
      }
      else {
        throw new DiscError('Unsupported UDF partition type', -9)
      }
      at += size
    }
    for (const map of this.maps) {
      check(this.partitions.has(map.partition), 'Missing UDF physical partition')
      if (map.metadataBlock !== undefined) {
        try {
          map.metadata = await this.entry({ block: map.metadataBlock, partition: this.maps.indexOf(map) }, true)
        }
        catch (error) {
          if (map.mirrorBlock === 0xffffffff) {
            throw error
          }
          map.metadata = await this.entry({ block: map.mirrorBlock, partition: this.maps.indexOf(map) }, true)
        }
      }
    }
    const fsd = new Bytes(await this.reader.file(this.extent(this.address(logical, 248), 2048)))
    this.tag(fsd, 256)
    this.root = await this.entry(this.address(fsd, 400))
    check(this.root.directory, 'Invalid UDF root directory')
  }

  private address(b: Bytes, at: number): Address {
    return { block: b.u32(at + 4, true), partition: b.u16(at + 8, true) }
  }

  private extent(address: Address, length: number, physical = false): DiscFile {
    const map = this.maps[address.partition]
    check(map, 'Invalid UDF partition reference')
    const partition = this.partitions.get(map.partition)
    check(partition, 'Missing UDF partition')
    if (map.metadata && !physical) {
      return sliceFile(map.metadata, BigInt(address.block) * SECTOR, BigInt(address.block) * SECTOR + BigInt(length))
    }
    check(address.block >= 0 && BigInt(address.block) * SECTOR + BigInt(length) <= BigInt(partition.length) * SECTOR, 'UDF extent outside partition')
    const offset = BigInt(partition.start + address.block) * SECTOR
    check(offset + BigInt(length) <= this.reader.size, 'UDF extent outside image')
    return { size: BigInt(length), extents: [{ offset, length: BigInt(length) }], directory: false }
  }

  private async entry(address: Address, physical = false): Promise<DiscFile> {
    const b = new Bytes(await this.reader.file(this.extent(address, 2048, physical)))
    this.tag(b)
    const id = b.u16(0, true)
    check(id === 261 || id === 266, 'Unsupported UDF file entry')
    const size = b.u64(56)
    const start = id === 261 ? 176 : 216
    const extra = b.u32(start - 8, true)
    const length = b.u32(start - 4, true)
    const type = b.u16(34, true) & 7
    check(size <= this.reader.size, 'Invalid UDF file size')
    const file: DiscFile = { size, extents: [], directory: b.u8(27) === 4 }
    if (type === 3) {
      check(size <= BigInt(length), 'Truncated embedded UDF file')
      file.inline = b.range(start + extra, Number(size)).slice()
      return file
    }
    check(type === 0 || type === 1, 'Unsupported UDF allocation descriptors')
    const visited = new Set<string>()
    const allocations = async (data: Bytes, offset: number, bytes: number, depth: number) => {
      check(depth <= 32 && bytes <= MAX_METADATA, 'UDF allocation chain limit exceeded')
      data.range(offset, bytes)
      const stride = type === 0 ? 8 : 16
      check(bytes % stride === 0, 'Invalid UDF allocation descriptor size')
      for (let at = offset; at < offset + bytes; at += stride) {
        const raw = data.u32(at, true)
        const extentLength = raw & 0x3fffffff
        if (!extentLength) {
          continue
        }
        const loc = { block: data.u32(at + 4, true), partition: type === 0 ? address.partition : data.u16(at + 8, true) }
        if (raw >>> 30 === 3) {
          const key = `${loc.partition}:${loc.block}`
          check(!visited.has(key), 'Cyclic UDF allocation chain')
          visited.add(key)
          check(extentLength <= MAX_METADATA, 'Oversized UDF allocation continuation')
          const continuation = new Bytes(await this.reader.file(this.extent(loc, extentLength, physical)))
          this.tag(continuation, 258)
          await allocations(continuation, 24, continuation.u32(20, true), depth + 1)
        }
        else {
          check(raw >>> 30 === 0, 'Unrecorded UDF file extent')
          file.extents.push(...this.extent(loc, extentLength, physical).extents)
          check(file.extents.length <= 65536, 'Too many UDF file extents')
        }
      }
    }
    await allocations(b, start + extra, length, 0)
    check(file.extents.reduce((sum, extent) => sum + extent.length, 0n) >= size, 'Truncated UDF file')
    return file
  }

  private udfName(data: Uint8Array) {
    check(data.length > 0 && (data[0] === 8 || data[0] === 16), 'Invalid UDF filename')
    let name = ''
    const step = data[0] === 8 ? 1 : 2
    check((data.length - 1) % step === 0, 'Truncated UDF filename')
    for (let i = 1; i < data.length; i += step) {
      name += String.fromCharCode(step === 1 ? data[i] : data[i] * 256 + data[i + 1])
    }
    return name
  }

  private async directory(file: DiscFile) {
    check(file.directory && file.size <= BigInt(MAX_METADATA), 'Invalid or oversized disc directory')
    const key = file.inline ? `inline:${file.inline}` : file.extents.map((e) => `${e.offset}:${e.length}`).join(',')
    if (this.directories.has(key)) {
      return this.directories.get(key)
    }
    const entries = new Map<string, DiscFile>()
    let continued: string | undefined
    const data = new Bytes(await this.reader.file(file))
    for (let at = 0; at < data.data.length;) {
      check(entries.size < 10000, 'Too many disc directory entries')
      if (this.udf) {
        if (data.u16(at, true) === 0) {
          break
        }
        check(data.u16(at, true) === 257, 'Invalid UDF directory entry')
        const flags = data.u8(at + 18)
        const nameLength = data.u8(at + 19)
        const implLength = data.u16(at + 36, true)
        const size = (38 + implLength + nameLength + 3) & ~3
        this.tag(new Bytes(data.range(at, size)), 257)
        if (!(flags & 12)) {
          const name = this.udfName(data.range(at + 38 + implLength, nameLength)).toUpperCase()
          check(!entries.has(name), 'Ambiguous UDF filename')
          entries.set(name, await this.entry(this.address(data, at + 20)))
        }
        at += size
      }
      else {
        const size = data.u8(at)
        if (!size) {
          at = (Math.floor(at / 2048) + 1) * 2048; continue
        }
        const nameLength = data.u8(at + 32)
        check(nameLength > 0 && 33 + nameLength <= size, 'Invalid ISO9660 filename length')
        const name = data.text(at + 33, nameLength).replace(/;\d+$/, '').replace(/\.$/, '').toUpperCase()
        if (name !== '\0' && name !== '\x01') {
          const entry = this.isoRecord(data, at)
          const previous = entries.get(name)
          check(continued === undefined || continued === name, 'Interrupted ISO9660 multi-extent file')
          check(!previous || continued === name, 'Duplicate ISO9660 filename')
          continued = data.u8(at + 25) & 128 ? name : undefined
          if (previous) {
            previous.extents.push(...entry.extents); previous.size += entry.size
          }
          else {
            entries.set(name, entry)
          }
        }
        at += size
      }
    }
    check(continued === undefined, 'Truncated ISO9660 multi-extent file')
    if (this.directories.size >= 64) {
      this.directories.delete(this.directories.keys().next().value)
    }
    this.directories.set(key, entries)
    return entries
  }

  async get(path: string): Promise<DiscFile | undefined> {
    const parts = path.toUpperCase().split('/').filter(Boolean)
    check(parts.length <= 16 && parts.every((p) => p !== '.' && p !== '..'), 'Invalid disc path')
    let file = this.root
    const seen = new Set<bigint>()
    for (const part of parts) {
      if (!file?.directory) {
        return
      }
      const identity = file.extents[0]?.offset
      if (identity !== undefined) {
        check(!seen.has(identity), 'Cyclic disc directory'); seen.add(identity)
      }
      file = (await this.directory(file)).get(part)
    }
    return file
  }
  async list(path: string) {
    const file = await this.get(path)
    return file?.directory ? this.directory(file) : new Map<string, DiscFile>()
  }
  async bytes(path: string) {
    const file = await this.get(path)
    check(file && !file.directory, `Missing disc file: ${path}`)
    return new Bytes(await this.reader.file(file))
  }
}
