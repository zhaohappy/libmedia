/* SPDX-License-Identifier: LGPL-3.0-or-later
 * AVI MP3 frame reassembly added for 115master, 2026.
 * Built into the patched libmedia v1.3.1 demuxer.
 */

const MPEG1_LAYER3_BIT_RATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const MPEG2_LAYER3_BIT_RATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000]

function readHeader(buffer: Uint8Array, offset: number) {
  const version = (buffer[offset + 1] >>> 3) & 3
  const layer = (buffer[offset + 1] >>> 1) & 3
  const bitRateIndex = buffer[offset + 2] >>> 4
  const sampleRateIndex = (buffer[offset + 2] >>> 2) & 3

  if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0
    || version === 1 || layer !== 1 || bitRateIndex === 0 || bitRateIndex === 15 || sampleRateIndex === 3
  ) {
    return
  }

  const mpeg1 = version === 3
  const samples = mpeg1 ? 1152 : 576
  const bitRate = (mpeg1 ? MPEG1_LAYER3_BIT_RATES : MPEG2_LAYER3_BIT_RATES)[bitRateIndex] * 1000
  const sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex] / (mpeg1 ? 1 : version === 2 ? 2 : 4)
  const padding = (buffer[offset + 2] >>> 1) & 1
  const length = Math.floor(bitRate * samples / (sampleRate * 8)) + padding
  return { length, sampleRate, samples }
}

interface Chunk {
  start: number
  end: number
  dts: bigint
  pos: bigint
}

export interface AviMp3Frame {
  data: Uint8Array
  dts: bigint
  pos: bigint
  duration: bigint
}

export default class Mp3FrameReader {

  private buffer = new Uint8Array(0)
  private chunks: Chunk[] = []
  private offset = 0
  private synced = false
  private sampleRate = 0
  private elapsedSamples = 0n
  private startDts = 0n
  private nextDts: bigint | undefined
  private readonly timeBaseNum: bigint
  private readonly timeBaseDen: bigint
  private readonly sampleSize: number

  constructor(timeBase: { num: number, den: number }, sampleSize: number) {
    this.sampleSize = sampleSize
    this.timeBaseNum = BigInt(timeBase.num)
    this.timeBaseDen = BigInt(timeBase.den)
  }

  public append(data: Uint8Array, dts: bigint, pos: bigint) {
    const tail = this.buffer.subarray(this.offset)
    const buffer = new Uint8Array(tail.length + data.length)
    buffer.set(tail)
    buffer.set(data, tail.length)

    this.chunks = this.chunks.filter((chunk) => chunk.end > this.offset)
    for (const chunk of this.chunks) {
      chunk.start -= this.offset
      chunk.end -= this.offset
    }
    this.chunks.push({ start: tail.length, end: buffer.length, dts, pos })
    this.buffer = buffer
    this.offset = 0
  }

  public read(endOfStream = false): AviMp3Frame | undefined {
    while (this.offset + 4 <= this.buffer.length) {
      const offset = this.offset
      const header = readHeader(this.buffer, offset)
      if (!header) {
        this.synced = false
        this.offset++
        continue
      }

      const { length, sampleRate, samples } = header
      const end = offset + length
      if (end > this.buffer.length) {
        if (endOfStream && !this.synced) {
          this.offset++
          continue
        }
        return
      }

      // At startup or after a seek, a sync pattern can occur inside a frame.
      if (!this.synced) {
        if (end + 4 <= this.buffer.length) {
          if (readHeader(this.buffer, end)?.sampleRate !== sampleRate) {
            this.offset++
            continue
          }
        }
        else if (!endOfStream) {
          return
        }
        this.synced = true
      }

      let chunkIndex = 0
      while (this.chunks[chunkIndex].end <= offset) {
        chunkIndex++
      }
      const chunk = this.chunks[chunkIndex]
      if (this.nextDts === undefined) {
        const offsetDts = this.sampleSize > 0 ? BigInt(Math.floor((offset - chunk.start) / this.sampleSize)) : 0n
        this.nextDts = chunk.dts + offsetDts
      }

      if (sampleRate !== this.sampleRate) {
        this.startDts = this.nextDts
        this.elapsedSamples = 0n
        this.sampleRate = sampleRate
      }

      const dts = this.nextDts
      this.elapsedSamples += BigInt(samples)
      this.nextDts = this.startDts
        + this.elapsedSamples * this.timeBaseDen / (BigInt(sampleRate) * this.timeBaseNum)
      this.offset = end

      return {
        data: this.buffer.subarray(offset, end),
        dts,
        pos: chunk.pos,
        duration: this.nextDts - dts
      }
    }
  }
}
