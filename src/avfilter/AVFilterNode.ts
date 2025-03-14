
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
import * as array from 'common/util/array'
import isPointer from 'cheap/std/function/isPointer'
import * as is from 'common/util/is'
import AVOutputNode from './AVOutputNode'
import { Data } from 'common/types/type'

export interface AVFilterNodeOptions {
  avframePool?: AVFramePool
}

export class AVFilterNodePort extends IPCPort {

  private channel: MessageChannel | MessagePort

  private next: AVFilterNodePort | undefined

  constructor(channel: MessageChannel | MessagePort) {
    super(channel instanceof MessageChannel ? channel.port1 : channel)
    this.channel = channel
  }

  public connect(port: AVFilterNodePort) {
    this.off()
    port.off()

    this.on(REQUEST, async (request: RpcMessage) => {
      try {
        const result = await port.request<pointer<AVFrame> | VideoFrame>(request.method!, request.params)
        this.reply(request, result, undefined, (isPointer(result) || is.number(result) || request.method !== 'pull') ? undefined : [result])
      }
      catch (error) {
        this.reply(request, null, error as Data)
      }
    })
    this.on(NOTIFY, (message: RpcMessage) => {
      port.notify(message.method!, message.params)
    })

    port.on(REQUEST, async (request: RpcMessage) => {
      try {
        const result = await this.request<pointer<AVFrame> | VideoFrame>(request.method!, request.params)
        port.reply(request, result, undefined, (isPointer(result) || is.number(result) || request.method !== 'pull') ? undefined : [result])
      }
      catch (error) {
        port.reply(request, null, error as Data)
      }
    })
    port.on(NOTIFY, (message: RpcMessage) => {
      this.notify(message.method!, message.params)
    })

    this.next = port
  }

  public disconnect() {
    this.off()
    if (this.next) {
      this.next.off()
    }
    this.next = undefined
  }

  public getInnerPort() {
    if (this.channel instanceof MessageChannel) {
      return this.channel.port2
    }
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

  private inputConnectedMap: Map<any, number>
  private outputConnectedMap: Map<any, number>

  constructor(options: AVFilterNodeOptions, inputCount: number, outputCount: number) {
    this.options = options
    this.inputCount = inputCount
    this.outputCount = outputCount

    this.inputAVFilterNodePort = []
    this.outputAVFilterNodePort = []

    this.inputInnerNodePort = []
    this.outputInnerNodePort = []

    for (let i = 0; i < this.inputCount; i++) {
      const port = new AVFilterNodePort(new MessageChannel())
      this.inputAVFilterNodePort.push(port)
      this.inputInnerNodePort.push(new IPCPort(port.getInnerPort()!))
    }
    for (let i = 0; i < this.outputCount; i++) {
      const port = new AVFilterNodePort(new MessageChannel())
      this.outputAVFilterNodePort.push(port)
      this.outputInnerNodePort.push(new IPCPort(port.getInnerPort()!))
    }

    this.consumedCount = 0
    this.pending = []
    this.currentOutput = []

    for (let i = 0; i < this.outputCount; i++) {
      this.handlePull(this.outputInnerNodePort[i], i)
    }

    this.inputConnectedMap = new Map()
    this.outputConnectedMap = new Map()
  }

  private handlePull(port: IPCPort, index: number) {
    port.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (this.consumedCount === 0) {
            const input: (pointer<AVFrame> | VideoFrame)[] = []
            this.currentOutput.length = 0
            for (let i = 0; i < this.inputCount; i++) {
              input.push(await this.inputInnerNodePort[i].request('pull', request.params))
            }

            await this.process(input, this.currentOutput, request.params)

            input.forEach((frame) => {
              if (is.number(frame) && frame < 0) {
                return
              }
              if (isPointer(frame)) {
                if (frame > 0) {
                  this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(frame)) : destroyAVFrame(frame)
                }
              }
              else {
                frame.close()
              }
            })

            port.reply(
              request,
              this.currentOutput[index],
              undefined,
              (isPointer(this.currentOutput[index])
                || is.number(this.currentOutput[index])
              )
                ? undefined
                : [this.currentOutput[index]]
            )
            this.consumedCount++

            if (this.pending.length) {
              this.pending.forEach((item) => {
                item.resolve()
              })
              this.pending.length = 0
            }
            if (this.consumedCount === this.outputCount) {
              this.consumedCount = 0
              this.currentOutput.length = 0
            }
          }
          else if (this.consumedCount === this.outputCount - 1) {
            port.reply(
              request,
              this.currentOutput[index],
              undefined,
              (isPointer(this.currentOutput[index])
                || is.number(this.currentOutput[index])
              )
                ? undefined
                : [this.currentOutput[index]]
            )
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
            port.reply(
              request,
              this.currentOutput[index],
              undefined,
              (isPointer(this.currentOutput[index])
                || is.number(this.currentOutput[index])
              )
                ? undefined
                : [this.currentOutput[index]]
            )
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

  public getInputCount() {
    return this.inputCount
  }

  public getOutputCount() {
    return this.outputCount
  }

  public getFreeInputNodePort() {

    const used: number[] = []

    this.inputConnectedMap.forEach((index, node) => {
      used.push(index)
    })

    for (let i = 0; i < this.inputCount; i++) {
      if (!array.has(used, i)) {
        return {
          index: i,
          port: this.getInputNodePort(i)
        }
      }
    }
  }

  public getFreeOutputNodePort() {

    const used: number[] = []

    this.outputConnectedMap.forEach((index, node) => {
      used.push(index)
    })

    for (let i = 0; i < this.outputCount; i++) {
      if (!array.has(used, i)) {
        return {
          index: i,
          port: this.getOutputNodePort(i)
        }
      }
    }
  }

  public addInputPeer(node: any, index: number) {
    this.inputConnectedMap.set(node, index)
  }

  public removeInputPeer(node: any) {
    this.inputConnectedMap.delete(node)
  }

  public addOutputPeer(node: any, index: number) {
    this.outputConnectedMap.set(node, index)
  }

  public removeOutputPeer(node: any) {
    this.outputConnectedMap.delete(node)
  }

  public connect(node: AVFilterNode | AVOutputNode) {
    if (this.outputConnectedMap.size === this.outputCount) {
      throw new Error('all output has connected')
    }

    const output = this.getFreeOutputNodePort()!
    const nextInput = node.getFreeInputNodePort()!

    if (!nextInput) {
      throw new Error('next node all input has connected')
    }

    output.port.connect(nextInput.port)

    this.outputConnectedMap.set(node, output.index)
    node.addInputPeer(this, nextInput.index)
  }

  private disconnectNode(node: any) {
    if (!this.outputConnectedMap.has(node)) {
      return
    }
    this.outputAVFilterNodePort[this.outputConnectedMap.get(node)!].disconnect()
    this.outputConnectedMap.delete(node)

    if (node instanceof AVFilterNode) {
      node.removeInputPeer(this)
    }
  }

  public disconnect(node?: any) {
    if (node) {
      return this.disconnectNode(node)
    }
    this.outputConnectedMap.forEach((index, node) => {
      this.disconnectNode(node)
    })
  }

  public abstract ready(): void | Promise<void>
  public abstract destroy(): void | Promise<void>
  public abstract process(inputs: (pointer<AVFrame> | VideoFrame | int32)[], outputs: (pointer<AVFrame> | VideoFrame | int32)[], options?: Data): void | Promise<void>
}
