import path from 'path'
import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import ts from 'typescript'
import { spawnSync, execSync } from 'child_process'
import * as terser from 'terser'
import { fileURLToPath } from 'url'
import os from 'os'
// @ts-ignore
import html2js from 'html2js'
import type {
  before as TransformerBefore,
  afterDeclarations as TransformerAfterDeclarations
} from '../packages/cheap/build/transformer'

interface MyArgs {
  package: string
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const argv = yargs(hideBin(process.argv))
  .options({
    package: { type: 'string', demandOption: true }
  })
  .parseSync() as MyArgs

const rootPath = path.resolve(__dirname, '../packages')

const files: Record<string, string> = {
  audioresample: path.resolve(__dirname, '../packages/audioresample/package.json'),
  audiostretchpitch: path.resolve(__dirname, '../packages/audiostretchpitch/package.json'),
  avcodec: path.resolve(__dirname, '../packages/avcodec/package.json'),
  avfilter: path.resolve(__dirname, '../packages/avfilter/package.json'),
  avformat: path.resolve(__dirname, '../packages/avformat/package.json'),
  avnetwork: path.resolve(__dirname, '../packages/avnetwork/package.json'),
  avpipeline: path.resolve(__dirname, '../packages/avpipeline/package.json'),
  avprotocol: path.resolve(__dirname, '../packages/avprotocol/package.json'),
  avrender: path.resolve(__dirname, '../packages/avrender/package.json'),
  avutil: path.resolve(__dirname, '../packages/avutil/package.json'),
  cheap: path.resolve(__dirname, '../packages/cheap/package.json'),
  common: path.resolve(__dirname, '../packages/common/package.json'),
  videoscale: path.resolve(__dirname, '../packages/videoscale/package.json')
}

const packages: Record<string, Record<string, any>> = {
  audioresample: JSON.parse(fs.readFileSync(files['audioresample'], 'utf8')),
  audiostretchpitch: JSON.parse(fs.readFileSync(files['audiostretchpitch'], 'utf8')),
  avcodec: JSON.parse(fs.readFileSync(files['avcodec'], 'utf8')),
  avfilter: JSON.parse(fs.readFileSync(files['avfilter'], 'utf8')),
  avformat: JSON.parse(fs.readFileSync(files['avformat'], 'utf8')),
  avnetwork: JSON.parse(fs.readFileSync(files['avnetwork'], 'utf8')),
  avpipeline: JSON.parse(fs.readFileSync(files['avpipeline'], 'utf8')),
  avprotocol: JSON.parse(fs.readFileSync(files['avprotocol'], 'utf8')),
  avrender: JSON.parse(fs.readFileSync(files['avrender'], 'utf8')),
  avutil: JSON.parse(fs.readFileSync(files['avutil'], 'utf8')),
  cheap: JSON.parse(fs.readFileSync(files['cheap'], 'utf8')),
  common: JSON.parse(fs.readFileSync(files['common'], 'utf8')),
  videoscale: JSON.parse(fs.readFileSync(files['videoscale'], 'utf8'))
}

const configFileName = ts.findConfigFile(path.resolve(__dirname, '../'), ts.sys.fileExists, 'tsconfig.json')
const configFile = ts.readConfigFile(configFileName!, ts.sys.readFile)

function copyFolder(src: string, dest: string) {
  // 确保目标文件夹存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  // 读取源文件夹内容
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      // 如果是文件夹，递归复制
      copyFolder(srcPath, destPath)
    }
    else {
      // 如果是文件，直接复制
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function reportTSError(
  file: ts.SourceFile,
  node: ts.Node,
  message: string | ts.DiagnosticMessageChain,
  code = 9000,
  startPos = 0,
  endPos = 0
) {

  if (!startPos && node.pos > -1) {
    startPos = node.getStart()
  }
  if (!endPos && node.end > -1) {
    endPos = node.getEnd()
  }

  const format = ts.formatDiagnostic(
    {
      file: file,
      start: startPos,
      length: endPos - startPos,
      category: ts.DiagnosticCategory.Error,
      code,
      messageText: message
    },
    {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: function (fileName) {
        return fileName
      },
      getNewLine: function () {
        return ts.sys.newLine
      }
    }
  )
  console.error(`\x1b[31m${format}\x1b[0m`)
}

function replacePath(importPath: string, file?: ts.SourceFile, node?: ts.Node) {
  let path = importPath
  if (file && path.indexOf('@libmedia/') === 0) {
    const fileName = file.fileName.replace(rootPath + '/', '')
    const packageDir = fileName.split('/')[0]
    const packageName = path.split('/')[1]
    if (packageDir === packageName && node) {
      reportTSError(file, node, 'import module under the same package name using relative path')
    }
    else if (packages[packageName]
      && packageDir !== 'avplayer'
      && packageDir !== 'avtranscoder'
    ) {
      const json = packages[packageName]
      if (!json.exports && node) {
        reportTSError(file, node, 'import module not export in package.json')
      }
      else {
        const module = path.replace(`@libmedia/${packageName}`, '.')
        if (!json.exports[module] && node) {
          reportTSError(file, node, `import module(${module}) not export in ${packageName}'s package.json`)
        }
      }
    }
  }

  return path
}

// 打印任务日志，支持缩进
function printTaskLog(taskLevel: number, taskId: string, status: string, message = '') {
  const indent = ' '.repeat(taskLevel * 2)
  console.log(`${indent}Task ${taskId}: ${status} ${message}`)
}

function packageMapTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      function visitor(node: ts.Node) {
        if (ts.isStringLiteral(node) && node.parent && ts.isImportDeclaration(node.parent)) {
          let path = replacePath(node.text, sourceFile, node)
          if (/\.(glsl|vert|frag|asm|wgsl)$/.test(path)) {
            path += '.js'
          }
          return context.factory.createStringLiteral(path)
        }
        else if (ts.isCallExpression(node)
          && (ts.isIdentifier(node.expression) && node.expression.escapedText === 'import'
            || node.expression.kind === ts.SyntaxKind.ImportKeyword
          )
          && ts.isStringLiteral(node.arguments[0])
        ) {
          let path = replacePath(node.arguments[0].text, sourceFile, node)
          return context.factory.createCallExpression(
            context.factory.createToken(ts.SyntaxKind.ImportKeyword) as unknown as ts.Identifier,
            undefined,
            [
              context.factory.createStringLiteral(path)
            ]
          )
        }
        else if (ts.isImportTypeNode(node)
          && ts.isLiteralTypeNode(node.argument)
          && ts.isStringLiteral(node.argument.literal)
        ) {
          let path = replacePath(node.argument.literal.text, sourceFile, node)
          return context.factory.createImportTypeNode(
            context.factory.createLiteralTypeNode(context.factory.createStringLiteral(path)),
            node.attributes,
            node.qualifier,
            node.typeArguments,
            node.isTypeOf
          )
        }
        return ts.visitEachChild(node, visitor, context)
      }
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile
    }
  }
}

