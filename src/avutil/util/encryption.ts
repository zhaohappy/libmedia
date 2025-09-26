/*
 * libmedia encryption util
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import type { Uint8ArrayInterface } from 'common/io/interface'
import type { EncryptionInfo, EncryptionInitInfo } from '../struct/encryption'
import BufferReader from 'common/io/BufferReader'
import BufferWriter from 'common/io/BufferWriter'

// The format of the AVEncryptionInfo side data:
// u32be scheme
// u32be crypt_byte_block
// u32be skip_byte_block
// u32be key_id_size
// u32be iv_size
// u32be subsample_count
// u8[key_id_size] key_id
// u8[iv_size] iv
// {
//   u32be bytes_of_clear_data
//   u32be bytes_of_protected_data
// }[subsample_count]

export function encryptionSideData2Info(buffer: Uint8ArrayInterface): EncryptionInfo {
  const bufferReader = new BufferReader(buffer, true)

  const scheme = bufferReader.readUint32()
  const cryptByteBlock = bufferReader.readUint32()
  const skipByteBlock = bufferReader.readUint32()
  const keyIdSize = bufferReader.readUint32()
  const ivSize = bufferReader.readUint32()
  const subsampleCount = bufferReader.readUint32()
  const info: EncryptionInfo = {
    scheme,
    cryptByteBlock,
    skipByteBlock,
    keyId: bufferReader.readBuffer(keyIdSize),
    iv: bufferReader.readBuffer(ivSize),
    subsamples: []
  }
  if (subsampleCount) {
    for (let i = 0; i < subsampleCount; i++) {
      info.subsamples.push({
        bytesOfClearData: bufferReader.readUint32(),
        bytesOfProtectedData: bufferReader.readUint32()
      })
    }
  }
  return info
}

export function encryptionInfo2SideData(info: EncryptionInfo): Uint8Array {
  const buffer = new Uint8Array(4 * 6 + info.keyId.length + info.iv.length + info.subsamples.length * 8)
  const writer = new BufferWriter(buffer, true)
  writer.writeUint32(info.scheme)
  writer.writeUint32(info.cryptByteBlock)
  writer.writeUint32(info.skipByteBlock)
  writer.writeUint32(info.keyId.length)
  writer.writeUint32(info.iv.length)
  writer.writeUint32(info.subsamples.length)
  writer.writeBuffer(info.keyId)
  writer.writeBuffer(info.iv)
  info.subsamples.forEach((item) => {
    writer.writeUint32(item.bytesOfClearData)
    writer.writeUint32(item.bytesOfProtectedData)
  })

  return buffer
}

// The format of the AVEncryptionInitInfo side data:
// u32be init_info_count
// {
//   u32be system_id_size
//   u32be num_key_ids
//   u32be key_id_size
//   u32be data_size
//   u8[system_id_size] system_id
//   u8[key_id_size][num_key_id] key_ids
//   u8[data_size] data
// }[init_info_count]

export function encryptionSideData2InitInfo(buffer: Uint8ArrayInterface): EncryptionInitInfo[] {
  const bufferReader = new BufferReader(buffer, true)

  const count = bufferReader.readUint32()

  const infos: EncryptionInitInfo[] = []
  for (let i = 0; i < count; i++) {
    const systemIdSize = bufferReader.readUint32()
    const numKeyIds = bufferReader.readUint32()
    const keyIdSize = bufferReader.readUint32()
    const dataSize = bufferReader.readUint32()
    const info: EncryptionInitInfo = {
      systemId: bufferReader.readBuffer(systemIdSize),
      keyIds: [],
      data: null
    }
    if (numKeyIds) {
      for (let i = 0; i < numKeyIds; i++) {
        info.keyIds.push(bufferReader.readBuffer(keyIdSize))
      }
    }
    info.data = bufferReader.readBuffer(dataSize)
    infos.push(info)
  }
  return infos
}

export function encryptionInitInfo2SideData(infos: EncryptionInitInfo[]): Uint8Array {
  let size = 4
  infos.forEach((info) => {
    size += 4 * 4 + info.systemId.length + info.keyIds.length * (info.keyIds.length ? info.keyIds[0].length : 0) + info.data.length
  })
  const buffer = new Uint8Array(size)
  const writer = new BufferWriter(buffer, true)
  writer.writeUint32(infos.length)
  infos.forEach((info) => {
    writer.writeUint32(info.systemId.length)
    writer.writeUint32(info.keyIds.length)
    writer.writeUint32(info.keyIds.length ? info.keyIds[0].length : 0)
    writer.writeUint32(info.data.length)
    writer.writeBuffer(info.systemId)
    info.keyIds.forEach((keyId) => {
      writer.writeBuffer(keyId)
    })
    writer.writeBuffer(info.data)
  })
  return buffer
}
