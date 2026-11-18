import { test } from '../helpers/test.mjs'

test('blocked event loop', () => {
  while (true) {
    // Deliberately block: only the parent test supervisor can enforce this deadline.
  }
})
