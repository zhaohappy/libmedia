/*
 * libmedia AVTranscoder Controller
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

import { AVCodecID, AVMediaType } from 'avutil/codec'
import IPCPort, { REQUEST, RpcMessage } from 'common/network/IPCPort'
import createMessageChannel from './function/createMessageChannel'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'

export interface ControllerObserver {
  onGetDecoderResource: (mediaType: AVMediaType, codecId: AVCodecID) => Promise<WebAssemblyResource | ArrayBuffer>
}

export default class Controller {
  private demuxerControlChannel: MessageChannel

  private demuxerControlIPCPort: IPCPort

  private observer: ControllerObserver

  constructor(observer: ControllerObserver) {
    this.observer = observer
    this.demuxerControlChannel = createMessageChannel()

    this.demuxerControlIPCPort = new IPCPort(this.demuxerControlChannel.port2)

    this.demuxerControlIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'getDecoderResource':
          this.demuxerControlIPCPort.reply(
            request,
            await this.observer.onGetDecoderResource(request.params.mediaType, request.params.codecId)
          )
          break
      }
    })
  }

  public getDemuxerRenderControlPort() {
    return this.demuxerControlChannel.port1
  }

  public destroy() {
    if (this.demuxerControlIPCPort) {
      this.demuxerControlIPCPort.destroy()
    }
    this.demuxerControlChannel = null
  }
}
