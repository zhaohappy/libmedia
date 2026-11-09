import { classSource, evaluate } from './helpers/source.mjs'
import { test } from './helpers/test.mjs'
import assert from 'node:assert/strict'

const prelude = `
  const AVPlayerStatus = { LOADED: 2, LOADING: 1, PLAYED: 6, ENDED: 7, PAUSED: 8, SEEKING: 9, STOPPED: 11 };
  const logger = { info: () => {}, debug: () => {}, warn: () => {}, error: () => {} };
  const eventType = { ENDED: 'ended', SEEKING: 'seeking', SEEKED: 'seeked', PLAYED: 'played', STOPPED: 'stopped', ERROR: 'error' };
  const defined = () => false;
  const ENABLE_MSE = 0;
  const ENABLE_PROTOCOL_DASH = 0;
  const ENABLE_PROTOCOL_HLS = 0;
  const ENABLE_SUBTITLE_RENDER = 0;
  const AVSeekFlags = { FRAME: 1 };
  const AVMediaType = { AVMEDIA_TYPE_VIDEO: 0 };
  const avQ2D = q => q.num / q.den;
  const NOPTS_VALUE_BIGINT = -1n;
  const bigint = { max: (a, b) => a > b ? a : b };
`
const program = classSource('avplayer/src/AVPlayer.ts', 'AVPlayer', ['doSeek', 'seek', 'seekTo', 'drainSeeks', 'handleEnded', 'stop', 'syncRenderSeekTime', 'renderSeekId'])
const { AVPlayer, status } = evaluate(`${prelude + program}\nreturn { AVPlayer, status: AVPlayerStatus };`)
const selectedVideo = { index: 0, codecpar: { codecType: 0, framerate: { num: 30, den: 1 } } }
const selectedAudio = { index: 1, codecpar: { codecType: 1 } }
const EOF = 10000n

function fixture() {
  const player = new AVPlayer()
  const events = []
  const replays = []
  player.status = status.PLAYED
  player.options = { loop: false }
  player.changingStreamPending = []
  player.externalSubtitleTasks = []
  player.formatContext = { streams: [selectedVideo, selectedAudio] }
  player.selectedVideoStream = selectedVideo
  player.selectedAudioStream = selectedAudio
  player.audioDecoder2AudioRenderChannel = {}
  player.videoDecoder2VideoRenderChannel = {}
  player.audioEnded = false
  player.videoEnded = false
  player.fire = (event) => events.push({ event, status: player.status })
  player.isAttachmentPicture = () => false
  player.replayTo = async (target) => {
    replays.push(target)
    player.audioEnded = target === EOF
    player.videoEnded = target === EOF
  }
  const makeRenderer = (end = EOF) => ({
    beforeSeek: async () => {},
    syncSeekTime: async () => {},
    finishVideoSeek: async () => {},
    afterSeek: async (_, timestamp) => timestamp === end
  })
  AVPlayer.AudioRenderThread = makeRenderer()
  player.VideoRenderThread = makeRenderer()
  AVPlayer.DemuxerThread = { seek: async (_, timestamp) => timestamp }
  return { player, events, replays, makeRenderer }
}

async function exactEnd() {
  const { player, events, replays } = fixture()
  await player.seek(EOF)
  assert.equal(player.status, status.ENDED)
  assert.deepEqual(events.map((item) => item.event), ['seeking', 'ended', 'seeked'])
  assert.equal(events.at(-1).status, status.ENDED)
  // The actual ended notifications can arrive later.
  await player.handleEnded()
  assert.equal(events.filter((item) => item.event === 'ended').length, 1)
  // Repeating EOF must leave the player ended.
  await player.seek(EOF)
  assert.equal(player.status, status.ENDED)
  assert.deepEqual(replays, [EOF])
  await player.seek(5000n)
  assert.equal(player.status, status.PLAYED)
  assert.deepEqual(replays, [EOF, 5000n])
}

async function staleNotification() {
  const { player, events, replays } = fixture()
  let release
  AVPlayer.AudioRenderThread.beforeSeek = () => new Promise((resolve) => {
    release = resolve
  })
  const seek = player.seek(5000n)
  player.audioEnded = player.videoEnded = true
  await player.handleEnded()
  assert.equal(player.status, status.SEEKING)
  assert.deepEqual(events.map((item) => item.event), ['seeking'])
  release()
  await seek
  assert.equal(player.status, status.PLAYED)
  assert.deepEqual(events.map((item) => item.event), ['seeking', 'seeked'])
  assert.deepEqual(replays, [])
}

async function oneStreamEnded() {
  const { player, events, makeRenderer } = fixture()
  AVPlayer.AudioRenderThread = makeRenderer(5000n)
  await player.seek(5000n)
  assert.equal(player.status, status.PLAYED)
  assert.deepEqual(events.map((item) => item.event), ['seeking', 'seeked'])
}

