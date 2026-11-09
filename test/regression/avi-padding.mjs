import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { compileFunction as compileVmFunction } from 'node:vm'

const compileFunction = (...args) => compileVmFunction(args.pop(), args)

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const require = createRequire(import.meta.url)
const ts = require(`${checkout}/node_modules/typescript`)
function getSource(name) {
  const file = `${checkout}/packages/${name}`
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
}
const avi = getSource('avformat/src/formats/IAviFormat.ts')
const avpacket = getSource('avutil/src/util/avpacket.ts')
const serialize = getSource('avutil/src/util/serialize.ts')
const aviClass = avi.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'IAviFormat')
const names = new Set(['readAVPacket_', 'writeMp3Frame', 'getDuration'])
const aviMethods = aviClass.members.filter(node => names.has(node.name?.getText(avi)))
function functions(source, names) {
  return source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name.text)).map(node => node.getText(source).replace(/^export /, '').replace('static_cast<size>', 'Number'))
}
const paddingConstant = avpacket.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(node => node.name.text === 'AV_INPUT_BUFFER_PADDING_SIZE'))
const program = ts.transpileModule(
  `${paddingConstant.getText(avpacket).replace(/^export /, '').replace('static_cast<size>', 'Number')}\n${
    functions(avpacket, ['allocAVPacketData', 'addAVPacketData']).join('\n')}\n${
    functions(serialize, ['unserializeAVPacket']).join('\n')}\n`
    + `class AviDemuxer {\n${aviMethods.map(node => node.getText(avi)).join('\n')}\n}`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText
const prelude = `
 const heap = new Uint8Array(8192).fill(0xd3);
 const allocations = new Map();
 let offset = 32;
 function avMalloc(length) {
   const pointer = offset;
   offset += length + 32;
   allocations.set(pointer, length);
   return pointer;
 }
 function avMallocz(length) {
   const pointer = avMalloc(length);
   memset(pointer, 0, length);
   return pointer;
 }
 const memset = (pointer, value, length) => heap.fill(value, pointer, pointer + length);
 const memcpyFromUint8Array = (pointer, length, bytes) => heap.set(bytes.subarray(0, length), pointer);
 const mapSafeUint8Array = (pointer, length) => heap.subarray(pointer, pointer + length);
 const avbufferCreate = (data, size) => ({data, size});
 const createAVPacket = () => ({timeBase: {}, flags: 0});
 const freeAVPacketSideData = () => {};
 const addAVPacketSideData = (packet, type, pointer, length) => {
   packet.sideData = { type, bytes: [...heap.subarray(pointer, pointer + length)] };
 };
 const reinterpret_cast = value => value;
 const static_cast = BigInt;
 const nullptr = 0;
 const INT32_MAX = 2147483647;
 const AVCodecID = { AV_CODEC_ID_MP3: 86017 };
 const AVCodecParameterFlags = { AV_CODECPAR_FLAG_NO_PTS: 1, AV_CODECPAR_FLAG_H26X_ANNEXB: 2 };
 const AVMediaType = { AVMEDIA_TYPE_VIDEO: 0 };
 const AVPacketFlags = { AV_PKT_FLAG_KEY: 1 };
`
const { AviDemuxer, unserializeAVPacket, createAVPacket, heap, allocations }
  = compileFunction(`${prelude + program}\nreturn { AviDemuxer, unserializeAVPacket, createAVPacket, heap, allocations }`)()
const payload = new Uint8Array([0x00, 0x00, 0x01, 0xB6, 0x5E, 0x00, 0xFF])
function assertPayloadAndPadding(packet, bytes = payload) {
  assert.equal(packet.size, bytes.length)
  assert.deepEqual(heap.subarray(packet.data, packet.data + packet.size), bytes)
  assert.equal(allocations.get(packet.data), bytes.length + 64)
  assert.equal(packet.buf.size, bytes.length + 64)
  assert.deepEqual(heap.subarray(packet.data + packet.size, packet.data + packet.size + 64), new Uint8Array(64))
}
(async () => {
  const demuxer = new AviDemuxer()
  demuxer.context = { currentIndex: 0, remaining: payload.length, hasVideoKey: false }
  const avpacket = createAVPacket()
  const stream = { index: 0, codecpar: { codecId: 12, codecType: 0, flags: 0 }, timeBase: { num: 1, den: 30 }, privData: { currentDts: 9n, dwSampleSize: 0 } }
  const ioReader = { getPos: () => 128n, readBuffer: async (size, target) => target.set(payload.subarray(0, size)) }
  assert.equal(await demuxer.readAVPacket_({ streams: [stream], ioReader }, avpacket), 0)
  assertPayloadAndPadding(avpacket)
  assert.equal(avpacket.pos, 120n)
  assert.equal(avpacket.dts, 9n)
  assert.equal(avpacket.pts, 9n)
  assert.equal(avpacket.flags, 1)

  const mp3 = createAVPacket()
  demuxer.writeMp3Frame(mp3, { index: 1, timeBase: { num: 1, den: 24000 } }, { data: payload, dts: 700n, duration: 626n, pos: 181n })
  assertPayloadAndPadding(mp3)
  assert.equal(mp3.duration, 626n)

  for (const bytes of [payload, new Uint8Array(0)]) {
    const source = {
      data: bytes,
      pts: 19n,
      dts: 18n,
      pos: 120n,
      streamIndex: 2,
      duration: 3n,
      flags: 5,
      timeBase: { num: 1, den: 30 },
      sideData: [{ type: 31, data: new Uint8Array([1, 0, 3]) }],
    }
    const result = unserializeAVPacket(source)
    assertPayloadAndPadding(result, bytes)
    for (const key of ['pts', 'dts', 'pos', 'streamIndex', 'duration', 'flags', 'timeBase']) {
      assert.deepEqual(result[key], source[key])
    }
    assert.deepEqual(result.sideData, { type: 31, bytes: [1, 0, 3] })
  }
  console.log('AVI packet, AVI MP3 frame, and worker round-trip payload/padding cases passed.')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
