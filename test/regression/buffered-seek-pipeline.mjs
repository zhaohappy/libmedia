import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { evaluate, readSource, loadClass } from './helpers/source.mjs'

const { PacketHistory, planBufferedSeek } = evaluate(readSource('avpipeline/src/BufferedSeek.ts').getFullText().replace(/^export /gm, '')
  + '\nreturn {PacketHistory, planBufferedSeek};')
const env = {
  PacketHistory, planBufferedSeek,
  AVFormat: { ISO: 25 }, AVSeekFlags: { FRAME: 8 },
  AVMediaType: { AVMEDIA_TYPE_VIDEO: 0, AVMEDIA_TYPE_AUDIO: 1 },
  AVCodecID: { AV_CODEC_ID_H264: 27, AV_CODEC_ID_HEVC: 173, AV_CODEC_ID_VVC: 196 },
  AVDisposition: { ATTACHED_PIC: 1 }, IOFlags: { SLICE: 2, ABORT: 8 },
  AVPacketFlags: { AV_PKT_FLAG_KEY: 1, AV_PKT_FLAG_CORRUPT: 2, AV_PKT_FLAG_DISCARD: 4, AV_PKT_FLAG_END: 32, AV_PKT_FLAG_H26X_ANNEXB: 64 },
  h264: { isRAP: (packet) => !!packet.rap },
  AVPacketSideDataType: { AV_PKT_DATA_NEW_EXTRADATA: 1 },
  NOPTS_VALUE_BIGINT: -999999n, nullptr: 0,
  avRescaleQ2: (value) => value, addressof: (value) => value, static_cast: (value) => value,
  AV_MILLI_TIME_BASE_Q: {}, getAVPacketSideData: (packet) => packet.configuration ? {} : 0,
  refAVPacket: (dst, src) => Object.assign(dst, src),
  isWorker: () => true, isPointer: () => true, cheapConfig: { USE_THREADS: false },
  serializeAVPacket: (packet) => ({ data: packet.data.slice(), sideData: [] }),
  logger: { debug() {}, warn() {} }, bigint: { max: (a, b) => a > b ? a : b },
  array: { each: (values, fn) => values.forEach(fn) }
}
function packet(streamIndex, time) {
  return {
    streamIndex, pts: BigInt(time), dts: BigInt(time), flags: streamIndex === 0 && time % 1000 === 0 ? 1 : 0,
    size: 100, sideDataElems: 0, timeBase: { num: 1, den: 1000 }, data: new Uint8Array([time % 251]), valueOf: () => 1
  }
}
function fixture() {
  const released = new Set()
  const events = []
  const demux = {
    seek: async () => {
      events.push('network-seek'); return 0n
    },
    readAVPacket: async (_, output) => {
      Object.assign(output, packet(0, 10000)); return 0
    }
  }
  const Pipeline = loadClass('avpipeline/src/DemuxPipeline.ts', 'DemuxPipeline', [
    'rememberSeekPacket', 'tryBufferedSeek', 'replyAVPacket', 'seek', 'changeConnectStream', 'unregisterTask', 'abortReadAt'
  ], { ...env, demux })
  const pipeline = new Pipeline()
  pipeline.doAttachedPicture = () => {}
  const task = {
    taskId: 'test', formatContext: {
      iformat: { type: 25, cancelPendingRead: () => events.push('cancel') }, ioReader: { flags: 0 },
      streams: [0, 1].map((index) => ({ index, disposition: 0, codecpar: { codecType: index } }))
    },
    cacheAVPackets: new Map([0, 1].map((index) => [index, Array.from({ length: 251 }, (_, i) => packet(index, i * 20))])),
    pendingAVPackets: new Map(), cacheRequests: new Map(), stats: { audioPacketQueueLength: 251, videoPacketQueueLength: 251 },
    avpacketPool: { alloc: () => ({}), release: (p) => {
      assert.ok(!released.has(p), 'packet reference released twice'); released.add(p)
    } },
    leftIPCPort: { notify: () => events.push('abort') },
    loop: { isStarted: () => true, resetInterval: () => events.push('wake'),
      start: () => events.push('start'), stopBeforeNextTick: async () => events.push('stop') }
  }
  pipeline.tasks = new Map([['test', task]])
  return { pipeline, task, events, released }
}

test('buffered forward/backward seeks keep the demux cursor and preserve every retained packet', async () => {
  const { pipeline, task, events } = fixture()
  const original = task.cacheAVPackets.get(0).slice()
  assert.equal(await pipeline.seek('test', 2450n, 8, 0), 2450n)
  assert.deepEqual(events, ['wake'])
  assert.equal(task.cacheAVPackets.get(0)[0].pts, 2000n)
  assert.equal(task.stats.videoPacketQueueLength, 151)
  assert.equal(task.seekHistory.packets(0).length, 100)
  // A pending read belongs to the same cursor and can append after the atomic hit.
  const tail = packet(0, 5020)
  task.cacheAVPackets.get(0).push(tail)
  assert.equal(await pipeline.seek('test', 1450n, 8, 0), 1450n)
  assert.deepEqual(task.cacheAVPackets.get(0), [...original.slice(50), tail])
  assert.deepEqual(events, ['wake', 'wake'])
  assert.equal(task.stats.videoPacketQueueLength, 202)
  assert.equal(task.stats.audioPacketQueueLength, 201)
})

test('packet delivery retains an independent reference before worker transfer/release', () => {
  const { pipeline, task, released } = fixture()
  const original = task.cacheAVPackets.get(0).shift()
  pipeline.replyAVPacket(task, { reply: (_, data, error, transfer) => {
    structuredClone(data, { transfer })
    assert.equal(data.data.byteLength, 0)
  } }, {}, original)
  const saved = task.seekHistory.packets(0)[0]
  assert.notEqual(saved, original)
  assert.equal(saved.data.byteLength, 1)
  assert.equal(released.has(original), true)
  assert.equal(released.has(saved), false)
  task.seekHistory.clear()
  assert.equal(released.has(saved), true)
})

