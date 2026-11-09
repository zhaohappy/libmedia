import { functionSource, readSource, transpile, ts } from './helpers/source.mjs'
import { test } from './helpers/test.mjs'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { setImmediate } from 'node:timers/promises'
import { runInNewContext } from 'node:vm'

const avi = readSource('avformat/src/formats/IAviFormat.ts')
const helpers = [
  ['avformat/src/formats/riff/iriff.ts', ['readInfo', 'readBmpHeader', 'readWavHeader']],
  ['avutil/src/util/rational.ts', ['avRescaleQ']],
  ['common/src/util/array.ts', ['binarySearch']]
].map(([file, names]) => functionSource(readSource(file), names))
const declarations = avi.statements
  .filter((node) => ts.isVariableStatement(node) || ts.isEnumDeclaration(node) || ts.isClassDeclaration(node))
  .map((node) => node.getText(avi))
/** Run the upstream AVI demuxer with ordinary JavaScript buffers in place of WASM pointers. */
const program = [...helpers, ...declarations].join('\n')
const casts = program.replace(/static_cast<u?int64>/g, 'BigInt').replace(/(?:static_cast|reinterpret_cast)<(?:[^<>]|<[^<>]*>)*>/g, 'Number')
const code = transpile(casts.replace(/export (?:default )?/g, ''))
const IOFlags = { SEEKABLE: 1, ABORT: 2 }
const IOError = { END: -2, ABORT: -3 }
const AVMediaType = { AVMEDIA_TYPE_VIDEO: 1, AVMEDIA_TYPE_AUDIO: 2, AVMEDIA_TYPE_SUBTITLE: 3, AVMEDIA_TYPE_DATA: 4 }
const AVCodecID = new Proxy({ AV_CODEC_ID_MPEG4: 1, AV_CODEC_ID_MP3: 2 }, { get: (target, key) => target[key] ?? key })
const errorType = { DATA_INVALID: -100, OPERATE_NOT_SUPPORT: -101 }
function mktagle(tag) {
  return Buffer.from(tag).readUInt32LE()
}

const IAviFormat = runInNewContext(`
  ${code}
  const array = { binarySearch, each: (list, fn) => list.forEach(fn) }
  IAviFormat
`, {
  AVChannelOrder: { AV_CHANNEL_ORDER_UNSPEC: 0 },
  AV_TIME_BASE_Q: { num: 1, den: 1000000 },
  IFormat: class {},
  AVFormat: { AVI: 1 },
  AVSeekFlags: { BYTE: 1, ANY: 2 },
  AVFIndexFlags: { AVIIF_INDEX: 16 },
  AVIFlags: { AVIF_HASINDEX: 16, AVIF_MUSTUSEINDEX: 32, AVIF_ISINTERLEAVED: 256, AVIF_TRUSTCKTYPE: 2048 },
  AVPacketSideDataType: { AV_PKT_DATA_NEW_EXTRADATA: 1 },
  AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 1 },
  AVPacketFlags: { AV_PKT_FLAG_KEY: 1 },
  AVMediaType,
  AVCodecID,
  IOFlags,
  IOError,
  INT32_MAX: 2147483647,
  INT64_MAX: 9223372036854775807n,
  NOPTS_VALUE_BIGINT: -9223372036854775808n,
  NOPTS_VALUE: -2147483648,
  codecBmpTags: { [mktagle('DIVX')]: AVCodecID.AV_CODEC_ID_MPEG4 },
  avMalloc: (size) => new Uint8Array(size),
  avFree() {},
  allocAVPacketData: (size) => new Uint8Array(size),
  mapUint8Array: (buffer) => buffer,
  mapSafeUint8Array: (buffer) => buffer,
  addAVPacketData: (packet, data) => {
    packet.data = data
  },
  mktagle,
  concatTypeArray: (_, list) => Buffer.concat(list),
  avReduce() {},
  errorType,
  is: { string: (value) => typeof value === 'string' },
  text: { decode: (data) => Buffer.from(data.buffer, data.byteOffset, data.length).toString('ascii') },
  logger: { debug() {}, warn() {}, error: (message) => {
    throw new Error(message)
  } },
  object: { extend: Object.assign },
  bigint: { min: (a, b) => a < b ? a : b },
  channel: { unInitChannelLayout() {} },
  getWavCodecId: (tag) => tag === 85 ? AVCodecID.AV_CODEC_ID_MP3 : 0,
  addressof: (x) => x,
  Number: (value) => ArrayBuffer.isView(value) ? value : Number(value)
})
/** The fixture stores odd-padded video chunks and variable-sized audio chunks in a classic RIFF. */
const frameCount = 2500
const indexSize = frameCount * 2 * 16 + 8
const prefixSize = 64 * 1024 + 8

