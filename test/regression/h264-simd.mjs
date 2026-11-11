import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from './helpers/test.mjs'
import { decodeH264 } from './helpers/h264-wasm.mjs'

const sample = readFileSync(new URL('./fixtures/h264-idct8/sample.h264', import.meta.url))
// A minimal memory64 module; skip only when the host lacks memory64 support.
const supportsMemory64 = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1]))
for (const variant of ['simd', '64']) {
  test(`H.264 ${variant} IDCT8 matches native FFmpeg pixels`, {
    skip: variant === '64' && !supportsMemory64 ? 'Host does not support WebAssembly memory64' : false
  }, () => {
    const wasm = readFileSync(new URL(`../../dist/decode/h264-${variant}.wasm`, import.meta.url))
    assert.deepEqual(decodeH264(wasm, sample, variant), {
      frames: 4,
      sha256: '70a7f2f6c90091441bfa40f340fa0abd4c240cf6ce4dd170447d81a35df5341c'
    })
  })
}