function getVersion() {
  try {
    return execSync('git describe --tags').toString().trim()
  }
  catch (error) {
    return 'n0.0.1'
  }
}

async function compile(
  fileNames: string[],
  options: ts.CompilerOptions,
  writeCallback: ts.WriteFileCallback,
  cjs: boolean = false,
  defined: Record<string, any> = {},
  disableTransformer: boolean = false
) {
  if (options.outDir) {
    fs.rmSync(options.outDir, { recursive: true, force: true })
  }
  if (options.declarationDir) {
    fs.rmSync(options.declarationDir, { recursive: true, force: true })
  }
  const program = ts.createProgram(fileNames, options)
  const defineds = {}
  Object.assign(defineds, configFile.config?.cheap?.defined ?? {})
  Object.assign(defineds, {
    ENV_NODE: cjs,
    ENV_WEBPACK: false,
    DEBUG: false,
    ENABLE_LOG_TRACE: false,
    ENABLE_THREADS: true,
    ENABLE_THREADS_SPLIT: false,
    VERSION: getVersion()
  })
  Object.assign(defineds, defined)
  const emitResult = program.emit(undefined, writeCallback, undefined, undefined, {
    before: [
      packageMapTransformer(),
      ...(disableTransformer ? [] : [((await import('../packages/cheap/build/transformer.mjs') as { before: typeof TransformerBefore })).before(program, {
        tmpPath: path.join(__dirname, '../dist'),
        cheapSourcePath: path.resolve(__dirname, '../packages/cheap/src'),
        cheapPacketName: '@libmedia/cheap',
        defined: defineds,
        importPath: (p: string) => {
          return replacePath(p)
        }
      })])
    ],
    afterDeclarations: [
      packageMapTransformer() as ts.TransformerFactory<ts.SourceFile | ts.Bundle>,
      ...(disableTransformer
        ? []
        : [((await import('../packages/cheap/build/transformer.mjs') as { afterDeclarations: typeof TransformerAfterDeclarations })).afterDeclarations(program) as ts.TransformerFactory<ts.SourceFile | ts.Bundle>]
      )
    ]
  })

  // 打印错误
  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } =
        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    }
    else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })
}

