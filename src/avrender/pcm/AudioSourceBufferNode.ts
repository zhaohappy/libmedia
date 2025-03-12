/*
 * libmedia AudioSourceBufferNode
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

import AVPCMBuffer from 'avutil/struct/avpcmbuffer'
import { avFree, avFreep, avMallocz } from 'avutil/util/mem'
import { getHeapU8 } from 'cheap/heap'
import { AudioWorkletNodeObserver } from './audioWorklet/base/AudioWorkletNodeBase'
import IPCPort from 'common/network/IPCPort'
import { Data } from 'common/types/type'
import * as logger from 'common/util/logger'
import * as cheapConfig from 'cheap/config'
import os from 'common/util/os'
import * as is from 'common/util/is'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import getTimestamp from 'common/function/getTimestamp'

const BUFFER_LENGTH = (os.windows || os.mac || os.linux) ? 20 : 30

export interface AudioSourceBufferNodeOptions extends AudioWorkletNodeOptions {
  isMainWorker?: boolean
}

export default class AudioSourceBufferNode {

  private context: AudioContext
  private observer: AudioWorkletNodeObserver
  private options: AudioSourceBufferNodeOptions

  private pullIPC: IPCPort

  private buffer: pointer<AVPCMBuffer>
  private channels: int32

  private ended: boolean
  private float32: Float32Array
  private buffered: boolean

  private pause: boolean

  private startTime: number

  private dest: AudioNode

  private queue: AudioBufferSourceNode[]

  private firstRendered: boolean

  private lastStutterTimestamp: number

  constructor(context: AudioContext, observer: AudioWorkletNodeObserver, options: AudioSourceBufferNodeOptions = {}) {
    this.context = context
    this.observer = observer
    this.options = options
  }

  public async request(method: string, params?: Data, transfer?: any[]) {
    switch (method) {
      case 'init': {
        break
      }
      case 'start': {

        const { port, channels } = params

        this.channels = channels
        this.pullIPC = new IPCPort(port)

        this.buffer = this.allocBuffer()
        this.float32 = new Float32Array(getHeapU8().buffer)
        this.queue = []
        this.startTime = 0
        this.ended = false
        this.pause = false
        this.firstRendered = false
        this.lastStutterTimestamp = getTimestamp()

        await this.pullInterval()
        this.buffering()
        await this.pullInterval()

        this.buffered = true

        this.process()

        break
      }

      case 'restart': {

        if (!this.ended) {
          return
        }

        this.buffer = this.allocBuffer()
        this.queue = []
        this.startTime = 0
        this.ended = false
        this.pause = false
        this.firstRendered = false

        await this.pullIPC.request('pull', {
          buffer: this.buffer
        })
        this.buffering()
        await this.pullIPC.request('pull', {
          buffer: this.buffer
        })

        this.buffered = true
        this.lastStutterTimestamp = getTimestamp()

        this.process()

        break
      }

      case 'stop': {
        this.freeBuffer(this.buffer)
        this.buffer = null
        this.ended = true
        this.pullIPC.destroy()
        break
      }

      case 'clear': {
        this.queue.forEach((buffer) => {
          buffer.disconnect()
        })
        this.queue.length = 0
        break
      }

      case 'pause': {
        this.pause = true
        break
      }

      case 'unpause': {
        this.pause = false
        if (!this.queue.length) {
          this.process()
        }
        break
      }
    }
  }

  private allocBuffer() {
    const buffer = reinterpret_cast<pointer<AVPCMBuffer>>(avMallocz(sizeof(AVPCMBuffer)))
    buffer.data = reinterpret_cast<pointer<pointer<uint8>>>(avMallocz(reinterpret_cast<int32>(sizeof(pointer)) * this.channels))
    const data = avMallocz(reinterpret_cast<int32>(sizeof(float)) * 128 * BUFFER_LENGTH * this.channels)
    for (let i = 0; i < this.channels; i++) {
      buffer.data[i] = reinterpret_cast<pointer<uint8>>(data + 128 * BUFFER_LENGTH * reinterpret_cast<int32>(sizeof(float)) * i)
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

  private async pullInterval() {
    let ret = 0
    if (this.options.isMainWorker) {
      const buffer: ArrayBuffer | number = await this.pullIPC.request('pullBuffer', {
        nbSamples: BUFFER_LENGTH * 128
      })
      if (is.arrayBuffer(buffer)) {
        ret = 0
        memcpyFromUint8Array(this.buffer.data[0], buffer.byteLength, new Uint8Array(buffer))
      }
      else {
        ret = buffer
      }
    }
    else {
      ret = await this.pullIPC.request<number>('pull', {
        buffer: this.buffer
      })
    }
    return ret
  }

  private async pull() {
    this.buffered = false
    const ret = await this.pullInterval()
    if (ret < 0) {
      this.ended = true
    }
    else {
      this.buffered = true
      if (!this.queue.length) {
        this.process()
      }
    }
  }

  private buffering() {

    if (!this.float32.length) {
      this.float32 = new Float32Array(getHeapU8().buffer)
    }

    const audioBuffer = this.context.createBuffer(this.channels, BUFFER_LENGTH * 128, this.context.sampleRate)
    for (let i = 0; i < this.channels; i++) {
      if (this.buffer.data[i]) {
        let pos = this.buffer.data[i] >>> 2
        if (audioBuffer.copyToChannel && !cheapConfig.USE_THREADS) {
          audioBuffer.copyToChannel(
            this.float32.subarray(pos, pos + BUFFER_LENGTH * 128),
            i,
            0
          )
        }
        else {
          const audioData = audioBuffer.getChannelData(i)
          audioData.set(this.float32.subarray(pos, pos + BUFFER_LENGTH * 128), 0)
        }
      }
    }

    const bufferSource = this.context.createBufferSource()
    bufferSource.buffer = audioBuffer

    bufferSource.onended = () => {
      this.queue.shift()
      if (this.ended && !this.queue.length) {
        this.freeBuffer(this.buffer)
        logger.info('audio source ended')
        this.observer.onEnded()
        return
      }
      this.process()

      if (!this.queue.length) {
        if (getTimestamp() - this.lastStutterTimestamp > 1000) {
          this.observer.onStutter()
          this.lastStutterTimestamp = getTimestamp()
        }
      }

      if (!this.firstRendered) {
        this.firstRendered = true
        this.observer.onFirstRendered()
      }
    }

    if (this.startTime === 0) {
      this.startTime = this.context.currentTime
    }
    bufferSource.start(this.startTime)

    if (this.dest) {
      bufferSource.connect(this.dest)
    }
    this.startTime += bufferSource.buffer.duration
    this.queue.push(bufferSource)
  }

  public connect(dest: AudioNode) {
    this.dest = dest
  }

  public disconnect() {
    for (let i = 0; i < this.queue.length; i++) {
      this.queue[i].disconnect()
    }
    this.dest = null
    this.queue.length = 0
  }

  private process() {
    if (this.buffer && !this.pause && this.buffered) {
      this.buffering()
      this.pull()
    }
  }
}
