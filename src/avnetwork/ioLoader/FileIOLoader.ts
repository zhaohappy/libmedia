/*
 * libmedia file loader
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

import IOLoader, { IOLoaderStatus } from './IOLoader'
import { IOError } from 'common/io/error'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as is from 'common/util/is'
import { Range } from 'common/types/type'

export interface FileInfo {
  file: File
}

// chrome 目前使用 arrayBuffer 读文件数据会造成内存泄漏，先关闭
const hasArrayBuffer = is.func(Blob.prototype.arrayBuffer)
const hasFileReaderSync = typeof FileReaderSync === 'function'

export default class FileIOLoader extends IOLoader {

  private info: FileInfo

  private range: Range

  private readPos: number

  private endPos: number

  private reader: FileReader | FileReaderSync
  private readerResolve: (buffer: ArrayBuffer) => void

  public async open(info: FileInfo, range: Range) {

    this.info = info
    this.range = range

    this.readPos = 0
    this.endPos = this.info.file.size

    if (range.from > 0) {
      this.readPos = range.from
    }
    if (range.to > 0) {
      this.endPos = range.to
    }

    this.status = IOLoaderStatus.BUFFERING

    return 0
  }

  private readBufferByReaderSync(len: number) {
    if (!this.reader) {
      this.reader = new FileReaderSync()
    }
    return this.reader.readAsArrayBuffer(this.info.file.slice(this.readPos, this.readPos + len)) as ArrayBuffer
  }

  private async readBufferByReader(len: number) {
    if (!this.reader) {
      this.reader = new FileReader()
      this.reader.onloadend = (event) => {
        if (this.readerResolve) {
          this.readerResolve(event.target.result as ArrayBuffer)
        }
      }
    }
    return new Promise<ArrayBuffer>((resolve) => {
      this.readerResolve = resolve
      this.reader.readAsArrayBuffer(this.info.file.slice(this.readPos, this.readPos + len))
    })
  }

  public async read(buffer: Uint8ArrayInterface) {
    if (this.readPos >= this.endPos) {
      this.status = IOLoaderStatus.COMPLETE
      return IOError.END
    }
    const len = Math.min(buffer.length, this.endPos - this.readPos)

    if (hasFileReaderSync) {
      buffer.set(new Uint8Array(this.readBufferByReaderSync(len)), 0)
    }
    else if (hasArrayBuffer) {
      buffer.set(new Uint8Array(await (this.info.file.slice(this.readPos, this.readPos + len).arrayBuffer())), 0)
    }
    else {
      buffer.set(new Uint8Array(await this.readBufferByReader(len)), 0)
    }

    this.readPos += len

    if (this.readPos >= this.endPos) {
      this.status = IOLoaderStatus.COMPLETE
    }

    return len
  }

  public async seek(pos: int64) {
    this.readPos = Number(pos)
    if (this.status === IOLoaderStatus.COMPLETE) {
      this.status = IOLoaderStatus.BUFFERING
    }
    return 0
  }

  public async size() {
    return static_cast<int64>(this.info.file.size)
  }

  public async stop() {
    this.status = IOLoaderStatus.IDLE
  }
}
