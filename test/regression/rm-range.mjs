// SPDX-License-Identifier: LGPL-3.0-or-later
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { test } from './helpers/test.mjs'
import { checkout } from './helpers/source.mjs'
import { audio, concat, fixture, mdpr, object, packet, u16, u32, video, whole } from './helpers/rm.mjs'
const { default: RmDemuxer } = await tsImport(pathToFileURL(resolve(checkout, 'packages/avformat/src/formats/rm/RmDemuxer.ts')).href, import.meta.url)

for (const index of [true, false, 'broken', 'data-chain', 'audio-index']) {
  test(`RM HTTP Range startup and bidirectional seek, index=${index}`, async () => {
    const packets = Array.from({ length: 240 }, (_, i) => packet(1, i * 100, concat(whole(), Buffer.alloc(2048, i))))
    let f = fixture({ index: !!index, streams: [mdpr(1, video(), 30000)],
      packets: index === 'data-chain' ? packets.slice(0, 120) : packets })
    if (index === 'data-chain') {
      f.data.writeUInt32BE(f.data.length, f.start - 4)
      f.data = concat(f.data, object('DATA', concat(u32(120), u32(0), ...packets.slice(120))))
    }
    if (index === 'audio-index') {
      const audioPackets = [packet(2, 0, Buffer.from([1, 2, 5, 6])), packet(2, 0, Buffer.from([3, 4, 7, 8]), false)]
      f = fixture({ streams: [mdpr(1, video(), 30000), mdpr(2, audio(), 30000)], packets: [...audioPackets, ...packets] })
      const badAudioIndex = object('INDX', concat(u32(1), u16(2), u32(0), u16(0), u32(0), u32(f.start + 1), u32(0)))
      f.data.writeUInt32BE(f.data.length, f.indexOffset + 16)
      f.data = concat(f.data, badAudioIndex)
    }
    if (index === 'broken') {
      f.data.writeUInt32BE(0xffffffff, f.indexOffset + 10)
    }
    const requests = []
    const server = createServer((req, res) => {
      const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '')
      if (!range) {
        res.writeHead(400).end()
        return
      }
      const start = Number(range[1])
      const end = Math.min(Number(range[2]), f.data.length - 1)
      requests.push({ start, end })
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${f.data.length}`, 'Content-Length': end - start + 1 })
      res.end(f.data.subarray(start, end + 1))
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const url = `http://127.0.0.1:${server.address().port}/movie.rmvb`
    class RangeReader {
      pos = 0
      cacheStart = 0
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
        if (this.pos < this.cacheStart || this.pos + n > this.cacheStart + this.cache.length) {
          const start = this.pos
          const end = Math.min(f.data.length - 1, start + Math.max(n, 4096) - 1)
          const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } })
          assert.equal(res.status, 206)
          assert.equal(res.headers.get('content-range'), `bytes ${start}-${end}/${f.data.length}`)
          this.cache = new Uint8Array(await res.arrayBuffer())
          this.cacheStart = start
        }
        const offset = this.pos - this.cacheStart
        assert.ok(offset + n <= this.cache.length)
        return this.cache.subarray(offset, offset + n)
      }
      async readBuffer(n) {
        const bytes = await this.peekBuffer(n)
        this.pos += n
        return bytes
      }
    }
    try {
      const rm = new RmDemuxer(new RangeReader(), true)
      async function readVideo() {
        let p
        while ((p = await rm.read())?.streamId === 2) {
          assert.ok(p.data.length === 2)
        }
        return p
      }
      await rm.open()
      assert.equal((await readVideo()).pts, 0)
      assert.equal(requests.length, 1, 'opening must not fetch the index or entire file')
      assert.ok(requests[0].end < f.data.length / 10)
      await rm.seek(17500, 1)
      if (index === 'audio-index') {
        const audioPacket = await rm.read()
        assert.equal(audioPacket.streamId, 2)
        assert.deepEqual(Array.from(audioPacket.data), [1, 2])
        assert.equal(audioPacket.pts, 0)
      }
      assert.equal((await readVideo()).pts, 17500)
      await rm.seek(3000, 1)
      assert.equal((await readVideo()).pts, 3000)
      assert.ok(requests.some((r) => r.start > f.start))
      if (index === true) {
        assert.ok(requests.some((r) => r.start === f.indexOffset))
        assert.ok(requests.reduce((n, r) => n + r.end - r.start + 1, 0) < f.data.length / 4)
      }
      rm.destroy()
    }
    finally {
      server.closeAllConnections()
      await new Promise((done) => server.close(done))
    }
  })
}
