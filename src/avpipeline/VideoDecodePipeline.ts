/*
 * libmedia VideoDecodePipeline
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
import WasmVideoDecoder, { AVDiscard } from 'avcodec/wasmcodec/VideoDecoder'
import WebVideoDecoder from 'avcodec/webcodec/VideoDecoder'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as logger from 'common/util/logger'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import { IOError } from 'common/io/error'
import { AVPacketFlags, AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import Sleep from 'common/timer/Sleep'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import isWorker from 'common/function/isWorker'
import { AVCodecID } from 'avutil/codec'
import { avQ2D, avRescaleQ } from 'avutil/util/rational'
import getTimestamp from 'common/function/getTimestamp'
import { AV_MILLI_TIME_BASE_Q } from 'avutil/constant'

export interface VideoDecodeTaskOptions extends TaskOptions {
  resource: WebAssemblyResource
  enableHardware: boolean
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
}

type SelfTask = VideoDecodeTaskOptions & {
  leftIPCPort: IPCPort
  rightIPCPort: IPCPort

  softwareDecoder: WasmVideoDecoder
  softwareDecoderOpened: boolean
  hardwareDecoder?: WebVideoDecoder
  targetDecoder: WasmVideoDecoder | WebVideoDecoder

  frameCaches: (pointer<AVFrameRef> | VideoFrame)[]
  inputEnd: boolean

  openReject?: (error: Error) => void

  needKeyFrame: boolean

  parameters: pointer<AVCodecParameters>

  hardwareRetryCount: number

  lastDecodeTimestamp: number

  firstDecoded: boolean

  decoderReady: Promise<void>

  avframePool: AVFramePoolImpl
  avpacketPool: AVPacketPool
}

export interface VideoDecodeTaskInfo {
  codecId: AVCodecID
  width: int32
  height: int32
  framerate: float
  hardware: boolean
}

export default class VideoDecodePipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createHardwareDecoder(task: SelfTask) {
    return new WebVideoDecoder({
      onError: (error) => {
        if (task.hardwareRetryCount > 3 || !task.firstDecoded) {
          task.targetDecoder = task.softwareDecoder
          task.hardwareDecoder.close()
          task.hardwareDecoder = null
          task.decoderReady = this.openSoftwareDecoder(task)
          logger.warn(`video decode error width hardware(${task.hardwareRetryCount}), taskId: ${task.taskId}, error: ${error}, try to fallback to software decoder`)
        }
        else {
          task.hardwareRetryCount++
          try {
            logger.info(`retry open hardware decoder(${task.hardwareRetryCount}), taskId: ${task.taskId}`)
            task.decoderReady = task.hardwareDecoder.open(task.parameters)
          }
          catch (error) {
            logger.warn(`retry open hardware decoder failed, fallback to software decoder, taskId: ${task.taskId}`)
          }
        }
        task.needKeyFrame = true
        task.leftIPCPort.request('requestKeyframe')
      },
      onReceiveFrame(frame) {
        task.firstDecoded = true
        task.frameCaches.push(frame)
        task.stats.videoFrameDecodeCount++
        if (task.lastDecodeTimestamp) {
          task.stats.videoFrameDecodeIntervalMax = Math.max(
            getTimestamp() - task.lastDecodeTimestamp,
            task.stats.videoFrameDecodeIntervalMax
          )
        }
        task.lastDecodeTimestamp = getTimestamp()
      },
      enableHardwareAcceleration: true
    })
  }

  private createTask(options: VideoDecodeTaskOptions): number {

    assert(options.leftPort)
    assert(options.rightPort)

    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const frameCaches: (pointer<AVFrameRef> | VideoFrame)[] = []

    const avframePool = new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)

    const softwareDecoder = new WasmVideoDecoder({
      resource: options.resource,
      onError: (error) => {
        logger.error(`video decode error, taskId: ${options.taskId}, error: ${error}`)
        const task = this.tasks.get(options.taskId)
        if (task.openReject) {
          task.openReject(error)
          task.openReject = null
        }
      },
      onReceiveFrame(frame) {
        task.firstDecoded = true
        frameCaches.push(reinterpret_cast<pointer<AVFrameRef>>(frame))
        task.stats.videoFrameDecodeCount++
        if (task.lastDecodeTimestamp) {
          task.stats.videoFrameDecodeIntervalMax = Math.max(
            getTimestamp() - task.lastDecodeTimestamp,
            task.stats.videoFrameDecodeIntervalMax
          )
        }
        task.lastDecodeTimestamp = getTimestamp()
      },
      avframePool: avframePool
    })

    const task: SelfTask = {
      ...options,
      leftIPCPort,
      rightIPCPort,
      softwareDecoder,
      hardwareDecoder: null,
      frameCaches,
      inputEnd: false,
      targetDecoder: null,
      needKeyFrame: true,
      parameters: nullptr,
      hardwareRetryCount: 0,
      lastDecodeTimestamp: 0,
      firstDecoded: false,
      decoderReady: null,
      softwareDecoderOpened: false,

      avframePool,
      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)
    }

    if (typeof VideoDecoder === 'function' && options.enableHardware) {
      task.hardwareDecoder = this.createHardwareDecoder(task)
    }

    task.targetDecoder = task.hardwareDecoder || task.softwareDecoder

    this.tasks.set(options.taskId, task)

    rightIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (frameCaches.length) {
            const frame = frameCaches.shift()
            rightIPCPort.reply(request, frame, null, is.number(frame) ? null : [frame])
            break
          }
          else if (!task.inputEnd) {
            while (true) {
              if (frameCaches.length) {
                const frame = frameCaches.shift()
                rightIPCPort.reply(request, frame, null, is.number(frame) ? null : [frame])
                break
              }

              if (task.decoderReady) {
                await task.decoderReady
                task.decoderReady = null
              }

              const avpacket = await leftIPCPort.request<pointer<AVPacketRef>>('pull')

              if (avpacket === IOError.END) {
                if (task.targetDecoder === task.hardwareDecoder) {
                  // 硬解的 flush 有时会卡主，这里设置 2 秒超时，若超时只能丢弃还未 flush 出来的帧了
                  let ret = await Promise.race([
                    new Sleep(2),
                    task.targetDecoder.flush()
                  ])
                  if (is.number(ret)) {
                    logger.warn(`video hardware decoder flush failed, ignore it, taskId: ${task.taskId}`)
                  }
                }
                else {
                  await task.targetDecoder.flush()
                }
                task.inputEnd = true
                // 等待 flush 出的帧入队
                if (task.targetDecoder === task.hardwareDecoder) {
                  await new Sleep(0)
                }
                if (frameCaches.length) {
                  const frame = frameCaches.shift()
                  rightIPCPort.reply(request, frame, null, task.targetDecoder === task.hardwareDecoder ? [frame] : null)
                  break
                }
                else {
                  logger.info(`video decoder ended, taskId: ${task.taskId}`)
                  rightIPCPort.reply(request, IOError.END)
                  break
                }
              }
              else if (avpacket > 0) {
                if (task.needKeyFrame) {
                  if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
                    task.needKeyFrame = false
                  }
                  else {
                    // 需要关键帧但不是，跳过继续请求新的 avpacket
                    if (defined(ENABLE_LOG_TRACE)) {
                      logger.trace(`skip the packet because of not got one keyframe, dts: ${avpacket.dts}(${
                        avRescaleQ(avpacket.dts, avpacket.timeBase, AV_MILLI_TIME_BASE_Q)
                      }ms) taskId: ${task.taskId}`)
                    }
                    task.avpacketPool.release(avpacket)
                    continue
                  }
                }
                let ret = task.targetDecoder.decode(avpacket)
                if (ret < 0) {
                  task.stats.videoDecodeErrorPacketCount++
                  if (task.targetDecoder === task.hardwareDecoder && task.softwareDecoder) {
                    task.targetDecoder = task.softwareDecoder
                    task.hardwareDecoder.close()
                    task.hardwareDecoder = null
                    await this.openSoftwareDecoder(task)
                    logger.warn(`video decode error width hardware, taskId: ${task.taskId}, error: ${ret}, try to fallback to software decoder`)
                    if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
                      ret = task.targetDecoder.decode(avpacket)
                      if (ret >= 0) {
                        task.avpacketPool.release(avpacket)
                        continue
                      }
                    }
                    else {
                      task.avpacketPool.release(avpacket)
                      task.needKeyFrame = true
                      task.leftIPCPort.request('requestKeyframe')
                      continue
                    }
                  }
                  task.avpacketPool.release(avpacket)
                  logger.error(`video decode error, taskId: ${options.taskId}, ret: ${ret}`)
                  rightIPCPort.reply(request, ret)
                  break
                }
                task.avpacketPool.release(avpacket)
                // 硬解队列中的 EncodedVideoChunk 过多会报错， 这里判断做一下延时
                while (task.targetDecoder === task.hardwareDecoder
                  && task.hardwareDecoder.getQueueLength() > 20
                ) {
                  await new Sleep(0)
                }
                continue
              }
              else {
                logger.error(`video decode pull avpacket error, taskId: ${options.taskId}, ret: ${avpacket}`)
                rightIPCPort.reply(request, avpacket)
                break
              }
            }
            break
          }
          logger.info(`video decoder ended, taskId: ${task.taskId}`)
          rightIPCPort.reply(request, IOError.END)
          break
        }
      }
    })

    return 0
  }

  private async openSoftwareDecoder(task: SelfTask) {
    if (task.softwareDecoder && !task.softwareDecoderOpened) {
      const parameters = task.parameters
      let threadCount = 1

      if (isWorker()) {
        // 不能设置 3 线程，会出现 bug
        let pixels = parameters.width * parameters.height
        let framerate = avQ2D(parameters.framerate)
        if (pixels >= 1920 * 1080 && pixels <= 2048 * 1080) {
          if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || parameters.codecId === AVCodecID.AV_CODEC_ID_AV1
          ) {
            threadCount = 2
          }
          if (framerate > 30) {
            threadCount = 2
            if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
              || parameters.codecId === AVCodecID.AV_CODEC_ID_AV1
            ) {
              threadCount = 4
            }
          }
          else if (framerate > 60) {
            threadCount = 4
            if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
              || parameters.codecId === AVCodecID.AV_CODEC_ID_AV1
            ) {
              threadCount = 6
            }
          }
        }
        else if (pixels > 2048 * 1080 && pixels <= 3840 * 2160) {
          threadCount = 4
          if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || parameters.codecId === AVCodecID.AV_CODEC_ID_AV1
          ) {
            threadCount = 6
          }
        }
        else if (pixels > 3840 * 2160) {
          threadCount = 6
          if (parameters.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || parameters.codecId === AVCodecID.AV_CODEC_ID_AV1
          ) {
            threadCount = 8
          }
        }
        threadCount = Math.min(threadCount, navigator.hardwareConcurrency)
      }
      await task.softwareDecoder.open(parameters, threadCount)
      task.softwareDecoderOpened = true
    }
  }

  public async open(taskId: string, parameters: pointer<AVCodecParameters>, timeBase: pointer<Rational>) {
    const task = this.tasks.get(taskId)
    if (task) {
      return new Promise<void>(async (resolve, reject) => {
        task.openReject = reject
        if (task.hardwareDecoder) {
          try {
            await task.hardwareDecoder.open(parameters)
          }
          catch (error) {
            logger.error(`cannot open hardware decoder, ${error}`)
            task.hardwareDecoder.close()
            task.hardwareDecoder = null
            task.targetDecoder = task.softwareDecoder
          }
        }

        task.parameters = parameters

        if (task.targetDecoder === task.softwareDecoder) {
          await this.openSoftwareDecoder(task)
        }

        resolve()
      })
    }
    logger.fatal('task not found')
  }

  public async setPlayRate(taskId: string, rate: double) {
    const task = this.tasks.get(taskId)
    if (task && task.softwareDecoder) {
      let discard = AVDiscard.AVDISCARD_NONE
      let framerate = avQ2D(task.parameters.framerate)
      if (framerate >= 120) {
        if (rate <= 1) {
          discard = AVDiscard.AVDISCARD_NONE
        }
        else if (rate < 1.5) {
          discard = AVDiscard.AVDISCARD_NONREF
        }
        else if (rate < 3) {
          // 跳过所有帧间编码帧
          discard = AVDiscard.AVDISCARD_NONREF
        }
        else {
          // 跳过所有帧间编码帧
          discard = AVDiscard.AVDISCARD_NONKEY
        }
      }
      else if (framerate >= 60) {
        if (rate < 1.5) {
          discard = AVDiscard.AVDISCARD_NONE
        }
        else if (rate < 3) {
          discard = AVDiscard.AVDISCARD_NONREF
        }
        else if (rate < 8) {
          discard = AVDiscard.AVDISCARD_NONINTRA
        }
        else {
          discard = AVDiscard.AVDISCARD_NONKEY
        }
      }
      else {
        discard = AVDiscard.AVDISCARD_NONE
      }
      task.softwareDecoder.setSkipFrameDiscard(discard)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async resetTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.targetDecoder === task.softwareDecoder) {
        await task.targetDecoder.flush()
      }
      // webcodec flush 有可能会卡主，这里重新创建解码器
      else if (task.targetDecoder === task.hardwareDecoder) {
        task.hardwareDecoder.close()
        task.hardwareDecoder = this.createHardwareDecoder(task)
        await task.hardwareDecoder.open(task.parameters)
        task.targetDecoder = task.hardwareDecoder
      }
      array.each(task.frameCaches, (frame) => {
        if (is.number(frame)) {
          task.avframePool.release(frame)
        }
        else {
          frame.close()
        }
      })
      task.frameCaches.length = 0
      task.needKeyFrame = true
      task.inputEnd = false
      task.lastDecodeTimestamp = getTimestamp()

      logger.info(`reset video decoder, taskId: ${task.taskId}`)
    }
  }

  public async registerTask(options: VideoDecodeTaskOptions): Promise<number> {
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
      if (task.softwareDecoder) {
        task.softwareDecoder.close()
      }
      if (task.hardwareDecoder) {
        task.hardwareDecoder.close()
      }
      task.frameCaches.forEach((frame) => {
        if (is.number(frame)) {
          task.avframePool.release(frame)
        }
        else {
          frame.close()
        }
      })
      this.tasks.delete(taskId)
    }
  }

  public async getTasksInfo() {
    const info: VideoDecodeTaskInfo[] = []
    this.tasks.forEach((task) => {
      info.push({
        codecId: task.parameters.codecId,
        width: task.parameters.width,
        height: task.parameters.height,
        framerate: avQ2D(task.parameters.framerate),
        hardware: task.targetDecoder === task.hardwareDecoder
      })
    })
    return info
  }
}
