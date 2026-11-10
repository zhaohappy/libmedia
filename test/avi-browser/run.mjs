// SPDX-License-Identifier: LGPL-3.0-or-later

const query = new URLSearchParams(location.search)
const scenario = query.get('scenario') ?? 'startup'
const source = query.get('source') ?? 'avi'
const runId = crypto.randomUUID()
// AVPlayerStatus is a const enum and is erased from the ESM bundle.
const destroyedStatus = 2
const endedStatus = 7
const pausedStatus = 8
const output = document.querySelector('#report')
const report = {
  scenario,
  source,
  isolated: crossOriginIsolated,
  events: [],
  errors: {},
  decodeErrors: { audio: 0, video: 0 },
  results: [],
  network: {},
  loaded: false,
  played: false,
  done: false,
  ok: false
}
window.report = report

let player
let destroyed = false
let started
let duration
let timeoutMs = 20000
let settleMs
let nearMs

function numberParam(name, fallback, minimum) {
  if (!query.has(name)) {
    return fallback
  }
  const value = Number(query.get(name))
  if (!Number.isSafeInteger(value) || value < minimum || !query.get(name).trim()) {
    throw new Error(`${name} must be an integer of at least ${minimum}`)
  }
  return value
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function timed(operation, label) {
  let timer
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs)
      })
    ])
  }
  finally {
    clearTimeout(timer)
  }
}

async function network() {
  const response = await fetch(`/metrics?run=${runId}`)
  if (!response.ok) {
    throw new Error(`Unable to fetch metrics (HTTP ${response.status})`)
  }
  return response.json()
}

function networkBytes(metrics) {
  return metrics.requests.reduce((total, { bytes }) => total + bytes, 0)
}

async function settleNetwork() {
  const initial = report.network.afterDestroy ?? await timed(network(), 'Initial cleanup metrics')
  const initialBytes = networkBytes(initial)
  const quietMs = Math.max(250, 2 * initial.latencyMs)
  const deadline = performance.now() + Math.min(3000, timeoutMs)
  let unchangedSince = performance.now()
  let previous = initial
  let previousBytes = initialBytes
  while (performance.now() < deadline) {
    await wait(75)
    const current = await timed(network(), 'Cleanup metrics')
    const bytes = networkBytes(current)
    const requests = current.requests.length
    const idle = current.requests.every(({ elapsedMs }) => elapsedMs !== undefined)
    const now = performance.now()
    if (!idle || bytes !== previousBytes || requests !== previous.requests.length) {
      unchangedSince = now
    }
    report.network.final = {
      ...current,
      bytesAfterDestroy: bytes - initialBytes,
      requestsAfterDestroy: requests - initial.requests.length,
      settled: idle && now - unchangedSince >= quietMs
    }
    if (report.network.final.settled) {
      return
    }
    previous = current
    previousBytes = bytes
  }
  throw new Error('Media requests did not settle after destroy')
}

function snapshot() {
  const stats = player.getStats()
  const audioErrors = Number(stats.audioDecodeErrorPacketCount)
  const videoErrors = Number(stats.videoDecodeErrorPacketCount)
  report.decodeErrors.audio = Math.max(report.decodeErrors.audio, audioErrors)
  report.decodeErrors.video = Math.max(report.decodeErrors.video, videoErrors)
  return {
    status: player.status,
    audioTime: Number(stats.audioCurrentTime),
    videoTime: Number(stats.videoCurrentTime),
    audioDecoded: Number(stats.audioFrameDecodeCount),
    videoDecoded: Number(stats.videoFrameDecodeCount),
    audioRendered: Number(stats.audioFrameRenderCount),
    videoRendered: Number(stats.videoFrameRenderCount),
    audioErrors,
    videoErrors
  }
}

function advances(before, after, minimum = 0) {
  return (!report.streams.some((s) => s.type === 'Audio') || after.audioTime - before.audioTime > minimum)
    && (!report.streams.some((s) => s.type === 'Video') || after.videoTime - before.videoTime > minimum)
}

function nearTarget(stats, target) {
  return (!report.streams.some((s) => s.type === 'Audio') || Math.abs(stats.audioTime - target) < nearMs)
    && (!report.streams.some((s) => s.type === 'Video') || Math.abs(stats.videoTime - target) < nearMs)
}

