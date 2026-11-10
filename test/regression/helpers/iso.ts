/** Small, original disc fixtures; no third-party media. */
export function be16(b: Uint8Array, at: number, n: number) {
  new DataView(b.buffer, b.byteOffset).setUint16(at, n)
}
export function be32(b: Uint8Array, at: number, n: number) {
  new DataView(b.buffer, b.byteOffset).setUint32(at, n)
}
export function le16(b: Uint8Array, at: number, n: number) {
  new DataView(b.buffer, b.byteOffset).setUint16(at, n, true)
}
export function le32(b: Uint8Array, at: number, n: number) {
  new DataView(b.buffer, b.byteOffset).setUint32(at, n, true)
}
export function text(b: Uint8Array, at: number, s: string) {
  b.set(new TextEncoder().encode(s), at)
}

export function iso(files: Record<string, Uint8Array>) {
  type Node = { name: string, children?: Node[], data?: Uint8Array, sector?: number, size?: number }
  const root: Node = { name: '', children: [] }
  for (const [path, data] of Object.entries(files)) {
    const parts = path.toUpperCase().split('/')
    let parent = root
    for (let i = 0; i < parts.length; i++) {
      let node = parent.children!.find((item) => item.name === parts[i])
      if (!node) {
        node = { name: parts[i], ...(i === parts.length - 1 ? { data } : { children: [] }) }
        parent.children!.push(node)
      }
      parent = node
    }
  }
  let sector = 24
  const nodes: Node[] = []
  function allocate(node: Node) {
    node.sector = sector
    node.size = node.data?.length ?? 2048
    sector += Math.ceil(node.size / 2048)
    nodes.push(node)
    node.children?.forEach(allocate)
  }
  allocate(root)
  const result = new Uint8Array((sector + 1) * 2048)
  function record(node: Node, name = node.name + (node.children ? '' : ';1')) {
    const length = 33 + name.length + (name.length % 2 === 0 ? 1 : 0)
    const b = new Uint8Array(length)
    b[0] = length
    le32(b, 2, node.sector!)
    be32(b, 6, node.sector!)
    le32(b, 10, node.size!)
    be32(b, 14, node.size!)
    b[25] = node.children ? 2 : 0
    le16(b, 28, 1)
    be16(b, 30, 1)
    b[32] = name.length
    text(b, 33, name)
    return b
  }
  const pvd = result.subarray(16 * 2048, 17 * 2048)
  pvd[0] = 1
  text(pvd, 1, 'CD001')
  pvd[6] = 1
  le32(pvd, 80, sector + 1)
  be32(pvd, 84, sector + 1)
  le16(pvd, 128, 2048)
  be16(pvd, 130, 2048)
  pvd.set(record(root, '\0'), 156)
  result[17 * 2048] = 255
  text(result, 17 * 2048 + 1, 'CD001')
  result[17 * 2048 + 6] = 1
  for (const node of nodes) {
    let at = node.sector! * 2048
    if (node.data) {
      result.set(node.data, at)
    }
    else {
      for (const child of node.children!) {
        const bytes = record(child)
        if (at + bytes.length > (node.sector! + 1) * 2048) {
          throw new Error('Fixture directory too large')
        }
        result.set(bytes, at)
        at += bytes.length
      }
    }
  }
  return result
}

export function mpls(clips: { name: string, start: number, end: number, stcId?: number }[]) {
  const marks = 64 + 10 + clips.length * 36
  const b = new Uint8Array(marks + 6 + clips.length * 14)
  text(b, 0, 'MPLS0200')
  be32(b, 8, 64)
  be32(b, 12, marks)
  be32(b, 64, 6 + clips.length * 36)
  be16(b, 70, clips.length)
  for (let i = 0; i < clips.length; i++) {
    const at = 74 + i * 36
    be16(b, at, 34)
    text(b, at + 2, clips[i].name)
    text(b, at + 7, 'M2TS')
    b[at + 12] = 1
    b[at + 13] = clips[i].stcId ?? 0
    be32(b, at + 14, clips[i].start)
    be32(b, at + 18, clips[i].end)
  }
  be32(b, marks, 2 + clips.length * 14)
  be16(b, marks + 4, clips.length)
  for (let i = 0; i < clips.length; i++) {
    const at = marks + 6 + i * 14
    b[at + 1] = 1
    be16(b, at + 2, i)
    be32(b, at + 4, clips[i].start)
  }
  return b
}

