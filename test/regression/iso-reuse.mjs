import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

function fixture(type, readSize = 64) {
  const state = { headers: 0, destroys: 0, reads: [], released: [], failure: 0, hook: undefined, headerHook: undefined }
  class DiscAbortError extends Error {}
  class Reader {
    async seek(pos) {
      await this.onSeek(pos)
    }
  }
  class ChildFormat {
    init() {}
    async readHeader(child, strict) {
      state.headers++
      if (state.headerHook) {
        return state.headerHook(child, strict)
      }
      return child.ioReader.onFlush(new Uint8Array(readSize))
    }
    async seek(child, stream, pos) {
      assert.equal(child.interval.packetBuffer.length, 0)
      assert.equal(child.ioReader.error, 0)
      assert.equal(child.errorFlag, 0)
      await child.ioReader.seek(pos)
      state.hook?.()
      if (state.failure) {
        return BigInt(state.failure)
      }
      const read = await child.ioReader.onFlush(new Uint8Array(readSize))
      return read < 0 ? BigInt(read) : 0n
    }
  }
  const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', [
    'openSegment', 'seekChild', 'seek', 'clearAudio', 'checkReading', 'cancelPendingRead'
  ], {
    IOReader: Reader, IMpegtsFormat: ChildFormat, IMpegpsFormat: ChildFormat, DiscAbortError,
    prepareDvdSegment: async () => {},
    seekPoint: async (_, segment, time) => ({ pos: (time - segment.inTime) * 16n }),
    createAVIFormatContext: () => ({
      interval: { packetBuffer: [] }, streams: [{ codecpar: { codec: type } }],
      destroy: async () => state.destroys++
    }),
    destroyAVPacket: (packet) => state.released.push(packet),
    AVSeekFlags: { BYTE: 2 }, IOError: { ABORT: -7, END: -8, INVALID_OPERATION: -9 },
    errorType: { OPERATE_NOT_SUPPORT: -10 }, check: assert.ok, logger: { debug() {} }
  })
  const iso = new Iso()
  iso.info = { type }
  iso.audioFilters = new Map()
  iso.audioPackets = []
  iso.title = { segments: [0n, 1n].map((index) => ({
    file: { size: 16n * 1024n ** 2n, index }, points: [],
    start: index * 900000n, inTime: index * 1800000n, outTime: index * 1800000n + 900000n
  })) }
  iso.reader = { cancel() {}, file: async (file, pos, length) => {
    state.reads.push({ clip: file.index, pos, length })
    return Uint8Array.from({ length }, (_, i) => (Number(pos) + i) % 251)
  } }
  iso.checkEncryption = () => {}
  iso.fail = (error) => error instanceof DiscAbortError ? -7 : -9
  const seek = (time) => iso.seek({}, { timeBase: { num: 1, den: 90000 } }, time, 0)
  return { iso, state, seek }
}

test('new Blu-ray clip probes at the indexed target then rewinds to decode without reading its opening bytes', async () => {
  const { iso, state, seek } = fixture('bluray', 1024 * 1024)
  await iso.openSegment(0, 0n)
  const old = iso.child
  const begin = state.reads.length
  state.headerHook = async (child, strict) => {
    assert.equal(strict, true)
    // PAT/PMT discovery can span multiple small parser deliveries.
    for (let i = 0; i < 3; i++) {
      assert.ok(await child.ioReader.onFlush(new Uint8Array(1024 * 1024)) > 0)
    }
    return 0
  }
  assert.equal(await seek(906000n), 0n)
  assert.notEqual(iso.child, old)
  const reads = state.reads.slice(begin)
  assert.equal(reads[0].pos, 96000n)
  assert.equal(reads.at(-1).pos, 96000n, 'decode includes the keyframe preceding the discovered tables')
  assert.ok(reads.every((read) => read.pos >= 96000n && read.length <= 64 * 1024))
  assert.equal(state.headers, 2)
  assert.equal(state.destroys, 1)
})

for (const failure of ['missing', 'malformed', 'near-eof']) {
  test(`Blu-ray target probe ${failure} retries the clip header once with a fresh demuxer`, async () => {
    const { iso, state, seek } = fixture('bluray', 1024 * 1024)
    await iso.openSegment(0, 0n)
    if (failure === 'near-eof') {
      iso.title.segments[1].endPos = 96000n + 192n
    }
    const begin = state.reads.length
    let failedChild
    let probeReads
    state.headerHook = async (child, strict) => {
      if (strict) {
        failedChild = child
        if (failure === 'malformed') {
          throw new Error('invalid section')
        }
        while (await child.ioReader.onFlush(new Uint8Array(1024 * 1024)) > 0) {}
        probeReads = state.reads.slice(begin)
        return -8
      }
      assert.notEqual(child, failedChild)
      return child.ioReader.onFlush(new Uint8Array(1024 * 1024))
    }
    assert.equal(await seek(906000n), 0n)
    if (probeReads) {
      assert.ok(probeReads.reduce((sum, read) => sum + read.length, 0) <= 512 * 1024)
      assert.equal(probeReads[0].pos, 96000n)
      assert.equal(state.reads[begin + probeReads.length].pos, 0n)
    }
    assert.equal(state.headers, 3)
    assert.equal(state.destroys, 2)
    assert.equal(state.reads.at(-1).pos, 96000n)
    assert.equal(iso.childReady, true)
  })
}

