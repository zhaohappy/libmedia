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
import { Rational } from 'avutil/struct/rational'
import WebAudioDecoder from 'avcodec/webcodec/AudioDecoder'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import * as array from 'common/util/array'
import getTimestamp from 'common/function/getTimestamp'

export interface AudioDecodeTaskOptions extends TaskOptions {
  resource: WebAssemblyResource
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
}

type SelfTask = AudioDecodeTaskOptions & {
  decoder: WasmAudioDecoder | WebAudioDecoder
  frameCaches: pointer<AVFrameRef>[]
  inputEnd: boolean
  openReject?: (error: Error) => void

  lastDecodeTimestamp: number

  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool
}

export default class AudioDecodePipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createTask(options: AudioDecodeTaskOptions): number {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const frameCaches: pointer<AVFrameRef>[] = []

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)

    const decoder = new WasmAudioDecoder({
      resource: options.resource,
      onError: (error) => {
        logger.error(`audio decode error, taskId: ${options.taskId}, error: ${error}`)
        const task = this.tasks.get(options.taskId)
        if (task.openReject) {
          task.openReject(error)
          task.openReject = null
        }
      },
      onReceiveFrame(frame) {
        frameCaches.push(reinterpret_cast<pointer<AVFrameRef>>(frame))
        task.stats.audioFrameDecodeCount++
        if (task.lastDecodeTimestamp) {
          task.stats.audioFrameDecodeIntervalMax = Math.max(
            getTimestamp() - task.lastDecodeTimestamp,
            task.stats.audioFrameDecodeIntervalMax
          )
        }
        task.lastDecodeTimestamp = getTimestamp()
      },
      avframePool: avframePool
    })

    // const decoder = new WebAudioDecoder({
    //   onError: (error) => {
    //     logger.error(`audio decode error, taskId: ${options.taskId}, error: ${error}`)
    //     const task = this.tasks.get(options.taskId)
    //     if (task.openReject) {
    //       task.openReject(error)
    //       task.openReject = null
    //     }
    //   },
    //   onReceiveFrame(frame) {
    //     logger.info(`receive audio frame, pts: ${frame.timestamp}`)
    //     frame.close()
    //     // frameCaches.push(reinterpret_cast<pointer<AVFrameRef>>(frame))
    //   },
    // })

    const task: SelfTask = {
      ...options,
      frameCaches,
      inputEnd: false,
      decoder,
      lastDecodeTimestamp: 0,

      avframePool,
      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)
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

              const avpacket = await leftIPCPort.request<pointer<AVPacketRef>>('pull')

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
                  rightIPCPort.reply(request, ret)
                  break
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

  public async open(taskId: string, parameters: pointer<AVCodecParameters>, timeBase: pointer<Rational>) {
    const task = this.tasks.get(taskId)
    if (task) {
      return new Promise<void>(async (resolve, reject) => {
        task.openReject = reject
        await task.decoder.open(parameters)
        resolve()
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
      this.tasks.delete(taskId)
    }
  }
}
