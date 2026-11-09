// SPDX-License-Identifier: LGPL-3.0-or-later
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { open, IOError, errors } from '../regression/helpers/asf.mjs'

const files = process.argv.slice(2)
if (!files.length) {
  throw new Error('Usage: node test/avi-browser/compare-asf.mjs sample.wmv [...] (FFPROBE overrides ffprobe)')
}
for (const file of files) {
  const { format, context, result } = await open(readFileSync(file))
  assert.equal(result, 0, errors.join('\n'))
  const reference = JSON.parse(execFileSync(process.env.FFPROBE ?? 'ffprobe', [
    '-v', 'error', '-show_packets', '-show_data_hash', 'sha256', '-of', 'json', file
  ], { maxBuffer: 128 * 1024 * 1024 })).packets
  let count = 0
  for (;;) {
    const packet = { timeBase: {} }
    const ret = await format.readAVPacket(context, packet)
    if (ret) {
      assert.equal(ret, IOError.END, errors.join('\n'))
      break
    }
    const expected = reference[count++]
    assert.ok(expected, 'unexpected extra packet')
    assert.equal(packet.streamIndex, expected.stream_index)
    assert.equal('SHA256:' + createHash('sha256').update(packet.data.subarray(0, packet.size)).digest('hex'), expected.data_hash)
    const time = packet.dts === -9223372036854775808n ? packet.pts : packet.dts
    const expectedTime = packet.dts === -9223372036854775808n ? expected.pts : expected.dts
    if (expectedTime !== undefined) {
      assert.equal(time, BigInt(expectedTime), `timestamp of packet ${count}`)
    }
  }
  assert.equal(count, reference.length)
  console.log(`${file}: ${count} packets match FFmpeg (stream, SHA-256, timestamp)`)
}
