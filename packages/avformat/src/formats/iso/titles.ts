/*
 * libmedia abstract format decoder
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 *
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 *
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import type DiscFilesystem from './filesystem'
import { dvdCellOrder } from './dvdnav'
import { Bytes, check, DiscError, sliceFile, type DiscFile } from './reader'

export interface DiscTitleInfo {
  id: string
  name: string
  duration: bigint
  chapterCount: number
}
export interface DiscInfo {
  type: 'bluray' | 'dvd'
  titleId: string
  titles: DiscTitleInfo[]
}
export interface SeekPoint { time: bigint, pos: bigint }
export interface DiscSegment {
  file: DiscFile
  path: string
  inTime: bigint
  outTime: bigint
  start: bigint
  points: SeekPoint[]
  stcId?: number
  endPos?: bigint
  /** DVD VOBU boundaries, relative to this cell's byte stream. */
  vobus?: bigint[]
}
export interface DiscTitle extends DiscTitleInfo {
  segments: DiscSegment[]
  chapters: bigint[]
}

class Bits {
  constructor(private bytes: Bytes, private pos: number) {}
  read(count: number) {
    let value = 0
    for (let i = 0; i < count; i++, this.pos++) {
      value = value * 2 + ((this.bytes.u8(this.pos >>> 3) >> (7 - (this.pos & 7))) & 1)
    }
    return value
  }
}

/** Packet bounds of the clock sequence referenced by an MPLS play item. */
function clpiSequence(b: Bytes, stcId: number) {
  const start = b.u32(8)
  check(start > 0, 'Missing CLPI SequenceInfo')
  const end = start + 4 + b.u32(start)
  b.range(start + 4, b.u32(start))
  const sequences: { id: number, pos: bigint }[] = []
  let at = start + 6
  for (let i = 0; i < b.u8(start + 5); i++) {
    check(at + 6 <= end, 'Truncated CLPI ATC sequence')
    const count = b.u8(at + 4)
    const offset = b.u8(at + 5)
    at += 6
    check(at + count * 14 <= end && offset + count <= 256, 'Invalid CLPI STC sequence')
    for (let j = 0; j < count; j++, at += 14) {
      const pos = BigInt(b.u32(at + 2)) * 192n
      check(!sequences.length || pos > sequences[sequences.length - 1].pos, 'Invalid CLPI STC packet order')
      sequences.push({ id: offset + j, pos })
    }
  }
  const matches = sequences.filter((s) => s.id === stcId)
  check(matches.length === 1, 'Invalid or ambiguous Blu-ray STC ID')
  const index = sequences.indexOf(matches[0])
  return { startPos: matches[0].pos, endPos: sequences[index + 1]?.pos }
}

