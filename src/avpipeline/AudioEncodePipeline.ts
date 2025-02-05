/*
 * libmedia AudioEncodePipeline
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

import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import Pipeline, { TaskOptions } from './Pipeline'
import List from 'cheap/std/collection/List'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { Mutex } from 'cheap/thread/mutex'
import { AVFrameRef } from 'avutil/struct/avframe'
import WasmAudioEncoder from 'avcodec/wasmcodec/AudioEncoder'
import WebAudioEncoder from 'avcodec/webcodec/AudioEncoder'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import IPCPort, { REQUEST, RpcMessage } from 'common/network/IPCPort'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import * as array from 'common/util/array'
import * as error from 'avutil/error'
import Sleep from 'common/timer/Sleep'
import { Rational } from 'avutil/struct/rational'
import * as errorType from 'avutil/error'
import isPointer from 'cheap/std/function/isPointer'
import { Data } from 'common/types/type'
import compileResource from 'avutil/function/compileResource'

export interface AudioEncodeTaskOptions extends TaskOptions {
  resource: ArrayBuffer | WebAssemblyResource
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
}

type SelfTask = Omit<AudioEncodeTaskOptions, 'resource'> & {
  encoder: WasmAudioEncoder | WebAudioEncoder
  resource: WebAssemblyResource
  avpacketCaches: pointer<AVPacketRef>[]
  parameters: pointer<AVCodecParameters>
  inputEnd: boolean
  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool
  wasmEncoderOptions?: Data
}

export default class AudioEncodePipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createWebcodecEncoder(task: SelfTask) {
    return new WebAudioEncoder({
      onError: (error) => {
        logger.error(`audio encode error, taskId: ${task.taskId}, error: ${error}`)
      },
      onReceiveAVPacket(avpacket) {
        task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
        task.stats.audioPacketEncodeCount++
      },
      avpacketPool: task.avpacketPool,
      avframePool: task.avframePool
    })
  }

  private async createTask(options: AudioEncodeTaskOptions): Promise<number> {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const avpacketCaches: pointer<AVPacketRef>[] = []

    const avpacketPool = new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)

    const task: SelfTask = {
      ...options,
      resource: await compileResource(options.resource),
      avpacketCaches,
      encoder: null,
      inputEnd: false,
      parameters: nullptr,

      avframePool: new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex),
      avpacketPool
    }

    if (task.resource) {
      task.encoder = new WasmAudioEncoder({
        resource: task.resource,
        onReceiveAVPacket(avpacket) {
          task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
          task.stats.audioPacketEncodeCount++
        },
        avpacketPool: avpacketPool
      })
    }
    else {
      task.encoder = this.createWebcodecEncoder(task)
    }

    this.tasks.set(options.taskId, task)

    rightIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (avpacketCaches.length) {
            const avpacket = avpacketCaches.shift()
            rightIPCPort.reply(request, avpacket)
            break
          }
          else if (!task.inputEnd) {
            while (true) {
              if (avpacketCaches.length) {
                const avpacket = avpacketCaches.shift()
                rightIPCPort.reply(request, avpacket)
                break
              }

              const avframe = await leftIPCPort.request<pointer<AVFrameRef> | AudioData>('pull')

              if (isPointer(avframe) || avframe instanceof AudioData) {
                const ret = task.encoder.encode(avframe)
                if (isPointer(avframe)) {
                  task.avframePool.release(avframe)
                }
                else {
                  avframe.close()
                }
                if (ret < 0) {
                  task.stats.audioEncodeErrorFrameCount++
                  logger.error(`audio encode error, taskId: ${options.taskId}, ret: ${ret}`)
                  rightIPCPort.reply(request, ret)
                  break
                }
                // 硬解队列中的 EncodedVideoChunk 过多会报错， 这里判断做一下延时
                while (task.encoder instanceof WebAudioEncoder
                  && task.encoder.getQueueLength() > 4
                ) {
                  await new Sleep(0)
                }
                continue
              }
              else {
                if (avframe === IOError.END) {
                  await task.encoder.flush()
                  task.inputEnd = true
                  if (avpacketCaches.length) {
                    const avpacket = avpacketCaches.shift()
                    rightIPCPort.reply(request, avpacket)
                    break
                  }
                  else {
                    logger.info(`audio encoder ended, taskId: ${task.taskId}`)
                    rightIPCPort.reply(request, IOError.END)
                    break
                  }
                }
                else {
                  logger.error(`audio encoder pull avpacket error, taskId: ${options.taskId}, ret: ${avframe}`)
                  rightIPCPort.reply(request, avframe)
                  break
                }
              }
            }
            break
          }
          logger.info(`audio encoder ended, taskId: ${task.taskId}`)
          rightIPCPort.reply(request, IOError.END)
          break
        }
      }
    })

    return 0
  }

  public async open(taskId: string, parameters: pointer<AVCodecParameters>, timeBase: Rational, wasmEncoderOptions: Data = {}) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.wasmEncoderOptions = wasmEncoderOptions
      return new Promise<number>(async (resolve, reject) => {
        const ret = await task.encoder.open(parameters, timeBase, task.wasmEncoderOptions)
        if (ret) {
          logger.error(`open audio encoder failed, error: ${ret}`)
          resolve(errorType.CODEC_NOT_SUPPORT)
          return
        }
        task.parameters = parameters
        resolve(0)
      })
    }
    logger.fatal('task not found')
  }

  public async getExtraData(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      return task.encoder.getExtraData()
    }
    logger.fatal('task not found')
  }

  public async resetTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.encoder) {
        await task.encoder.flush()
      }
      array.each(task.avpacketCaches, (avpacket) => {
        task.avpacketPool.release(avpacket)
      })
      task.avpacketCaches.length = 0
      task.inputEnd = false

      logger.info(`reset audio encoder, taskId: ${task.taskId}`)
    }
  }

  public async registerTask(options: AudioEncodeTaskOptions): Promise<number> {
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
      task.encoder.close()
      task.avpacketCaches.forEach((avpacket) => {
        task.avpacketPool.release(avpacket)
      })
      this.tasks.delete(taskId)
    }
  }
}
