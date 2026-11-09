import { fileURLToPath } from 'node:url'
// Exercise the patched upstream methods, including their drain-time timestamps.
// Usage: node verify-upstream.mjs /path/to/patched/libmedia
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { runInNewContext } from 'node:vm'

const checkout = resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)))
const requireUpstream = createRequire(join(checkout, 'package.json'))
const ts = requireUpstream('typescript')
const file = join(checkout, 'packages/avcodec/src/wasmcodec/VideoDecoder.ts')
const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
const declaration = source.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'WasmVideoDecoder')
const names = new Set(['flush', 'flushAsync', 'outputAVFrame'])
const methods = declaration.members.filter(method => names.has(method.name?.getText(source)))
assert.equal(methods.length, names.size)
const program = ts.transpileModule(`class Decoder {\n${methods.map(method => method.getText(source)).join('\n')}\n}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
/** Replace only the WASM/pointer boundary; execute the actual upstream methods. */
const Decoder = runInNewContext(`const AVCodecParameterFlags = { AV_CODECPAR_FLAG_NO_PTS: 1 }; const nullptr = null; ${program}; Decoder`)
async function main() {
  for (const method of ['flush', 'flushAsync']) {
    for (const endCode of [0, -1]) {
      const decoder = new Decoder()
      const outputs = []
      decoder.frame = { timeBase: {} }
      decoder.timeBase = { den: 1000, num: 1 }
      decoder.parameters = { flags: 1 }
      decoder.dtsQueue = [7200n, 7235n]
      decoder.decoder = {
        invoke: name => assert.equal(name, 'decoder_flush'),
        invokeAsync: async name => assert.equal(name, 'decoder_flush'),
      }
      decoder.options = { onReceiveAVFrame: frame => outputs.push(frame.pts) }
      const drained = [1, endCode]
      decoder.receiveAVFrame = () => drained.shift()
      decoder.receiveAVFrameAsync = async () => drained.shift()
      assert.equal(await decoder[method](), endCode)
      assert.deepEqual(outputs, [7200n], 'drained frames retain their original timestamps')
      decoder.dtsQueue.push(1800n)
      decoder.frame = { timeBase: {} }
      decoder.outputAVFrame()
      assert.deepEqual(outputs, [7200n, 1800n], `${method}: backward seek starts with the new timestamp`)
    }
  }
  console.log('Upstream video timestamp regression: 4 cases passed.')

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