function words(...values) {
  const result = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => result.writeUInt32LE(value, index * 4))
  return result
}

function chunk(tag, payload) {
  return Buffer.concat([Buffer.from(tag), words(payload.length), payload, Buffer.alloc(payload.length & 1)])
}

function list(type, ...chunks) {
  return chunk('LIST', Buffer.concat([Buffer.from(type), ...chunks]))
}

function streamHeader(type, handler, rate, length, sampleSize) {
  return chunk('strh', Buffer.concat([
    Buffer.from(type + handler),
    words(0, 0, 0, 1, rate, 0, length, 0, 0, sampleSize, 0, 0)
  ]))
}

function fixture({
  flags = 0x810,
  duplicateAt = -1,
  range = true,
  failSuffix = false,
  hasIndex = true,
  openDml = false,
  frames = frameCount,
  grouped = false,
  wrongLengths = false,
  gateRange
} = {}) {
  const aviHeader = chunk('avih', words(33333, 0, 0, flags, frames, 0, 2, 0, 16, 16, 0, 0, 0, 0))
  const videoFormat = Buffer.alloc(40)
  videoFormat.writeUInt32LE(40, 0)
  videoFormat.writeUInt32LE(16, 4)
  videoFormat.writeUInt32LE(16, 8)
  videoFormat.writeUInt16LE(1, 12)
  videoFormat.writeUInt16LE(24, 14)
  videoFormat.write('DIVX', 16)
  const audioFormat = Buffer.alloc(16)
  audioFormat.writeUInt16LE(85, 0)
  audioFormat.writeUInt16LE(1, 2)
  const audioRate = grouped ? 240 : 24000
  audioFormat.writeUInt32LE(audioRate, 4)
  audioFormat.writeUInt32LE(audioRate, 8)
  audioFormat.writeUInt16LE(1, 12)
  const video = list('strl', streamHeader('vids', 'DIVX', 30, wrongLengths ? 10 : frames, 0), chunk('strf', videoFormat))
  const audio = list('strl', streamHeader('auds', '\0\0\0\0', audioRate, wrongLengths ? 1 : frames * audioRate / 30, 1), chunk('strf', audioFormat))
  const header = openDml
    ? list('hdrl', aviHeader, video, audio, list('odml', chunk('dmlh', words(frames))))
    : list('hdrl', aviHeader, video, audio)

  let packetOffset = 4
  let lastOffset = packetOffset
  const media = []
  const entries = []
  function addPacket(tag, size, key) {
    const packet = chunk(tag, Buffer.alloc(size))
    media.push(packet)
    const pos = entries.length === duplicateAt ? lastOffset : packetOffset
    entries.push(Buffer.concat([Buffer.from(tag), words(key ? 16 : 0, pos, size)]))
    lastOffset = packetOffset
    packetOffset += packet.length
  }
  const groupSize = grouped ? 4 : 1
  for (let first = 0; first < frames; first += groupSize) {
    const end = Math.min(first + groupSize, frames)
    for (let frame = first; frame < end; frame++) {
      const key = frame % 10 === 0
      addPacket(key ? '00db' : '00dc', 5, key)
    }
    for (let frame = first; frame < end; frame++) {
      const size = grouped ? [11, 7, 6, 8][frame % 4] : frame % 2 ? 799 : 801
      addPacket('01wb', size, true)
    }
  }
  const movi = list('movi', ...media)
  const index = hasIndex ? chunk('idx1', Buffer.concat(entries)) : Buffer.alloc(0)
  const data = chunk('RIFF', Buffer.concat([Buffer.from('AVI '), header, movi, index]))
  const firstIndexPos = 12 + header.length + movi.length

  let pos = 0
  let primaryIndexBytes = 0
  let rangedIndexBytes = 0
  const independentReads = []
  const forcedSeeks = []
  let releasePrefetch
  const prefetchGate = new Promise((resolve) => {
    releasePrefetch = resolve
  })
  const ioReader = {
    flags: IOFlags.SEEKABLE,
    getPos: () => BigInt(pos),
    remainingLength: () => Math.max(8192 - pos, 0),
    setEndian() {},
    isBigEndian: () => false,
    fileSize: async () => BigInt(data.length),
    async skip(count) {
      pos += count
    },
    async seek(offset, force = false, flush = true) {
      if (force) {
        forcedSeeks.push([offset, flush])
      }
      pos = Number(offset)
    },
    async peekBuffer(count) {
      return new Uint8Array(data.subarray(pos, pos + count))
    },
    async readBuffer(count, buffer = new Uint8Array(count)) {
      if (pos + count > data.length) {
        this.error = IOError.END
        throw new Error('EOF')
      }
      buffer.set(data.subarray(pos, pos + count))
      if (pos >= firstIndexPos) {
        primaryIndexBytes += count
      }
      pos += count
      return buffer
    },
    async readString(count) {
      return Buffer.from(await this.readBuffer(count)).toString('ascii')
    },
    async readUint8() {
      return (await this.readBuffer(1))[0]
    },
    async readUint16() {
      return Buffer.from(await this.readBuffer(2)).readUInt16LE()
    },
    async readUint32() {
      return Buffer.from(await this.readBuffer(4)).readUInt32LE()
    }
  }
  const context = {
    streams: [],
    metadata: {},
    ioReader,
    createStream() {
      const stream = { index: this.streams.length, codecpar: { chLayout: {}, extradataSize: 0 }, sideData: {}, timeBase: {} }
      this.streams.push(stream)
      return stream
    }
  }
  if (range) {
    context.readAt = async (offset, count) => {
      independentReads.push([offset, count])
      if (offset > BigInt(firstIndexPos)) {
        const error = await (gateRange ? gateRange() : prefetchGate)
        if (typeof error === 'number') {
          return error
        }
        if (failSuffix) {
          return -12
        }
      }
      rangedIndexBytes += count
      return data.subarray(Number(offset), Number(offset) + count)
    }
  }

  const demuxer = new IAviFormat()
  demuxer.init(context)
  return {
    context,
    demuxer,
    independentReads,
    forcedSeeks,
    releasePrefetch,
    indexBytes: () => ({ primary: primaryIndexBytes, ranged: rangedIndexBytes }),
    async packet() {
      const packet = { timeBase: {}, flags: 0 }
      assert.equal(await demuxer.readAVPacket_(context, packet), 0)
      return packet
    }
  }
}

