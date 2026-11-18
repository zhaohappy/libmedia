import { test } from './helpers/test.mjs'
import { evaluate, functionSource, loadClass, readSource } from './helpers/source.mjs'
import assert from 'node:assert/strict'

const is = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number',
  arrayBuffer: (value) => value instanceof ArrayBuffer
}
const compiler = readSource('cheap/src/webassembly/compiler.ts')
const { compile, getWebAssemblyResourceMetadata: declaredMetadata } = evaluate(`
  ${functionSource(compiler, ['getWebAssemblyResourceMetadata'])}
  ${functionSource(compiler, ['compile']).replace(/^default /, '')}
  return { compile, getWebAssemblyResourceMetadata }
`, {
  is, config: { USE_THREADS: false }, object: { extend: Object.assign },
  nearestPowerOf2: (value) => 2 ** Math.ceil(Math.log2(value))
})
const metadata = evaluate(`
  ${functionSource(readSource('avutil/src/function/getWasmResourceMetadata.ts'), ['getWasmResourceMetadata']).replace(/^default /, '')}
  return getWasmResourceMetadata
`, { is, getWebAssemblyResourceMetadata: declaredMetadata })
const bytes = () => new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]).buffer

test('WASM variants come from explicit metadata or the loaded filename, never capability flags', () => {
  for (const variant of ['atomic', 'simd', '64']) {
    assert.deepEqual(metadata({ source: `https://example.invalid/decode/h264-${variant}.wasm?revision=1#section` }), { variant, variantSource: 'filename' })
  }
  assert.deepEqual(metadata({ source: 'https://example.invalid/decode/h264.wasm' }), { variant: 'baseline', variantSource: 'filename' })
  assert.deepEqual(metadata({ source: 'https://example.invalid/opaque.wasm?file=h264-simd.wasm' }), { variant: 'unknown', variantSource: 'unknown' })
  assert.deepEqual(metadata({ source: bytes() }), { variant: 'unknown', variantSource: 'unknown' })
  assert.deepEqual(metadata({ source: bytes(), metadata: { variant: 'baseline' } }), { variant: 'baseline', variantSource: 'metadata' })
  assert.deepEqual(metadata({ source: 'https://example.invalid/h264-simd.wasm', metadata: { variant: 'atomic' } }), { variant: 'atomic', variantSource: 'metadata' })
})

test('compiled resource metadata survives structured clone and does not retain source URLs', async () => {
  const input = { source: bytes(), dataSize: 0, tableSize: 0, metadata: { variant: 'simd' } }
  const resource = await compile(input)
  input.metadata.variant = 'atomic'
  const cloned = structuredClone(resource)
  assert.ok(cloned.module instanceof WebAssembly.Module)
  assert.deepEqual(cloned.metadata, { variant: 'simd', variantSource: 'metadata' })
  assert.deepEqual(Object.keys(cloned.metadata), ['variant', 'variantSource'])
  assert.deepEqual((await compile({ source: bytes(), dataSize: 0, tableSize: 0 })).metadata, { variant: 'unknown', variantSource: 'unknown' })
})

const wrap = evaluate(`
  ${functionSource(readSource('avutil/src/function/compileResource.ts'), ['compileResource']).replace(/^default /, '')}
  return compileResource
`, {
  is, cheapConfig: { USE_THREADS: true }, defined: () => true, ENABLE_THREADS: true,
  getWasmResourceMetadata: metadata,
  compile: async (source) => ({
    buffer: source.source,
    metadata: metadata(source),
    module: await WebAssembly.compile(source.source)
  })
})

test('absent optional decoder resources survive worker transfer without failing compilation', async () => {
  for (const resource of [undefined, null]) {
    for (const threaded of [false, true]) {
      assert.equal(await wrap(structuredClone(resource), threaded), undefined)
    }
  }
})

test('resource compilation preserves source metadata for both parent and child modules', async () => {
  const resource = await wrap({ source: bytes(), metadata: { variant: 'atomic' } }, true)
  assert.deepEqual(resource.metadata, { variant: 'atomic', variantSource: 'metadata' })
  assert.deepEqual(resource.threadModule.metadata, { variant: 'atomic', variantSource: 'metadata' })
  assert.equal(resource.buffer, undefined)
  assert.equal(await wrap(resource, true), resource)
  assert.deepEqual((await wrap(bytes())).metadata, { variant: 'unknown', variantSource: 'unknown' })
})

test('Safari carries metadata with deferred bytes and the resource cache keeps their association', async () => {
  const Player = loadClass('avplayer/src/AVPlayer.ts', 'AVPlayer', ['getResource'], {
    is, browser: { safari: true, checkVersion: () => false }, os: {},
    getWasmResourceMetadata: metadata,
    fetch: async () => ({ arrayBuffer: async () => bytes() })
  })
  Player.Resource = new Map()
  const player = new Player()
  player.options = { getWasm: () => 'https://example.invalid/decode/h264-simd.wasm' }
  const resource = await player.getResource('decoder', 1, 0)
  assert.ok(resource.source instanceof ArrayBuffer)
  assert.deepEqual(resource.metadata, { variant: 'simd', variantSource: 'filename' })
  const workerResource = await wrap(structuredClone(resource), true)
  assert.deepEqual(workerResource.metadata, { variant: 'simd', variantSource: 'filename' })
  player.options.getWasm = () => ({ source: bytes(), metadata: { variant: 'baseline' } })
  assert.equal(await player.getResource('decoder', 1, 0), resource)
  const other = await player.getResource('decoder', 2, 0)
  assert.deepEqual(other.metadata, { variant: 'baseline', variantSource: 'metadata' })
})