/** CLPI entry point timestamps use a 45 kHz clock. Export 90 kHz ticks. */
export function parseClpi(b: Bytes, stcId = 0) {
  check(b.text(0, 4) === 'HDMV', 'Invalid CLPI signature')
  const bounds = clpiSequence(b, stcId)
  const cpi = b.u32(16)
  check(cpi > 0, 'Missing CLPI seek index')
  const length = b.u32(cpi)
  b.range(cpi + 4, length)
  const count = b.u8(cpi + 7)
  for (let i = 0; i < count; i++) {
    const bits = new Bits(b, (cpi + 8 + i * 12) * 8)
    bits.read(16)
    bits.read(10)
    const type = bits.read(4)
    const coarseCount = bits.read(16)
    const fineCount = bits.read(18)
    const offset = bits.read(32) + cpi + 6
    if (type !== 1) {
      continue
    }
    check(coarseCount > 0 && fineCount > 0 && fineCount <= 1000000, 'Invalid CLPI seek index size')
    const fineStart = offset + b.u32(offset)
    b.range(offset + 4, coarseCount * 8)
    b.range(fineStart, fineCount * 4)
    const coarse: { ref: number, time: number, pos: number }[] = []
    const cb = new Bits(b, (offset + 4) * 8)
    for (let j = 0; j < coarseCount; j++) {
      coarse.push({ ref: cb.read(18), time: cb.read(14), pos: cb.read(32) })
    }
    check(coarse[0].ref === 0, 'Invalid CLPI first entry')
    const points: SeekPoint[] = []
    for (let j = 0; j < coarse.length; j++) {
      const item = coarse[j]
      const end = coarse[j + 1]?.ref ?? fineCount
      check(end > item.ref && end <= fineCount, 'Invalid CLPI fine entry reference')
      for (let k = item.ref; k < end; k++) {
        const fine = b.u32(fineStart + k * 4)
        const time = (BigInt(item.time & ~1) * 262144n + BigInt((fine >>> 17) & 0x7ff) * 256n) * 2n
        const pos = (BigInt(Math.floor(item.pos / 131072) * 131072) + BigInt(fine & 0x1ffff)) * 192n
        if (pos < bounds.startPos || bounds.endPos !== undefined && pos >= bounds.endPos) {
          continue
        }
        check(!points.length || time >= points[points.length - 1].time && pos >= points[points.length - 1].pos, 'Non-monotonic CLPI index')
        points.push({ time, pos })
      }
    }
    check(points.length > 0, 'Missing CLPI seek points for STC sequence')
    return { ...bounds, points }
  }
  throw new DiscError('Missing CLPI video seek index', -9)
}

export function parseMpls(b: Bytes, id: string) {
  check(b.text(0, 4) === 'MPLS', 'Invalid MPLS signature')
  const list = b.u32(8)
  const marks = b.u32(12)
  const listEnd = list + 4 + b.u32(list)
  b.range(list + 4, b.u32(list))
  const count = b.u16(list + 6)
  check(count > 0 && count <= 4096, 'Invalid Blu-ray playlist length')
  const clips: { name: string, stcId: number, inTime: bigint, outTime: bigint, start: bigint }[] = []
  let duration = 0n
  let at = list + 10
  for (let i = 0; i < count; i++) {
    const length = b.u16(at)
    check(length >= 32 && at + length + 2 <= listEnd, 'Truncated Blu-ray play item')
    b.range(at + 2, length)
    const name = b.text(at + 2, 5)
    check(/^\d{5}$/.test(name) && b.text(at + 7, 4) === 'M2TS', 'Unsupported Blu-ray clip')
    const inTime = BigInt(b.u32(at + 14)) * 2n
    const outTime = BigInt(b.u32(at + 18)) * 2n
    check(outTime > inTime && b.u8(at + 31) === 0, 'Unsupported Blu-ray still or empty play item')
    clips.push({ name, stcId: b.u8(at + 13), inTime, outTime, start: duration })
    duration += outTime - inTime
    at += length + 2
  }
  const chapters: bigint[] = [0n]
  if (marks) {
    b.range(marks + 4, b.u32(marks))
    const count = b.u16(marks + 4)
    check(2 + count * 14 <= b.u32(marks), 'Truncated Blu-ray chapter table')
    for (let i = 0; i < count; i++) {
      const at = marks + 6 + i * 14
      b.range(at, 14)
      if (b.u8(at + 1) !== 1) {
        continue
      }
      const clip = clips[b.u16(at + 2)]
      check(clip, 'Invalid Blu-ray chapter reference')
      const time = BigInt(b.u32(at + 4)) * 2n
      check(time >= clip.inTime && time <= clip.outTime, 'Blu-ray chapter outside play item')
      const chapter = (clip.start + time - clip.inTime) / 90n
      if (chapter < duration / 90n && !chapters.includes(chapter)) {
        chapters.push(chapter)
      }
    }
  }
  chapters.sort((a, c) => a < c ? -1 : a > c ? 1 : 0)
  return { id, clips, duration: duration / 90n, chapters }
}

