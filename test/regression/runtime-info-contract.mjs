import { test } from './helpers/test.mjs'
import { evaluate, functionSource, loadClass, readSource, ts } from './helpers/source.mjs'
import assert from 'node:assert/strict'
import { queryRuntimeThread } from './helpers/runtime-info.mjs'

const is = { string: (value) => typeof value === 'string' }
const getMetadata = evaluate(`
  ${functionSource(readSource('cheap/src/webassembly/compiler.ts'), ['getWebAssemblyResourceMetadata'])}
  return getWebAssemblyResourceMetadata
`, { is })

test('generic cheap compilation distinguishes explicit declarations from unverified filenames', () => {
  assert.deepEqual(getMetadata({ source: 'https://example.invalid/h264-simd.wasm' }), {
    variant: 'unknown', variantSource: 'unknown'
  })
  assert.deepEqual(getMetadata({ source: new ArrayBuffer(0), metadata: { variant: 'simd' } }), {
    variant: 'simd', variantSource: 'metadata'
  })
})

const timers = new Set()
const IPCPort = loadClass('common/src/network/IPCPort.ts', 'IPCPort', ['request', 'handle', 'destroy'], {
  isDef: (value) => value !== undefined, NOTIFY: 'notify', REQUEST: 'request',
  setTimeout(callback, ms) {
    const handle = setTimeout(() => {
      timers.delete(handle)
      callback()
    }, ms)
    timers.add(handle)
    return handle
  },
  clearTimeout(handle) {
    timers.delete(handle)
    clearTimeout(handle)
  }
})

function ipcFixture(postMessage = () => {}) {
  const ipc = Object.assign(new IPCPort(), {
    seq: 0, closed: false, requestMap: new Map(),
    port: { postMessage, close() {} }, fire() {}
  })
  return ipc
}

