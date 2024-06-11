/*
 * libmedia AudioSourceWorkletProcessor in share memory
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

import IPCPort, { REQUEST, RpcMessage } from 'common/network/IPCPort'
import AudioWorkletProcessorBase from './audioWorklet/base/AudioWorkletProcessorBase'
import { initThread, getHeapU8 } from 'cheap/heap'
import AVPCMBuffer from 'avutil/struct/avpcmbuffer'
import { avFree, avFreep, avMallocz } from 'avutil/util/mem'
import * as logger from 'common/util/logger'
import os from 'common/util/os'

const BUFFER_LENGTH = (os.windows || os.mac || os.linux) ? 10 : 20

export default class AudioSourceWorkletProcessor2 extends AudioWorkletProcessorBase {

  private pullIPC: IPCPort

  private frontBuffer: pointer<AVPCMBuffer>
  private backBuffer: pointer<AVPCMBuffer>
  private channels: int32

  private backBufferOffset: int32
  private ended: boolean
  private frontBuffered: boolean
  private firstRendered: boolean

  private float32: Float32Array
  private pause: boolean
  private stopped: boolean
  private afterPullResolve: () => void

  constructor() {
    super()
    this.ipcPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'init': {
          const { memory } = request.params

          await initThread({
            memory,
            disableAsm: true
          })

          this.ipcPort.reply(request)
          break
        }
        case 'start': {

          const { port, channels } = request.params

          this.channels = channels
          this.pullIPC = new IPCPort(port)

          const frontBuffer = this.allocBuffer()
          const backBuffer = this.allocBuffer()

          await this.pullIPC.request('pull', {
            buffer: backBuffer
          })
          await this.pullIPC.request('pull', {
            buffer: frontBuffer
          })

          this.frontBuffer = frontBuffer
          this.backBuffer = backBuffer
          this.backBufferOffset = 0
          this.ended = false
          this.pause = false
          this.frontBuffered = true
          this.firstRendered = false
          this.stopped = false

          this.float32 = new Float32Array(getHeapU8().buffer)
          this.ipcPort.reply(request)

          break
        }

        case 'restart': {

          if (!this.ended) {
            this.ipcPort.reply(request)
            return
          }

          const frontBuffer = this.allocBuffer()
          const backBuffer = this.allocBuffer()

          await this.pullIPC.request('pull', {
            buffer: backBuffer
          })
          await this.pullIPC.request('pull', {
            buffer: frontBuffer
          })

          this.frontBuffer = frontBuffer
          this.backBuffer = backBuffer
          this.backBufferOffset = 0
          this.ended = false
          this.pause = false
          this.frontBuffered = true
          this.firstRendered = false
          this.stopped = false
          this.float32 = new Float32Array(getHeapU8().buffer)

          this.ipcPort.reply(request)

          break
        }

        case 'stop': {

          if (!this.ended) {
            await new Promise<void>((resolve) => {
              this.afterPullResolve = resolve
            })
          }

          this.freeBuffer(this.backBuffer)
          this.freeBuffer(this.frontBuffer)
          this.backBuffer = nullptr
          this.frontBuffer = nullptr
          this.stopped = true
          this.pullIPC.destroy()

          this.ipcPort.reply(request)

          break
        }

        case 'clear': {
          this.backBufferOffset = BUFFER_LENGTH
          this.ipcPort.reply(request)
          break
        }

        case 'pause': {
          this.pause = true
          this.ipcPort.reply(request)
          break
        }

        case 'unpause': {
          this.pause = false
          this.ipcPort.reply(request)
          break
        }
      }
    })
  }

  private allocBuffer() {
    const buffer: pointer<AVPCMBuffer> = avMallocz(sizeof(AVPCMBuffer))
    buffer.data = reinterpret_cast<pointer<pointer<uint8>>>(avMallocz(sizeof(pointer) * this.channels))
    const data = avMallocz(sizeof(float) * 128 * BUFFER_LENGTH * this.channels)
    for (let i = 0; i < this.channels; i++) {
      buffer.data[i] = reinterpret_cast<pointer<uint8>>(data + 128 * BUFFER_LENGTH * sizeof(float) * i)
    }
    buffer.maxnbSamples = 128 * BUFFER_LENGTH
    return buffer
  }

  private freeBuffer(buffer: pointer<AVPCMBuffer>) {
    if (!buffer) {
      return
    }
    avFreep(addressof(buffer.data[0]))
    avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(buffer.data)))
    avFree(buffer)
  }

  private async pull() {
    const ret = await this.pullIPC.request<number>('pull', {
      buffer: this.frontBuffer
    })
    if (ret < 0) {
      this.ended = true
    }
    if (this.afterPullResolve) {
      this.afterPullResolve()
    }
  }

  private swapBuffer() {
    if (this.frontBuffered) {
      const backBuffer = this.backBuffer
      this.backBuffer = this.frontBuffer
      this.frontBuffer = backBuffer
      this.backBufferOffset = 0
    }
    else {
      return false
    }
    this.frontBuffered = false
    this.pull().then(() => {
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
          this.freeBuffer(this.backBuffer)
          this.freeBuffer(this.frontBuffer)
          this.backBuffer = nullptr
          this.frontBuffer = nullptr

          logger.info('audio source ended')

          this.ipcPort.notify('ended')

          return true
        }
        if (!this.swapBuffer()) {
          this.ipcPort.notify('stutter')
          return true
        }
      }
      const output = outputs[0]
      for (let i = 0; i < this.channels; i++) {
        output[i].set(
          this.float32.subarray(
            (this.backBuffer.data[i] >>> 2) + this.backBufferOffset * 128,
            (this.backBuffer.data[i] >>> 2) + (this.backBufferOffset + 1) * 128
          ),
          0
        )
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
// @ts-ignore
registerProcessor('audio-source-processor', AudioSourceWorkletProcessor2)
