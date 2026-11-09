import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

const aborted = -1048572

test('cancelled ISO clip reads report abort to the child without publishing bytes', async () => {
  class DiscAbortError extends Error {}
  class ChildFormat {
    init() {}
    readHeader() {
      return 0
    }
    seek() {
      return 0n
    }
  }
  const Iso = loadClass(
    'avformat/src/formats/IIsoFormat.ts', 'IIsoFormat',
    ['openSegment', 'checkReading', 'cancelPendingRead'], {
      DiscAbortError, IOReader: class {}, IMpegpsFormat: ChildFormat,
      createAVIFormatContext: () => ({}), seekPoint: async () => ({ pos: 0n }),
      AVSeekFlags: { BYTE: 2 }, IOError: { ABORT: aborted, INVALID_OPERATION: -1, END: -2 },
      check: (value, message) => assert.ok(value, message)
    }
  )
  const iso = new Iso()
  let rejectRead
  iso.clearAudio = () => {}
  iso.info = { type: 'dvd' }
  iso.title = { segments: [{ file: { size: 2048n } }] }
  iso.reader = {
    file: () => new Promise((_, reject) => rejectRead = reject),
    cancel: () => rejectRead(new DiscAbortError())
  }
  await iso.openSegment(0, 0n)
  const buffer = new Uint8Array(16).fill(42)
  const pending = iso.child.ioReader.onFlush(buffer)
  iso.cancelPendingRead()
  assert.equal(await pending, aborted)
  assert.deepEqual(buffer, new Uint8Array(16).fill(42))
  assert.equal(await iso.child.ioReader.onFlush(buffer), aborted)
})

for (const oldResult of [aborted, 0]) {
  test(`ISO seek cancels a pending read before waiting, without publishing old result ${oldResult}`, async () => {
    let finish
    let first = true
    let invalidated = false
    let restarted = false
    const gate = new Promise((resolve) => finish = resolve)
    const demux = {
      async readAVPacket(_, packet) {
        if (first) {
          first = false
          await gate
          return oldResult
        }
        Object.assign(packet, { streamIndex: 0, pts: 6000n, timeBase: {} })
        return 0
      },
      async seek(context) {
        assert.equal(invalidated, true)
        assert.equal(typeof context.readAt, 'function', 'seek retains the random-access callback')
        return 0n
      }
    }
    const Pipeline = loadClass('avpipeline/src/DemuxPipeline.ts', 'DemuxPipeline', ['seek', 'doDemux'], {
      demux, AVFormat: { ISO: 25 }, nullptr: null, IOFlags: { SLICE: 1 },
      bigint: { max: (a, b) => a > b ? a : b }, addressof: (value) => value,
      avRescaleQ2: (value) => value, AV_MILLI_TIME_BASE_Q: {},
      array: { each: (values, callback) => values.forEach(callback) }
    })
    const pipeline = new Pipeline()
    const releases = []
    const task = {
      formatContext: {
        readAt() {}, ioReader: { flags: 0 },
        iformat: { type: 25, cancelPendingRead() {
          invalidated = true
        } }
      },
      stats: null,
      avpacketPool: { alloc: () => ({}), release: (packet) => releases.push(packet) },
      cacheAVPackets: new Map([[0, []]]), pendingAVPackets: new Map(),
      cacheRequests: new Map([[0, 'waiting-decoder']]),
      leftIPCPort: { notify(method) {
        assert.equal(method, 'abortReadAt')
        assert.equal(invalidated, true)
        finish()
      } }
    }
    pipeline.tasks = new Map([['iso', task]])
    pipeline.doAttachedPicture = () => {}
    const pending = pipeline.doDemux(task, 10)
    task.loop = {
      stopBeforeNextTick: () => pending,
      start() {
        restarted = true
      }
    }
    assert.equal(await pipeline.seek('iso', 6000n, 0), 6000n)
    assert.equal(await pending, 0, 'cancelled old read is not EOF')
    assert.equal(releases.length, 1)
    assert.equal(task.cacheRequests.get(0), 'waiting-decoder')
    assert.equal(task.cacheAVPackets.get(0)[0].pts, 6000n)
    assert.equal(restarted, true)
    assert.equal(task.seeking, false)
  })
}
