import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import assert from 'node:assert/strict'

const Resampler = loadClass('audioresample/src/Resampler.ts', 'Resampler', ['resample'])

for (const [name, format, channels, reallocate] of [
  ['packed to planar when returning to 1x', 3, 2, true],
  ['planar to packed when enabling time stretching', 8, 2, true],
  ['channel count change', 8, 1, true],
  ['matching allocation', 8, 2, false]
]) {
  test(`resampler validates pooled PCM layout: ${name}`, () => {
    const sampler = new Resampler()
    sampler.outputParameters = { format: name.startsWith('planar to packed') ? 3 : 8, channels: 2 }
    const output = { format, channels, maxnbSamples: 4096, data: 'existing allocation' }
    let calls = 0
    sampler.resampler = {
      invoke(method, input, pcm, samples) {
        calls++
        assert.equal(method, 'resample_process')
        assert.equal(input, 'input')
        assert.equal(samples, 1152)
        // The WASM allocator checks capacity before reusing its plane pointers.
        assert.equal(pcm.maxnbSamples < samples, reallocate)
        assert.equal(pcm.data, 'existing allocation', 'WASM must retain ownership of the old allocation')
        return 0
      }
    }
    assert.equal(sampler.resample('input', output, 1152), 0)
    assert.equal(calls, 1)
  })
}
