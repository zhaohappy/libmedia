// SPDX-License-Identifier: LGPL-3.0-or-later
import assert from 'node:assert/strict'

export function u16(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16BE(n)
  return b
}
export function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}
export const concat = (...parts) => Buffer.concat(parts)
export const str = (s) => Buffer.from(s)
export const str8 = (s) => concat(Buffer.from([s.length]), str(s))
export const object = (tag, data, version = 0) => concat(str(tag), u32(data.length + 10), u16(version), data)

export function video(codec = 'RV40') {
  return concat(u32(34), str('VIDO' + codec), u16(16), u16(16), Buffer.alloc(6), u32(25 * 65536), Buffer.alloc(8))
}
export function audio(codec = 'cook', { h = 2, w = 4, sub = 2, flavor = 0, version = 5 } = {}) {
  const deint = { cook: 'genr', sipr: 'sipr', raac: 'vbrf', racp: 'vbrs', dnet: 'Int0' }[codec] ?? 'Int0'
  const extra = codec === 'cook' ? concat(u32(0x1000001), u16(256), u16(8))
    : codec === 'raac' || codec === 'racp' ? Buffer.from([0, 0x12, 0x10]) : Buffer.alloc(0)
  return concat(
    Buffer.from([0x2e, 0x72, 0x61, 0xfd]), u16(version), Buffer.alloc(16), u16(flavor), u32(0), Buffer.alloc(12),
    u16(h), u16(w), u16(sub), u16(0), Buffer.alloc(version === 5 ? 6 : 0), u16(8000), Buffer.alloc(4), u16(1),
    version === 5 ? str(deint + codec) : concat(str8(deint), str8(codec)),
    codec === 'dnet' ? Buffer.alloc(0) : concat(Buffer.alloc(version === 5 ? 4 : 3), u32(extra.length), extra)
  )
}
export function mdpr(id, codec, duration = 10000) {
  return object('MDPR', concat(u16(id), u32(0), u32(64000), Buffer.alloc(8), u32(0), u32(0), u32(duration), str8('test'), str8(''), u32(codec.length), codec))
}
export function packet(id, pts, data, key = true) {
  return concat(u16(0), u16(data.length + 12), u16(id), u32(pts), Buffer.from([0, key ? 2 : 0]), data)
}
export function whole(type = 0, pts = 0) {
  return concat(Buffer.from([0x40, 1]), u32((type * 2 ** 29 + pts * 64) >>> 0), Buffer.from([42]))
}
export function fixture({ streams = [mdpr(1, video())], packets = [packet(1, 0, whole())], index = true, indexVersion = 0 } = {}) {
  const rmf = object('.RMF', concat(u32(0), u32(5)), 1)
  const content = object('CONT', concat(u16(4), str('test'), u16(0), u16(0), u16(0)))
  const prop = (offset) => object('PROP', concat(Buffer.alloc(20), u32(10000), u32(0), u32(offset), u32(0), u16(streams.length), u16(0)))
  const start = rmf.length + prop(0).length + content.length + streams.reduce((n, s) => n + s.length, 0) + 18
  const media = object('DATA', concat(u32(packets.length), u32(0), ...packets))
  let position = start
  const entries = packets.filter((p) => {
    const yes = !!(p[11] & 2) && p.readUInt16BE(4) === 1
    p.position = position
    position += p.length
    return yes
  }).map((p) => concat(u16(0), p.subarray(6, 10), indexVersion === 2 ? concat(u32(0), u32(p.position)) : u32(p.position), u32(0)))
  const idx = index ? object('INDX', concat(u32(entries.length), u16(1), u32(0), Buffer.alloc(indexVersion === 2 ? 4 : 0), ...entries), indexVersion) : Buffer.alloc(0)
  const data = concat(rmf, prop(index ? position : 0), content, ...streams, media, idx)
  return { data, start, indexOffset: position }
}

export class MemoryReader {
  constructor(data, seekable = true) {
    this.data = data
    this.pos = 0
    this.seekable = seekable
    this.seeks = []
    this.bytes = 0
  }
  getPos() {
    return BigInt(this.pos)
  }
  async fileSize() {
    return BigInt(this.data.length)
  }
  async peekBuffer(n) {
    assert.ok(this.pos + n <= this.data.length, 'unexpected EOF')
    return this.data.subarray(this.pos, this.pos + n)
  }
  async readBuffer(n) {
    const bytes = await this.peekBuffer(n)
    this.pos += n
    this.bytes += n
    return bytes
  }
  async skip(n) {
    this.pos += n
  }
  async seek(pos) {
    assert.ok(this.seekable, 'nonseekable IO must not seek')
    this.pos = Number(pos)
    this.seeks.push(this.pos)
  }
}
