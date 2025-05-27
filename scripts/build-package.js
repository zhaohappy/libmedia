const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const transformer = require('../src/cheap/build/transformer');
const argv = require('yargs').argv;
const { spawnSync, execSync } = require('child_process');
const terser = require('terser');

const rootPath = path.resolve(__dirname, '../src')

const files = {
  audioresample: path.resolve(__dirname, '../src/audioresample/package.json'),
  audiostretchpitch: path.resolve(__dirname, '../src/audiostretchpitch/package.json'),
  avcodec: path.resolve(__dirname, '../src/avcodec/package.json'),
  avfilter: path.resolve(__dirname, '../src/avfilter/package.json'),
  avformat: path.resolve(__dirname, '../src/avformat/package.json'),
  avnetwork: path.resolve(__dirname, '../src/avnetwork/package.json'),
  avpipeline: path.resolve(__dirname, '../src/avpipeline/package.json'),
  avprotocol: path.resolve(__dirname, '../src/avprotocol/package.json'),
  avrender: path.resolve(__dirname, '../src/avrender/package.json'),
  avutil: path.resolve(__dirname, '../src/avutil/package.json'),
  cheap: path.resolve(__dirname, '../src/cheap/package.json'),
  common: path.resolve(__dirname, '../src/common/package.json'),
  videoscale: path.resolve(__dirname, '../src/videoscale/package.json')
}

const packages = {
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
  videoscale: JSON.parse(fs.readFileSync(files['videoscale'], 'utf8')),
}

