/*
 * libmedia AudioDecodePipeline
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

import Pipeline, { TaskOptions } from './Pipeline'
import * as error from 'avutil/error'
import IPCPort from 'common/network/IPCPort'
import { REQUEST, RpcMessage } from 'common/network/IPCPort'
import List from 'cheap/std/collection/List'
import { AVFrameRef } from 'avutil/struct/avframe'
import { Mutex } from 'cheap/thread/mutex'
import WasmAudioDecoder from 'avcodec/wasmcodec/AudioDecoder'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as logger from 'common/util/logger'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import { IOError } from 'common/io/error'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import WebAudioDecoder from 'avcodec/webcodec/AudioDecoder'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import * as array from 'common/util/array'
import getTimestamp from 'common/function/getTimestamp'
import { audioData2AVFrame } from 'avutil/function/audioData2AVFrame'
import * as errorType from 'avutil/error'
import { Data } from 'common/types/type'
import compileResource from 'avutil/function/compileResource'
import isPointer from 'cheap/std/function/isPointer'
import { AVCodecParametersSerialize, AVPacketSerialize, unserializeAVCodecParameters, unserializeAVPacket } from 'avutil/util/serialize'
import { avMallocz } from 'avutil/util/mem'
import { copyCodecParameters, freeCodecParameters } from 'avutil/util/codecparameters'
import * as is from 'common/util/is'

export interface AudioDecodeTaskOptions extends TaskOptions {
  resource: ArrayBuffer | WebAssemblyResource
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
}

type SelfTask = Omit<AudioDecodeTaskOptions, 'resource'> & {
  resource: WebAssemblyResource
  decoder: WasmAudioDecoder | WebAudioDecoder
  frameCaches: pointer<AVFrameRef>[]
  inputEnd: boolean
  parameters: pointer<AVCodecParameters>

  lastDecodeTimestamp: number

  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool

  wasmDecoderOptions?: Data

  pending?: Promise<void>
  pendingResolve?: () => void
}

export default class AudioDecodePipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createWebcodecDecoder(task: SelfTask) {
    return new WebAudioDecoder({
      onError: (error) => {
        logger.error(`audio decode error, taskId: ${task.taskId}, error: ${error}`)
      },
      onReceiveAudioData(audioData) {
        const avframe = audioData2AVFrame(audioData, task.avframePool.alloc())
        task.frameCaches.push(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        task.stats.audioFrameDecodeCount++
        task.stats.audioFrameDecodeIntervalMax = Math.max(
          getTimestamp() - task.lastDecodeTimestamp,
          task.stats.audioFrameDecodeIntervalMax
        )
        audioData.close()
      }
    })
  }

  private createWasmcodecDecoder(task: SelfTask, resource: WebAssemblyResource) {
    return new WasmAudioDecoder({
      resource: resource,
      onReceiveAVFrame(avframe) {
        task.frameCaches.push(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        task.stats.audioFrameDecodeCount++
        task.stats.audioFrameDecodeIntervalMax = Math.max(
          getTimestamp() - task.lastDecodeTimestamp,
          task.stats.audioFrameDecodeIntervalMax
        )
      },
      avframePool: task.avframePool
    })
  }

  private async pullAVPacketInternal(task: SelfTask, leftIPCPort: IPCPort) {
    const result = await leftIPCPort.request<pointer<AVPacketRef> | AVPacketSerialize>('pull')
    if (is.number(result) || isPointer(result)) {
      return result as pointer<AVPacketRef>
    }
    else {
      const avpacket = task.avpacketPool.alloc()
      unserializeAVPacket(result, avpacket)
      return avpacket
    }
  }

  private async createTask(options: AudioDecodeTaskOptions): Promise<number> {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const frameCaches: pointer<AVFrameRef>[] = []

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)

    const task: SelfTask = {
      ...options,
      resource: await compileResource(options.resource),
      frameCaches,
      inputEnd: false,
      decoder: null,
      parameters: nullptr,
      lastDecodeTimestamp: 0,

      avframePool,
      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex),
    }

    if (task.resource) {
      task.decoder = this.createWasmcodecDecoder(task, task.resource)
    }
    else {
      task.decoder = this.createWebcodecDecoder(task)
    }

    this.tasks.set(options.taskId, task)

    rightIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (frameCaches.length) {
            const frame = frameCaches.shift()
            rightIPCPort.reply(request, frame)
            break
          }
          else if (!task.inputEnd) {
            while (true) {
              if (frameCaches.length) {
                const frame = frameCaches.shift()
                rightIPCPort.reply(request, frame)
                break
              }

              if (task.pending) {
                await task.pending
              }

              task.lastDecodeTimestamp = getTimestamp()
              const avpacket = await this.pullAVPacketInternal(task, leftIPCPort)

              if (avpacket === IOError.END) {
                await task.decoder.flush()
                task.inputEnd = true
                if (frameCaches.length) {
                  const frame = frameCaches.shift()
                  rightIPCPort.reply(request, frame)
                  break
                }
                else {
                  logger.info(`audio decoder ended, taskId: ${task.taskId}`)
                  rightIPCPort.reply(request, IOError.END)
                  break
                }
              }
              else if (avpacket > 0) {

                const ret = task.decoder.decode(avpacket)

                task.avpacketPool.release(avpacket)

                if (ret < 0) {
                  task.stats.audioDecodeErrorPacketCount++
                  logger.error(`audio decode error, taskId: ${options.taskId}, ret: ${ret}`)
                }
                continue
              }
              else {
                logger.error(`audio decode pull avpacket error, taskId: ${options.taskId}, ret: ${avpacket}`)
                rightIPCPort.reply(request, avpacket)
                break
              }
            }
            break
          }
          rightIPCPort.reply(request, IOError.END)
          break
        }
      }
    })

    return 0
  }

  public async open(taskId: string, parameters: AVCodecParametersSerialize | pointer<AVCodecParameters>, wasmDecoderOptions: Data = {}) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.wasmDecoderOptions = wasmDecoderOptions
      const codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMallocz(sizeof(AVCodecParameters)))
      if (isPointer(parameters)) {
        copyCodecParameters(codecpar, parameters)
      }
      else {
        unserializeAVCodecParameters(parameters, codecpar)
      }
      if (task.parameters) {
        freeCodecParameters(task.parameters)
      }
      task.parameters = codecpar
      return new Promise<number>(async (resolve, reject) => {
        const ret = await task.decoder.open(codecpar, task.wasmDecoderOptions)
        if (ret) {
          logger.error(`open audio decoder failed, error: ${ret}`)
          resolve(errorType.CODEC_NOT_SUPPORT)
          return
        }
        resolve(0)
      })
    }
    logger.fatal('task not found')
  }

  public async beforeReopenDecoder(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.pending = new Promise<void>((resolve) => {
        task.pendingResolve = resolve
      })
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async reopenDecoder(
    taskId: string,
    parameters: AVCodecParametersSerialize | pointer<AVCodecParameters>,
    resource?: string | ArrayBuffer | WebAssemblyResource,
    wasmDecoderOptions?: Data
  ) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (wasmDecoderOptions) {
        task.wasmDecoderOptions = wasmDecoderOptions
      }
      const codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMallocz(sizeof(AVCodecParameters)))
      if (isPointer(parameters)) {
        copyCodecParameters(codecpar, parameters)
      }
      else {
        unserializeAVCodecParameters(parameters, codecpar)
      }
      if (task.parameters) {
        freeCodecParameters(task.parameters)
      }
      task.parameters = codecpar
      let decoder: WasmAudioDecoder | WebAudioDecoder
      if (resource) {
        resource = await compileResource(resource)
        decoder = this.createWasmcodecDecoder(task, resource)
      }
      else {
        decoder = this.createWebcodecDecoder(task)
      }
      return new Promise<number>(async (resolve, reject) => {
        const ret = await decoder.open(codecpar)
        if (ret) {
          logger.error(`reopen audio decoder failed, error: ${ret}`)
          resolve(errorType.CODEC_NOT_SUPPORT)
          return
        }
        if (resource) {
          task.resource = resource as WebAssemblyResource
        }
        task.decoder.close()
        task.decoder = decoder

        logger.debug(`reopen audio decoder, taskId: ${task.taskId}`)
        resolve(0)
        if (task.pendingResolve) {
          task.pendingResolve()
          task.pending = null
        }
      })
    }
    logger.fatal('task not found')
  }

  public async resetTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.decoder) {
        await task.decoder.flush()
      }
      array.each(task.frameCaches, (frame) => {
        task.avframePool.release(frame)
      })
      task.frameCaches.length = 0
      task.inputEnd = false
      task.lastDecodeTimestamp = getTimestamp()

      logger.info(`reset audio decoder, taskId: ${task.taskId}`)
    }
  }

  public async registerTask(options: AudioDecodeTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return error.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.rightPort.close()
      task.leftPort.close()
      task.decoder.close()
      task.frameCaches.forEach((frame) => {
        task.avframePool.release(frame)
      })
      if (task.parameters) {
        freeCodecParameters(task.parameters)
      }
      this.tasks.delete(taskId)
    }
  }
}
