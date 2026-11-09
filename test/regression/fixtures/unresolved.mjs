import { test } from '../helpers/test.mjs'

test('unresolved async operation', { timeout: 30 }, () => new Promise(() => {}))
