import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

const missing = -9223372036854775808n
const flags = { AV_PKT_FLAG_DISCARD: 4 }
const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', ['readAVPacket', 'seek'], {
  AVMediaType: { AVMEDIA_TYPE_VIDEO: 0, AVMEDIA_TYPE_AUDIO: 1, AVMEDIA_TYPE_DATA: 2 },
  AVPacketFlags: flags,
  AVSeekFlags: { BYTE: 2 },
  IOError: { END: -1048576, ABORT: -1048574 },
  errorType: { OPERATE_NOT_SUPPORT: -9 },
  NOPTS_VALUE_BIGINT: missing,
  check: (condition, message) => {
    assert.ok(condition, message)
  },
  unrefAVPacket: (packet) => {
    for (const key of Object.keys(packet)) {
      delete packet[key]
    }
  },
  refAVPacket: (packet, source) => Object.assign(packet, source),
  destroyAVPacket: () => {}
})

function decoder(clips) {
  const iso = new Iso()
  const streams = [0, 1].map((index) => ({ index, codecpar: { codecType: index }, timeBase: { num: 1, den: 90000 } }))
  const opened = []
  iso.info = { type: 'dvd' }
  iso.audioPackets = []
  iso.segmentIndex = 0
  iso.seekTime = 0n
  iso.title = { segments: [
    { inTime: 90000n, outTime: 270000n, start: 0n },
    { inTime: 450000n, outTime: 630000n, start: 180000n }
  ] }
  iso.mapStream = (_, source) => source
  iso.fail = (error) => {
    throw error
  }
  iso.reader = { cancel() {} }
  iso.openSegment = async (index, time) => {
    opened.push({ index, time })
    iso.segmentIndex = index
    const packets = [...clips[index]]
    iso.child = {
      interval: { packetBuffer: [] },
      getStreamByIndex: (index) => streams[index],
      iformat: { async readAVPacket(_, packet) {
        if (!packets.length) {
          return -1048576
        }
        Object.assign(packet, packets.shift())
        return 0
      } }
    }
  }
  return { iso, streams, opened }
}
function packet(pts, streamIndex = 0) {
  return { pts, dts: pts - 3600n, streamIndex, flags: 1 }
}

test('disc clip boundaries preserve video preroll, trim audio and normalize reset timestamps', async () => {
  const { iso } = decoder([
    [packet(86400n), packet(86400n, 1), packet(90000n), packet(266400n), packet(270000n)],
    [packet(446400n), packet(450000n), packet(453600n, 1)]
  ])
  await iso.openSegment(0, 90000n)
  const outputs = []
  for (;;) {
    const output = {}
    const ret = await iso.readAVPacket({}, output)
    if (ret < 0) {
      assert.equal(ret, -1048576); break
    }
    outputs.push(output)
  }
  assert.deepEqual(outputs.filter((p) => !(p.flags & 4)).map((p) => p.pts), [0n, 176400n, 180000n, 183600n])
  assert.deepEqual(outputs.filter((p) => p.flags & 4).map((p) => p.pts), [-3600n, 180000n, 176400n])
  assert.equal(outputs.length, 7)
})

test('disc seek maps the title clock to a clip and trims pre-target output', async () => {
  const { iso, streams, opened } = decoder([[], [packet(450000n), packet(495000n), packet(495000n, 1)]])
  assert.equal(await iso.seek({}, streams[0], 225000n, 0), 0n)
  assert.deepEqual(opened, [{ index: 1, time: 495000n }])
  const preroll = {}
  await iso.readAVPacket({}, preroll)
  assert.equal(preroll.flags & 4, 4)
  const visible = {}
  await iso.readAVPacket({}, visible)
  assert.equal(visible.pts, 225000n)
  assert.equal(visible.flags & 4, 0)
  assert.equal(await iso.seek({}, streams[0], 0n, 2), -9n)
})

const WebDecoder = loadClass('avcodec/src/webcodec/VideoDecoder.ts', 'WebVideoDecoder', ['emitFrame'], {})
test('WebCodecs suppresses discarded video output and releases its alpha frame', () => {
  const decoder = new WebDecoder()
  const output = []
  let closed = 0
  decoder.discardedTimestamps = new Map([[100, 1]])
  decoder.options = { onReceiveVideoFrame: (frame) => output.push(frame.timestamp) }
  decoder.emitFrame({ timestamp: 100, close: () => closed++ }, { close: () => closed++ })
  decoder.emitFrame({ timestamp: 100, close: () => closed++ })
  assert.deepEqual(output, [100])
  assert.equal(closed, 2)
  assert.equal(decoder.discardedTimestamps.size, 0)
})

const AudioFilter = loadClass('avformat/src/bsf/ac3/Ac32RawFilter.ts', 'Ac32RawFilter', ['sendAVPacket'], {
  mapUint8Array: (data) => data,
  reinterpret_cast: (n) => n,
  static_cast: (n) => BigInt(n),
  NOPTS_VALUE: -1,
  NOPTS_VALUE_BIGINT: missing,
  is: { number: (n) => typeof n === 'number' },
  ac3: { parseHeader: () => ({ frameSize: 10, numBlocks: 2, sampleRate: 48000 }) },
  avRescaleQ: (value, from, to) => value * BigInt(from.num) * BigInt(to.den) / (BigInt(from.den) * BigInt(to.num))
})
test('E-AC-3 packets split into frames with sample-accurate durations', () => {
  const filter = new AudioFilter()
  filter.caches = []
  filter.inTimeBase = { num: 1, den: 90000 }
  assert.equal(filter.sendAVPacket({ data: new Uint8Array(20), size: 20, dts: 0n, pts: 0n, pos: 0n }), 0)
  assert.deepEqual(filter.caches.map(({ dts, duration }) => ({ dts, duration })), [
    { dts: 0n, duration: 960 }, { dts: 960n, duration: 960 }
  ])
})
