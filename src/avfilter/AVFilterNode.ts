
/*
 * libmedia AVFilter
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

import AVFrame, { AVFramePool, AVFrameRef } from 'avutil/struct/avframe'
import { destroyAVFrame } from 'avutil/util/avframe'
import IPCPort, { NOTIFY, REQUEST, RpcMessage } from 'common/network/IPCPort'
import * as is from 'common/util/is'

export interface AVFilterNodeOptions {
  avframePool?: AVFramePool
}

class AVFilterNodePort extends IPCPort {

  private channel: MessageChannel

  private next: AVFilterNodePort

  constructor(channel: MessageChannel = new MessageChannel()) {
    super(channel.port1)
    this.channel = channel
  }

  public connect(port: AVFilterNodePort) {
    this.off()
    port.off()

    this.on(REQUEST, async (request: RpcMessage) => {
      try {
        const result = await port.request<pointer<AVFrame> | VideoFrame>(request.method, request.params)
        this.reply(request, result, null, (is.number(result) || request.method !== 'pull') ? null : [result])
      }
      catch (error) {
        this.reply(request, null, error)
      }
    })
    this.on(NOTIFY, (message: RpcMessage) => {
      port.notify(message.method, message.params)
    })

    port.on(REQUEST, async (request: RpcMessage) => {
      try {
        const result = await this.request<pointer<AVFrame> | VideoFrame>(request.method, request.params)
        port.reply(request, result, null, (is.number(result) || request.method !== 'pull') ? null : [result])
      }
      catch (error) {
        port.reply(request, null, error)
      }
    })
    port.on(NOTIFY, (message: RpcMessage) => {
      this.notify(message.method, message.params)
    })

    this.next = port
  }

  public disconnect() {
    this.off()
    if (this.next) {
      this.next.off()
    }
    this.next = null
  }

  public getInnerPort() {
    return this.channel.port2
  }
}

export default abstract class AVFilterNode {

  protected options: AVFilterNodeOptions

  protected inputAVFilterNodePort: AVFilterNodePort[]
  protected outputAVFilterNodePort: AVFilterNodePort[]

  protected inputInnerNodePort: IPCPort[]
  protected outputInnerNodePort: IPCPort[]

  private currentOutput: (pointer<AVFrame> | VideoFrame)[]
  private consumedCount: number
  private pending: { resolve: (data?: any) => void, reject: () => void }[]

  protected inputCount: number
  protected outputCount: number

  constructor(options: AVFilterNodeOptions, inputCount: number, outputCount: number) {
    this.options = options
    this.inputCount = inputCount
    this.outputCount = outputCount

    this.inputAVFilterNodePort = []
    this.outputAVFilterNodePort = []

    this.inputInnerNodePort = []
    this.outputInnerNodePort = []

    for (let i = 0; i < this.inputCount; i++) {
      const port = new AVFilterNodePort()
      this.inputAVFilterNodePort.push(port)
      this.inputInnerNodePort.push(new IPCPort(port.getInnerPort()))
    }
    for (let i = 0; i < this.outputCount; i++) {
      const port = new AVFilterNodePort()
      this.outputAVFilterNodePort.push(port)
      this.outputInnerNodePort.push(new IPCPort(port.getInnerPort()))
    }

    this.consumedCount = 0
    this.pending = []

    for (let i = 0; i < this.outputCount; i++) {
      this.handlePull(this.outputInnerNodePort[i], i)
    }
  }

  private handlePull(port: IPCPort, index: number) {
    port.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (this.consumedCount === 0) {
            const input: (pointer<AVFrame> | VideoFrame)[] = []
            this.currentOutput.length = 0
            for (let i = 0; i < this.inputCount; i++) {
              input.push(await this.inputInnerNodePort[i].request('pull'))
            }

            await this.process(input, this.currentOutput)
            
            input.forEach((frame) => {
              if (is.number(frame)) {
                this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(frame)) : destroyAVFrame(frame)
              }
              else {
                frame.close()
              }
            })

            port.reply(request, this.currentOutput[index], null, is.number(this.currentOutput[index]) ? null : [this.currentOutput[index]])
            this.consumedCount++

            if (this.pending.length) {
              this.pending.forEach((item) => {
                item.resolve()
              })
              this.pending.length = 0
            }
          }
          else if (this.consumedCount === this.outputCount - 1) {
            port.reply(request, this.currentOutput[index], null, is.number(this.currentOutput[index]) ? null : [this.currentOutput[index]])
            this.consumedCount = 0
            this.currentOutput.length = 0
          }
          else {
            await new Promise((resolve, reject) => {
              this.pending.push({
                resolve,
                reject
              })
            })
            port.reply(request, this.currentOutput[index], null, is.number(this.currentOutput[index]) ? null : [this.currentOutput[index]])
            this.consumedCount++
          }
        }
      }
    })
  }

  public getInputNodePort(index: number) {
    return this.inputAVFilterNodePort[index]
  }

  public getOutputNodePort(index: number) {
    return this.outputAVFilterNodePort[index]
  }

  public abstract ready(): void | Promise<void>
  public abstract destroy(): void | Promise<void>
  public abstract process(inputs: (pointer<AVFrame> | VideoFrame)[], outputs: (pointer<AVFrame> | VideoFrame)[]): void | Promise<void>
}