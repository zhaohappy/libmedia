import { readSource, transpile, ts } from './helpers/source.mjs'
import { test } from './helpers/test.mjs'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { compileFunction } from 'node:vm'

const modules = new Map()
const fetchLoaderPath = 'avnetwork/src/ioLoader/FetchIOLoader.ts'
const fileLoaderPath = 'avnetwork/src/ioLoader/FileIOLoader.ts'
function load(relativePath) {
  if (modules.has(relativePath)) {
    return modules.get(relativePath)
  }

  const outputText = transpile(readSource(relativePath).getFullText(), { module: ts.ModuleKind.CommonJS })
  const exports = {}
  const requireModule = (name) => {
    switch (name) {
      case '@libmedia/common':
        return {
          is: load('common/src/util/is.ts'),
          object: load('common/src/util/object.ts'),
          logger: load('common/src/util/logger.ts'),
          getTimestamp: load('common/src/function/getTimestamp.ts').default
        }
      case '@libmedia/common/timer':
        return { Sleep: load('common/src/timer/Sleep.ts').default }
      case '@libmedia/common/io':
        return load('common/src/io/error.ts')
      case '@libmedia/common/network': {
        const port = load('common/src/network/IPCPort.ts')
        return { ...port, IPCPort: port.default }
      }
      case '@libmedia/avutil':
        return { ...load('avutil/src/avformat.ts'), errorType: load('avutil/src/error.ts') }
      case '@libmedia/avnetwork':
        return {
          FetchIOLoader: load(fetchLoaderPath).default,
          FileIOLoader: load(fileLoaderPath).default
        }
      case '@libmedia/cheap':
        return {}
      default:
        if (name.startsWith('.')) {
          return load(join(dirname(relativePath), `${name}.ts`))
        }
        throw new Error(`Unexpected upstream import: ${name}`)
    }
  }
  modules.set(relativePath, exports)
  compileFunction(outputText, ['require', 'exports', 'static_cast', 'nullptr', 'assert'])(requireModule, exports, BigInt, null, assert.ok)
  return exports
}

const { default: FetchIOLoader } = load(fetchLoaderPath)
const { default: FileIOLoader } = load(fileLoaderPath)
const { IOError } = load('common/src/io/error.ts')
const { IOType } = load('avutil/src/avformat.ts')
const { default: IOPipeline } = load('avpipeline/src/IOPipeline.ts')
const { default: IPCPort } = load('common/src/network/IPCPort.ts')
const { default: FakeMessageChannel } = load('common/src/network/FakeMessageChannel.ts')
const bytes = Uint8Array.from({ length: 128 }, (_, index) => index)
const requests = []
let onHeldBody
let onHeldClose
let onHeldRequest
let finishHeldBody
const server = createServer((request, response) => {
  requests.push({ method: request.method, path: request.url, headers: request.headers })
  if (onHeldRequest && (request.url === '/held-head' && request.method === 'HEAD'
    || request.url === '/held-headers' && request.method === 'GET')) {
    response.on('close', onHeldClose)
    const started = onHeldRequest
    onHeldRequest = undefined
    started()
    return
  }
  if (request.method === 'HEAD') {
    response.writeHead(200, { 'Content-Length': bytes.length, 'Accept-Ranges': 'bytes' }).end()
    return
  }
  const [start, end] = request.headers.range.match(/^bytes=(\d+)-(\d+)$/).slice(1).map(Number)
  const requestedBytes = bytes.subarray(start, end + 1)
  const headers = { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` }
  switch (request.url) {
    case '/ignored':
      response.writeHead(200).end(bytes)
      break
    case '/wrong-start':
      response.writeHead(206, { 'Content-Range': `bytes ${start + 1}-${end}/${bytes.length}` }).end(requestedBytes)
      break
    case '/wrong-end':
      response.writeHead(206, { 'Content-Range': `bytes ${start}-${end + 1}/${bytes.length}` }).end(requestedBytes)
      break
    case '/wrong-total':
      response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${bytes.length + 1}` }).end(requestedBytes)
      break
    case '/missing-range':
      response.writeHead(206).end(requestedBytes)
      break
    case '/short':
      response.writeHead(206, headers).end(requestedBytes.subarray(0, -1))
      break
    case '/long':
      response.writeHead(206, headers)
      response.write(requestedBytes)
      response.end('extra')
      break
    case '/held':
      response.on('close', onHeldClose)
      response.writeHead(206, headers).write(requestedBytes.subarray(0, 2))
      finishHeldBody = () => response.end(requestedBytes.subarray(2))
      onHeldBody()
      break
    default:
      response.writeHead(206, { ...headers, 'Content-Length': requestedBytes.length }).end(requestedBytes)
  }
})

