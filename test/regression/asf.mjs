import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { evaluate, functionSource, readSource } from './helpers/source.mjs'
import { asf, open, IOError, AVSeekFlags, tag } from './helpers/asf.mjs'

const { GUID, AsfPacketParser, parseHeader } = asf
const u16 = (v) => {
  const b = Buffer.alloc(2); b.writeUInt16LE(v); return b
}
const u32 = (v) => {
  const b = Buffer.alloc(4); b.writeUInt32LE(v); return b
}
const u64 = (v) => {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b
}
const guid = (v) => Buffer.from(v, 'hex')
const object = (id, data) => Buffer.concat([guid(id), u64(data.length + 24), data])
const fileId = '0123456789abcdef0123456789abcdef'

function fixture({ packets = [], index = false, encrypted = false, audio = false, timing = false, extraObjects = [], ids = [1] } = {}) {
  const bitmap = Buffer.alloc(51)
  bitmap.writeUInt32LE(40, 11)
  bitmap.writeUInt32LE(16, 15)
  bitmap.writeUInt32LE(16, 19)
  bitmap.writeUInt32LE(tag('WMV3'), 27)
  const wave = Buffer.concat([u16(0x161), u16(2), u32(44100), u32(16000), u16(743), u16(16), u16(2), u16(0)])
  const format = audio ? wave : bitmap
  const streams = ids.map((id) => object(GUID.STREAM, Buffer.concat([
    guid(audio ? GUID.AUDIO : GUID.VIDEO), Buffer.alloc(16), u64(0), u32(format.length), u32(0), u16(id), u32(0), format
  ])))
  const properties = object(GUID.FILE, Buffer.concat([
    guid(fileId), u64(0), u64(0), u64(packets.length), u64(40000000), u64(0), u64(1000), u32(2), u32(128), u32(128), u32(100000)
  ]))
  const objects = [properties, ...streams, ...extraObjects]
  if (timing) {
    const extension = object(GUID.EXT_STREAM, Buffer.concat([
      Buffer.alloc(48), u16(1), u16(0), u64(400000), u16(0), u16(1), guid(GUID.TIMING), u16(24), u32(0)
    ]))
    objects.push(object(GUID.EXTENSION, Buffer.concat([Buffer.alloc(18), u32(extension.length), extension])))
  }
  if (encrypted) {
    objects.push(object(GUID.ENCRYPTION, Buffer.alloc(0)))
  }
  const header = object(GUID.HEADER, Buffer.concat([u32(objects.length), Buffer.from([1, 2]), ...objects]))
  const data = object(GUID.DATA, Buffer.concat([guid(fileId), u64(packets.length), u16(0x101), ...packets]))
  const simple = index ? object(GUID.INDEX, Buffer.concat([
    guid(fileId), u64(10000000), u32(1), u32(packets.length),
    ...packets.map((_, i) => Buffer.concat([u32(i), u16(1)]))
  ])) : Buffer.alloc(0)
  return { data: Buffer.concat([header, data, simple]), start: header.length + 50, header: header.subarray(24) }
}

function packet({ pts = 1000, sequence = 0, offset = 0, size = 4, data = [1, 2, 3, 4], compressed = false, key = true, id = 1 } = {}) {
  const replicated = compressed ? Buffer.from([10]) : Buffer.concat([u32(size), u32(pts)])
  const payload = Buffer.concat([
    Buffer.from([(key ? 128 : 0) | id, sequence]), u32(offset), Buffer.from([replicated.length]), replicated, Buffer.from(data)
  ])
  const prefix = Buffer.concat([Buffer.from([0x82, 0, 0, 0x08, 0x1d, 128 - 12 - payload.length]), u32(pts), u16(0)])
  return Buffer.concat([prefix, payload, Buffer.alloc(128 - prefix.length - payload.length)])
}

function parser() {
  return new AsfPacketParser(parseHeader(fixture().header))
}

test('ASF header, decode timestamps and padded output', async () => {
  const f = fixture({ packets: [packet()] })
  const { format, context, result } = await open(f.data)
  assert.equal(result, 0)
  assert.equal(context.streams[0].codecpar.codecId, 'AV_CODEC_ID_WMV3')
  assert.equal(context.streams[0].duration, 3000n)
  const output = { timeBase: {} }
  assert.equal(await format.readAVPacket(context, output), 0)
  assert.equal(output.dts, 0n)
  assert.equal(output.pts, -9223372036854775808n)
  assert.deepEqual(Array.from(output.data), [1, 2, 3, 4, ...Array(64).fill(0)])
  assert.equal(await format.readAVPacket(context, output), IOError.END)
})

