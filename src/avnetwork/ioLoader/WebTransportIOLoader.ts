/*
 * libmedia webtransport loader
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
import { IOLoaderStatus } from './IOLoader'
import { IOError } from 'common/io/error'
import SocketIOLoader from './SocketIOLoader'
import { Data } from 'common/types/type'

export interface WebTransportInfo {
  url: string
  webtransportOptions?: WebTransportOptions
}

export default class WebTransportIOLoader extends SocketIOLoader {

  protected info: WebTransportInfo

  protected transport: WebTransport

  protected datagramReader: ReadableStreamDefaultReader<Uint8Array>
  protected reader: ReadableStreamDefaultReader<Uint8Array>

  protected datagramWriter: WritableStreamDefaultWriter<Uint8Array>
  protected writer: WritableStreamDefaultWriter<Uint8Array>
  protected stream: WebTransportBidirectionalStream

  protected readPacketQueue: Uint8Array[]

  protected consumePacket: (value: void | PromiseLike<void>) => void

  public async send(buffer: Uint8ArrayInterface): Promise<int32> {
    if (this.writer) {
      this.writer.write(buffer.slice())
      return 0
    }
    return IOError.INVALID_OPERATION
  }

  private async handleRead() {
    let isDone = false
    while (true) {
      try {
        const { value, done } = await this.reader.read()
        if (done) {
          isDone = done
          break
        }
        this.readQueue.push(value)
      }
      catch (error) {
        if (!isDone) {
          this.status = IOLoaderStatus.ERROR
          if (this.consume) {
            this.consume()
          }
        }
        break
      }
    }
  }

  private async readDatagram() {
    let isDone = false
    while (true) {
      try {
        const { value, done } = await this.datagramReader.read()
        if (done) {
          isDone = true
          break
        }
        this.readPacketQueue.push(value)
      }
      catch (error) {
        if (!isDone) {
          this.status = IOLoaderStatus.ERROR
          if (this.consumePacket) {
            this.consumePacket()
          }
        }
        break
      }
    }
  }

  public async open(info: WebTransportInfo): Promise<int32> {
    this.info = info
    this.transport = new WebTransport(info.url, info.webtransportOptions)

    this.readPacketQueue = []

    this.status = IOLoaderStatus.CONNECTING

    await this.transport.ready

    this.transport.closed.then(() => {
      if (this.transport) {
        this.status = IOLoaderStatus.ERROR
      }
      else {
        this.status = IOLoaderStatus.COMPLETE
      }
    })

    this.status = IOLoaderStatus.BUFFERING

    this.stream = await this.transport.createBidirectionalStream()
    this.reader = this.stream.readable.getReader()
    this.writer = this.stream.writable.getWriter()

    this.datagramReader = this.transport.datagrams.readable.getReader()
    this.datagramWriter = this.transport.datagrams.writable.getWriter()

    this.handleRead()
    this.readDatagram()

    return 0
  }

  public async readPacket(buffer: Uint8ArrayInterface) {
    while (true) {
      if (this.readPacketQueue.length) {
        const data = this.readPacketQueue.shift()
        assert(data.length <= buffer.length)
        buffer.set(data, 0)
        return data.length
      }

      if (this.status === IOLoaderStatus.COMPLETE || this.status === IOLoaderStatus.IDLE) {
        return IOError.END
      }

      if (this.status === IOLoaderStatus.ERROR) {
        return IOError.NETWORK_ERROR
      }

      await new Promise<void>((resolve) => {
        this.consumePacket = resolve
      })
      this.consumePacket = null
    }
  }

  public async writePacket(buffer: Uint8ArrayInterface) {
    if (this.datagramWriter) {
      this.datagramWriter.write(buffer.slice())
      return 0
    }
    return IOError.INVALID_OPERATION
  }

  public seek(pos: int64, options?: Data): Promise<int32> {
    throw new Error('Method not implemented.')
  }
  public size(): Promise<int64> {
    throw new Error('Method not implemented.')
  }
  public async stop() {
    if (this.transport) {
      this.transport.close()
      this.transport = null
    }
    this.status = IOLoaderStatus.COMPLETE
    if (this.consume) {
      this.consume()
    }
  }
}
