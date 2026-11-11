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

import { IOReader, IOError } from '@libmedia/common/io'
import { logger } from '@libmedia/common'
import {
  AVCodecID, createAVPacket, AVFormat, AVMediaType, AVPacketFlags, AVSeekFlags, NOPTS_VALUE_BIGINT,
  copyCodecParameters, destroyAVPacket, refAVPacket, unrefAVPacket,
  type AVPacket, type AVStream, errorType
} from '@libmedia/avutil'
import { createAVIFormatContext, type AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'
import type AVBSFilter from '../bsf/AVBSFilter'
import Ac32RawFilter from '../bsf/ac3/Ac32RawFilter'
import Dts2RawFilter from '../bsf/dts/Dts2RawFilter'
import IMpegtsFormat from './IMpegtsFormat'
import IMpegpsFormat from './IMpegpsFormat'
import DiscReader, { Bytes, check, DiscError, DiscAbortError } from './iso/reader'
import DiscFilesystem from './iso/filesystem'
import { openDisc, prepareDvdSegment, seekPoint, type DiscInfo, type DiscTitle } from './iso/titles'

export interface IIsoFormatOptions { titleId?: string }

/** Optical-disc title demuxer. Child demuxers own their stream/filter state. */
export default class IIsoFormat extends IFormat {
  public type = AVFormat.ISO
  private reader: DiscReader
  private fs: DiscFilesystem
  private child: AVIFormatContext
  private title: DiscTitle
  private info: DiscInfo
  private segmentIndex = 0
  private audioFilters = new Map<number, AVBSFilter>()
  private audioPackets: pointer<AVPacket>[] = []
  private tracks = new Map<string, AVStream>()
  private ioError: unknown
  private clipEnd = 0n
  private stopped = false
  private readCancelled = false
  private seekTime = 0n

  constructor(private options: IIsoFormatOptions = {}) {
    super()
  }
  public init(context: AVIFormatContext) {}
  public getAnalyzeStreamsCount() {
    return this.child?.iformat.getAnalyzeStreamsCount() ?? 0
  }

  private fail(error: unknown) {
    if (error instanceof DiscAbortError) {
      return IOError.ABORT
    }
    logger.error(`ISO: ${error instanceof Error ? error.message : error}`)
    return error instanceof DiscError ? error.code : errorType.DATA_INVALID
  }

  public async readHeader(context: AVIFormatContext) {
    try {
      if (!context.readAt) {
        throw new DiscError('ISO requires random access', errorType.OPERATE_NOT_SUPPORT)
      }
      this.reader = new DiscReader(await context.ioReader.fileSize(), context.readAt)
      this.fs = new DiscFilesystem(this.reader)
      const disc = await openDisc(this.fs, this.options.titleId)
      this.title = disc.title
      this.info = disc.info
      context.discInfo = disc.info
      context.chapters = disc.title.chapters.map((start, index, chapters) => ({
        id: BigInt(index), timeBase: { num: 1, den: 1000 }, start,
        end: chapters[index + 1] ?? this.title.duration, metadata: { title: `Chapter ${index + 1}` }
      }))
      await this.openSegment(0, this.title.segments[0].inTime)
      return 0
    }
    catch (error) {
      return this.fail(error)
    }
  }

  private clearAudio() {
    this.audioFilters.forEach((filter) => filter.destroy())
    this.audioFilters.clear()
    this.audioPackets.forEach((packet) => destroyAVPacket(packet))
    this.audioPackets.length = 0
  }

  public cancelPendingRead() {
    this.readCancelled = true
    this.reader?.cancel()
  }

  private checkReading() {
    if (this.readCancelled || this.stopped) {
      throw new DiscAbortError()
    }
  }

  private async openSegment(index: number, time: bigint) {
    this.clearAudio()
    if (this.child) {
      await this.child.destroy(); this.child = null
    }
    this.checkReading()
    this.segmentIndex = index
    this.ioError = null
    const segment = this.title.segments[index]
    const relativeTime = time - segment.inTime
    await prepareDvdSegment(this.fs, segment)
    this.checkReading()
    const point = await seekPoint(this.fs, segment, segment.inTime + relativeTime)
    this.checkReading()
    this.clipEnd = segment.endPos ?? segment.file.size
    if (this.info.type === 'bluray') {
      const after = segment.points.find((p) => p.time >= segment.outTime + 90000n)
      if (after) {
        this.clipEnd = after.pos < this.clipEnd ? after.pos : this.clipEnd
      }
    }
    const child = this.child = createAVIFormatContext()
    child.iformat = this.info.type === 'bluray' ? new IMpegtsFormat() : new IMpegpsFormat()
    // A DVD GOP often straddles a 256 KiB read. Fetch a larger window so the
    // first decodable group does not need another HTTP round trip after seek.
    // High-bitrate Blu-ray clips need 1 MiB windows to amortize HTTP range
    // latency during playback and preroll, within DiscReader's readAt limit.
    child.ioReader = new IOReader((this.info.type === 'dvd' ? 512 : 1024) * 1024)
    let position = 0n
    child.ioReader.onSize = () => this.clipEnd
    child.ioReader.onSeek = (pos) => {
      if (pos < 0n || pos > this.clipEnd) {
        return IOError.INVALID_OPERATION
      }
      position = pos
      return 0
    }
    child.ioReader.onFlush = async (buffer) => {
      if (this.readCancelled || this.stopped) {
        return IOError.ABORT
      }
      if (position >= this.clipEnd) {
        return IOError.END
      }
      try {
        const length = Number(this.clipEnd - position < BigInt(buffer.length) ? this.clipEnd - position : BigInt(buffer.length))
        const bytes = await this.reader.file(segment.file, position, length, this.clipEnd)
        this.checkEncryption(bytes, position)
        this.checkReading()
        buffer.set(bytes)
        position += BigInt(length)
        return length
      }
      catch (error) {
        this.ioError = error
        return error instanceof DiscAbortError ? IOError.ABORT : IOError.INVALID_OPERATION
      }
    }
    if (this.info.type === 'dvd') {
      // Every DVD entry is a pack header. Probe at the target NAV instead of
      // fetching the cell's opening bytes only to discard them on the seek below.
      await child.ioReader.seek(point.pos, false, false)
    }
    child.iformat.init(child)
    const result = await child.iformat.readHeader(child)
    if (this.ioError) {
      throw this.ioError
    }
    check(result >= 0, 'Invalid disc clip header')
    // Seek through the child demuxer so its PES queues are also reset.
    const ret = await child.iformat.seek(child, null, point.pos, AVSeekFlags.BYTE)
    if (this.ioError) {
      throw this.ioError
    }
    check(ret >= 0n, 'Cannot seek to disc entry point')
  }

  private checkEncryption(data: Uint8Array, position: bigint) {
    if (this.info.type === 'bluray') {
      let at = Number((192n - position % 192n) % 192n)
      for (; at + 8 <= data.length; at += 192) {
        check(data[at + 4] === 0x47, 'Invalid or encrypted Blu-ray transport stream')
        if (data[at + 7] & 0xc0) {
          throw new DiscError('Encrypted Blu-ray transport stream is unsupported', -9)
        }
      }
    }
    else {
      let at = Number((2048n - position % 2048n) % 2048n)
      const b = new Bytes(data)
      for (; at + 2048 <= data.length; at += 2048) {
        check(b.u32(at) === 0x1ba, 'Invalid or encrypted DVD pack')
        let packet = at + 14 + (b.u8(at + 13) & 7)
        while (packet + 9 <= at + 2048 && b.u8(packet) === 0 && b.u8(packet + 1) === 0 && b.u8(packet + 2) === 1) {
          const id = b.u8(packet + 3)
          if ((id === 0xbd || id >= 0xc0 && id <= 0xef) && b.u8(packet + 6) & 0x30) {
            throw new DiscError('Encrypted DVD PES is unsupported', -9)
          }
          packet += 6 + b.u16(packet + 4)
        }
      }
    }
  }

  private mapStream(context: AVIFormatContext, source: AVStream) {
    const priv = source.privData as { pid?: number, streamId?: number }
    const key = `${source.codecpar.codecType}:${priv?.pid ?? priv?.streamId ?? source.index}`
    let stream = this.tracks.get(key)
    if (!stream) {
      check(this.segmentIndex === 0 || !context.streams.length, 'Disc track layout changes between clips')
      stream = context.createStream()
      copyCodecParameters(addressof(stream.codecpar), addressof(source.codecpar))
      stream.timeBase.num = source.timeBase.num
      stream.timeBase.den = source.timeBase.den
      stream.metadata = { ...source.metadata }
      stream.disposition = source.disposition
      stream.startTime = 0n
      stream.duration = this.title.duration * BigInt(stream.timeBase.den) / (1000n * BigInt(stream.timeBase.num))
      this.tracks.set(key, stream)
      this.onStreamAdd?.(stream)
    }
    else {
      check(stream.codecpar.codecId === source.codecpar.codecId, 'Disc track codec changes between clips')
    }
    return stream
  }

  public async readAVPacket(context: AVIFormatContext, packet: pointer<AVPacket>): Promise<number> {
    try {
      while (!this.stopped && !this.readCancelled) {
        const child = this.child
        let ret: number
        const fromAudio = this.audioPackets.length > 0
        if (fromAudio) {
          const cached = this.audioPackets.shift()
          refAVPacket(packet, cached)
          destroyAVPacket(cached)
          ret = 0
        }
        else if (child.interval.packetBuffer.length) {
          const cached = child.interval.packetBuffer.shift()
          refAVPacket(packet, cached)
          destroyAVPacket(cached)
          ret = 0
        }
        else {
          ret = await child.iformat.readAVPacket(child, packet)
        }
        if (this.ioError) {
          throw this.ioError
        }
        if (ret === IOError.END) {
          if (this.segmentIndex + 1 === this.title.segments.length) {
            return IOError.END
          }
          await this.openSegment(this.segmentIndex + 1, this.title.segments[this.segmentIndex + 1].inTime)
          continue
        }
        if (ret < 0) {
          return ret
        }
        const source = child.getStreamByIndex(packet.streamIndex)
        check(source, 'Invalid disc stream index')
        // TS PES packets can contain multiple AC-3/DTS frames. Split before clipping,
        // otherwise only the first decoded frame has a timestamp after a seek.
        if (!fromAudio && this.info.type === 'bluray'
          && (source.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
            || source.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3
            || source.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS)) {
          let filter = this.audioFilters.get(source.index)
          if (!filter) {
            filter = source.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS ? new Dts2RawFilter() : new Ac32RawFilter()
            filter.init(addressof(source.codecpar), addressof(source.timeBase))
            this.audioFilters.set(source.index, filter)
          }
          check(filter.sendAVPacket(packet) >= 0, 'Invalid disc audio frame')
          if (filter.receiveAVPacket(packet) < 0) {
            unrefAVPacket(packet); continue
          }
          packet.streamIndex = source.index
          packet.timeBase.num = 1
          packet.timeBase.den = 90000
          while (true) {
            const next = createAVPacket()
            if (filter.receiveAVPacket(next) < 0) {
              destroyAVPacket(next); break
            }
            next.streamIndex = source.index
            next.timeBase.num = 1
            next.timeBase.den = 90000
            this.audioPackets.push(next)
          }
        }
        if (source.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_DATA) {
          unrefAVPacket(packet); continue
        }
        const stream = this.mapStream(context, source)
        const segment = this.title.segments[this.segmentIndex]
        // MPEG-TS/PS packets and navigation metadata use a 90 kHz clock.
        check(source.timeBase.num === 1 && source.timeBase.den === 90000, 'Unsupported disc stream time base')
        const pts = packet.pts !== NOPTS_VALUE_BIGINT ? packet.pts : packet.dts
        check(pts !== NOPTS_VALUE_BIGINT, 'Missing disc packet timestamps')
        const offset = segment.start - segment.inTime
        const outside = pts < segment.inTime || pts >= segment.outTime || pts + offset < this.seekTime
        if (outside && source.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
          unrefAVPacket(packet); continue
        }
        if (outside) {
          packet.flags |= AVPacketFlags.AV_PKT_FLAG_DISCARD
        }
        if (packet.pts !== NOPTS_VALUE_BIGINT) {
          packet.pts += offset
        }
        if (packet.dts !== NOPTS_VALUE_BIGINT) {
          packet.dts += offset
        }
        packet.streamIndex = stream.index
        return 0
      }
      return IOError.ABORT
    }
    catch (error) {
      return this.fail(error)
    }
  }

  public async seek(context: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    if (flags & AVSeekFlags.BYTE) {
      return BigInt(errorType.OPERATE_NOT_SUPPORT)
    }
    try {
      const time = timestamp * BigInt(stream.timeBase.num) * 90000n / BigInt(stream.timeBase.den)
      const duration = this.title.segments.reduce((end, s) => end + s.outTime - s.inTime, 0n)
      const target = time < 0n ? 0n : time >= duration ? duration - 1n : time
      const index = this.title.segments.findIndex((s) => s.start + s.outTime - s.inTime > target)
      this.reader.cancel()
      this.readCancelled = false
      this.seekTime = target
      const segment = this.title.segments[index]
      await this.openSegment(index, segment.inTime + target - segment.start)
      return 0n
    }
    catch (error) {
      return BigInt(this.fail(error))
    }
  }

  public async destroy(context: AVIFormatContext) {
    this.stopped = true
    this.clearAudio()
    this.reader?.cancel()
    if (this.child) {
      await this.child.destroy(); this.child = null
    }
    this.tracks.clear()
  }
}