async function bluray(fs: DiscFilesystem) {
  const entries = await fs.list('BDMV/PLAYLIST')
  const titles: DiscTitle[] = []
  const names = [...entries.keys()].filter((name) => /^\d{5}\.MPLS$/.test(name)).sort()
  check(names.length <= 10000, 'Too many Blu-ray playlists')
  // Keep only lightweight play item metadata during enumeration; CLPI is loaded for the selected title.
  let segmentCount = 0
  for (const name of names) {
    try {
      const parsed = parseMpls(await fs.bytes(`BDMV/PLAYLIST/${name}`), name.slice(0, 5))
      segmentCount += parsed.clips.length
      check(segmentCount <= 100000, 'Too many Blu-ray play items')
      const segments: DiscSegment[] = []
      for (const clip of parsed.clips) {
        const path = `BDMV/STREAM/${clip.name}.M2TS`
        const file = await fs.get(path)
        check(file && !file.directory, `Missing Blu-ray clip ${path}`)
        segments.push({ ...clip, file, path, points: [] })
      }
      titles.push({ id: parsed.id, name: `Playlist ${parsed.id}`, duration: parsed.duration, chapterCount: parsed.chapters.length, chapters: parsed.chapters, segments })
    }
    catch (error) {
      // Menu/still playlists coexist with playable movie titles. They must not
      // prevent opening the movie, but transport failures must propagate.
      if (!(error instanceof DiscError) || error.code !== -2 || error.name === 'AbortError' || segmentCount > 100000) {
        throw error
      }
    }
  }
  return titles
}

function dvdTime(b: Bytes, at: number) {
  const bcd = (v: number) => {
    check((v & 15) <= 9 && (v >> 4) <= 9, 'Invalid DVD time'); return (v >> 4) * 10 + (v & 15)
  }
  const seconds = bcd(b.u8(at)) * 3600 + bcd(b.u8(at + 1)) * 60 + bcd(b.u8(at + 2))
  const frame = b.u8(at + 3)
  const frames = bcd(frame & 0x3f)
  const rate = frame >> 6
  check(rate === 1 || rate === 3 || !frames, 'Invalid DVD frame rate')
  return BigInt(seconds) * 90000n + BigInt(frames) * (rate === 1 ? 3600n : 3003n)
}

/** A DVD navigation pack's PCI starts after the private_stream_2 substream ID. */
export function dvdNavTime(b: Bytes): bigint {
  check(b.u32(0) === 0x1ba, 'Invalid DVD navigation pack')
  for (let at = 14; at + 25 < b.data.length; at++) {
    if (b.u32(at) === 0x1bf && b.u8(at + 6) === 0) {
      check(b.u16(at + 4) >= 21, 'Truncated DVD PCI')
      return BigInt(b.u32(at + 19))
    }
  }
  throw new DiscError('Missing DVD navigation timestamps')
}

