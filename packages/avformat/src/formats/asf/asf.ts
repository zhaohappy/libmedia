/*
 * ASF binary parsing. Object sizes and payload lengths are checked before reads.
 * Licensed under LGPL-3.0-or-later, like the rest of libmedia.
 */

export const GUID = {
  TIMING: '2ac03cfddb06fa4c801c7212d38745e4',
  HEADER: '3026b2758e66cf11a6d900aa0062ce6c',
  FILE: 'a1dcab8c47a9cf118ee400c00c205365',
  STREAM: '9107dcb7b7a9cf118ee600c00c205365',
  EXTENSION: 'b503bf5f2ea9cf118ee300c00c205365',
  EXT_STREAM: 'cba5e61472c632438399a96952065b5a',
  AUDIO: '409e69f84d5bcf11a8fd00805f5c442b',
  VIDEO: 'c0ef19bc4d5bcf11a8fd00805f5c442b',
  SPREAD: '50cdc3bf8f61cf118bb200aa00b4e220',
  DATA: '3626b2758e66cf11a6d900aa0062ce6c',
  INDEX: '90080033b1e5cf1189f400a0c90349cb',
  CONTENT: '3326b2758e66cf11a6d900aa0062ce6c',
  EXT_CONTENT: '40a4d0d207e3d21197f000a0c95ea850',
  METADATA: 'eacbf8c5af5b77488467aa8c44fa4cca',
  METADATA_LIBRARY: '941c23449894d149a1411d134e457054',
  ENCRYPTION: 'fbb3112223bdd211b4b700a0c955fc6e',
  EXT_ENCRYPTION: '14e68a292226174cb935dae07ee9289c'
}

// Bound allocations independently of untrusted 64-bit object lengths.
export const MAX_OBJECT_SIZE = 64 * 1024 * 1024
export const MAX_PACKET_SIZE = 16 * 1024 * 1024

export class AsfError extends Error {
  constructor(message: string, public unsupported = false) {
    super(message)
  }
}

export class Cursor {
  public offset = 0
  private view: DataView