function parseCommandLine(configPath: string) {
  const configText = fs.readFileSync(configPath, 'utf8')
  const { config } = ts.parseConfigFileTextToJson(configPath, configText)
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    path.dirname(configPath)
  )
  return parsedCommandLine
}

function buildASM(file: string, to: string, sourcePath: string, cjs: boolean) {
  const input = '__cheap__transformer_tmp.wat'
  const output = '__cheap__transformer_tmp.wasm'

  let wat2wasmPath = path.resolve(__dirname, '../packages/cheap/build/asm/ubuntu') + '/wat2wasm'
  if (os.platform() === 'win32') {
    wat2wasmPath = path.resolve(__dirname, '../packages/cheap/build/asm/win') + '/wat2wasm.exe'
  }
  else if (os.platform() === 'darwin') {
    wat2wasmPath = path.resolve(__dirname, '../packages/cheap/build/asm/macos') + '/wat2wasm'
  }

  const inputPath = `${path.resolve(__dirname, '../dist')}/${input}`
  const outputPath = `${path.resolve(__dirname, '../dist')}/${output}`

  const cmd = `${wat2wasmPath} ${inputPath} --enable-simd --enable-threads -o ${outputPath}`

  const content = fs.readFileSync(file, 'utf8')

  const source = `
    (module
      (import "env" "memory" (memory 1 65536 shared))
      ${content}
    )
  `

  fs.writeFileSync(inputPath, source)

  execSync(cmd, {
    stdio: 'pipe'
  })
  const buffer = fs.readFileSync(outputPath)
  let dir = path.dirname(to)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(to, cjs ? `
    module.exports = '${buffer.toString('base64')}';
  `
    : `
    export default '${buffer.toString('base64')}';
  `, 'utf8')
}

function buildGlsl(file: string, to: string, sourcePath: string, cjs: boolean = false) {
  const source = fs.readFileSync(file, 'utf8')
  let code = html2js(source)
  let dir = path.dirname(to)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(to, cjs ? `
      module.exports = ${code};
    `
    : `
    export default ${code};
  `, 'utf8')
}

function buildWgsl(file: string, to: string, sourcePath: string, cjs: boolean = false) {
  const source = fs.readFileSync(file, 'utf8')
  let code = html2js(source)
  let dir = path.dirname(to)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(to, cjs ? `
    module.exports = ${code};
    `
    : `
    export default ${code};
  `, 'utf8')
}

function generateEnum(fileName: string) {
  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../tsconfig.json'))
  printTaskLog(1, 'enum', 'START', 'starting generate enum')
  const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options)

  let source = ''

  const typeChecker = program.getTypeChecker()
  program.emit(undefined, () => {}, undefined, undefined, {
    before: [
      function (context) {
        return (sourceFile) => {
          if (/avutil\/src\/enum\.ts$/.test(sourceFile.fileName)) {
            function visitor(node: ts.Node) {
              if (ts.isNamedExports(node)) {
                node.elements.forEach((element) => {
                  const type = typeChecker.getTypeAtLocation(element.name)
                  if (type.symbol?.valueDeclaration) {
                    let text = type.symbol.valueDeclaration.getText()
                    text = text.replace(/export\s+const\s+enum\s+/, 'export enum ')
                    source += text + '\n'
                  }
                })
              }
              return ts.visitEachChild(node, visitor, context)
            }
            return ts.visitNode(sourceFile, visitor) as ts.SourceFile
          }
          return sourceFile
        }
      }
    ]
  })
  fs.writeFileSync(path.resolve(__dirname, `../packages/avutil/src/${fileName}.ts`), source)
}

function formatESMFileImport(data: string) {
  data = data.replace(
    /(\s+from\s+['"])(\.[^'"]*)(['"])/g,
    (s0, s1, s2, s3) => {
      if (/\.js$/.test(s2)) {
        return s1 + s2 + s3
      }
      return s1 + s2 + '.js' + s3
    }
  )
  // This matches dynamic imports
  data = data.replace(
    /(import\s*\(\s*['"])(\.[^'"]*)(['"]\s*\))/g,
    (s0, s1, s2, s3) => {
      if (/\.js$/.test(s2)) {
        return s1 + s2 + s3
      }
      return s1 + s2 + '.js' + s3
    }
  )
  return data
}

