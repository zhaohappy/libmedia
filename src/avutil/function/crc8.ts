export default function crc8(data: Uint8Array, crc: number = 0x00) {
  const polynomial = 0x07

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]

    for (let j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ polynomial
      }
      else {
        crc <<= 1
      }
    }
  }

  return crc & 0xFF
}