for (const failure of ['cancel', 'io', 'fallback-failed']) {
  test(`Blu-ray target probe does not retry indefinitely or mask ${failure}`, async () => {
    const { iso, state, seek } = fixture('bluray', 1024 * 1024)
    await iso.openSegment(0, 0n)
    state.headerHook = async (child, strict) => {
      if (failure === 'cancel') {
        iso.cancelPendingRead()
      }
      else if (failure === 'io') {
        iso.reader.file = async () => {
          throw new Error('network failure')
        }
        return child.ioReader.onFlush(new Uint8Array(1024 * 1024))
      }
      return -8
    }
    assert.ok(await seek(906000n) < 0n)
    assert.equal(state.headers, failure === 'fallback-failed' ? 3 : 2)
    assert.equal(iso.childReady, false)
  })
}

for (const type of ['bluray', 'dvd']) {
  test(`${type} seek returns contiguous progressive batches, restores throughput and respects EOF/cancel`, async () => {
    const capacity = (type === 'dvd' ? 512 : 1024) * 1024
    const alignment = type === 'dvd' ? 2048 : 192
    const { iso, state, seek } = fixture(type, capacity)
    await iso.openSegment(0, 0n)
    assert.equal(state.reads[0].length, capacity, 'normal startup keeps its full window')
    for (const target of [12000n, 6000n]) {
      const begin = state.reads.length
      assert.equal(await seek(target), 0n)
      let position = target * 16n
      for (let i = 0; i < 5; i++) {
        const read = state.reads[begin + i]
        assert.equal(read.pos, position)
        const ceiling = Math.min(64 * 1024 * 2 ** i, capacity)
        assert.ok(read.length <= ceiling && read.length > ceiling - alignment)
        position += BigInt(read.length)
        const buffer = new Uint8Array(capacity).fill(255)
        const count = await iso.child.ioReader.onFlush(buffer)
        assert.deepEqual(buffer.subarray(0, count), Uint8Array.from({ length: count }, (_, j) => (Number(position) + j) % 251))
        assert.ok(buffer.subarray(count).every((byte) => byte === 255), 'short flush leaves the unused capacity untouched')
      }
      assert.equal(state.reads.at(-1).length, capacity)
    }
    assert.equal(await seek(1000n), 0n)
    await iso.child.ioReader.onSeek(iso.clipEnd - 7n)
    assert.equal(await iso.child.ioReader.onFlush(new Uint8Array(capacity)), 7)
    assert.equal(await iso.child.ioReader.onFlush(new Uint8Array(capacity)), -8)
    iso.cancelPendingRead()
    const reads = state.reads.length
    assert.equal(await iso.child.ioReader.onFlush(new Uint8Array(capacity)), -7)
    assert.equal(state.reads.length, reads)
    assert.equal(await seek(905000n), 0n)
    assert.equal(state.reads[reads].length, capacity, 'a new clip header does not inherit the old seek ramp')
    assert.ok(state.reads[reads + 1].length <= 64 * 1024, 'the new target starts a fresh ramp')
  })

  test(`${type} reuses a ready clip for forward/backward/EOF seeks and rebuilds across clips`, async () => {
    const { iso, state, seek } = fixture(type)
    await iso.openSegment(0, 0n)
    const child = iso.child
    const codec = child.streams[0].codecpar
    for (const target of [4096n, 128n, 8192n]) {
      child.interval.packetBuffer.push('old-video')
      iso.audioPackets.push('old-audio')
      iso.audioFilters.set(0, { destroy: () => state.released.push('old-filter') })
      child.ioReader.error = -8
      child.errorFlag = -8
      iso.ioError = new Error('previous read was cancelled')
      iso.cancelPendingRead()
      const before = state.reads.length
      assert.equal(await seek(target), 0n)
      assert.equal(iso.child, child)
      assert.equal(child.streams[0].codecpar, codec)
      assert.equal(iso.seekTime, target)
      assert.deepEqual(state.reads.slice(before), [{ clip: 0n, pos: target * 16n, length: 64 }], 'no redundant clip-header read')
      assert.equal(iso.childReady, true)
    }
    assert.equal(state.headers, 1)
    assert.equal(state.destroys, 0)
    assert.equal(state.released.length, 9)
    // A new STC/cell is a different segment even when it refers to the same file.
    iso.title.segments[1].file = iso.title.segments[0].file
    assert.equal(await seek(905000n), 0n)
    assert.notEqual(iso.child, child)
    assert.equal(state.headers, 2)
    assert.equal(state.destroys, 1)
    assert.equal(iso.segmentIndex, 1)
    assert.equal(state.reads.at(-1).pos, 5000n * 16n)
  })

  test(`${type} failed or cancelled reused seek invalidates the child before retry`, async () => {
    const { iso, state, seek } = fixture(type)
    await iso.openSegment(0, 0n)
    for (const cancel of [false, true]) {
      const child = iso.child
      const headers = state.headers
      state.failure = cancel ? 0 : -9
      state.hook = cancel ? () => iso.cancelPendingRead() : undefined
      assert.ok(await seek(1000n) < 0n)
      assert.equal(iso.childReady, false)
      assert.equal(state.headers, headers, 'failed reuse did not probe a header')
      state.failure = 0
      state.hook = undefined
      assert.equal(await seek(2000n), 0n)
      assert.notEqual(iso.child, child)
      assert.equal(state.headers, headers + 1)
      assert.equal(iso.childReady, true)
    }
  })
}

