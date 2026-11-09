import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const directory = join(root, 'test/regression')
const available = readdirSync(directory).filter(name => name.endsWith('.mjs') || name.endsWith('.test.ts')).sort()
const requested = process.argv.slice(2)
const selected = requested.length ? requested : available
for (const name of selected) {
  if (!available.includes(name)) {
    throw new Error(`Unknown regression: ${name}`)
  }
  console.log(`Running ${name}`)
  const file = join(directory, name)
  const args = name.endsWith('.ts') ? ['--import', 'tsx', '--test', file] : [file]
  execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
}
console.log(`Completed ${selected.length} regression files.`)
