import { test } from '../helpers/test.mjs'

test('active async operation', { timeout: 30 }, async (context) => {
  const handle = setInterval(() => {}, 10)
  context.after(() => clearInterval(handle))
  await new Promise(() => {})
})
