/*
 * libmedia AudioSourceWorkletProcessor
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

import AudioWorkletProcessorBase from './audioWorklet/base/AudioWorkletProcessorBase'

import {
  is,
  logger,
  os
} from '@libmedia/common'

import {
  IPCPort,
  REQUEST,
  type RpcMessage
} from '@libmedia/common/network'

let BUFFER_LENGTH = (os.windows || os.mac || os.linux) ? 10 : 20

declare const currentTime: number

export default class AudioSourceWorkletProcessor extends AudioWorkletProcessorBase {

  private pullIPC: IPCPort

  private frontBuffer: Float32Array[]
  private backBuffer: Float32Array[]
  private channels: int32

  private backBufferOffset: int32
  private ended: boolean

  private frontBuffered: boolean
  private pause: boolean
  private firstRendered: boolean
  private stopped: boolean
  private lastStutterTimestamp: number
  private pullPending: Promise<void>
  private needsRefill: boolean

  constructor() {
    super()
    this.ended = false
    this.pause = true
    this.ipcPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'init': {
          if (request.params && request.params.bufferLength) {
            BUFFER_LENGTH = request.params.bufferLength
          }
          this.ipcPort.reply(request)
          break
        }
        case 'start': {

          const { port, channels } = request.params

          this.channels = channels
          this.pullIPC = new IPCPort(port)

          this.needsRefill = false
          this.backBufferOffset = 0
          this.ended = false
          this.frontBuffered = true
          this.pause = false
          this.firstRendered = false
          this.stopped = false
          this.lastStutterTimestamp = currentTime

          const backBuffer = []
          const frontBuffer = []

          await this.pull(backBuffer)
          if (!backBuffer.length) {
            this.ended = true
            this.frontBuffered = false
            this.backBufferOffset = BUFFER_LENGTH
          }
          else {
            await this.pull(frontBuffer)
            if (!frontBuffer.length) {
              this.ended = true
              this.frontBuffered = false
            }
          }

          this.frontBuffer = frontBuffer
          this.backBuffer = backBuffer

          this.ipcPort.reply(request)

          break
        }

        case 'restart': {

          if (!this.ended) {
            this.ipcPort.reply(request)
            return
          }

          this.needsRefill = false
          this.backBufferOffset = 0
          this.ended = false
          this.frontBuffered = true
          this.pause = false
          this.firstRendered = false
          this.stopped = false
          this.lastStutterTimestamp = currentTime

          const backBuffer = []
          const frontBuffer = []

          await this.pull(backBuffer)
          if (!backBuffer.length) {
            this.ended = true
            this.frontBuffered = false
            this.backBufferOffset === BUFFER_LENGTH
          }
          else {
            await this.pull(frontBuffer)
            if (!frontBuffer.length) {
              this.ended = true
              this.frontBuffered = false
            }
          }

          this.frontBuffer = frontBuffer
          this.backBuffer = backBuffer

          this.ipcPort.reply(request)

          break
        }

        case 'clear': {
          await this.clearBuffer()
          this.ipcPort.reply(request)
          break
        }

        case 'stop': {

          this.stopped = true
          await this.pullPending

          this.pullIPC.destroy()

          this.ipcPort.reply(request)

          break
        }

        case 'pause': {
          this.pause = true
          this.ipcPort.reply(request)
          break
        }

        case 'unpause': {
          await this.refillBuffer()
          this.pause = false
          this.ipcPort.reply(request)
          break
        }
      }
    })
  }

  private async pull(data: Float32Array[]) {
    const buffer: ArrayBuffer | number = await this.pullIPC.request('pullBuffer', {
      nbSamples: BUFFER_LENGTH * 128
    })
    if (is.number(buffer)) {
      this.ended = true
    }
    else {
      const float = new Float32Array(buffer)
      for (let i = 0; i < this.channels; i++) {
        data[i] = float.subarray(i * BUFFER_LENGTH * 128, (i + 1) * BUFFER_LENGTH * 128)
      }
    }
  }

  private async clearBuffer() {
    // Pause output before this call; wait for the old prefetch to settle.
    await this.pullPending
    if (!this.stopped) {
      this.needsRefill = true
      this.ended = true
      this.frontBuffered = false
      this.backBufferOffset = BUFFER_LENGTH
    }
  }

  private async refillBuffer() {
    if (!this.needsRefill || this.stopped) {
      return
    }
    this.needsRefill = false
    this.backBuffer = []
    this.frontBuffer = []
    this.backBufferOffset = BUFFER_LENGTH
    this.ended = false
    this.frontBuffered = false
    this.pullPending = this.pull(this.frontBuffer).then(() => {
      this.frontBuffered = true
    })
    await this.pullPending
  }

  private swapBuffer() {
    if (this.frontBuffered) {
      this.backBuffer = this.frontBuffer
      this.backBufferOffset = 0
      this.frontBuffer = []
    }
    else {
      return false
    }

    this.frontBuffered = false
    this.pullPending = this.pull(this.frontBuffer).then(() => {
      this.frontBuffered = true
    })
    return true
  }

  public process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: { averaging: Float32Array; output: Float32Array }): boolean {
    if (this.stopped) {
      return false
    }

    if (this.backBuffer && !this.pause) {
      if (this.backBufferOffset === BUFFER_LENGTH) {
        if (this.ended) {
          this.backBuffer = null
          this.frontBuffer = null
          logger.info('audio source ended')
          this.ipcPort.notify('ended')
          return true
        }
        if (!this.swapBuffer()) {
          if (currentTime - this.lastStutterTimestamp > 1) {
            this.ipcPort.notify('stutter')
            this.lastStutterTimestamp = currentTime
          }
          return true
        }
      }
      const output = outputs[0]
      for (let i = 0; i < this.channels; i++) {
        output[i].set(this.backBuffer[i].subarray(this.backBufferOffset * 128, (this.backBufferOffset + 1) * 128), 0)
      }
      this.backBufferOffset++
      if (!this.firstRendered) {
        this.firstRendered = true
        this.ipcPort.notify('firstRendered')
      }
    }
    return true
  }
}
registerProcessor('audio-source-processor', AudioSourceWorkletProcessor)
