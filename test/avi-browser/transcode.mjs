// SPDX-License-Identifier: LGPL-3.0-or-later
const report = { done: false, ok: false, progress: 0, bytes: 0 }
window.report = report
const query = new URLSearchParams(location.search)
const duration = Number(query.get('duration') ?? 5000)
let bytes = new Uint8Array(1024 * 1024)
let position = 0
let size = 0
function write(data, pos = position) {
  if (pos + data.length > bytes.length) {
    const grown = new Uint8Array(Math.max(bytes.length * 2, pos + data.length))
    grown.set(bytes)
    bytes = grown
  }
  bytes.set(data, pos)
  size = Math.max(size, pos + data.length)
  position = pos + data.length
}

let transcoder
let timer
try {
  transcoder = new AVTranscoder({
    wasmBaseUrl: `${location.origin}/wasm`,
    onprogress: (_, progress) => {
      report.progress = progress
    }
  })
  await transcoder.ready()
  const ended = new Promise((resolve, reject) => {
    transcoder.on('task-ended', resolve)
    transcoder.on('task-error', (...args) => reject(new Error(`Transcode failed: ${args.join(', ')}`)))
    timer = setTimeout(() => reject(new Error('Transcode timed out')), 120000)
  })
  const input = query.get('file') === '1'
    ? new File([await (await fetch('/media.rm')).blob()], 'input.rmvb') : `${location.origin}/media.rm`
  const task = await transcoder.addTask({
    input: { file: input, enableWebCodecs: false, enableHardware: false },
    duration,
    output: {
      file: { write, appendBufferByPosition: write, seek: (pos) => {
        position = pos
      }, close() {} },
      format: 'mp4',
      video: { codec: 'h264', width: 320, height: 240, bitrate: 400000, enableWebCodecs: false, enableHardware: false },
      audio: { codec: 'aac', bitrate: 96000 }
    }
  })
  await transcoder.startTask(task)
  await ended
  const result = new Blob([bytes.slice(0, size)], { type: 'video/mp4' })
  const link = document.querySelector('#download')
  link.href = URL.createObjectURL(result)
  link.hidden = false
  report.bytes = size
  report.ok = size > 0
}
catch (error) {
  report.failure = String(error)
}
finally {
  clearTimeout(timer)
  await transcoder?.destroy()
  report.done = true
  document.querySelector('#report').textContent = JSON.stringify(report, null, 2)
}
