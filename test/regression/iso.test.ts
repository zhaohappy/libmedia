import assert from 'node:assert/strict'
import { test as it } from './helpers/test.mjs'
import DiscReader, { Bytes, sliceFile } from '../../packages/avformat/src/formats/iso/reader'
import DiscFilesystem from '../../packages/avformat/src/formats/iso/filesystem'
import { parseClpi, parseMpls, openDisc, selectTitle, dvdNavTime } from '../../packages/avformat/src/formats/iso/titles'
import { iso, udf, mpls, clpi, be16, be32, dvdFiles, le32, tag } from './helpers/iso'

function filesystem(bytes: Uint8Array) {
  const calls: { pos: bigint, size: number }[] = []
  const reader = new DiscReader(BigInt(bytes.length), async (pos, size) => {
    calls.push({ pos, size })
    return bytes.slice(Number(pos), Number(pos) + size)
  })
  return { fs: new DiscFilesystem(reader), calls, reader }
}

it('ISO9660 resolves case-insensitive paths and reads file extents', async () => {
  const { fs, calls } = filesystem(iso({ 'VIDEO_TS/VIDEO_TS.IFO': new Uint8Array([1, 2, 3]) }))
  await fs.open()
  const file = await fs.get('/video_ts/video_ts.ifo')
  assert.deepEqual(await fs.reader.file(file!), new Uint8Array([1, 2, 3]))
  assert.equal(await fs.get('missing'), undefined)
  await assert.rejects(fs.get('../VIDEO_TS'))
  assert.ok(calls.every((call) => call.size <= 1024 * 1024))
})

for (const metadata of [false, true]) {
  it(`UDF reads fragmented files through ${metadata ? 'metadata' : 'physical'} partitions`, async () => {
    const { fs } = filesystem(udf(metadata))
    await fs.open()
    const file = await fs.get('test.bin')
    assert.equal(file!.size, 4096n)
    const data = await fs.reader.file(file!, 2046n, 4)
    assert.deepEqual([...data], [0x11, 0x11, 0x22, 0x22])
  })
}

it('rejects corrupt descriptors and truncated images without unbounded reads', async () => {
  const data = udf()
  data[258 * 2048 + 212] ^= 1
  await assert.rejects(filesystem(data).fs.open(), /CRC/)
  await assert.rejects(filesystem(new Uint8Array(128)).fs.open(), /ISO9660/)
})

it('random reads retain >4 GiB offsets, serialize and bound the cache', async () => {
  let active = false
  let calls = 0
  const reader = new DiscReader(8n * 1024n ** 3n, async (pos, size) => {
    assert.equal(active, false)
    active = true
    await Promise.resolve()
    calls++
    const bytes = new Uint8Array(size).fill(Number(pos / 65536n % 256n))
    active = false
    return bytes
  })
  const offset = 5n * 1024n ** 3n + 7n * 65536n
  const [first, second] = await Promise.all([reader.read(offset, 2), reader.read(offset + 1n, 2)])
  assert.deepEqual([...first], [7, 7])
  assert.deepEqual([...second], [7, 7])
  assert.equal(calls, 1)
  for (let i = 0; i < 65; i++) {
    await reader.read(BigInt(i) * 65536n, 1)
  }
  await reader.read(offset, 1)
  assert.equal(calls, 67)
  await assert.rejects(reader.read(-1n, 1))
  await assert.rejects(reader.read(reader.size, 1))
})

it('cancellation rejects in-flight and queued reads without caching stale data', async () => {
  let release: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const reader = new DiscReader(65536n, async () => {
    await gate; return new Uint8Array(65536)
  })
  const first = reader.read(0n, 1)
  const queued = reader.read(1n, 1)
  await Promise.resolve()
  reader.cancel()
  release!()
  await assert.rejects(first, /cancelled/)
  await assert.rejects(queued, /cancelled/)
})

it('slices a virtual file across noncontiguous physical extents', () => {
  const sliced = sliceFile({ size: 20n, directory: false, extents: [{ offset: 100n, length: 10n }, { offset: 500n, length: 10n }] }, 8n, 15n)
  assert.deepEqual(sliced.extents, [{ offset: 108n, length: 2n }, { offset: 500n, length: 5n }])
})

it('Blu-ray playlist maps in/out times and chapter marks to a continuous title', () => {
  const title = parseMpls(new Bytes(mpls([{ name: '00001', start: 45000, end: 135000 }, { name: '00002', start: 90000, end: 225000 }])), '00000')
  assert.equal(title.duration, 5000n)
  assert.equal(title.clips[1].start, 180000n)
  assert.deepEqual(title.chapters, [0n, 2000n])
  const { points } = parseClpi(new Bytes(clpi([{ time: 45056, packet: 32 }, { time: 90112, packet: 100 }])))
  assert.deepEqual(points, [{ time: 90112n, pos: 6144n }, { time: 180224n, pos: 19200n }])
})