function formatCJSFileImport(data: string) {
  data = data.replace(
    /(require\s*\(\s*['"])(\.[^'"]*)(['"]\s*\))/g,
    (s0, s1, s2, s3) => {
      if (/\.js$/.test(s2)) {
        return s1 + s2.replace(/\.js$/, '.cjs') + s3
      }
      return s1 + s2 + '.cjs' + s3
    }
  )
  return data
}

function formatDeclarationFileImport(data: string) {
  // This matches static imports
  data = data.replace(
    /(\s+from\s+['"])(\.[^'"]*)(['"])/g,
    (s0, s1, s2, s3) => {
      if (/\.js$/.test(s2)) {
        return s1 + s2.replace(/\.js$/, '.d.ts') + s3
      }
      return s1 + s2 + '.d.ts' + s3
    }
  )
  // This matches dynamic imports
  data = data.replace(
    /(import\s*\(\s*['"])(\.[^'"]*)(['"]\s*\))/g,
    (s0, s1, s2, s3) => {
      if (/\.js$/.test(s2)) {
        return s1 + s2.replace(/\.js$/, '.d.ts') + s3
      }
      return s1 + s2 + '.d.ts' + s3
    }
  )
  return data
}

function formatSourcemapPath(data: string) {
  const json = JSON.parse(data)
  json.sources[0] = json.sources[0].replace(/^(\.\.\/\.\.\/)/, '')
  return JSON.stringify(json)
}

async function buildPackage(packageName: string, taskLevel = 1, fileNamesFilter?: (f: string) => boolean) {

  if (!fileNamesFilter) {
    fileNamesFilter = (name) => {
      return !/avutil\/src\/enum\.ts$/.test(name)
    }
  }

  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../packages/${packageName}/tsconfig.esm.json`))

  const esmReg = new RegExp(`dist\/esm\/${packageName}\/src\/?`)
  const cjsReg = new RegExp(`dist\/cjs\/${packageName}\/src\/?`)

  printTaskLog(taskLevel, packageName, 'START', `starting built ${packageName} esm package`)

  await compile(fileNamesFilter ? parsedCommandLine.fileNames.filter(fileNamesFilter) : parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (esmReg.test(dir)) {
      dir = dir.replace(esmReg, 'dist/esm/')
      fs.mkdirSync(dir, { recursive: true })
      if (/\.js$/.test(fileName)) {
        terser.minify(data, {
          compress: {
            unused: true,
            // eslint-disable-next-line camelcase
            dead_code: true,
            toplevel: true
          },
          sourceMap: {
            content: fs.readFileSync(path.resolve(dir, path.basename(fileName) + '.map'), 'utf8'),
            url: path.basename(fileName) + '.map'
          },
          mangle: false,
          output: {
            beautify: true
          }
        }).then((result) => {
          let code = formatESMFileImport(result.code!)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName)), code)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName) + '.map'), JSON.stringify(result.map))
        })
      }
      else {
        if (/\.map$/.test(fileName)) {
          data = formatSourcemapPath(data)
        }
        if (/\.d\.ts$/.test(fileName)) {
          data = formatDeclarationFileImport(data)
        }
        if (packageName === 'cheap' && /cheap\/src\/index\.d\.ts$/.test(fileName)) {
          // data = 'import "./cheapdef.d.ts"\n\n' + data
          data = '/// <reference path="./cheapdef.d.ts" />\n\n' + data
        }
        fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
      }
    }
  })

  printTaskLog(taskLevel, packageName, 'SUCCESS', `built ${packageName} esm package completed`)

  printTaskLog(taskLevel, packageName, 'START', `starting built ${packageName} cjs package`)

  parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../packages/${packageName}/tsconfig.cjs.json`))
  await compile(fileNamesFilter ? parsedCommandLine.fileNames.filter(fileNamesFilter) : parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (cjsReg.test(dir)) {
      dir = dir.replace(cjsReg, 'dist/cjs/')
      fs.mkdirSync(dir, { recursive: true })
      if (/\.js$/.test(fileName)) {
        terser.minify(data, {
          compress: {
            unused: true,
            // eslint-disable-next-line camelcase
            dead_code: true,
            toplevel: true
          },
          sourceMap: {
            content: fs.readFileSync(path.resolve(dir, path.basename(fileName) + '.map'), 'utf8'),
            url: path.basename(fileName) + '.map'
          },
          mangle: false,
          output: {
            beautify: true
          }
        }).then((result) => {
          let code = formatCJSFileImport(result.code!)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName.replace(/\.js$/, '.cjs'))), code)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName) + '.map'), JSON.stringify(result.map))
        })
      }
      else {
        if (/\.map$/.test(fileName)) {
          data = formatSourcemapPath(data)
        }
        fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
      }
    }
  }, true, { ENV_CJS: true })

  printTaskLog(taskLevel, packageName, 'SUCCESS', `built ${packageName} cjs package completed`)
}

