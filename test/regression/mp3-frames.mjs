import assert from 'node:assert/strict'
import { test as it } from './helpers/test.mjs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { checkout } from './helpers/source.mjs'
const { default: Reader } = await import(pathToFileURL(resolve(checkout, 'packages/avformat/src/formats/avi/Mp3FrameReader.ts')))

function frame(length, second, third) {
  const data = new Uint8Array(length).fill(0x5A)
  data.set([0xFF, second, third, 0x00])
  return data
}

function makeReader(sampleSize = 1) {
  return new Reader({ num: 1, den: 24000 }, sampleSize)
}

it('discards leading padding and assembles a header split over four AVI chunks', () => {
  /** MPEG-1, 192kbps, CRC */
  const first = frame(626, 0xFA, 0xB0)
  const second = frame(418, 0xFB, 0x92) /** MPEG-1, 128kbps, padded */
  const third = frame(626, 0xFB, 0xB0)
  const reader = makeReader()
  reader.append(new Uint8Array(626), 0n, 100n)
  assert.equal(reader.read(), undefined)
  for (let i = 0; i < 4; i++) {
    reader.append(first.subarray(i, i + 1), 626n + BigInt(i), 200n + BigInt(i))
    assert.equal(reader.read(), undefined)
  }
  reader.append(first.subarray(4), 630n, 204n)
  assert.equal(reader.read(), undefined)
  reader.append(second.subarray(0, 3), 1252n, 300n)
  assert.equal(reader.read(), undefined)
  reader.append(second.subarray(3), 1255n, 400n)
  assert.deepEqual(reader.read(), { data: first, pos: 200n, dts: 626n, duration: 626n })
  assert.deepEqual(reader.read(), { data: second, pos: 300n, dts: 1252n, duration: 627n })
  reader.append(third.subarray(0, 116), 1670n, 500n)
  assert.equal(reader.read(), undefined)
  assert.equal(reader.read(true), undefined)
})

it('a new reader after seek re-synchronizes in a frame payload and uses the new AVI anchor', () => {
  const fake = frame(626, 0xFB, 0xB0)
  const real = frame(627, 0xFB, 0xB2)
  const prior = makeReader()
  prior.append(fake.subarray(0, 12), 0n, 100n)
  assert.equal(prior.read(), undefined)
  const reader = makeReader()
  const chunk = new Uint8Array(700 + 627 + 4)
  // A plausible header at an incorrect position.
  chunk.set(fake, 5)
  chunk.set(real, 700)
  chunk.set(real.subarray(0, 4), 1327)
  reader.append(chunk, 8000n, 1000n)
  assert.deepEqual(reader.read(), { data: real, pos: 1000n, dts: 8700n, duration: 626n })
  assert.equal(reader.read(true), undefined)
})

for (const [name, versionHeader, length, rate] of [
  ['MPEG-2', 0xF3, 208, 22050],
  ['MPEG-2.5', 0xE3, 417, 11025]
]) {
  it(`${name} calculates duration from decoded samples and flushes one complete frame at EOF`, () => {
    const data = frame(length, versionHeader, 0x80)
    const reader = makeReader(0)
    const chunk = new Uint8Array(length + 2)
    chunk.set(data)
    chunk.set(data.subarray(0, 2), length)
    reader.append(chunk, 15n, 100n)
    assert.equal(reader.read(), undefined)
    assert.deepEqual(reader.read(true), { data, pos: 100n, dts: 15n, duration: 576n * 24000n / BigInt(rate) })
    assert.equal(reader.read(true), undefined)
  })
}