function targetAt(fraction) {
  return Math.max(0, Math.min(Math.round(duration * fraction), duration - settleMs - 500))
}

function explicitTarget(name, fallback) {
  const target = numberParam(name, fallback, 0)
  if (target > duration) {
    throw new Error(`${name} must be within the media duration`)
  }
  return target
}

function seekTargets() {
  if (!query.has('targets')) {
    return [0.025, 0.37, 0.71, 0.99, 0.005, 0.49, 0.001, 0.97, 0.01, 0.66,
      0.17, 0.9, 0.004, 0.46, 0.94, 0.012, 0.58, 0.29, 0.96, 0.002].map(targetAt)
  }
  return query.get('targets').split(',').map((value) => {
    const target = Number(value)
    if (!value.trim() || !Number.isSafeInteger(target) || target < 0 || target > duration) {
      throw new Error('targets must be a comma-separated list of millisecond timestamps within the media duration')
    }
    return target
  })
}

async function step(name, action) {
  const begin = performance.now()
  const result = await action()
  report.results.push({ name, ms: performance.now() - begin, ...result })
  if (!result.ok) {
    throw new Error(`${name} failed`)
  }
}

function play() {
  return timed(player.play({ audio: true, video: true, subtitle: false }), 'Play')
}

function seek(target) {
  return timed(player.seek(BigInt(target)), 'Seek')
}

function loadOptions() {
  return { ext: query.get('ext') || undefined, iso: { titleId: query.get('title') || undefined } }
}

async function loadAndPlay(url) {
  const input = query.get('input') ?? query.get('transport') ?? 'http'
  if (!['http', 'file'].includes(input)) {
    throw new Error('input/transport must be http or file')
  }
  if (input === 'file' && !(url instanceof File)) {
    const response = await timed(fetch(url), 'Fetch local input')
    if (!response.ok) {
      throw new Error(`Unable to fetch local input (HTTP ${response.status})`)
    }
    url = new File([await timed(response.blob(), 'Read local input')], new URL(url, location.href).pathname.split('/').pop())
  }
  await timed(player.load(url, loadOptions()), 'Load')
  report.loaded = true
  if (query.get('ext') === 'iso') {
    report.disc = JSON.parse(JSON.stringify(player.getDiscInfo(), (key, value) => typeof value === 'bigint' ? String(value) : value))
    report.chapters = player.getChapters().map((chapter) => Number(chapter.start))
  }
  report.loadMs = performance.now() - started
  duration = Number(player.getDuration())
  report.durationMs = duration
  report.streams = player.getStreams().map(({ mediaType, duration, timeBase }) => ({
    type: mediaType,
    duration: String(duration),
    timeBase
  }))
  if (!Number.isSafeInteger(duration) || duration <= 0) {
    throw new Error('Expected a finite positive duration')
  }
  if (scenario === 'rates') {
    if (duration < 180000 || !report.streams.some((s) => s.type === 'Audio')
      || !report.streams.some((s) => s.type === 'Video')) {
      throw new Error('Rate checks require audio and video with at least 180 seconds of media')
    }
    player.setPlaybackRate(15)
  }
  player.setVolume(0)
  await play()
  report.played = true
  report.playMs = performance.now() - started
}

async function checkPlayback() {
  await step('startup playback', async () => {
    const before = snapshot()
    await wait(settleMs)
    const after = snapshot()
    return { before, after, ok: advances(before, after) }
  })
}

async function checkVideoTracks() {
  const original = player.getSelectedVideoStreamId()
  const alternate = player.getStreams().find((stream) => stream.mediaType === 'Video' && stream.id !== original)
  if (!alternate) {
    throw new Error('Track switching requires at least two video streams')
  }
  await checkSeek(explicitTarget('target', targetAt(0.1)))
  for (const paused of [false, true]) {
    for (const id of [alternate.id, original]) {
      await step(`switch video to ${id} (${paused ? 'paused' : 'playing'})`, async () => {
        if (paused) {
          await timed(player.pause(), 'Pause')
        }
        const target = Number(player.currentTime)
        await timed(player.selectVideo(id), 'Select video')
        const before = snapshot()
        let stayedPaused = true
        if (paused) {
          await wait(300)
          const held = snapshot()
          stayedPaused = held.status === pausedStatus
            && held.audioTime === before.audioTime && held.videoTime === before.videoTime
          await play()
        }
        await wait(settleMs)
        const after = snapshot()
        return {
          id, target, before, after, stayedPaused,
          ok: player.getSelectedVideoStreamId() === id && stayedPaused
            && nearTarget(before, target) && advances(before, after)
            && after.videoRendered > before.videoRendered
            && after.videoErrors === 0 && after.audioErrors === 0
        }
      })
    }
  }
}

