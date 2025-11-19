import type { ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function run(cmd: string, options: ExecSyncOptionsWithBufferEncoding = { stdio: 'inherit' }) {
  return execSync(cmd, options)
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

function main() {
  checkSubmodule()
}

main()
