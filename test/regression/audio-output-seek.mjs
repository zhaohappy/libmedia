import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass, readSource, getClass, evaluate } from './helpers/source.mjs'

for (const shared of [false, true]) {
  const heap = new ArrayBuffer(16384)
  const name = `AudioSourceWorkletProcessor${shared ? '2' : ''}`
  const Processor = loadClass(`avrender/src/pcm/${name}.ts`, name, ['clearBuffer', 'refillBuffer', 'pull', 'swapBuffer', 'process'], {
    BUFFER_LENGTH: 2, currentTime: 0,
    is: { number: (value) => typeof value === 'number' },
    getHeap: () => heap, static_cast: (value) => value, reinterpret_cast: (value) => value,
    sizeof: () => 4, float: 0, logger: { info() {} }, nullptr: null
  })
  function fixture() {
    const source = new Processor()
    let offset = 0
    const events = []
    source.allocBuffer = () => {
      offset += 1024
      return { data: [offset] }
    }
    source.freeBuffer = () => {}
    source.channels = 1
    source.pause = true
    source.backBufferOffset = 1
    source.ended = false
    source.frontBuffered = true
    source.backBuffer = shared ? source.allocBuffer() : [new Float32Array(256).fill(1)]
    source.frontBuffer = shared ? source.allocBuffer() : [new Float32Array(256).fill(2)]
    source.ipcPort = { notify: (event) => events.push(event) }
    source.pullIPC = { request: async (_, params) => {
      if (shared) {
        new Float32Array(heap, params.buffer.data[0], 256).fill(9)
        return 0
      }
      return new Float32Array(256).fill(9).buffer
    } }
    return { source, events }
  }
  function output(source) {
    const samples = new Float32Array(128)
    source.pause = false
    source.process([], [[samples]], {})
    return [...samples]
  }
  test(`${name}: clear drops both old buffers before resuming`, async () => {
    const { source } = fixture()
    let pulls = 0
    const request = source.pullIPC.request
    source.pullIPC.request = (...args) => {
      pulls++
      return request(...args)
    }
    await source.clearBuffer()
    assert.equal(pulls, 0, 'paused clear must not prefill and move the renderer clock')
    await source.refillBuffer()
    assert.equal(source.pause, true, 'refilling must not unpause a paused seek')
    assert.deepEqual(output(source), Array(128).fill(9))
  })
  test(`${name}: clear waits for an old pull before refilling`, async () => {
    const { source } = fixture()
    let release
    source.pullIPC.request = () => new Promise((resolve) => release = resolve)
    source.swapBuffer()
    const pending = source.clearBuffer()
    let complete = false
    pending.then(() => complete = true)
    await Promise.resolve()
    assert.equal(complete, false)
    const next = fixture().source.pullIPC
    source.pullIPC = next
    release(shared ? -2 : new Float32Array(256).fill(3).buffer)
    await pending
    await source.refillBuffer()
    assert.equal(source.ended, false, 'stale EOF must not survive the seek')
    assert.deepEqual(output(source), Array(128).fill(9))
  })
  test(`${name}: EOF after clear emits no stale samples`, async () => {
    const { source, events } = fixture()
    source.pullIPC.request = async () => -2
    await source.clearBuffer()
    await source.refillBuffer()
    assert.deepEqual(output(source), Array(128).fill(0))
    assert.deepEqual(events, ['ended'])
  })
}

for (const shared of [false, true]) {
  const name = `AudioSourceWorkletProcessor${shared ? '2' : ''}`
  const path = `avrender/src/pcm/${name}.ts`
  const source = readSource(path)
  const code = getClass(source, name).getText(source).replace('export default ', '')
  class Base {
    constructor() {
      this.ipcPort = {
        on: (_, handler) => this.onRequest = handler,
        reply: () => {}
      }
    }
  }
  const Processor = evaluate(`${code}\nreturn ${name}`, { AudioWorkletProcessorBase: Base, REQUEST: 'request', nullptr: null })
  test(`${name}: stop waits for a paused refill before freeing its buffers`, async () => {
    const processor = new Processor()
    const operations = []
    let release
    processor.pullPending = new Promise((resolve) => release = resolve)
    processor.pullIPC = { destroy: () => operations.push('destroy') }
    processor.freeBuffer = () => operations.push('free')
    const pending = processor.onRequest({ method: 'stop' })
    await Promise.resolve()
    assert.equal(processor.stopped, true)
    assert.deepEqual(operations, [])
    release()
    await pending
    assert.deepEqual(operations, shared ? ['free', 'free', 'destroy'] : ['destroy'])
  })
}
