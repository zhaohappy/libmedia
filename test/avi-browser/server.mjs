// SPDX-License-Identifier: LGPL-3.0-or-later

import { createReadStream } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { basename, dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../..')
const MiB = 1024 * 1024
const idx1PrefixBytes = 64 * 1024
const mode = process.env.LIBMEDIA_TEST_MODE ?? 'shared'
const port = Number(process.env.LIBMEDIA_TEST_PORT ?? 18774)
const rate = process.env.LIBMEDIA_TEST_THROTTLE === '1' ? MiB : 0
const latencyMs = rate ? 80 : 0
const failIdx1 = process.env.LIBMEDIA_TEST_FAIL_IDX1 === '1'
const wasmDir = process.env.LIBMEDIA_TEST_WASM_DIR

async function localFile(path, setting) {
  const info = path && await stat(path).catch(() => null)
  if (!info?.isFile() || !info.size) {
    throw new Error(`${setting} must identify a nonempty local file`)
  }
  return { path: resolve(path), size: info.size }
}

// Walk RIFF chunks by size so a large movi list costs a single header read.
async function findIdx1({ path, size }) {
  const file = await open(path, 'r')
  const header = Buffer.alloc(12)
  try {
    let offset = 0
    while (offset + 12 <= size) {
      const { bytesRead } = await file.read(header, 0, 12, offset)
      const type = header.toString('ascii', 8, 12)
      if (bytesRead !== 12 || header.toString('ascii', 0, 4) !== 'RIFF' || !['AVI ', 'AVIX'].includes(type)) {
        break
      }
      const riffEnd = offset + 8 + header.readUInt32LE(4)
      for (let pos = offset + 12; pos + 8 <= Math.min(riffEnd, size); ) {
        const { bytesRead } = await file.read(header, 0, 8, pos)
        if (bytesRead !== 8) {
          break
        }
        const chunkSize = header.readUInt32LE(4)
        const start = pos + 8
        const end = start + chunkSize
        if (end > Math.min(riffEnd, size)) {
          break
        }
        if (header.toString('ascii', 0, 4) === 'idx1' && chunkSize && chunkSize % 16 === 0) {
          return { start, end }
        }
        pos = end + (chunkSize & 1)
      }
      offset = riffEnd + (riffEnd & 1)
    }
  }
  finally {
    await file.close()
  }
  throw new Error('Range fault injection requires an AVI with a readable top-level idx1 chunk')
}

function byteRange(value, size) {
  if (value == null) {
    return { start: 0, end: size - 1 }
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)
  if (!match || (!match[1] && !match[2])) {
    return null
  }
  const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0)
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return start <= end && start < size ? { start, end } : null
}

let nextByteAt = 0

async function sendFile(response, file, range, mediaRequest, signal) {
  const stream = createReadStream(file.path, { ...range, signal })
  for await (const chunk of stream) {
    if (signal.aborted) {
      break
    }
    if (mediaRequest && rate) {
      const now = performance.now()
      nextByteAt = Math.max(now, nextByteAt) + chunk.length * 1000 / rate
      await setTimeout(nextByteAt - now, undefined, { signal })
    }
    const ready = response.write(chunk)
    if (mediaRequest) {
      mediaRequest.bytes += chunk.length
    }
    if (!ready) {
      await once(response, 'drain', { signal })
    }
  }
  response.end()
}

