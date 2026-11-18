import { test as nodeTest } from 'node:test'

// Bound each case even when it waits for a Promise with no active event-loop handles.
export function test(name, options, fn) {
  if (typeof options === 'function') {
    fn = options
    options = {}
  }
  return nodeTest(name, { timeout: 10000, ...options }, fn)
}
