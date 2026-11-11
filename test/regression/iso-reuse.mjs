import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

function fixture(type) {
  const state = { headers: 0, destroys: 0, reads: [], released: [], failure: 0, hook: undefined }
  class DiscAbortError extends Error {}
  class Reader {
    async seek(pos) {
      await this.onSeek(pos)
    }
  }
  class ChildFormat {
    init() {}
    async readHeader(child) {
      state.headers++
      return child.ioReader.onFlush(new Uint8Array(64))
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
      const read = await child.ioReader.onFlush(new Uint8Array(64))
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
    errorType: { OPERATE_NOT_SUPPORT: -10 }, check: assert.ok
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
    state.reads.push({ clip: file.index, pos })
    return new Uint8Array(length)
  } }
  iso.checkEncryption = () => {}
  iso.fail = (error) => error instanceof DiscAbortError ? -7 : -9
  const seek = (time) => iso.seek({}, { timeBase: { num: 1, den: 90000 } }, time, 0)
  return { iso, state, seek }
}

for (const type of ['bluray', 'dvd']) {
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
      assert.deepEqual(state.reads.slice(before), [{ clip: 0n, pos: target * 16n }], 'no redundant clip-header read')
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
