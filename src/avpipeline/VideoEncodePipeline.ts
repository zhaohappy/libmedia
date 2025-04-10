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
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import { Mutex } from 'cheap/thread/mutex'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as logger from 'common/util/logger'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import { IOError } from 'common/io/error'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import * as object from 'common/util/object'
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
import isPointer from 'cheap/std/function/isPointer'
import { Data } from 'common/types/type'
import compileResource from 'avutil/function/compileResource'
import { mapFormat, videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'

export interface VideoEncodeTaskOptions extends TaskOptions {
  resource: ArrayBuffer | WebAssemblyResource
  resourceExtraData?: Data
  enableHardware: boolean
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>

  gop: int32
  preferWebCodecs?: boolean
}

type SelfTask = Omit<VideoEncodeTaskOptions, 'resource'> & {
  leftIPCPort: IPCPort
  rightIPCPort: IPCPort
  resource: WebAssemblyResource

  softwareEncoder: WasmVideoEncoder | WebVideoEncoder
  softwareEncoderOpened: boolean
  hardwareEncoder?: WebVideoEncoder
  targetEncoder: WasmVideoEncoder | WebVideoEncoder

  avpacketCaches: pointer<AVPacketRef>[]
  inputEnd: boolean
  encodeEnd: boolean

  parameters: pointer<AVCodecParameters>
  timeBase: Rational

  encoderFallbackReady: Promise<number>

  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool

  gopCounter: int32

  firstEncoded: boolean
  wasmEncoderOptions?: Data
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
          task.encoderFallbackReady = this.openSoftwareEncoder(task)
          logger.warn(`video encode error width hardware, taskId: ${task.taskId}, error: ${error}, try to fallback to software encoder`)
        }
        else {
          logger.error(`video encode error width hardware, taskId: ${task.taskId}, error: ${error}`)
        }
      },
      onReceiveAVPacket(avpacket) {
        task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
        task.stats.videoPacketEncodeCount++
      },
      enableHardwareAcceleration,
      avpacketPool: task.avpacketPool,
      avframePool: task.avframePool
    })
  }

  private createWasmcodecEncoder(task: SelfTask, resource: WebAssemblyResource) {
    return new WasmVideoEncoder({
      resource: task.resource,
      onReceiveAVPacket(avpacket) {
        task.avpacketCaches.push(reinterpret_cast<pointer<AVPacketRef>>(avpacket))
        task.stats.videoPacketEncodeCount++
      },
      avpacketPool: task.avpacketPool
    })
  }

  private async createTask(options: VideoEncodeTaskOptions): Promise<number> {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const avpacketCaches: pointer<AVPacketRef>[] = []

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)
    const avpacketPool = new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)

    const resource = await compileResource(options.resource, true)

    if (options.resourceExtraData) {
      object.extend(resource, options.resourceExtraData)
    }

    const task: SelfTask = {
      ...options,
      resource,
      leftIPCPort,
      rightIPCPort,
      softwareEncoder: null,
      hardwareEncoder: null,
      avpacketCaches,
      inputEnd: false,
      encodeEnd: false,
      targetEncoder: null,
      parameters: nullptr,
      timeBase: null,
      encoderFallbackReady: null,
      softwareEncoderOpened: false,
      gopCounter: 0,
      firstEncoded: false,

      avframePool,
      avpacketPool
    }

    task.softwareEncoder = task.resource
      ? this.createWasmcodecEncoder(task, task.resource)
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

    const caches: (pointer<AVFrameRef> | VideoFrame)[] = []

    let pullPadding: Promise<any>
    const MAX = 4

    async function pullAVFrame() {
      if (!task.inputEnd) {
        if (!caches.length) {
          if (pullPadding) {
            await pullPadding
          }
          const avframe = await leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull', {
            preferVideoFrame: task.targetEncoder instanceof WebVideoEncoder && task.firstEncoded
          })
          if (is.number(avframe) && avframe < 0) {
            task.inputEnd = true
          }
          caches.push(avframe)
        }
        if (caches.length < MAX && !pullPadding && task.firstEncoded) {
          pullPadding = leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull',  {
            preferVideoFrame: task.targetEncoder instanceof WebVideoEncoder && task.firstEncoded
          }).then((avframe) => {
            if (is.number(avframe) && avframe < 0) {
              task.inputEnd = true
            }
            caches.push(avframe)
            pullPadding = null
          })
        }
      }
      return caches.length ? caches.shift() : IOError.END as pointer<AVFrameRef>
    }

    rightIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (avpacketCaches.length) {
            const avpacket = avpacketCaches.shift()
            rightIPCPort.reply(request, avpacket)
            break
          }
          else if (!task.encodeEnd) {
            while (true) {
              if (avpacketCaches.length) {
                const avpacket = avpacketCaches.shift()
                rightIPCPort.reply(request, avpacket)
                break
              }

              if (task.encoderFallbackReady) {
                let ret = await task.encoderFallbackReady
                if (ret) {
                  if (task.targetEncoder === task.hardwareEncoder) {
                    task.targetEncoder = task.softwareEncoder
                    task.hardwareEncoder.close()
                    task.hardwareEncoder = null
                    ret = await this.openSoftwareEncoder(task)
                    logger.warn(`video encode error width hardware, taskId: ${task.taskId}, error: ${ret}, try to fallback to software encoder`)
                  }
                  if (ret) {
                    logger.info(`video encoder open error, taskId: ${task.taskId}`)
                    rightIPCPort.reply(request, errorType.CODEC_NOT_SUPPORT)
                    break
                  }
                }
                task.encoderFallbackReady = null
              }

              let avframe = await pullAVFrame()
              if (task.targetEncoder instanceof WasmVideoEncoder && avframe instanceof VideoFrame) {
                const frame = task.avframePool.alloc()
                await videoFrame2AVFrame(avframe, frame)
                avframe.close()
                avframe = frame
              }

              if (isPointer(avframe) || avframe instanceof VideoFrame) {
                let ret = (!task.firstEncoded && task.targetEncoder instanceof WasmVideoEncoder)
                  ? await task.targetEncoder.encodeAsync(avframe as pointer<AVFrame>, task.gopCounter === 0)
                  : task.targetEncoder.encode(avframe as pointer<AVFrame>, task.gopCounter === 0)
                if (ret < 0) {
                  task.stats.videoEncodeErrorFrameCount++
                  if (task.targetEncoder instanceof WebVideoEncoder && task.softwareEncoder) {

                    logger.warn(`video encode error from hardware, taskId: ${task.taskId}, error: ${ret}, try to fallback to software decoder`)

                    if (task.targetEncoder === task.hardwareEncoder) {
                      task.hardwareEncoder.close()
                      task.hardwareEncoder = null
                    }
                    else if (task.resource) {
                      task.softwareEncoder.close()
                      task.softwareEncoder = this.createWasmcodecEncoder(task, task.resource)
                      task.softwareEncoderOpened = false
                      task.firstEncoded = false
                      while (caches.length) {
                        if (caches[0] instanceof VideoFrame
                          && mapFormat(caches[0].format) !== task.parameters.format
                        ) {
                          caches.shift().close()
                        }
                        else {
                          break
                        }
                      }
                    }
                    else {
                      logger.error(`cannot fallback to wasm video encoder because of resource not found , taskId: ${options.taskId}`)
                      rightIPCPort.reply(request, errorType.CODEC_NOT_SUPPORT)
                      break
                    }
                    try {
                      await this.openSoftwareEncoder(task)
                      task.targetEncoder = task.softwareEncoder
                    }
                    catch (error) {
                      logger.error(`video software encoder open error, taskId: ${options.taskId}`)
                      rightIPCPort.reply(request, errorType.CODEC_NOT_SUPPORT)
                      break
                    }

                    task.gopCounter = 0

                    ret = task.targetEncoder instanceof WasmVideoEncoder
                      ? await task.targetEncoder.encodeAsync(avframe as pointer<AVFrame>, true)
                      : task.targetEncoder.encode(avframe, true)

                    if (ret < 0 && task.targetEncoder instanceof WebVideoEncoder && task.resource) {
                      logger.warn(`video encode error from webcodecs soft encoder, taskId: ${task.taskId}, error: ${ret}, try to fallback to wasm software encoder`)
                      task.softwareEncoder.close()
                      task.softwareEncoder = this.createWasmcodecEncoder(task, task.resource)
                      task.softwareEncoderOpened = false
                      task.firstEncoded = false
                      task.gopCounter = 0
                      try {
                        await this.openSoftwareEncoder(task)
                        task.targetEncoder = task.softwareEncoder
                      }
                      catch (error) {
                        logger.error(`video software encoder open error, taskId: ${options.taskId}`)
                        rightIPCPort.reply(request, errorType.CODEC_NOT_SUPPORT)
                        break
                      }
                      ret = await task.targetEncoder.encodeAsync(avframe as pointer<AVFrame>, true)
                    }
                  }
                  if (ret < 0) {
                    if (isPointer(avframe)) {
                      task.avframePool.release(avframe)
                    }
                    else {
                      avframe.close()
                    }
                    logger.error(`video encode error, taskId: ${options.taskId}, ret: ${ret}`)
                    rightIPCPort.reply(request, ret)
                    break
                  }
                }
                if (!task.firstEncoded
                  && (task.targetEncoder instanceof WebVideoEncoder
                    || !task.resourceExtraData.enableThreadPool
                    || !support.jspi
                    || task.targetEncoder.getChildThreadCount()
                  )
                ) {
                  task.firstEncoded = true
                }
                task.gopCounter++
                if (task.gopCounter === task.gop) {
                  task.gopCounter = 0
                }
                if (isPointer(avframe)) {
                  task.avframePool.release(avframe)
                }
                else {
                  avframe.close()
                }
                // 硬解队列中的 EncodedVideoChunk 过多会报错， 这里判断做一下延时
                while (task.targetEncoder instanceof WebVideoEncoder
                    && task.targetEncoder.getQueueLength() > 10
                // || task.targetEncoder instanceof WasmVideoEncoder
                    // && task.targetEncoder.getQueueLength() > 40
                ) {
                  await new Sleep(0)
                }
                continue
              }
              else {
                task.encodeEnd = true
                if (avframe === IOError.END) {
                  if (task.targetEncoder === task.hardwareEncoder) {
                    // 硬解的 flush 有时会卡主，这里设置 2 秒超时，若超时只能丢弃还未 flush 出来的帧了
                    let ret = await Promise.race([
                      new Sleep(2),
                      task.targetEncoder.flush()
                    ])
                    if (ret) {
                      logger.warn(`video hardware encoder flush failed, ignore it, taskId: ${task.taskId}`)
                    }
                  }
                  else {
                    await task.targetEncoder.flush()
                  }
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
        threadCount = Math.max(threadCount, navigator.hardwareConcurrency)
      }
      let ret = await task.softwareEncoder.open(parameters, task.timeBase, threadCount, task.wasmEncoderOptions)
      if (ret) {
        if ((task.softwareEncoder instanceof WebVideoEncoder) && task.resource) {

          logger.warn(`webcodecs software encoder open failed, error: ${ret}, try to fallback to wasm software encoder`)

          task.softwareEncoder.close()
          task.softwareEncoder = this.createWasmcodecEncoder(task, task.resource)
          ret = await task.softwareEncoder.open(parameters, task.timeBase, threadCount, task.wasmEncoderOptions)
          if (ret) {
            return ret
          }
          task.targetEncoder = task.softwareEncoder
        }
        else {
          return ret
        }
      }

      task.softwareEncoderOpened = true
      if (task.softwareEncoder instanceof WasmVideoEncoder) {
        task.firstEncoded = false
      }
    }
    return 0
  }

  public async open(taskId: string, codecpar: pointer<AVCodecParameters>, timeBase: Rational, wasmEncoderOptions: Data = {}) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.wasmEncoderOptions = wasmEncoderOptions

      if (task.preferWebCodecs
        && support.videoEncoder
        && WebVideoEncoder.isSupported(codecpar, false)
        && task.softwareEncoder instanceof WasmVideoEncoder
      ) {
        task.softwareEncoder.close()
        const softwareEncoder = this.createWebcodecEncoder(task, false)
        if (task.softwareEncoder === task.targetEncoder) {
          task.targetEncoder = softwareEncoder
        }
        task.softwareEncoder = softwareEncoder
      }

      return new Promise<number>(async (resolve, reject) => {
        if (task.hardwareEncoder) {
          let ret = await task.hardwareEncoder.open(codecpar, timeBase)
          if (ret) {
            logger.error(`cannot open hardware encoder, error: ${ret}`)
            task.hardwareEncoder.close()
            task.hardwareEncoder = null
            task.targetEncoder = task.softwareEncoder
          }
        }

        task.parameters = codecpar
        task.timeBase = timeBase

        if (task.targetEncoder === task.softwareEncoder) {
          let ret = await this.openSoftwareEncoder(task)
          if (ret) {
            logger.error(`open video software encoder failed, error: ${ret}`)
            if (!task.hardwareEncoder) {
              resolve(errorType.CODEC_NOT_SUPPORT)
              return
            }
          }
        }
        resolve(0)
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
      task.encodeEnd = false

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

  public async getColorSpace(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      return task.targetEncoder.getColorSpace()
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
