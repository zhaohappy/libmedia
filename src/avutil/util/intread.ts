

export function r8(p: pointer<void>) {
  return accessof(reinterpret_cast<pointer<uint8>>(p))
}

export function rl16(p: pointer<void>) {
  return (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) | r8(p)
}

export function rb16(p: pointer<void>) {
  return (r8(p) << 8) | r8(reinterpret_cast<pointer<uint8>>(p + 1))
}

export function rl24(p: pointer<void>) {
  return (r8(reinterpret_cast<pointer<uint8>>(p + 2)) << 16) | (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) + r8(p)
}

export function rb24(p: pointer<void>) {
  return (r8(p) << 16) | (r8(reinterpret_cast<pointer<uint8>>(p + 1)) << 8) | r8(reinterpret_cast<pointer<uint8>>(p + 2))
}

export function rl32(p: pointer<void>) {
  return (rl16(reinterpret_cast<pointer<uint8>>(p + 2)) << 16) | rl16(p)
}

export function rb32(p: pointer<void>) {
  return (rb16(p) << 16) | rb16(reinterpret_cast<pointer<uint8>>(p + 2))
}

export function rl64(p: pointer<void>) {
  return (BigInt(rl32(reinterpret_cast<pointer<uint8>>(p + 4))) << 32n) | BigInt(rl32(p))
}

export function rb64(p: pointer<void>) {
  return (BigInt(rb32(p)) << 32n) | BigInt(rb32(reinterpret_cast<pointer<uint8>>(p + 4)))
}