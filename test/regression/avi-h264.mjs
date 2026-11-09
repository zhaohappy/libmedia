import assert from 'node:assert/strict'
import { test } from './helpers/test.mjs'
import { readSource, functionSource, getClass, evaluate, loadClass } from './helpers/source.mjs'

const logger = { fatal(message) {
  throw new Error(message)
} }
function sourceClass(path, name, env = {}) {
  const source = readSource(path)
  const code = getClass(source, name).getText(source).replace('export default ', '')
  return evaluate(`${code}\nreturn ${name}`, { logger, ...env })
}
const BufferWriter = sourceClass('common/src/io/BufferWriter.ts', 'BufferWriter')
const BitReader = sourceClass('common/src/io/BitReader.ts', 'BitReader', { IOError: { END: -2 } })
const each = evaluate(`${functionSource(readSource('common/src/util/array.ts'), ['each'])}\nreturn each`, { constant: { FALSE: false } })
const naluNames = ['isAnnexb', 'getNextNaluStart', 'splitNaluByStartCode', 'joinNaluByStartCode', 'naluUnescape']
const naluUtil = evaluate(`${functionSource(readSource('avutil/src/util/nalu.ts'), naluNames)}\nreturn { ${naluNames.join(',')} }`, {
  BufferWriter, SafeUint8Array: class {}, array: { each }
})
const expgolomb = evaluate(`${functionSource(readSource('avutil/src/util/expgolomb.ts'), ['readUE', 'readSE'])}\nreturn { readUE, readSE }`)
const h264Source = readSource('avutil/src/codecs/h264.ts')
const enumSource = h264Source.statements.find((node) => node.name?.text === 'H264NaluType').getText(h264Source).replace('export ', '')
let rapBytes
const h264 = evaluate(`${enumSource}\n${functionSource(h264Source, ['generateAnnexbExtradata', 'parseAVCodecParameters', 'parseSPS', 'isRAP'])}\nreturn { generateAnnexbExtradata, parseAVCodecParameters, isRAP }`, {
  naluUtil, BitReader, expgolomb, array: { each }, H264_MAX_DPB_FRAMES: 16,
  AVPixelFormat: { AV_PIX_FMT_YUV420P: 0 },
  AVPacketFlags: { AV_PKT_FLAG_H26X_ANNEXB: 64 },
  AVPacketSideDataType: { AV_PKT_DATA_NEW_EXTRADATA: 1 },
  reinterpret_cast: (value) => value,
  mapUint8Array: (offset, length) => rapBytes.subarray(offset, offset + length),
  intread: {
    r8: (offset) => new DataView(rapBytes.buffer).getUint8(offset),
    rb32: (offset) => new DataView(rapBytes.buffer).getInt32(offset)
  }
})
const Demuxer = loadClass('avformat/src/formats/IAviFormat.ts', 'IAviFormat', ['readAVPacket_', 'getDuration'], {
  AVCodecID: { AV_CODEC_ID_H264: 27, AV_CODEC_ID_MP3: 86017 },
  AVMediaType: { AVMEDIA_TYPE_VIDEO: 0 },
  AVCodecParameterFlags: { AV_CODECPAR_FLAG_H26X_ANNEXB: 1, AV_CODECPAR_FLAG_NO_PTS: 2 },
  AVPacketFlags: { AV_PKT_FLAG_KEY: 1, AV_PKT_FLAG_H26X_ANNEXB: 64 },
  AVPacketSideDataType: { AV_PKT_DATA_NEW_EXTRADATA: 1 },
  INT32_MAX: 2147483647, static_cast: BigInt, reinterpret_cast: (value) => value,
  allocAVPacketData: (length) => new Uint8Array(length + 64),
  mapSafeUint8Array: (data, length) => data.subarray(0, length),
  memcpyFromUint8Array: (target, length, source) => target.set(source.subarray(0, length)),
  addAVPacketData: (packet, data, size) => Object.assign(packet, { data, size }),
  getAVPacketData: (packet) => packet.data.subarray(0, packet.size),
  naluUtil, h264
})
// Parameter sets from a synthetic 32x32, 1 fps, baseline H.264 test pattern.
const sps = Uint8Array.from(Buffer.from('6742c00ad9096c044000000300400000030083c48992', 'hex'))
const pps = Uint8Array.from(Buffer.from('68cb83cb20', 'hex'))
const parameters = naluUtil.joinNaluByStartCode([sps, pps], 0)
const idr = new Uint8Array([0x65, 0x88, 0x84])

