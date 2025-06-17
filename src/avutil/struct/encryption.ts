/*
 * libmedia EncryptionInfo defined
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

@struct
export class AVSubsampleEncryptionInfo {
  /**
   * The number of bytes that are clear.
   */
  bytesOfClearData: uint32
  /**
   * The number of bytes that are protected.  If using pattern encryption,
   * the pattern applies to only the protected bytes; if not using pattern
   * encryption, all these bytes are encrypted.
   */
  bytesOfProtectedData: uint32
}

export interface EncryptionInfo {
  /**
   * The fourcc encryption scheme, in big-endian byte order.
   */
  scheme: uint32

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are encrypted.
   */
  cryptByteBlock: uint32

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are clear.
   */
  skipByteBlock: uint32

  /**
   * The ID of the key used to encrypt the packet.  This should always be
   * 16 bytes long, but may be changed in the future.
   */
  keyId: Uint8Array

  /**
   * The initialization vector.  This may have been zero-filled to be the
   * correct block size.  This should always be 16 bytes long, but may be
   * changed in the future.
   */
  iv: Uint8Array

  /**
   * An array of subsample encryption info specifying how parts of the sample
   * are encrypted.  If there are no subsamples, then the whole sample is
   * encrypted.
   */
  subsamples: AVSubsampleEncryptionInfo[]
}

@struct
export class AVEncryptionInfo {
  /**
   * The fourcc encryption scheme, in big-endian byte order.
   */
  scheme: uint32

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are encrypted.
   */
  cryptByteBlock: uint32

  /**
   * Only used for pattern encryption.  This is the number of 16-byte blocks
   * that are clear.
   */
  skipByteBlock: uint32

  /**
   * The ID of the key used to encrypt the packet.  This should always be
   * 16 bytes long, but may be changed in the future.
   */
  keyId: pointer<uint8>
  keyIdSize: uint32

  /**
   * The initialization vector.  This may have been zero-filled to be the
   * correct block size.  This should always be 16 bytes long, but may be
   * changed in the future.
   */
  iv: pointer<uint8>
  ivSize: uint32

  /**
   * An array of subsample encryption info specifying how parts of the sample
   * are encrypted.  If there are no subsamples, then the whole sample is
   * encrypted.
   */
  subsamples: pointer<AVSubsampleEncryptionInfo>
  subsampleCount: uint32
}

export interface EncryptionInitInfo {
  /**
    * A unique identifier for the key system this is for, can be NULL if it
    * is not known.  This should always be 16 bytes, but may change in the
    * future.
    */
  systemId: Uint8Array

  /**
   * An array of key IDs this initialization data is for.  All IDs are the
   * same length.  Can be NULL if there are no known key IDs.
   */
  keyIds: Uint8Array[]

  /**
   * Key-system specific initialization data.  This data is copied directly
   * from the file and the format depends on the specific key system.  This
   * can be NULL if there is no initialization data; in that case, there
   * will be at least one key ID.
   */
  data: Uint8Array
}

@struct
export class AVEncryptionInitInfo {
  /**
    * A unique identifier for the key system this is for, can be NULL if it
    * is not known.  This should always be 16 bytes, but may change in the
    * future.
    */
  systemId: pointer<uint8>
  systemIdSize: uint32

  /**
   * An array of key IDs this initialization data is for.  All IDs are the
   * same length.  Can be NULL if there are no known key IDs.
   */
  keyIds: pointer<pointer<uint8>>
  /** The number of key IDs. */
  numKeyIds: uint32
  /**
   * The number of bytes in each key ID.  This should always be 16, but may
   * change in the future.
   */
  keyIdSize: uint32

  /**
   * Key-system specific initialization data.  This data is copied directly
   * from the file and the format depends on the specific key system.  This
   * can be NULL if there is no initialization data; in that case, there
   * will be at least one key ID.
   */
  data: pointer<uint8>
  dataSize: uint32
  /**
   * An optional pointer to the next initialization info in the list.
   */
  next: pointer<AVEncryptionInitInfo>
}
