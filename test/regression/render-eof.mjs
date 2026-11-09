import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { compileFunction as compileVmFunction } from 'node:vm'

const compileFunction = (...args) => compileVmFunction(args.pop(), args)

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const require = createRequire(import.meta.url)
const ts = require(`${checkout}/node_modules/typescript`)
function sourceClass(type, names) {
  const file = `${checkout}/packages/avpipeline/src/${type}RenderPipeline.ts`
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
  const clazz = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === `${type}RenderPipeline`)
  const program = ts.transpileModule(
    `class RenderPipeline {\n${clazz.members.filter(method => names.includes(method.name?.getText(source))).map(method => method.getText(source)).join('\n')}\n}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText
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
  return compileFunction(`${prelude + program}\nreturn RenderPipeline`)()
}
const Audio = sourceClass('Audio', ['beforeSeek', 'stop'])
const Video = sourceClass('Video', ['beforeSeek', 'swap'])
async function completes(promise) {
  const result = await Promise.race([promise.then(() => 'completed'), new Promise(resolve => setTimeout(() => resolve('timed out'), 25))])
  assert.equal(result, 'completed')
}
async function audio({ ended, pausing, fakePlay }) {
  const audio = new Audio()
  const task = { ended, pausing, fakePlay, seeking: false }
  audio.tasks = new Map([['sample', task]])
  let clearedTimer = false
  audio.clearFakePlayTimer = () => {
    clearedTimer = true
  }
  const pending = audio.beforeSeek('sample')
  if (!ended && !pausing && !fakePlay) {
    assert.ok(task.seekSync, 'active audio waits for the in-flight pull')
    assert.equal(task.seeking, false)
    task.seekSync()
  }
  else {
    assert.equal(clearedTimer, true)
    assert.equal(task.seekSync, undefined)
  }
  await completes(pending)
  assert.equal(task.seeking, true)
}
async function stopWaitingAudio() {
  const audio = new Audio()
  const task = { ended: false, pausing: false, fakePlay: false, seeking: false }
  audio.tasks = new Map([['sample', task]])
  const pending = audio.beforeSeek('sample')
  assert.ok(task.seekSync)
  await audio.stop('sample')
  await completes(pending)
  assert.equal(task.stopping, true)
  assert.equal(task.seeking, false)
  assert.equal(task.seekSync, null)
  await completes(audio.beforeSeek('sample'))
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
    loop: { stop: () => {} },
  }
  video.tasks = new Map([['sample', task]])
  video.pullFrame = () => new Promise((resolve) => {
    resolvePull = resolve
  })
  video.swap(task)
  const pending = video.beforeSeek('sample')
  assert.ok(task.seekSync, 'video waits for the in-flight pull')
  resolvePull(ended ? -2 : nextFrame)
  await completes(pending)
  assert.equal(task.ended, ended ? true : undefined)
  assert.equal(task.seekSync, null)
  assert.equal(task.seeking, true)
  assert.deepEqual(released, ended ? ['old'] : ['old', 'new'])
}
(async () => {
  const results = await Promise.allSettled([
    audio({ ended: true }),
    audio({ pausing: true }),
    audio({ fakePlay: true }),
    audio({ ended: false }),
    stopWaitingAudio(),
    video(true),
    video(false),
  ])
  for (const [i, result] of results.entries()) {
    console.log(i + 1, result.status, result.reason?.message ?? '')
  }
  assert.ok(results.every(result => result.status === 'fulfilled'))
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