async function checkSeek(target) {
  await step('seek and resume playback', async () => {
    const before = snapshot()
    const begin = performance.now()
    await seek(target)
    const seekMs = performance.now() - begin
    const atSeek = snapshot()
    const resumedAt = performance.now()
    report.network.firstSeek ??= await timed(network(), 'Seek metrics')
    await wait(settleMs)
    const after = snapshot()
    // Playback during the observation window is progress, not seek error.
    const elapsed = performance.now() - resumedAt
    return {
      target, seekMs, before, atSeek, after,
      ok: nearTarget(atSeek, target) && nearTarget(after, target + elapsed) && advances(atSeek, after)
    }
  })
}

async function checkPausedSeek(target) {
  await step('paused seek and resume', async () => {
    await timed(player.pause(), 'Pause')
    const pausedEvent = report.events.some(({ event }) => event === 'PAUSED')
    await seek(target)
    const before = snapshot()
    await wait(700)
    const paused = snapshot()
    await play()
    await wait(settleMs)
    const after = snapshot()
    return {
      target, before, paused, after,
      ok: pausedEvent && before.status === pausedStatus && paused.status === pausedStatus
        && paused.audioTime === before.audioTime && paused.videoTime === before.videoTime
        && nearTarget(before, target) && nearTarget(after, target) && advances(paused, after)
    }
  })
}

async function edges() {
  await checkPausedSeek(explicitTarget('pausedTarget', targetAt(0.5)))
  await step('seek to EOF then backward', async () => {
    const target = explicitTarget('backTarget', targetAt(0.25))
    await seek(duration)
    const end = snapshot()
    await seek(target)
    const before = snapshot()
    await wait(settleMs)
    const after = snapshot()
    return { target, end, before, after, ok: end.status === endedStatus && nearTarget(after, target) && advances(before, after) }
  })
  await step('natural end then replay', async () => {
    const target = explicitTarget('replayTarget', targetAt(0.001))
    const initialEnds = report.events.filter(({ event }) => event === 'ENDED').length
    await seek(Math.max(duration - 1000, 0))
    // Some containers understate duration; wait for the actual end event with a bound.
    const deadline = performance.now() + Math.min(timeoutMs, 10000)
    while (performance.now() < deadline && report.events.filter(({ event }) => event === 'ENDED').length === initialEnds) {
      await wait(100)
    }
    const ended = report.events.filter(({ event }) => event === 'ENDED').length > initialEnds
    const end = snapshot()
    await seek(target)
    const before = snapshot()
    await wait(settleMs)
    const after = snapshot()
    return { target, end, before, after, ended, ok: ended && nearTarget(after, target) && advances(before, after) }
  })
  await step('2x speed', async () => {
    const target = explicitTarget('rateTarget', targetAt(0.08))
    player.setPlaybackRate(2)
    try {
      await seek(target)
      const before = snapshot()
      await wait(2500)
      const after = snapshot()
      return { target, before, after, ok: advances(before, after, 3500) }
    }
    finally {
      player.setPlaybackRate(1)
    }
  })
}