async function start(options) {
  const instance = fixture(options)
  assert.equal(await instance.demuxer.readHeader(instance.context), 0)
  const packet = await instance.packet()
  assert.equal(packet.flags, 1, 'first video packet is key')
  assert.equal(packet.dts, 0n)
  return instance
}

async function testDemandSeek() {
  const gates = []
  const options = { frames: 42000, grouped: true, wrongLengths: true }
  const partial = await start({ ...options, gateRange: () => new Promise((resolve) => gates.push(resolve)) })
  const eager = await start({ ...options, range: false })
  const [video] = partial.context.streams
  let finished = false
  const seek = partial.demuxer.seek(partial.context, video, 4801n, 0).then((result) => {
    finished = true
    return result
  })
  await setImmediate()
  assert.equal(finished, false)
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(finished, false, 'one block does not reach the seek target')
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(finished, true, 'the seek completes with the remaining idx1 bytes unread')
  assert.equal(gates.length, 0, 'target media reads have priority over the next index range')
  assert.ok(await seek > 0n)
  assert.ok(partial.indexBytes().ranged < 200000, 'a cold seek only reads the index needed to reach its target')

  assert.ok(await eager.demuxer.seek(eager.context, eager.context.streams[0], 4801n, 0) > 0n)
  const streamsThroughTarget = new Set()
  for (let i = 0; i < 50; i++) {
    const packet = await partial.packet()
    assert.deepEqual(packet, await eager.packet(), 'packet positions and DTS match a full parse with incorrect stream lengths')
    const duration = packet.streamIndex === video.index ? 1 : packet.data.length
    const endDts = packet.dts + BigInt(duration)
    if (endDts * BigInt(packet.timeBase.num * 30) > 4801n * BigInt(packet.timeBase.den)) {
      streamsThroughTarget.add(packet.streamIndex)
    }
    assert.equal(gates.length, streamsThroughTarget.size === 2 ? 1 : 0, 'prefetch resumes once both streams pass the target')
  }
  assert.equal(gates.length, 1)

  finished = false
  const farther = partial.demuxer.seek(partial.context, video, 9001n, 0).then((result) => {
    finished = true
    return result
  })
  await setImmediate()
  assert.equal(finished, false, 'a farther seek waits for its own coverage')
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(finished, true, 'the farther seek also completes before the tail')
  assert.equal(gates.length, 0)
  assert.ok(await farther > 0n)
  assert.ok(await eager.demuxer.seek(eager.context, eager.context.streams[0], 9001n, 0) > 0n)
  assert.deepEqual(await partial.packet(), await eager.packet())

  const pendingSeek = partial.demuxer.seek(partial.context, video, 40001n, 0)
  await setImmediate()
  await partial.demuxer.destroy(partial.context)
  assert.equal(await pendingSeek, BigInt(IOError.ABORT), 'destroy releases a seek waiting on a stalled range')
  const stoppedAt = partial.context.ioReader.getPos()
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(partial.context.ioReader.getPos(), stoppedAt, 'a late response cannot change the media cursor')
  assert.equal(gates.length, 0, 'a late response cannot start another index range')
}