test('cache miss uses the original cancellation/seek path and releases history', async () => {
  const { pipeline, task, events, released } = fixture()
  await pipeline.seek('test', 2450n, 8, 0)
  const old = task.seekHistory.packets(0)[0]
  events.length = 0
  assert.equal(await pipeline.seek('test', 10000n, 8, 0), 10000n)
  assert.deepEqual(events, ['stop', 'cancel', 'abort', 'network-seek', 'start'])
  assert.equal(task.seekHistory.packets(0).length, 0)
  assert.equal(released.has(old), true)
  assert.equal(task.cacheAVPackets.get(0).length, 1)
})

test('buffered EOF replay retains source EOF and avoids restarting network reads', async () => {
  const { pipeline, task, events } = fixture()
  task.demuxEnded = true
  assert.equal(await pipeline.seek('test', 2450n, 8, 0), 2450n)
  assert.equal(task.demuxEnded, true)
  assert.deepEqual(events, [])
})

test('H.264 recovery points use decoder-compatible bitstream admission, not missing or incorrect container flags', () => {
  const { pipeline, task } = fixture()
  task.formatContext.streams[0].codecpar.codecId = 27
  const video = task.cacheAVPackets.get(0)
  video.forEach((packet) => {
    packet.flags = 64
    packet.rap = packet.pts % 1000n === 0n
  })
  assert.equal(pipeline.tryBufferedSeek(task, 2450n, 8, 0), true)
  assert.equal(task.cacheAVPackets.get(0)[0].pts, 2000n)
  task.cacheAVPackets.get(0).forEach((packet) => {
    packet.flags = 65
    packet.rap = false
  })
  task.seekHistory.clear()
  assert.equal(pipeline.tryBufferedSeek(task, 2450n, 8, 0), false, 'incorrect container keys cannot admit a broken GOP')
})

for (const reason of ['live', 'subtitle', 'pending-pull', 'byte-seek', 'missing-key', 'audio-missing', 'abort']) {
  test(`buffered admission is atomic on ${reason}`, () => {
    const { pipeline, task, events } = fixture()
    if (reason === 'live') {
      task.isLive = true
    }
    if (reason === 'subtitle') {
      task.formatContext.streams[1].codecpar.codecType = 2
    }
    if (reason === 'pending-pull') {
      task.cacheRequests.set(0, {})
    }
    if (reason === 'missing-key') {
      task.cacheAVPackets.get(0).forEach((p) => p.flags = 0)
    }
    if (reason === 'audio-missing') {
      task.cacheAVPackets.set(1, [])
    }
    if (reason === 'abort') {
      task.formatContext.ioReader.flags = 8
    }
    const before = [...task.cacheAVPackets].map(([id, packets]) => [id, packets.slice()])
    assert.equal(pipeline.tryBufferedSeek(task, 2450n, reason === 'byte-seek' ? 2 : 8, 0), false)
    assert.deepEqual([...task.cacheAVPackets], before)
    assert.deepEqual(events, [])
  })
}

test('oversized packet skips history without allocation and invalidates continuity', () => {
  const { pipeline, task, released } = fixture()
  const old = task.cacheAVPackets.get(0).shift()
  pipeline.rememberSeekPacket(task, old, true)
  task.avpacketPool.alloc = () => assert.fail('oversized history must not allocate')
  const huge = packet(0, 20)
  huge.buf = { buffer: { size: 40 * 1024 * 1024 } }
  pipeline.rememberSeekPacket(task, huge)
  assert.equal(released.has(old), true)
  assert.equal(task.seekHistory.packets(0).length, 0)
})

test('a delivered codec configuration change starts a new history interval', () => {
  const { pipeline, task, released } = fixture()
  const old = task.cacheAVPackets.get(0).shift()
  pipeline.rememberSeekPacket(task, old, true)
  const changed = task.cacheAVPackets.get(0).shift()
  changed.configuration = true
  pipeline.rememberSeekPacket(task, changed, true)
  assert.equal(released.has(old), true)
  assert.deepEqual(task.seekHistory.packets(0), [changed])
})

test('teardown releases both history and unread queues exactly once', async () => {
  const { pipeline, task, released } = fixture()
  await pipeline.seek('test', 2450n, 8, 0)
  task.mainTaskId = 'parent'
  task.loop.destroy = () => {}
  task.formatContext.destroy = async () => {}
  task.rightIPCPorts = new Map()
  await pipeline.unregisterTask('test')
  assert.equal(released.size, 502)
  assert.equal(task.seekHistory.packets(0).length, 0)
  assert.equal(pipeline.tasks.size, 0)
})

test('track changes clear history after the in-flight demux tick has finished', async () => {
  const { pipeline, task } = fixture()
  await pipeline.seek('test', 2450n, 8, 0)
  task.formatContext.streams.push({ index: 2, codecpar: { codecType: 1 } })
  task.pendingAVPackets.set(2, [packet(2, 2000)])
  task.rightIPCPorts = new Map([[1, {}]])
  task.streamIndexFlush = new Map()
  task.loop.stopBeforeNextTick = async () => {
    pipeline.rememberSeekPacket(task, packet(1, 1980))
  }
  await pipeline.changeConnectStream('test', 2, 1, false, true)
  assert.equal(task.seekHistory.packets(0).length, 0)
  assert.equal(task.seekHistory.packets(1).length, 0)
  assert.equal(task.cacheAVPackets.has(1), false)
  assert.equal(task.cacheAVPackets.has(2), true)
})
