// SPDX-License-Identifier: LGPL-3.0-or-later
// Portions copyright (c) 2000, 2001 Fabrice Bellard; (c) 2011 Konstantin Shishkov.
// RealMedia packet layouts and SIPR permutation follow FFmpeg's rmdec.c/rmsipr.c.
// RV30/40 timestamp reconstruction follows rv34_parser.c (Konstantin Shishkov).

const MAX_BUFFER = 16 * 1024 * 1024
const MAX_INDEX = 1000000

export class RmError extends Error {
  constructor(message: string, public unsupported = false) {
    super(message)
  }
}

function requireData(valid: boolean, message = 'invalid RealMedia data'): asserts valid {
  if (!valid) {
    throw new RmError(message)
  }
}

/** A bounded view: no field or nested length can consume the next object. */
class Cursor {
  public pos = 0
  constructor(public data: Uint8Array) {}
  get left() {
    return this.data.length - this.pos
  }
  bytes(size: number) {
    requireData(size >= 0 && size <= this.left)
    const bytes = this.data.subarray(this.pos, this.pos + size)
    this.pos += size
    return bytes
  }
  u8() {
    return this.bytes(1)[0]
  }
  u16() {
    const b = this.bytes(2)
    return b[0] * 256 + b[1]
  }
  u32() {
    return this.u16() * 65536 + this.u16()
  }
  u64() {
    return BigInt(this.u32()) * 0x100000000n + BigInt(this.u32())
  }
  str(size: number) {
    return new TextDecoder().decode(this.bytes(size))
  }
  str8() {
    return this.str(this.u8())
  }
  num() {
    const n = this.u16() & 0x7fff
    return n >= 0x4000 ? n - 0x4000 : n * 65536 + this.u16()
  }
}

export interface RmIO {
  getPos(): bigint
  readBuffer(size: number): Promise<Uint8Array>
  peekBuffer(size: number): Promise<Uint8Array>
  skip(size: number): Promise<void>
  seek(pos: bigint): Promise<void>
  fileSize(): Promise<bigint>
}

export interface RmPacket {
  streamId: number
  data: Uint8Array
  pts: number
  pos: bigint
  key: boolean
  duration: number
}

interface IndexEntry { pts: number, pos: bigint, verified?: boolean }
interface Region { start: bigint, end: bigint, next: bigint }
interface VideoAssembly {
  picture: number
  size: number
  used: number
  slices: Uint8Array[]
  pts: number
  pos: bigint
  key: boolean
  sequence: number
}

export interface RmStream {
  id: number
  codec: string
  video: boolean
  bitrate: number
  start: number
  duration: number
  name: string
  width: number
  height: number
  fps: number
  sampleRate: number
  channels: number
  frameSamples: number
  blockAlign: number
  extra: Uint8Array
  interleaver: string
  heightAudio: number
  widthAudio: number
  subSize: number
  audio?: Uint8Array
  audioCount: number
  audioTime: number
  audioPos: bigint
  audioReady: boolean
  assembly?: VideoAssembly
  keyTime: number
  keyPts: number
  seekPts?: number
  index: IndexEntry[]
}

const SIPR_SWAPS = [
  [0, 63], [1, 22], [2, 44], [3, 90], [5, 81], [7, 31], [8, 86], [9, 58],
  [10, 36], [12, 68], [13, 39], [14, 73], [15, 53], [16, 69], [17, 57], [19, 88],
  [20, 34], [21, 71], [24, 46], [25, 94], [26, 54], [28, 75], [29, 50], [32, 70],
  [33, 92], [35, 74], [38, 85], [40, 56], [42, 87], [43, 65], [45, 59], [48, 79],
  [49, 93], [51, 89], [55, 95], [61, 76], [67, 83], [77, 80]
]

export function reorderSipr(data: Uint8Array) {
  const block = data.length * 2 / 96
  requireData(Number.isInteger(block))
  for (const [a, b] of SIPR_SWAPS) {
    for (let n = 0; n < block; n++) {
      const i = a * block + n
      const j = b * block + n
      const x = (data[i >> 1] >> (4 * (i & 1))) & 15
      const y = (data[j >> 1] >> (4 * (j & 1))) & 15
      data[i >> 1] = (data[i >> 1] & ~(15 << (4 * (i & 1)))) | (y << (4 * (i & 1)))
      data[j >> 1] = (data[j >> 1] & ~(15 << (4 * (j & 1)))) | (x << (4 * (j & 1)))
    }
  }
}

