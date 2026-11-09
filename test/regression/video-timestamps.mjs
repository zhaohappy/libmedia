import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import assert from 'node:assert/strict'

const Decoder = loadClass(
  'avcodec/src/wasmcodec/VideoDecoder.ts', 'WasmVideoDecoder',
  ['flush', 'flushAsync', 'outputAVFrame'], {
    AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 1 }, AVFrameFlags: { AV_FRAME_FLAG_DISCARD: 4 }, nullptr: null
  }
)
for (const method of ['flush', 'flushAsync']) {
  for (const endCode of [0, -1]) {
    test(`${method} clears drained DTS with return code ${endCode}`, async () => {
      const decoder = new Decoder()
      const outputs = []
      decoder.frame = { timeBase: {} }
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
      decoder.frame = { timeBase: {} }
      decoder.outputAVFrame()
      assert.deepEqual(outputs, [7200n, 1800n], `${method}: backward seek starts with the new timestamp`)
    })
  }
}

test('discarded WASM preroll releases its frame and consumes the corresponding DTS', () => {
  const decoder = new Decoder()
  const released = []
  const outputs = []
  decoder.frame = { flags: 4, timeBase: {} }
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
  decoder.frame = { flags: 0, timeBase: {} }
  decoder.outputAVFrame()
  assert.deepEqual(outputs, [0n])
})