  constructor(public data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  public get left() {
    return this.data.length - this.offset
  }

  public take(size: number): Uint8Array {
    if (!Number.isSafeInteger(size) || size < 0 || size > this.left) {
      throw new AsfError('truncated ASF object or payload')
    }
    const data = this.data.subarray(this.offset, this.offset + size)
    this.offset += size
    return data
  }

  public skip(size: number) {
    this.take(size)
  }
  public u8() {
    return this.take(1)[0]
  }
  public u16() {
    this.take(2)
    return this.view.getUint16(this.offset - 2, true)
  }
  public u32() {
    this.take(4)
    return this.view.getUint32(this.offset - 4, true)
  }
  public u64() {
    this.take(8)
    return this.view.getBigUint64(this.offset - 8, true)
  }
  public guid() {
    return Array.from(this.take(16), (v) => v.toString(16).padStart(2, '0')).join('')
  }
  public text(size: number) {
    if (size % 2) {
      throw new AsfError('invalid ASF UTF-16 length')
    }
    return new TextDecoder('utf-16le').decode(this.take(size)).replace(/\0+$/, '')
  }
  public variable(type: number, fallback = 0): number {
    switch (type & 3) {
      case 1: return this.u8()
      case 2: return this.u16()
      case 3: return this.u32()
      default: return fallback
    }
  }
}

export interface AsfStream {
  id: number
  audio: boolean
  format: Uint8Array
  span: number
  packetSize: number
  chunkSize: number
  extensions: { guid: string, size: number }[]
  frameTime: bigint
  sampleAspectRatio?: { num: number, den: number }
}

export interface AsfHeader {
  fileId: string
  packetSize: number
  minPacketSize: number
  packetCount: bigint
  preroll: bigint
  duration: bigint
  broadcast: boolean
  streams: AsfStream[]
  metadata: Record<string, string>
}

export function parseHeader(data: Uint8Array): AsfHeader {
  const result: AsfHeader = {
    fileId: '', packetSize: 0, minPacketSize: 0, packetCount: 0n, preroll: 0n,
    duration: 0n, broadcast: false, streams: [], metadata: {}
  }
  const extensions = new Map<number, { extensions: AsfStream['extensions'], frameTime: bigint }>()
  const aspects = new Map<number, { num: number, den: number }>()
  const root = new Cursor(data)
  const count = root.u32()
  root.skip(2)

  function aspect(id: number, name: string, type: number, value: Cursor) {
    if (id > 127 || (name !== 'AspectRatioX' && name !== 'AspectRatioY')) {
      return
    }
    let number = 0
    if (type === 3 && value.left === 4) {
      number = value.u32()
    }
    else if (type === 4 && value.left === 8) {
      number = Number(value.u64())
    }
    else if (type === 5 && value.left === 2) {
      number = value.u16()
    }
    else if (type === 0) {
      number = Number(value.text(value.left))
    }
    if (Number.isInteger(number) && number > 0 && number <= 0x7fffffff) {
      const ratio = aspects.get(id) || { num: 0, den: 0 }
      ratio[name === 'AspectRatioX' ? 'num' : 'den'] = number
      aspects.set(id, ratio)
    }
  }

  function objects(reader: Cursor, count?: number, depth = 0) {
    if (depth > 4) {
      throw new AsfError('ASF header nesting too deep')
    }
    let read = 0
    while (reader.left && (count === undefined || read < count)) {
      const guid = reader.guid()
      const size = reader.u64()
      if (size < 24n || size - 24n > BigInt(reader.left)) {
        throw new AsfError('invalid ASF object size')
      }
      const body = new Cursor(reader.take(Number(size - 24n)))
      read++
      if (guid === GUID.ENCRYPTION || guid === GUID.EXT_ENCRYPTION) {
        throw new AsfError('encrypted ASF is not supported', true)
      }
      if (guid === GUID.FILE) {
        if (result.fileId) {
          throw new AsfError('duplicate ASF file properties')
        }
        result.fileId = body.guid()
        body.skip(16)
        result.packetCount = body.u64()
        const duration = body.u64()
        body.skip(8)
        result.preroll = body.u64()
        result.broadcast = !!(body.u32() & 1)
        result.minPacketSize = body.u32()
        result.packetSize = body.u32()
        body.u32()
        result.duration = duration / 10000n - result.preroll
      }
      else if (guid === GUID.STREAM) {
        const type = body.guid()
        const correction = body.guid()
        body.skip(8)
        const length = body.u32()
        const correctionLength = body.u32()
        const flags = body.u16()
        body.skip(4)
        if (flags & 0x8000) {
          throw new AsfError('encrypted ASF stream is not supported', true)
        }
        const id = flags & 127
        if (!id || result.streams.some((stream) => stream.id === id)) {
          throw new AsfError('invalid or duplicate ASF stream id')
        }
        const format = body.take(length)
        const errorData = new Cursor(body.take(correctionLength))
        if (type !== GUID.AUDIO && type !== GUID.VIDEO) {
          continue
        }
        const stream: AsfStream = {
          id, audio: type === GUID.AUDIO, format, span: 0, packetSize: 0, chunkSize: 0,
          extensions: [], frameTime: 0n
        }
        if (stream.audio && correction === GUID.SPREAD && errorData.left) {
          stream.span = errorData.u8()
          stream.packetSize = errorData.u16()
          stream.chunkSize = errorData.u16()
          if (stream.span > 1 && (!stream.chunkSize || stream.packetSize % stream.chunkSize
            || stream.packetSize / stream.chunkSize <= 1)) {
            throw new AsfError('invalid ASF audio interleave parameters')
          }
        }
        result.streams.push(stream)
      }
      else if (guid === GUID.EXTENSION) {
        body.skip(18)
        const length = body.u32()
        objects(new Cursor(body.take(length)), undefined, depth + 1)
      }
      else if (guid === GUID.EXT_STREAM) {
        body.skip(48)
        const id = body.u16()
        body.skip(2)
        const frameTime = body.u64()
        const names = body.u16()
        const extensionCount = body.u16()
        for (let i = 0; i < names; i++) {
          body.skip(2)
          body.skip(body.u16())
        }
        const list: AsfStream['extensions'] = []
        for (let i = 0; i < extensionCount; i++) {
          const guid = body.guid()
          const size = body.u16()
          body.skip(body.u32())
          list.push({ guid, size })
        }
        extensions.set(id, { extensions: list, frameTime })
        if (body.left) {
          objects(body, undefined, depth + 1)
        }
      }
      else if (guid === GUID.CONTENT) {
        const keys = ['title', 'artist', 'copyright', 'description', 'rating']
        const sizes = keys.map(() => body.u16())
        keys.forEach((key, i) => {
          result.metadata[key] = body.text(sizes[i])
        })
      }
      else if (guid === GUID.METADATA || guid === GUID.METADATA_LIBRARY) {
        const count = body.u16()
        for (let i = 0; i < count; i++) {
          body.skip(2)
          const id = body.u16()
          const nameLength = body.u16()
          const type = body.u16()
          const length = body.u32()
          const name = body.text(nameLength)
          aspect(id, name, type, new Cursor(body.take(length)))
        }
      }
      else if (guid === GUID.EXT_CONTENT) {
        const count = body.u16()
        for (let i = 0; i < count; i++) {
          const name = body.text(body.u16())
          const type = body.u16()
          const length = body.u16()
          const value = body.take(length)
          aspect(0, name, type, new Cursor(value))
          if (type === 0) {
            result.metadata[name] = new Cursor(value).text(length)
          }
        }
      }
    }
    if (reader.left || (count !== undefined && count !== read)) {
      throw new AsfError('invalid ASF object count')
    }
  }
  objects(root, count)
  if (!result.fileId || !result.streams.length || !result.minPacketSize
    || result.packetSize < result.minPacketSize || result.packetSize > MAX_PACKET_SIZE) {
    throw new AsfError('missing or invalid ASF file/stream properties')
  }
  result.streams.forEach((stream) => {
    const ext = extensions.get(stream.id)
    if (ext) {
      Object.assign(stream, ext)
    }
    const ratio = aspects.get(stream.id)
    const fallback = aspects.get(0)
    if (ratio?.num && ratio.den) {
      stream.sampleAspectRatio = ratio
    }
    else if (fallback?.num && fallback.den) {
      stream.sampleAspectRatio = fallback
    }
  })
  return result
}

export interface AsfPacket {
  id: number
  data: Uint8Array
  // Standard ASF stores DTS; the DVR timing extension supplies PTS instead.
  pts: bigint | null
  key: boolean
  pos: bigint
}

interface Fragment extends AsfPacket {
  sequence: number
  filled: number
}

export class AsfPacketParser {
  private fragments = new Map<number, Fragment>()