it('opens a Blu-ray disc, deduplicates playlists, selects longest and permits explicit duplicate IDs', async () => {
  const playlist = mpls([{ name: '00001', start: 45056, end: 135000 }])
  const bytes = iso({
    'BDMV/PLAYLIST/00000.MPLS': playlist,
    'BDMV/PLAYLIST/00001.MPLS': playlist,
    'BDMV/PLAYLIST/00002.MPLS': mpls([{ name: '00001', start: 45056, end: 225000 }]),
    'BDMV/STREAM/00001.M2TS': new Uint8Array(65536),
    'BDMV/CLIPINF/00001.CLPI': clpi([{ time: 45056, packet: 0 }])
  })
  const disc = await openDisc(filesystem(bytes).fs)
  assert.equal(disc.info.titleId, '00002')
  assert.deepEqual(disc.info.titles.map((item) => item.id), ['00000', '00002'])
  assert.equal((await openDisc(filesystem(bytes).fs, '00001')).info.titleId, '00001')
  await assert.rejects(openDisc(filesystem(bytes).fs, '12345'), /title/)
})

it('DVD navigation timestamp is read from PCI and title ties use numeric IDs', () => {
  const nav = new Uint8Array(2048)
  be32(nav, 0, 0x1ba)
  be32(nav, 38, 0x1bf)
  nav[42] = 3
  nav[43] = 0xd4
  be32(nav, 57, 90000)
  assert.equal(dvdNavTime(new Bytes(nav)), 90000n)
  const base = { name: '', chapterCount: 0, duration: 1000n, segments: [], chapters: [] }
  assert.equal(selectTitle([{ ...base, id: '10' }, { ...base, id: '2' }]).id, '2')
})


it('DVD IFO follows chapter cells across VOB files with independent timestamp origins', async () => {
  const disc = await openDisc(filesystem(iso(dvdFiles())).fs)
  assert.equal(disc.info.type, 'dvd')
  assert.equal(disc.title.duration, 2000n)
  assert.deepEqual(disc.title.chapters, [0n, 1000n])
  assert.equal(disc.title.segments[0].file.extents.length, 2)
  assert.equal(disc.title.segments[0].inTime, 90000n)
  assert.equal(disc.title.segments[1].inTime, 900000n)
  assert.equal(disc.title.segments[1].start, 90000n)
})

it('DVD cell commands fail explicitly instead of playing a guessed VOB sequence', async () => {
  const files = dvdFiles()
  files['VIDEO_TS/VTS_01_0.IFO'][4112 + 238 + 3] = 1
  await assert.rejects(openDisc(filesystem(iso(files)).fs), /No supported video titles/)
})


it('ISO9660 file extents beyond 4 GiB retain exact sector addresses', async () => {
  const bytes = iso({ 'BIG.BIN': new Uint8Array(4) })
  const offset = 6n * 1024n ** 3n
  le32(bytes, 24 * 2048 + 2, Number(offset / 2048n))
  const reader = new DiscReader(8n * 1024n ** 3n, async (pos, length) => {
    const result = new Uint8Array(length)
    if (pos < BigInt(bytes.length)) {
      result.set(bytes.subarray(Number(pos), Number(pos) + length))
    }
    if (pos <= offset && pos + BigInt(length) > offset) {
      result.set([9, 8, 7, 6], Number(offset - pos))
    }
    return result
  })
  const fs = new DiscFilesystem(reader)
  await fs.open()
  const file = await fs.get('BIG.BIN')
  assert.equal(file!.extents[0].offset, offset)
  assert.deepEqual([...await reader.file(file!)], [9, 8, 7, 6])
})

it('directory cycles fail rather than repeatedly walking the same extent', async () => {
  const bytes = iso({ 'LOOP/FILE': new Uint8Array(1) })
  le32(bytes, 24 * 2048 + 2, 24)
  const { fs } = filesystem(bytes)
  await fs.open()
  await assert.rejects(fs.get('LOOP/LOOP'), /Cyclic/)
})

it('UDF allocation continuations resolve fragmented data and reject cycles', async () => {
  const bytes = udf()
  const file = bytes.subarray(303 * 2048, 304 * 2048)
  le32(file, 172, 8)
  le32(file, 176, 0xc0000800)
  le32(file, 180, 9)
  tag(file, 261, 3, 168)
  const continuation = bytes.subarray(309 * 2048, 310 * 2048)
  le32(continuation, 20, 16)
  le32(continuation, 24, 2048)
  le32(continuation, 28, 5)
  le32(continuation, 32, 2048)
  le32(continuation, 36, 7)
  tag(continuation, 258, 9, 24)
  const { fs } = filesystem(bytes)
  await fs.open()
  assert.deepEqual([...await fs.reader.file((await fs.get('TEST.BIN'))!, 2046n, 4)], [17, 17, 34, 34])
  le32(continuation, 24, 0xc0000800)
  le32(continuation, 28, 9)
  tag(continuation, 258, 9, 24)
  const cyclic = filesystem(bytes).fs
  await cyclic.open()
  await assert.rejects(cyclic.get('TEST.BIN'), /Cyclic/)
})