async function dvd(fs: DiscFilesystem) {
  const vmg = await fs.bytes('VIDEO_TS/VIDEO_TS.IFO')
  check(vmg.text(0, 12) === 'DVDVIDEO-VMG', 'Invalid DVD VMG signature')
  const tt = vmg.u32(196) * 2048
  const count = vmg.u16(tt)
  check(count > 0 && count <= 99, 'Invalid DVD title count')
  vmg.range(tt, vmg.u32(tt + 4) + 1)
  const titles: DiscTitle[] = []
  const rejected: string[] = []
  const vtsCache = new Map<number, { b: Bytes, file: DiscFile, vobus: number[] }>()
  for (let title = 0; title < count; title++) {
    const reject = (reason: string) => {
      if (rejected.length < 8) {
        rejected.push(`DVD title ${title + 1}: ${reason}`)
      }
    }
    const at = tt + 8 + title * 12
    const flags = vmg.u8(at)
    // Random/multi-PGC titles and cell navigation commands need the DVD VM.
    if (flags & 0x40) {
      reject('random or multi-PGC playback requires DVD navigation')
      continue
    }
    const set = vmg.u8(at + 6)
    const number = vmg.u8(at + 7)
    const chapterCount = vmg.u16(at + 2)
    check(set > 0 && set <= 99 && number > 0 && chapterCount > 0, 'Invalid DVD title reference')
    const base = `VIDEO_TS/VTS_${String(set).padStart(2, '0')}`
    let vts = vtsCache.get(set)
    if (!vts) {
      const b = await fs.bytes(`${base}_0.IFO`)
      check(b.text(0, 12) === 'DVDVIDEO-VTS', 'Invalid DVD VTS signature')
      const file: DiscFile = { size: 0n, extents: [], directory: false }
      for (let i = 1; i <= 9; i++) {
        const vob = await fs.get(`${base}_${i}.VOB`)
        if (!vob) {
          break
        }
        file.extents.push(...vob.extents)
        file.size += vob.size
      }
      check(file.size > 0n, 'Missing DVD title VOB files')
      const vobus: number[] = []
      const admap = b.u32(228) * 2048
      if (admap) {
        const length = b.u32(admap) + 1
        b.range(admap, length)
        check(length >= 4 && (length - 4) % 4 === 0, 'Invalid DVD VOBU map')
        for (let pos = admap + 4; pos < admap + length; pos += 4) {
          const sector = b.u32(pos)
          check(!vobus.length || sector > vobus[vobus.length - 1], 'Invalid DVD VOBU order')
          vobus.push(sector)
        }
      }
      vts = { b, file, vobus }
      vtsCache.set(set, vts)
    }
    const b = vts.b
    const ptt = b.u32(200) * 2048
    check(number <= b.u16(ptt), 'DVD title missing from PTT table')
    const chapter = ptt + b.u32(ptt + 8 + (number - 1) * 4)
    b.range(chapter, chapterCount * 4)
    const pgcn = b.u16(chapter)
    const pgcit = b.u32(204) * 2048
    check(pgcn > 0 && pgcn <= b.u16(pgcit), 'Invalid DVD program chain')
    const pgc = pgcit + b.u32(pgcit + 8 + (pgcn - 1) * 8 + 4)
    b.range(pgc, 236)
    if (b.u8(pgc + 163)) {
      reject(`PGC ${pgcn} uses random or shuffle playback`)
      continue
    }
    const programs = b.u8(pgc + 2)
    const cells = b.u8(pgc + 3)
    const programMap = pgc + b.u16(pgc + 230)
    const cellMap = pgc + b.u16(pgc + 232)
    b.range(programMap, programs)
    b.range(cellMap, cells * 24)
    const chapterCells: number[] = []
    let supported = true
    for (let i = 0; i < chapterCount; i++) {
      if (b.u16(chapter + i * 4) !== pgcn) {
        reject('chapters reference multiple PGCs')
        supported = false; break
      }
      const program = b.u16(chapter + i * 4 + 2)
      check(program > 0 && program <= programs, 'Invalid DVD chapter program')
      chapterCells.push(b.u8(programMap + program - 1) - 1)
    }
    if (!supported) {
      continue
    }
    let order: number[]
    try {
      order = await dvdCellOrder(fs, vmg, b, pgc, title + 1, set, number, pgcn, chapterCells)
    }
    catch (error) {
      if (!(error instanceof DiscError) || error.code !== -9) {
        throw error
      }
      reject(error.message)
      continue
    }
    const segments: DiscSegment[] = []
    const chapters: bigint[] = []
    let duration = 0n
    const first = chapterCells[0]
    check(first >= 0 && first < cells, 'Invalid DVD first cell')
    for (const cell of order) {
      const at = cellMap + cell * 24
      const flags = b.u8(at)
      // First angle only. Interleaved angle units require navigation beyond linear cell extents.
      if ((flags & 0x30) === 0x10 && (flags >> 6) !== 1) {
        continue
      }
      if (flags & 4 || b.u8(at + 2)) {
        reject(`PGC ${pgcn} cell ${cell + 1}: ${flags & 4 ? 'interleaved angle units'
          : 'still playback'}`)
        supported = false; break
      }
      const from = b.u32(at + 8)
      const to = b.u32(at + 20) + 1
      check(to > from, 'Invalid DVD cell extent')
      const file = sliceFile(vts.file, BigInt(from) * 2048n, BigInt(to) * 2048n)
      const ticks = dvdTime(b, at + 4)
      check(ticks > 0n, 'Empty DVD cell')
      if (!segments.length || chapterCells.includes(cell)) {
        chapters.push(duration / 90n)
      }
      segments.push({ file, path: `${base}:${from}-${to}`, inTime: 0n, outTime: ticks, start: duration, points: [],
        vobus: vts.vobus.filter((sector) => sector >= from && sector < to).map((sector) => BigInt(sector - from) * 2048n) })
      duration += ticks
    }
    if (!supported || !segments.length) {
      if (supported) {
        reject('no playable cells')
      }
      continue
    }
    titles.push({ id: String(title + 1), name: `Title ${title + 1}`, duration: duration / 90n, chapterCount: chapters.length, chapters, segments })
  }
  if (!titles.length) {
    throw new DiscError(`No supported video titles on disc: ${rejected.join('; ')}`, -9)
  }
  return titles
}