function copyFolder(src, dest) {
  // 确保目标文件夹存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // 读取源文件夹内容
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 如果是文件夹，递归复制
      copyFolderSync(srcPath, destPath);
    }
    else {
      // 如果是文件，直接复制
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function reportTSError(
  file,
  node,
  message,
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

function replacePath(importPath, file, node) {
  let path = importPath
  path = path.replace(/^(\.\.\/)*cheap\//, '@libmedia/cheap/')
  path = path.replace(/^(\.\.\/)*common\//, '@libmedia/common/')

  path = path.replace(/^(\.\.\/)*avcodec\//, '@libmedia/avcodec/')
  path = path.replace(/^(\.\.\/)*avformat\//, '@libmedia/avformat/')
  path = path.replace(/^(\.\.\/)*avnetwork\//, '@libmedia/avnetwork/')
  path = path.replace(/^(\.\.\/)*avplayer\//, '@libmedia/avplayer/')
  path = path.replace(/^(\.\.\/)*avprotocol\//, '@libmedia/avprotocol/')
  path = path.replace(/^(\.\.\/)*audiostretchpitch\//, '@libmedia/audiostretchpitch/')
  path = path.replace(/^(\.\.\/)*audioresample\//, '@libmedia/audioresample/')
  path = path.replace(/^(\.\.\/)*avpipeline\//, '@libmedia/avpipeline/')
  path = path.replace(/^(\.\.\/)*avtranscode\//, '@libmedia/avtranscode/')
  path = path.replace(/^(\.\.\/)*avutil\//, '@libmedia/avutil/')
  path = path.replace(/^(\.\.\/)*videoscale\//, '@libmedia/videoscale/')
  path = path.replace(/^(\.\.\/)*avfilter\//, '@libmedia/avfilter/')
  path = path.replace(/^(\.\.\/)*avrender\//, '@libmedia/avrender/')
  path = path.replace(/^(\.\.\/)*avplayer\/AVPlayer/, '@libmedia/avplayer')
  path = path.replace(/^(\.\.\/)*avtranscoder\/AVTranscoder/, '@libmedia/avtranscoder')
  path = path.replace(/^@libmedia\/avplayer\/AVPlayer/, '@libmedia/avplayer')
  path = path.replace(/^@libmedia\/avtranscoder\/AVTranscoder/, '@libmedia/avtranscoder')

  if (file && path !== importPath) {
    const fileName = file.fileName.replace(rootPath + '/', '')
    const packageDir = fileName.split('/')[0]
    const packageName = path.split('/')[1]
    if (packageDir === packageName) {
      reportTSError(file, node, 'import module under the same package name using relative path')
    }
    else if (packages[packageName]) {
      const json = packages[packageName]
      if (!json.exports) {
        reportTSError(file, node, 'import module not export in package.json')
      }
      else {
        const module = path.replace(`@libmedia/${packageName}`, '.')
        if (!json.exports[module]) {
          reportTSError(file, node, `import module(${module}) not export in ${packageName}'s package.json`)
        }
      }
    }
  }

  return path
}

// 打印任务日志，支持缩进
function printTaskLog(taskLevel, taskId, status, message = '') {
  const indent = ' '.repeat(taskLevel * 2);
  console.log(`${indent}Task ${taskId}: ${status} ${message}`);
}

function packageMapTransformer() {
  return (context) => {
    return (sourceFile) => {
      function visitor(node) {
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
            context.factory.createToken(ts.SyntaxKind.ImportKeyword),
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
        return ts.visitEachChild(node, visitor, context);
      }
      return ts.visitNode(sourceFile, visitor);
    };
  };
}

function getVersion() {
  try {
    return execSync('git describe --tags').toString().trim();
  }
  catch (error) {
    return 'n0.0.1';
  }
}

function compile(fileNames, options, writeCallback, cjs = false, defined = {}) {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit(undefined, writeCallback, undefined, undefined, {
    before: [
      packageMapTransformer(),
      transformer.before(program, {
        tmpPath: path.join(__dirname, '../dist'),
        cheapPacketName: '@libmedia/cheap',
        defined: Object.assign({
          ENV_NODE: cjs,
          ENV_WEBPACK: false,
          DEBUG: false,
          ENABLE_LOG_TRACE: false,
          ENABLE_THREADS: true,
          ENABLE_THREADS_SPLIT: false,
          BIGINT_LITERAL: false,
          CHEAP_HEAP_INITIAL: 265,
          ENABLE_SYNCHRONIZE_API: false,
          ENABLE_PROTOCOL_HLS: true,
          ENABLE_PROTOCOL_DASH: true,
          ENABLE_PROTOCOL_RTSP: true,
          ENABLE_PROTOCOL_RTMP: true,
          ENABLE_DEMUXER_MPEGTS: true,
          ENABLE_DEMUXER_MPEGPS: true,
          ENABLE_DEMUXER_MP4: true,
          ENABLE_DEMUXER_FLV: true,
          ENABLE_DEMUXER_IVF: true,
          ENABLE_DEMUXER_OGG: true,
          ENABLE_DEMUXER_MP3: true,
          ENABLE_DEMUXER_MATROSKA: true,
          ENABLE_DEMUXER_AAC: true,
          ENABLE_DEMUXER_FLAC: true,
          ENABLE_DEMUXER_WAV: true,
          ENABLE_DEMUXER_WEBVTT: true,
          ENABLE_DEMUXER_SUBRIP: true,
          ENABLE_DEMUXER_ASS: true,
          ENABLE_DEMUXER_TTML: true,
          ENABLE_DEMUXER_H264: true,
          ENABLE_DEMUXER_HEVC: true,
          ENABLE_DEMUXER_VVC: true,
          ENABLE_MUXER_FLV: true,
          ENABLE_MUXER_MP4: true,
          ENABLE_MUXER_MP3: true,
          ENABLE_MUXER_MATROSKA: true,
          ENABLE_MUXER_IVF: true,
          ENABLE_MUXER_MPEGTS: true,
          ENABLE_MUXER_OGG: true,
          ENABLE_MSE: true,
          ENABLE_WORKER_PROXY: true,
          ENABLE_WEBGPU: true,
          ENABLE_RENDER_16: true,
          ENABLE_SUBTITLE_RENDER: true,
          ENABLE_LOG_PATH: true,
          API_FRAME_KEY: true,
          API_INTERLACED_FRAME: true,
          API_PALETTE_HAS_CHANGED: true,
          API_FRAME_PKT: true,
          VERSION: getVersion()
        }, defined),
        importPath: (p) => {
          return replacePath(p)
        }
      })
    ],
    afterDeclarations: [
      packageMapTransformer(),
      transformer.afterDeclarations(program, {
      })
    ]
  });

  // 打印错误
  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } =
        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    }
  });
}

function parseCommandLine(configPath) {
  const configText = fs.readFileSync(configPath, 'utf8');
  const { config } = ts.parseConfigFileTextToJson(configPath, configText);
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    path.dirname(configPath)
  );
  return parsedCommandLine
}

function addPackageExport(p, extra = {}) {
  if (!argv.export) {
    return
  }
  let parsedCommandLine = parseCommandLine(path.resolve(p, 'tsconfig.esm.json'))

  const json = fs.readFileSync(path.resolve(p, './package.json'), 'utf8');
  const config = JSON.parse(json);

  const exports = {}

  parsedCommandLine.fileNames.forEach((name) => {

    if (/__test__/.test(name)
      || /\.test\.ts$/.test(name)
      || /\.d\.ts$/.test(name)
    ) {
      return
    }

    const relativePath = path.relative(p, name)
    if (!relativePath.startsWith('..')) {

      let fileName = relativePath.split('.')
      fileName.pop()
      fileName = fileName.join('.')

      exports['./' + fileName] = {
        "import": './' + path.join('dist/esm', fileName + '.js'),
        "require": './' + path.join('dist/cjs', fileName + '.js'),
        "types": './' + path.join('dist/esm', fileName + '.d.ts')
      }
    }
  })

  Object.assign(exports, extra)

  config.exports = exports
  fs.writeFileSync(path.resolve(p, './package.json'), JSON.stringify(config, null, 2), 'utf8');
}

function buildASM(file, to, sourcePath, cjs) {

  const os = require('os');

  const input = '__cheap__transformer_tmp.wat'
  const output = '__cheap__transformer_tmp.wasm'

  let wat2wasmPath = path.resolve(__dirname, '../src/cheap/build/asm/ubuntu') + '/wat2wasm';
  if (os.platform() === 'win32') {
    wat2wasmPath = path.resolve(__dirname, '../src/cheap/build/asm/win') + '/wat2wasm.exe';
  }
  else if (os.platform() === 'darwin') {
    wat2wasmPath = path.resolve(__dirname, '../src/cheap/build/asm/macos') + '/wat2wasm';
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
  let dir = path.dirname(to);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(to, cjs ? `
    module.exports = '${buffer.toString('base64')}';
  `
  :`
    export default '${buffer.toString('base64')}';
  `, 'utf8');

  // const map = {
  //   "version": 3,
  //   "sources": [sourcePath + path.basename(file)],
  //   "names": [],
  //   "mappings": "",
  //   "sourcesContent": [
  //     content
  //   ]
  // }
  // fs.writeFileSync(to + '.map', JSON.stringify(map))
}

function buildGlsl(file, to, sourcePath, cjs) {
  const html2js = require('html2js'); 
  const source = fs.readFileSync(file, 'utf8')
  let code = html2js(
    source
  );
  let dir = path.dirname(to);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(to, cjs ? `
      module.exports = ${code};
    `
    : `
    export default ${code};
  `, 'utf8');

  // const map = {
  //   "version": 3,
  //   "sources": [sourcePath + path.basename(file)],
  //   "names": [],
  //   "mappings": "",
  //   "sourcesContent": [
  //     source
  //   ]
  // }
  // fs.writeFileSync(to + '.map', JSON.stringify(map))
}

function buildWgsl(file, to, sourcePath, cjs) {
  const html2js = require('html2js');
  const source = fs.readFileSync(file, 'utf8')
  let code = html2js(
    source
  );
  let dir = path.dirname(to);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(to, cjs ? `
    module.exports = ${code};
    `
    :`
    export default ${code};
  `, 'utf8');

  // const map = {
  //   "version": 3,
  //   "sources": [sourcePath + path.basename(file)],
  //   "names": [],
  //   "mappings": "",
  //   "sourcesContent": [
  //     source
  //   ]
  // }
  // fs.writeFileSync(to + '.map', JSON.stringify(map))
}

function generateEnum(fileName) {
  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../tsconfig.json`))
  printTaskLog(1, 'enum', 'START', `starting generate enum`);
  const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);

  let source = ''

  const typeChecker = program.getTypeChecker()
  program.emit(undefined, () => {}, undefined, undefined, {
    before: [
      function (context) {
        return (sourceFile) => {
          if (/avutil\/enum\.ts$/.test(sourceFile.fileName)) {
            function visitor(node) {
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
              return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(sourceFile, visitor);
          }
          return sourceFile
        }
      }
    ]
  });
  fs.writeFileSync(path.resolve(__dirname, `../src/avutil/${fileName}.ts`), source)
}

function buildPackage(packageName, taskLevel = 1, fileNamesFilter) {

  if (!fileNamesFilter) {
    fileNamesFilter = (name) => {
      return !/avutil\/enum\.ts$/.test(name)
    }
  }

  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../src/${packageName}/tsconfig.esm.json`))

  const esmReg = new RegExp(`dist\/esm\/${packageName}\/?`)
  const cjsReg = new RegExp(`dist\/cjs\/${packageName}\/?`)

  printTaskLog(taskLevel, packageName, 'START', `starting built ${packageName} esm package`);

  compile(fileNamesFilter ? parsedCommandLine.fileNames.filter(fileNamesFilter) : parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName);
    if (esmReg.test(dir)) {
      dir = dir.replace(esmReg, 'dist/esm/')
      fs.mkdirSync(dir, { recursive: true });
      if (/\.js$/.test(fileName)) {
        terser.minify(data, {
          compress: {
            unused: true,
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
          fs.writeFileSync(path.resolve(dir, path.basename(fileName)), result.code);
          fs.writeFileSync(path.resolve(dir, path.basename(fileName) + '.map'), result.map);
        })
      }
      else {
        if (/\.map$/.test(fileName)) {
          const json = JSON.parse(data)
          json.sources[0] = json.sources[0].replace(/^(\.\.\/)/, '')
          data = JSON.stringify(json)
        }
        fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data);
      }
    }
  });

  printTaskLog(taskLevel, packageName, 'SUCCESS', `built ${packageName} esm package completed`);

  printTaskLog(taskLevel, packageName, 'START', `starting built ${packageName} cjs package`);

  parsedCommandLine = parseCommandLine(path.resolve(__dirname, `../src/${packageName}/tsconfig.cjs.json`))
  compile(fileNamesFilter ? parsedCommandLine.fileNames.filter(fileNamesFilter) : parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName);
    if (cjsReg.test(dir)) {
      dir = dir.replace(cjsReg, 'dist/cjs/')
      fs.mkdirSync(dir, { recursive: true });
      if (/\.js$/.test(fileName)) {
        terser.minify(data, {
          compress: {
            unused: true,
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
          fs.writeFileSync(path.resolve(dir, path.basename(fileName)), result.code);
          fs.writeFileSync(path.resolve(dir, path.basename(fileName) + '.map'), result.map);
        })
      }
      else {
        if (/\.map$/.test(fileName)) {
          const json = JSON.parse(data)
          json.sources[0] = json.sources[0].replace(/^(\.\.\/)/, '')
          data = JSON.stringify(json)
        }
        fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data);
      }
    }
  }, true);

  printTaskLog(taskLevel, packageName, 'SUCCESS', `built ${packageName} cjs package completed`);
}

function buildCommon() {
  printTaskLog(0, 'common', 'START', `starting built common`);

  printTaskLog(1, 'common', 'START', `starting built common esm package`);
  let parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../src/common/tsconfig.esm.json'))
  compile(parsedCommandLine.fileNames, parsedCommandLine.options);
  printTaskLog(1, 'common', 'SUCCESS', `built common esm package completed`);

  printTaskLog(1, 'common', 'START', `starting built common cjs package`);
  parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../src/common/tsconfig.cjs.json'))
  compile(parsedCommandLine.fileNames, parsedCommandLine.options, undefined, true);
  printTaskLog(1, 'common', 'SUCCESS', `built common cjs package completed`);

  addPackageExport(path.resolve(__dirname, '../src/common/'))

  printTaskLog(0, 'common', 'SUCCESS', `built common completed`);
}

function buildCheap() {
  printTaskLog(0, 'cheap', 'START', `starting built cheap`);

  printTaskLog(1, 'cheap', 'START', `starting built cheap polyfill`);
  spawnSync('npm', ['run', 'build-cheap-polyfill'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'cheap', 'SUCCESS', `built cheap polyfill completed`);

  printTaskLog(1, 'cheap', 'START', `starting built cheap webassembly runner`);
  spawnSync('npm', ['run', 'build-webassembly-runner'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'cheap', 'SUCCESS', `built cheap webassembly runner completed`);

  fs.mkdirSync(path.resolve(__dirname, '../src/cheap/dist/esm/webassembly'), { recursive: true });
  fs.mkdirSync(path.resolve(__dirname, '../src/cheap/dist/cjs/webassembly'), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '../dist/cheap-polyfill.js'), path.resolve(__dirname, '../src/cheap/dist/cheap-polyfill.js'));
  fs.copyFileSync(path.resolve(__dirname, '../src/cheap/webassembly/WebAssemblyRunnerWorker.js'), path.resolve(__dirname, '../src/cheap/dist/esm/webassembly/WebAssemblyRunnerWorker.js'));
  fs.copyFileSync(path.resolve(__dirname, '../src/cheap/webassembly/WebAssemblyRunnerWorker.js'), path.resolve(__dirname, '../src/cheap/dist/cjs/webassembly/WebAssemblyRunnerWorker.js'));
  
  printTaskLog(1, 'cheap', 'SUCCESS', `copy cheap-polyfill.js WebAssemblyRunnerWorker.js completed`);

  buildPackage('cheap')

  addPackageExport(path.resolve(__dirname, '../src/cheap/'), {
    "./build/webpack/CheapPlugin": "./build/webpack/plugin/CheapPlugin.js",
    "./build/transformer": "./build/transformer.js",
    "./build/wasm-opt": "./build/wasm-opt.js"
  })

  printTaskLog(0, 'cheap', 'SUCCESS', `built cheap completed`);
}

function buildAudioresample() {
  printTaskLog(0, 'audioresample', 'START', `starting built audioresample`);

  buildPackage('audioresample')
  addPackageExport(path.resolve(__dirname, '../src/audioresample/'))

  printTaskLog(0, 'audioresample', 'SUCCESS', `built audioresample completed`);
}

function buildAudiostretchpitch() {
  printTaskLog(0, 'audiostretchpitch', 'START', `starting built audiostretchpitch`);
  buildPackage('audiostretchpitch')
  addPackageExport(path.resolve(__dirname, '../src/audiostretchpitch/'))
  printTaskLog(0, 'audiostretchpitch', 'SUCCESS', `built audiostretchpitch completed`);
}

function buildVideoscale() {
  printTaskLog(0, 'videoscale', 'START', `starting built videoscale`);
  buildPackage('videoscale')
  addPackageExport(path.resolve(__dirname, '../src/videoscale/'))
  printTaskLog(0, 'videoscale', 'SUCCESS', `built videoscale completed`);
}

function buildAvutil() {
  printTaskLog(0, 'avutil', 'START', `starting built avutil`);
  const enumFileName = '__enum__';

  generateEnum(enumFileName)
  buildPackage('avutil')

  process.on('exit', (code) => {
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/esm/${enumFileName}.js`), path.resolve(__dirname, `../src/avutil/dist/esm/enum.js`))
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/cjs/${enumFileName}.js`), path.resolve(__dirname, `../src/avutil/dist/cjs/enum.js`))
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/esm/${enumFileName}.js.map`), path.resolve(__dirname, `../src/avutil/dist/esm/enum.js.map`))
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/cjs/${enumFileName}.js.map`), path.resolve(__dirname, `../src/avutil/dist/cjs/enum.js.map`))
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/esm/${enumFileName}.d.ts`), path.resolve(__dirname, `../src/avutil/dist/esm/enum.d.ts`))
    fs.renameSync(path.resolve(__dirname, `../src/avutil/dist/cjs/${enumFileName}.d.ts`), path.resolve(__dirname, `../src/avutil/dist/cjs/enum.d.ts`))
  });

  fs.unlinkSync(path.resolve(__dirname, `../src/avutil/${enumFileName}.ts`))

  addPackageExport(path.resolve(__dirname, '../src/avutil/'))
  printTaskLog(0, 'avutil', 'SUCCESS', `built avutil completed`);
}

function buildAvcodec() {
  printTaskLog(0, 'avcodec', 'START', `starting built avcodec`);
  buildPackage('avcodec')
  addPackageExport(path.resolve(__dirname, '../src/avcodec/'))
  printTaskLog(0, 'avcodec', 'SUCCESS', `built avcodec completed`);
}

function buildAvfilter() {
  printTaskLog(0, 'avfilter', 'START', `starting built avfilter`);
  buildPackage('avfilter')
  addPackageExport(path.resolve(__dirname, '../src/avfilter/'))
  printTaskLog(0, 'avfilter', 'SUCCESS', `built avfilter completed`);
}

function buildAvformat() {
  printTaskLog(0, 'avformat', 'START', `starting built avformat`);
  buildPackage('avformat')
  addPackageExport(path.resolve(__dirname, '../src/avformat/'))
  printTaskLog(0, 'avformat', 'SUCCESS', `built avformat completed`);
}

function buildAvnetwork() {
  printTaskLog(0, 'avnetwork', 'START', `starting built avnetwork`);
  buildPackage('avnetwork')
  addPackageExport(path.resolve(__dirname, '../src/avnetwork/'))
  printTaskLog(0, 'avnetwork', 'SUCCESS', `built avnetwork completed`);
}

function buildAvpipeline() {
  printTaskLog(0, 'avpipeline', 'START', `starting built avpipeline`);
  buildPackage('avpipeline')
  addPackageExport(path.resolve(__dirname, '../src/avpipeline/'))
  printTaskLog(0, 'avpipeline', 'SUCCESS', `built avpipeline completed`);
}

function buildAvprotocol() {
  printTaskLog(0, 'avprotocol', 'START', `starting built avprotocol`);
  buildPackage('avprotocol')
  addPackageExport(path.resolve(__dirname, '../src/avprotocol/'))
  printTaskLog(0, 'avprotocol', 'SUCCESS', `built avprotocol completed`);
}

function buildAvrender() {
  printTaskLog(0, 'avrender', 'START', `starting built avrender`);

  printTaskLog(1, 'avrender', 'START', `starting built pcm worklet processor`);
  spawnSync('npm', ['run', 'build-pcm-worklet-processor'], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'avrender', 'SUCCESS', `built pcm worklet processor completed`);

  fs.mkdirSync(path.resolve(__dirname, '../src/avrender/dist'), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '../dist/AudioSourceWorkletProcessor.js'), path.resolve(__dirname, '../src/avrender/dist/AudioSourceWorkletProcessorWorklet.js'));
  fs.copyFileSync(path.resolve(__dirname, '../dist/AudioSourceWorkletProcessor2.js'), path.resolve(__dirname, '../src/avrender/dist/AudioSourceWorkletProcessor2Worklet.js'));

  printTaskLog(1, 'avrender', 'SUCCESS', `copy AudioSourceWorkletProcessor AudioSourceWorkletProcessor2 completed`);

  buildPackage('avrender')

  buildGlsl(path.resolve(__dirname, '../src/avrender/image/webgl/glsl/vertex.vert'), path.resolve(__dirname, '../src/avrender/dist/esm/image/webgl/glsl/vertex.vert.js'), '../../../../../image/webgl/glsl/')
  buildGlsl(path.resolve(__dirname, '../src/avrender/image/webgl/glsl/vertex.vert'), path.resolve(__dirname, '../src/avrender/dist/cjs/image/webgl/glsl/vertex.vert.js'), '../../../../../image/webgl/glsl/', true)

  printTaskLog(1, 'avrender', 'SUCCESS', `built glsl completed`);

  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/vertex.wgsl'), path.resolve(__dirname, '../src/avrender/dist/esm/image/webgpu/wgsl/vertex.wgsl.js'), '../../../../../image/webgpu/wgsl/')
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/vertex.wgsl'), path.resolve(__dirname, '../src/avrender/dist/cjs/image/webgpu/wgsl/vertex.wgsl.js'), '../../../../../image/webgpu/wgsl/', true)
  
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/compute/uint2FloatBE.wgsl'), path.resolve(__dirname, '../src/avrender/dist/esm/image/webgpu/wgsl/compute/uint2FloatBE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/')
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/compute/uint2FloatBE.wgsl'), path.resolve(__dirname, '../src/avrender/dist/cjs/image/webgpu/wgsl/compute/uint2FloatBE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/', true)
  
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/compute/uint2FloatLE.wgsl'), path.resolve(__dirname, '../src/avrender/dist/esm/image/webgpu/wgsl/compute/uint2FloatLE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/')
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/compute/uint2FloatLE.wgsl'), path.resolve(__dirname, '../src/avrender/dist/cjs/image/webgpu/wgsl/compute/uint2FloatLE.wgsl.js'), '../../../../../../image/webgpu/wgsl/compute/', true)
  
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/fragment/external.wgsl'), path.resolve(__dirname, '../src/avrender/dist/esm/image/webgpu/wgsl/fragment/external.wgsl.js'), '../../../../../image/webgpu/wgsl/fragment/')
  buildWgsl(path.resolve(__dirname, '../src/avrender/image/webgpu/wgsl/fragment/external.wgsl'), path.resolve(__dirname, '../src/avrender/dist/cjs/image/webgpu/wgsl/fragment/external.wgsl.js'), '../../../../../image/webgpu/wgsl/fragment/', true)

  printTaskLog(1, 'avrender', 'SUCCESS', `built wgsl completed`);

  addPackageExport(path.resolve(__dirname, '../src/avrender/'))
  printTaskLog(0, 'avrender', 'SUCCESS', `built avrender completed`);
}

function buildAvplayer() {
  printTaskLog(0, 'AVPlayer', 'START', `starting built AVPlayer`);

  process.env.NODE_ENV = 'production';

  printTaskLog(1, 'AVPlayer', 'START', `built umd AVPlayer starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'release=1', `dist=${path.resolve(__dirname, '../src/avplayer/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayer', 'SUCCESS', `built umd AVPlayer completed`);

  printTaskLog(1, 'AVPlayer', 'START', `built esm AVPlayer starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../src/avplayer/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayer', 'SUCCESS', `built esm AVPlayer completed`);

  printTaskLog(1, 'AVPlayer', 'START', `built AVPlayer.d.ts starting`);
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../src/avplayer/tsconfig.d.json'))
  compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName);
    if (/dist\/types\/avplayer\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/avplayer\/?/, 'dist/types/')
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data);
    }
  }, false);
  printTaskLog(1, 'AVPlayer', 'SUCCESS', `built AVPlayer.d.ts completed`);

  printTaskLog(0, 'AVPlayer', 'SUCCESS', `built AVPlayer completed`);
}

function buildAvtranscoder() {
  printTaskLog(0, 'AVTranscoder', 'START', `starting built AVTranscoder`);

  printTaskLog(1, 'AVTranscoder', 'START', `built umd AVTranscoder starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avtranscoder=1', 'release=1', `dist=${path.resolve(__dirname, '../src/avtranscoder/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', `built umd AVTranscoder completed`);

  printTaskLog(1, 'AVTranscoder', 'START', `built esm AVTranscoder starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avtranscoder=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../src/avtranscoder/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', `built esm AVTranscoder completed`);

  printTaskLog(1, 'AVTranscoder', 'START', `built AVTranscoder.d.ts starting`);
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../src/avtranscoder/tsconfig.d.json'))
  compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName);
    if (/dist\/types\/avtranscoder\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/avtranscoder\/?/, 'dist/types/')
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data);
    }
  }, false);
  printTaskLog(1, 'AVTranscoder', 'SUCCESS', `built AVTranscoder.d.ts completed`);

  printTaskLog(0, 'AVTranscoder', 'SUCCESS', `built AVTranscoder completed`);
}

function buildAvplayerUI() {
  printTaskLog(0, 'AVPlayerUI', 'START', `starting built AVPlayerUI`);

  printTaskLog(1, 'AVPlayerUI', 'START', `built umd AVPlayerUI starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'ui=1', 'release=1', `dist=${path.resolve(__dirname, '../src/ui/avplayer/dist/umd')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', `built umd AVPlayerUI completed`);

  printTaskLog(1, 'AVPlayerUI', 'START', `built esm AVPlayerUI starting`);
  spawnSync('node', [`${path.resolve(__dirname, '../')}/node_modules/webpack/bin/webpack.js`, '--progress', '--env', 'avplayer=1', 'ui=1', 'release=1', 'esm=1', `dist=${path.resolve(__dirname, '../src/ui/avplayer/dist/esm')}`], {
    stdio: 'ignore'
  })
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', `built esm AVPlayerUI completed`);

  printTaskLog(1, 'AVPlayerUI', 'START', `built AVPlayerUI.d.ts starting`);
  const parsedCommandLine = parseCommandLine(path.resolve(__dirname, '../src/ui/avplayer/tsconfig.d.json'))
  compile(parsedCommandLine.fileNames, parsedCommandLine.options, (fileName, data) => {
    let dir = path.dirname(fileName);
    if (/dist\/types\/ui\/avplayer\/?/.test(dir)) {
      dir = dir.replace(/dist\/types\/ui\/avplayer\/?/, 'dist/types/')
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.resolve(dir, path.basename(fileName)), data);
    }
  }, false);
  printTaskLog(1, 'AVPlayerUI', 'SUCCESS', `built AVPlayerUI.d.ts completed`);

  printTaskLog(0, 'AVPlayerUI', 'SUCCESS', `built AVPlayerUI completed`);
}

function buildAll() {
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=cheap'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=common'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=audioresample'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=audiostretchpitch'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=videoscale'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avutil'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avcodec'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avfilter'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avformat'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avnetwork'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avpipeline'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avplayer'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avprotocol'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avrender'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avtranscoder'], {
    stdio: 'inherit'
  })
  spawnSync('node', [`${path.resolve(__dirname, '../')}/scripts/build-package.js`, '--package=avplayer_ui'], {
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
