import { classSource, evaluate } from './helpers/source.mjs'
import { test } from './helpers/test.mjs'
import assert from 'node:assert/strict'

function sourceClass(type, names) {
  const program = classSource(`avpipeline/src/${type}RenderPipeline.ts`, `${type}RenderPipeline`, names, 'RenderPipeline')
  const prelude = `
    const is = { number: value => typeof value === 'number' };
    const isPointer = () => false;
    const isAlphaVideoFrame = () => false;
    const avRescaleQ = value => value;
    const static_cast = BigInt;
    const assert = () => {};
    const logger = { debug: () => {}, info: () => {} };
    const AV_TIME_BASE_Q = {};
    const AV_MILLI_TIME_BASE_Q = {};
    const NOPTS_VALUE_BIGINT = -1n;
  `
  return evaluate(`${prelude + program}\nreturn RenderPipeline`)
}
const Audio = sourceClass('Audio', ['beforeSeek', 'stop'])
const Video = sourceClass('Video', ['beforeSeek', 'swap'])
async function audio({ ended, pausing, fakePlay }) {
  const audio = new Audio()
  const task = { ended, pausing, fakePlay, seeking: false, pendingPCMRequests: ended || pausing || fakePlay ? 0 : 1 }
  audio.tasks = new Map([['sample', task]])
  let clearedTimer = false
  audio.clearFakePlayTimer = () => {
    clearedTimer = true
  }
  const pending = audio.beforeSeek('sample')
  if (!ended && !pausing && !fakePlay) {
    assert.ok(task.seekSync, 'active audio waits for the in-flight pull')
    assert.equal(task.seeking, true)
    task.seekSync()
  }
  else {
    assert.equal(clearedTimer, true)
    assert.equal(task.seekSync, undefined)
  }
  await pending
  assert.equal(task.seeking, true)
}
async function stopWaitingAudio() {
  const audio = new Audio()
  const task = { ended: false, pausing: false, fakePlay: false, seeking: false, pendingPCMRequests: 1 }
  audio.tasks = new Map([['sample', task]])
  audio.clearFakePlayTimer = () => {}
  const pending = audio.beforeSeek('sample')
  assert.ok(task.seekSync)
  await audio.stop('sample')
  await pending
  assert.equal(task.stopping, true)
  assert.equal(task.seeking, true)
  assert.equal(task.seekSync, null)
  await audio.beforeSeek('sample')
}
async function video(ended) {
  const video = new Video()
  let resolvePull
  const released = []
  const lastFrame = { timestamp: 123, close: () => released.push('old') }
  const nextFrame = { timestamp: 124, close: () => released.push('new') }
  const task = {
    taskId: 'sample',
    frontBuffered: true,
    frontFrame: lastFrame,
    stats: {},
    loop: { stop: () => {} }
  }
  video.tasks = new Map([['sample', task]])
  video.pullFrame = () => new Promise((resolve) => {
    resolvePull = resolve
  })
  video.swap(task)
  const pending = video.beforeSeek('sample')
  assert.ok(task.seekSync, 'video waits for the in-flight pull')
  resolvePull(ended ? -2 : nextFrame)
  await pending
  assert.equal(task.ended, ended ? true : undefined)
  assert.equal(task.seekSync, null)
  assert.equal(task.seeking, true)
  assert.deepEqual(released, ended ? ['old'] : ['old', 'new'])
}
test('ended audio can seek', () => audio({ ended: true }))
test('paused audio can seek', () => audio({ pausing: true }))
test('fake playback can seek', () => audio({ fakePlay: true }))
test('active audio waits for PCM completion', () => audio({ ended: false }))
test('stop releases waiting audio', stopWaitingAudio)
test('video EOF releases a waiting seek', () => video(true))
test('video frame completion releases a waiting seek', () => video(false))