test('ASF reads WAVEFORMATEX and pads decoder extradata', async () => {
  const { context, result } = await open(fixture({ audio: true }).data)
  assert.equal(result, 0)
  const codec = context.streams[0].codecpar
  assert.equal(codec.sampleRate, 44100)
  assert.equal(codec.chLayout.nbChannels, 2)
  assert.equal(codec.codecId, 'AV_CODEC_ID_WMAV2')
  assert.equal(codec.extradata.length, 66)
})

test('ASF reassembles fragments and resets after seek', () => {
  const p = parser()
  assert.equal(p.parse(packet({ size: 8 }), 0n).length, 0)
  assert.equal(p.parse(packet({ size: 8, offset: 4 }), 128n)[0].data.length, 8)
  p.parse(packet({ size: 8 }), 256n)
  p.reset()
  assert.equal(p.parse(packet({ size: 8, offset: 4 }), 384n).length, 0)
  p.parse(packet({ size: 8 }), 512n)
  assert.throws(() => p.parse(packet({ size: 8, offset: 5 }), 640n), /non-contiguous/)
})

test('ASF compressed payloads use offset timestamp and delta', () => {
  const packets = parser().parse(packet({ compressed: true, offset: 1200, data: [2, 9, 8, 1, 7] }), 0n)
  assert.deepEqual(packets.map((p) => p.pts), [200n, 210n])
  assert.deepEqual(packets.map((p) => Array.from(p.data)), [[9, 8], [7]])
})

test('ASF rejects truncated headers, encryption, payload lengths and incomplete EOF', async () => {
  assert.equal((await open(fixture({ encrypted: true }).data)).result, -1)
  assert.equal((await open(fixture().data.subarray(0, 35))).result, -2)
  assert.throws(() => parser().parse(packet().subarray(0, 40), 0n), /length/)
  assert.throws(() => parser().parse(packet({ compressed: true, data: [50, 1] }), 0n), /truncated/)
  const { format, context } = await open(fixture({ packets: [packet({ size: 8 })] }).data)
  assert.equal(await format.readAVPacket(context, { timeBase: {} }), -2)
})

for (const index of [false, true]) {
  test(`ASF seek, paused/replay state and EOF with index=${index}`, async () => {
    const input = fixture({ packets: [packet(), packet({ pts: 2000 }), packet({ pts: 3000 })], index })
    const { format, context } = await open(input.data)
    const stream = context.streams[0]
    for (const target of [1500n, 0n, 2000n, 5000n, 0n]) {
      assert.ok(await format.seek(context, stream, target, 0) >= 0n)
      const output = { timeBase: {} }
      assert.equal(await format.readAVPacket(context, output), 0)
      assert.equal(output.dts, target === 1500n ? 1000n : target > 2000n ? 2000n : target)
    }
    assert.ok(await format.seek(context, null, BigInt(input.start), AVSeekFlags.BYTE) >= 0n)
    context.ioReader.flags = 0
    assert.equal(await format.seek(context, stream, 0n, 0), -9n)
  })
}

test('ASF audio spread descrambling preserves sample order', () => {
  const header = parseHeader(fixture().header)
  Object.assign(header.streams[0], { audio: true, span: 2, packetSize: 4, chunkSize: 2 })
  const output = new AsfPacketParser(header).parse(packet({ size: 8, data: [1, 2, 5, 6, 3, 4, 7, 8] }), 0n)
  assert.deepEqual(Array.from(output[0].data), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('ASF multiple payloads retain stream order and reject a truncated length', () => {
  const first = packet({ data: [9, 8, 7, 6] }).subarray(12, 31)
  const second = packet({ pts: 1040 }).subarray(12, 31)
  const body = Buffer.concat([first.subarray(0, 15), u16(4), first.subarray(15), second.subarray(0, 15), u16(4), second.subarray(15)])
  const prefix = Buffer.concat([Buffer.from([0x82, 0, 0, 0x09, 0x1d, 128 - 13 - body.length]), u32(1000), u16(0), Buffer.from([0x82])])
  const data = Buffer.concat([prefix, body, Buffer.alloc(128 - prefix.length - body.length)])
  const result = parser().parse(data, 0n)
  assert.equal(result.length, 2)
  assert.deepEqual(result.map((p) => p.pts), [0n, 40n])
  data.writeUInt16LE(127, prefix.length + 15)
  assert.throws(() => parser().parse(data, 0n), /truncated/)
})

test('ASF header lengths and stream IDs cannot escape their object', () => {
  const input = fixture().header
  const badLength = Buffer.from(input)
  badLength.writeBigUInt64LE(0xffffffffffffffffn, 22)
  assert.throws(() => parseHeader(badLength), /object size/)
  const truncatedStream = input.subarray(0, input.length - 1)
  assert.throws(() => parseHeader(truncatedStream), /object size/)
})

test('ASF index read errors fall back to scanning without losing packets', async () => {
  const { format, context } = await open(fixture({ packets: [packet(), packet({ pts: 2000 })], index: true }).data)
  context.ioReader.fileSize = async () => {
    throw new Error('range unavailable')
  }
  assert.ok(await format.seek(context, context.streams[0], 1500n, 0) >= 0n)
  const out = { timeBase: {} }
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.dts, 1000n)
})

test('ASF variable packet sizes remain aligned during sequential read and time seek', async () => {
  function variable(length, pts) {
    const fixed = packet({ pts })
    const payload = fixed.subarray(12, 31)
    const header = Buffer.concat([Buffer.from([0x82, 0, 0, 0x48, 0x1d]), u16(length), Buffer.from([length - 14 - payload.length]), u32(pts), u16(0)])
    return Buffer.concat([header, payload, Buffer.alloc(length - header.length - payload.length)])
  }
  const data = fixture({ packets: [variable(64, 1000), variable(128, 2000)] }).data
  data.writeUInt32LE(64, 24 + 6 + 24 + 68)
  const { result, format, context } = await open(data)
  assert.equal(result, 0)
  const out = { timeBase: {} }
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.dts, 0n)
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.dts, 1000n)
  assert.ok(await format.seek(context, context.streams[0], 0n, 0) >= 0n)
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.dts, 0n)
})