async function testSequentialExtension() {
  const gates = []
  const options = { frames: 6000, grouped: true }
  const partial = await start({ ...options, gateRange: () => new Promise((resolve) => gates.push(resolve)) })
  const eager = await start({ ...options, range: false })
  const [video] = partial.context.streams
  assert.ok(await partial.demuxer.seek(partial.context, video, 2041n, 0) > 0n)
  assert.ok(await eager.demuxer.seek(eager.context, eager.context.streams[0], 2041n, 0) > 0n)

  for (let i = 0; i < 16; i++) {
    assert.deepEqual(await partial.packet(), await eager.packet())
  }

  let finished = false
  const atBoundary = partial.packet().then((packet) => {
    finished = true
    return packet
  })
  await setImmediate()
  assert.equal(finished, false, 'sequential playback waits at the published boundary')
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(finished, true, 'sequential playback resumes after one range with the tail still pending')
  assert.deepEqual(await atBoundary, await eager.packet())
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(await partial.packet(), await eager.packet(), 'prefix extension retains both stream cursors')
  }
  assert.equal(gates.length, 1)
  await partial.demuxer.destroy(partial.context)
  gates.shift()()
}

async function testRangeFailureAfterPartialSeek() {
  const gates = []
  const options = { frames: 6000, grouped: true }
  const partial = await start({ ...options, gateRange: () => new Promise((resolve) => gates.push(resolve)) })
  const eager = await start({ ...options, range: false })
  const [video] = partial.context.streams
  const [eagerVideo] = eager.context.streams
  const earlySeek = partial.demuxer.seek(partial.context, video, 3001n, 0)
  await setImmediate()
  assert.equal(gates.length, 1)
  gates.shift()()
  await setImmediate()
  assert.equal(gates.length, 0)
  assert.ok(await earlySeek > 0n)
  assert.ok(await eager.demuxer.seek(eager.context, eagerVideo, 3001n, 0) > 0n)
  assert.deepEqual(await partial.packet(), await eager.packet())
  const expanded = partial.indexBytes()
  assert.ok(expanded.ranged > prefixSize)
  assert.equal(expanded.primary, 0)

  const previousPosition = partial.context.ioReader.getPos()
  const fartherSeek = partial.demuxer.seek(partial.context, video, 7001n, 0)
  await setImmediate()
  assert.equal(gates.length, 1)
  gates.shift()(-12)
  await setImmediate()
  assert.equal(gates.length, 0)
  assert.ok(await fartherSeek < 0n, 'the eager fallback also rejects the out-of-range target')
  assert.deepEqual(partial.indexBytes(), { primary: eager.indexBytes().primary, ranged: expanded.ranged })
  assert.equal(partial.context.ioReader.getPos(), previousPosition, 'fallback preserves the partially indexed seek cursor')
  for (let i = 0; i < 8; i++) {
    assert.deepEqual(await partial.packet(), await eager.packet(), 'playback resumes with the same DTS and packet offsets')
  }

  assert.ok(await partial.demuxer.seek(partial.context, video, 5301n, 0) > 0n)
  assert.ok(await eager.demuxer.seek(eager.context, eagerVideo, 5301n, 0) > 0n)
  for (let i = 0; i < 8; i++) {
    assert.deepEqual(await partial.packet(), await eager.packet(), 'the fallback index supports later seeks beyond the published prefix')
  }
}

