

export function w8(p: pointer<void>, value: number) {
  accessof(reinterpret_cast<pointer<uint8>>(p)) <- reinterpret_cast<uint8>(value & 0xff)
}

export function wl16(p: pointer<void>, value: uint16) {
  w8(p, value)
  w8(p + 1, value >> 8)
}

export function wb16(p: pointer<void>, value: uint16) {
  w8(p, value >> 8)
  w8(p + 1, value)
}

export function wl24(p: pointer<void>, value: uint32) {
  w8(p, value)
  w8(p + 1, value >> 8)
  w8(p + 2, value >> 16)
}

export function wb24(p: pointer<void>, value: uint32) {
  w8(p, value >> 16)
  w8(p + 1, value >> 8)
  w8(p + 2, value)
}

export function wl32(p: pointer<void>, value: uint32) {
  wl16(p, value & 0xffff)
  wl16(p + 2, value >> 16)
}

export function wb32(p: pointer<void>, value: uint32) {
  wb16(p, value >> 16)
  wb16(p + 2, value & 0xffff)
}

export function wl64(p: pointer<void>, value: uint64) {
  wl32(p, static_cast<uint32>(value & 0xffffffffn))
  wl32(p + 4, static_cast<uint32>(value >> 32n))
}

export function wb64(p: pointer<void>, value: uint64) {
  wb32(p, static_cast<uint32>(value >> 32n))
  wb32(p + 4, static_cast<uint32>(value & 0xffffffffn))
}