test('ASF timing extensions preserve PTS instead of fabricating DTS', async () => {
  const base = packet()
  const payloadHeader = Buffer.from(base.subarray(12, 27))
  payloadHeader[6] = 32
  const payload = Buffer.concat([payloadHeader, u64(0), u64(15000000), u64(15400000), Buffer.from([1, 2, 3, 4])])
  const prefix = Buffer.from(base.subarray(0, 12))
  prefix[5] = 128 - 12 - payload.length
  const data = Buffer.concat([prefix, payload, Buffer.alloc(128 - 12 - payload.length)])
  const { context, format, result } = await open(fixture({ packets: [data], timing: true }).data)
  assert.equal(result, 0)
  const out = { timeBase: {} }
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.pts, 500n)
  assert.equal(out.dts, -9223372036854775808n)
})

test('ASF probing uses the complete GUID without consuming input', async () => {
  const analyze = evaluate(functionSource(readSource('avutil/src/function/analyzeAVFormat.ts'), ['analyzeAVFormat']).replace(/^default /, '') + '\nreturn analyzeAVFormat', {
    AVFormat: { ASF: 22, UNKNOWN: -1 }
  })
  const data = fixture().data
  const io = {
    peekString: async (size) => data.subarray(0, size).toString('latin1'),
    peekBuffer: async (size) => data.subarray(0, size),
    peekUint32: async () => data.readUInt32BE()
  }
  assert.equal(await analyze(io), 22)
  data[15] ^= 1
  assert.equal(await analyze(io), -1)
})

function aspectMetadata(id, x, y, guidValue = GUID.METADATA) {
  const entries = [['AspectRatioX', x], ['AspectRatioY', y]].map(([name, value]) => {
    const key = Buffer.from(name + '\0', 'utf16le')
    return Buffer.concat([u16(0), u16(id), u16(key.length), u16(3), u32(4), key, u32(value)])
  })
  const metadata = object(guidValue, Buffer.concat([u16(entries.length), ...entries]))
  return object(GUID.EXTENSION, Buffer.concat([Buffer.alloc(18), u32(metadata.length), metadata]))
}

test('ASF applies stream-specific SAR with global fallback, independently of stream order', async () => {
  const input = fixture({ ids: [1, 2, 3], extraObjects: [
    aspectMetadata(0, 4, 3), aspectMetadata(2, 16, 15, GUID.METADATA_LIBRARY), aspectMetadata(3, 0, 1)
  ] })
  const { context, result } = await open(input.data)
  assert.equal(result, 0)
  assert.deepEqual(context.streams.map((stream) => stream.codecpar.sampleAspectRatio), [
    { num: 4, den: 3 }, { num: 16, den: 15 }, { num: 4, den: 3 }
  ])
})