function after(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

test('IPC deadlines reject and remove silent requests; late replies stay ignored', async () => {
  const ipc = ipcFixture()
  const result = ipc.request('runtime', {}, [], { timeoutMs: 5 }).catch(() => 'timed-out')
  try {
    assert.equal(await Promise.race([result, after(50, 'still-pending')]), 'timed-out')
    assert.equal(ipc.requestMap.size, 0)
    assert.equal(timers.size, 0)
    ipc.handle({ data: { type: 'reply', data: { seq: 0, result: 'late' } } })
    assert.equal(ipc.requestMap.size, 0)
  }
  finally {
    ipc.destroy()
  }
})

test('a synchronous postMessage error does not retain a pending IPC request', async () => {
  const ipc = ipcFixture(() => {
    throw Error('port unavailable')
  })
  await assert.rejects(ipc.request('runtime', {}, [], { timeoutMs: 5 }), /port unavailable/)
  assert.equal(ipc.requestMap.size, 0)
  assert.equal(timers.size, 0)
  ipc.destroy()
})

test('reply and destroy clear request deadline timers immediately', async () => {
  const ipc = ipcFixture()
  const answered = ipc.request('runtime', {}, [], { timeoutMs: 1000 })
  assert.equal(timers.size, 1)
  ipc.handle({ data: { type: 'reply', data: { seq: 0, result: 'ready' } } })
  assert.equal(await answered, 'ready')
  assert.equal(timers.size, 0)
  assert.equal(ipc.requestMap.size, 0)
  const abandoned = ipc.request('runtime', {}, [], { timeoutMs: 1000 })
  ipc.destroy()
  await assert.rejects(abandoned)
  assert.equal(timers.size, 0)
  assert.equal(ipc.requestMap.size, 0)
})

test('direct Worker diagnostic requests use IPC deadlines instead of an outer Promise race', async () => {
  const ipc = ipcFixture()
  const pending = queryRuntimeThread({ $ipc: ipc }, 'getTaskRuntimeInfo', ['current'], 5, async () => {
    throw Error('must not invoke locally')
  })
  await assert.rejects(pending, /timed out/)
  assert.equal(ipc.requestMap.size, 0)
  assert.equal(timers.size, 0)
  ipc.destroy()
})

for (const name of ['VideoPipelineProxy', 'AudioPipelineProxy']) {
  test(`${name} cleans timed-out IPC and supports local invocation`, async () => {
    const Proxy = loadClass(`avplayer/src/worker/${name}.ts`, name, ['getTaskRuntimeInfo'], { queryRuntimeThread })
    const sent = []
    const ipc = ipcFixture((message) => sent.push(message))
    const proxy = new Proxy()
    proxy.thread = { $ipc: ipc }
    await assert.rejects(proxy.getTaskRuntimeInfo('decoder', 'current', 5), /timed out/)
    assert.equal(ipc.requestMap.size, 0)
    assert.equal(timers.size, 0)
    assert.equal(sent[0].data.method, 'invoke')
    assert.deepEqual(sent[0].data.params.params, ['decoder', 'getTaskRuntimeInfo', ['current']])
    ipc.destroy()
    proxy.thread = {
      async invoke(type, method, args) {
        assert.deepEqual([type, method, args], ['render', 'getTaskRuntimeInfo', ['local']])
        return 'canvas2d'
      }
    }
    assert.equal(await proxy.getTaskRuntimeInfo('render', 'local', 1000), 'canvas2d')
  })
}

const status = { PLAYED: 6, PAUSED: 8, SEEKING: 9, ENDED: 7 }
const Player = loadClass('avplayer/src/AVPlayer.ts', 'AVPlayer', [
  'getRuntimeInfo', 'getRuntimeWorkers', 'runtimeInfoAvailable', 'runtimeInfoGeneration'
], { AVPlayerStatus: status, queryRuntimeThread })

test('one silent decoder has its own deadline while the other runtime fields remain available', async () => {
  const player = Object.assign(new Player(), {
    status: status.PLAYED, taskId: 'current', useMSE: false,
    selectedVideoStream: {}, selectedAudioStream: {},
    VideoDecoderThread: { getTaskRuntimeInfo: () => new Promise(() => {}) },
    VideoRenderThread: { getTaskRuntimeInfo: async () => 'webgl' }
  })
  Player.AudioDecoderThread = { getTaskRuntimeInfo: async () => ({ backend: 'webcodecs' }) }
  const result = await Promise.race([player.getRuntimeInfo({ timeoutMs: 5 }), after(50, 'still-pending')])
  assert.deepEqual(result, {
    mode: 'custom', videoDecoder: { backend: 'unknown' },
    audioDecoder: { backend: 'webcodecs' }, videoRenderer: 'webgl'
  })
})

test('runtime deadlines reject invalid values even before playback is ready', async () => {
  const player = new Player()
  for (const timeoutMs of [0, -1, NaN, Infinity, 0.5, 2147483648]) {
    await assert.rejects(player.getRuntimeInfo({ timeoutMs }), RangeError)
  }
  assert.deepEqual(await player.getRuntimeInfo({ timeoutMs: 1 }), { mode: 'unknown' })
})

test('decoder public types narrow on backend and reject incompatible payloads', () => {
  const definitions = [
    ['cheap/src/webassembly/compiler.ts', ['WebAssemblyVariant', 'WebAssemblyVariantSource', 'WebAssemblyResourceMetadata', 'WebAssemblyRuntimeInfo']],
    ['avpipeline/src/struct/runtimeInfo.ts', ['AVDecoderRuntimeInfo', 'AVVideoDecoderRuntimeInfo']]
  ].map(([path, names]) => {
    const source = readSource(path)
    return source.statements.filter((node) => names.includes(node.name?.text)).map((node) => node.getText(source)).join('\n')
  }).join('\n')
  const contents = `${definitions}
    declare const video: AVVideoDecoderRuntimeInfo;
    if (video.backend === 'wasm') { const count: number = video.wasm.threadCount; }
    if (video.backend === 'webcodecs') {
      const hint: 'prefer-hardware' | 'prefer-software' | 'no-preference' = video.hardwareAcceleration;
    }
    // @ts-expect-error WASM requires its runtime payload.
    const missing: AVDecoderRuntimeInfo = { backend: 'wasm' };
    // @ts-expect-error Browser decoders cannot carry WASM data.
    const mixed: AVDecoderRuntimeInfo = { backend: 'browser', wasm: { variant: 'simd', variantSource: 'metadata', threadCount: 1 } };
    // @ts-expect-error Video WebCodecs requires the configured hint.
    const noHint: AVVideoDecoderRuntimeInfo = { backend: 'webcodecs' };
  `
  const options = { noEmit: true, strict: true, skipLibCheck: true, types: [], target: ts.ScriptTarget.ES2022 }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  const file = '/virtual-runtime-info-types.ts'
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => name === file
    ? ts.createSourceFile(name, contents, languageVersion)
    : original(name, languageVersion, onError, shouldCreateNewSourceFile)
  const program = ts.createProgram([file], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.deepEqual(diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')), [])
})
