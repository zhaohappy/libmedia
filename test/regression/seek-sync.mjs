import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { compileFunction } from 'node:vm'

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const ts = createRequire(join(checkout, 'package.json'))('typescript')

function loadClass(path, name, members, env) {
  const file = join(checkout, 'packages', path)
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
  const declaration = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === name)
  const methods = declaration.members.filter(member => members.includes(member.name?.getText(source)))
  const program = ts.transpileModule(
    `class ${name} {\n${methods.map(method => method.getText(source)).join('\n')}\n}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText
  return compileFunction(`${program}\nreturn ${name}`, Object.keys(env))(...Object.values(env))
}

const logger = { debug() {}, info() {}, warn() {} }
const defined = () => false
const AVMediaType = { AVMEDIA_TYPE_VIDEO: 1, AVMEDIA_TYPE_AUDIO: 2 }
const AVPlayer = loadClass('avplayer/src/AVPlayer.ts', 'AVPlayer', ['replayTo', 'syncRenderSeekTime', 'renderSeekId'], {
  AVMediaType,
  AVSeekFlags: { FRAME: 1 },
  avQ2D: value => value.num / value.den,
  bigint: { max: (a, b) => a > b ? a : b },
  defined,
  ENABLE_PROTOCOL_DASH: 0,
  ENABLE_PROTOCOL_HLS: 0,
  ENABLE_MSE: 0,
  ENABLE_SUBTITLE_RENDER: 0,
  NOPTS_VALUE_BIGINT: -1n,
  eventType: { TIME: 'time' },
})

function audioFixture() {
  let now = 0
  const stats = { videoPacketQueueLength: 100 }
  const events = []
  const frame = { pts: 1000n, valueOf: () => 1 }
  // Model a shared queue growing throughout demux preloading.
  class Sleep {
    then(resolve) {
      now += 5
      if (now < 2600) {
        stats.videoPacketQueueLength++
      }
      this.resolve = resolve
      queueMicrotask(() => this.stop())
    }

    stop() {
      this.resolve?.()
      this.resolve = undefined
    }
  }
  const Audio = loadClass('avpipeline/src/AudioRenderPipeline.ts', 'AudioRenderPipeline', ['syncSeekTime', 'finishVideoSeek', 'isEnd', 'stop'], {
    logger,
    getTimestamp: () => now,
    Sleep,
    avRescaleQ2: pts => pts,
    addressof: value => value,
    AV_MILLI_TIME_BASE_Q: null,
    defined,
    ENABLE_LOG_TRACE: 0,
  })
  const audio = new Audio()
  const task = {
    taskId: 'sample',
    stats,
    leftIPCPort: {
      async request() {
        events.push('audio-pull')
        return frame
      },
    },
    avframePool: { release: frame => events.push(`release-${frame.pts}`) },
    masterTimer: { setMasterTime() {} },
  }
  audio.tasks = new Map([['sample', task]])
  return { audio, task, events, frame, elapsed: () => now }
}

async function replayStartsBothRenderers() {
  const { audio, events, elapsed } = audioFixture()
  const player = new AVPlayer()
  player.taskId = 'sample'
  player.audioDecoder2AudioRenderChannel = {}
  player.videoDecoder2VideoRenderChannel = {}
  player.selectedVideoStream = { codecpar: { codecType: AVMediaType.AVMEDIA_TYPE_VIDEO, framerate: { num: 30, den: 1 } } }
  player.formatContext = { streams: [player.selectedVideoStream] }
  player.fire = () => {}
  player.controller = { setTimeUpdateListenType: () => {} }
  AVPlayer.DemuxerThread = { seek: async () => 900n }
  AVPlayer.AudioDecoderThread = { resetTask: async () => {} }
  AVPlayer.AudioRenderThread = audio
  audio.restart = async () => events.push('audio-restart')
  player.VideoDecoderThread = { resetTask: async () => {} }
  player.VideoRenderThread = {
    beforeSeek: async () => {},
    syncSeekTime: async () => events.push('video-sync'),
    isEnd: async () => false,
    restart: async () => events.push('video-restart'),
  }
  await player.replayTo(1000n)
  assert.deepEqual(events, ['video-sync', 'audio-pull', 'audio-restart', 'video-restart'])
  assert.ok(elapsed() < 50, 'a changing video queue should not delay audio after video sync')
}

async function staleCompletionKeepsCurrentSeekWaiting() {
  const { audio, task, events } = audioFixture()
  const seek = audio.syncSeekTime('sample', 1000n, 30, 8)
  await audio.finishVideoSeek('sample', 7)
  assert.deepEqual(events, [])
  assert.equal(task.pendingVideoSeekId, 8)
  await audio.finishVideoSeek('sample', 8)
  await seek
  assert.deepEqual(events, ['audio-pull'])
}

async function stopReleasesBackpressure() {
  const { audio, events } = audioFixture()
  const seek = audio.syncSeekTime('sample', 1000n, 30, 8)
  assert.deepEqual(events, [])
  await audio.stop('sample')
  await seek
  assert.deepEqual(events, [])
}

async function stopReleasesInFlightFrame() {
  const { audio, task, events, frame } = audioFixture()
  let reply
  task.leftIPCPort.request = () => new Promise((resolve) => {
    reply = resolve
  })
  const seek = audio.syncSeekTime('sample', 1000n)
  await audio.stop('sample')
  reply(frame)
  await seek
  assert.equal(task.paddingAVFrame, undefined)
  assert.deepEqual(events, ['release-1000'])
}

async function main() {
  for (const test of [replayStartsBothRenderers, staleCompletionKeepsCurrentSeekWaiting, stopReleasesBackpressure, stopReleasesInFlightFrame]) {
    await test()
    console.log(`${test.name} passed`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
