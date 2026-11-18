/*
 * ASF / Windows Media demuxer.
 * Licensed under LGPL-3.0-or-later, like the rest of libmedia.
 */

import type { AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'
import { readBmpHeader, readWavHeader } from './riff/iriff'
import { codecBmpTags } from './riff/riff'
import { AsfError, AsfPacketParser, Cursor, GUID, MAX_OBJECT_SIZE, MAX_PACKET_SIZE, parseHeader } from './asf/asf'
import type { AsfHeader, AsfPacket } from './asf/asf'
import { IOReader, IOError } from '@libmedia/common/io'
import { logger } from '@libmedia/common'
import { mapSafeUint8Array } from '@libmedia/cheap'
import {
  AVFormat, AVSeekFlags, IOFlags, AVMediaType, AVCodecID, AVPacketFlags, AVCodecParameterFlags,
  NOPTS_VALUE_BIGINT, errorType, avMallocz, avFree, addAVPacketData,
  type AVPacket, type AVStream
} from '@libmedia/avutil'
import { allocAVPacketData } from '@libmedia/avutil/internal'

interface SeekPoint { pts: bigint, pos: bigint }

export default class IAsfFormat extends IFormat {
  public type = AVFormat.ASF
  private header: AsfHeader
  private parser: AsfPacketParser
  private streams = new Map<number, AVStream>()
  private queue: AsfPacket[] = []
  private dataStart = 0n
  private dataEnd = 0n
  private index: SeekPoint[] = []
  private indexRead = false
  private keyframes = new Map<number, SeekPoint[]>()

  public init(context: AVIFormatContext) {
    context.ioReader.setEndian(false)
  }
  public getAnalyzeStreamsCount() {
    return this.streams.size
  }

  private fail(context: AVIFormatContext, error: Error): number {
    if (context.ioReader.error === IOError.ABORT) {
      return IOError.ABORT
    }
    logger.error(`ASF: ${error.message}`)
    return error instanceof AsfError && error.unsupported ? errorType.FORMAT_NOT_SUPPORT : errorType.DATA_INVALID
  }

  public async readHeader(context: AVIFormatContext): Promise<number> {
    const io = context.ioReader
    try {
      const object = new Cursor(await io.readBuffer(24))
      if (object.guid() !== GUID.HEADER) {
        throw new AsfError('invalid header GUID')
      }
      const size = object.u64()
      if (size < 30n || size > BigInt(MAX_OBJECT_SIZE)) {
        throw new AsfError('invalid header length')
      }
      this.header = parseHeader(await io.readBuffer(Number(size - 24n)))
      this.parser = new AsfPacketParser(this.header)
      Object.assign(context.metadata, this.header.metadata)
      for (const descriptor of this.header.streams) {
        const stream = context.createStream()
        stream.id = descriptor.id
        stream.timeBase.num = 1
        stream.timeBase.den = 1000
        stream.startTime = 0n
        if (!this.header.broadcast && this.header.duration > 0n) {
          stream.duration = this.header.duration
        }
        const reader = new IOReader(Math.max(descriptor.format.length, 1024), false)
        reader.appendBuffer(descriptor.format)
        reader.onFlush = async () => IOError.END
        if (descriptor.audio) {
          stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
          if (await readWavHeader(reader, stream, descriptor.format.length) < 0) {
            throw new AsfError('invalid WAVEFORMATEX')
          }
          // RIFF's shared reader allocates unpadded extradata. Copy it to a padded buffer.
          if (stream.codecpar.extradataSize) {
            const old = stream.codecpar.extradata
            stream.codecpar.extradata = avMallocz(stream.codecpar.extradataSize + 64)
            mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
              .set(mapSafeUint8Array(old, reinterpret_cast<size>(stream.codecpar.extradataSize)))
            avFree(old)
          }
        }
        else {
          if (descriptor.format.length < 51) {
            throw new AsfError('invalid ASF video format')
          }
          await reader.skip(11)
          const bitmapSize = await readBmpHeader(reader, stream)
          if (bitmapSize < 40 || bitmapSize > descriptor.format.length - 11) {
            throw new AsfError('invalid bitmap header size')
          }
          stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
          if (descriptor.sampleAspectRatio) {
            stream.codecpar.sampleAspectRatio.num = descriptor.sampleAspectRatio.num
            stream.codecpar.sampleAspectRatio.den = descriptor.sampleAspectRatio.den
          }
          // Standard ASF timestamps are decode timestamps. Only the DVR timing
          // extension provides PTS; do not attach DTS to a reordered B-frame.
          if (!descriptor.extensions.some((extension) => extension.guid === GUID.TIMING)) {
            stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS
          }
          stream.codecpar.codecId = codecBmpTags[stream.codecpar.codecTag] ?? AVCodecID.AV_CODEC_ID_NONE
          const length = bitmapSize - 40
          if (length) {
            stream.codecpar.extradata = avMallocz(length + 64)
            stream.codecpar.extradataSize = length
            await reader.readBuffer(length, mapSafeUint8Array(stream.codecpar.extradata, length))
          }
          if (descriptor.frameTime > 0n) {
            stream.codecpar.framerate.num = 10000000
            stream.codecpar.framerate.den = Number(descriptor.frameTime)
          }
        }
        this.streams.set(descriptor.id, stream)
        this.keyframes.set(descriptor.id, [])
        this.onStreamAdd?.(stream)
      }
      // Unknown top-level objects may precede the Data Object.
      while (true) {
        const pos = io.getPos()
        const object = new Cursor(await io.readBuffer(24))
        const guid = object.guid()
        const size = object.u64()
        if (size < 24n) {
          throw new AsfError('invalid top-level object length')
        }
        if (guid === GUID.ENCRYPTION || guid === GUID.EXT_ENCRYPTION) {
          throw new AsfError('encrypted ASF is not supported', true)
        }
        if (guid === GUID.DATA) {
          if (size < 50n) {
            throw new AsfError('invalid data object')
          }
          const body = new Cursor(await io.readBuffer(26))
          if (body.guid() !== this.header.fileId) {
            // Some otherwise playable files retain a stale ID after editing.
            // Packet layout does not depend on it; keep validating data bounds
            // below and require the header's ID for optional seek indexes.
            logger.warn('ASF: data file ID mismatch')
          }
          const count = body.u64()
          body.skip(2)
          this.dataStart = io.getPos()
          this.dataEnd = this.header.broadcast ? 0n : pos + size
          if (!this.header.broadcast && count && this.header.minPacketSize === this.header.packetSize
            && count * BigInt(this.header.packetSize) > size - 50n) {
            throw new AsfError('truncated ASF data object')
          }
          break
        }
        if (size > BigInt(MAX_OBJECT_SIZE)) {
          throw new AsfError('oversized ASF object')
        }
        await io.skip(Number(size - 24n))
      }
      return 0
    }
    catch (error) {
      return this.fail(context, error)
    }
  }

  private async next(context: AVIFormatContext, limit = 0n): Promise<AsfPacket | null> {
    const io = context.ioReader
    while (!this.queue.length) {
      const pos = io.getPos()
      // A probe boundary may split a media object; that is not a truncated file.
      if (limit && pos >= limit) {
        return null
      }
      if (this.dataEnd && pos >= this.dataEnd) {
        if (this.parser.incomplete) {
          throw new AsfError('incomplete ASF media object at EOF')
        }
        return null
      }
      if (!this.dataEnd) {
        try {
          await io.peekBuffer(1)
        }
        catch (error) {
          if (io.error === IOError.END && !this.parser.incomplete) {
            return null
          }
          throw error
        }
      }
      let data: Uint8Array
      if (this.header.minPacketSize === this.header.packetSize) {
        if (this.dataEnd && this.dataEnd - pos < BigInt(this.header.packetSize)) {
          throw new AsfError('truncated ASF packet')
        }
        data = await io.readBuffer(this.header.packetSize)
      }
      else {
        const prefix: number[] = []
        const byte = async () => {
          const value = await io.readUint8()
          prefix.push(value)
          return value
        }
        let flags = await byte()
        if (flags & 0x80) {
          if (flags & 0x60) {
            throw new AsfError('unsupported error correction', true)
          }
          for (let i = 0, length = flags & 15; i < length; i++) {
            await byte()
          }
          flags = await byte()
        }
        await byte()
        const bytes = [0, 1, 2, 4][(flags >> 5) & 3]
        let length = bytes ? 0 : this.header.packetSize
        for (let i = 0; i < bytes; i++) {
          length += (await byte()) * 2 ** (8 * i)
        }
        length = Math.max(length, this.header.minPacketSize)
        if (length < prefix.length || length > MAX_PACKET_SIZE || (this.dataEnd && pos + BigInt(length) > this.dataEnd)) {
          throw new AsfError('invalid variable packet length')
        }
        data = new Uint8Array(length)
        data.set(prefix)
        data.set(await io.readBuffer(length - prefix.length), prefix.length)
      }
      this.queue = this.parser.parse(data, pos)
    }
    const packet = this.queue.shift()
    const keys = this.keyframes.get(packet.id)
    if (packet.key && packet.pts !== null && (!keys.length || packet.pos > keys[keys.length - 1].pos)) {
      keys.push({ pts: packet.pts, pos: packet.pos })
    }
    return packet
  }

  public async readAVPacket(context: AVIFormatContext, packet: pointer<AVPacket>): Promise<number> {
    try {
      const next = await this.next(context)
      if (!next) {
        return IOError.END
      }
      const stream = this.streams.get(next.id)
      const data = allocAVPacketData(next.data.length)
      mapSafeUint8Array(data, next.data.length).set(next.data)
      addAVPacketData(packet, data, next.data.length)
      packet.streamIndex = stream.index
      packet.pos = next.pos
      const noPts = !!(stream.codecpar.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS)
      const time = next.pts ?? NOPTS_VALUE_BIGINT
      packet.pts = noPts ? NOPTS_VALUE_BIGINT : time
      packet.dts = noPts || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO ? time : NOPTS_VALUE_BIGINT
      packet.timeBase.num = 1
      packet.timeBase.den = 1000
      packet.flags = next.key ? AVPacketFlags.AV_PKT_FLAG_KEY : 0
      return 0
    }
    catch (error) {
      return this.fail(context, error)
    }
  }

  private async readIndex(context: AVIFormatContext) {
    if (this.indexRead || !this.dataEnd || this.header.minPacketSize !== this.header.packetSize) {
      return
    }
    const io = context.ioReader
    const now = io.getPos()
    this.indexRead = true
    try {
      const fileSize = await io.fileSize()
      let pos = this.dataEnd
      while (pos + 24n <= fileSize) {
        await io.seek(pos)
        const object = new Cursor(await io.readBuffer(24))
        const guid = object.guid()
        const size = object.u64()
        if (size < 24n || pos + size > fileSize) {
          break
        }
        if (guid === GUID.INDEX) {
          if (size < 56n || size > BigInt(MAX_OBJECT_SIZE)) {
            break
          }
          const body = new Cursor(await io.readBuffer(Number(size - 24n)))
          if (body.guid() !== this.header.fileId) {
            break
          }
          const interval = body.u64()
          body.skip(4)
          const count = body.u32()
          if (!interval || count > body.left / 6) {
            break
          }
          const index: SeekPoint[] = []
          for (let i = 0; i < count; i++) {
            const number = body.u32()
            body.u16()
            const pos = this.dataStart + BigInt(number) * BigInt(this.header.packetSize)
            const time = BigInt(i) * interval / 10000n - this.header.preroll
            if (pos >= this.dataEnd || (index.length && pos < index[index.length - 1].pos)) {
              throw new AsfError('invalid ASF index packet number')
            }
            index.push({ pts: time > 0n ? time : 0n, pos })
          }
          this.index = index
          break
        }
        pos += size
      }
    }
    catch (error) {
      if (io.error === IOError.ABORT) {
        throw error
      }
      // Optional indexes may be absent, corrupt, or unavailable over HTTP.
      this.index = []
    }
    finally {
      if (io.error !== IOError.ABORT) {
        await io.seek(now)
      }
    }
  }

  private async scanFrom(context: AVIFormatContext, pos: bigint) {
    this.queue = []
    this.parser.reset()
    await context.ioReader.seek(pos)
  }

  private async findUnindexedPoint(
    context: AVIFormatContext, stream: AVStream, timestamp: bigint,
    anchor: SeekPoint, flags: number
  ): Promise<SeekPoint> {
    if (!this.dataEnd || this.header.minPacketSize !== this.header.packetSize) {
      return anchor
    }
    const size = BigInt(this.header.packetSize)
    const first = (anchor.pos - this.dataStart) / size
    let low = first
    let high = (this.dataEnd - this.dataStart) / size
    // Probe complete objects of the selected stream, not packet send times.
    // Send times can differ substantially from media timestamps due to buffering.
    while (high - low > 64n) {
      const middle = (low + high) / 2n
      await this.scanFrom(context, this.dataStart + middle * size)
      let packet: AsfPacket | null
      do {
        packet = await this.next(context, this.dataStart + high * size)
      } while (packet && (packet.id !== stream.id || packet.pts === null))
      if (!packet || packet.pts > timestamp) {
        high = middle
      }
      else {
        low = (packet.pos - this.dataStart) / size
      }
    }
    // The time bracket need not contain a keyframe. Widen backwards until a
    // complete keyframe is found; fragments starting before a probe are skipped.
    let window = 64n
    while (true) {
      const start = low - window > first ? low - window : first
      await this.scanFrom(context, this.dataStart + start * size)
      let best: SeekPoint | null = null
      while (true) {
        const packet = await this.next(context)
        if (!packet) {
          break
        }
        if (packet.id !== stream.id || packet.pts === null) {
          continue
        }
        if (packet.pts > timestamp) {
          break
        }
        if (packet.key || (flags & AVSeekFlags.ANY)) {
          best = { pts: packet.pts, pos: packet.pos }
        }
      }
      if (best) {
        return best
      }
      if (start === first) {
        return anchor
      }
      window *= 2n
    }
  }

  public async seek(context: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    const io = context.ioReader
    if (!(io.flags & IOFlags.SEEKABLE)) {
      return BigInt(errorType.OPERATE_NOT_SUPPORT)
    }
    const now = io.getPos()
    const oldParser = this.parser
    const oldQueue = this.queue
    try {
      this.queue = []
      this.parser = new AsfPacketParser(this.header)
      if (flags & AVSeekFlags.BYTE) {
        if (this.header.minPacketSize !== this.header.packetSize) {
          throw new AsfError('byte seek on variable packets', true)
        }
        let pos = timestamp < this.dataStart ? this.dataStart : timestamp
        if (this.dataEnd && pos > this.dataEnd) {
          pos = this.dataEnd
        }
        pos = this.dataStart + (pos - this.dataStart) / BigInt(this.header.packetSize) * BigInt(this.header.packetSize)
        await io.seek(pos)
        return oldQueue[0]?.pos ?? now
      }
      stream = stream || context.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)
        || context.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)
      if (!stream) {
        throw new AsfError('no ASF stream to seek')
      }
      await this.readIndex(context)
      let anchor: SeekPoint = { pts: -this.header.preroll, pos: this.dataStart }
      const points = this.keyframes.get(stream.id) || []
      for (const point of points) {
        if (point.pts <= timestamp && point.pos > anchor.pos) {
          anchor = point
        }
      }
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        for (const point of this.index) {
          if (point.pts <= timestamp && point.pos > anchor.pos) {
            anchor = point
          }
        }
      }
      if (!this.index.length || stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
        anchor = await this.findUnindexedPoint(context, stream, timestamp, anchor, flags)
      }
      await this.scanFrom(context, anchor.pos)
      let target = anchor.pos
      let found = false
      while (true) {
        const packet = await this.next(context)
        if (!packet) {
          break
        }
        if (packet.id !== stream.id || packet.pts === null) {
          continue
        }
        if (packet.pts > timestamp) {
          // An index may be coarse or point at another stream's packet.
          if (!found && anchor.pos !== this.dataStart) {
            anchor = await this.findUnindexedPoint(
              context, stream, timestamp,
              { pts: -this.header.preroll, pos: this.dataStart }, flags
            )
            target = anchor.pos
            await this.scanFrom(context, anchor.pos)
            continue
          }
          break
        }
        if (packet.key || (flags & AVSeekFlags.ANY)) {
          target = packet.pos
          found = true
        }
      }
      this.queue = []
      this.parser.reset()
      await io.seek(target)
      return oldQueue[0]?.pos ?? now
    }
    catch (error) {
      this.parser = oldParser
      this.queue = oldQueue
      if (io.error !== IOError.ABORT) {
        await io.seek(now)
      }
      return BigInt(this.fail(context, error))
    }
  }

  public async destroy() {
    this.queue = []
    this.parser?.reset()
    this.streams.clear()
    this.keyframes.clear()
    this.index = []
  }
}
