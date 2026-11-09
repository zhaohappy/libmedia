import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import analyzeAVFormat from '../../packages/avutil/src/function/analyzeAVFormat'
import { AVFormat } from '../../packages/avutil/src/avformat'
import type { IOReader } from '@libmedia/common/io'

function reader(bytes: Uint8Array) {
  return {
    peekString: async (length: number) => String.fromCharCode(...bytes.subarray(0, length)),
    peekUint32: async () => new DataView(bytes.buffer).getUint32(0),
    peekBuffer: async (length: number) => bytes.subarray(0, length)
  } as IOReader
}

test('MP4 signature overrides an ISO filename without reading the media payload', async () => {
  const header = Uint8Array.from([0, 0, 0, 32, ...Buffer.from('ftypisom')])
  assert.equal(await analyzeAVFormat(reader(header), AVFormat.ISO), AVFormat.ISOBMFF)
})

test('disc system area retains the ISO hint for volume descriptor validation', async () => {
  assert.equal(await analyzeAVFormat(reader(new Uint8Array(32)), AVFormat.ISO), AVFormat.ISO)
  assert.equal(await analyzeAVFormat(reader(new Uint8Array(32))), AVFormat.UNKNOWN)
})
