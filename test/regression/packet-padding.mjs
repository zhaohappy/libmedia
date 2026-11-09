import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { createPacketHarness } from './helpers/packet.mjs'
const { allocAVPacketData, addAVPacketData, unserializeAVPacket, createAVPacket, heap, assertPayloadAndPadding } = createPacketHarness()
const payload = new Uint8Array([0x00, 0x00, 0x01, 0xB6, 0x5E, 0x00, 0xFF])

test('Packet allocation and worker transfer preserve padding', async () => {
  const packet = createAVPacket()
  const data = allocAVPacketData(payload.length)
  heap.set(payload, data)
  addAVPacketData(packet, data, payload.length)
  assertPayloadAndPadding(packet, payload)

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
  console.log('Packet allocation and worker round-trip payload/padding cases passed.')
})