async function checkPlaybackRates() {
  const initialRate = player.getPlaybackRate()
  await step('playback rate bounds', async () => {
    player.setPlaybackRate(99)
    const upper = player.getPlaybackRate()
    player.setPlaybackRate(0)
    const lower = player.getPlaybackRate()
    player.setPlaybackRate(initialRate)
    return { initialRate, upper, lower, ok: initialRate === 15 && upper === 15 && lower === 0.3 }
  })
  for (const rate of [15, 2, 4, 8, 15, 1, 0.3, 1]) {
    await step(`${rate}x playback`, async () => {
      player.setPlaybackRate(rate)
      // Allow queued audio and the native media element to adopt the new rate.
      await wait(1000)
      const media = document.querySelector('#player video')
      const qualityBefore = player.isMSE() ? media?.getVideoPlaybackQuality() : null
      const before = snapshot()
      const start = Number(player.currentTime)
      const begin = performance.now()
      await wait(2000)
      const elapsed = performance.now() - begin
      const progress = Number(player.currentTime) - start
      const after = snapshot()
      const actualRate = progress / elapsed
      const nativeRate = player.isMSE() ? media?.playbackRate : null
      const qualityAfter = player.isMSE() ? media?.getVideoPlaybackQuality() : null
      const renderedFrames = qualityAfter && qualityBefore
        ? qualityAfter.totalVideoFrames - qualityAfter.droppedVideoFrames
          - qualityBefore.totalVideoFrames + qualityBefore.droppedVideoFrames
        : after.videoRendered - before.videoRendered
      return { rate, actualRate, nativeRate, before, after,
        renderedFrames,
        ok: player.getPlaybackRate() === rate && Math.abs(actualRate - rate) < rate * 0.25
          && renderedFrames > 0 && (player.isMSE() ? nativeRate === rate
          : advances(before, after) && Math.abs(after.audioTime - after.videoTime) < 1500) }
    })
  }
  player.setPlaybackRate(15)
  await step('15x paused seek and resume', async () => {
    const target = explicitTarget('rateTarget', targetAt(0.1))
    await timed(player.pause(), 'Pause')
    await seek(target)
    const landed = Number(player.currentTime)
    await wait(700)
    const held = Number(player.currentTime)
    const paused = player.status === pausedStatus
    await play()
    const resumeStart = performance.now()
    // Native playback can wait for decoded data after a seek even when play()
    // has resolved. Bound recovery separately from the steady-state rate.
    while (Number(player.currentTime) - held < 15000 && performance.now() - resumeStart < 5000) {
      await wait(100)
    }
    const recovered = Number(player.currentTime)
    const recoveryMs = performance.now() - resumeStart
    const begin = performance.now()
    await wait(2000)
    const resumed = Number(player.currentTime)
    const actualRate = (resumed - recovered) / (performance.now() - begin)
    return { target, landed, held, resumed, recoveryMs, actualRate,
      ok: paused && Math.abs(landed - target) < 1000 && Math.abs(held - landed) < 100
        && recovered - held >= 15000 && Math.abs(actualRate - 15) < 15 * 0.25
        && player.getPlaybackRate() === 15 }
  })
  await step('15x natural end', async () => {
    await seek(Math.max(0, duration - 15000))
    const deadline = performance.now() + timeoutMs
    while (player.status !== endedStatus && performance.now() < deadline) {
      await wait(100)
    }
    return { status: player.status, ok: player.status === endedStatus }
  })
  player.setPlaybackRate(1)
}

async function destroy() {
  if (!player || destroyed) {
    return
  }
  if (report.played) {
    report.beforeDestroy = snapshot()
  }
  destroyed = true
  const begin = performance.now()
  await timed(player.destroy(), 'Destroy')
  report.destroy = { ms: performance.now() - begin, status: player.status }
  report.network.afterDestroy = await timed(network(), 'Destroy metrics')
  if (report.destroy.status !== destroyedStatus) {
    throw new Error('AVPlayer did not reach the destroyed state')
  }
}

async function waitForActiveMedia(isSettled, delay) {
  const deadline = performance.now() + timeoutMs
  await wait(delay)
  while (!isSettled() && performance.now() < deadline) {
    const metrics = await timed(network(), 'Cancellation metrics')
    const active = metrics.requests.filter(({ elapsedMs }) => elapsedMs === undefined)
    if (active.length) {
      return active
    }
    await wait(25)
  }
  return []
}

function expectedCancellation(error) {
  if (error?.name === 'AbortError' || error === 'ipc port close') {
    return true
  }
  // If destruction interrupts format detection or stream analysis, load reports the demuxer result.
  return scenario === 'cancel-load' && error?.name === 'Error'
    && /(?:open|analyze) stream failed, ret: (?:-2|-1048576|-1048572)(?:,|$)/.test(error.message)
}

async function cancel(operation, delay) {
  let settled = false
  const pending = operation.then(
    () => ({ resolved: true }),
    (error) => ({ resolved: false, error: String(error), expected: expectedCancellation(error) })
  ).finally(() => {
    settled = true
  })

  const active = await waitForActiveMedia(() => settled, delay)
  const interrupted = !settled && active.length > 0
  await destroy()
  const operationResult = await timed(pending, 'Canceled operation')
  const finalStatus = player.status
  const ok = interrupted && finalStatus === destroyedStatus && (operationResult.resolved || operationResult.expected)
  return { active, interrupted, operationResult, finalStatus, ok }
}

