// SPDX-License-Identifier: LGPL-3.0-or-later

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, '.npm-release')
const stage = join(output, 'libmedia')
const bundle = join(root, 'dist/avplayer-single')
let preparing = false

function npm(args, stdio = 'inherit') {
  const command = process.env.npm_execpath ? process.execPath : 'npm'
  const arguments_ = process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args
  return execFileSync(command, arguments_, { cwd: root, stdio, encoding: 'utf8' })
}

function main() {
  const { values } = parseArgs({ options: {
    version: { type: 'string' },
    registry: { type: 'string' },
    help: { type: 'boolean' }
  } })
  if (values.help) {
    console.log('npm run pack:avplayer -- [--version=1.3.4] [--registry=https://registry.npmjs.org/]')
    return
  }

  const config = JSON.parse(readFileSync(join(root, 'npm-release.config.json'), 'utf8'))
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const version = values.version ?? config.version
  const registry = values.registry ?? config.registry
  assert(typeof config.name === 'string' && config.name.length <= 214
    && /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(config.name), '包名需要使用 @用户名/包名 格式')
  const numeric = '(?:0|[1-9][0-9]*)'
  const identifier = '(?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)'
  const semver = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?$`)
  assert(typeof version === 'string' && semver.test(version), '版本号使用 x.y.z 或 x.y.z-beta.1 格式')
  assert(typeof registry === 'string' && ['https:', 'http:'].includes(new URL(registry).protocol), 'registry 需要使用 HTTP 或 HTTPS 地址')
  assert(typeof config.repository === 'string' && new URL(config.repository).protocol === 'https:', 'repository 需要使用 HTTPS 地址')

  // Remove previous output so a failed build cannot leave a publishable stale directory.
  preparing = true
  rmSync(stage, { recursive: true, force: true })
  rmSync(bundle, { recursive: true, force: true })
  npm(['run', 'build:avplayer:single'])

  mkdirSync(stage, { recursive: true })
  const files = ['avplayer.js', 'COPYING.LGPLv3', 'THIRD_PARTY_NOTICES.txt']
  copyFileSync(join(bundle, 'avplayer.js'), join(stage, 'avplayer.js'))
  copyFileSync(join(root, 'COPYING.LGPLv3'), join(stage, 'COPYING.LGPLv3'))
  const wasmFiles = []
  for (const directory of ['decode', 'resample', 'stretchpitch']) {
    const sourceDirectory = join(root, 'dist', directory)
    const resources = readdirSync(sourceDirectory).filter((name) => name.endsWith('.wasm')).sort()
    assert(resources.length > 0, `Wasm 资源目录为空：${sourceDirectory}`)
    mkdirSync(join(stage, 'wasm', directory), { recursive: true })
    for (const name of resources) {
      const resource = join(sourceDirectory, name)
      assert(readFileSync(resource).subarray(0, 8).equals(Buffer.from('0061736d01000000', 'hex')), `无效的 Wasm 文件头：${resource}`)
      const target = `wasm/${directory}/${name}`
      copyFileSync(resource, join(stage, target))
      wasmFiles.push(target)
    }
  }
  if (existsSync(join(bundle, 'avplayer.js.LICENSE.txt'))) {
    files.push('avplayer.js.LICENSE.txt')
    copyFileSync(join(bundle, 'avplayer.js.LICENSE.txt'), join(stage, 'avplayer.js.LICENSE.txt'))
  }
  const notices = ['packages/common', 'packages/cheap', 'node_modules/assjs', 'node_modules/ass-compiler', 'node_modules/@babel/runtime']
    .map((directory) => `${directory}\n\n${readFileSync(join(root, directory, 'LICENSE'), 'utf8')}`)
  writeFileSync(join(stage, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n\n-----\n\n') + '\n')
  const manifest = {
    name: config.name,
    version,
    description: 'libmedia 单文件 ESM 播放器及配套 Wasm 资源',
    type: 'module',
    main: './avplayer.js',
    exports: { '.': './avplayer.js', './wasm/*': './wasm/*' },
    files: [...files, 'wasm'],
    author: source.author,
    license: source.license,
    repository: { type: 'git', url: `git+${config.repository}` },
    publishConfig: { access: 'public', registry, tag: version.includes('-') ? 'next' : 'latest' }
  }
  writeFileSync(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  writeFileSync(join(stage, 'README.md'), `# ${config.name}

基于 [libmedia](https://github.com/zhaohappy/libmedia) 的单文件 ESM 播放器，包含配套 Wasm 资源。

\`\`\`js
import AVPlayer from '${config.name}'

const player = new AVPlayer({
  container: document.getElementById('player'),
  wasmBaseUrl: '/libmedia-wasm'
})
\`\`\`

将 npm 包的 wasm 目录内容复制到应用的 public/libmedia-wasm 目录：

\`\`\`bash
mkdir -p public/libmedia-wasm
cp -R node_modules/${config.name}/wasm/. public/libmedia-wasm/
\`\`\`

包内包含 wasm/decode、wasm/resample、wasm/stretchpitch 的全部现有 .wasm 文件和构建变体。
也可设置 wasmBaseUrl 为 https://cdn.jsdelivr.net/npm/${config.name}@${version}/wasm，
或使用 getWasm 配置每个资源。请显式配置资源地址；省略时播放器仍使用上游默认地址。
浏览器按需加载 Wasm；安装 npm 包本身不会自动部署这些静态文件。
此包不含编码器、缩放器、UI、CommonJS 或 TypeScript 类型声明。

源码和构建说明：[项目仓库](${config.repository.replace(/\.git$/, '')})。
\n`)
  execFileSync(process.execPath, ['--check', join(stage, 'avplayer.js')], { stdio: 'inherit' })

  const [packed] = JSON.parse(npm(['pack', stage, '--json', '--ignore-scripts', '--offline', '--pack-destination', output], 'pipe'))
  assert.equal(packed.name, config.name)
  assert.equal(packed.version, version)
  assert.deepEqual(packed.files.map((file) => file.path).sort(), [...files, ...wasmFiles, 'package.json', 'README.md'].sort())
  console.log(`\n已打包并检查：${join(output, packed.filename)}`)
  console.log(`包含 ${wasmFiles.length} 个 Wasm 文件`)
  console.log('实际发布：npm publish .npm-release/libmedia')
}

try {
  main()
}
catch (error) {
  if (preparing) {
    rmSync(stage, { recursive: true, force: true })
  }
  console.error(error.message)
  process.exitCode = 1
}
