// SPDX-License-Identifier: LGPL-3.0-or-later
import assert from 'node:assert/strict'
import { tsImport } from 'tsx/esm/api'
import { test } from './helpers/test.mjs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkout } from './helpers/source.mjs'
import { audio, concat, fixture, mdpr, MemoryReader, object, packet, u16, u32, video, whole } from './helpers/rm.mjs'
const { default: RmDemuxer, RmError, reorderSipr } = await tsImport(pathToFileURL(resolve(checkout, 'packages/avformat/src/formats/rm/RmDemuxer.ts')).href, import.meta.url)

async function open(options = {}, seekable = true) {
  const f = fixture(options)
  const io = new MemoryReader(f.data, seekable)
  const rm = new RmDemuxer(io, seekable)
  await rm.open()
  return { ...f, rm, io }
}

for (const codec of ['RV10', 'RV20', 'RV30', 'RV40']) {
  test(`RM ${codec} headers and decoder slice table`, async () => {
    const { rm, io, start } = await open({ streams: [mdpr(1, video(codec))] })
    assert.equal(rm.streams[0].codec, codec)
    assert.equal(rm.metadata.title, 'test')
    assert.equal(io.pos, start)
    assert.equal(io.seeks.length, 0)
    const p = await rm.read()
    assert.equal(p.data[0], 0)
    assert.equal(new DataView(p.data.buffer).getUint32(1, true), 1)
    assert.deepEqual(Array.from(p.data.slice(9)), Array.from(whole().subarray(2)))
    assert.equal(await rm.read(), undefined)
  })
}

test('RV split frames, embedded frames and reordered B-frame timestamps', async () => {
  const a = concat(Buffer.from([0, 1]), u16(0x4005), u16(0x4000), Buffer.from([7, 0, 0]))
  const b = concat(Buffer.from([0x80, 2]), u16(0x4005), u16(0x4003), Buffer.from([7, 0, 0, 42]))
  const embedded = concat(Buffer.from([0xc0]), u16(0x4005), u16(0x400a), Buffer.from([0]), whole(2, 10).subarray(2))
  const { rm } = await open({ packets: [packet(1, 0, a), packet(1, 0, b, false), packet(1, 10, concat(embedded, embedded)),
    packet(1, 20, whole(2, 20)), packet(1, 30, whole(3, 15), false)] })
  const split = await rm.read()
  assert.equal(split.data[0], 1)
  assert.deepEqual(Array.from(split.data.slice(17)), [0, 0, 0, 0, 42])
  assert.equal((await rm.read()).pts, 10)
  assert.equal((await rm.read()).pts, 10)
  assert.equal((await rm.read()).pts, 20)
  assert.equal((await rm.read()).pts, 15)
})

test('Cook deinterleaving emits exact payloads and sample-based timestamps', async () => {
  const { rm } = await open({ streams: [mdpr(1, audio())], packets: [packet(1, 100, Buffer.from([1, 2, 5, 6])), packet(1, 100, Buffer.from([3, 4, 7, 8]), false)] })
  for (let i = 0; i < 4; i++) {
    const p = await rm.read()
    assert.deepEqual(Array.from(p.data), [i * 2 + 1, i * 2 + 2])
    assert.equal(p.pts, 100 + i * 32)
    assert.equal(p.duration, 32)
  }
  assert.equal(await rm.read(), undefined)
})

test('SIPR nibble permutation has known swaps and is reversible', () => {
  const data = Uint8Array.from({ length: 48 }, (_, i) => (i * 2 & 15) | ((i * 2 + 1 & 15) << 4))
  const original = data.slice()
  reorderSipr(data)
  assert.equal(data[0] & 15, 63 & 15)
  assert.equal(data[31] >> 4, 0)
  reorderSipr(data)
  assert.deepEqual(data, original)
})

test('AAC subpackets and AC-3 byte swapping', async () => {
  const { rm } = await open({ streams: [mdpr(1, audio('raac')), mdpr(2, audio('dnet', { version: 4 }))], packets: [packet(1, 200, concat(u16(0x20), u16(2), u16(3), Buffer.from([1, 2, 3, 4, 5]))), packet(2, 300, Buffer.from([0x77, 0x0b, 2, 1]))] })
  assert.deepEqual(Array.from((await rm.read()).data), [1, 2])
  assert.deepEqual(Array.from((await rm.read()).data), [3, 4, 5])
  assert.deepEqual(Array.from((await rm.read()).data), [0x0b, 0x77, 1, 2])
})

