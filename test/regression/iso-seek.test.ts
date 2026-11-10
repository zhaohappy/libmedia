import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from './helpers/test.mjs'
import DiscReader from '../../packages/avformat/src/formats/iso/reader'
import DiscFilesystem from '../../packages/avformat/src/formats/iso/filesystem'
import { seekPoint, type DiscSegment } from '../../packages/avformat/src/formats/iso/titles'
import { be32 } from './helpers/iso'

// A sparse, synthetic DVD cell beyond 4 GiB. VOBU sizes and durations vary
// independently, so byte interpolation cannot stand in for a timestamp lookup.
function cell(count: number, duration = (index: number) => 45000n, first = 0n) {
  const vobus: bigint[] = []
  const times: bigint[] = []
  let pos = first
  let time = 900000n
  for (let i = 0; i < count; i++) {
    vobus.push(pos)
    times.push(time)
    pos += BigInt(128 + i % 127) * 2048n
    time += duration(i)
  }
  const offset = 5n * 1024n ** 3n
  const segment: DiscSegment = {
    file: { size: pos, directory: false, extents: [{ offset, length: pos }] },
    path: 'synthetic', start: 0n, inTime: times[0], outTime: time,
    points: [{ pos: 0n, time: times[0] }], vobus
  }
  let calls = 0
  const reader = new DiscReader(offset + pos, async (start, length) => {
    calls++
    const bytes = new Uint8Array(length)
    for (let i = 0; i < count; i++) {
      const at = Number(offset + vobus[i] - start)
      if (at >= 0 && at + 2048 <= length) {
        be32(bytes, at, 0x1ba)
        be32(bytes, at + 38, 0x1bf)
        bytes[at + 42] = 3
        bytes[at + 43] = 0xd4
        be32(bytes, at + 57, Number(times[i]))
      }
    }
    return bytes
  })
  return { reader, segment, times, calls: () => calls }
}

test('long DVD cells locate cold HTTP seeks with bounded requests and retain NAV timestamps across cancellation', async () => {
  const source = cell(8192)
  let requests = 0
  let bytes = 0
  const server = createServer(async (request, response) => {
    const match = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range ?? '')!
    const start = BigInt(match[1])
    const end = BigInt(match[2])
    const data = await source.reader.read(start, Number(end - start + 1n))
    requests++
    bytes += data.length
    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${source.reader.size}`,
      'Content-Length': data.length
    }).end(data)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  const reader = new DiscReader(source.reader.size, async (pos, length) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/disc.iso`, {
      headers: { Range: `bytes=${pos}-${pos + BigInt(length) - 1n}` }
    })
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('Content-Range'), `bytes ${pos}-${pos + BigInt(length) - 1n}/${reader.size}`)
    return new Uint8Array(await response.arrayBuffer())
  })
  const fs = new DiscFilesystem(reader)
  try {
    for (const index of [6553, 1638, 4096, 7782, 81]) {
      reader.cancel()
      const before = requests
      const point = await seekPoint(fs, source.segment, source.times[index] + 12345n)
      assert.deepEqual(point, { pos: source.segment.vobus![index], time: source.times[index] })
      assert.ok(requests - before <= 4, `seek used ${requests - before} HTTP requests`)
    }
    const before = requests
    reader.cancel()
    await seekPoint(fs, source.segment, source.times[6553] + 12345n)
    assert.equal(requests, before, 'repeated seek uses verified timestamps after byte-cache cancellation')
    console.log(JSON.stringify({ requests, bytes }))
  }
  finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('DVD seek verifies interpolation against NAV timestamps and bounds fallback on uneven durations', async () => {
  for (const first of [0n, 2048n]) {
    const source = cell(256, (i) => i < 200 ? 1000n : 90000n, first)
    const fs = new DiscFilesystem(source.reader)
    for (const index of [0, 200, 17, 254, 128, 255, 199]) {
      for (const delta of [0n, 1n]) {
        source.reader.cancel()
        const before = source.calls()
        assert.deepEqual(await seekPoint(fs, source.segment, source.times[index] + delta), {
          pos: source.segment.vobus![index], time: source.times[index]
        })
        assert.ok(source.calls() - before <= 14, 'fallback remains logarithmic')
      }
    }
    assert.deepEqual(await seekPoint(fs, source.segment, source.times[0] - 1n), {
      pos: first, time: source.times[0]
    })
  }
})

test('DVD seek handles a single VOBU and preserves the no-map fallback', async () => {
  const { reader, segment, times } = cell(1)
  const fs = new DiscFilesystem(reader)
  assert.deepEqual(await seekPoint(fs, segment, times[0] + 123n), { pos: 0n, time: times[0] })
  segment.vobus = []
  assert.deepEqual(await seekPoint(fs, segment, times[0] + 123n), segment.points[0])
})

test('cancelled NAV probes never enter the persistent timestamp index', async () => {
  const source = cell(256)
  let release: () => void
  let started: () => void
  const ready = new Promise<void>((resolve) => {
    started = resolve
  })
  let pending = true
  const reader = new DiscReader(source.reader.size, async (pos, length) => {
    const data = await source.reader.read(pos, length)
    if (pending) {
      pending = false
      return new Promise<Uint8Array>((resolve) => {
        release = () => resolve(data)
        started()
      })
    }
    return data
  })
  const fs = new DiscFilesystem(reader)
  const seek = seekPoint(fs, source.segment, source.times[200] + 1n)
  const rejected = assert.rejects(seek, /cancelled/)
  await ready
  reader.cancel()
  release!()
  await rejected
  assert.deepEqual([...source.segment.vobuTimes!], [[0, source.times[0]]])
  assert.deepEqual(await seekPoint(fs, source.segment, source.times[17] + 1n), {
    pos: source.segment.vobus![17], time: source.times[17]
  })
})
