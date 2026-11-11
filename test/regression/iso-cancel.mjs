import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

const aborted = -1048572

for (const [position, size, capacity, expected] of [
  [0n, 8n * 1024n ** 2n, 256 * 1024, 256 * 1024],
  [0n, 19n, 1024 * 1024, 19],
  [4096n, 8n * 1024n ** 2n, 1024 * 1024, 0]
]) {
  test(`ISO startup reuses probe data within position/size/capacity limits (${position}/${size}/${capacity})`, async () => {
    let peeks = 0
    class DiscReader {
      constructor(size, readAt, prefix) {
        assert.equal(prefix?.length ?? 0, expected)
      }
    }
    const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', ['readHeader', 'checkReading'], {
      DiscReader, DiscFilesystem: class {},
      openDisc: async () => ({ title: { chapters: [], segments: [{ inTime: 0n }] }, info: {} })
    })
    const iso = new Iso()
    iso.options = {}
    iso.fail = (error) => {
      throw error
    }
    iso.openSegment = async () => assert.equal(iso.reader.metadataReadAhead, false)
    assert.equal(await iso.readHeader({ readAt() {}, ioReader: {
      fileSize: async () => size, getPos: () => position, getBufferSize: () => capacity,
      peekBuffer: async (length) => {
        peeks++
        assert.equal(length, expected)
        return new Uint8Array(length)
      }
    } }), 0)
    assert.equal(peeks, expected ? 1 : 0)
    assert.equal(iso.reader.metadataReadAhead, false)
  })
}

test('cancelling the initial sequential probe prevents subsequent metadata requests', async () => {
  class DiscAbortError extends Error {}
  const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', ['readHeader', 'checkReading', 'cancelPendingRead'], {
    DiscAbortError,
    DiscReader: class {
      constructor() {
        assert.fail('cancelled probe must not start metadata discovery')
      }
    }
  })
  const iso = new Iso()
  iso.fail = (error) => {
    assert.ok(error instanceof DiscAbortError)
    return aborted
  }
  assert.equal(await iso.readHeader({ readAt() {}, ioReader: {
    fileSize: async () => 1048576n, getPos: () => 0n, getBufferSize: () => 1048576,
    peekBuffer: async () => {
      iso.cancelPendingRead()
      return new Uint8Array(1048576)
    }
  } }), aborted)
})

for (const type of ['dvd', 'bluray']) {
  test(`${type} clip probing preserves the seek target and reads only the required header location`, async () => {
    const positions = []
    class Reader {
      async seek(pos) {
        await this.onSeek(pos)
      }
    }
    class ChildFormat {
      init() {}
      async readHeader(context) {
        assert.equal(await context.ioReader.onFlush(new Uint8Array(2048)), 2048)
        return 0
      }
      async seek(context, stream, pos) {
        await context.ioReader.seek(pos)
        return 0n
      }
    }
    const segment = { file: { size: 65536n }, inTime: 0n, outTime: 90000n, points: [] }
    const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', ['openSegment', 'seekChild', 'checkReading'], {
      IOReader: Reader, IMpegpsFormat: ChildFormat, IMpegtsFormat: ChildFormat,
      prepareDvdSegment: async () => {
        if (type === 'dvd') {
          segment.inTime = 900000n
          segment.outTime += segment.inTime
        }
      },
      seekPoint: async (fs, prepared, time) => {
        assert.equal(time, prepared.inTime + 45000n, 'lazy NAV clock keeps the requested offset within the cell')
        return { pos: 4096n }
      },
      createAVIFormatContext: () => ({ interval: { packetBuffer: [] } }), AVSeekFlags: { BYTE: 2 },
      check: (value, message) => assert.ok(value, message)
    })
    const iso = new Iso()
    iso.info = { type }
    iso.title = { segments: [segment] }
    iso.clearAudio = () => {}
    iso.checkEncryption = () => {}
    iso.reader = { file: async (file, pos, length) => {
      positions.push(pos)
      return new Uint8Array(length)
    } }
    await iso.openSegment(0, 45000n)
    assert.deepEqual(positions, [type === 'dvd' ? 4096n : 0n])
  })
}

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
    ['openSegment', 'seekChild', 'checkReading', 'cancelPendingRead'], {
      DiscAbortError, IOReader: class {
        async seek() {}
      }, IMpegpsFormat: ChildFormat,
      prepareDvdSegment: async () => {},
      createAVIFormatContext: () => ({ interval: { packetBuffer: [] } }), seekPoint: async () => ({ pos: 0n }),
      AVSeekFlags: { BYTE: 2 }, IOError: { ABORT: aborted, INVALID_OPERATION: -1, END: -2 },
      check: (value, message) => assert.ok(value, message)
    }
  )
  const iso = new Iso()
  let rejectRead
  iso.clearAudio = () => {}
  iso.info = { type: 'dvd' }
  iso.title = { segments: [{ file: { size: 2048n }, inTime: 0n }] }
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
