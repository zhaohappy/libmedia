import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { compileFunction } from 'node:vm'

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const ts = createRequire(import.meta.url)('typescript')
const file = resolve(checkout, 'packages/avpipeline/src/AudioRenderPipeline.ts')
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
const clazz = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'AudioRenderPipeline')
const create = clazz.members.find((node) => node.name?.getText(source) === 'createTask')
const methods = clazz.members.filter((node) => ['beforeSeek', 'pause', 'afterSeek', 'syncSeekTime', 'stop'].includes(node.name?.getText(source)))
// Execute the actual PCM request handler and its closures; adapt only the WASM boundary.
const closures = create.body.statements.filter((node) =>
  ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) =>
    ['pullNewAudioFrame', 'receiveSamplesFromStretchpitcher', 'receiveToPCMBuffer', 'handlePCMRequest'].includes(declaration.name.getText(source)))
  || ts.isExpressionStatement(node) && node.expression.getText(source).startsWith('rightIPCPort.on('))
const program = ts.transpileModule(`
class Renderer { ${methods.map((node) => node.getText(source)).join('\n')} }
function connect(task, options, rightIPCPort) { ${closures.map((node) => node.getText(source)).join('\n')} }
return { Renderer, connect };
`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const env = {
  logger: { debug() {}, info() {}, warn() {}, error() {} },
  IOError: { END: -2 },
  REQUEST: 'request',
  nullptr: 0,
  MASTER_SYNC_THRESHOLD: 400n,
  AV_MILLI_TIME_BASE_Q: {},
  NOPTS_VALUE_BIGINT: -1n,
  avRescaleQ2: (pts) => pts,
  addressof: (value) => value,
  reinterpret_cast: (value) => value,
  static_cast: BigInt,
  sizeof: (value) => value,
  float: 4,
  getTimestamp: () => 1,
  defined: () => false,
  ENABLE_LOG_TRACE: 0,
  memcpy() {},
  avFreep() {},
  make: () => ({}),
  avMalloc: () => [],
  avMallocz: () => 0,
  mapUint8Array: (_, length) => new Uint8Array(length)
}
const { Renderer, connect } = compileFunction(program, Object.keys(env))(...Object.values(env))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes; reject = no
  })
  return { promise, resolve, reject }
}
function frame(pts) {
  return { pts, timeBase: {}, sampleRate: 44100, format: 1, chLayout: { nbChannels: 1 }, nbSamples: 1, extendedData: [100], valueOf: () => 1 }
}
function fixture(method, firstPlayed = true) {
  const renderer = new Renderer()
  const replies = []
  const pulls = []
  const released = []
  renderer.avPCMBufferPool = { alloc: () => ({ data: 0 }), release() {} }
  renderer.clearFakePlayTimer = () => {}
  renderer.syncPts = () => {}
  const task = {
    taskId: 'sample', currentPTS: 0n, firstPlayed, ended: false, stopping: false, seeking: false, pausing: false,
    fakePlay: false, pendingPCMRequests: 0, playRate: 1, playTempo: 1, playPitch: 1,
    playSampleRate: 44100, playFormat: 1, playChannels: 1, audioMasterForce: true,
    stats: { audioFrameRenderCount: 0 }, avframePool: { release: (value) => released.push(value) },
    masterTimer: { getMasterTime: () => 0n, setMasterTime() {} },
    outPCMBuffer: { maxnbSamples: 1, data: [200] },
    leftIPCPort: { request() {
      const pull = deferred(); pulls.push(pull); return pull.promise
    } }
  }
  renderer.tasks = new Map([['sample', task]])
  let handler
  connect.call(renderer, task, {}, { on: (_, fn) => {
    handler = fn
  }, reply: (_, result) => replies.push(result) })
  return {
    renderer, task, pulls, replies, released,
    request: () => handler({ method, params: { nbSamples: 1, buffer: { maxnbSamples: 1, data: [200] } } })
  }
}

for (const method of ['pull', 'pullBuffer']) {
  for (const firstPlayed of [true, false]) {
    it(`${method}: paused seek drains ${firstPlayed ? 'ongoing' : 'initial'} PCM read before moving the clock`, { timeout: 1000 }, async () => {
      const { renderer, task, pulls, request } = fixture(method, firstPlayed)
      const oldRequest = request()
      assert.equal(pulls.length, 1)
      await renderer.pause('sample')
      let ready = false
      const seeking = renderer.beforeSeek('sample').then(() => {
        ready = true
      })
      await Promise.resolve()
      assert.equal(ready, false, 'pause does not imply the old decoder pull has completed')
      const queuedRequest = request()
      assert.equal(pulls.length, 1, 'new worklet requests wait before even their initial decoder pull')
      pulls[0].resolve(frame(1000n))
      await oldRequest
      await seeking
      assert.equal(task.pendingPCMRequests, 0)
      assert.equal(task.waitPCMBuffer, 0)
      const sync = renderer.syncSeekTime('sample', 10000n)
      pulls[1].resolve(frame(10000n))
      await sync
      assert.equal(task.currentPTS, 10000n)
      await renderer.afterSeek('sample', 10000n)
      await queuedRequest
      assert.equal(task.currentPTS, 10000n, 'only the new seek frame can update the clock')
      assert.equal(pulls.length, 2, 'the queued request consumes the frame held by seek')
    })
  }
  it(`${method}: idle paused seek completes without waiting for a future worklet request`, { timeout: 1000 }, async () => {
    const { renderer, task, pulls } = fixture(method)
    await renderer.pause('sample')
    await renderer.beforeSeek('sample')
    assert.equal(task.seeking, true)
    assert.equal(pulls.length, 0)
  })
  it(`${method}: stop releases both a waiting seek and a gated worklet request`, { timeout: 1000 }, async () => {
    const { renderer, task, pulls, replies, request } = fixture(method)
    const reading = request()
    await renderer.pause('sample')
    const seeking = renderer.beforeSeek('sample')
    const queued = request()
    await renderer.stop('sample')
    await seeking
    await queued
    assert.equal(pulls.length, 1)
    assert.equal(replies[0], -2)
    pulls[0].resolve(-2)
    await reading
    assert.equal(task.pendingPCMRequests, 0)
    assert.equal(task.receivePCMSync, null)
  })
  for (const failure of ['EOF', 'rejection']) {
    it(`${method}: ${failure} releases a paused seek waiting for PCM`, { timeout: 1000 }, async () => {
      const { renderer, task, pulls, request } = fixture(method)
      const reading = request()
      const result = reading.then(() => null, (error) => error.message)
      await renderer.pause('sample')
      const seeking = renderer.beforeSeek('sample')
      if (failure === 'EOF') {
        pulls[0].resolve(-2)
      }
      else {
        pulls[0].reject(new Error('synthetic decoder failure'))
      }
      await seeking
      assert.equal(await result, failure === 'EOF' ? null : 'synthetic decoder failure')
      assert.equal(task.pendingPCMRequests, 0)
      assert.equal(task.seekSync, null)
    })
  }
}
