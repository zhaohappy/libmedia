import assert from 'node:assert/strict'
import { evaluate, functionSource, readSource, ts } from './source.mjs'

// Model packet memory only. Allocation, attachment and serialization execute source methods.
export function createPacketHarness(extraSource = '', extraExports = []) {
  const packet = readSource('avutil/src/util/avpacket.ts')
  const serialize = readSource('avutil/src/util/serialize.ts')
  const padding = packet.statements.find((node) => ts.isVariableStatement(node)
    && node.declarationList.declarations.some((node) => node.name.getText(packet) === 'AV_INPUT_BUFFER_PADDING_SIZE'))
  assert.ok(padding, 'AV_INPUT_BUFFER_PADDING_SIZE missing')
  const code = [
    padding.getText(packet).replace(/^export /, ''),
    functionSource(packet, ['allocAVPacketData', 'addAVPacketData']),
    functionSource(serialize, ['unserializeAVPacket'])
  ].join('\n').replaceAll('static_cast<size>', 'Number')
  const heap = new Uint8Array(8192).fill(0xd3)
  const allocations = new Map()
  let offset = 32
  function avMalloc(length) {
    const pointer = offset
    offset += length + 32
    assert.ok(offset <= heap.length, 'Synthetic packet heap exhausted')
    allocations.set(pointer, length)
    return pointer
  }
  const memset = (pointer, value, length) => heap.fill(value, pointer, pointer + length)
  const createAVPacket = () => ({ timeBase: {}, flags: 0 })
  const env = {
    avMalloc,
    avMallocz(length) {
      const pointer = avMalloc(length)
      memset(pointer, 0, length)
      return pointer
    },
    memset,
    memcpyFromUint8Array: (pointer, length, bytes) => heap.set(bytes.subarray(0, length), pointer),
    mapSafeUint8Array: (pointer, length) => heap.subarray(pointer, pointer + length),
    avbufferCreate: (data, size) => ({ data, size }),
    createAVPacket,
    freeAVPacketSideData() {},
    addAVPacketSideData(packet, type, pointer, length) {
      packet.sideData = { type, bytes: [...heap.subarray(pointer, pointer + length)] }
    },
    reinterpret_cast: (value) => value,
    static_cast: BigInt,
    nullptr: 0,
    INT32_MAX: 2147483647,
    AVCodecID: { AV_CODEC_ID_MP3: 86017 },
    AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 1, AV_CODECPAR_FLAG_H26X_ANNEXB: 2 },
    AVMediaType: { AVMEDIA_TYPE_VIDEO: 0 },
    AVPacketFlags: { AV_PKT_FLAG_KEY: 1 }
  }
  const exports = ['allocAVPacketData', 'addAVPacketData', 'unserializeAVPacket', ...extraExports]
  const api = evaluate(`${code}\n${extraSource}\nreturn { ${exports.join(', ')} }`, env)
  function assertPayloadAndPadding(packet, bytes) {
    assert.equal(packet.size, bytes.length)
    assert.deepEqual(heap.subarray(packet.data, packet.data + packet.size), bytes)
    assert.equal(allocations.get(packet.data), bytes.length + 64)
    assert.equal(packet.buf.size, bytes.length + 64)
    assert.deepEqual(heap.subarray(packet.data + packet.size, packet.data + packet.size + 64), new Uint8Array(64))
  }
  return { ...api, heap, createAVPacket, assertPayloadAndPadding }
}