async function buildCheapCode(taskLevel = 1, fileNamesFilter?: (f: string) => boolean) {
  const packageName = 'cheap'
  await buildPackage(packageName, taskLevel, fileNamesFilter)

  if (!fileNamesFilter) {
    fileNamesFilter = (name) => {
      return !/avutil\/enum\.ts$/.test(name)
    }
  }

  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../packages/${packageName}/tsconfig.mjs.json`))

  const mjsReg = new RegExp(`dist\/mjs\/${packageName}\/src\/?`)

  printTaskLog(taskLevel, packageName, 'START', `starting built ${packageName} mjs package`)

  await compile(fileNamesFilter ? parsedCommandLine.fileNames.filter(fileNamesFilter) : parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (mjsReg.test(dir)) {
      dir = dir.replace(mjsReg, 'dist/mjs/')
      fs.mkdirSync(dir, { recursive: true })
      if (/\.js$/.test(fileName)) {
        terser.minify(data, {
          compress: {
            unused: true,
            // eslint-disable-next-line camelcase
            dead_code: true,
            toplevel: true
          },
          sourceMap: {
            content: fs.readFileSync(path.resolve(dir, path.basename(fileName) + '.map'), 'utf8'),
            url: path.basename(fileName) + '.map'
          },
          mangle: false,
          output: {
            beautify: true
          }
        }).then((result) => {
          let code = formatESMFileImport(result.code!)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName)), code)
          fs.writeFileSync(path.resolve(dir, path.basename(fileName) + '.map'), JSON.stringify(result.map))
        })
      }
      else {
        if (/\.map$/.test(fileName)) {
          data = formatSourcemapPath(data)
        }
        fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
      }
    }
  }, false, { ENV_NODE: true })

  printTaskLog(taskLevel, packageName, 'SUCCESS', `built ${packageName} mjs package completed`)
}

async function buildCommon() {
  printTaskLog(0, 'common', 'START', 'starting built common')

  printTaskLog(1, 'common', 'START', 'starting built common esm package')
  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../packages/common/tsconfig.esm.json'))
  await compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    if (/\.js$/.test(fileName)) {
      data = formatESMFileImport(data)
    }
    if (/\.d\.ts$/.test(fileName)) {
      data = formatDeclarationFileImport(data)
    }
    fs.mkdirSync(path.dirname(fileName), { recursive: true })
    fs.writeFileSync(fileName, data)
  }, false, {}, true)
  printTaskLog(1, 'common', 'SUCCESS', 'built common esm package completed')

  printTaskLog(1, 'common', 'START', 'starting built common cjs package')
  parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../packages/common/tsconfig.cjs.json'))
  await compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    if (/\.js$/.test(fileName)) {
      fileName = fileName.replace(/\.js$/, '.cjs')
      data = formatCJSFileImport(data)
    }
    fs.mkdirSync(path.dirname(fileName), { recursive: true })
    fs.writeFileSync(fileName, data)
  }, true, {}, true)
  printTaskLog(1, 'common', 'SUCCESS', 'built common cjs package completed')

  printTaskLog(0, 'common', 'SUCCESS', 'built common completed')
}

async function buildCheap() {
  printTaskLog(0, 'cheap', 'START', 'starting built cheap')

  printTaskLog(1, 'cheap', 'START', 'starting built cheap polyfill')
  spawnSync('npm', ['run', 'build-cheap-polyfill'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'cheap', 'SUCCESS', 'built cheap polyfill completed')

  printTaskLog(1, 'cheap', 'START', 'starting built cheap webassembly runner')
  spawnSync('npm', ['run', 'build-webassembly-runner'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'cheap', 'SUCCESS', 'built cheap webassembly runner completed')

  printTaskLog(1, 'cheap', 'START', 'starting built cheap thread entry runner')
  spawnSync('npm', ['run', 'build-thread-entry'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'cheap', 'SUCCESS', 'built cheap thread entry completed')

  await buildCheapCode()

  fs.copyFileSync(path.resolve(__dirname, '../dist/cheap-polyfill.js'), path.resolve(__dirname, '../packages/cheap/dist/cheap-polyfill.js'))
  fs.copyFileSync(path.resolve(__dirname, '../packages/cheap/src/webassembly/WebAssemblyRunnerWorker.js'), path.resolve(__dirname, '../packages/cheap/dist/esm/webassembly/WebAssemblyRunnerWorker.js'))
  fs.copyFileSync(path.resolve(__dirname, '../packages/cheap/src/webassembly/threadEntry.js'), path.resolve(__dirname, '../packages/cheap/dist/esm/webassembly/threadEntry.js'))
  printTaskLog(1, 'cheap', 'SUCCESS', 'copy cheap-polyfill.js WebAssemblyRunnerWorker.js threadEntry.js completed')

  printTaskLog(0, 'cheap', 'SUCCESS', 'built cheap completed')
}

async function buildAudioresample() {
  printTaskLog(0, 'audioresample', 'START', 'starting built audioresample')

  await buildPackage('audioresample')

  printTaskLog(0, 'audioresample', 'SUCCESS', 'built audioresample completed')
}

async function buildAudiostretchpitch() {
  printTaskLog(0, 'audiostretchpitch', 'START', 'starting built audiostretchpitch')
  await buildPackage('audiostretchpitch')
  printTaskLog(0, 'audiostretchpitch', 'SUCCESS', 'built audiostretchpitch completed')
}

async function buildVideoscale() {
  printTaskLog(0, 'videoscale', 'START', 'starting built videoscale')
  await buildPackage('videoscale')
  printTaskLog(0, 'videoscale', 'SUCCESS', 'built videoscale completed')
}

async function buildAvutil() {
  printTaskLog(0, 'avutil', 'START', 'starting built avutil')
  const enumFileName = '__enum__'

  generateEnum(enumFileName)
  await buildPackage('avutil')

  process.on('exit', (code) => {
    fs.renameSync(path.resolve(__dirname, `../packages/avutil/dist/esm/${enumFileName}.js`), path.resolve(__dirname, '../packages/avutil/dist/esm/enum.js'))
    fs.renameSync(path.resolve(__dirname, `../packages/avutil/dist/cjs/${enumFileName}.cjs`), path.resolve(__dirname, '../packages/avutil/dist/cjs/enum.cjs'))
    fs.renameSync(path.resolve(__dirname, `../packages/avutil/dist/esm/${enumFileName}.js.map`), path.resolve(__dirname, '../packages/avutil/dist/esm/enum.js.map'))
    fs.renameSync(path.resolve(__dirname, `../packages/avutil/dist/cjs/${enumFileName}.js.map`), path.resolve(__dirname, '../packages/avutil/dist/cjs/enum.js.map'))
    fs.renameSync(path.resolve(__dirname, `../packages/avutil/dist/esm/${enumFileName}.d.ts`), path.resolve(__dirname, '../packages/avutil/dist/esm/enum.d.ts'))
  })

  fs.unlinkSync(path.resolve(__dirname, `../packages/avutil/src/${enumFileName}.ts`))

  printTaskLog(0, 'avutil', 'SUCCESS', 'built avutil completed')
}

async function buildAvcodec() {
  printTaskLog(0, 'avcodec', 'START', 'starting built avcodec')
  await buildPackage('avcodec')
  printTaskLog(0, 'avcodec', 'SUCCESS', 'built avcodec completed')
}

async function buildAvfilter() {
  printTaskLog(0, 'avfilter', 'START', 'starting built avfilter')
  await buildPackage('avfilter')
  printTaskLog(0, 'avfilter', 'SUCCESS', 'built avfilter completed')
}

async function buildAvformat() {
  printTaskLog(0, 'avformat', 'START', 'starting built avformat')
  await buildPackage('avformat')
  printTaskLog(0, 'avformat', 'SUCCESS', 'built avformat completed')
}

async function buildAvnetwork() {
  printTaskLog(0, 'avnetwork', 'START', 'starting built avnetwork')
  await buildPackage('avnetwork')
  printTaskLog(0, 'avnetwork', 'SUCCESS', 'built avnetwork completed')
}

async function buildAvpipeline() {
  printTaskLog(0, 'avpipeline', 'START', 'starting built avpipeline')
  await buildPackage('avpipeline')
  printTaskLog(0, 'avpipeline', 'SUCCESS', 'built avpipeline completed')
}

async function buildAvprotocol() {
  printTaskLog(0, 'avprotocol', 'START', 'starting built avprotocol')
  await buildPackage('avprotocol')
  printTaskLog(0, 'avprotocol', 'SUCCESS', 'built avprotocol completed')
}

async function buildAvrender() {
  printTaskLog(0, 'avrender', 'START', 'starting built avrender')

  printTaskLog(1, 'avrender', 'START', 'starting built pcm worklet processor')
  spawnSync('npm', ['run', 'build-pcm-worklet-processor'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'avrender', 'SUCCESS', 'built pcm worklet processor completed')

  fs.mkdirSync(path.resolve(__dirname, '../packages/avrender/dist'), { recursive: true })
  fs.copyFileSync(path.resolve(__dirname, '../dist/AudioSourceWorkletProcessor.js'), path.resolve(__dirname, '../packages/avrender/dist/AudioSourceWorkletProcessorWorklet.js'))
  fs.copyFileSync(path.resolve(__dirname, '../dist/AudioSourceWorkletProcessor2.js'), path.resolve(__dirname, '../packages/avrender/dist/AudioSourceWorkletProcessor2Worklet.js'))

  printTaskLog(1, 'avrender', 'SUCCESS', 'copy AudioSourceWorkletProcessor AudioSourceWorkletProcessor2 completed')

  await buildPackage('avrender')

  buildGlsl(path.resolve(__dirname, '../packages/avrender/src/image/webgl/glsl/vertex.vert'), path.resolve(__dirname, '../packages/avrender/dist/esm/image/webgl/glsl/vertex.vert.js'), '../../../../../image/webgl/glsl/')
  buildGlsl(path.resolve(__dirname, '../packages/avrender/src/image/webgl/glsl/vertex.vert'), path.resolve(__dirname, '../packages/avrender/dist/cjs/image/webgl/glsl/vertex.vert.js'), '../../../../../image/webgl/glsl/', true)

  printTaskLog(1, 'avrender', 'SUCCESS', 'built glsl completed')

  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/vertex.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/esm/image/webgpu/wgsl/vertex.wgsl.js'), '../../../../../image/webgpu/wgsl/')
  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/vertex.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/cjs/image/webgpu/wgsl/vertex.wgsl.js'), '../../../../../image/webgpu/wgsl/', true)

  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/compute/uint2FloatBE.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/esm/image/webgpu/wgsl/compute/uint2FloatBE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/')
  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/compute/uint2FloatBE.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/cjs/image/webgpu/wgsl/compute/uint2FloatBE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/', true)

  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/compute/uint2FloatLE.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/esm/image/webgpu/wgsl/compute/uint2FloatLE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/')
  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/compute/uint2FloatLE.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/cjs/image/webgpu/wgsl/compute/uint2FloatLE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/', true)

  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/fragment/external.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/esm/image/webgpu/wgsl/fragment/external.wgsl.js'), '../../../../../image/webgpu/wgsl/fragment/')
  buildWgsl(path.resolve(__dirname, '../packages/avrender/src/image/webgpu/wgsl/fragment/external.wgsl'), path.resolve(__dirname, '../packages/avrender/dist/cjs/image/webgpu/wgsl/fragment/external.wgsl.js'), '../../../../../image/webgpu/wgsl/fragment/', true)

  printTaskLog(1, 'avrender', 'SUCCESS', 'built wgsl completed')

  printTaskLog(0, 'avrender', 'SUCCESS', 'built avrender completed')
}

async function buildAvplayer() {
  printTaskLog(0, 'AVPlayer', 'START', 'starting built AVPlayer')
  fs.rmSync(path.resolve(__dirname, '../packages/avplayer/dist'), { recursive: true, force: true })
  process.env.NODE_ENV = 'production'

  printTaskLog(1, 'AVPlayer', 'START', 'built umd AVPlayer starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'release=1', `dist=${path.resolve(__dirname, '../packages/avplayer/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayer', 'SUCCESS', 'built umd AVPlayer completed')

  printTaskLog(1, 'AVPlayer', 'START', 'built esm AVPlayer starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../packages/avplayer/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayer', 'SUCCESS', 'built esm AVPlayer completed')

  printTaskLog(1, 'AVPlayer', 'START', 'built AVPlayer.d.ts starting')
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../packages/avplayer/tsconfig.d.json'))
  await compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (/dist\/types\/avplayer\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/avplayer\/?/, 'dist/types/')
      data = formatDeclarationFileImport(data)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
    }
  }, false)
  printTaskLog(1, 'AVPlayer', 'SUCCESS', 'built AVPlayer.d.ts completed')

  printTaskLog(0, 'AVPlayer', 'SUCCESS', 'built AVPlayer completed')
}

