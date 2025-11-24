import type { ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function run(cmd: string, options: ExecSyncOptionsWithBufferEncoding = { stdio: 'inherit' }) {
  return execSync(cmd, options)
}

function checkPnpm() {
  try {
    execSync('pnpm --version', { encoding: 'utf-8' })
    return true
  }
  catch (error) {
    return false
  }
}

function getSubmodulePaths(): string[] {
  try {
    const output = execSync('git config --file .gitmodules --get-regexp path', {
      encoding: 'utf-8'
    })

    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(' ')[1])
  }
  catch {
    return []
  }
}

function isSubmoduleMissing(path: string): boolean {
  const full = join(process.cwd(), path)
  if (!existsSync(full)) {
    return true
  }

  // 目录为空 => 也是缺失
  const files = readdirSync(full)
  return files.length === 0
}

function checkSubmodule() {
  const submodules = getSubmodulePaths()
  if (submodules.length === 0) {
    console.log('[submodule-check] No submodules found.')
    return
  }

  let needUpdate = false

  for (const path of submodules) {
    const missing = isSubmoduleMissing(path)
    if (missing) {
      console.log(`[submodule-check] Missing or empty submodule: ${path}`)
      needUpdate = true
    }
  }

  if (needUpdate) {
    console.log('[submodule-check] Syncing git submodules...')
    run('git submodule update --init --recursive')
    console.log('[submodule-check] Submodules updated.')
  }
  else {
    console.log('[submodule-check] All submodules OK.')
  }
}

function checkCommon() {
  if (!existsSync(join(__dirname, '../packages/common/node_modules'))) {
    console.log('[common-check] install dep...')
    run('npm install --no-save', {
      stdio: 'inherit',
      cwd: join(__dirname, '../packages/common')
    })
    console.log('[common-check] install dep ok')
  }
}

function checkCheap() {
  if (!existsSync(join(__dirname, '../packages/cheap/node_modules'))) {
    console.log('[cheap-check] install dep...')
    if (checkPnpm()) {
      run('pnpm install', {
        stdio: 'inherit',
        cwd: join(__dirname, '../packages/cheap')
      })
    }
    else {
      run('npm install --no-save', {
        stdio: 'inherit',
        cwd: join(__dirname, '../packages/cheap')
      })
    }
    console.log('[cheap-check] install dep ok')
  }
}

function main() {
  checkSubmodule()
  checkCommon()
  checkCheap()
}

main()