test('ASF reads numeric extended-content aspect ratios and rejects truncated metadata', async () => {
  const entries = [['AspectRatioX', 4], ['AspectRatioY', 3]].map(([name, value]) => {
    const key = Buffer.from(name + '\0', 'utf16le')
    return Buffer.concat([u16(key.length), key, u16(3), u16(4), u32(value)])
  })
  const extra = object(GUID.EXT_CONTENT, Buffer.concat([u16(2), ...entries]))
  const { context, result } = await open(fixture({ extraObjects: [extra] }).data)
  assert.equal(result, 0)
  assert.deepEqual(context.streams[0].codecpar.sampleAspectRatio, { num: 4, den: 3 })
  const bad = aspectMetadata(1, 4, 3)
  // Keep enclosing object sizes valid, but make the first value overrun the object.
  bad.writeUInt32LE(0xffffffff, 24 + 22 + 24 + 2 + 8)
  assert.equal((await open(fixture({ extraObjects: [bad] }).data)).result, -2)
  const invalid = await open(fixture({ extraObjects: [aspectMetadata(1, 4, 0xffffffff)] }).data)
  assert.deepEqual(invalid.context.streams[0].codecpar.sampleAspectRatio, {})
})

function timedPacket(time, options = {}) {
  const base = packet(options)
  const payloadHeader = Buffer.from(base.subarray(12, 27))
  payloadHeader[6] = 32
  const payload = Buffer.concat([payloadHeader, u64(0), u64(time), u64(time), Buffer.from(options.data || [1, 2, 3, 4])])
  const prefix = Buffer.from(base.subarray(0, 12))
  prefix[5] = 128 - 12 - payload.length
  return Buffer.concat([prefix, payload, Buffer.alloc(128 - 12 - payload.length)])
}

test('ASF preserves unknown DVR PTS through reassembly and excludes it from seek indexes', async () => {
  const input = fixture({ timing: true, packets: [
    timedPacket(0xffffffffffffffffn, { size: 8, pts: 1234 }),
    timedPacket(0xffffffffffffffffn, { size: 8, offset: 4, pts: 1234 }),
    timedPacket(15000000n), timedPacket(20000000n)
  ] })
  const { format, context } = await open(input.data)
  const out = { timeBase: {} }
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.pts, -9223372036854775808n)
  assert.equal(out.dts, -9223372036854775808n)
  assert.equal(out.size, 8)
  assert.equal(format.keyframes.get(1).length, 0)
  assert.ok(await format.seek(context, context.streams[0], 750n, 0) >= 0n)
  assert.equal(await format.readAVPacket(context, out), 0)
  assert.equal(out.pts, 500n)
  assert.equal(out.dts, -9223372036854775808n)
})

function countReads(context) {
  let bytes = 0
  const read = context.ioReader.readBuffer.bind(context.ioReader)
  context.ioReader.readBuffer = async (size, target) => {
    bytes += size
    return read(size, target)
  }
  return () => bytes
}

test('ASF cold unindexed seeks use bounded packet probes across timestamp gaps', async () => {
  const time = (i) => 1000 + i * 40 + (i >= 12000 ? 200000 : 0)
  const packets = Array.from({ length: 32768 }, (_, i) => {
    const p = packet({ pts: time(i), key: i % 113 === 0 })
    // Packet send time is deliberately unrelated to media time.
    p.writeUInt32LE(0, 6)
    return p
  })
  const input = fixture({ packets })
  for (const frame of [27000, 12005, 64, 32767, 0, 20000]) {
    const { context, format } = await open(input.data)
    const bytes = countReads(context)
    assert.ok(await format.seek(context, context.streams[0], BigInt(time(frame) - 1000), 0) >= 0n)
    const out = { timeBase: {} }
    assert.equal(await format.readAVPacket(context, out), 0)
    assert.equal(out.dts, BigInt(time(frame - frame % 113) - 1000))
    assert.ok(out.flags & 1)
    assert.ok(bytes() < input.data.length / 10, `cold seek read ${bytes()} / ${input.data.length} bytes`)
  }
})

test('ASF unindexed seeks widen backwards for fragmented sparse keyframes in the selected stream', async () => {
  const packets = []
  for (let i = 0; i < 8192; i++) {
    const options = { pts: 1000 + i * 40, size: 8, sequence: i & 255, key: i % 257 === 0 }
    packets.push(packet(options), packet({ ...options, offset: 4 }))
    if (i % 5 === 0) {
      packets.push(packet({ id: 2, pts: 1000 + i * 20 }))
    }
  }
  const input = fixture({ packets, ids: [1, 2] })
  const { context, format } = await open(input.data)
  const bytes = countReads(context)
  assert.ok(await format.seek(context, context.streams[0], 7050n * 40n, 0) >= 0n)
  const out = { timeBase: {} }
  do {
    assert.equal(await format.readAVPacket(context, out), 0)
  } while (out.streamIndex !== 0)
  assert.equal(out.dts, BigInt(7050 - 7050 % 257) * 40n)
  assert.equal(out.size, 8)
  assert.ok(out.flags & 1)
  assert.ok(bytes() < input.data.length / 4, `fragment seek read ${bytes()} / ${input.data.length} bytes`)
})
