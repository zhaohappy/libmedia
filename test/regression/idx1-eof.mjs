import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { compileFunction as compileVmFunction } from 'node:vm'

const compileFunction = (...args) => compileVmFunction(args.pop(), args)

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const require = createRequire(import.meta.url)
const ts = require(`${checkout}/node_modules/typescript`)
const file = `${checkout}/packages/avformat/src/formats/IAviFormat.ts`
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
const clazz = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'IAviFormat')
const methods = new Set(['syncChunk', 'getStreamIndex'])
const program = ts.transpileModule(
  `class AviDemuxer {\n${clazz.members.filter(method => methods.has(method.name?.getText(source))).map(method => method.getText(source)).join('\n')}\n}`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText
const IOFlags = { SEEKABLE: 1, ABORT: 2 }
const IOError = { END: -2, ABORT: -3 }
const AviDemuxer = compileFunction('IOFlags', 'IOError', 'static_cast', 'NOPTS_VALUE_BIGINT', 'logger', `${program}\nreturn AviDemuxer`)(
  IOFlags,
  IOError,
  BigInt,
  -1n,
  { error: (message) => { throw new Error(message) } },
)
function fixture({ length, seekable = true, trailer = '', buffered = 32, unknownSize = false }) {
  const paddedLength = length + (length & 1)
  const next = 8 + paddedLength
  const riffHeader = trailer === 'avix' ? 24 : 0
  const data = Buffer.alloc(next + (trailer ? riffHeader + 12 : 0))
  data.write('idx1')
  data.writeUInt32LE(length, 4)
  if (trailer === 'avix') {
    data.write('RIFF', next)
    data.writeUInt32LE(riffHeader + 4, next + 4)
    data.write('AVIXLIST', next + 8)
    data.writeUInt32LE(16, next + 16)
    data.write('movi', next + 20)
  }
  if (trailer) {
    data.write('00dc', next + riffHeader)
    data.writeUInt32LE(4, next + riffHeader + 4)
  }
  let pos = 0
  let fetchedTo = buffered
  const skips = []
  const seeks = []
  const ioReader = {
    flags: seekable ? IOFlags.SEEKABLE : 0,
    getPos: () => BigInt(pos),
    remainingLength: () => Math.max(fetchedTo - pos, 0),
    async skip(size) {
      skips.push(size)
      pos += size
    },
    async seek(offset, force = false, flush = true) {
      seeks.push([Number(offset), force, flush])
      pos = Number(offset)
      if (pos > fetchedTo)
        fetchedTo = pos
    },
    async readString(size) {
      this.check(size)
      const tag = data.toString('ascii', pos, pos + size)
      pos += size
      return tag
    },
    async readUint32() {
      this.check(4)
      const value = data.readUInt32LE(pos)
      pos += 4
      return value
    },
    check(size) {
      if (pos + size > data.length) {
        this.error = IOError.END
        throw new Error('EOF')
      }
    },
  }
  const demuxer = new AviDemuxer()
  demuxer.context = { fileSize: BigInt(data.length), ioFileSize: unknownSize ? 0n : BigInt(data.length), lastPktPos: 0n }
  const streams = [{ privData: {} }]
  return { demuxer, format: { ioReader, streams }, next, riffHeader, skips, seeks }
}
(async () => {
  for (const [name, options, expected] of [
    ['known physical EOF', { length: 65536 }, 'eof'],
    ['odd pad and next RIFF AVIX', { length: 65537, trailer: 'avix' }, 'seek'],
    ['buffered index', { length: 16, trailer: 'packet' }, 'skip'],
    ['sequential reader', { length: 65537, seekable: false, trailer: 'packet' }, 'skip'],
    ['unknown physical EOF', { length: 65537, unknownSize: true, trailer: 'packet' }, 'skip'],
  ]) {
    const { demuxer, format, next, riffHeader, seeks, skips } = fixture(options)
    const ret = await demuxer.syncChunk(format)
    if (expected === 'eof') {
      assert.equal(ret, IOError.END)
      assert.deepEqual(skips, [], name)
      assert.deepEqual(seeks, [], name)
    }
    else {
      assert.equal(ret, 0, name)
      assert.equal(format.ioReader.getPos(), BigInt(next + riffHeader + 8), name)
      if (expected === 'seek') {
        assert.deepEqual(seeks[0], [next, false, false], name)
        assert.ok(!skips.includes(next - 8), name)
      }
      else {
        assert.deepEqual(skips, [next - 8], name)
      }
    }
    console.log(`${name} passed`)
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
