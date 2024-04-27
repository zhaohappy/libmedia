import { mapUint8Array } from 'cheap/std/memory'

export function random(pointer: pointer<uint8>, size: size) {
  const buffer = mapUint8Array(pointer, size)
  if (defined(ENV_NODE)) {
    const crypto = require('crypto')
    crypto.randomFillSync(buffer)
  }
  else {
    crypto.getRandomValues(buffer)
  }
}