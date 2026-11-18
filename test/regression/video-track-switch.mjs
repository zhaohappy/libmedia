import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import assert from 'node:assert/strict'

class WasmDecoder {
  opened = 0
  closed = 0
  async open(parameters) {
    this.opened++
    this.parameters = parameters
    return 0
  }
  close() {
    this.closed++
  }
}
class WebDecoder extends WasmDecoder {
  static supported = false
  static async isSupported() {
    return WebDecoder.supported
  }
  async open(parameters) {
    if (this.hardware) {
      return -10
    }
    return super.open(parameters)
  }
}
const Pipeline = loadClass(
  'avpipeline/src/VideoDecodePipeline.ts', 'VideoDecodePipeline',
  ['open', 'reopenDecoder', 'openSoftwareDecoder'], {
    Pipeline: class {},
    WebVideoDecoder: WebDecoder, WasmVideoDecoder: WasmDecoder,
    support: { videoDecoder: true },
    logger: { debug() {}, warn() {}, error() {}, fatal(message) {
      throw Error(message)
    } },
    isWorker: () => false,
    isPointer: () => false,
    reinterpret_cast: (value) => value,
    sizeof: () => 1,
    AVCodecParameters: class {},
    avMallocz: () => ({}),
    unserializeAVCodecParameters: (input, output) => Object.assign(output, input),
    freeCodecParameters() {},
    compileResource: async (resource) => resource,
    errorType: { CODEC_NOT_SUPPORT: -9 }
  }
)

function fixture(hardware = false) {
  const pipeline = new Pipeline()
  const previous = new WasmDecoder()
  const task = {
    taskId: 'test', parameters: {}, resource: {}, preferWebCodecs: true,
    enableHardware: hardware, softwareDecoder: previous, targetDecoder: previous,
    softwareDecoderOpened: true, wasmDecoderOptions: {}
  }
  pipeline.tasks = new Map([['test', task]])
  pipeline.createWasmcodecDecoder = () => new WasmDecoder()
  pipeline.createWebCodecDecoder = (_, hardware) => Object.assign(new WebDecoder(), { hardware })
  return { pipeline, task, previous }
}

for (const hardware of [false, true]) {
  test(`switching unsupported WebCodecs tracks opens each replacement Wasm decoder (hardware=${hardware})`, async () => {
    WebDecoder.supported = false
    const { pipeline, task, previous } = fixture(hardware)
    for (const track of [3, 2, 3]) {
      const old = task.softwareDecoder
      assert.equal(await pipeline.reopenDecoder('test', { track }, {}), 0)
      assert.equal(old.closed, 1)
      assert.notEqual(task.softwareDecoder, old)
      assert.equal(task.softwareDecoder.constructor, WasmDecoder)
      assert.equal(task.softwareDecoder.opened, 1, 'new decoder must not inherit the old opened flag')
      assert.equal(task.softwareDecoder.parameters.track, track)
      assert.equal(task.targetDecoder, task.softwareDecoder)
      assert.equal(task.softwareDecoderOpened, true)
    }
    assert.equal(previous.closed, 1)
  })
}

test('switching to a supported WebCodecs track opens the replacement software decoder', async () => {
  WebDecoder.supported = true
  const { pipeline, task } = fixture()
  assert.equal(await pipeline.reopenDecoder('test', { track: 3 }, {}), 0)
  assert.equal(task.softwareDecoder.constructor, WebDecoder)
  assert.equal(task.softwareDecoder.opened, 1)
})

test('initial open awaits a negative WebCodecs support result and keeps Wasm', async () => {
  WebDecoder.supported = false
  const { pipeline, task, previous } = fixture()
  task.softwareDecoderOpened = false
  assert.equal(await pipeline.open('test', { track: 2 }), 0)
  assert.equal(task.softwareDecoder, previous)
  assert.equal(previous.closed, 0)
  assert.equal(previous.opened, 1)
})
