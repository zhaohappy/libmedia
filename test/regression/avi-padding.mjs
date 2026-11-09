import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { createPacketHarness } from './helpers/packet.mjs'
import { classSource } from './helpers/source.mjs'
const program = classSource('avformat/src/formats/IAviFormat.ts', 'IAviFormat', ['readAVPacket_', 'writeMp3Frame', 'getDuration'], 'AviDemuxer')
const { AviDemuxer, unserializeAVPacket, createAVPacket, assertPayloadAndPadding } = createPacketHarness(program, ['AviDemuxer'])
const payload = new Uint8Array([0x00, 0x00, 0x01, 0xB6, 0x5E, 0x00, 0xFF])

test('AVI packets and MP3 frames preserve padding', async () => {
  const demuxer = new AviDemuxer()
  demuxer.context = { currentIndex: 0, remaining: payload.length, hasVideoKey: false }
  const avpacket = createAVPacket()
  const stream = { index: 0, codecpar: { codecId: 12, codecType: 0, flags: 0 }, timeBase: { num: 1, den: 30 }, privData: { currentDts: 9n, dwSampleSize: 0 } }
  const ioReader = { getPos: () => 128n, readBuffer: async (size, target) => target.set(payload.subarray(0, size)) }
  assert.equal(await demuxer.readAVPacket_({ streams: [stream], ioReader }, avpacket), 0)
  assertPayloadAndPadding(avpacket, payload)
  assert.equal(avpacket.pos, 120n)
  assert.equal(avpacket.dts, 9n)
  assert.equal(avpacket.pts, 9n)
  assert.equal(avpacket.flags, 1)

  const mp3 = createAVPacket()
  demuxer.writeMp3Frame(mp3, { index: 1, timeBase: { num: 1, den: 24000 } }, { data: payload, dts: 700n, duration: 626n, pos: 181n })
  assertPayloadAndPadding(mp3, payload)
  assert.equal(mp3.duration, 626n)

  for (const bytes of [payload, new Uint8Array(0)]) {
    const source = {
      data: bytes,
      pts: 19n,
      dts: 18n,
      pos: 120n,
      streamIndex: 2,
      duration: 3n,
      flags: 5,
      timeBase: { num: 1, den: 30 },
      sideData: [{ type: 31, data: new Uint8Array([1, 0, 3]) }]
    }
    const result = unserializeAVPacket(source)
    assertPayloadAndPadding(result, bytes)
    for (const key of ['pts', 'dts', 'pos', 'streamIndex', 'duration', 'flags', 'timeBase']) {
      assert.deepEqual(result[key], source[key])
    }
    assert.deepEqual(result.sideData, { type: 31, bytes: [1, 0, 3] })
  }
  console.log('AVI packet, AVI MP3 frame, and worker round-trip payload/padding cases passed.')
})