export function clpi(points: { time: number, packet: number }[], sequences = [{ id: 0, packet: 0 }]) {
  const sequence = 64
  const sequenceLength = 8 + sequences.length * 14
  const cpi = Math.ceil((sequence + 4 + sequenceLength) / 32) * 32
  const map = cpi + 32
  const b = new Uint8Array(map + 4 + points.length * 12)
  text(b, 0, 'HDMV0200')
  be32(b, 8, sequence)
  be32(b, sequence, sequenceLength)
  b[sequence + 5] = 1
  b[sequence + 10] = sequences.length
  b[sequence + 11] = sequences[0].id
  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i].id !== sequences[0].id + i) {
      throw new Error('Fixture STC IDs must be consecutive')
    }
    const at = sequence + 12 + i * 14
    be16(b, at, 0x1001)
    be32(b, at + 2, sequences[i].packet)
    be32(b, at + 10, 0xffffffff)
  }
  be32(b, 16, cpi)
  be32(b, cpi, b.length - cpi - 4)
  b[cpi + 7] = 1
  let bit = (cpi + 8) * 8
  const bits = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--, bit++) {
      b[bit >>> 3] |= (Math.floor(value / 2 ** i) & 1) << (7 - (bit & 7))
    }
  }
  bits(0x1011, 16)
  bits(0, 10)
  bits(1, 4)
  bits(points.length, 16)
  bits(points.length, 18)
  bits(map - cpi - 6, 32)
  be32(b, map, 4 + points.length * 8)
  bit = (map + 4) * 8
  for (let i = 0; i < points.length; i++) {
    bits(i, 18)
    bits(Math.floor(points[i].time / 262144), 14)
    bits(points[i].packet, 32)
  }
  for (let i = 0; i < points.length; i++) {
    be32(b, map + 4 + points.length * 8 + i * 4, ((Math.floor(points[i].time / 256) & 0x7ff) * 131072) + (points[i].packet % 131072))
  }
  return b
}

export function tag(b: Uint8Array, id: number, location: number, length: number) {
  le16(b, 0, id)
  le16(b, 2, 3)
  le16(b, 6, 1)
  le16(b, 10, length)
  le32(b, 12, location)
  let crc = 0
  for (const byte of b.subarray(16, 16 + length)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
    }
  }
  le16(b, 8, crc)
  b[4] = 0
  b[4] = b.subarray(0, 16).reduce((sum, byte) => sum + byte, 0) & 255
}

/** UDF root with fragmented TEST.BIN; optionally address it via a metadata partition. */
export function udf(metadata = false) {
  const b = new Uint8Array(600 * 2048)
  const block = (n: number) => b.subarray(n * 2048, (n + 1) * 2048)
  text(block(16), 1, metadata ? 'NSR03' : 'NSR02')
  const anchor = block(256)
  le32(anchor, 16, 3 * 2048)
  le32(anchor, 20, 257)
  tag(anchor, 2, 256, 496)
  const pd = block(257)
  le16(pd, 22, 0)
  le32(pd, 188, 300)
  le32(pd, 192, 200)
  tag(pd, 5, 257, 496)
  const lvd = block(258)
  le32(lvd, 212, 2048)
  le32(lvd, 248, 2048)
  le32(lvd, 252, 0)
  le16(lvd, 256, 0)
  le32(lvd, 264, metadata ? 64 : 6)
  le32(lvd, 268, 1)
  lvd[440] = metadata ? 2 : 1
  lvd[441] = metadata ? 64 : 6
  if (metadata) {
    text(lvd, 445, '*UDF Metadata Partition')
    le32(lvd, 480, 50)
    le32(lvd, 484, 0xffffffff)
  }
  tag(lvd, 6, 258, metadata ? 488 : 430)
  tag(block(259), 8, 259, 496)
  const base = metadata ? 310 : 300
  if (metadata) {
    const entry = block(350)
    entry[27] = 250
    le32(entry, 56, 10 * 2048)
    le32(entry, 172, 8)
    le32(entry, 176, 10 * 2048)
    le32(entry, 180, 10)
    tag(entry, 261, 50, 168)
  }
  const fsd = block(base)
  le32(fsd, 400, 2048)
  le32(fsd, 404, 1)
  tag(fsd, 256, 0, 496)
  const root = block(base + 1)
  root[27] = 4
  le32(root, 56, 48)
  le32(root, 172, 8)
  le32(root, 176, 2048)
  le32(root, 180, 2)
  tag(root, 261, 1, 168)
  const fid = block(base + 2).subarray(0, 48)
  le16(fid, 16, 1)
  fid[19] = 9
  le32(fid, 20, 2048)
  le32(fid, 24, 3)
  fid[38] = 8
  text(fid, 39, 'TEST.BIN')
  tag(fid, 257, 2, 32)
  const file = block(base + 3)
  file[27] = 5
  le32(file, 56, 4096)
  le32(file, 172, 16)
  le32(file, 176, 2048)
  le32(file, 180, 5)
  le32(file, 184, 2048)
  le32(file, 188, 7)
  tag(file, 261, 3, 176)
  block(base + 5).fill(0x11)
  block(base + 7).fill(0x22)
  return b
}

