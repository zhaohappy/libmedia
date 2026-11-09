import { runRegression } from './lib/regression.mjs'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const directory = join(root, 'test/regression')
const available = readdirSync(directory).filter((name) => name.endsWith('.mjs') || name.endsWith('.test.ts')).sort()
const requested = process.argv.slice(2)
const selected = requested.length ? requested : available
for (const name of selected) {
  if (!available.includes(name)) {
    throw new Error(`Unknown regression: ${name}`)
  }
  console.log(`Running ${name}`)
  const file = join(directory, name)
  runRegression(file, { cwd: root })
}
console.log(`Completed ${selected.length} regression files.`)