async function main() {
  if (!['ordinary', 'shared'].includes(mode)) {
    throw new Error('LIBMEDIA_TEST_MODE must be ordinary or shared')
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('LIBMEDIA_TEST_PORT must be a valid port')
  }

  const media = await localFile(process.env.LIBMEDIA_TEST_MEDIA, 'LIBMEDIA_TEST_MEDIA')
  const control = process.env.LIBMEDIA_TEST_CONTROL
    ? await localFile(process.env.LIBMEDIA_TEST_CONTROL, 'LIBMEDIA_TEST_CONTROL')
    : null
  const bundle = await localFile(
    process.env.LIBMEDIA_TEST_BUNDLE ?? resolve(root, 'dist/avplayer-single/avplayer.js'),
    'LIBMEDIA_TEST_BUNDLE or the default AVPlayer bundle'
  )
  const idx1 = failIdx1 ? await findIdx1(media) : null
  const html = await localFile(resolve(directory, 'index.html'), 'Diagnostic page')
  const runner = await localFile(resolve(directory, 'run.mjs'), 'Diagnostic runner')
  const metrics = new Map()

  function localAsset(path) {
    if (/^\/(?:\d+\.)?avtranscoder\.js$/.test(path)) {
      return { file: resolve(root, 'dist/avtranscoder', basename(path)), type: 'text/javascript' }
    }
    if (/^\/\d+\.avplayer\.js$/.test(path)) {
      return { file: resolve(dirname(bundle.path), basename(path)), type: 'text/javascript' }
    }
    if (/^\/wasm\/(decode|encode|resample|stretchpitch|scale)\/[a-z0-9-]+\.wasm$/.test(path)) {
      const relative = path.slice('/wasm/'.length)
      const file = wasmDir ? resolve(wasmDir, basename(relative)) : resolve(root, 'dist', relative)
      return { file, type: 'application/wasm' }
    }
    return null
  }

  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    if (mode === 'shared') {
      response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    }
    if (!['HEAD', 'GET'].includes(request.method)) {
      response.writeHead(405, { Allow: 'HEAD, GET' }).end()
      return
    }

    const url = new URL(request.url, 'http://127.0.0.1')
    const run = url.searchParams.get('run') ?? ''
    const path = url.pathname
    if (path === '/metrics') {
      const body = JSON.stringify({ mode, rate, latencyMs, failIdx1, requests: metrics.get(run) ?? [] })
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(request.method === 'HEAD' ? undefined : body)
      return
    }

    let file
    let type
    switch (path) {
      case '/':
      case '/index.html':
        file = html
        type = 'text/html; charset=utf-8'
        break
      case '/transcode.html':
        file = await localFile(resolve(directory, 'transcode.html'), 'Transcode page')
        type = 'text/html; charset=utf-8'
        break
      case '/transcode.mjs':
        file = await localFile(resolve(directory, 'transcode.mjs'), 'Transcode runner')
        type = 'text/javascript'
        break
      case '/run.mjs':
        file = runner
        type = 'text/javascript'
        break
      case '/avplayer.js':
        file = bundle
        type = 'text/javascript'
        break
      case '/media.rm':
      case '/media.avi':
        file = media
        type = path === '/media.rm' ? 'application/vnd.rn-realmedia' : 'video/x-msvideo'
        break
      case '/control.mp4':
        file = control
        type = 'video/mp4'
        break
      default: {
        const asset = localAsset(path)
        if (asset) {
          const info = await stat(asset.file).catch(() => null)
          if (info?.isFile() && info.size) {
            file = { path: asset.file, size: info.size }
            type = asset.type
          }
        }
      }
    }
    if (!file) {
      response.writeHead(404).end()
      return
    }

    // A rebuilt bundle may change size while this diagnostic server stays open.
    if (file === bundle || file === runner || file === html) {
      file.size = (await stat(file.path)).size
    }
    const range = byteRange(request.headers.range, file.size)
    if (!range) {
      response.writeHead(416, { 'Content-Range': `bytes */${file.size}` }).end()
      return
    }

    const { start, end } = range
    const length = end - start + 1
    const isGet = request.method === 'GET'
    const isMedia = file === media || file === control
    const isRange = request.headers.range != null
    // Target the first background read following the validated idx1 prefix.
    const isIdx1Range = idx1 && file === media && isGet && isRange
    const failedProbe = isIdx1Range && start === idx1.start + idx1PrefixBytes
      && end < idx1.end && length <= MiB
    const startsAtIdx1Header = isIdx1Range && start === idx1.start - 8 && end >= idx1.start + idx1PrefixBytes
    const status = failedProbe ? 503 : isRange ? 206 : 200
    const headers = { 'Accept-Ranges': 'bytes', 'Content-Type': type, 'Content-Length': length }
    if (isRange) {
      headers['Content-Range'] = `bytes ${start}-${end}/${file.size}`
    }

    const abort = new AbortController()
    response.once('close', () => abort.abort())
    let entry
    if (isGet && isMedia) {
      entry = { start, end, bytes: 0, atMs: performance.now(), range: request.headers.range ?? null, contentRange: headers['Content-Range'] ?? null }
      if (startsAtIdx1Header) {
        entry.startsAtIdx1Header = true
      }
      if (!metrics.has(run)) {
        metrics.set(run, [])
      }
      metrics.get(run).push(entry)
    }

    try {
      if (entry && latencyMs) {
        await setTimeout(latencyMs, undefined, { signal: abort.signal })
      }
      if (failedProbe) {
        response.writeHead(status, { 'Content-Length': 0 }).end()
        entry.status = status
        entry.injectedIdx1Failure = true
      }
      else {
        response.writeHead(status, headers)
        if (entry) {
          entry.status = status
        }
        if (isGet) {
          await sendFile(response, file, range, entry, abort.signal)
        }
        else {
          response.end()
        }
      }
    }
    catch (error) {
      if (!abort.signal.aborted) {
        console.error(`Diagnostic server request failed (${error.code ?? error.name})`)
        response.destroy()
      }
    }
    finally {
      if (entry) {
        entry.elapsedMs = performance.now() - entry.atMs
        entry.aborted = !response.writableEnded
      }
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`AVI browser diagnostic (${mode}) listening on http://127.0.0.1:${server.address().port}`)
  })
}

main().catch((error) => {
  console.error(error.code ? `Diagnostic server startup failed (${error.code})` : error.message)
  process.exitCode = 1
})
