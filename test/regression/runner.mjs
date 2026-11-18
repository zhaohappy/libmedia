import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { runRegression } from '../../scripts/lib/regression.mjs'
import { test } from './helpers/test.mjs'

for (const [fixture, message] of [
  ['unresolved', /pending|cancelled|timed out/i],
  ['timeout', /timed out/i],
  ['blocked', /timed out/i]
]) {
  test(`runner rejects ${fixture} tests`, () => {
    const file = fileURLToPath(new URL(`fixtures/${fixture}.mjs`, import.meta.url))
    assert.throws(() => runRegression(file, { timeout: 1000, stdio: 'pipe' }), (error) => {
      if (fixture === 'blocked') {
        assert.equal(error.code, 'ETIMEDOUT')
        assert.equal(error.signal, 'SIGKILL')
      }
      else {
        assert.equal(error.status, 1)
        assert.match(String(error.stdout), message)
      }
      return true
    })
  })
}
