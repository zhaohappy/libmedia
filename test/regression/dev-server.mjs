import { test } from './helpers/test.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'

// Observe actual file body opens, so the HEAD regression is independent of
// machine speed and does not need a multi-gigabyte fixture.
const originalReadStream = fs.createReadStream
let bodyReads = 0
fs.createReadStream = (...args) => {
  bodyReads++
  return originalReadStream(...args)
}
const { createDevServer } = await import('../../scripts/dev-server.mjs')
fs.createReadStream = originalReadStream

test('dev server returns HEAD metadata without reading bodies and preserves Range responses', async () => {
  const server = createDevServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const content = await readFile(new URL('../../package.json', import.meta.url))
  try {
    const head = await fetch(`${origin}/package.json`, { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(head.headers.get('content-length'), String(content.length))
    assert.equal(head.headers.get('accept-ranges'), 'bytes')
    assert.equal(head.headers.get('etag'), null)
    assert.ok(head.headers.get('last-modified'))
    assert.equal((await head.arrayBuffer()).byteLength, 0)
    assert.equal(bodyReads, 0, 'HEAD must not open or hash a file body')

    const partial = await fetch(`${origin}/package.json`, { headers: { Range: 'bytes=5-21' } })
    assert.equal(partial.status, 206)
    assert.equal(partial.headers.get('content-range'), `bytes 5-21/${content.length}`)
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), content.subarray(5, 22))
    assert.equal(bodyReads, 1, 'Range must open only the requested file stream')
    assert.equal(partial.headers.get('access-control-allow-origin'), '*')
    assert.equal(partial.headers.get('cross-origin-opener-policy'), 'same-origin')
    assert.equal(partial.headers.get('cross-origin-embedder-policy'), 'require-corp')

    const page = await fetch(`${origin}/test/avplayer`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /avplayer\.js/)
    const missing = await fetch(`${origin}/missing-dev-server-fixture`, { method: 'HEAD' })
    assert.equal(missing.status, 404)
    assert.equal((await missing.arrayBuffer()).byteLength, 0)
  }
  finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