export function selectTitle(titles: DiscTitle[], id?: string) {
  check(titles.length > 0, 'No supported video titles on disc')
  if (id !== undefined) {
    const selected = titles.find((title) => title.id === id)
    if (!selected) {
      throw new DiscError(`Invalid or unsupported disc title: ${id}`, -3)
    }
    return selected
  }
  return [...titles].sort((a, b) => a.duration === b.duration ? Number(a.id) - Number(b.id) : a.duration > b.duration ? -1 : 1)[0]
}

export async function openDisc(fs: DiscFilesystem, id?: string) {
  await fs.open()
  const type = await fs.get('BDMV') ? 'bluray' : 'dvd'
  const all = type === 'bluray' ? await bluray(fs) : await dvd(fs)
  const unique = new Map<string, DiscTitle>()
  for (const title of all) {
    const key = title.segments.map((s) => `${s.path}:${s.stcId ?? 0}:${s.inTime}:${s.outTime}`).join('|')
    if (!unique.has(key)) {
      unique.set(key, title)
    }
  }
  // Explicit IDs remain usable even if a duplicate was removed from the list.
  const title = selectTitle(id === undefined ? [...unique.values()] : all, id)
  for (const segment of title.segments) {
    if (type === 'bluray') {
      const index = parseClpi(await fs.bytes(segment.path.replace('/STREAM/', '/CLIPINF/').replace('.M2TS', '.CLPI')), segment.stcId)
      segment.points = index.points
      segment.endPos = index.endPos
      check(index.startPos < segment.file.size && (index.endPos === undefined || index.endPos <= segment.file.size), 'CLPI sequence outside clip')
      check(segment.points.every((p) => p.pos < segment.file.size), 'CLPI index outside clip')
    }
    else {
      const duration = segment.outTime
      segment.inTime = dvdNavTime(new Bytes(await fs.reader.file(segment.file, 0n, 2048)))
      segment.outTime = segment.inTime + duration
      segment.points = [{ time: segment.inTime, pos: 0n }]
    }
  }
  const list = [...unique.values()]
  if (!list.some((item) => item.id === title.id)) {
    list.push(title)
  }
  const info: DiscInfo = { type, titleId: title.id, titles: list.map(({ id, name, duration, chapterCount }) => ({ id, name, duration, chapterCount })) }
  return { info, title }
}

export async function seekPoint(fs: DiscFilesystem, segment: DiscSegment, time: bigint) {
  if (segment.vobus?.length) {
    let low = 0
    let high = segment.vobus.length
    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2)
      const pts = dvdNavTime(new Bytes(await fs.reader.file(segment.file, segment.vobus[mid], 2048)))
      if (pts <= time) {
        low = mid
      }
      else {
        high = mid
      }
    }
    const pos = segment.vobus[low]
    return { pos, time: dvdNavTime(new Bytes(await fs.reader.file(segment.file, pos, 2048))) }
  }
  let result = segment.points[0]
  check(result, 'Missing disc seek index')
  for (const point of segment.points) {
    if (point.time > time) {
      break
    }; result = point
  }
  return result
}
