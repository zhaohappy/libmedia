import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import assert from 'node:assert/strict'
import { queryRuntimeThread } from './helpers/runtime-info.mjs'

class WasmDecoder {
  getRuntimeInfo() {
    return { variant: 'simd', variantSource: 'metadata', threadCount: 3 }
  }
}
class WebDecoder {
  constructor(hint = 'prefer-hardware') {
    this.hint = hint
  }
  getHardwareAcceleration() {
    return this.hint
  }
}
class WebGPURender {}
class WebGLRender {}
class CanvasImageRender {}
class WritableStreamRender {}

function pipeline(path, name, env) {
  const Pipeline = loadClass(path, name, ['getTaskRuntimeInfo'], env)
  const instance = new Pipeline()
  instance.tasks = new Map()
  return instance
}

test('decoder queries follow the requested task and its actual target through fallback', async () => {
  const video = pipeline('avpipeline/src/VideoDecodePipeline.ts', 'VideoDecodePipeline', {
    WebVideoDecoder: WebDecoder, WasmVideoDecoder: WasmDecoder
  })
  const task = { targetDecoder: new WebDecoder(), hardwareDecoder: new WebDecoder() }
  video.tasks.set('other', { targetDecoder: new WasmDecoder() })
  video.tasks.set('current', task)
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), {
    backend: 'webcodecs', hardwareAcceleration: 'prefer-hardware'
  })
  task.targetDecoder = new WebDecoder('prefer-software')
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), {
    backend: 'webcodecs', hardwareAcceleration: 'prefer-software'
  })
  task.targetDecoder = new WasmDecoder()
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), { backend: 'wasm', wasm: { variant: 'simd', variantSource: 'metadata', threadCount: 3 } })
  task.decoderFallbackReady = Promise.resolve(0)
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), { backend: 'unknown' })
  task.decoderFallbackReady = null
  task.softwareDecoder = task.targetDecoder
  task.softwareDecoderOpened = false
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), { backend: 'unknown' })
  task.softwareDecoderOpened = true
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), { backend: 'wasm', wasm: { variant: 'simd', variantSource: 'metadata', threadCount: 3 } })
  assert.deepEqual(await video.getTaskRuntimeInfo('missing'), { backend: 'unknown' })
  task.targetDecoder = {}
  assert.deepEqual(await video.getTaskRuntimeInfo('current'), { backend: 'unknown' })

  const audio = pipeline('avpipeline/src/AudioDecodePipeline.ts', 'AudioDecodePipeline', {
    WebAudioDecoder: WebDecoder, WasmAudioDecoder: WasmDecoder
  })
  audio.tasks.set('current', { decoder: new WebDecoder() })
  assert.deepEqual(await audio.getTaskRuntimeInfo('current'), { backend: 'webcodecs' })
  audio.tasks.set('current', { decoder: new WasmDecoder() })
  assert.deepEqual(await audio.getTaskRuntimeInfo('current'), { backend: 'wasm', wasm: { variant: 'simd', variantSource: 'metadata', threadCount: 3 } })
  audio.tasks.delete('current')
  assert.deepEqual(await audio.getTaskRuntimeInfo('current'), { backend: 'unknown' })
})

test('renderer queries follow initialized render instances after WebGPU fallback', async () => {
  const renderer = pipeline('avpipeline/src/VideoRenderPipeline.ts', 'VideoRenderPipeline', {
    WebGPURender, WebGLRender, CanvasImageRender, WritableStreamRender,
    defined: () => true, ENABLE_WEBGPU: true
  })
  const task = { enableWebGPU: true, renderRedyed: true }
  renderer.tasks.set('current', task)
  for (const [Render, expected] of [
    [WebGPURender, 'webgpu'], [WebGLRender, 'webgl'],
    [CanvasImageRender, 'canvas2d'], [WritableStreamRender, 'writable-stream']
  ]) {
    task.render = new Render()
    assert.equal(await renderer.getTaskRuntimeInfo('current'), expected)
  }
  task.renderRedyed = false
  assert.equal(await renderer.getTaskRuntimeInfo('current'), 'unknown')
  assert.equal(await renderer.getTaskRuntimeInfo('missing'), 'unknown')
})

