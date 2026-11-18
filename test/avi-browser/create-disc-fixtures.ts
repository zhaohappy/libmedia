// SPDX-License-Identifier: LGPL-3.0-or-later
// Usage: npx tsx test/avi-browser/create-disc-fixtures.ts /absolute/output/directory
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { iso, mpls, clpi } from '../regression/helpers/iso'

async function main() {
  if (!process.argv[2]) {
    throw new Error('Supply an output directory outside tracked source files')
  }
  const output = resolve(process.argv[2])
  await mkdir(output, { recursive: true })
  const ffmpeg = process.env.FFMPEG || 'ffmpeg'
  const dvdAuthor = process.env.DVDAUTHOR || 'dvdauthor'
  const mkiso = process.env.GENISOIMAGE || 'genisoimage'
  const run = (command: string, args: string[], env = process.env) => execFileSync(command, args, { stdio: 'inherit', env })
  run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=720x480:rate=30000/1001',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '12', '-target', 'ntsc-dvd', '-y', join(output, 'dvd.mpg')])
  const dvd = join(output, 'dvd')
  run(dvdAuthor, ['-o', dvd, '-t', '-c', '0,4,8', join(output, 'dvd.mpg')])
  run(dvdAuthor, ['-o', dvd, '-T'], { ...process.env, VIDEO_FORMAT: 'NTSC' })
  run(mkiso, ['-quiet', '-dvd-video', '-udf', '-o', join(output, 'dvd.iso'), dvd])
  // A second fixture moves a cell across physical VOB-file boundaries.
  const dvdFiles: Record<string, Uint8Array> = {}
  for (const file of await readdir(join(dvd, 'VIDEO_TS'))) {
    dvdFiles[`VIDEO_TS/${file}`] = await readFile(join(dvd, 'VIDEO_TS', file))
  }
  const vob = dvdFiles['VIDEO_TS/VTS_01_1.VOB']
  const split = Math.floor(vob.length / 4096) * 2048
  dvdFiles['VIDEO_TS/VTS_01_1.VOB'] = vob.subarray(0, split)
  dvdFiles['VIDEO_TS/VTS_01_2.VOB'] = vob.subarray(split)
  await writeFile(join(output, 'dvd-split.iso'), iso(dvdFiles))

  run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000', '-t', '8', '-c:v', 'libx264', '-g', '25',
    '-pix_fmt', 'yuv420p', '-c:a', 'ac3', '-b:a', '192k', '-mpegts_m2ts_mode', '1', '-y', join(output, 'clip.m2ts')])
  const clip = await readFile(join(output, 'clip.m2ts'))
  const points: { time: number, packet: number }[] = []
  for (let at = 0; at < clip.length; at += 192) {
    const pid = ((clip[at + 5] & 31) << 8) | clip[at + 6]
    if (pid !== 0x1011 || !(clip[at + 5] & 64)) {
      continue
    }
    let pes = at + 8
    if (clip[at + 7] & 32) {
      pes += 1 + clip[pes]
    }
    if (clip[pes] || clip[pes + 1] || clip[pes + 2] !== 1 || !(clip[pes + 7] & 128)) {
      continue
    }
    const p = pes + 9
    const pts = (clip[p] & 14) * 536870912 + clip[p + 1] * 4194304
      + (clip[p + 2] & 254) * 16384 + clip[p + 3] * 128 + (clip[p + 4] >> 1)
    if ((clip[at + 7] & 32) && (clip[at + 9] & 64)) {
      points.push({ time: Math.floor(pts / 2), packet: at / 192 })
    }
  }
  if (!points.length) {
    throw new Error('FFmpeg output has no random access points')
  }
  const start = points[0].time
  // Minimal synthetic MPLS/CLPI navigation wrapping real decodable transport streams.
  const files = {
    'BDMV/PLAYLIST/00000.MPLS': mpls([{ name: '00001', start: start + 45000, end: start + 225000 },
      { name: '00002', start: start + 90000, end: start + 270000 }]),
    'BDMV/PLAYLIST/00001.MPLS': mpls([{ name: '00001', start, end: start + 180000 }]),
    'BDMV/CLIPINF/00001.CLPI': clpi(points),
    'BDMV/CLIPINF/00002.CLPI': clpi(points),
    'BDMV/STREAM/00001.M2TS': clip,
    'BDMV/STREAM/00002.M2TS': clip
  }
  await writeFile(join(output, 'bluray.iso'), iso(files))
  const combined = new Uint8Array(clip.length * 2)
  combined.set(clip)
  combined.set(clip, clip.length)
  const packetOffset = clip.length / 192
  await writeFile(join(output, 'bluray-stc.iso'), iso({
    'BDMV/PLAYLIST/00000.MPLS': mpls([
      { name: '00001', start: start + 45000, end: start + 225000, stcId: 0 },
      { name: '00001', start: start + 90000, end: start + 270000, stcId: 1 }
    ]),
    'BDMV/CLIPINF/00001.CLPI': clpi([
      ...points, ...points.map((point) => ({ ...point, packet: point.packet + packetOffset }))
    ], [{ id: 0, packet: 0 }, { id: 1, packet: packetOffset }]),
    'BDMV/STREAM/00001.M2TS': combined
  }))
}
main().catch((error) => {
  console.error(error); process.exitCode = 1
})