  constructor(private header: AsfHeader) {}

  public reset() {
    this.fragments.clear()
  }
  public get incomplete() {
    return this.fragments.size > 0
  }

  public parse(data: Uint8Array, pos: bigint): AsfPacket[] {
    const reader = new Cursor(data)
    let flags = reader.u8()
    if (flags & 0x80) {
      if (flags & 0x60) {
        throw new AsfError('unsupported ASF error correction', true)
      }
      reader.skip(flags & 15)
      flags = reader.u8()
    }
    const property = reader.u8()
    const size = reader.variable(flags >> 5, this.header.packetSize)
    reader.variable(flags >> 1)
    const padding = reader.variable(flags >> 3)
    const timestamp = reader.u32()
    reader.skip(2)
    const multiple = !!(flags & 1)
    const payloadFlags = multiple ? reader.u8() : 1
    const count = multiple ? payloadFlags & 63 : 1
    const end = size - padding
    if (!count || size > data.length || end < reader.offset || Math.max(size, this.header.minPacketSize) !== data.length) {
      throw new AsfError('invalid ASF packet length')
    }
    // Limit all subsequent reads to payload bytes, excluding packet padding.
    const payload = new Cursor(data.subarray(reader.offset, end))
    const packets: AsfPacket[] = []
    for (let i = 0; i < count; i++) {
      const streamByte = payload.u8()
      const id = streamByte & 127
      const stream = this.header.streams.find((stream) => stream.id === id)
      const key = !!(streamByte & 128) || !!stream?.audio
      const sequence = payload.variable(property >> 4)
      let offset = payload.variable(property >> 2)
      const replicated = new Cursor(payload.take(payload.variable(property)))
      let objectSize = 0
      let pts: bigint | null = BigInt(timestamp)
      let delta = 0
      const compressed = replicated.left === 1
      if (replicated.left >= 8) {
        objectSize = replicated.u32()
        pts = BigInt(replicated.u32())
        if (!objectSize || objectSize > MAX_PACKET_SIZE) {
          throw new AsfError('invalid ASF media object size')
        }
        for (const extension of stream?.extensions || []) {
          const size = extension.size === 65535 ? replicated.u16() : extension.size
          const value = new Cursor(replicated.take(size))
          // DVR timing extension: presentation time in 100 ns units.
          if (extension.guid === GUID.TIMING && size >= 24) {
            value.skip(8)
            const time = value.u64()
            pts = time === 0xffffffffffffffffn ? null : time / 10000n
          }
        }
      }
      else if (compressed) {
        pts = BigInt(offset)
        offset = 0
        delta = replicated.u8()
      }
      else if (replicated.left) {
        throw new AsfError('invalid ASF replicated data')
      }
      if (multiple && !(payloadFlags >> 6)) {
        throw new AsfError('missing ASF payload length')
      }
      const length = multiple ? payload.variable(payloadFlags >> 6) : payload.left
      const bytes = payload.take(length)
      if (!stream) {
        continue
      }
      if (compressed) {
        this.fragments.delete(id)
        const sub = new Cursor(bytes)
        while (sub.left) {
          const data = sub.take(sub.u8()).slice()
          if (!data.length) {
            throw new AsfError('empty ASF compressed payload')
          }
          packets.push({ id, data: this.descramble(data, stream), pts: pts === null ? null : pts - this.header.preroll, key, pos })
          if (pts !== null) {
            pts += BigInt(delta)
          }
        }
        continue
      }
      let fragment = this.fragments.get(id)
      if (!offset) {
        objectSize = objectSize || length
        let buffered = objectSize
        this.fragments.forEach((value, streamId) => {
          if (streamId !== id) {
            buffered += value.data.length
          }
        })
        if (buffered > MAX_OBJECT_SIZE) {
          throw new AsfError('ASF fragment buffer limit exceeded')
        }
        fragment = { id, data: new Uint8Array(objectSize), pts: pts === null ? null : pts - this.header.preroll, key, pos, sequence, filled: 0 }
        this.fragments.set(id, fragment)
      }
      // A seek can land on a continuation of an earlier media object.
      if (!fragment) {
        continue
      }
      if (fragment.sequence !== sequence || fragment.filled !== offset
        || (objectSize && objectSize !== fragment.data.length) || length > fragment.data.length - offset) {
        this.fragments.delete(id)
        throw new AsfError('non-contiguous ASF media object')
      }
      fragment.data.set(bytes, offset)
      fragment.filled += length
      if (fragment.filled === fragment.data.length) {
        fragment.data = this.descramble(fragment.data, stream)
        packets.push(fragment)
        this.fragments.delete(id)
      }
    }
    if (payload.left) {
      throw new AsfError('unconsumed ASF payload data')
    }
    return packets
  }

  private descramble(data: Uint8Array, stream: AsfStream): Uint8Array {
    if (stream.span <= 1) {
      return data
    }
    if (data.length !== stream.packetSize * stream.span) {
      throw new AsfError('invalid ASF interleaved audio size')
    }
    const output = new Uint8Array(data.length)
    for (let offset = 0; offset < data.length; offset += stream.chunkSize) {
      const chunk = offset / stream.chunkSize
      const source = (Math.floor(chunk / stream.span) + (chunk % stream.span) * stream.packetSize / stream.chunkSize) * stream.chunkSize
      output.set(data.subarray(source, source + stream.chunkSize), offset)
    }
    return output
  }
}