test('WebCodecs reports the successfully configured hint instead of mutable options', async () => {
  let preference = 'prefer-hardware'
  class NativeDecoder {
    static async isConfigSupported() {
      return { supported: true }
    }
    reset() {
      this.state = 'unconfigured'
    }
    configure(config) {
      this.config = config
      this.state = 'configured'
    }
    close() {
      this.state = 'closed'
    }
  }
  const Decoder = loadClass('avcodec/src/webcodec/VideoDecoder.ts', 'WebVideoDecoder', [
    'open', 'close', 'getHardwareAcceleration', 'hardwareAcceleration'
  ], {
    VideoDecoder: NativeDecoder,
    getHardwarePreference: () => preference,
    AVCodecParameterFlags: { AV_CODECPAR_FLAG_H26X_ANNEXB: 1, AV_CODECPAR_FLAG_ALPHA: 2, AV_CODECPAR_FLAG_NO_PTS: 4 },
    nullptr: null, logger: { error() {} }
  })
  const decoder = Object.assign(new Decoder(), {
    options: { codec: 'fixture', enableHardwareAcceleration: true },
    output() {}, error() {}, outputQueue: [], alphaQueue: [], inputQueue: [], dtsQueue: [],
    alphaPending: new Map(), discardedTimestamps: new Map()
  })
  assert.equal(decoder.getHardwareAcceleration(), undefined)
  for (const [configured, expected] of [
    ['prefer-hardware', 'prefer-hardware'], ['prefer-software', 'prefer-software'],
    ['no-preference', 'no-preference'], ['allow', 'prefer-hardware'], ['deny', 'prefer-software']
  ]) {
    preference = configured
    assert.equal(await decoder.open({ extradata: null, flags: 0, width: 16, height: 16 }), 0)
    decoder.options.enableHardwareAcceleration = !decoder.options.enableHardwareAcceleration
    assert.equal(decoder.getHardwareAcceleration(), expected)
    decoder.decoder.state = 'closed'
    assert.equal(decoder.getHardwareAcceleration(), undefined)
  }
  decoder.close()
  assert.equal(decoder.getHardwareAcceleration(), undefined)
})

const status = Object.fromEntries([
  'STOPPED', 'DESTROYING', 'DESTROYED', 'LOADING', 'LOADED', 'PLAYING',
  'PLAYED', 'ENDED', 'PAUSED', 'SEEKING', 'CHANGING'
].map((name, index) => [name, index]))
const AVPlayer = loadClass('avplayer/src/AVPlayer.ts', 'AVPlayer', [
  'getRuntimeInfo', 'getRuntimeWorkers', 'runtimeInfoAvailable', 'runtimeInfoGeneration', 'load', 'stop', 'destroy', 'selectVideo', 'selectAudio'
], {
  AVPlayerStatus: status,
  queryRuntimeThread,
  eventType: { CHANGING: 'changing' },
  logger: { info() {}, warn() {} },
  defined: () => false, ENABLE_PROTOCOL_HLS: false, ENABLE_PROTOCOL_DASH: false,
  AVMediaType: { AVMEDIA_TYPE_VIDEO: 0, AVMEDIA_TYPE_AUDIO: 1 }, AVDisposition: { ATTACHED_PIC: 1 }
})

function fixture(taskId = 'current') {
  const calls = []
  const player = Object.assign(new AVPlayer(), {
    taskId, status: status.PLAYED, useMSE: false,
    selectedVideoStream: {}, selectedAudioStream: {}
  })
  const thread = (kind, value) => ({
    async getTaskRuntimeInfo(id) {
      calls.push([kind, id])
      return value
    }
  })
  player.VideoDecoderThread = thread('video', { backend: 'wasm' })
  player.VideoRenderThread = thread('render', 'webgl')
  AVPlayer.AudioDecoderThread = thread('audio', { backend: 'webcodecs' })
  return { player, calls }
}

test('public runtime info scopes queries to each player and only selected streams', async () => {
  const { player, calls } = fixture()
  assert.deepEqual(await player.getRuntimeInfo(), {
    mode: 'custom', videoDecoder: { backend: 'wasm' },
    audioDecoder: { backend: 'webcodecs' }, videoRenderer: 'webgl'
  })
  assert.deepEqual(calls, [['video', 'current'], ['audio', 'current'], ['render', 'current']])
  const { player: second, calls: secondCalls } = fixture('second')
  second.selectedVideoStream = null
  assert.deepEqual(await second.getRuntimeInfo(), { mode: 'custom', audioDecoder: { backend: 'webcodecs' } })
  assert.deepEqual(secondCalls, [['audio', 'second']])
  second.useMSE = true
  assert.deepEqual(await second.getRuntimeInfo(), { mode: 'mse', audioDecoder: { backend: 'browser' } })
  player.useMSE = true
  assert.deepEqual(await player.getRuntimeInfo(), {
    mode: 'mse', videoDecoder: { backend: 'browser' },
    audioDecoder: { backend: 'browser' }, videoRenderer: 'browser'
  })
})

