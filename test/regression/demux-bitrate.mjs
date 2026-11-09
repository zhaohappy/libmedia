import { test } from './helpers/test.mjs'
import { evaluate, readSource, ts } from './helpers/source.mjs'
import assert from 'node:assert/strict'

const source = readSource('avformat/src/demux.ts')
const analyze = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'analyzeStreams')
const calculate = analyze.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'calculate')
assert.ok(calculate)

function analyzer(bitrate) {
  const streamDtsMap = { 0: [143n, 271n, 399n, 592n, 719n, 847n, 1040n] }
  const streamBitMap = { 0: 7 * 960 }
  const stream = {
    index: 0, startTime: 143n, timeBase: { num: 1, den: 1000 },
    codecpar: { codecType: 1, bitrate, sampleRate: 32000, frameSize: 2048, videoDelay: 0 }
  }
  const update = evaluate(`${calculate.getText(source)}\nreturn calculate`, {
    streamDtsMap, streamBitMap, streamPtsMap: {}, estimatedBitrates: new Set(),
    AVMediaType: { AVMEDIA_TYPE_AUDIO: 1, AVMEDIA_TYPE_VIDEO: 0 },
    static_cast: (value) => Number(value)
  })
  return { stream, streamDtsMap, streamBitMap, update }
}

test('stream analysis preserves the declared WMA bitrate across preliminary and final analysis', () => {
  const { stream, update } = analyzer(40000n)
  update(stream, false)
  update(stream, true)
  assert.equal(stream.codecpar.bitrate, 40000n, 'packet rate estimates must not change WMA decoding tables')
})

for (const missing of [0n, -1n]) {
  test(`stream analysis estimates a missing bitrate (${missing}) and refines it as more packets arrive`, () => {
    const { stream, update, streamDtsMap, streamBitMap } = analyzer(missing)
    update(stream, false)
    const first = stream.codecpar.bitrate
    assert.ok(first > 0)
    streamDtsMap[0].push(1167n, 1295n, 1423n, 1616n)
    streamBitMap[0] += 4 * 960
    update(stream, true)
    assert.equal(stream.codecpar.bitrate, 11 * 960 * 8 / 1.473)
    assert.notEqual(stream.codecpar.bitrate, first)
  })
}

test('stream analysis does not estimate bitrate from nonpositive timestamp spans', () => {
  const { stream, update, streamDtsMap } = analyzer(0n)
  for (const timestamps of [[143n, 143n], [143n, 100n]]) {
    streamDtsMap[0] = timestamps
    update(stream, true)
    assert.equal(stream.codecpar.bitrate, 0n)
  }
})
