import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { test } from './helpers/test.mjs'
import { getClass, readSource, transpile } from './helpers/source.mjs'

function declaration(path, name) {
  const source = readSource(path)
  return getClass(source, name).getText(source).replace(/^export default /, '')
}

function worklet(postMessage = () => {}) {
  const result = runInNewContext(transpile(`
    ${declaration('common/src/network/IPCPort.ts', 'IPCPort')}
    ${declaration('avrender/src/pcm/audioWorklet/base/AudioWorkletProcessorBase.ts', 'AudioWorkletProcessorBase')}
    ({ processor: new AudioWorkletProcessorBase(), IPCPort,
       setTimeoutType: typeof setTimeout, clearTimeoutType: typeof clearTimeout })
  `), {
    Emitter: class {
      fire() {}
    },
    AudioWorkletProcessor: class {
      constructor() {
        this.port = { postMessage, start() {}, close() {} }
      }
    },
    isDef: (value) => value !== undefined, NOTIFY: 'notify', REQUEST: 'request'
  })
  assert.equal(result.setTimeoutType, 'undefined')
  assert.equal(result.clearTimeoutType, 'undefined')
  return result.processor
}

test('actual Worklet base accepts untimed pull replies without browser timers', async () => {
  const processor = worklet()
  const pending = processor.request('pull')
  processor.port.onmessage({ data: { type: 'reply', data: { seq: 0, result: 42 } } })
  assert.equal(await pending, 42)
  assert.equal(processor.ipcPort.requestMap.size, 0)
  processor.ipcPort.destroy()
})

test('untimed Worklet IPC destroy rejects outstanding requests without timers', async () => {
  const processor = worklet()
  const pending = processor.request('pull').catch((error) => error)
  processor.ipcPort.destroy()
  assert.equal(await pending, 'ipc port close')
  assert.equal(processor.ipcPort.requestMap.size, 0)
})

test('untimed Worklet send failures keep their original error and clear pending requests', async () => {
  const processor = worklet(() => {
    throw Error('port unavailable')
  })
  await assert.rejects(processor.request('pull'), /port unavailable/)
  assert.equal(processor.ipcPort.requestMap.size, 0)
  processor.ipcPort.destroy()
})

test('explicit Worklet deadlines fail before sending or retaining a request when timers are unavailable', async () => {
  let sent = 0
  const processor = worklet(() => {
    sent++
  })
  await assert.rejects(processor.ipcPort.request('runtime', {}, [], { timeoutMs: 5 }), /IPC deadline timers unavailable/)
  assert.equal(sent, 0)
  assert.equal(processor.ipcPort.requestMap.size, 0)
  processor.ipcPort.destroy()
})