export default class RmDemuxer {
  public streams: RmStream[] = []
  public metadata: Record<string, string> = {}
  private regions: Region[] = []
  private region: Region
  private size = 0n
  private indexOffset = 0n
  private indexRead = false
  private indexedUntil = new Map<number, number>()
  private queue: RmPacket[] = []
  private duration = 0
  private ended = false
  private videoStart = 0n

  constructor(private io: RmIO, private seekable: boolean) {}

  private async object() {
    const pos = this.io.getPos()
    const c = new Cursor(await this.io.readBuffer(10))
    const tag = c.str(4)
    const size = c.u32()
    const version = c.u16()
    requireData(size >= 10 && (tag === 'DATA' || this.size <= 0n || pos + BigInt(size) <= this.size))
    return { pos, tag, size, version }
  }

  private async dataHeader(obj: { pos: bigint, size: number, version: number }) {
    requireData(obj.version === 0 || obj.version === 2, 'unsupported DATA version')
    const length = obj.version === 2 ? 20 : 8
    requireData(obj.size >= 10 + length)
    const c = new Cursor(await this.io.readBuffer(length))
    c.u32()
    if (obj.version === 2) {
      c.bytes(12)
    }
    const next = BigInt(c.u32())
    const region = { start: this.io.getPos(), end: obj.pos + BigInt(obj.size), next }
    requireData(!next || next >= region.end, 'invalid DATA chain')
    this.region = region
    if (!this.regions.some((r) => r.start === region.start)) {
      requireData(this.regions.length < 65536)
      this.regions.push(region)
    }
  }

  public async open() {
    this.size = await this.io.fileSize()
    const first = await this.object()
    requireData(first.tag === '.RMF' && (first.version === 0 || first.version === 1) && first.size >= 18, 'invalid RM header')
    await this.io.skip(first.size - 10)
    for (let objects = 0; objects < 65536; objects++) {
      const obj = await this.object()
      if (obj.tag === 'DATA') {
        await this.dataHeader(obj)
        requireData(this.streams.length > 0, 'no supported RM streams')
        return
      }
      if (!['PROP', 'CONT', 'MDPR'].includes(obj.tag)) {
        await this.io.skip(obj.size - 10)
        continue
      }
      requireData(obj.size <= MAX_BUFFER && (obj.version === 0 || obj.version === 2))
      const c = new Cursor(await this.io.readBuffer(obj.size - 10))
      if (obj.tag === 'PROP') {
        c.bytes(20)
        this.duration = c.u32()
        c.u32()
        this.indexOffset = obj.version === 2 ? c.u64() : BigInt(c.u32())
        c.bytes(8)
      }
      else if (obj.tag === 'CONT') {
        for (const key of ['title', 'author', 'copyright', 'comment']) {
          this.metadata[key] = c.str(c.u16())
        }
      }
      else {
        this.readStream(c)
      }
    }
    throw new RmError('too many RM header objects')
  }