for (const index of [false, true]) {
  for (const version of index ? [0, 2] : [0]) {
    test(`seek with index=${index} version=${version}, including backwards and EOF replay`, async () => {
      const { rm, io } = await open({ index, indexVersion: version, packets: [packet(1, 0, whole()), packet(1, 1000, whole()), packet(1, 2000, whole())] })
      await rm.seek(1500, 1)
      assert.equal((await rm.read()).pts, 1000)
      await rm.seek(0, 1)
      assert.equal((await rm.read()).pts, 0)
      await rm.seek(9999, 1)
      assert.equal((await rm.read()).pts, 2000)
      assert.equal(await rm.read(), undefined)
      await rm.seek(10000, 1)
      assert.equal(await rm.read(), undefined)
      await rm.seek(0, 1)
      assert.equal((await rm.read()).pts, 0)
      assert.ok(io.seeks.length > 0)
    })
  }
}

test('corrupt optional index falls back to packet scan', async () => {
  const { rm, data, indexOffset } = await open({ packets: [packet(1, 0, whole()), packet(1, 1000, whole())] })
  data.writeUInt32BE(0xffffffff, indexOffset + 10)
  await rm.seek(1500, 1)
  assert.equal((await rm.read()).pts, 1000)
})

test('seek drops queued audio and waits for a fresh interleave block', async () => {
  const { rm } = await open({ streams: [mdpr(1, audio())], packets: [packet(1, 0, Buffer.from([1, 2, 5, 6])), packet(1, 0, Buffer.from([3, 4, 7, 8]), false),
    packet(1, 1000, Buffer.from([11, 12, 15, 16])), packet(1, 1000, Buffer.from([13, 14, 17, 18]), false)] })
  await rm.read()
  await rm.seek(1000, 1)
  assert.deepEqual(Array.from((await rm.read()).data), [11, 12])
})

test('multiple DATA objects and unknown stream packets', async () => {
  const f = fixture({ packets: [packet(9, 0, whole())], index: false })
  const second = object('DATA', concat(u32(1), u32(0), packet(1, 500, whole())))
  const rm = new RmDemuxer(new MemoryReader(concat(f.data, second)), true)
  await rm.open()
  assert.equal((await rm.read()).pts, 500)
  assert.equal(await rm.read(), undefined)
})

for (const seekable of [false, true]) {
  test(`follow a DATA chain across INDX, seekable=${seekable}`, async () => {
    const f = fixture({ packets: [packet(1, 0, whole())] })
    const second = object('DATA', concat(u32(1), u32(0), packet(1, 500, whole())))
    f.data.writeUInt32BE(f.data.length, f.start - 4)
    const io = new MemoryReader(concat(f.data, second), seekable)
    const rm = new RmDemuxer(io, seekable)
    await rm.open()
    assert.equal((await rm.read()).pts, 0)
    assert.equal((await rm.read()).pts, 500)
    assert.equal(await rm.read(), undefined)
    if (seekable) {
      await rm.seek(0, 1)
      assert.equal((await rm.read()).pts, 0)
      await rm.seek(500, 1)
      assert.equal((await rm.read()).pts, 500)
    }
    else {
      assert.deepEqual(io.seeks, [])
    }
    rm.destroy()
  })
}