async function buildAvtranscoder() {
  printTaskLog(0, 'AVTranscoder', 'START', 'starting built AVTranscoder')
  fs.rmSync(path.resolve(__dirname, '../packages/avtranscoder/dist'), { recursive: true, force: true })
  printTaskLog(1, 'AVTranscoder', 'START', 'built umd AVTranscoder starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avtranscoder=1', 'release=1', `dist=${path.resolve(__dirname, '../packages/avtranscoder/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', 'built umd AVTranscoder completed')

  printTaskLog(1, 'AVTranscoder', 'START', 'built esm AVTranscoder starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avtranscoder=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../packages/avtranscoder/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', 'built esm AVTranscoder completed')

  printTaskLog(1, 'AVTranscoder', 'START', 'built AVTranscoder.d.ts starting')
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../packages/avtranscoder/tsconfig.d.json'))
  await compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (/dist\/types\/avtranscoder\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/avtranscoder\/?/, 'dist/types/')
      data = formatDeclarationFileImport(data)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
    }
  }, false)
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', 'built AVTranscoder.d.ts completed')

  printTaskLog(0, 'AVTranscoder', 'SUCCESS', 'built AVTranscoder completed')
}

async function buildAvplayerUI() {
  printTaskLog(0, 'AVPlayerUI', 'START', 'starting built AVPlayerUI')
  fs.rmSync(path.resolve(__dirname, '../packages/ui/avplayer/dist'), { recursive: true, force: true })

  printTaskLog(1, 'AVPlayerUI', 'START', 'built umd AVPlayerUI starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'ui=1', 'release=1', `dist=${path.resolve(__dirname, '../packages/ui/avplayer/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', 'built umd AVPlayerUI completed')

  printTaskLog(1, 'AVPlayerUI', 'START', 'built esm AVPlayerUI starting')
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'ui=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../packages/ui/avplayer/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', 'built esm AVPlayerUI completed')

  printTaskLog(1, 'AVPlayerUI', 'START', 'built AVPlayerUI.d.ts starting')
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../packages/ui/avplayer/tsconfig.d.json'))
  await compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName)
    if (/dist\/types\/ui\/avplayer\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/ui\/avplayer\/?/, 'dist/types/')
      data = formatDeclarationFileImport(data)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data)
    }
  }, false)
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', 'built AVPlayerUI.d.ts completed')

  printTaskLog(0, 'AVPlayerUI', 'SUCCESS', 'built AVPlayerUI completed')
}