  private readStream(c: Cursor) {
    const id = c.u16()
    requireData(this.streams.length < 64 && !this.streams.some((s) => s.id === id))
    c.u32()
    const bitrate = c.u32()
    c.bytes(8)
    const start = c.u32()
    c.u32()
    const duration = c.u32() || this.duration
    const name = c.str8()
    const mime = c.str8()
    const data = new Cursor(c.bytes(c.u32()))
    if (mime === 'logical-fileinfo') {
      return
    }
    const s: RmStream = {
      id, bitrate, start, duration, name, codec: '', video: false,
      width: 0, height: 0, fps: 0, sampleRate: 0, channels: 0, frameSamples: 0,
      blockAlign: 0, extra: new Uint8Array(), interleaver: '', heightAudio: 0,
      widthAudio: 0, subSize: 0, audioCount: 0, audioTime: 0, audioPos: 0n,
      audioReady: true, keyTime: 0, keyPts: 0, index: []
    }
    const magic = data.u32()
    if (magic === 0x2e7261fd) {
      this.readAudio(s, data)
    }
    else {
      if (data.str(4) !== 'VIDO') {
        throw new RmError('unsupported RM stream header', true)
      }
      s.codec = data.str(4)
      if (!['RV10', 'RV20', 'RV30', 'RV40'].includes(s.codec)) {
        throw new RmError(`unsupported RealVideo codec ${s.codec}`, true)
      }
      s.video = true
      s.width = data.u16()
      s.height = data.u16()
      data.bytes(6)
      s.fps = data.u32()
      s.extra = data.bytes(data.left).slice()
      requireData(s.width > 0 && s.height > 0 && s.extra.length >= 8)
    }
    this.streams.push(s)
  }

  private readAudio(s: RmStream, c: Cursor) {
    const version = c.u16()
    if (version !== 4 && version !== 5) {
      throw new RmError(`unsupported RealAudio version ${version}`, true)
    }
    c.bytes(16)
    const flavor = c.u16()
    c.u32()
    c.bytes(12)
    s.heightAudio = c.u16()
    s.widthAudio = c.u16()
    s.subSize = c.u16()
    c.u16()
    if (version === 5) {
      c.bytes(6)
    }
    s.sampleRate = c.u16()
    c.bytes(4)
    s.channels = c.u16()
    s.interleaver = version === 5 ? c.str(4) : c.str8()
    s.codec = version === 5 ? c.str(4) : c.str8()
    if (!['cook', 'sipr', 'raac', 'racp', 'dnet'].includes(s.codec)) {
      throw new RmError(`unsupported RealAudio codec ${s.codec}`, true)
    }
    requireData(s.sampleRate > 0 && s.channels > 0 && s.channels <= 8)
    s.blockAlign = s.widthAudio
    if (s.codec !== 'dnet') {
      c.bytes(version === 5 ? 4 : 3)
      s.extra = c.bytes(c.u32()).slice()
    }
    if (s.codec === 'cook') {
      requireData(s.extra.length >= 8 && s.interleaver === 'genr')
      const extra = new Cursor(s.extra)
      const versionCook = extra.u32()
      const samples = extra.u16()
      // Multichannel Cook describes each subpacket separately; the first channel pair sets the duration.
      s.frameSamples = samples / (versionCook === 0x2000000 ? Math.min(2, s.channels) : s.channels)
      s.blockAlign = s.subSize
    }
    else if (s.codec === 'sipr') {
      requireData(flavor <= 3 && s.interleaver === 'sipr')
      s.blockAlign = [29, 19, 37, 20][flavor]
      s.frameSamples = [288, 144, 480, 320][flavor]
    }
    else if (s.codec === 'raac' || s.codec === 'racp') {
      requireData(['vbrf', 'vbrs'].includes(s.interleaver) && s.extra.length >= 3)
      s.extra = s.extra.slice(1)
      s.frameSamples = s.codec === 'racp' ? 2048 : 1024
    }
    else {
      requireData(s.interleaver === 'Int0')
      s.frameSamples = 1536
    }
    requireData(Number.isInteger(s.frameSamples) && s.frameSamples > 0)
    if (s.codec === 'cook' || s.codec === 'sipr') {
      const size = s.heightAudio * s.widthAudio
      requireData(size > 0 && size <= MAX_BUFFER && s.heightAudio > 0 && s.blockAlign > 0
        && size % s.blockAlign === 0 && size / s.blockAlign <= 65536)
      requireData(this.streams.reduce((sum, st) => sum + (st.audio?.length || 0), size) <= MAX_BUFFER)
      if (s.codec === 'cook') {
        requireData(s.subSize > 0 && s.widthAudio % s.subSize === 0)
      }
      else {
        requireData(size * 2 % 96 === 0)
      }
      s.audio = new Uint8Array(size)
    }
  }