for (const codec of ['cook', 'sipr']) {
  for (const corruption of ['payload', 'wrong-stream', 'non-key', 'timestamp', 'size', 'header-shaped']) {
    test(`${codec} seek rebuilds an invalid audio index: ${corruption}`, async () => {
      const width = codec === 'cook' ? (corruption === 'size' ? 32 : 4) : 696
      const first = Buffer.alloc(width, 0x11)
      const second = Buffer.alloc(width, 0x22)
      const packets = [packet(2, 0, first), packet(2, 0, second, false),
        packet(1, 0, whole()), packet(1, 1000, whole())]
      if (corruption === 'size') {
        // An index can land on header-like bytes inside an otherwise intact audio payload.
        packet(2, 1, Buffer.from([0])).copy(packets[0], 12 + 8)
        first.set(packets[0].subarray(12))
      }
      if (corruption === 'header-shaped') {
        packets[2] = packet(1, 0, concat(whole(), packet(2, 0, Buffer.alloc(width, 0x33)), Buffer.alloc(32, 0xff)))
      }
      const f = fixture({ streams: [mdpr(1, video()), mdpr(2, audio(codec, { w: width }))], packets })
      const offsets = {
        payload: f.start + 1,
        'wrong-stream': packets[packets.length - 1].position,
        'non-key': packets[1].position,
        timestamp: f.start,
        size: f.start + 12 + 8,
        'header-shaped': packets[2].position + 12 + whole().length
      }
      const pts = corruption === 'timestamp' || corruption === 'size' ? 1 : corruption === 'wrong-stream' ? 1000 : 0
      const index = object('INDX', concat(u32(1), u16(2), u32(0), u16(0), u32(pts), u32(offsets[corruption]), u32(0)))
      f.data.writeUInt32BE(f.data.length, f.indexOffset + 16)
      const rm = new RmDemuxer(new MemoryReader(concat(f.data, index)), true)
      await rm.open()
      for (const target of [1000, 0, 1000]) {
        await rm.seek(target, 1)
        const p = await rm.read()
        assert.equal(p.streamId, 2)
        assert.equal(p.pts, 0)
        const expected = concat(first, second)
        if (codec === 'sipr') {
          reorderSipr(expected)
        }
        assert.deepEqual(Array.from(p.data), Array.from(expected.subarray(0, codec === 'cook' ? 2 : 29)))
      }
      rm.destroy()
    })
  }
}

test('nonseekable input reads sequentially and rejects seeking', async () => {
  const { rm, io } = await open({}, false)
  await rm.read()
  await assert.rejects(rm.seek(0, 1), /not seekable/)
  assert.deepEqual(io.seeks, [])
})

test('invalid nested lengths, unsupported audio, truncated frames and bad interleavers fail', async () => {
  await assert.rejects(open({ streams: [mdpr(1, audio('atrc'))] }), (e) => e instanceof RmError && e.unsupported)
  await assert.rejects(open({ streams: [mdpr(1, audio('cook', { sub: 0 }))] }), RmError)
  const bad = video()
  bad.fill(0, 12, 16)
  await assert.rejects(open({ streams: [mdpr(1, bad)] }), RmError)
  const fragment = concat(Buffer.from([0, 1]), u16(0x4005), u16(0x4000), Buffer.from([7, 0, 0]))
  const { rm } = await open({ packets: [packet(1, 0, fragment)] })
  await assert.rejects(rm.read(), /truncated/)
  const aac = await open({ streams: [mdpr(1, audio('raac'))], packets: [packet(1, 0, concat(u16(0x10), u16(50), Buffer.from([1])))] })
  await assert.rejects(aac.rm.read(), RmError)
})

test('WASM adapter pads packets and accepts the player FRAME seek flag', async () => {
  const { classSource, evaluate } = await import('./helpers/source.mjs')
  const { createPacketHarness } = await import('./helpers/packet.mjs')
  const memory = createPacketHarness()
  const source = classSource('avformat/src/formats/IRmFormat.ts', 'IRmFormat', ['readAVPacket', 'seek'], 'Adapter')
  const Adapter = evaluate(`${source}\nreturn Adapter`, {
    ...memory,
    reinterpret_cast: (n) => n,
    mapSafeUint8Array: (p, n) => memory.heap.subarray(p, p + n),
    AVMediaType: { AVMEDIA_TYPE_VIDEO: 0 },
    AVPacketFlags: { AV_PKT_FLAG_KEY: 1 },
    NOPTS_VALUE_BIGINT: -9223372036854775808n,
    IOError: { END: -1048576 },
    IOFlags: { SEEKABLE: 1 },
    AVSeekFlags: { BYTE: 2, FRAME: 8 },
    errorType: { OPERATE_NOT_SUPPORT: -9 }
  })
  const { rm, io } = await open()
  io.flags = 1
  const adapter = new Adapter()
  adapter.demuxer = rm
  const stream = { id: 1, index: 0, codecpar: { codecType: 0 } }
  const context = { ioReader: io, streams: [stream] }
  const packet = memory.createAVPacket()
  const expected = new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42])
  assert.equal(await adapter.readAVPacket(context, packet), 0)
  memory.assertPayloadAndPadding(packet, expected)
  assert.equal(packet.dts, -9223372036854775808n)
  assert.ok(await adapter.seek(context, stream, 0n, 8) >= 0n)
  assert.equal(await adapter.seek(context, stream, 0n, 2), -9n)
})

