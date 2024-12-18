/*
 * libmedia flv header format
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

import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriterSync'

export default class FlvHeader {
  /**
   * 3 bytes 签名
   */
  public signature: string

  /**
   * 1 bytes 版本，比如 0x01 表示 FLV 版本 1
   */
  public version: number

  /**
   * 1 bytes 第一位标记是否有视频，第 4 位标记是否有音频，其余位保留
   */
  public flags: number

  /**
   * 4 bytes FLV header 的大小，单位是字节，目前是 9
   */
  public dataOffset: number

  /**
   * 是否有视频
   */
  public hasVideo: boolean

  /**
   * 是否有音频
   */
  public hasAudio: boolean

  constructor() {

    this.signature = 'FLV'
    this.version = 1
    this.flags = 0
    this.dataOffset = 9

    this.hasAudio = false
    this.hasVideo = false
  }

  public async read(ioReader: IOReader) {
    this.signature = await ioReader.readString(3)
    this.version = await ioReader.readUint8()
    this.flags = await ioReader.readUint8()
    this.dataOffset = await ioReader.readUint32()

    this.hasAudio = !!(this.flags & 0x04)
    this.hasVideo = !!(this.flags & 0x01)
  }

  public write(ioWriter: IOWriter) {
    this.flags = 0
    if (this.hasAudio) {
      this.flags |= 0x04
    }
    if (this.hasVideo) {
      this.flags |= 0x01
    }

    ioWriter.writeString(this.signature)
    ioWriter.writeUint8(this.version)
    ioWriter.writeUint8(this.flags)
    ioWriter.writeUint32(this.dataOffset)
  }
}