  private addIndex(s: RmStream, entry: IndexEntry) {
    let lo = 0
    let hi = s.index.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (s.index[mid].pts < entry.pts) {
        lo = mid + 1
      }
      else {
        hi = mid
      }
    }
    if (s.index[lo]?.pts === entry.pts) {
      if (entry.verified) {
        s.index[lo] = entry
      }
    }
    else if (this.streams.reduce((n, stream) => n + stream.index.length, 0) < MAX_INDEX) {
      s.index.splice(lo, 0, entry)
    }
  }

  /** Read an intact container packet. DATA boundaries also bound every payload. */
  private async raw(recordIndex = true): Promise<{ s?: RmStream, data: Uint8Array, pts: number, pos: bigint, key: boolean } | undefined> {
    for (;;) {
      const pos = this.io.getPos()
      if (this.size > 0n && pos === this.size || this.size <= 0n && pos === this.region.end && !this.region.next) {
        return
      }
      // Follow the DATA chain before inspecting intervening indexes or end markers.
      if (pos >= this.region.end) {
        requireData(pos === this.region.end)
        if (this.region.next) {
          const gap = this.region.next - pos
          requireData(gap >= 0n && gap <= BigInt(Number.MAX_SAFE_INTEGER))
          await this.io.skip(Number(gap))
        }
        else if (this.size > 0n && pos >= this.size) {
          return
        }
        // Trailing indexes are not media. A following DATA object is another region.
        const tag = new Cursor(await this.io.peekBuffer(4)).str(4)
        requireData(!this.region.next || tag === 'DATA', 'invalid DATA chain target')
        if (tag !== 'DATA') {
          return
        }
        await this.dataHeader(await this.object())
        continue
      }
      const tag = new Cursor(await this.io.peekBuffer(4)).str(4)
      // FFmpeg's RM muxer appends an eight-byte zero end marker.
      if (tag === '\0\0\0\0') {
        requireData((await this.io.readBuffer(8)).every((byte) => byte === 0))
        return
      }
      if (tag === 'INDX') {
        return
      }
      if (tag === 'DATA') {
        await this.dataHeader(await this.object())
        continue
      }
      requireData(this.region.end - pos >= 12n)
      const c = new Cursor(await this.io.readBuffer(12))
      const version = c.u16()
      const size = c.u16()
      const id = c.u16()
      const pts = c.u32()
      c.u8()
      const key = !!(c.u8() & 2)
      requireData((version === 0 || version === 1) && size >= 12 && pos + BigInt(size) <= this.region.end)
      const data = await this.io.readBuffer(size - 12)
      const s = this.streams.find((stream) => stream.id === id)
      if (recordIndex && s && key && (!s.video || data.length >= 2 && ((data[0] >> 6) === 3 || (data[1] & 0x7f) === 1))) {
        this.addIndex(s, { pts, pos, verified: true })
      }
      return { s, data, pts, pos, key }
    }
  }

  private video(s: RmStream, data: Uint8Array, pts: number, pos: bigint, key: boolean) {
    const c = new Cursor(data)
    while (c.left) {
      const header = c.u8()
      const type = header >> 6
      const sequence = type === 3 ? 0 : c.u8() & 0x7f
      const length = type === 1 ? c.left : c.num()
      const offset = type === 1 ? 0 : c.num()
      const picture = type === 1 ? 0 : c.u8()
      if (type & 1) {
        const frame = c.bytes(type === 3 ? length : c.left)
        this.outputVideo(s, [frame], type === 3 ? offset : pts, pos, key)
        key = false
      }
      else {
        if (sequence === 1) {
          requireData(length > 0 && length <= MAX_BUFFER)
          s.assembly = { picture, size: length, used: 0, slices: [], pts, pos, key, sequence: 0 }
        }
        const a = s.assembly
        const part = c.bytes(type === 2 ? Math.min(offset, c.left) : c.left)
        if (!a || a.picture !== picture) {
          s.assembly = undefined
          continue
        }
        requireData(sequence === a.sequence + 1 && a.slices.length < 128
          && a.used + part.length <= a.size, 'invalid RV slice sequence')
        requireData(this.streams.reduce((n, stream) => n + (stream.assembly?.used || 0), part.length) <= MAX_BUFFER)
        a.sequence = sequence
        a.slices.push(part.slice())
        a.used += part.length
        if (type === 2 || a.used === a.size) {
          requireData(a.used === a.size, 'truncated RV frame')
          this.outputVideo(s, a.slices, a.pts, a.pos, a.key)
          s.assembly = undefined
        }
      }
    }
  }

  private outputVideo(s: RmStream, slices: Uint8Array[], pts: number, pos: bigint, key: boolean) {
    const headerSize = 1 + 8 * slices.length
    const size = slices.reduce((sum, slice) => sum + slice.length, headerSize)
    requireData(size <= MAX_BUFFER && size > headerSize)
    const data = new Uint8Array(size)
    const view = new DataView(data.buffer)
    data[0] = slices.length - 1
    let offset = headerSize
    slices.forEach((slice, i) => {
      view.setUint32(1 + i * 8, 1, true)
      view.setUint32(5 + i * 8, offset - headerSize, true)
      data.set(slice, offset)
      offset += slice.length
    })
    if ((s.codec === 'RV30' || s.codec === 'RV40') && size >= headerSize + 4) {
      const bits = view.getUint32(headerSize)
      const type = (bits >>> (s.codec === 'RV30' ? 27 : 29)) & 3
      const time = (bits >>> (s.codec === 'RV30' ? 7 : 6)) & 0x1fff
      if (type !== 3) {
        s.keyTime = pts
        s.keyPts = time
      }
      else {
        pts = s.keyTime - ((s.keyPts - time) & 0x1fff)
      }
    }
    // A leading B frame after a seek can reference the GOP before the chosen I frame.
    if (s.seekPts !== undefined) {
      if (key && s.seekPts === -Infinity) {
        s.seekPts = pts
      }
      if (pts < s.seekPts) {
        return
      }
    }
    this.queue.push({ streamId: s.id, data, pts, pos, key, duration: 0 })
  }

  private audio(s: RmStream, data: Uint8Array, pts: number, pos: bigint, key: boolean) {
    let frames: Uint8Array[] = []
    if (s.audio) {
      requireData(data.length === s.widthAudio, 'invalid RA interleave packet size')
      if (key) {
        s.audioCount = 0
        s.audioReady = true
      }
      if (!s.audioReady) {
        return
      }
      const y = s.audioCount
      if (y === 0) {
        s.audioTime = pts
        s.audioPos = pos
      }
      if (s.interleaver === 'genr') {
        for (let x = 0; x < s.widthAudio / s.subSize; x++) {
          const offset = s.subSize * (s.heightAudio * x + Math.floor((s.heightAudio + 1) / 2) * (y & 1) + (y >> 1))
          s.audio.set(data.subarray(x * s.subSize, (x + 1) * s.subSize), offset)
        }
      }
      else {
        s.audio.set(data, y * s.widthAudio)
      }
      if (++s.audioCount < s.heightAudio) {
        return
      }
      s.audioCount = 0
      if (s.interleaver === 'sipr') {
        reorderSipr(s.audio)
      }
      for (let p = 0; p < s.audio.length; p += s.blockAlign) {
        frames.push(s.audio.slice(p, p + s.blockAlign))
      }
      pts = s.audioTime
      pos = s.audioPos
    }
    else if (s.codec === 'raac' || s.codec === 'racp') {
      const c = new Cursor(data)
      const count = (c.u16() & 0xf0) >> 4
      requireData(count > 0)
      const lengths = Array.from({ length: count }, () => c.u16())
      frames = lengths.map((length) => c.bytes(length).slice())
      requireData(c.left === 0 && lengths.every((n) => n > 0))
    }
    else {
      requireData(data.length > 0 && data.length % 2 === 0)
      data = data.slice()
      for (let i = 0; i < data.length; i += 2) {
        const tmp = data[i]
        data[i] = data[i + 1]
        data[i + 1] = tmp
      }
      frames = [data]
    }
    frames.forEach((frame, i) => {
      const time = Math.floor(i * s.frameSamples * 1000 / s.sampleRate)
      const end = Math.floor((i + 1) * s.frameSamples * 1000 / s.sampleRate)
      this.queue.push({ streamId: s.id, data: frame, pts: pts + time, pos, key: true, duration: end - time })
    })
  }

  public async read(): Promise<RmPacket | undefined> {
    if (this.ended) {
      return
    }
    while (!this.queue.length) {
      const packet = await this.raw()
      if (!packet) {
        requireData(!this.streams.some((s) => s.assembly || s.audioCount), 'truncated RM frame at EOF')
        return
      }
      if (packet.s) {
        const { s, data, pts, pos, key } = packet
        if (s.video) {
          if (pos < this.videoStart) {
            continue
          }
          this.video(s, data, pts, pos, key)
        }
        else {
          this.audio(s, data, pts, pos, key)
        }
      }
    }
    return this.queue.shift()
  }

  private reset() {
    this.queue = []
    this.ended = false
    this.videoStart = 0n
    for (const s of this.streams) {
      s.assembly = undefined
      s.audioCount = 0
      s.audioReady = false
      s.keyTime = 0
      s.keyPts = 0
      s.seekPts = -Infinity
    }
  }

  /** Indexes are optional hints. Validate packet destinations before trusting them. */
  private async indexes() {
    if (this.indexRead) {
      return
    }
    this.indexRead = true
    let offset = this.indexOffset
    const seen = new Set<bigint>()
    let total = 0
    while (offset && seen.size < 64) {
      requireData(!seen.has(offset) && offset >= this.regions[0].end
        && (this.size <= 0n || offset + 20n <= this.size), 'invalid INDX chain')
      seen.add(offset)
      await this.io.seek(offset)
      const obj = await this.object()
      requireData(obj.tag === 'INDX' && (obj.version === 0 || obj.version === 2))
      const c = new Cursor(await this.io.readBuffer(obj.version === 2 ? 14 : 10))
      const count = c.u32()
      total += count
      const id = c.u16()
      const s = this.streams.find((stream) => stream.id === id)
      offset = BigInt(c.u32())
      const entrySize = obj.version === 2 ? 18 : 14
      requireData(total <= MAX_INDEX && count * entrySize <= MAX_BUFFER
        && (this.size <= 0n || this.io.getPos() + BigInt(count * entrySize) <= this.size))
      const entries = new Cursor(await this.io.readBuffer(count * entrySize))
      const index: IndexEntry[] = []
      for (let i = 0; i < count; i++) {
        requireData(entries.u16() === 0)
        const pts = entries.u32()
        const pos = obj.version === 2 ? entries.u64() : BigInt(entries.u32())
        entries.u32()
        requireData(pos >= this.regions[0].start && (this.size <= 0n || pos + 12n <= this.size)
          && (!index.length || pts >= index[index.length - 1].pts && pos > index[index.length - 1].pos))
        index.push({ pts, pos })
      }
      if (s?.video && index.length) {
        const verified = s.index.filter((entry) => entry.verified)
        s.index = index
        for (const entry of verified) {
          this.addIndex(s, entry)
        }
        this.indexedUntil.set(s.id, index[index.length - 1].pts)
      }
      // Audio index offsets are hints, not proof of a container packet boundary.
      // Keep only anchors discovered while walking actual packets.
    }
    requireData(!offset, 'too many INDX objects')
  }

  private async position(pos: bigint) {
    const region = this.regions.find((r) => pos >= r.start && pos < r.end)
    requireData(!!region, 'index outside known DATA region')
    await this.io.seek(pos)
    this.region = region
  }

  private async validIndex(s: RmStream, entry: IndexEntry) {
    try {
      await this.position(entry.pos)
      const packet = await this.raw(false)
      return !!packet && packet.pos === entry.pos && packet.s === s && packet.key && packet.pts === entry.pts
        && (!s.audio || packet.data.length === s.widthAudio)
    }
    catch (error) {
      if (!(error instanceof RmError)) {
        throw error
      }
      return false
    }
  }

  private async audioResume(target: bigint, video: RmStream) {
    const audios = this.streams.filter((stream) => !!stream.audio)
    if (!audios.length) {
      return target
    }
    const anchors = new Map<number, bigint>()
    const candidates = video.index.filter((entry) => entry.pos < target).sort((a, b) => a.pos < b.pos ? 1 : -1)
    let end = target
    let cursor = 0
    let step = 1
    while (end > this.regions[0].start && anchors.size < audios.length) {
      while (cursor < candidates.length && candidates[cursor].pos >= end) {
        cursor++
      }
      let start = this.regions[0].start
      if (cursor < candidates.length) {
        cursor = Math.min(cursor + step - 1, candidates.length - 1)
        const candidate = candidates[cursor++]
        if (await this.validIndex(video, candidate)) {
          start = candidate.pos
        }
      }
      // Previously walked audio anchors are safe starting points, even inside a GOP.
      const cached = audios.filter((audio) => !anchors.has(audio.id)).map((audio) =>
        audio.index.filter((entry) => entry.verified && entry.pos < end).pop())
      if (cached.every((entry) => !!entry)) {
        const earliest = cached.reduce((pos, entry) => entry.pos < pos ? entry.pos : pos, end)
        if (earliest > start) {
          start = earliest
        }
      }
      await this.position(start)
      const found = new Map<number, bigint>()
      while (this.io.getPos() < end) {
        const packet = await this.raw()
        requireData(!!packet && this.io.getPos() <= end, 'invalid audio seek boundary')
        if (packet.s?.audio && packet.key && packet.data.length === packet.s.widthAudio) {
          found.set(packet.s.id, packet.pos)
        }
      }
      for (const [id, pos] of found) {
        if (!anchors.has(id)) {
          anchors.set(id, pos)
        }
      }
      end = start
      step *= 2
    }
    return Array.from(anchors.values()).reduce((pos, anchor) => anchor < pos ? anchor : pos, target)
  }

  public async seek(timestamp: number, streamId: number): Promise<void> {
    if (!this.seekable) {
      throw new RmError('RM input is not seekable', true)
    }
    const s = this.streams.find((stream) => stream.video) || this.streams.find((stream) => stream.id === streamId)
    requireData(!!s)
    const duration = Math.max(...this.streams.map((stream) => stream.duration))
    if (duration > 0 && timestamp >= duration) {
      this.reset()
      this.ended = true
      return
    }
    const previous = this.io.getPos()
    const previousRegion = this.region
    try {
      try {
        await this.indexes()
      }
      catch (error) {
        if (!(error instanceof RmError)) {
          throw error
        }
        // Corrupt optional indexes must not prevent sequential scanning.
        this.indexedUntil.clear()
        for (const stream of this.streams) {
          stream.index = stream.index.filter((entry) => entry.verified)
        }
      }
      let entry: IndexEntry = { pts: 0, pos: this.regions[0].start }
      for (const index of s.index) {
        if (index.pts > timestamp) {
          break
        }
        if (this.regions.some((r) => index.pos >= r.start && index.pos < r.end)) {
          entry = index
        }
      }
      const valid = await this.validIndex(s, entry)
      if (!valid) {
        entry = { pts: 0, pos: this.regions[0].start }
      }
      await this.position(entry.pos)
      let target = entry.pos
      // A validated container index already identifies a preceding keyframe.
      // Only scan when the index is absent or unusable.
      while (!valid || timestamp > (this.indexedUntil.get(s.id) ?? -1)) {
        const packet = await this.raw()
        if (!packet) {
          break
        }
        if (packet.s === s && packet.pts > timestamp) {
          break
        }
        if (packet.s === s && packet.key && (!s.video || packet.data.length >= 2
          && ((packet.data[0] >> 6) === 3 || (packet.data[1] & 0x7f) === 1))) {
          if (packet.pts > timestamp) {
            break
          }
          target = packet.pos
          if (packet.pts === timestamp) {
            break
          }
        }
      }
      const resume = s.video ? await this.audioResume(target, s) : target
      await this.position(resume)
      this.reset()
      this.videoStart = s.video ? target : 0n
    }
    catch (error) {
      if (error instanceof RmError) {
        await this.io.seek(previous)
        this.region = previousRegion
      }
      throw error
    }
  }

  public destroy() {
    this.reset()
    this.streams = []
    this.regions = []
    this.indexedUntil.clear()
  }
}