test('RM detection and RV decoder routing preserve all WASM variants', async () => {
  const { evaluate, functionSource, readSource } = await import('./helpers/source.mjs')
  const detect = evaluate(`${functionSource(readSource('avutil/src/function/analyzeAVFormat.ts'), ['analyzeAVFormat']).replace(/^default /gm, '')}\nreturn analyzeAVFormat`, {
    AVFormat: { UNKNOWN: -1, RM: 22 }
  })
  assert.equal(await detect({ peekString: async () => '.RMF\0\0\0\x12' }), 22)
  const ids = { AV_CODEC_ID_RV10: 1, AV_CODEC_ID_RV20: 2, AV_CODEC_ID_RV30: 3, AV_CODEC_ID_RV40: 4, AV_CODEC_ID_MSMPEG4V1: 5 }
  const code = functionSource(readSource('avutil/src/function/getWasmUrl.ts'), ['getWasmUrl']).replace(/^default /gm, '')
  for (const [simd, atomic, wasm64, suffix] of [[false, false, false, ''], [true, false, false, '-simd'], [false, true, false, '-atomic'], [true, true, true, '-64']]) {
    const url = evaluate(`${code}\nreturn getWasmUrl`, { AVCodecID: ids, supportSimd: simd, supportAtomic: atomic, WASM_64: wasm64, defined: (x) => x })
    for (const id of [1, 2, 3, 4]) {
      assert.equal(url('/wasm', 'decoder', id), `/wasm/decode/rv${suffix}.wasm`)
    }
    assert.equal(url('/wasm', 'decoder', 5), `/wasm/decode/msmpeg4${suffix}.wasm`)
  }
})

test('seek discards leading B frames that reference the previous GOP', async () => {
  const { rm } = await open({ packets: [
    packet(1, 1000, whole(0, 1000)), packet(1, 1000, whole(3, 960), false), packet(1, 1040, whole(2, 1040), false)
  ] })
  await rm.seek(1000, 1)
  assert.equal((await rm.read()).pts, 1000)
  assert.equal((await rm.read()).pts, 1040)
})

test('seek retains the audio interleave block starting before the video keyframe', async () => {
  const { rm } = await open({ streams: [mdpr(1, video()), mdpr(2, audio())], packets: [
    packet(2, 0, Buffer.from([1, 2, 5, 6])), packet(1, 33, whole()), packet(2, 0, Buffer.from([3, 4, 7, 8]), false),
    packet(2, 1000, Buffer.from([11, 12, 15, 16])), packet(1, 1033, whole()), packet(2, 1000, Buffer.from([13, 14, 17, 18]), false)
  ] })
  await rm.seek(1033, 1)
  assert.equal((await rm.read()).pts, 1033)
  const audioPacket = await rm.read()
  assert.equal(audioPacket.pts, 1000)
  assert.deepEqual(Array.from(audioPacket.data), [11, 12])
})

test('audio preroll searches across several indexed video GOPs for a complete block', async () => {
  const packets = []
  for (let i = 0; i < 8; i++) {
    packets.push(packet(2, 0, Buffer.alloc(4, i + 1), i === 0), packet(1, i * 100, whole()))
  }
  const { rm } = await open({ streams: [mdpr(1, video()), mdpr(2, audio('cook', { h: 8 }))], packets })
  for (const target of [600, 100, 600]) {
    await rm.seek(target, 1)
    const frame = await rm.read()
    assert.equal(frame.streamId, 1)
    assert.equal(frame.pts, target)
    let p
    while ((p = await rm.read()).streamId !== 2) { /* Finish the spanning interleave block. */ }
    assert.equal(p.pts, 0)
    assert.deepEqual(Array.from(p.data), [1, 1])
  }
})
