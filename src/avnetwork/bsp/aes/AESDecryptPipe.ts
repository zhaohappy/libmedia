/*
 * libmedia AESDecryptPipe
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

import { Uint8ArrayInterface } from 'common/io/interface'
import AVBSPipe from '../AVBSPipe'
import AESSoftDecryptor from 'common/crypto/aes/AESSoftDecryptor'
import AESWebDecryptor from 'common/crypto/aes/AESWebDecryptor'
import Sleep from 'common/timer/Sleep'
import { IOError } from 'common/io/error'
import * as logger from 'common/util/logger'

const BLOCK_SIZE = 16
const REMAINING_LENGTH = BLOCK_SIZE * 2

let AESWebDecryptorSupport = true

const PaddingBlock = new Uint8Array(BLOCK_SIZE).fill(BLOCK_SIZE)

export default class AESDecryptPipe extends AVBSPipe {

  private buffer: Uint8Array

  private aesSoftDecryptor: AESSoftDecryptor
  private aesWebDecryptor: AESWebDecryptor
  private aesTargetDecryptor: AESSoftDecryptor | AESWebDecryptor

  private pointer: number
  private endPointer: number
  private size: number
  private ended: boolean

  private iv: ArrayBuffer
  private key: ArrayBuffer

  constructor(size: number = 1 * 1024 * 1024) {
    super()
    this.size = size
    this.pointer = 0
    this.endPointer = 0
    this.ended = false
    this.buffer = new Uint8Array(size)

    this.aesSoftDecryptor = new AESSoftDecryptor()
    if (AESWebDecryptor.isSupport() && AESWebDecryptorSupport) {
      this.aesWebDecryptor = new AESWebDecryptor()
    }
    this.aesTargetDecryptor = this.aesWebDecryptor || this.aesSoftDecryptor
  }

  public remainingLength() {
    return this.endPointer - this.pointer
  }

  public async expandKey(key: ArrayBuffer, iv: ArrayBuffer) {
    this.key = key
    this.iv = iv
    if (this.aesWebDecryptor) {
      await this.aesWebDecryptor.expandKey(key)
    }
    this.aesSoftDecryptor.expandKey(key)
  }

  private async flush_(buffer: Uint8Array) {
    while (true) {
      const len = await this.onFlush(buffer)
      if (len !== IOError.AGAIN) {
        return len
      }
      await new Sleep(0)
    }
  }

  private async flush() {
    if (this.size - this.remainingLength() <= 0) {
      return
    }

    if (this.pointer < this.endPointer) {
      if (this.pointer) {
        this.buffer.set(this.buffer.subarray(this.pointer, this.endPointer), 0)
        this.endPointer = this.endPointer - this.pointer
      }
    }
    else {
      this.endPointer = 0
    }

    this.pointer = 0

    const len = await this.flush_(this.buffer.subarray(this.endPointer))

    if (len < 0) {
      if (len === IOError.END) {
        this.ended = true
        return
      }
      else {
        logger.fatal(`AESPipe error, flush failed, ret: ${len}`)
      }
    }
    this.endPointer += len
  }

  private removePadding(array: Uint8Array): Uint8Array {
    const outputBytes = array.length
    const paddingBytes =
      outputBytes && new DataView(array.buffer).getUint8(outputBytes - 1)
    if (paddingBytes) {
      return array.subarray(0, outputBytes - paddingBytes)
    }
    return array
  }

  private async decrypt(length: number): Promise<Uint8Array> {
    let nextBlock: Uint8Array
    let padding: number = 0
    if (this.aesTargetDecryptor === this.aesWebDecryptor && !this.ended) {
      nextBlock = this.buffer.subarray(this.pointer + length, this.pointer + length + BLOCK_SIZE).slice()
      // Web Decryptor 需要每次送入的数据是 padding 的，但这里是流式的，所以需要在每次解密的 buffer 后面追加 16 的 padding 的数据
      // 解密完成之后在设置回原来的数据
      this.buffer.set(
        (await this.aesWebDecryptor.encryptPadding(
          PaddingBlock,
          this.buffer.subarray(this.pointer + length - BLOCK_SIZE, this.pointer + length)
        )).subarray(0, BLOCK_SIZE),
        this.pointer + length
      )
      padding = BLOCK_SIZE
    }

    try {
      const encryptData = this.buffer.subarray(this.pointer, this.pointer + length + padding)

      const buffer = await this.aesTargetDecryptor.decrypt(encryptData, this.iv)

      this.iv = encryptData.slice(encryptData.length - BLOCK_SIZE - padding, encryptData.length - padding).buffer

      if (nextBlock) {
        this.buffer.set(nextBlock, this.pointer + length)
      }

      this.pointer += length
      return new Uint8Array(buffer)
    }
    catch (error) {
      if (this.aesTargetDecryptor = this.aesWebDecryptor) {
        logger.warn('web aes decrypt failed, try to use soft decryptor')

        if (nextBlock) {
          this.buffer.set(nextBlock, this.pointer + length)
        }
        this.aesTargetDecryptor = this.aesSoftDecryptor
        AESWebDecryptorSupport = false
        return this.decrypt(length)
      }
      else {
        logger.fatal('aes decrypt failed')
      }
    }
  }

  public async read(buffer: Uint8ArrayInterface): Promise<number> {

    while (!this.ended && this.remainingLength() < (REMAINING_LENGTH + BLOCK_SIZE)) {
      await this.flush()
    }

    if (this.remainingLength() === 0) {
      return IOError.END
    }

    const length = Math.min(
      Math.floor((this.remainingLength() - (this.ended ? 0 : REMAINING_LENGTH)) / BLOCK_SIZE) * BLOCK_SIZE,
      buffer.length
    )

    let decryptBuffer = await this.decrypt(length)

    if (this.ended && this.aesTargetDecryptor === this.aesSoftDecryptor) {
      decryptBuffer = this.removePadding(decryptBuffer)
    }

    buffer.set(decryptBuffer)

    return decryptBuffer.length
  }
}