test('unready lifecycle states stay unknown even when the previous MSE choice survives', async () => {
  const { player, calls } = fixture()
  player.useMSE = true
  for (const name of ['STOPPED', 'DESTROYING', 'DESTROYED', 'LOADING', 'LOADED', 'PLAYING', 'CHANGING']) {
    player.status = status[name]
    assert.deepEqual(await player.getRuntimeInfo(), { mode: 'unknown' }, name)
  }
  player.status = status.PLAYED
  player.stopPending = Promise.resolve()
  assert.deepEqual(await player.getRuntimeInfo(), { mode: 'unknown' })
  assert.deepEqual(calls, [])
})

test('missing and failed pipeline queries report unknown without inventing a backend', async () => {
  const { player } = fixture()
  player.VideoDecoderThread = null
  player.VideoRenderThread.getTaskRuntimeInfo = async () => {
    throw Error('worker closed')
  }
  assert.deepEqual(await player.getRuntimeInfo(), {
    mode: 'custom', videoDecoder: { backend: 'unknown' },
    audioDecoder: { backend: 'webcodecs' }, videoRenderer: 'unknown'
  })
})

test('pipeline worker placement uses actual workers, separately from decoder pthread counts', async () => {
  const { player } = fixture()
  player.options = { enableWorker: false }
  player.VideoDecoderThread.$worker = {}
  player.VideoRenderThread.$worker = null
  AVPlayer.AudioDecoderThread.$worker = {}
  assert.deepEqual(player.getRuntimeWorkers(true, true), {
    videoDecoder: true, videoRenderer: false, audioDecoder: true
  })
  player.options.enableWorker = true
  player.VideoPipelineProxy = { worker: null }
  assert.deepEqual(player.getRuntimeWorkers(true, true), {
    videoDecoder: false, videoRenderer: false, audioDecoder: true
  })
  player.VideoPipelineProxy.worker = {}
  assert.deepEqual(player.getRuntimeWorkers(true, true), {
    videoDecoder: true, videoRenderer: true, audioDecoder: true
  })
  player.useMSE = true
  assert.equal((await player.getRuntimeInfo()).workers, undefined)
})

for (const change of ['task', 'video', 'audio', 'mode', 'state']) {
  test(`a late query cannot return a stale snapshot after ${change} changes`, async () => {
    const { player } = fixture()
    let release
    player.VideoDecoderThread.getTaskRuntimeInfo = () => new Promise((resolve) => {
      release = resolve
    })
    const pending = player.getRuntimeInfo()
    await Promise.resolve()
    if (change === 'task') {
      player.taskId = 'replacement'
    }
    if (change === 'video') {
      player.selectedVideoStream = {}
    }
    if (change === 'audio') {
      player.selectedAudioStream = {}
    }
    if (change === 'mode') {
      player.useMSE = true
    }
    if (change === 'state') {
      player.status = status.CHANGING
    }
    release({ backend: 'wasm' })
    assert.deepEqual(await pending, { mode: 'unknown' })
  })
}

for (const method of ['load', 'stop', 'destroy']) {
  test(`${method} invalidates outstanding queries before its first await`, async () => {
    const { player } = fixture()
    let release
    player.VideoDecoderThread.getTaskRuntimeInfo = () => new Promise((resolve) => {
      release = resolve
    })
    const pending = player.getRuntimeInfo()
    await Promise.resolve()
    const boundary = Error('stop lifecycle at the first await')
    if (method === 'stop') {
      player.VideoRenderThread.unregisterTask = async () => {
        throw boundary
      }
    }
    else {
      player.stop = async () => {
        throw boundary
      }
    }
    await assert.rejects(player[method](), (error) => error === boundary)
    // Even if playback resumes before the worker responds, this query belongs
    // to the earlier generation and must not surface that generation's data.
    player.status = status.PLAYED
    player.stopPending = null
    release({ backend: 'wasm' })
    assert.deepEqual(await pending, { mode: 'unknown' })
  })
}

for (const [method, type, selected] of [['selectVideo', 0, 'selectedVideoStream'], ['selectAudio', 1, 'selectedAudioStream']]) {
  test(`${method} invalidates queries even when selection later returns to the original stream`, async () => {
    const { player } = fixture()
    let release
    player.VideoDecoderThread.getTaskRuntimeInfo = () => new Promise((resolve) => {
      release = resolve
    })
    const pending = player.getRuntimeInfo()
    await Promise.resolve()
    const original = player[selected]
    player.formatContext = { streams: [{ id: 2, disposition: 0, codecpar: { codecType: type } }] }
    const boundary = Error('stop selection at its changing event')
    player.fire = () => {
      throw boundary
    }
    await assert.rejects(player[method](2), (error) => error === boundary)
    player.status = status.PLAYED
    player[selected] = original
    release({ backend: 'wasm' })
    assert.deepEqual(await pending, { mode: 'unknown' })
  })
}