function fixture(codecpar = {}) {
  const demuxer = new Demuxer()
  const stream = {
    index: 0, metadata: {}, sideData: {}, timeBase: { num: 1, den: 1 },
    codecpar: { codecId: 27, codecType: 0, flags: 2, extradataSize: 0, ...codecpar },
    privData: { currentDts: 0n, dwSampleSize: 0 }
  }
  demuxer.context = { currentIndex: 0, hasVideoKey: false }
  return {
    stream,
    async packet(payload) {
      demuxer.context.currentIndex = 0
      demuxer.context.remaining = payload.length
      const packet = { flags: 0, timeBase: {} }
      const ioReader = { getPos: () => 128n, readBuffer: async (_, target) => target.set(payload) }
      assert.equal(await demuxer.readAVPacket_({ streams: [stream], ioReader }, packet), 0)
      return packet
    }
  }
}

function isRAP(bytes, flags = 0, lengthSize = 4) {
  rapBytes = bytes
  return h264.isRAP({ data: 0, size: bytes.length, flags }, lengthSize)
}

test('AVI discovers in-band H.264 parameters before keyframe detection', async () => {
  const { stream, packet } = fixture()
  const first = await packet(naluUtil.joinNaluByStartCode([sps, pps, idr], 0))
  assert.equal(stream.codecpar.flags, 3)
  assert.equal(stream.codecpar.profile, 66)
  assert.equal(stream.codecpar.level, 10)
  assert.equal(stream.codecpar.width, 32)
  assert.equal(stream.codecpar.height, 32)
  assert.deepEqual(stream.sideData[1], parameters)
  assert.deepEqual(stream.codecpar.extradata.subarray(0, stream.codecpar.extradataSize), parameters)
  assert.ok(first.flags & 64)
  assert.equal(isRAP(first.data.subarray(0, first.size), first.flags), true)
  const next = await packet(naluUtil.joinNaluByStartCode([new Uint8Array([0x41, 0x9a, 0x04, 0x1b, 0x22])], 0))
  assert.ok(next.flags & 64)
  assert.equal(isRAP(next.data.subarray(0, next.size), next.flags), false)
  assert.equal(next.dts, 1n)
})

test('AVI detects Annex B before parameter sets arrive and preserves existing AVC metadata', async () => {
  const delayed = fixture()
  const first = await delayed.packet(naluUtil.joinNaluByStartCode([idr], 0))
  assert.ok(first.flags & 64)
  assert.equal(delayed.stream.codecpar.extradataSize, 0)
  await delayed.packet(parameters)
  assert.equal(delayed.stream.codecpar.width, 32)
  const avcc = fixture({ extradataSize: 4, extradata: new Uint8Array([1, 2, 3, 4]), flags: 2 })
  const original = avcc.stream.codecpar.extradata
  const avccPacket = await avcc.packet(new Uint8Array([0, 0, 0, 3, ...idr]))
  assert.equal(avccPacket.flags & 64, 0)
  assert.equal(avcc.stream.codecpar.extradata, original)
})

test('H.264 random-access detection bounds every length-prefixed NAL', () => {
  for (const length of [1, 2, 3, 4]) {
    const prefix = new Uint8Array(length)
    prefix[length - 1] = idr.length
    assert.equal(isRAP(new Uint8Array([...prefix, ...idr]), 0, length), true)
  }
  for (const bytes of [
    [], [0, 0, 0], [0, 0, 0, 0, 0x65], [0x80, 0, 0, 0, 0x65],
    [0xff, 0xff, 0xff, 0xff, 0x65], [0, 0, 0, 2, 0x65],
    [0, 0, 0, 1, 0x41, 0x9a, 0x04, 0x1b, 0x22], [0, 0, 0, 1, 0x06]
  ]) {
    assert.equal(isRAP(new Uint8Array(bytes)), false, `malformed NAL ${bytes}`)
  }
  assert.equal(isRAP(new Uint8Array([0, 0, 0, 2, 0x06, 0x06])), true)
  for (const length of [0, 5]) {
    assert.equal(isRAP(new Uint8Array([3, ...idr]), 0, length), false)
  }
})