const PthreadStatus = { STOP: 0, RUN: 1 }
const Pool = loadClass('cheap/src/webassembly/ThreadPool.ts', 'ThreadPool', ['getRunningThreadCount'], { PthreadStatus })
const Runner = loadClass('cheap/src/webassembly/WebAssemblyRunner.ts', 'WebAssemblyRunner', [
  'getRunningThreadCount', 'getRuntimeInfo', 'destroy'
], {
  PthreadStatus, PthreadFlags: { DETACH: 1 }, defined: () => true, ENABLE_THREADS: true,
  logger: { warn() {} }, free() {}
})

function state(value) {
  const runtimeState = new Int32Array(new SharedArrayBuffer(4))
  Atomics.store(runtimeState, 0, value)
  return runtimeState
}

test('reusing a pool worker publishes RUN after the previous task clears its activity under the same lock', () => {
  const runtimeState = state(0)
  const ReusablePool = loadClass('cheap/src/webassembly/ThreadPool.ts', 'ThreadPool', [
    'createThread', 'getRunningThreadCount'
  ], {
    PthreadStatus, PthreadFlags: { POOL: 2 }, addressof: (value) => value,
    mutex: {
      lock() {
        // The previous task has advertised descriptor STOP but still owns the
        // lock. Its finally clears activity before the caller can acquire it.
        Atomics.store(runtimeState, 0, 0)
      },
      unlock() {}
    },
    cond: { signal() {} }
  })
  const pool = new ReusablePool()
  const entry = {
    thread: { runtimeState, threadDescriptor: { status: PthreadStatus.STOP } },
    threadWait: { mutex: {}, cond: {} }
  }
  pool.childThreads = [entry]
  const replacement = { flags: 0 }
  pool.createThread(replacement, null, 'decode', 'frame')
  assert.equal(pool.getRunningThreadCount(), 1)
  assert.equal(entry.threadWait.thread, replacement)
  assert.equal(entry.threadWait.func, 'decode')
  assert.equal(entry.threadWait.args, 'frame')
})

test('running thread counts include pooled and nonpooled pthreads but exclude idle or exited workers', () => {
  const pool = new Pool()
  const pooled = state(1)
  pool.childThreads = [pooled, state(0), state(0)].map((runtimeState) => ({ thread: { runtimeState } }))
  const runner = Object.assign(new Runner(), {
    resourceMetadata: { variant: 'simd', variantSource: 'metadata' }, instance: {}, threadPool: pool,
    childThreads: new Map([['live', { runtimeState: state(1) }], ['exited-unjoined', { runtimeState: state(0) }]])
  })
  assert.deepEqual(runner.getRuntimeInfo(), { variant: 'simd', variantSource: 'metadata', threadCount: 3 })
  Atomics.store(pooled, 0, 0)
  assert.equal(runner.getRunningThreadCount(), 2)
  runner.childThreads.clear()
  assert.equal(runner.getRunningThreadCount(), 1)
  runner.instance = null
  assert.equal(runner.getRunningThreadCount(), 0)
})

test('destroy clears diagnostic activity without depending on freed pthread memory', () => {
  const ownState = state(1)
  const childState = state(1)
  let terminated = false
  const runner = Object.assign(new Runner(), {
    resourceMetadata: { variant: 'unknown', variantSource: 'unknown' }, instance: {},
    options: { threadRuntimeState: ownState }, childReadyPromises: [],
    childThreads: new Map([['child', {
      runtimeState: childState, threadDescriptor: { flags: 0 }, thread: {},
      worker: {
        terminate() {
          terminated = true
        }
      }
    }]])
  })
  runner.destroy()
  assert.equal(Atomics.load(ownState, 0), 0)
  assert.equal(Atomics.load(childState, 0), 0)
  assert.equal(terminated, true)
  assert.equal(runner.getRunningThreadCount(), 0)
})

for (const [path, name] of [
  ['avcodec/src/wasmcodec/VideoDecoder.ts', 'WasmVideoDecoder'],
  ['avcodec/src/wasmcodec/AudioDecoder.ts', 'WasmAudioDecoder']
]) {
  test(`${name} exposes actual runner metadata and thread count`, () => {
    const Decoder = loadClass(path, name, ['getRuntimeInfo'])
    const decoder = new Decoder()
    decoder.decoder = { getRuntimeInfo: () => ({ variant: '64', variantSource: 'metadata', threadCount: 4 }) }
    assert.deepEqual(decoder.getRuntimeInfo(), { variant: '64', variantSource: 'metadata', threadCount: 4 })
  })
}
