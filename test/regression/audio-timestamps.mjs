import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'

const missing = -1n
const ffmpegMissing = -9223372036854775808n
const Decoder = loadClass(
  'avcodec/src/wasmcodec/AudioDecoder.ts', 'WasmAudioDecoder',
  ['nextPts', 'nextSampleRate', 'startPts', 'decode', 'outputAVFrame', 'flush'], {
    NOPTS_VALUE_BIGINT: missing, nullptr: null, static_cast: BigInt,
    avRescaleQ: (value, from, to) => value * BigInt(from.num) * BigInt(to.den)
      / (BigInt(from.den) * BigInt(to.num))
  }
)

function fixture(timeBase = { num: 1, den: 1000 }) {
  const decoder = new Decoder()
  const output = []
  decoder.timeBase = timeBase
  decoder.options = { onReceiveAVFrame: (frame) => output.push({ ...frame, timeBase: { ...frame.timeBase } }) }
  function frame(pts = ffmpegMissing, nbSamples = 2048, sampleRate = 44100) {
    return { pts, nbSamples, sampleRate, timeBase: {} }
  }
  function emit(pts, nbSamples, sampleRate) {
    decoder.frame = frame(pts, nbSamples, sampleRate)
    decoder.outputAVFrame()
    return output.at(-1)
  }
  return { decoder, output, frame, emit }
}

test('WASM audio fills missing timestamps using each preceding frame sample count', () => {
  const { emit } = fixture()
  assert.equal(emit(220417n, 2048).pts, 220417n)
  assert.equal(emit(missing, 1024).pts, 220463n)
  assert.equal(emit(missing, 512).pts, 220486n)
  assert.equal(emit().pts, 220498n)
})

test('WASM audio retains fractional ticks over a long run of untimestamped frames', () => {
  const { emit } = fixture()
  emit(1000n)
  for (let i = 1; i <= 10000; i++) {
    assert.equal(emit().pts, 1000n + BigInt(i) * 2048n * 1000n / 44100n)
  }
})

test('WASM audio preserves known timestamps and reanchors across discontinuities', () => {
  const { emit } = fixture()
  emit(900000n)
  emit()
  assert.equal(emit(1234n).pts, 1234n)
  assert.equal(emit().pts, (1234n * 44100n / 1000n + 2048n) * 1000n / 44100n)
  assert.equal(emit(8000000n).pts, 8000000n)
  assert.equal(emit().pts, 8000046n)
})

test('WASM audio never invents an origin when no frame has a timestamp', () => {
  const { emit } = fixture()
  assert.equal(emit().pts, missing)
  assert.equal(emit().pts, missing)
  assert.equal(emit(0n).pts, 0n)
  assert.equal(emit().pts, 46n)
})

test('WASM audio recognizes both FFmpeg and libmedia missing timestamps', () => {
  const { emit } = fixture()
  emit(1000n)
  assert.equal(emit(ffmpegMissing).pts, 1046n)
  assert.equal(emit(missing).pts, 1092n)
  assert.equal(emit(ffmpegMissing).pts, 1139n)
})

test('WASM audio handles negative preroll and non-millisecond packet timebases', () => {
  const { emit } = fixture({ num: 1, den: 90000 })
  assert.equal(emit(-9000n, 1024, 48000).pts, -9000n)
  assert.equal(emit(missing, 1024, 48000).pts, -7080n)
  assert.equal(emit(missing, 1024, 48000).pts, -5160n)
})

test('WASM audio rescales the sample clock when the decoded sample rate changes', () => {
  const { emit } = fixture()
  emit(1000n, 441, 44100)
  assert.equal(emit(missing, 480, 48000).pts, 1010n)
  assert.equal(emit(missing, 480, 48000).pts, 1020n)
})

for (const endCode of [0, -1]) {
  test(`WASM audio drains the old timeline then forgets it on flush (${endCode})`, async () => {
    const { decoder, frame, emit, output } = fixture()
    emit(6259848n)
    decoder.decoder = { invoke: (name) => assert.equal(name, 'decoder_flush') }
    const pending = [frame(), frame(), endCode]
    decoder.receiveAVFrame = () => {
      const next = pending.shift()
      if (typeof next === 'number') {
        return next
      }
      decoder.frame = next
      return 1
    }
    assert.equal(await decoder.flush(), endCode)
    assert.ok(output[1].pts > 6259848n && output[2].pts > output[1].pts)
    assert.equal(emit().pts, missing, 'a new seek cannot inherit the drained clock')
    assert.equal(emit(8817n).pts, 8817n)
    assert.ok(emit().pts > 8817n && output.at(-1).pts < 8900n)
  })
}

test('WASM audio cannot extrapolate across a frame with no sample rate', () => {
  const { emit } = fixture()
  emit(1000n)
  assert.equal(emit(missing, 1024, 0).pts, missing)
  assert.equal(emit().pts, missing)
  emit(2000n)
  assert.equal(emit().pts, 2046n)
})

for (const dtsOnly of [false, true]) {
  test(`WASM audio anchors initially missing frames to the first accepted packet, DTS only=${dtsOnly}`, () => {
    const { decoder, frame, output } = fixture()
    const pending = []
    decoder.decoder = { invoke: (name, packet) => {
      assert.equal(name, 'decoder_decode')
      pending.push(...packet.frames)
      return 0
    } }
    decoder.receiveAVFrame = () => {
      decoder.frame = pending.shift()
      return decoder.frame ? 1 : 0
    }
    const submit = (pts, frames) => decoder.decode({ pts: dtsOnly ? missing : pts,
      dts: pts, timeBase: decoder.timeBase, frames })
    submit(1000n, [])
    submit(1184n, [])
    submit(1370n, [frame(), frame(), frame(1370n), frame()])
    assert.deepEqual(output.map((f) => f.pts), [1000n, 1046n, 1370n, 1416n])
  })
}

test('WASM audio discards an unconsumed packet anchor on seek and ignores rejected packets', async () => {
  const { decoder, emit } = fixture()
  decoder.decoder = { invoke: (name, packet) => name === 'decoder_decode' ? packet.ret : 0 }
  decoder.receiveAVFrame = () => 0
  assert.equal(decoder.decode({ pts: 900000n, dts: 900000n, timeBase: decoder.timeBase, ret: 0 }), 0)
  await decoder.flush()
  assert.equal(decoder.decode({ pts: 800000n, dts: 800000n, timeBase: decoder.timeBase, ret: -1 }), -1)
  assert.equal(emit().pts, missing)
  decoder.decode({ pts: 0n, dts: 0n, timeBase: decoder.timeBase, ret: 0 })
  assert.equal(emit().pts, 0n)
  assert.equal(emit().pts, 46n)
})
