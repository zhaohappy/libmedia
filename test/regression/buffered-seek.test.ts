import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { PacketHistory, planBufferedSeek, type BufferedPacket } from '../../packages/avpipeline/src/BufferedSeek'

function packets(video: boolean, end = 5000): BufferedPacket[] {
  return Array.from({ length: end / 20 + 1 }, (_, index) => ({
    pts: BigInt(index * 20), dts: BigInt(index * 20 - (video ? 40 : 0)),
    key: !video || index % 50 === 0, usable: true, configuration: false
  }))
}
function streams() {
  return [{ index: 0, video: true, packets: packets(true) }, { index: 1, video: false, packets: packets(false) }]
}

test('buffered seek starts at the preceding video keyframe and matching audio', () => {
  const input = streams()
  const before = structuredClone(input)
  assert.deepEqual(planBufferedSeek(input, 2450n), new Map([[0, 100], [1, 100]]))
  assert.deepEqual(input, before, 'planning is atomic and does not mutate packet queues')
  assert.equal(planBufferedSeek(input, -1n), undefined)
  assert.equal(planBufferedSeek(input, 5000n), undefined, 'tail without decoding runway is a miss')
})

test('buffered seek accepts reordered PTS while preserving decode order', () => {
  const input = streams()
  const a = input[0].packets[110]
  const b = input[0].packets[111]
  ;[a.pts, b.pts] = [b.pts, a.pts]
  assert.ok(planBufferedSeek(input, 2450n))
})

for (const fault of ['keyframe', 'audio-head', 'audio-tail', 'audio-gap', 'video-gap', 'discontinuity', 'discard', 'configuration']) {
  test(`buffered seek falls back for ${fault} without accepting partial coverage`, () => {
    const input = streams()
    if (fault === 'keyframe') {
      input[0].packets.forEach((packet) => packet.key = false)
    }
    else if (fault === 'audio-head') {
      input[1].packets = input[1].packets.slice(101)
    }
    else if (fault === 'audio-tail') {
      input[1].packets = input[1].packets.slice(0, 120)
    }
    else if (fault === 'audio-gap') {
      input[1].packets.splice(102, 12)
    }
    else if (fault === 'video-gap') {
      input[0].packets[110].dts += 1200n
    }
    else if (fault === 'discontinuity') {
      input[0].packets[110].dts = 0n
    }
    else if (fault === 'discard') {
      input[0].packets[110].usable = false
    }
    else {
      input[0].packets[110].configuration = true
    }
    assert.equal(planBufferedSeek(input, 2450n), undefined)
  })
}

test('audio-only buffered seek requires complete coverage and no video keyframe', () => {
  const audio = streams().slice(1)
  assert.deepEqual(planBufferedSeek(audio, 2450n), new Map([[1, 122]]))
})

test('history bounds memory/count, transfers ownership and frees exactly once', () => {
  const released: number[] = []
  const history = new PacketHistory<number>((packet) => released.push(packet), 1000, 4)
  for (let i = 0; i < 6; i++) {
    history.push(i % 2, i, 200)
  }
  assert.deepEqual(released, [0, 1])
  assert.deepEqual(history.packets(0), [2, 4])
  assert.deepEqual(history.take(0, 1), [4])
  history.push(1, 6, 600)
  assert.deepEqual(released, [0, 1, 2])
  history.clear()
  history.clear()
  assert.deepEqual(released, [0, 1, 2, 3, 5, 6])
  assert.equal(new Set(released).size, released.length)
})

test('oversized or invalid history entries invalidate prior continuity', () => {
  for (const size of [1001, -1, NaN]) {
    const released: number[] = []
    const history = new PacketHistory<number>((packet) => released.push(packet), 1000)
    history.push(0, 1, 20)
    history.push(0, 2, size)
    assert.deepEqual(history.packets(0), [])
    assert.deepEqual(released, [1, 2])
  }
})
