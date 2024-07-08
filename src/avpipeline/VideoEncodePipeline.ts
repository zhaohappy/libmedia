/*
 * libmedia VideoEncodePipeline
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
import * as errorType from 'avutil/error'
import IPCPort from 'common/network/IPCPort'
import { REQUEST, RpcMessage } from 'common/network/IPCPort'
import List from 'cheap/std/collection/List'
import { AVFrameRef } from 'avutil/struct/avframe'
import { Mutex } from 'cheap/thread/mutex'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as logger from 'common/util/logger'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import { IOError } from 'common/io/error'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import Sleep from 'common/timer/Sleep'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import isWorker from 'common/function/isWorker'
import { AVCodecID } from 'avutil/codec'
import { avQ2D } from 'avutil/util/rational'
import support from 'common/util/support'
import WasmVideoEncoder from 'avcodec/wasmcodec/VideoEncoder'
import WebVideoEncoder from 'avcodec/webcodec/VideoEncoder'
import { Rational } from 'avutil/struct/rational'

export interface VideoEncodeTaskOptions extends TaskOptions {
  resource: WebAssemblyResource
  enableHardware: boolean
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>

  gop: int32
}

type SelfTask = VideoEncodeTaskOptions & {
  leftIPCPort: IPCPort
  rightIPCPort: IPCPort

  softwareEncoder: WasmVideoEncoder | WebVideoEncoder
  softwareEncoderOpened: boolean
  hardwareEncoder?: WebVideoEncoder
  targetEncoder: WasmVideoEncoder | WebVideoEncoder

  avpacketCaches: pointer<AVPacketRef>[]
  inputEnd: boolean

  openReject?: (error: Error) => void

  parameters: pointer<AVCodecParameters>
  timeBase: Rational

  encoderReady: Promise<void>

  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool

  gopCounter: int32
}

export interface VideoEncodeTaskInfo {
  codecId: AVCodecID
  width: int32
  height: int32
  framerate: float
  hardware: boolean
}

export default class VideoEncodePipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createWebcodecEncoder(task: SelfTask, enableHardwareAcceleration: boolean = true) {
    return new WebVideoEncoder({
      onError: (error) => {
        if (task.targetEncoder === task.hardwareEncoder) {
          task.targetEncoder = task.softwareEncoder
          task.hardwareEncoder.close()
          task.hardwareEncoder = null
          task.encoderReady = this.openSoftwareEncoder(task)
          logger.warn(`video encode error width hardware, taskId: ${task.taskId}, error: ${error}, try to fallback to software encoder`)
        }
      },
      onReceivePacket(avpacket, avframe) {
        task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
        task.stats.videoPacketEncodeCount++
        if (avframe) {
          task.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe))
        }
      },
      enableHardwareAcceleration,
      avpacketPool: task.avpacketPool,
      avframePool: task.avframePool
    })
  }

  private createTask(options: VideoEncodeTaskOptions): number {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const avpacketCaches: pointer<AVPacketRef>[] = []

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)
    const avpacketPool = new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)

    const task: SelfTask = {
      ...options,
      leftIPCPort,
      rightIPCPort,
      softwareEncoder: null,
      hardwareEncoder: null,
      avpacketCaches,
      inputEnd: false,
      targetEncoder: null,
      parameters: nullptr,
      timeBase: null,
      encoderReady: null,
      softwareEncoderOpened: false,
      gopCounter: 0,

      avframePool,
      avpacketPool
    }

    task.softwareEncoder = options.resource
      ? new WasmVideoEncoder({
        resource: options.resource,
        onError: (error) => {
          logger.error(`video encode error, taskId: ${options.taskId}, error: ${error}`)
          const task = this.tasks.get(options.taskId)
          if (task.openReject) {
            task.openReject(error)
            task.openReject = null
          }
        },
        onReceiveAVPacket(avpacket) {
          task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
          task.stats.videoPacketEncodeCount++
        },
        avpacketPool
      })
      : (support.videoEncoder ? this.createWebcodecEncoder(task, false) : null)

    if (!task.softwareEncoder) {
      logger.error('software encoder not support')
      return errorType.INVALID_OPERATE
    }

    if (support.videoEncoder && options.enableHardware) {
      task.hardwareEncoder = this.createWebcodecEncoder(task)
    }

    task.targetEncoder = task.hardwareEncoder || task.softwareEncoder

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

              if (task.encoderReady) {
                await task.encoderReady
                task.encoderReady = null
              }

              const avframe = await leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

              if (!is.number(avframe) || avframe > 0) {
                let ret = task.targetEncoder.encode(avframe, task.gopCounter === 0)
                if (ret < 0) {
                  task.stats.videoEncodeErrorFrameCount++
                  if (task.targetEncoder === task.hardwareEncoder && task.softwareEncoder) {
                    task.targetEncoder = task.softwareEncoder
                    task.hardwareEncoder.close()
                    task.hardwareEncoder = null
                    await this.openSoftwareEncoder(task)

                    logger.warn(`video encode error width hardware, taskId: ${task.taskId}, error: ${ret}, try to fallback to software encode`)

                    ret = task.targetEncoder.encode(avframe, task.gopCounter === 0)
                  }
                  if (ret < 0) {
                    if (is.number(avframe)) {
                      task.avframePool.release(avframe)
                    }
                    logger.error(`video encode error, taskId: ${options.taskId}, ret: ${ret}`)
                    rightIPCPort.reply(request, ret)
                    break
                  }
                }
                task.gopCounter++
                if (task.gopCounter === task.gop) {
                  task.gopCounter = 0
                }
                if (is.number(avframe)) {
                  task.avframePool.release(avframe)
                }
                else {
                  avframe.close()
                }
                // 硬解队列中的 EncodedVideoChunk 过多会报错， 这里判断做一下延时
                while (task.targetEncoder instanceof WebVideoEncoder
                  && task.targetEncoder.getQueueLength() > 10
                ) {
                  await new Sleep(0)
                }
                continue
              }
              else {
                if (avframe === IOError.END) {
                  if (task.targetEncoder === task.hardwareEncoder) {
                    // 硬解的 flush 有时会卡主，这里设置 2 秒超时，若超时只能丢弃还未 flush 出来的帧了
                    let ret = await Promise.race([
                      new Sleep(2),
                      task.targetEncoder.flush()
                    ])
                    if (is.number(ret)) {
                      logger.warn(`video hardware encoder flush failed, ignore it, taskId: ${task.taskId}`)
                    }
                  }
                  else {
                    await task.targetEncoder.flush()
                  }
                  task.inputEnd = true
                  // 等待 flush 出的帧入队
                  if (task.targetEncoder === task.hardwareEncoder) {
                    await new Sleep(0)
                  }
                  if (avpacketCaches.length) {
                    const avpacket = avpacketCaches.shift()
                    rightIPCPort.reply(request, avpacket)
                    break
                  }
                  else {
                    logger.info(`video encoder ended, taskId: ${task.taskId}`)
                    rightIPCPort.reply(request, IOError.END)
                    break
                  }
                }
                else {
                  logger.error(`video encoder pull avframe error, taskId: ${options.taskId}, ret: ${avframe}`)
                  rightIPCPort.reply(request, avframe)
                  break
                }
              }
            }
            break
          }
          logger.info(`video encoder ended, taskId: ${task.taskId}`)
          rightIPCPort.reply(request, IOError.END)
          break
        }
      }
    })

    return 0
  }

  private async openSoftwareEncoder(task: SelfTask) {
    if (task.softwareEncoder && !task.softwareEncoderOpened) {
      const parameters = task.parameters
      let threadCount = 1
      if (isWorker()) {
        threadCount = Math.max(threadCount, navigator.hardwareConcurrency - 2)
      }
      await task.softwareEncoder.open(parameters, task.timeBase ,threadCount)
      task.softwareEncoderOpened = true
    }
  }

  public async open(taskId: string, parameters: pointer<AVCodecParameters>, timeBase: Rational) {
    const task = this.tasks.get(taskId)
    if (task) {
      return new Promise<void>(async (resolve, reject) => {
        task.openReject = reject
        if (task.hardwareEncoder) {
          try {
            await task.hardwareEncoder.open(parameters, timeBase)
          }
          catch (error) {
            logger.error(`cannot open hardware encoder, ${error}`)
            task.hardwareEncoder.close()
            task.hardwareEncoder = null
            task.targetEncoder = task.softwareEncoder
          }
        }

        task.parameters = parameters
        task.timeBase = timeBase

        if (task.targetEncoder === task.softwareEncoder) {
          await this.openSoftwareEncoder(task)
        }

        resolve()
      })
    }
    logger.fatal('task not found')
  }

  public async resetTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.targetEncoder === task.softwareEncoder) {
        await task.targetEncoder.flush()
      }
      // webcodec flush 有可能会卡主，这里重新创建编码器
      else if (task.targetEncoder === task.hardwareEncoder) {
        task.hardwareEncoder.close()
        task.hardwareEncoder = this.createWebcodecEncoder(task)
        await task.hardwareEncoder.open(task.parameters, task.timeBase)
        task.targetEncoder = task.hardwareEncoder
      }
      array.each(task.avpacketCaches, (avpacket) => {
        task.avpacketPool.release(avpacket)
      })
      task.avpacketCaches.length = 0
      task.inputEnd = false

      logger.info(`reset video encode, taskId: ${task.taskId}`)
    }
  }

  public async getExtraData(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      return task.targetEncoder.getExtraData()
    }
    logger.fatal('task not found')
  }

  public async registerTask(options: VideoEncodeTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return errorType.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.rightPort.close()
      task.leftPort.close()
      if (task.softwareEncoder) {
        task.softwareEncoder.close()
      }
      if (task.hardwareEncoder) {
        task.hardwareEncoder.close()
      }
      array.each(task.avpacketCaches, (avpacket) => {
        task.avpacketPool.release(avpacket)
      })
      this.tasks.delete(taskId)
    }
  }

  public async getTasksInfo() {
    const info: VideoEncodeTaskInfo[] = []
    this.tasks.forEach((task) => {
      info.push({
        codecId: task.parameters.codecId,
        width: task.parameters.width,
        height: task.parameters.height,
        framerate: avQ2D(task.parameters.framerate),
        hardware: task.targetEncoder === task.hardwareEncoder
      })
    })
    return info
  }
}
