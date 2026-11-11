import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { loadClass } from './helpers/source.mjs'
import IOReader from '../../packages/common/src/io/IOReader'
import { IOError } from '../../packages/common/src/io/error'
import DiscReader, { check } from '../../packages/avformat/src/formats/iso/reader'

const MiB = 1024 * 1024

for (const target of [0, 3 * MiB + 768]) {
  test(`Blu-ray streaming bounds range requests across extents after seeking to ${target}`, async () => {
    const source = Uint8Array.from({ length: 12 * MiB }, (_, i) => i % 251)
    const split = 4 * MiB + 192
    const base = 5n * 1024n ** 3n
    const extents = [
      { offset: base, length: BigInt(split) },
      { offset: base + 16n * BigInt(MiB), length: BigInt(source.length - split) }
    ]
    const calls: { pos: bigint, length: number }[] = []
    const reader = new DiscReader(base + 32n * BigInt(MiB), async (pos, length) => {
      calls.push({ pos, length })
      const bytes = new Uint8Array(length)
      let logical = 0
      for (const extent of extents) {
        const start = pos > extent.offset ? pos : extent.offset
        const end = pos + BigInt(length) < extent.offset + extent.length
          ? pos + BigInt(length) : extent.offset + extent.length
        if (end > start) {
          const from = logical + Number(start - extent.offset)
          bytes.set(source.subarray(from, from + Number(end - start)), Number(start - pos))
        }
        logical += Number(extent.length)
      }
      return bytes
    })
    class ChildFormat {
      init() {}
      async readHeader(context: { ioReader: IOReader }) {
        await context.ioReader.peekUint8()
        return 0
      }
      async seek(context: { ioReader: IOReader }, stream: unknown, pos: bigint) {
        await context.ioReader.seek(pos, false, false)
        return 0n
      }
    }
    const Iso = loadClass('avformat/src/formats/IIsoFormat.ts', 'IIsoFormat', ['openSegment', 'checkReading'], {
      IOReader, IOError, IMpegtsFormat: ChildFormat, check,
      prepareDvdSegment: async () => {},
      seekPoint: async () => ({ pos: BigInt(target) }),
      createAVIFormatContext: () => ({}), AVSeekFlags: { BYTE: 2 }
    })
    const iso = new Iso()
    iso.info = { type: 'bluray' }
    iso.title = { segments: [{ file: { size: BigInt(source.length), directory: false, extents },
      inTime: 0n, outTime: 900000n, points: [] }] }
    iso.clearAudio = () => {}
    iso.checkEncryption = () => {}
    iso.reader = reader
    await iso.openSegment(0, 0n)
    const output = new Uint8Array(8 * MiB)
    // Small TS parser reads must still share large underlying HTTP ranges.
    for (let pos = 0; pos < output.length; pos += 192 * 128) {
      const end = Math.min(output.length, pos + 192 * 128)
      await iso.child.ioReader.readBuffer(end - pos, output.subarray(pos, end))
    }
    assert.deepEqual(output, source.subarray(target, target + output.length))
    assert.ok(calls.length <= 12, `8 MiB including header probing took ${calls.length} range requests`)
    assert.ok(calls.every(({ length }) => length <= MiB), 'preserve the readAt request limit')
    assert.ok(calls.reduce((sum, call) => sum + call.length, 0) <= 11 * MiB, 'bound read-ahead and alignment overhead')
  })
}