async function withinDeadline(operation, message) {
  let timer
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => timer = setTimeout(() => reject(new Error(message)), 1000))
    ])
  }
  finally {
    clearTimeout(timer)
  }
}

async function main() {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const base = `http://127.0.0.1:${server.address().port}`
  const nativeFetch = globalThis.fetch
  const fetchOptions = []
  globalThis.fetch = (url, options) => {
    fetchOptions.push({ url, credentials: options.credentials, referrerPolicy: options.referrerPolicy })
    return nativeFetch(url, options)
  }

  async function openFetch(path, httpOptions = {}) {
    const loader = new FetchIOLoader({ preload: 16, retryCount: 0 })
    assert.equal(await loader.open({ url: `${base}${path}`, httpOptions }), 0)
    return loader
  }

  try {
    const loader = await openFetch('/exact', {
      headers: { 'X-Fixture': 'synthetic', 'Range': 'bytes=0-1' },
      credentials: 'include',
      referrerPolicy: 'no-referrer'
    })
    assert.equal(typeof loader.readAt, 'function', 'Fetch can read an independent byte range')
    assert.deepEqual(await loader.readAt(61n, 7), bytes.slice(61, 68))
    assert.equal(requests.at(-1).headers.range, 'bytes=61-67')
    assert.equal(requests.at(-1).headers['x-fixture'], 'synthetic')
    assert.equal(fetchOptions.at(-1).credentials, 'include')
    assert.equal(fetchOptions.at(-1).referrerPolicy, 'no-referrer')
    const reads = new Uint8Array(4)
    const sequentialLoader = await openFetch('/exact')
    assert.equal(await sequentialLoader.read(reads), 4)
    assert.deepEqual(reads, bytes.slice(0, 4))
    assert.deepEqual(await sequentialLoader.readAt(80n, 8), bytes.slice(80, 88))
    assert.equal(await sequentialLoader.read(reads), 4)
    assert.deepEqual(reads, bytes.slice(4, 8))
    assert.equal(await sequentialLoader.seek(95n), 0)
    assert.equal(await sequentialLoader.read(reads), 4)
    assert.deepEqual(reads, bytes.slice(95, 99))
    await sequentialLoader.stop()

    for (const path of ['/held-headers', '/held-head']) {
      const held = new FetchIOLoader({ preload: 16, retryCount: 1, retryInterval: 0 })
      const started = new Promise((resolve) => onHeldRequest = resolve)
      const closed = new Promise((resolve) => onHeldClose = resolve)
      const info = { url: `${base}${path}` }
      if (path === '/held-headers') {
        assert.equal(await held.open(info), 0)
      }
      const pending = path === '/held-headers' ? held.read(reads) : held.open(info)
      await started
      const requestCount = fetchOptions.length
      await held.stop()
      const [result] = await withinDeadline(Promise.all([pending, closed]), `${path} request remains open after stop`)
      assert.equal(result, path === '/held-headers' ? IOError.END : IOError.ABORT)
      assert.equal(await held.read(reads), IOError.END)
      assert.equal(fetchOptions.length, requestCount, 'stop does not retry or reopen the request')
    }

    const seekLoader = await openFetch('/held-headers')
    const seekStarted = new Promise((resolve) => onHeldRequest = resolve)
    const seekClosed = new Promise((resolve) => onHeldClose = resolve)
    const oldRead = seekLoader.read(new Uint8Array(4))
    await seekStarted
    assert.equal(await seekLoader.seek(32n), 0)
    const [oldResult, newResult] = await withinDeadline(
      Promise.all([oldRead, seekLoader.read(reads), seekClosed]),
      'seek did not close the old request and reopen at the requested byte'
    )
    assert.equal(oldResult, IOError.END)
    assert.equal(newResult, 4)
    assert.deepEqual(reads, bytes.slice(32, 36))
    await seekLoader.stop()

    const initialRequests = requests.length
    for (const [position, length] of [[-1n, 1], [128n, 1], [127n, 2], [0n, 0], [0n, 1.5], [0n, (1 << 20) + 1], [9007199254740992n, 1], [0, 1]]) {
      assert.ok(await loader.readAt(position, length) < 0, `invalid range ${position}:${length}`)
    }
    assert.equal(requests.length, initialRequests, 'invalid ranges make no requests')
    await loader.stop()
    assert.ok(await loader.readAt(0n, 1) < 0, 'stopped loader rejects side reads')

    for (const path of ['/ignored', '/wrong-start', '/wrong-end', '/wrong-total', '/missing-range', '/short', '/long']) {
      const invalid = await openFetch(path)
      assert.ok(await invalid.readAt(20n, 8) < 0, path)
      await invalid.stop()
    }

    const independent = await openFetch('/held')
    const sideStarted = new Promise((resolve) => onHeldBody = resolve)
    onHeldClose = () => {}
    const side = independent.readAt(50n, 16)
    await sideStarted
    assert.equal(await independent.seek(12n), 0)
    finishHeldBody()
    assert.deepEqual(await side, bytes.slice(50, 66), 'playback seek leaves an independent request running')
    await independent.stop()

    for (const [method, path] of [['abort', '/held'], ['stop', '/held-headers']]) {
      const held = await openFetch(path)
      const started = new Promise((resolve) => {
        onHeldBody = resolve
        onHeldRequest = resolve
      })
      const closed = new Promise((resolve) => onHeldClose = resolve)
      const pending = held.readAt(50n, 16)
      await started
      assert.ok(await held.readAt(20n, 8) < 0, 'each loader has one side request in flight')
      await held[method]()
      assert.equal(await pending, IOError.ABORT, method)
      await withinDeadline(closed, 'side request remains open')
    }

    const file = new FileIOLoader()
    assert.equal(await file.open({ file: new Blob([bytes]) }), 0)
    assert.equal(await file.read(reads), 4)
    assert.deepEqual(reads, bytes.slice(0, 4))
    assert.deepEqual(await file.readAt(120n, 8), bytes.slice(120))
    assert.equal(await file.read(reads), 4)
    assert.deepEqual(reads, bytes.slice(4, 8))
    assert.ok(await file.readAt(120n, 9) < 0)
    const pendingFile = file.readAt(120n, 8)
    await file.stop()
    assert.equal(await pendingFile, IOError.ABORT)
    assert.ok(await file.readAt(0n, 1) < 0)
    for (const Channel of [MessageChannel, FakeMessageChannel]) {
      const { port1, port2 } = new Channel()
      const demuxPort = new IPCPort(port2)
      const pipeline = new IOPipeline()
      const taskId = 'side-read'
      const stats = { bufferReceiveBytes: 0n }
      try {
        assert.equal(await pipeline.registerTask({
          taskId,
          type: IOType.Fetch,
          info: { url: `${base}/held` },
          options: { preload: 16, retryCount: 0 },
          rightPort: port1,
          stats
        }), 0)
        assert.equal(await demuxPort.request('open'), 0)
        const started = new Promise((resolve) => onHeldBody = resolve)
        onHeldClose = () => {}
        const pending = demuxPort.request('readAt', { pos: 60n, length: 12 })
        await started
        demuxPort.notify('abortReadAt')
        assert.equal(await pending, IOError.ABORT, Channel.name)
        assert.equal(stats.bufferReceiveBytes, 0n)
      }
      finally {
        await pipeline.unregisterTask(taskId)
        demuxPort.destroy()
      }

      const channel = new Channel()
      const filePort = new IPCPort(channel.port2)
      try {
        assert.equal(await pipeline.registerTask({
          taskId,
          type: IOType.File,
          info: { file: new Blob([bytes]) },
          rightPort: channel.port1,
          stats
        }), 0)
        assert.equal(await filePort.request('open'), 0)
        const result = await filePort.request('readAt', { pos: 40n, length: 5 })
        assert.deepEqual(result, bytes.slice(40, 45), Channel.name)
        assert.equal(stats.bufferReceiveBytes, 0n)
      }
      finally {
        await pipeline.unregisterTask(taskId)
        filePort.destroy()
      }
    }
    console.log('Independent Fetch, Blob and MessagePort reads passed.')
  }
  finally {
    globalThis.fetch = nativeFetch
    server.closeAllConnections()
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

test('Independent Fetch, Blob and MessagePort reads', main)
