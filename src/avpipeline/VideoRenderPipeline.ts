/*
 * libmedia VideoRenderPipeline
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
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import ImageRender from 'avrender/image/ImageRender'
import support from 'common/util/support'
import { RenderMode } from 'avrender/image/ImageRender'
import { Rational } from 'avutil/struct/rational'
import LoopTask from 'common/timer/LoopTask'
import getTimestamp from 'common/function/getTimestamp'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { NOTIFY, RpcMessage } from 'common/network/IPCPort'
import browser from 'common/util/browser'

import * as logger from 'common/util/logger'
import * as bigint from 'common/util/bigint'

import WebGPURender, { WebGPURenderOptions } from 'avrender/image/WebGPURender'
import WebGLRender, { WebGLRenderOptions } from 'avrender/image/WebGLRender'
import CanvasImageRender from 'avrender/image/Canvas2dRender'
import WebGPUExternalRender from 'avrender/image/WebGPUExternalRender'
import WebGLYUV8Render from 'avrender/image/WebGLYUV8Render'
import WebGLYUV16Render from 'avrender/image/WebGLYUV16Render'
import WebGPUYUV8Render from 'avrender/image/WebGPUYUV8Render'
import WebGPUYUV16Render from 'avrender/image/WebGPUYUV16Render'
import isWorker from 'common/function/isWorker'
import { JitterBuffer } from './struct/jitter'

type WebGPURenderFactory = {
  new(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions): WebGPURender,
  isSupport: (frame: pointer<AVFrame> | VideoFrame | ImageBitmap) => boolean
}
type WebGLRenderFactory = {
  new(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions): WebGLRender,
  isSupport: (frame: pointer<AVFrame> | VideoFrame | ImageBitmap) => boolean
}

const WebGPURenderList: WebGPURenderFactory[] = defined(ENABLE_WEBGPU) ? [
  WebGPUYUV8Render
] : []
if (defined(ENABLE_WEBGPU) && defined(ENABLE_RENDER_16)) {
  WebGPURenderList.push(WebGPUYUV16Render)
}

const WebGLRenderList: WebGLRenderFactory[] = [
  WebGLYUV8Render
]
if (defined(ENABLE_RENDER_16)) {
  WebGLRenderList.push(WebGLYUV16Render)
}

enum AdjustStatus {
  None,
  Accelerate,
  Decelerate
}

export interface VideoRenderTaskOptions extends TaskOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  renderMode: RenderMode
  renderRotate: double
  flipHorizontal: boolean
  flipVertical: boolean
  timeBase: Rational
  viewportWidth: int32
  viewportHeight: int32
  devicePixelRatio: double
  enableWebGPU: boolean
  startPTS: int64
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
  enableJitterBuffer: boolean
  jitterBuffer: pointer<JitterBuffer>
}

type SelfTask = VideoRenderTaskOptions & {
  leftIPCPort: IPCPort
  controlIPCPort: IPCPort

  currentPTS: int64
  firstPTS: int64
  startTimestamp: int64
  lastAdjustTimestamp: int64
  // playRate / 100 
  playRate: int64
  targetRate: int64
  frontFrame: pointer<AVFrameRef> | VideoFrame
  backFrame: pointer<AVFrameRef> | VideoFrame
  renderFrame: pointer<AVFrameRef> | VideoFrame
  renderFrameCount: int64

  loop: LoopTask
  render: ImageRender
  renderRedyed: boolean

  adjust: AdjustStatus
  adjustDiff: int64

  firstRendered: boolean
  canvasUpdated: boolean
  renderCreating: boolean

  pauseTimestamp: number
  lastNotifyPTS: int64

  skipRender: boolean

  isSupport: (frame: pointer<AVFrame> | VideoFrame | ImageBitmap) => boolean

  frontBuffered: boolean
  ended: boolean

  seeking: boolean
  seekSync: () => void
  pausing: boolean

  lastRenderTimestamp: number

  avframePool: AVFramePoolImpl
}

const HHRPrimaries = ['bt2020', 'bt2100', 'st2048', 'p3-dcl', 'hlg']

function isHDR(primaries: string) {
  return array.has(HHRPrimaries, primaries)
}

export default class VideoRenderPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private async createTask(options: VideoRenderTaskOptions): Promise<number> {
    const leftIPCPort = new IPCPort(options.leftPort)
    const controlIPCPort = new IPCPort(options.controlPort)

    const task: SelfTask = {
      ...options,
      leftIPCPort,
      controlIPCPort,
      render: null,

      currentPTS: NOPTS_VALUE_BIGINT,
      firstPTS: 0n,
      startTimestamp: 0n,
      playRate: 100n,
      targetRate: 100n,
      frontFrame: null,
      backFrame: null,
      renderFrame: null,
      renderFrameCount: 0n,

      loop: null,
      renderRedyed: false,
      adjust: AdjustStatus.None,
      adjustDiff: 0n,
      lastAdjustTimestamp: 0n,

      firstRendered: false,
      canvasUpdated: false,
      renderCreating: false,

      pauseTimestamp: 0,
      lastNotifyPTS: 0n,

      skipRender: false,

      isSupport: () => false,

      frontBuffered: false,
      ended: false,
      seeking: false,
      seekSync: null,
      pausing: false,

      lastRenderTimestamp: 0,
      avframePool: new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)
    }

    task.startPTS = avRescaleQ(task.startPTS, task.timeBase, AV_MILLI_TIME_BASE_Q)

    controlIPCPort.on(NOTIFY, async (request: RpcMessage) => {
      switch (request.method) {
        case 'syncPts': {
          const targetPTS = request.params.pts
          const diff = Math.abs(Number(targetPTS - task.currentPTS))
          if (diff > 100 && task.currentPTS > 0n) {
            if (targetPTS > task.currentPTS) {
              task.adjust = AdjustStatus.Accelerate
              logger.debug(`video render sync pts accelerate, targetPTS: ${targetPTS}, currentPTS: ${task.currentPTS}, diff: ${diff}, taskId: ${task.taskId}`)
            }
            else {
              task.adjust = AdjustStatus.Decelerate
              logger.debug(`video render sync pts decelerate, targetPTS: ${targetPTS}, currentPTS: ${task.currentPTS}, diff: ${diff} taskId: ${task.taskId}`)
            }
            task.adjustDiff = static_cast<int64>(diff)
          }
          break
        }
        case 'skipRender': {
          task.skipRender = request.params.skipRender
          break
        }
      }
    })

    this.tasks.set(options.taskId, task)
    return 0
  }

  private async createRender(task: SelfTask, frame: pointer<AVFrameRef> | VideoFrame) {
    if (task.renderCreating) {
      return
    }

    task.renderCreating = true
    task.renderRedyed = false

    if (task.render) {
      task.render.destroy()
    }
    if (!is.number(frame)) {
      if (defined(ENABLE_WEBGPU)
        && task.enableWebGPU
        && support.webgpu
        && (
          // chrome116+ webgpu 可以导入 VideoFrame 作为纹理
          browser.chrome && browser.checkVersion(browser.majorVersion, '116', true)
        )
        && !isHDR(frame.colorSpace.primaries)
      ) {
        // WebGPUExternalRender 性能最优
        task.render = new WebGPUExternalRender(task.canvas, {
          devicePixelRatio: task.devicePixelRatio,
          renderMode: task.renderMode,
          onRenderContextLost: () => {
            task.canvasUpdated = false
            task.renderRedyed = false
            logger.warn('render context lost')
            task.controlIPCPort.notify('updateCanvas')
          }
        })
        task.isSupport = WebGPUExternalRender.isSupport
      }
      else {
        // CanvasImageRender 支持 hdr 视频渲染
        task.render = new CanvasImageRender(task.canvas, {
          devicePixelRatio: task.devicePixelRatio,
          renderMode: task.renderMode
        })
        task.isSupport = CanvasImageRender.isSupport
      }
    }
    else {
      // 优先使用 webgpu，webgpu 性能优于 webgl
      if (defined(ENABLE_WEBGPU) && task.enableWebGPU && support.webgpu) {
        array.each(WebGPURenderList, (RenderFactory) => {
          if (RenderFactory.isSupport(frame)) {
            task.render = new RenderFactory(task.canvas, {
              devicePixelRatio: task.devicePixelRatio,
              renderMode: task.renderMode,
              onRenderContextLost: () => {
                task.canvasUpdated = false
                task.renderRedyed = false
                logger.warn('render context lost')
                task.controlIPCPort.notify('updateCanvas')
              }
            })
            task.isSupport = RenderFactory.isSupport
            return false
          }
        })
      }
      else {
        array.each(WebGLRenderList, (RenderFactory) => {
          if (RenderFactory.isSupport(frame)) {
            task.render = new RenderFactory(task.canvas, {
              devicePixelRatio: task.devicePixelRatio,
              renderMode: task.renderMode,
              onRenderContextLost: () => {
                task.canvasUpdated = false
                task.renderRedyed = false
                logger.warn('render context lost')
                task.controlIPCPort.notify('updateCanvas')
              }
            })
            task.isSupport = RenderFactory.isSupport
            return false
          }
        })
      }
    }
    if (!task.render) {
      task.renderCreating = false
      return
    }
    await task.render.init()
    task.render.viewport(task.viewportWidth, task.viewportHeight)
    task.render.clear()
    task.render.setRotate(task.renderRotate ?? 0)
    task.render.enableHorizontalFlip(task.flipHorizontal ?? false)
    task.render.enableVerticalFlip(task.flipVertical ?? false)

    task.renderRedyed = true
    task.renderCreating = false
  }

  public async play(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop) {
        logger.fatal('task has already call play')
      }

      task.backFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

      if (is.number(task.backFrame) && task.backFrame < 0) {
        task.backFrame = nullptr
        logger.info(`video render ended, taskId: ${task.taskId}`)
        task.controlIPCPort.notify('ended')
        return
      }

      task.frontFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

      task.frontBuffered = true
      task.ended = false

      if (is.number(task.frontFrame) && task.frontFrame < 0) {
        task.ended = true
        task.frontBuffered = false
        task.frontFrame = nullptr
      }

      const me = this

      function swap() {

        if (task.seeking) {
          return
        }

        if (task.backFrame) {
          if (!is.number(task.backFrame)) {
            task.backFrame.close()
          }
          else {
            task.avframePool.release(task.backFrame)
          }
        }

        task.backFrame = null

        if (task.frontBuffered) {
          task.backFrame = task.frontFrame
          task.frontFrame = null
        }
        else {
          return false
        }
        if (task.ended) {
          return
        }
        task.frontBuffered = false
        task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull').then((frame) => {
          if (is.number(frame) && frame < 0) {
            task.ended = true
            task.frontFrame = null
            return
          }

          assert(!is.number(frame) || frame.data[0], 'got empty video frame')

          task.frontFrame = frame
          task.frontBuffered = true

          if (task.seekSync) {
            task.seekSync()
            task.seekSync = null
            return
          }

          if (!task.backFrame) {
            swap()
          }
        })
        return true
      }

      await this.createRender(task, task.backFrame)

      task.firstPTS = avRescaleQ(
        (!is.number(task.backFrame)) ? static_cast<int64>(task.backFrame.timestamp) : task.backFrame.pts,
        task.timeBase,
        AV_MILLI_TIME_BASE_Q
      )

      logger.debug(`got first video frame, pts: ${!is.number(task.backFrame)
        ? static_cast<int64>(task.backFrame.timestamp)
        : task.backFrame.pts
      }(${task.firstPTS}ms), taskId: ${task.taskId}`)

      // 当第一个帧的 pts 大于 1000ms 时判定不是从 0 开始，这里做一下对其
      if (task.firstPTS < 1000n) {
        task.firstPTS = 0n
      }

      task.currentPTS = task.firstPTS
      task.startTimestamp = static_cast<int64>(getTimestamp()) - task.firstPTS * 100n / task.playRate

      const inWorker = isWorker()

      task.loop = new LoopTask(() => {
        if (!task.backFrame) {
          if (!task.ended) {
            task.loop.emptyTask()
          }
          else {
            if (task.render && task.renderRedyed) {
              task.render.clear()
            }
            task.loop.stop()
            task.adjust = AdjustStatus.None
            logger.info(`video render ended, taskId: ${task.taskId}`)
            task.controlIPCPort.notify('ended')
          }
          return
        }

        if (!task.isSupport(task.backFrame)) {
          if (task.render) {
            task.renderRedyed = false
            task.renderFrame = task.backFrame
            task.controlIPCPort.notify('updateCanvas')
            return
          }
          else {
            this.createRender(task, task.backFrame)
          }
        }

        const pts = avRescaleQ(
          (!is.number(task.backFrame)) ? static_cast<int64>(task.backFrame.timestamp) : task.backFrame.pts,
          task.timeBase,
          AV_MILLI_TIME_BASE_Q
        )

        if (pts < task.currentPTS) {
          logger.warn(`dropping frame with pts ${pts}, which is earlier then the last rendered frame(${task.currentPTS}), taskId: ${task.taskId}`)
          swap()
          return
        }

        if (task.adjust === AdjustStatus.Accelerate) {
          if (task.adjustDiff <= 0) {
            task.adjust = AdjustStatus.None
            task.startTimestamp = static_cast<int64>(getTimestamp()) - (pts * 100n / task.targetRate)
            task.lastAdjustTimestamp = 0n
          }
          else {
            if (static_cast<int64>(getTimestamp()) - task.lastAdjustTimestamp >= 200n) {
              const sub = task.adjustDiff <= 100n
                ? task.adjustDiff
                : bigint.min(task.adjustDiff, 100n) * 100n / task.targetRate

              task.startTimestamp -= sub
              task.adjustDiff -= sub

              logger.debug(`video render accelerate startTimestamp sub: ${sub}, taskId: ${task.taskId}`)

              task.lastAdjustTimestamp = static_cast<int64>(getTimestamp())
            }
          }
        }
        else if (task.adjust === AdjustStatus.Decelerate) {
          if (task.adjustDiff <= 0) {
            task.adjust = AdjustStatus.None
            task.startTimestamp = static_cast<int64>(getTimestamp()) - (pts * 100n / task.targetRate)
            task.lastAdjustTimestamp = 0n
          }
          else {
            if (static_cast<int64>(getTimestamp()) - task.lastAdjustTimestamp >= 300n) {

              const add = task.adjustDiff < 50n
                ? task.adjustDiff
                : bigint.min(task.adjustDiff, 50n) * 100n / task.targetRate

              task.startTimestamp += add
              task.adjustDiff -= add

              logger.debug(`video render decelerate startTimestamp add: ${add}, taskId: ${task.taskId}`)

              task.lastAdjustTimestamp = static_cast<int64>(getTimestamp())
            }
          }
        }

        if (task.enableJitterBuffer) {
          let buffer = task.stats.videoPacketQueueLength / task.stats.videoEncodeFramerate * 1000
          if (buffer <= task.jitterBuffer.min) {
            me.setPlayRate(task.taskId, 1)
          }
        }

        const diff = pts * 100n / task.playRate + task.startTimestamp - static_cast<int64>(getTimestamp())

        if (diff <= 0) {
          // 太晚的帧跳过渲染
          if (task.renderRedyed
            && !task.skipRender
            && (inWorker || (-diff < 100n) || (task.renderFrameCount & 0x01n))
          ) {
            task.render.render(task.backFrame)
            task.stats.videoFrameRenderCount++
            if (task.lastRenderTimestamp) {
              task.stats.videoFrameRenderIntervalMax = Math.max(
                getTimestamp() - task.lastRenderTimestamp,
                task.stats.videoFrameRenderIntervalMax
              )
            }
            task.lastRenderTimestamp = getTimestamp()
          }
          else {
            task.stats.videoFrameDropCount++
          }
          task.renderFrameCount++
          if (is.number(task.backFrame)) {
            task.stats.width = task.backFrame.width
            task.stats.height = task.backFrame.height
          }
          else {
            task.stats.width = task.backFrame.displayWidth
            task.stats.height = task.backFrame.displayHeight
          }
          if (!task.firstRendered) {
            task.controlIPCPort.notify(task.canvasUpdated ? 'firstRenderedAfterUpdateCanvas' : 'firstRendered')
            task.firstRendered = true
            task.canvasUpdated = false
          }
          if (task.playRate !== task.targetRate) {
            task.startTimestamp = static_cast<int64>(getTimestamp()) - (pts * 100n / task.targetRate)
            task.playRate = task.targetRate
          }
          task.currentPTS = pts

          if (pts - task.lastNotifyPTS >= 1000n) {
            task.lastNotifyPTS = pts
            task.controlIPCPort.notify('syncPts', {
              pts
            })
          }
          swap()
        }
        else {
          task.loop.emptyTask()
        }
      }, 0, 0)

      task.loop.start()
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async restart(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (!task.loop) {
        logger.fatal('task has not played')
      }

      if (task.loop.isStarted()) {
        logger.fatal('task has already run')
      }

      if (task.backFrame) {
        if (!is.number(task.backFrame)) {
          task.backFrame.close()
        }
        else {
          task.avframePool.release(task.backFrame)
        }
      }
      if (task.frontFrame) {
        if (!is.number(task.frontFrame)) {
          task.frontFrame.close()
        }
        else {
          task.avframePool.release(task.frontFrame)
        }
      }

      task.backFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')
      task.frontFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

      task.frontBuffered = true
      task.ended = false
      task.adjust = AdjustStatus.None
      task.lastNotifyPTS = NOPTS_VALUE_BIGINT
      task.firstRendered = false

      task.firstPTS = avRescaleQ(
        (!is.number(task.backFrame)) ? static_cast<int64>(task.backFrame.timestamp) : task.backFrame.pts,
        task.timeBase,
        AV_MILLI_TIME_BASE_Q
      )
      task.currentPTS = task.firstPTS

      // 当第一个帧的 pts 大于 1000ms 时判定不是从 0 开始，这里做一下对其
      if (task.firstPTS < 1000n) {
        task.firstPTS = 0n
      }

      task.startTimestamp = static_cast<int64>(getTimestamp()) - task.firstPTS * 100n / task.playRate

      task.loop.start()
    }
  }

  public async pause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (!task.loop) {
        logger.fatal('task has not played')
      }
      task.pauseTimestamp = getTimestamp()
      task.loop.stop()
      task.pausing = true
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async unpause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.seeking) {
        return
      }
      if (!task.loop) {
        logger.fatal('task has not played')
      }
      task.startTimestamp += static_cast<int64>(getTimestamp() - task.pauseTimestamp)
      if (!task.seeking) {
        task.loop.start()
      }
      task.pausing = false
      task.lastRenderTimestamp = getTimestamp()
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async updateCanvas(taskId: string, canvas: HTMLCanvasElement | OffscreenCanvas) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.canvas = canvas
      if (task.render) {
        task.render.destroy()
        task.render = null
      }
      task.isSupport = () => false
      task.canvasUpdated = true
      task.firstRendered = false
      task.renderRedyed = false
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async setPlayRate(taskId: string, rate: double) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.enableJitterBuffer) {
        let buffer = task.stats.videoPacketQueueLength / task.stats.videoEncodeFramerate * 1000
        if (buffer <= task.jitterBuffer.min) {
          rate = 1
        }
      }
      task.targetRate = static_cast<int64>(Math.floor(rate * 100))
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async setRenderMode(taskId: string, mode: RenderMode) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.render) {
        task.renderMode = mode
        task.render.setRenderMode(mode)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async setRenderRotate(taskId: string, rotate: double) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.render) {
        task.renderRotate = rotate
        task.render.setRotate(rotate)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async enableHorizontalFlip(taskId: string, enable: boolean) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.render) {
        task.flipHorizontal = enable
        task.render.enableHorizontalFlip(enable)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async enableVerticalFlip(taskId: string, enable: boolean) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.render) {
        task.flipVertical = enable
        task.render.enableVerticalFlip(enable)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async resize(taskId: string, width: int32, height: int32) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.render) {
        task.render.viewport(width, height)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async setSkipRender(taskId: string, skip: boolean) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.skipRender = skip
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async beforeSeek(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      // 当前正在 pull frontFrame，等待其结束
      if (!task.ended && !task.frontBuffered) {
        logger.debug(`wait current pull front frame before seek, taskId: ${task.taskId}`)
        await new Promise<void>((resolve) => {
          task.seekSync = resolve
        })
      }
      task.seeking = true
      task.loop.stop()
      if (task.backFrame) {
        if (!is.number(task.backFrame)) {
          task.backFrame.close()
        }
        else {
          task.avframePool.release(task.backFrame)
        }
      }
      if (task.frontFrame) {
        if (!is.number(task.frontFrame)) {
          task.frontFrame.close()
        }
        else {
          task.avframePool.release(task.frontFrame)
        }
      }

      task.frontFrame = null
      task.backFrame = null
      task.currentPTS = NOPTS_VALUE_BIGINT

      logger.debug(`before seek end, taskId: ${task.taskId}`)
    }
  }

  public async syncSeekTime(taskId: string, timestamp: int64, maxQueueLength?: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      while (true) {

        task.backFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

        if (is.number(task.backFrame) && task.backFrame < 0) {
          task.ended = true
          task.seeking = false
          task.adjust = AdjustStatus.None
          logger.warn(`pull video frame end after seek, taskId: ${taskId}`)
          task.controlIPCPort.notify('ended')
          return
        }

        if (timestamp < 0n) {
          logger.info(`use the first video frame because of the seek time${timestamp} < 0`)
          break
        }

        const pts = avRescaleQ(
          (!is.number(task.backFrame)) ? static_cast<int64>(task.backFrame.timestamp) : task.backFrame.pts,
          task.timeBase,
          AV_MILLI_TIME_BASE_Q
        )

        if (pts - task.startPTS >= timestamp) {
          break
        }

        if (!is.number(task.backFrame)) {
          if (defined(ENABLE_LOG_TRACE)) {
            logger.trace(`skip video frame pts: ${task.backFrame.timestamp}(${pts}ms), which is earlier then the seeked time(${timestamp}ms), taskId: ${task.taskId}`)
          }
          task.backFrame.close()
        }
        else {
          if (defined(ENABLE_LOG_TRACE)) {
            logger.trace(`skip video frame pts: ${task.backFrame.pts}(${pts}ms), which is earlier then the seeked time(${timestamp}ms), taskId: ${task.taskId}`)
          }
          task.avframePool.release(task.backFrame)
        }
      }
      logger.debug(`sync seek time end, taskId: ${task.taskId}`)
    }
  }

  public async afterSeek(taskId: string, timestamp: int64) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.startTimestamp = static_cast<int64>(getTimestamp()) - (timestamp + task.startPTS) * 100n / task.playRate
      task.frontFrame = await task.leftIPCPort.request<pointer<AVFrameRef> | VideoFrame>('pull')

      if (is.number(task.frontFrame) && task.frontFrame < 0) {
        task.frontFrame = null
        task.frontBuffered = false
        task.ended = true
      }
      else {
        task.frontBuffered = true
      }

      task.ended = false
      task.adjust = AdjustStatus.None
      task.lastRenderTimestamp = getTimestamp()

      task.currentPTS = avRescaleQ(
        (!is.number(task.backFrame)) ? static_cast<int64>(task.backFrame.timestamp) : task.backFrame.pts,
        task.timeBase,
        AV_MILLI_TIME_BASE_Q
      )

      logger.debug(`got first video frame, pts: ${!is.number(task.backFrame)
        ? static_cast<int64>(task.backFrame.timestamp)
        : task.backFrame.pts
      }(${task.currentPTS}ms), taskId: ${task.taskId}`)

      task.seeking = false
      if (!task.pausing) {
        task.loop.start()
      }
      logger.debug(`after seek end, taskId: ${task.taskId}`)
    }
  }

  public async registerTask(options: VideoRenderTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return errorType.INVALID_OPERATE
    }
    return await this.createTask(options)
  }

  public async unregisterTask(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (task) {
      if (task.loop) {
        await task.loop.stopBeforeNextTick()
        task.loop.destroy()
        task.loop = null
      }
      if (task.render) {
        task.render.destroy()
        task.render = null
      }
      if (task.backFrame) {
        if (is.number(task.backFrame) && task.backFrame > 0) {
          task.avframePool.release(task.backFrame)
        }
        else {
          task.backFrame.close()
        }
        task.backFrame = null
      }
      if (task.frontFrame) {
        if (is.number(task.frontFrame) && task.frontFrame > 0) {
          task.avframePool.release(task.frontFrame)
        }
        else {
          task.frontFrame.close()
        }
        task.frontFrame = null
      }
      task.leftIPCPort.destroy()
      task.controlIPCPort.destroy()
      this.tasks.delete(id)
    }
  }
}