export function dvdFiles() {
  const vmg = new Uint8Array(4096)
  text(vmg, 0, 'DVDVIDEO-VMG')
  be32(vmg, 196, 1)
  be16(vmg, 2048, 1)
  be32(vmg, 2052, 19)
  vmg[2056] = 0x3c
  vmg[2057] = 1
  be16(vmg, 2058, 2)
  vmg[2062] = 1
  vmg[2063] = 1
  const vts = new Uint8Array(8192)
  text(vts, 0, 'DVDVIDEO-VTS')
  be32(vts, 200, 1)
  be32(vts, 204, 2)
  be32(vts, 228, 3)
  be16(vts, 2048, 1)
  be32(vts, 2052, 19)
  be32(vts, 2056, 12)
  be16(vts, 2060, 1)
  be16(vts, 2062, 1)
  be16(vts, 2064, 1)
  be16(vts, 2066, 2)
  be16(vts, 4096, 1)
  be32(vts, 4108, 16)
  const pgc = 4112
  vts[pgc + 2] = 2
  vts[pgc + 3] = 2
  be16(vts, pgc + 230, 236)
  be16(vts, pgc + 232, 238)
  vts[pgc + 236] = 1
  vts[pgc + 237] = 2
  for (let i = 0; i < 2; i++) {
    const at = pgc + 238 + i * 24
    vts[at + 6] = 1
    vts[at + 7] = 0x40
    be32(vts, at + 8, i * 2)
    be32(vts, at + 16, i * 2)
    be32(vts, at + 20, i * 2 + 1)
  }
  be32(vts, 6144, 11)
  be32(vts, 6148, 0)
  be32(vts, 6152, 2)
  const vob = new Uint8Array(8192)
  for (let i = 0; i < 2; i++) {
    const at = i * 4096
    be32(vob, at, 0x1ba)
    be32(vob, at + 38, 0x1bf)
    be16(vob, at + 42, 0x3d4)
    be32(vob, at + 57, i ? 900000 : 90000)
  }
  return {
    'VIDEO_TS/VIDEO_TS.IFO': vmg,
    'VIDEO_TS/VTS_01_0.IFO': vts,
    'VIDEO_TS/VTS_01_1.VOB': vob.subarray(0, 2048),
    'VIDEO_TS/VTS_01_2.VOB': vob.subarray(2048)
  }
}

/** Two title cells separated by a command-only VMGM and a default-button VTS menu. */
export function dvdNavigationFiles() {
  const files = dvdFiles()
  const vmg = new Uint8Array(8192)
  vmg.set(files['VIDEO_TS/VIDEO_TS.IFO'])
  const vts = new Uint8Array(12288)
  vts.set(files['VIDEO_TS/VTS_01_0.IFO'])
  files['VIDEO_TS/VIDEO_TS.IFO'] = vmg
  files['VIDEO_TS/VTS_01_0.IFO'] = vts
  const commandTable = (b: Uint8Array, pgc: number, pre: number[][], post: number[][], cell: number[][]) => {
    be16(b, pgc + 228, 300)
    be16(b, pgc + 300, pre.length)
    be16(b, pgc + 302, post.length)
    be16(b, pgc + 304, cell.length)
    be16(b, pgc + 306, 7 + (pre.length + post.length + cell.length) * 8)
    b.set([...pre, ...post, ...cell].flat(), pgc + 308)
  }
  commandTable(vts, 4112, [
    [0x61, 0, 0, 0, 0, 5, 0, 0],
    [0x71, 0, 0, 5, 0, 0, 0, 0],
    [0x20, 0xa6, 0, 0, 0, 2, 0, 2]
  ], [], [[0x30, 8, 0, 1, 1, 0xc0, 0, 0]])
  vts[4112 + 238 + 3] = 1
  const menu = (b: Uint8Array, offset: number, pointer: number, entry: number) => {
    be32(b, pointer, offset / 2048)
    be16(b, offset, 1)
    be32(b, offset + 4, 1023)
    be32(b, offset + 12, 16)
    const table = offset + 16
    be16(b, table, 1)
    be32(b, table + 4, 1007)
    b[table + 8] = entry
    be32(b, table + 12, 16)
    return table + 16
  }
  const manager = menu(vmg, 4096, 200, 0)
  commandTable(vmg, manager, [
    [0x71, 0, 0, 5, 0, 2, 0, 0],
    [0x30, 6, 0, 1, 1, 0x83, 0, 0]
  ], [], [])
  const root = menu(vts, 8192, 208, 0x83)
  vts[root + 2] = 1
  vts[root + 3] = 1
  be16(vts, root + 232, 238)
  commandTable(vts, root, [[0x56, 0, 0, 0, 4, 0, 0, 0]], [[0x30, 2, 0, 0, 0, 1, 0, 0]], [])
  const nav = new Uint8Array(2048)
  be32(nav, 0, 0x1ba)
  be32(nav, 38, 0x1bf)
  be16(nav, 42, 0x3d4)
  const pci = 45
  be16(nav, pci + 96, 1)
  nav[pci + 110] = 0x10
  nav[pci + 113] = 1
  nav.set([0x20, 1, 0, 0, 0, 0, 0, 13], pci + 152)
  files['VIDEO_TS/VTS_01_0.VOB'] = nav
  return files
}