it('a still/menu playlist does not prevent selecting a movie title', async () => {
  const still = mpls([{ name: '00001', start: 45056, end: 225000 }])
  still[74 + 31] = 1
  const files = {
    'BDMV/PLAYLIST/00000.MPLS': still,
    'BDMV/PLAYLIST/00001.MPLS': mpls([{ name: '00001', start: 45056, end: 135000 }]),
    'BDMV/STREAM/00001.M2TS': new Uint8Array(65536),
    'BDMV/CLIPINF/00001.CLPI': clpi([{ time: 45056, packet: 0 }])
  }
  const disc = await openDisc(filesystem(iso(files)).fs)
  assert.equal(disc.info.titleId, '00001')
  await assert.rejects(openDisc(filesystem(iso(files)).fs, '00000'), /unsupported disc title/)
})


it('Blu-ray STC IDs select reset clocks and bound reads to the referenced sequence', async () => {
  const index = clpi([
    { time: 45056, packet: 0 }, { time: 90112, packet: 100 },
    { time: 45056, packet: 200 }, { time: 90112, packet: 300 }
  ], [{ id: 0, packet: 0 }, { id: 1, packet: 200 }])
  assert.deepEqual(parseClpi(new Bytes(index), 0), {
    startPos: 0n, endPos: 38400n,
    points: [{ time: 90112n, pos: 0n }, { time: 180224n, pos: 19200n }]
  })
  assert.deepEqual(parseClpi(new Bytes(index), 1).points, [
    { time: 90112n, pos: 38400n }, { time: 180224n, pos: 57600n }
  ])
  assert.throws(() => parseClpi(new Bytes(index), 2), /STC ID/)
  const files = {
    'BDMV/PLAYLIST/00000.MPLS': mpls([{ name: '00001', start: 45056, end: 135000, stcId: 0 }]),
    'BDMV/PLAYLIST/00001.MPLS': mpls([{ name: '00001', start: 45056, end: 135000, stcId: 1 }]),
    'BDMV/CLIPINF/00001.CLPI': index,
    'BDMV/STREAM/00001.M2TS': new Uint8Array(76800)
  }
  const first = await openDisc(filesystem(iso(files)).fs)
  assert.equal(first.info.titles.length, 2, 'different clock sequences are not duplicate titles')
  assert.equal(first.title.segments[0].endPos, 38400n)
  const second = await openDisc(filesystem(iso(files)).fs, '00001')
  assert.equal(second.title.segments[0].points[0].pos, 38400n)
})

it('CLPI rejects timestamp reversals within one STC and truncated SequenceInfo', () => {
  const bytes = clpi([{ time: 90112, packet: 0 }, { time: 45056, packet: 100 }])
  assert.throws(() => parseClpi(new Bytes(bytes)), /Non-monotonic/)
  be32(bytes, 64, 3)
  assert.throws(() => parseClpi(new Bytes(bytes)), /Truncated/)
})

function dvdPreCommand(command: number[]) {
  const files = dvdFiles()
  const b = files['VIDEO_TS/VTS_01_0.IFO']
  const pgc = 4112
  be16(b, pgc + 228, 300)
  be16(b, pgc + 300, 1)
  be16(b, pgc + 306, 15)
  b.set(command, pgc + 308)
  return files
}

it('DVD rejects pre-command LinkCN, JumpTT, Goto and combined set/link paths', async () => {
  for (const command of [
    // LinkCN 2
    [0x20, 0x07, 0, 0, 0, 0, 0, 2],
    // JumpTT 2
    [0x30, 0x02, 0, 0, 0, 2, 0, 0],
    // Goto 1
    [0x00, 0x01, 0, 0, 0, 0, 0, 1],
    // Set/link subinstruction
    [0x80, 0, 0, 0, 0, 0, 0, 1]
  ]) {
    const fs = filesystem(iso(dvdPreCommand(command))).fs
    await assert.rejects(openDisc(fs), /No supported/)
    await assert.rejects(openDisc(filesystem(iso(dvdPreCommand(command))).fs, '1'), /No supported/)
  }
})

it('DVD allows register-only pre-commands and rejects truncated command tables', async () => {
  const files = dvdPreCommand([0x71, 0, 0, 0, 0, 1, 0, 0])
  assert.equal((await openDisc(filesystem(iso(files)).fs)).title.segments.length, 2)
  be16(files['VIDEO_TS/VTS_01_0.IFO'], 4112 + 306, 7)
  await assert.rejects(openDisc(filesystem(iso(files)).fs), /command table/)
})