async function main() {
  const deferred = await start()
  assert.deepEqual(deferred.indexBytes(), { primary: 0, ranged: prefixSize })
  const [video, audio] = deferred.context.streams
  const { demuxer, context } = deferred
  assert.equal(deferred.independentReads.length, 2, 'suffix is already in flight')
  assert.ok(await demuxer.seek(context, video, 101n, 0) > 0n, 'a near seek proceeds with the suffix blocked')
  assert.equal((await deferred.packet()).dts, 100n)
  assert.deepEqual(deferred.forcedSeeks, [], 'a near seek keeps read-ahead')
  const previousPosition = context.ioReader.getPos()
  let farSeekComplete = false
  const farSeek = demuxer.seek(context, video, 2401n, 0).then((result) => {
    farSeekComplete = true
    return result
  })
  await setImmediate()
  assert.equal(farSeekComplete, false, 'a far seek waits for the index in progress')
  assert.deepEqual(deferred.forcedSeeks, [[previousPosition, false]], 'waiting for a far seek releases old read-ahead')
  assert.equal(deferred.independentReads.length, 2, 'neither seek started a competing index load')
  deferred.releasePrefetch()
  assert.ok(await farSeek > 0n)
  assert.deepEqual(deferred.indexBytes(), { primary: 0, ranged: indexSize })
  assert.equal(video.nbFrames, BigInt(frameCount))
  assert.equal(audio.nbFrames, BigInt(frameCount))
  assert.equal((await deferred.packet()).dts, 2400n)
  assert.equal((await deferred.packet()).dts, 1920000n, 'far seek retains the audio byte timestamp')

  for (const [options, ranged, nonInterleaved] of [
    [{ range: false }, 0, false],
    [{ flags: 0x830 }, 0, true],
    [{ duplicateAt: 1 }, prefixSize, true],
    [{ openDml: true }, 0, false]
  ]) {
    const eager = await start(options)
    assert.deepEqual(eager.indexBytes(), { primary: indexSize, ranged })
    assert.equal(eager.demuxer.context.nonInterleaved, nonInterleaved)
  }

  const unindexed = await start({ flags: 0, hasIndex: false })
  const unindexedVideo = unindexed.context.streams[0]
  assert.ok(await unindexed.demuxer.seek(unindexed.context, unindexedVideo, 101n, 0) < 0n)
  assert.deepEqual(unindexed.indexBytes(), { primary: 0, ranged: 0 })
  assert.equal((await unindexed.packet()).streamIndex, 1, 'an unindexed file remains playable after an unsupported time seek')

  const recovered = await start({ failSuffix: true })
  recovered.releasePrefetch()
  for (let i = 1; i < 4099; i++) {
    const packet = await recovered.packet()
    assert.equal(packet.streamIndex, i % 2)
    if (packet.streamIndex === 0) {
      assert.equal(packet.dts, BigInt(i / 2))
    }
  }
  assert.deepEqual(recovered.indexBytes(), { primary: indexSize, ranged: prefixSize })
  assert.deepEqual(recovered.forcedSeeks, [], 'sequential playback keeps read-ahead')

  const duplicate = await start({ duplicateAt: 4101 })
  duplicate.releasePrefetch()
  for (let i = 1; i < 4101; i++) {
    const packet = await duplicate.packet()
    assert.equal(packet.streamIndex, i % 2)
    if (packet.streamIndex === 0) {
      assert.equal(packet.dts, BigInt(i / 2))
    }
  }
  assert.equal(duplicate.demuxer.context.nonInterleaved, true, 'a late duplicate activates indexed playback')
  assert.deepEqual(duplicate.indexBytes(), { primary: 0, ranged: indexSize })

  const cancelled = await start({ failSuffix: true })
  const cancelledSeek = cancelled.demuxer.seek(cancelled.context, cancelled.context.streams[0], 2401n, 0)
  delete cancelled.context.readAt
  cancelled.releasePrefetch()
  assert.ok(await cancelledSeek < 0n)
  assert.deepEqual(cancelled.indexBytes(), { primary: 0, ranged: prefixSize }, 'teardown prevents an eager retry')
  const ready = await start()
  ready.releasePrefetch()
  await setImmediate()
  assert.ok(await ready.demuxer.seek(ready.context, ready.context.streams[0], 2401n, 0) > 0n)
  assert.deepEqual(ready.forcedSeeks, [], 'a completed prefetch skips a redundant forced seek')

  const byte = await start()
  const bytePosition = byte.context.ioReader.getPos()
  const byteSeek = byte.demuxer.seek(byte.context, null, bytePosition, 3)
  await setImmediate()
  assert.deepEqual(byte.forcedSeeks, [[bytePosition, false]], 'a byte seek also releases old read-ahead')
  byte.releasePrefetch()
  assert.equal(await byteSeek, bytePosition)

  const failed = await start({ failSuffix: true })
  const failedPosition = failed.context.ioReader.getPos()
  const invalidSeek = failed.demuxer.seek(failed.context, failed.context.streams[0], 3000n, 0)
  await setImmediate()
  assert.deepEqual(failed.forcedSeeks, [[failedPosition, false]])
  failed.releasePrefetch()
  assert.ok(await invalidSeek < 0n)
  assert.equal(failed.context.ioReader.getPos(), failedPosition, 'failed seek resumes at the previous media position')
  assert.equal((await failed.packet()).streamIndex, 1)
  await testDemandSeek()
  await testSequentialExtension()
  await testRangeFailureAfterPartialSeek()
  console.log('AVI idx1 startup and seek: 15 cases passed.')
}

test('AVI index startup and seek scenarios', main)


test('AVI EOF seek drains a shorter selected stream but rejects targets beyond the file', async () => {
  const media = await start({ range: false, frames: 30 })
  const [video, audio] = media.context.streams
  // Keep packet data intact; declare a slightly longer video duration to model
  // unequal track ends and the player's global duration seek target.
  video.duration = 31n
  const target = 24800n
  assert.ok(audio.privData.samples.at(-1).dts < target)
  assert.ok(await media.demuxer.seek(media.context, audio, target, 0) >= 0n)
  assert.equal(audio.privData.currentSample, audio.privData.samples.length - 1)
  assert.ok(await media.demuxer.seek(media.context, video, 31n, 0) >= 0n)
  const position = media.context.ioReader.getPos()
  assert.ok(await media.demuxer.seek(media.context, audio, 25600n, 0) < 0n)
  assert.equal(media.context.ioReader.getPos(), position)
})
