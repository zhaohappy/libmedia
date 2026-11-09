import { evaluate, readSource, functionSource, ts } from './source.mjs'

function declarations(path) {
  const source = readSource(path)
  return source.statements.filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(source)).join('\n').replace(/export (?:default )?/g, '')
}

export const asf = evaluate(`${declarations('avformat/src/formats/asf/asf.ts')}\nreturn { GUID, Cursor, AsfError, AsfPacketParser, parseHeader }`)
export const IOError = { END: -1048576, ABORT: -1048574 }
export const AVMediaType = { AVMEDIA_TYPE_VIDEO: 0, AVMEDIA_TYPE_AUDIO: 1 }
export const AVSeekFlags = { BYTE: 2, ANY: 4 }
export const AVCodecID = new Proxy({}, { get: (_, key) => key })
export const errors = []
export function tag(value) {
  return Buffer.from(value).readUInt32LE()
}

// Exercise the real demuxer with byte arrays replacing WASM allocations.
export class Reader {
  constructor() {
    this.data = Buffer.alloc(0); this.pos = 0; this.flags = 1; this.error = 0
  }
  appendBuffer(data) {
    this.data = Buffer.from(data)
  }
  setEndian() {}
  getPos() {
    return BigInt(this.pos)
  }
  async fileSize() {
    return BigInt(this.data.length)
  }
  async seek(pos) {
    this.pos = Number(pos); this.error = 0
  }
  async skip(size) {
    await this.readBuffer(size)
  }
  async readBuffer(size, target) {
    if (size > this.data.length - this.pos) {
      this.error = IOError.END; throw new Error('EOF')
    }
    const bytes = this.data.subarray(this.pos, this.pos + size)
    this.pos += size
    if (target) {
      target.set(bytes)
    }
    return bytes
  }
  async readUint8() {
    return (await this.readBuffer(1))[0]
  }
  async readUint16() {
    return (await this.readBuffer(2)).readUInt16LE()
  }
  async readUint32() {
    return (await this.readBuffer(4)).readUInt32LE()
  }
  isBigEndian() {
    return false
  }
}

const riff = functionSource(readSource('avformat/src/formats/riff/iriff.ts'), ['readBmpHeader', 'readWavHeader'])
const code = `${riff}\n${declarations('avformat/src/formats/IAsfFormat.ts')}\nreturn IAsfFormat`
  .replace(/static_cast<u?int64>/g, 'BigInt').replace(/(?:static_cast|reinterpret_cast)<(?:[^<>]|<[^<>]*>)*>/g, 'Number')
export const IAsfFormat = evaluate(code, {
  ...asf,
  MAX_OBJECT_SIZE: 64 * 1024 * 1024,
  MAX_PACKET_SIZE: 16 * 1024 * 1024,
  AVCodecParameterFlags: { AV_CODECPAR_FLAG_NO_PTS: 2 }, IFormat: class {}, IOReader: Reader, IOError, AVMediaType, AVCodecID, AVSeekFlags,
  AVFormat: { ASF: 22 }, IOFlags: { SEEKABLE: 1 }, AVPacketFlags: { AV_PKT_FLAG_KEY: 1 },
  NOPTS_VALUE_BIGINT: -9223372036854775808n,
  errorType: { FORMAT_NOT_SUPPORT: -1, DATA_INVALID: -2, OPERATE_NOT_SUPPORT: -9 },
  logger: { error: (message) => errors.push(message) },
  codecBmpTags: Object.fromEntries(['WMV1', 'WMV2', 'WMV3', 'WVC1'].map((name) => [tag(name), `AV_CODEC_ID_${name === 'WVC1' ? 'VC1' : name}`])),
  allocAVPacketData: (size) => new Uint8Array(size + 64), avMallocz: (size) => new Uint8Array(size), avMalloc: (size) => new Uint8Array(size), avFree() {},
  mapSafeUint8Array: (data, size) => data.subarray(0, size),
  addAVPacketData: (packet, data, size) => Object.assign(packet, { data, size }),
  channel: { unInitChannelLayout() {} }, AVChannelOrder: { AV_CHANNEL_ORDER_UNSPEC: 0 },
  getWavCodecId: (tag) => ({ 0x160: 'AV_CODEC_ID_WMAV1', 0x161: 'AV_CODEC_ID_WMAV2', 0x162: 'AV_CODEC_ID_WMAPRO' })[tag],
  addressof: (value) => value,
  Number: (value) => ArrayBuffer.isView(value) ? value : Number(value)
})

export async function open(data) {
  const ioReader = new Reader()
  ioReader.appendBuffer(data)
  const streams = []
  const context = {
    ioReader, metadata: {}, streams,
    createStream() {
      const stream = { index: streams.length, codecpar: { chLayout: {}, framerate: {}, sampleAspectRatio: {} }, timeBase: {}, metadata: {} }
      streams.push(stream)
      return stream
    },
    getStreamByMediaType(type) {
      return streams.find((stream) => stream.codecpar.codecType === type)
    }
  }
  const format = new IAsfFormat()
  format.init(context)
  const result = await format.readHeader(context)
  return { context, format, result }
}