function buildAll() {
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=cheap'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=common'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=audioresample'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=audiostretchpitch'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=videoscale'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avutil'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avcodec'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avfilter'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avformat'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avnetwork'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avpipeline'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avplayer'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avprotocol'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avrender'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avtranscoder'], {
    stdio: 'inherit'
  })
  spawnSync('npx', ['tsx', `${path.resolve(__dirname, '../')}/scripts/build-package.ts`, '--package=avplayer_ui'], {
    stdio: 'inherit'
  })
}

switch (argv.package) {
  case 'cheap':
    buildCheap()
    break
  case 'common':
    buildCommon()
    break
  case 'audioresample':
    buildAudioresample()
    break
  case 'audiostretchpitch':
    buildAudiostretchpitch()
    break
  case 'videoscale':
    buildVideoscale()
    break
  case 'avutil':
    buildAvutil()
    break
  case 'avcodec':
    buildAvcodec()
    break
  case 'avfilter':
    buildAvfilter()
    break
  case 'avformat':
    buildAvformat()
    break
  case 'avnetwork':
    buildAvnetwork()
    break
  case 'avpipeline':
    buildAvpipeline()
    break
  case 'avplayer':
    buildAvplayer()
    break
  case 'avprotocol':
    buildAvprotocol()
    break
  case 'avrender':
    buildAvrender()
    break
  case 'avtranscoder':
    buildAvtranscoder()
    break
  case 'avplayer_ui':
    buildAvplayerUI()
    break
  case 'all':
    buildAll()
    break
}