for (const mode of ['valid', 'wrong-program', 'empty-map', 'wrong-pid', 'parse-error']) {
  test(`target TS header validation handles ${mode}`, async () => {
    const Format = loadClass('avformat/src/formats/IMpegtsFormat.ts', 'IMpegtsFormat', ['readHeader'], {
      impegts: { getPacketSize: async () => 192 },
      mpegts: { TS_DVHS_PACKET_SIZE: 192 },
      errorType: { DATA_INVALID: -9 }, logger: { error() {} }
    })
    const format = new Format()
    format.context = {
      hasPAT: true, hasPMT: true, currentProgram: 1, currentPmtPid: 256,
      pat: { program2PmtPid: new Map([[1, mode === 'wrong-pid' ? 257 : 256]]) },
      pmt: { programNumber: mode === 'wrong-program' ? 2 : 1,
        pid2StreamType: new Map(mode === 'empty-map' ? [] : [[4096, 27]]) }
    }
    if (mode === 'parse-error') {
      Object.defineProperty(format.context, 'hasPAT', { get() {
        throw new Error('malformed table')
      } })
    }
    const result = await format.readHeader({ ioReader: { error: 0, getPos: () => 0n } }, true)
    assert.equal(result, mode === 'valid' ? 0 : -9)
  })
}

for (const type of ['ts', 'ps']) {
  test(`MPEG-${type.toUpperCase()} byte seek resets pending packets/filters/EOF while retaining stream maps`, async () => {
    const Format = loadClass(`avformat/src/formats/IMpeg${type}Format.ts`, `IMpeg${type}Format`, ['seek'], {
      AVSeekFlags: { BYTE: 2, TIMESTAMP: 4, ANY: 8 },
      clearTSSliceQueue: (queue) => queue.slices.length = 0
    })
    const format = new Format()
    let resets = 0
    const privData = { pid: 256, pendingPES: { pos: 0n }, paddingPES: {}, filter: { reset: () => resets++ } }
    const stream = { privData }
    const slice = { buffers: [new Uint8Array(1)], pts: 12n, dts: 10n, pos: 0n }
    const pmt = { pid2StreamType: new Map([[256, 27]]) }
    const psmType = new Map([[224, 2]])
    format.context = {
      tsSliceQueueMap: new Map([[256, { slices: [{}], pos: 0n }], [0, { slices: [{}], pos: 0n }]]),
      pmt, hasPAT: true, hasPMT: true, ioEnd: true,
      psmType, slices: new Map([[224, slice]]), paddingPES: {}, ioEnded: true
    }
    let position = 1000n
    const child = { streams: [stream], ioReader: {
      getPos: () => position, fileSize: async () => 10000n,
      seek: async (pos) => position = pos
    } }
    format.syncTSPacket = format.syncPSPacket = async () => {}
    assert.ok(await format.seek(child, null, 200n, 2) >= 0n)
    assert.equal(position, 200n)
    assert.equal(resets, 1)
    if (type === 'ts') {
      assert.equal(format.context.pmt, pmt)
      assert.equal(format.context.hasPAT && format.context.hasPMT, true)
      assert.equal(format.context.ioEnd, false)
      assert.equal(privData.pendingPES, null)
      assert.equal(format.context.tsSliceQueueMap.has(256), false)
      assert.equal(format.context.tsSliceQueueMap.get(0).slices.length, 0)
    }
    else {
      assert.equal(format.context.psmType, psmType)
      assert.equal(format.context.ioEnded, false)
      assert.equal(format.context.paddingPES, null)
      assert.equal(privData.paddingPES, null)
      assert.equal(slice.buffers.length, 0)
      assert.equal(slice.pts, -1n)
    }
  })
}
