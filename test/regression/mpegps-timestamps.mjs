import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

const missing = -9223372036854775808n
const Mpegps = loadClass('avformat/src/formats/IMpegpsFormat.ts', 'IMpegpsFormat', ['parseMpeg2Slice'], {
  NOPTS_VALUE_BIGINT: missing,
  errorType: { DATA_INVALID: -2 },
  createAVPacket: () => ({}),
  concatTypeArray: (_, arrays) => Uint8Array.from(arrays.flatMap((data) => [...data]))
})

function picture(reference, group = false) {
  return [...(group ? [0, 0, 1, 0xb8, 0, 0, 0, 0] : []),
    0, 0, 1, 0, reference >> 2, (reference & 3) << 6, 0xff, 0xff,
    0, 0, 1, 1, 0x55, 0x55]
}

function demux() {
  const demuxer = new Mpegps()
  // The fixture contains only GOP, picture and slice start codes.
  demuxer.getMpegVideoNextFrame = (offset, data) => {
    for (let i = offset; i + 3 < data.length; i++) {
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1
        && [0, 0xb3, 0xb7, 0xb8].includes(data[i + 3])) {
        return data[i + 3] === 0xb7 ? i + 4 : i
      }
    }
    return -1
  }
  demuxer.parseSlice = (slice, _, packet) => Object.assign(packet, {
    pts: slice.pts, dts: slice.dts, data: slice.buffers[0]
  })
  const stream = { privData: {} }
  return (data, pts, dts, nextDts = missing) => {
    const context = { interval: { packetBuffer: [] } }
    const first = {}
    const ret = demuxer.parseMpeg2Slice({ buffers: [Uint8Array.from(data)], pts, dts }, context, first, stream, nextDts)
    assert.equal(ret, 0)
    return [first, ...context.interval.packetBuffer]
  }
}

test('sparse DVD PES timestamps preserve B-frame presentation order and linear decode time', () => {
  const refs = [2, 0, 1, 5, 3, 4, 8, 6, 7, 11, 9, 10, 14, 12, 13]
  const packets = demux()(refs.flatMap((ref, i) => picture(ref, i === 0)), 6067293n, 6058284n, 6103329n)
  assert.equal(packets.length, 15)
  assert.deepEqual(packets.map((packet) => packet.dts), refs.map((_, i) => 6058284n + BigInt(i) * 3003n))
  assert.deepEqual(packets.map((packet) => packet.pts), refs.map((ref) => 6061287n + BigInt(ref) * 3003n))
  const presentation = packets.map((packet) => packet.pts).sort((a, b) => Number(a - b))
  assert.ok(presentation.slice(1).every((pts, i) => pts - presentation[i] === 3003n))
})

test('a final untimestamped MPEG-2 group is split using the preceding frame duration', () => {
  const read = demux()
  read([2, 0, 1].flatMap((ref) => picture(ref)), 9009n, 0n, 9009n)
  const tail = read([2, 0, 1].flatMap((ref) => picture(ref)), 18018n, 9009n)
  assert.deepEqual(tail.map(({ dts }) => dts), [9009n, 12012n, 15015n])
  assert.deepEqual(tail.map(({ pts }) => pts), [18018n, 12012n, 15015n])
})

test('a GOP boundary resets temporal references without resetting presentation time', () => {
  const refs = [2, 0, 1, 2, 0, 1]
  const packets = demux()(refs.flatMap((ref, i) => picture(ref, i % 3 === 0)), 9009n, 0n, 18018n)
  assert.deepEqual(packets.map(({ pts }) => pts), [9009n, 3003n, 6006n, 18018n, 12012n, 15015n])
})

test('single-picture PES preserves explicit timestamps', () => {
  const packets = demux()(picture(7), 12345n, 9000n, 12003n)
  assert.equal(packets[0].pts, 12345n)
  assert.equal(packets[0].dts, 9000n)
})

test('sequence end stays on the last frame without emitting an empty packet', () => {
  const packets = demux()([...picture(0), 0, 0, 1, 0xb7], 3003n, 0n, 3003n)
  assert.equal(packets.length, 1)
  assert.deepEqual([...packets[0].data.slice(-4)], [0, 0, 1, 0xb7])
})

function sequence(rate, extension) {
  return [0, 0, 1, 0xb3, 0x2d, 0x01, 0xe0, rate, 0, 0, 0, 0,
    ...(extension === undefined ? [] : [0, 0, 1, 0xb5, 0x10, 0, 0, 0, 0, extension])]
}

test('fresh final GOP recovers NTSC timing from its sequence header without a later PES', () => {
  const refs = [2, 0, 1, 5, 3, 4]
  const packets = demux()([...sequence(4), ...refs.flatMap((r) => picture(r))], 9009n, 0n)
  assert.deepEqual(packets.map(({ pts }) => pts), refs.map((r) => 3003n + BigInt(r) * 3003n))
  assert.deepEqual(packets.map(({ dts }) => dts), refs.map((_, i) => BigInt(i) * 3003n))
})

test('sequence extension and fractional frame rates retain rational timing at EOF', () => {
  const refs = [0, 1, 2, 3, 4]
  // 24000/1001 multiplied by (extension_n + 1)/(extension_d + 1) = 48000/1001.
  const packets = demux()([...sequence(1, 0x20), ...refs.flatMap((r) => picture(r))], 0n, 0n)
  assert.deepEqual(packets.map(({ pts }) => pts), [0n, 1876n, 3753n, 5630n, 7507n])
})
