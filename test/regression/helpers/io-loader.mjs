import { readSource, transpile, ts } from './source.mjs'
import { dirname, join } from 'node:path'
import { compileFunction } from 'node:vm'
import assert from 'node:assert/strict'

const modules = new Map()
const fetchLoaderPath = 'avnetwork/src/ioLoader/FetchIOLoader.ts'
const fileLoaderPath = 'avnetwork/src/ioLoader/FileIOLoader.ts'
export function load(relativePath) {
  if (modules.has(relativePath)) {
    return modules.get(relativePath)
  }

  const outputText = transpile(readSource(relativePath).getFullText(), { module: ts.ModuleKind.CommonJS })
  const exports = {}
  const requireModule = (name) => {
    switch (name) {
      case '@libmedia/common':
        return {
          is: load('common/src/util/is.ts'),
          object: load('common/src/util/object.ts'),
          logger: load('common/src/util/logger.ts'),
          getTimestamp: load('common/src/function/getTimestamp.ts').default
        }
      case '@libmedia/common/timer':
        return { Sleep: load('common/src/timer/Sleep.ts').default }
      case '@libmedia/common/io':
        return load('common/src/io/error.ts')
      case '@libmedia/common/network': {
        const port = load('common/src/network/IPCPort.ts')
        return { ...port, IPCPort: port.default }
      }
      case '@libmedia/avutil':
        return { ...load('avutil/src/avformat.ts'), errorType: load('avutil/src/error.ts') }
      case '@libmedia/avnetwork':
        return {
          FetchIOLoader: load(fetchLoaderPath).default,
          FileIOLoader: load(fileLoaderPath).default
        }
      case '@libmedia/cheap':
        return {}
      default:
        if (name.startsWith('.')) {
          return load(join(dirname(relativePath), `${name}.ts`))
        }
        throw new Error(`Unexpected upstream import: ${name}`)
    }
  }
  modules.set(relativePath, exports)
  compileFunction(outputText, ['require', 'exports', 'static_cast', 'nullptr', 'assert'])(requireModule, exports, BigInt, null, assert.ok)
  return exports
}