async function audioOnly() {
  const { player, events } = fixture()
  player.videoDecoder2VideoRenderChannel = undefined
  player.VideoRenderThread = undefined
  player.selectedVideoStream = undefined
  await player.seek(EOF)
  assert.equal(player.status, status.ENDED)
  assert.deepEqual(events.map((item) => item.event), ['seeking', 'ended', 'seeked'])
}
async function stopDuringSeek(pendingStage) {
  const { player, events } = fixture()
  const operations = []
  let releaseRender
  let releaseDemux
  let demuxStarted
  const demuxReached = new Promise((resolve) => {
    demuxStarted = resolve
  })
  if (pendingStage === 'renderer') {
    AVPlayer.AudioRenderThread.beforeSeek = () => new Promise((resolve) => {
      releaseRender = resolve
    })
  }
  AVPlayer.AudioRenderThread.stop = async () => {
    operations.push('audio-stop')
    releaseRender?.()
  }
  AVPlayer.AudioRenderThread.unregisterTask = async () => operations.push('audio-unregister')
  player.VideoRenderThread.unregisterTask = async () => operations.push('video-unregister')
  AVPlayer.DemuxerThread.seek = () => {
    operations.push('demux-seek')
    demuxStarted()
    return new Promise((resolve) => {
      releaseDemux = resolve
    })
  }
  AVPlayer.DemuxerThread.stop = async () => {
    operations.push('demux-stop')
    releaseDemux?.(5000n)
  }
  AVPlayer.DemuxerThread.unregisterTask = async () => operations.push('demux-unregister')
  player.audioSourceNode = {
    request: async (method) => operations.push(`worklet-${method}`),
    disconnect() {}
  }
  player.isMediaStreamMode = () => true
  player.statsController = { stop() {} }
  const seek = player.seek(5000n)
  const queued = player.seek(8000n)
  if (pendingStage === 'demux') {
    await demuxReached
  }
  const stop = player.stop()
  await Promise.all([seek, queued, stop])
  assert.equal(player.status, status.STOPPED)
  assert.deepEqual(events.map((item) => item.event), ['seeking', 'stopped'])
  const expected = ['worklet-pause', 'audio-stop', 'demux-stop', 'worklet-stop', 'video-unregister', 'audio-unregister', 'demux-unregister']
  if (pendingStage === 'demux') {
    expected.splice(1, 0, 'demux-seek')
  }
  assert.deepEqual(operations, expected)
}

for (const scenario of [exactEnd, staleNotification, oneStreamEnded, audioOnly]) {
  test(scenario.name, scenario)
}
for (const stage of ['renderer', 'demux']) {
  test(`stop during ${stage} seek`, () => stopDuringSeek(stage))
}

for (const paused of [false, true]) {
  test(`overlapping seeks retain latest target (paused=${paused})`, async () => {
    const { player, events } = fixture()
    if (paused) {
      player.status = status.PAUSED
    }
    const targets = []
    let release
    let started
    const reached = new Promise((resolve) => started = resolve)
    AVPlayer.DemuxerThread.seek = async (_, target) => {
      targets.push(target)
      if (targets.length === 1) {
        started()
        await new Promise((resolve) => release = resolve)
      }
      return target
    }
    const first = player.seek(2000n)
    await reached
    const middle = player.seek(7000n)
    const latest = player.seek(4000n)
    let settled = false
    latest.then(() => settled = true)
    await Promise.resolve()
    assert.equal(settled, false, 'queued callers wait for the actual seek')
    release()
    await Promise.all([first, middle, latest])
    assert.deepEqual(targets, [2000n, 4000n])
    assert.equal(player.status, paused ? status.PAUSED : status.PLAYED)
    assert.deepEqual(events.map(({ event }) => event), ['seeking', 'seeked', 'seeking', 'seeked'])
    await player.seek(1000n)
    assert.deepEqual(targets, [2000n, 4000n, 1000n])
  })
}

test('failed seek rejects all queued callers, resumes renderers and permits recovery', async () => {
  const { player, events } = fixture()
  const resumed = []
  AVPlayer.AudioRenderThread.afterSeek = async (_, target) => resumed.push(['audio', target])
  player.VideoRenderThread.afterSeek = async (_, target) => resumed.push(['video', target])
  AVPlayer.DemuxerThread.seek = async () => -9n
  const outcomes = await Promise.allSettled([player.seek(4000n), player.seek(7000n)])
  for (const outcome of outcomes) {
    assert.equal(outcome.status, 'rejected')
    assert.match(outcome.reason.message, /demuxer seek failed, code: -9/)
  }
  assert.deepEqual(resumed, [['audio', -1n], ['video', -1n]])
  assert.equal(player.status, status.PLAYED)
  assert.deepEqual(events.map(({ event }) => event), ['seeking', 'error'])
  AVPlayer.DemuxerThread.seek = async (_, target) => target
  await player.seek(2000n)
  assert.equal(player.status, status.PLAYED)
  assert.equal(events.at(-1).event, 'seeked')
})

test('seek requested by a SEEKED listener belongs to the same drain', async () => {
  const { player } = fixture()
  const targets = []
  let pending
  AVPlayer.DemuxerThread.seek = async (_, target) => {
    targets.push(target)
    return target
  }
  player.fire = (event) => {
    if (event === 'seeked' && targets.length === 1) {
      pending = player.seek(6000n)
    }
  }
  await player.seek(1000n)
  await pending
  assert.deepEqual(targets, [1000n, 6000n])
})

test('a seek in the drain completion microtask cannot be lost', async () => {
  const { player } = fixture()
  const targets = []
  let late
  player.seekTo = async (target) => {
    targets.push(target)
    if (targets.length === 1) {
      queueMicrotask(() => queueMicrotask(() => late = player.seek(8000n)))
    }
  }
  await player.seek(1000n)
  await late
  assert.deepEqual(targets, [1000n, 8000n])
})


test('seek flushes output after releasing PCM and preserves pause state', async () => {
  for (const paused of [false, true]) {
    const { player } = fixture()
    player.status = paused ? status.PAUSED : status.PLAYED
    const operations = []
    player.audioSourceNode = { request: async (method) => operations.push(method) }
    AVPlayer.AudioRenderThread.beforeSeek = async () => operations.push('before')
    AVPlayer.AudioRenderThread.afterSeek = async () => operations.push('after')
    await player.seek(4000n)
    assert.deepEqual(operations, paused ? ['pause', 'before', 'after', 'clear'] : ['pause', 'before', 'after', 'clear', 'unpause'])
  }
})
