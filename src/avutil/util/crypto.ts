export function random(buffer: Uint8Array) {
  if (defined(ENV_NODE)) {
    const crypto = require('crypto')
    crypto.randomFillSync(buffer)
  }
  else {
    crypto.getRandomValues(buffer)
  }
}