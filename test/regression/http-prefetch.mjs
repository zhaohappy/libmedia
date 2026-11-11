import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from './helpers/test.mjs'
import { load } from './helpers/io-loader.mjs'

const { default: FetchIOLoader } = load('avnetwork/src/ioLoader/FetchIOLoader.ts')
const { IOError } = load('common/src/io/error.ts')
const MiB = 1024 * 1024
const bytes = Uint8Array.from({ length: 20 * MiB }, (_, i) => i % 251)

async function fixture(options = {}) {
  const requests = []
  const held = []
  let started
  const ready = new Promise((resolve) => started = resolve)
  const server = createServer((request, response) => {
    if (request.method === 'HEAD') {
      response.writeHead(200, { 'Content-Length': bytes.length, 'Accept-Ranges': 'bytes' }).end()
      return
    }
    const [start, end] = request.headers.range.match(/^bytes=(\d+)-(\d+)$/).slice(1).map(Number)
    const row = { start, end, closed: false, headers: request.headers }
    requests.push(row)
    response.on('close', () => {
      row.closed = true
    })
    const headers = { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` }
    if (options.fault === 'wrong-start') {
      headers['Content-Range'] = `bytes ${start + 1}-${end}/${bytes.length}`
    }
    if (options.fault === 'wrong-end') {
      headers['Content-Range'] = `bytes ${start}-${end + 1}/${bytes.length}`
    }
    if (options.fault === 'wrong-total') {
      headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length + 1}`
    }
    if (options.fault === 'missing-range') {
      delete headers['Content-Range']
    }
    if (options.fault === 'encoding') {
      headers['Content-Encoding'] = 'gzip'
    }
    response.writeHead(options.fault === 'ignored' ? 200 : 206, headers)
    if (options.hold && start === 0 && end > MiB) {
      response.write(bytes.subarray(0, options.holdBytes ?? MiB))
      held.push(response)
      started()
      return
    }
    const body = bytes.subarray(start, end + 1)
    response.end(options.fault === 'short' ? body.subarray(0, -1)
      : options.fault === 'long' ? Buffer.concat([body, Buffer.from([0])]) : body)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const loader = new FetchIOLoader({ preload: 1024, retryCount: 0 })
  const url = `http://127.0.0.1:${server.address().port}/synthetic.iso`
  assert.equal(await loader.open({ url, httpOptions: { headers: { 'X-Fixture': 'prefetch' }, referrerPolicy: 'no-referrer' } }), 0)
  return { loader, requests, held, ready, async close() {
    await loader.stop()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  } }
}

async function deadline(promise) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('streaming read remained blocked')), 1500)
    })])
  }
  finally {
    clearTimeout(timer)
  }
}

test('ISO sequential media uses 5 MiB requests, bounded cache and transfer-safe seek hits', async () => {
  const f = await fixture()
  try {
    const { loader, requests } = f
    assert.deepEqual(await loader.readAt(123n, 64), bytes.slice(123, 187))
    assert.deepEqual(requests.map(({ start, end }) => [start, end]), [[123, 186]], 'metadata remains an exact small request')
    requests.length = 0
    const limit = 12 * MiB + 713
    for (let start = 0; start < limit; start += MiB) {
      const count = Math.min(MiB, limit - start)
      assert.deepEqual(await loader.readAt(BigInt(start), count, BigInt(limit)), bytes.slice(start, start + count))
      const cache = loader.rangeReader.cache
      assert.ok(cache.reduce((sum, item) => sum + item.data.byteLength, 0) <= 8 * MiB)
      assert.ok(cache.length <= 130, 'small incoming chunks cannot create an unbounded list')
    }
    assert.equal(requests.length, 3, 'more than 12 MiB needs three network round trips')
    assert.ok(requests.every(({ end, start, headers }) => end < limit && end - start + 1 <= 5 * MiB && headers['x-fixture'] === 'prefetch'))
    loader.abortReadAt()
    const hits = requests.length
    const cached = await loader.readAt(11n * BigInt(MiB) + 123n, 1000, BigInt(limit))
    assert.deepEqual(cached, bytes.slice(11 * MiB + 123, 11 * MiB + 1123))
    structuredClone(cached, { transfer: [cached.buffer] })
    assert.deepEqual(await loader.readAt(11n * BigInt(MiB) + 123n, 1000, BigInt(limit)), bytes.slice(11 * MiB + 123, 11 * MiB + 1123))
    assert.equal(requests.length, hits, 'backward seek survives cancellation and IPC buffer transfer')
    assert.deepEqual(await loader.readAt(0n, 1000, BigInt(limit)), bytes.slice(0, 1000))
    assert.equal(requests.length, hits + 1, 'evicted data is fetched again')
    const beforeInvalid = requests.length
    for (const end of [0n, 999n, BigInt(bytes.length) + 1n, 1000, -1n]) {
      assert.ok(await loader.readAt(0n, 1000, end) < 0)
    }
    assert.equal(requests.length, beforeInvalid)
  }
  finally {
    await f.close()
  }
})

