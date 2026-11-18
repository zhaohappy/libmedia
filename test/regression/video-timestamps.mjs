import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import assert from 'node:assert/strict'

const Decoder = loadClass(
  'avcodec/src/wasmcodec/VideoDecoder.ts', 'WasmVideoDecoder',
  ['lastOutputPTS', 'decode', 'decodeAsync', 'flush', 'flushAsync', 'outputAVFrame'], {
    AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 1 }, AVFrameFlags: { AV_FRAME_FLAG_DISCARD: 4 }, NOPTS_VALUE_BIGINT: -1n, nullptr: null
  }
)
for (const method of ['flush', 'flushAsync']) {
  for (const endCode of [0, -1]) {
    test(`${method} clears drained DTS with return code ${endCode}`, async () => {
      const decoder = new Decoder()
      const outputs = []
      decoder.frame = { bestEffortTimestamp: -1n, timeBase: {} }
      decoder.timeBase = { den: 1000, num: 1 }
      decoder.parameters = { flags: 1 }
      decoder.dtsQueue = [7200n, 7235n]
      decoder.decoder = {
        invoke: (name) => assert.equal(name, 'decoder_flush'),
        invokeAsync: async (name) => assert.equal(name, 'decoder_flush')
      }
      decoder.options = { onReceiveAVFrame: (frame) => outputs.push(frame.pts) }
      const drained = [1, endCode]
      decoder.receiveAVFrame = () => drained.shift()
      decoder.receiveAVFrameAsync = async () => drained.shift()
      assert.equal(await decoder[method](), endCode)
      assert.deepEqual(outputs, [7200n], 'drained frames retain their original timestamps')
      decoder.dtsQueue.push(1800n)
      decoder.frame = { bestEffortTimestamp: -1n, timeBase: {} }
      decoder.outputAVFrame()
      assert.deepEqual(outputs, [7200n, 1800n], `${method}: backward seek starts with the new timestamp`)
    })
  }
}

test('discarded WASM preroll releases its frame and consumes the corresponding DTS', () => {
  const decoder = new Decoder()
  const released = []
  const outputs = []
  decoder.frame = { flags: 4, bestEffortTimestamp: -1n, timeBase: {} }
  decoder.timeBase = { den: 1000, num: 1 }
  decoder.parameters = { flags: 1 }
  decoder.dtsQueue = [-40n, 0n]
  decoder.options = {
    onReceiveAVFrame: (frame) => outputs.push(frame.pts),
    avframePool: { release: (frame) => released.push(frame) }
  }
  decoder.outputAVFrame()
  assert.equal(released.length, 1)
  assert.deepEqual(outputs, [])
  decoder.frame = { flags: 0, bestEffortTimestamp: -1n, timeBase: {} }
  decoder.outputAVFrame()
  assert.deepEqual(outputs, [0n])
})

for (const method of ['decode', 'decodeAsync']) {
  test(`${method} uses decoded timestamps across skipped packets and delayed output`, async () => {
    const decoder = new Decoder()
    const pending = []
    const output = []
    decoder.parameters = { flags: 1 }
    decoder.dtsQueue = []
    decoder.options = { onReceiveAVFrame: (frame) => output.push(frame.pts) }
    const submit = (name, packet) => {
      assert.equal(name, 'decoder_decode')
      // Model decoder delay and skip_frame at the WASM boundary.
      // No output does not mean the input was dropped.
      for (const timestamp of packet.outputs) {
        pending.push({ pts: -1n, bestEffortTimestamp: timestamp, flags: 0, timeBase: {} })
      }
      return 0
    }
    decoder.decoder = { invoke: submit, invokeAsync: async (...args) => submit(...args) }
    decoder.receiveAVFrame = () => {
      decoder.frame = pending.shift()
      return decoder.frame ? 1 : 0
    }
    decoder.receiveAVFrameAsync = async () => decoder.receiveAVFrame()
    for (const [dts, outputs] of [[0n, []], [33n, [0n]], [66n, []], [100n, []], [133n, [100n]], [166n, [133n]]]) {
      assert.equal(await decoder[method]({ dts, outputs, timeBase: { num: 1, den: 1000 } }), 0)
    }
    assert.deepEqual(output, [0n, 100n, 133n])
    assert.deepEqual(decoder.dtsQueue, [166n], 'only the delayed frame remains after skipped DTS are retired')
    decoder.frame = { pts: -1n, bestEffortTimestamp: -1n, flags: 0, timeBase: {} }
    decoder.outputAVFrame()
    assert.deepEqual(output, [0n, 100n, 133n, 166n], 'EOF without a timestamp uses the remaining DTS')
  })
}

