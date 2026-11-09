// SPDX-License-Identifier: LGPL-3.0-or-later
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { test } from './helpers/test.mjs'
import { checkout } from './helpers/source.mjs'
import { audio, concat, fixture, mdpr, packet, video, whole } from './helpers/rm.mjs'

// Override only for collecting before/after measurements against a saved implementation.
const file = process.env.LIBMEDIA_RM_DEMUXER ?? resolve(checkout, 'packages/avformat/src/formats/rm/RmDemuxer.ts')
const { default: RmDemuxer } = await tsImport(pathToFileURL(resolve(file)).href, import.meta.url)

for (const scenario of ['audio-anchor', 'indexed-gop']) {
  test(`RM bounded HTTP Range work: ${scenario}`, async () => {
    const packets = []
    for (let i = 0; i < 1000; i++) {
      if (scenario === 'audio-anchor') {
        packets.push(packet(2, i * 100, Buffer.from([1, 2, 5, 6])), packet(2, i * 100, Buffer.from([3, 4, 7, 8]), false))
      }
      packets.push(packet(1, i * 100, concat(whole(), Buffer.alloc(8192)), scenario === 'audio-anchor' || i % 300 === 0))
    }
    const f = fixture({ streams: [mdpr(1, video(), 100000),
      ...(scenario === 'audio-anchor' ? [mdpr(2, audio(), 100000)] : [])], packets })
    let bytes = 0
    let requests = 0
    const server = createServer((req, res) => {
      const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '')
      if (!match) {
        res.writeHead(400).end()
        return
      }
      const start = Number(match[1])
      const end = Math.min(Number(match[2]), f.data.length - 1)
      bytes += end - start + 1
      requests++
      res.writeHead(206, { 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${f.data.length}` })
      res.end(f.data.subarray(start, end + 1))
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const url = `http://127.0.0.1:${server.address().port}/sample.rmvb`
    class Reader {
      pos = 0
      offset = 0
      cache = new Uint8Array()
      getPos() {
        return BigInt(this.pos)
      }
      async fileSize() {
        return BigInt(f.data.length)
      }
      async seek(pos) {
        this.pos = Number(pos)
      }
      async skip(n) {
        this.pos += n
      }
      async peekBuffer(n) {
        if (this.pos < this.offset || this.pos + n > this.offset + this.cache.length) {
          this.offset = this.pos
          const end = Math.min(this.pos + Math.max(n, 65536) - 1, f.data.length - 1)
          const response = await fetch(url, { headers: { Range: `bytes=${this.pos}-${end}` } })
          assert.equal(response.status, 206)
          assert.equal(response.headers.get('content-range'), `bytes ${this.pos}-${end}/${f.data.length}`)
          this.cache = new Uint8Array(await response.arrayBuffer())
        }
        assert.ok(this.pos - this.offset + n <= this.cache.length)
        return this.cache.subarray(this.pos - this.offset, this.pos - this.offset + n)
      }
      async readBuffer(n) {
        const data = await this.peekBuffer(n)
        this.pos += n
        return data
      }
    }
    const rm = new RmDemuxer(new Reader(), true)
    try {
      await rm.open()
      while ((await rm.read()).streamId !== 1) { /* Wait for the first video packet. */ }
      const report = { scenario, size: f.data.length, startup: { bytes, requests }, seeks: [] }
      for (const target of scenario === 'audio-anchor' ? [90000, 10000, 95000] : [1, 30001, 60001]) {
        const beforeBytes = bytes
        const beforeRequests = requests
        const started = performance.now()
        await rm.seek(target, 1)
        let audioPackets = 0
        let p
        while ((p = await rm.read()).streamId !== 1) {
          audioPackets++
        }
        report.seeks.push({ target, bytes: bytes - beforeBytes, requests: requests - beforeRequests,
          audioPackets, pts: p.pts, ms: performance.now() - started })
      }
      console.log(JSON.stringify(report))
      assert.equal(report.startup.requests, 1, 'startup must not fetch indexes')
      assert.equal(report.startup.bytes, 65536)
      for (const seek of report.seeks) {
        assert.ok(seek.bytes <= 512 * 1024, 'indexed seek must not download a file prefix or an entire GOP')
        assert.ok(seek.requests <= 8, 'bound Range request amplification')
        assert.ok(seek.audioPackets <= 8, 'only emit the audio interleave block near the target')
        assert.equal(seek.pts, scenario === 'audio-anchor' ? seek.target : seek.target - 1)
      }
    }
    finally {
      rm.destroy()
      server.closeAllConnections()
      await new Promise((done) => server.close(done))
    }
  })
}
