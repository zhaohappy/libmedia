/*
 * libmedia websocket loader
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

export interface WebSocketOptions {
  protocols?: string | string[]
}

export interface WebSocketInfo {
  url: string
  websocketOptions?: WebSocketOptions
}

export default class WebSocketIOLoader extends SocketIOLoader {

  protected info: WebSocketInfo

  protected socket: WebSocket

  public async send(buffer: Uint8ArrayInterface): Promise<int32> {
    if (this.socket) {
      this.socket.send(buffer.slice())
      return 0
    }
    return IOError.INVALID_OPERATION
  }
  public open(info: WebSocketInfo): Promise<int32> {
    this.info = info
    this.status = IOLoaderStatus.CONNECTING
    return new Promise<int32>((resolve) => {
      this.socket = new WebSocket(info.url, info.websocketOptions?.protocols)
      this.socket.binaryType = 'arraybuffer'
      this.socket.onopen = () => {
        this.status = IOLoaderStatus.BUFFERING
        resolve(0)
      }
      this.socket.onerror = () => {
        this.status = IOLoaderStatus.ERROR
        resolve(IOError.NETWORK_ERROR)
        if (this.consume) {
          this.consume()
        }
      }
      this.socket.onmessage = (message) => {
        let data = message.data
        this.readQueue.push(new Uint8Array(data))
        if (this.consume) {
          this.consume()
        }
      }
    })
  }
  public seek(pos: int64, options?: Data): Promise<int32> {
    throw new Error('Method not implemented.')
  }
  public size(): Promise<int64> {
    throw new Error('Method not implemented.')
  }
  public async stop() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    this.status = IOLoaderStatus.COMPLETE
    if (this.consume) {
      this.consume()
    }
  }
}