test('decoded timestamps do not replace known presentation timestamps', () => {
  const decoder = new Decoder()
  const output = []
  decoder.parameters = { flags: 0 }
  decoder.timeBase = { num: 1, den: 1000 }
  decoder.frame = { pts: 100n, bestEffortTimestamp: 133n, flags: 0, timeBase: {} }
  decoder.options = { onReceiveAVFrame: (frame) => output.push(frame.pts) }
  decoder.outputAVFrame()
  assert.deepEqual(output, [100n])
})

test('discarded decoded preroll retires skipped DTS without delivering a frame', () => {
  const decoder = new Decoder()
  const released = []
  decoder.parameters = { flags: 1 }
  decoder.dtsQueue = [-120n, -80n, -40n, 0n]
  decoder.frame = { pts: -1n, bestEffortTimestamp: -40n, flags: 4, timeBase: {} }
  decoder.options = {
    onReceiveAVFrame: () => assert.fail('discarded preroll must not be delivered'),
    avframePool: { release: (frame) => released.push(frame) }
  }
  decoder.outputAVFrame()
  assert.equal(released.length, 1)
  assert.deepEqual(decoder.dtsQueue, [0n])
})

test('lowering playback speed resets the adaptive discard state to the applied policy', async () => {
  const AVDiscard = { AVDISCARD_DEFAULT: 0, AVDISCARD_NONREF: 8, AVDISCARD_NONINTRA: 24, AVDISCARD_NONKEY: 32 }
  const Pipeline = loadClass(
    'avpipeline/src/VideoDecodePipeline.ts', 'VideoDecodePipeline',
    ['getMaxDiscard', 'setPlayRate', 'setNextDiscard', 'setPrevDiscard'], {
      AVDiscard, AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 1 }, avQ2D: () => 30, logger: { info() {} }
    }
  )
  const pipeline = new Pipeline()
  const applied = []
  const task = { parameters: { framerate: {} }, playRate: 1, discard: 0,
    softwareDecoder: { setSkipFrameDiscard: (value) => applied.push(value) } }
  pipeline.tasks = new Map([['video', task]])
  await pipeline.setPlayRate('video', 15)
  assert.equal(task.discard, 32)
  await pipeline.setPlayRate('video', 1)
  assert.equal(task.discard, 0)
  await pipeline.setNextDiscard('video')
  await pipeline.setPrevDiscard('video')
  assert.deepEqual(applied, [32, 0, 8, 0])
  task.parameters.flags = 1
  await pipeline.setPlayRate('video', 15)
  assert.equal(task.discard, 8, 'NO_PTS decoding retains reference frames even at 15x')
  await pipeline.setNextDiscard('video')
  assert.equal(task.discard, 8, 'adaptive discard cannot reintroduce intra-only decoding')
  await pipeline.setPlayRate('video', 1)
  assert.equal(task.discard, 0)
})

for (const [rate, frame, expectedWakeups] of [[1500n, { timestamp: 200 }, 1], [100n, { timestamp: 200 }, 0], [1500n, -1, 0]]) {
  test(`video render wakes for decoded frames at rate ${rate}, EOF=${frame === -1}`, async () => {
    const Renderer = loadClass('avpipeline/src/VideoRenderPipeline.ts', 'VideoRenderPipeline', ['swap'], {
      isPointer: () => false,
      isAlphaVideoFrame: () => false,
      is: { number: (value) => typeof value === 'number' },
      avRescaleQ: (value) => value,
      static_cast: (value) => BigInt(value),
      AV_TIME_BASE_Q: null,
      AV_MILLI_TIME_BASE_Q: null,
      assert
    })
    const renderer = new Renderer()
    let wakeups = 0
    renderer.pullFrame = async () => frame
    const task = { frontBuffered: true, frontFrame: { timestamp: 100 }, stats: {}, playRate: rate,
      loop: { resetInterval: () => wakeups++ } }
    assert.equal(renderer.swap(task), true)
    await Promise.resolve()
    assert.equal(wakeups, expectedWakeups)
    assert.equal(task.ended === true, frame === -1)
  })
}

test('delayed EOF frame without a remaining DTS has a valid timestamp', () => {
  const decoder = new Decoder()
  const output = []
  decoder.parameters = { flags: 1 }
  decoder.timeBase = { num: 1, den: 1000 }
  decoder.dtsQueue = [0n, 33n]
  decoder.options = { onReceiveAVFrame: (frame) => output.push(frame.pts) }
  decoder.frame = { pts: -1n, bestEffortTimestamp: 33n, duration: 33n, flags: 0, timeBase: {} }
  decoder.outputAVFrame()
  assert.deepEqual(decoder.dtsQueue, [])
  decoder.frame = { pts: -1n, bestEffortTimestamp: -1n, duration: 33n, flags: 0, timeBase: {} }
  decoder.outputAVFrame()
  assert.deepEqual(output, [33n, 66n])
})
