import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { readSource, getClass, ts, evaluate } from './helpers/source.mjs'

const source = readSource('avpipeline/src/AudioRenderPipeline.ts')
const create = getClass(source, 'AudioRenderPipeline').members.find((node) => node.name?.getText(source) === 'createTask')
function closure(name, env, receiver = {}) {
  const declaration = create.body.statements.find((node) => ts.isVariableStatement(node)
    && node.declarationList.declarations.some((entry) => entry.name.getText(source) === name))
  assert.ok(declaration)
  return evaluate(`return function () { ${declaration.getText(source)}; return ${name} }`, env).call(receiver)
}
function fixture() {
  const heap = new ArrayBuffer(1024)
  const buffer = { data: [0, 32], maxnbSamples: 8, nbSamples: 0, channels: 2 }
  new Float32Array(heap).fill(99)
  const task = { playChannels: 2, stopping: false, ended: false }
  const env = {
    task, IOError: { END: -2 }, nullptr: null, sizeof: (value) => value, float: 4,
    reinterpret_cast: (value) => value, addressof: (value) => value,
    memset: (position, value, length) => new Uint8Array(heap, position, length).fill(value),
    memcpy: (to, from, length) => new Uint8Array(heap, to, length).set(new Uint8Array(heap, from, length)),
    pullNewAudioFrame: async () => -2
  }
  function write(offset, count) {
    for (let channel = 0; channel < 2; channel++) {
      new Float32Array(heap, buffer.data[channel] + offset * 4, count).fill(channel + 1)
    }
    return count
  }
  function check(count) {
    for (let channel = 0; channel < 2; channel++) {
      assert.deepEqual(
        [...new Float32Array(heap, buffer.data[channel], 8)],
        [...Array(count).fill(channel + 1), ...Array(8 - count).fill(0)]
      )
    }
    assert.equal(buffer.nbSamples, count)
  }
  return { heap, buffer, task, env, write, check }
}
test('partial final PCM preserves both channels and zeroes only their unused tails', async () => {
  const { heap, buffer, task, env, check } = fixture()
  new Float32Array(heap, 128, 3).fill(1)
  new Float32Array(heap, 160, 3).fill(2)
  task.waitPCMBuffer = { data: [128, 160], nbSamples: 3 }
  task.waitPCMBufferPos = 0
  const receive = closure('receiveToPCMBuffer', env, { avPCMBufferPool: { release() {} } })
  assert.equal(await receive(buffer), 0)
  check(3)
})
for (const alreadyEnded of [false, true]) {
  test(`stretch drain keeps returned samples (alreadyEnded=${alreadyEnded})`, async () => {
    const { buffer, task, env, write, check } = fixture()
    task.useStretchpitcher = true
    task.ended = alreadyEnded
    task.stretchpitcher = { flush() {} }
    let pulls = 0
    env.receiveSamplesFromStretchpitcher = (_, offset) => write(offset, alreadyEnded ? 3 : pulls++ ? 3 : 2)
    const receive = closure('receiveToPCMBuffer', env)
    assert.equal(await receive(buffer), 0)
    check(alreadyEnded ? 3 : 5)
    assert.equal(task.stretchpitcherEnded, true)
  })
}
test('ordinary Worker serializes full channel strides for a partial final buffer', async () => {
  const { heap, buffer, task, env, write } = fixture()
  Object.assign(task, { firstPlayed: true, currentPTS: 0n, audioMasterForce: true,
    outPCMBuffer: buffer, masterTimer: { getMasterTime: () => 0n } })
  let result
  const handler = closure('handlePCMRequest', {
    ...env, MASTER_SYNC_THRESHOLD: 400n,
    receiveToPCMBuffer: async () => {
      new Uint8Array(heap, 0, 64).fill(0)
      write(0, 3)
      buffer.nbSamples = 3
      return 0
    },
    mapUint8Array: (position, length) => new Uint8Array(heap, position, length),
    rightIPCPort: { reply: (_, value) => result = value }
  }, { syncPts() {} })
  await handler({ method: 'pullBuffer', params: { nbSamples: 8 } })
  assert.equal(result.byteLength, 64)
  assert.deepEqual([...new Float32Array(result)], [1, 1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0])
})