test('small progressive reads share one HTTP stream and return before a full MiB arrives', async () => {
  const firstSize = 64 * 1024
  const f = await fixture({ hold: true, holdBytes: firstSize })
  try {
    const first = f.loader.readAt(0n, firstSize, 8n * BigInt(MiB))
    await f.ready
    assert.deepEqual(await deadline(first), bytes.slice(0, firstSize))
    const second = f.loader.readAt(BigInt(firstSize), 128 * 1024, 8n * BigInt(MiB))
    f.held[0].end(bytes.subarray(firstSize, 5 * MiB))
    assert.deepEqual(await deadline(second), bytes.slice(firstSize, firstSize + 128 * 1024))
    let pos = firstSize + 128 * 1024
    for (const length of [256 * 1024, 512 * 1024, MiB]) {
      assert.deepEqual(await f.loader.readAt(BigInt(pos), length, 8n * BigInt(MiB)), bytes.slice(pos, pos + length))
      pos += length
    }
    assert.equal(f.requests.length, 1, 'small deliveries must not become extra Range requests')
    assert.equal(f.requests[0].end, 5 * MiB - 1)
  }
  finally {
    await f.close()
  }
})

test('probe rewind retains a covering response and decode resumes from its unread tail', async () => {
  const f = await fixture({ hold: true })
  try {
    assert.deepEqual(await deadline(f.loader.readAt(0n, 256 * 1024, 8n * BigInt(MiB))), bytes.slice(0, 256 * 1024))
    await f.ready
    const active = f.loader.rangeReader.pending
    assert.deepEqual(await f.loader.readAt(0n, 64 * 1024, 8n * BigInt(MiB)), bytes.slice(0, 64 * 1024))
    assert.equal(f.loader.rangeReader.pending, active)
    assert.equal(active.controller.signal.aborted, false)
    // Move beyond the held prefix: only the original response can satisfy it.
    const tail = f.loader.readAt(BigInt(MiB), MiB, 8n * BigInt(MiB))
    f.held[0].end(bytes.subarray(MiB, 5 * MiB))
    assert.deepEqual(await deadline(tail), bytes.slice(MiB, 2 * MiB))
    assert.equal(f.requests.length, 1)
  }
  finally {
    await f.close()
  }
})

for (const mode of ['extent-change', 'outside-window', 'abort']) {
  test(`probe stream reuse still cancels on ${mode}`, async () => {
    const f = await fixture({ hold: true })
    try {
      await deadline(f.loader.readAt(0n, 64 * 1024, 8n * BigInt(MiB)))
      const active = f.loader.rangeReader.pending
      if (mode === 'abort') {
        f.loader.abortReadAt()
        assert.deepEqual(await f.loader.readAt(0n, 64, 8n * BigInt(MiB)), bytes.slice(0, 64))
      }
      else {
        const start = mode === 'extent-change' ? 0 : 10 * MiB
        const limit = mode === 'extent-change' ? 128 * 1024 : 11 * MiB
        assert.deepEqual(await f.loader.readAt(BigInt(start), 64, BigInt(limit)), bytes.slice(start, start + 64))
      }
      assert.equal(active.controller.signal.aborted, true)
      assert.notEqual(f.loader.rangeReader.pending, active)
    }
    finally {
      await f.close()
    }
  })
}

test('a partial response serves playback before the remaining prefetch and cancellation retains received bytes', async () => {
  const f = await fixture({ hold: true })
  try {
    const first = f.loader.readAt(0n, MiB, 8n * BigInt(MiB))
    await f.ready
    assert.deepEqual(await deadline(first), bytes.slice(0, MiB), 'first MiB does not wait for the 5 MiB response to end')
    const pending = f.loader.readAt(BigInt(MiB), MiB, 8n * BigInt(MiB))
    const closed = once(f.held[0], 'close')
    f.loader.abortReadAt()
    assert.equal(await deadline(pending), IOError.ABORT)
    await deadline(closed)
    const count = f.requests.length
    assert.deepEqual(await f.loader.readAt(0n, 100, 8n * BigInt(MiB)), bytes.slice(0, 100))
    assert.equal(f.requests.length, count)
    assert.deepEqual(await f.loader.readAt(10n * BigInt(MiB), MiB, 11n * BigInt(MiB)), bytes.slice(10 * MiB, 11 * MiB))
    assert.equal(f.requests.at(-1).end, 11 * MiB - 1, 'cold seek is clipped to the new extent')
    await f.loader.stop()
    assert.ok(await f.loader.readAt(0n, 10, 8n * BigInt(MiB)) < 0)
    assert.equal(f.loader.rangeReader, undefined)
  }
  finally {
    await f.close()
  }
})

test('unaligned reads spanning a prefetched window reuse their cached prefix', async () => {
  const f = await fixture()
  try {
    const limit = 11 * MiB + 123
    let start = 0
    // Physical extent boundaries can leave the first parser read short.
    for (const count of [123, ...new Array(11).fill(MiB)]) {
      assert.deepEqual(await f.loader.readAt(BigInt(start), count, BigInt(limit)), bytes.slice(start, start + count))
      start += count
    }
    assert.equal(f.requests.length, 3)
    assert.deepEqual(f.requests.map(({ start }) => start), [0, 5 * MiB, 10 * MiB])
  }
  finally {
    await f.close()
  }
})

for (const fault of ['ignored', 'wrong-start', 'wrong-end', 'wrong-total', 'missing-range', 'encoding', 'short', 'long']) {
  test(`prefetch rejects ${fault} responses without returning the final requested range`, async () => {
    const f = await fixture({ fault })
    try {
      assert.ok(await deadline(f.loader.readAt(123n, 1000, 1123n)) < 0)
      assert.equal(f.loader.rangeReader.cachedBytes, 0)
    }
    finally {
      await f.close()
    }
  })
}