async function run() {
  started = performance.now()
  const originalError = console.error
  console.error = (...args) => {
    const message = args.map(String).join(' ')
    const key = message.includes('Header missing') ? 'headerMissing'
      : message.includes('audio decode error') ? 'audioDecode'
        : message.includes('video decode error') ? 'videoDecode'
          : message.includes('Invalid data') ? 'invalidPacket' : 'other'
    report.errors[key] = (report.errors[key] ?? 0) + 1
    if (report.errors[key] <= 2) {
      originalError(...args)
    }
  }

  try {
    timeoutMs = numberParam('timeout', timeoutMs, 1)
    settleMs = numberParam('settle', 1500, 1)
    nearMs = numberParam('near', 3000, 1)
    const preload = numberParam('preload', 60, 0)
    const sources = { avi: '/media.avi', rm: '/media.rm', 'rm-file': '/media.rm', wmv: '/media.wmv', asf: '/media.asf', wma: '/media.wma', control: '/control.mp4' }
    if (!Object.hasOwn(sources, source)) {
      throw new Error('source must be avi, rm, rm-file, wmv, asf, wma or control')
    }
    const url = new URL(sources[source], location.href)
    url.searchParams.set('run', runId)

    const response = await timed(fetch('/avplayer.js'), 'Fetch AVPlayer')
    if (!response.ok) {
      throw new Error(`Unable to fetch AVPlayer (HTTP ${response.status})`)
    }
    const bundle = URL.createObjectURL(new Blob([await response.text()], { type: 'text/javascript' }))
    let module
    try {
      module = await timed(import(bundle), 'Import AVPlayer')
    }
    finally {
      URL.revokeObjectURL(bundle)
    }
    const { default: AVPlayer, Events } = module
    const container = document.querySelector('#player')
    Object.assign(container.style, { width: '640px', height: '360px' })
    const decoder = query.get('decoder') ?? 'default'
    if (!['default', 'wasm'].includes(decoder)) {
      throw new Error('decoder must be default or wasm')
    }
    player = new AVPlayer({
      container,
      isLive: false,
      enableHardware: decoder !== 'wasm' && query.get('hardware') !== '0',
      enableWebCodecs: decoder !== 'wasm' && query.get('webcodecs') !== '0',
      enableWebGPU: true,
      enableWorker: query.get('worker') !== '0',
      ...(query.has('mse') ? { checkUseMSE: () => query.get('mse') === '1' } : {}),
      preLoadTime: preload,
      wasmBaseUrl: `${location.origin}/wasm`
    })
    for (const event of ['LOADED', 'PLAYING', 'PLAYED', 'FIRST_AUDIO_RENDERED', 'FIRST_VIDEO_RENDERED',
      'PAUSED', 'SEEKING', 'SEEKED', 'ENDED', 'ERROR']) {
      player.on(Events[event], () => report.events.push({ event, ms: performance.now() - started }))
    }

    const input = source === 'rm-file'
      ? new File([await (await fetch(url)).blob()], 'sample.rmvb') : url.href
    if (scenario === 'cancel-load') {
      await step('destroy during load', () => cancel(player.load(input, loadOptions()), numberParam('cancelAfter', 40, 0)))
    }
    else {
      await loadAndPlay(input)
      report.mse = player.isMSE()
      if (query.has('mse') && report.mse !== (query.get('mse') === '1')) {
        throw new Error('Playback did not use the requested MSE mode')
      }
      report.network.startup = await timed(network(), 'Startup metrics')

      switch (scenario) {
        case 'startup':
          await checkPlayback()
          break
        case 'rates':
          await wait(settleMs)
          await checkPlaybackRates()
          break
        case 'tracks':
          await checkPlayback()
          await checkVideoTracks()
          break
        case 'full':
          await step('full playback to natural end', async () => {
            const before = snapshot()
            const deadline = performance.now() + duration + timeoutMs
            while (player.status !== endedStatus && performance.now() < deadline) {
              await wait(100)
            }
            const after = snapshot()
            return { before, after, ok: player.status === endedStatus
              && after.audioRendered > before.audioRendered && after.videoRendered > before.videoRendered }
          })
          break
        case 'rapid':
          await step('latest overlapping seek wins', async () => {
            await timed(player.pause(), 'Pause')
            const targets = [0.7, 0.1, 0.8, 0.2, 0.5].map(targetAt)
            const pending = []
            for (const target of targets) {
              pending.push(seek(target))
              await wait(40)
            }
            await Promise.all(pending)
            const after = snapshot()
            await wait(250)
            const still = snapshot()
            await play()
            await wait(settleMs)
            const resumed = snapshot()
            const target = targets.at(-1)
            return { targets, after, still, resumed, ok: after.status === pausedStatus
              && Math.abs(after.audioTime - target) <= 500 && Math.abs(after.videoTime - target) <= 500
              && still.audioTime === after.audioTime && still.videoTime === after.videoTime
              && advances(still, resumed) }
          })
          break
        case 'cold':
        case 'fallback':
          await checkSeek(explicitTarget('target', targetAt(0.71)))
          if (scenario === 'fallback') {
            await step('idx1 probe failure exercised', async () => {
              const { requests } = await timed(network(), 'Fallback metrics')
              const probe = requests.find((request) => request.status === 503 && request.injectedIdx1Failure
                && request.elapsedMs !== undefined && !request.aborted)
              const ordinaryRead = probe && requests.find((request) => request.status === 206 && request.startsAtIdx1Header
                && request.atMs >= probe.atMs + probe.elapsedMs && request.start + request.bytes > probe.start)
              return { probe, ordinaryRead, ok: Boolean(ordinaryRead) }
            })
          }
          break
        case 'matrix':
          for (const target of seekTargets()) {
            await checkSeek(target)
          }
          await edges()
          break
        case 'paused-seek':
          for (const fraction of [0.01, 0.71, 0.025, 0.49, 0.97, 0.001]) {
            await checkPausedSeek(targetAt(fraction))
          }
          break
        case 'edges':
          await edges()
          break
        case 'destroy':
          await step('destroy after startup', async () => {
            await destroy()
            return { ok: true }
          })
          break
        case 'cancel-seek':
          await step('destroy during seek', () => {
            const target = explicitTarget('target', targetAt(0.71))
            return cancel(player.seek(BigInt(target)), numberParam('cancelAfter', 150, 0))
          })
          break
        default:
          throw new Error(`Unknown scenario: ${scenario}`)
      }
    }

  }
  catch (error) {
    report.failure = String(error)
  }
  finally {
    try {
      await destroy()
      await settleNetwork()
      if (['destroy', 'cancel-load', 'cancel-seek'].includes(scenario)
        && (report.network.final.bytesAfterDestroy || report.network.final.requestsAfterDestroy)) {
        throw new Error('Media traffic continued after destroy')
      }
    }
    catch (error) {
      report.cleanupFailure = String(error)
    }
    const { headerMissing, audioDecode, videoDecode, invalidPacket } = report.errors
    const hasDecodeErrors = headerMissing || audioDecode || videoDecode || invalidPacket
      || report.decodeErrors.audio || report.decodeErrors.video
    if (hasDecodeErrors || report.events.some(({ event }) => event === 'ERROR')) {
      report.failure ??= 'AVPlayer reported playback errors'
    }
    console.error = originalError
    if (source === 'rm') {
      const requests = report.network.final?.requests ?? []
      report.range = {
        requests: requests.length,
        nonzeroStarts: requests.filter((r) => r.start > 0).length,
        startupBytes: report.network.startup ? networkBytes(report.network.startup) : 0,
        valid: requests.length > 0 && requests.every((r) => (r.status === 206 || scenario === 'cancel-load' && r.aborted && r.bytes === 0 && r.status === undefined)
          && r.range && r.contentRange?.startsWith(`bytes ${r.start}-${r.end}/`))
      }
      if (!report.range.valid) {
        report.failure ??= 'HTTP Range response verification failed'
      }
    }
    report.ok = !report.failure && !report.cleanupFailure
    report.done = true
    output.textContent = JSON.stringify(report, null, 2)
  }
}

const button = document.querySelector('#start')
if (query.get('manual') === '1') {
  button.hidden = false
  button.addEventListener('click', () => {
    button.disabled = true
    void run()
  }, { once: true })
}
else {
  void run()
}
