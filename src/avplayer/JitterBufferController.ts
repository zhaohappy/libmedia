/*
 * libmedia JitterBuffer Controller
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

import Stats, { JitterBuffer } from 'avpipeline/struct/stats'
import Timer from 'common/timer/Timer'
import WorkerTimer from 'common/timer/WorkerTimer'

const QUEUE_MAX = 10
const BUFFER_STEP = 500
const RATE_STEP = 0.01

export interface ControllerObserver {
  onSetPlayRate: (rate: number) => void,
  onCroppingBuffer: (max: int32) => void
}

export interface JitterBufferControllerOptions {
  stats: pointer<Stats>
  jitterBuffer: pointer<JitterBuffer>
  lowLatencyStart: boolean
  lowLatency: boolean
  useMse: boolean
  max: float
  min: float
  observer: ControllerObserver
}

export default class JitterBufferController {

  private timer: WorkerTimer

  private interval: int32

  private data: int32[]

  private lastIncomingPacketCount: int64

  private shutterCount: int32
  private lastShutterCount: int32

  private isFirst: boolean

  private max: int32

  private min: int32

  private targetPlaybackRate: number
  private currentPlaybackRate: number

  private playbackRateTimer: Timer

  private options: JitterBufferControllerOptions

  constructor(options: JitterBufferControllerOptions) {
    this.options = options
    this.interval = 1000
    this.isFirst = true
    this.data = []
    this.lastIncomingPacketCount = 0n
    this.shutterCount = 0
    this.lastShutterCount = 0

    this.max = (options.max * 1000) >>> 0
    this.min = (options.min * 1000) >>> 0

    this.options.jitterBuffer.min = this.min
    this.options.jitterBuffer.max = this.max

    if (options.lowLatencyStart) {
      this.options.jitterBuffer.max = this.min + BUFFER_STEP
    }

    this.targetPlaybackRate = 1
    this.currentPlaybackRate = 1

    this.playbackRateTimer = new Timer(() => {
      if (this.currentPlaybackRate > this.targetPlaybackRate) {
        const rate = Math.max(this.targetPlaybackRate, this.currentPlaybackRate - RATE_STEP)
        this.options.observer.onSetPlayRate(rate)
        this.currentPlaybackRate = rate
      }
      else if (this.currentPlaybackRate < this.targetPlaybackRate) {
        const rate = Math.min(this.targetPlaybackRate, this.currentPlaybackRate + RATE_STEP)
        this.options.observer.onSetPlayRate(rate)
        this.currentPlaybackRate = rate
      }
      else {
        this.playbackRateTimer.stop()
      }
    }, 0, 200)

    this.timer = new WorkerTimer(this.onTimer.bind(this), 1000, this.interval)
  }

  public start() {
    this.timer.start()
    this.isFirst = true
    this.lastIncomingPacketCount = this.options.stats.audioPacketCount + this.options.stats.videoPacketCount
    this.shutterCount = 0
    this.lastShutterCount = this.options.stats.videoStutter + this.options.stats.audioStutter
    this.computePlayRate()
  }

  public stop() {
    this.timer.stop()
    this.data.length = 0
    this.isFirst = true
    if (this.playbackRateTimer.isStarted()) {
      this.playbackRateTimer.stop()
      this.targetPlaybackRate = this.currentPlaybackRate = 1
      this.options.observer.onSetPlayRate(1)
    }
  }

  public reset() {
    this.data.length = 0
    this.isFirst = true
    this.lastIncomingPacketCount = this.options.stats.audioPacketCount + this.options.stats.videoPacketCount
    this.shutterCount = 0
    this.lastShutterCount = this.options.stats.videoStutter + this.options.stats.audioStutter
    this.targetPlaybackRate = this.currentPlaybackRate = 1
  }

  private setPlayRate(rate: number) {
    this.targetPlaybackRate = rate
    if (this.options.useMse) {
      this.options.observer.onSetPlayRate(this.targetPlaybackRate)
      this.currentPlaybackRate = this.targetPlaybackRate
    }
    else {
      if (this.currentPlaybackRate !== rate && !this.playbackRateTimer.isStarted()) {
        this.playbackRateTimer.start()
      }
    }
  }

  private computePlayRate() {
    let buffer = this.options.stats.audioEncodeFramerate
      ? (this.options.stats.audioPacketQueueLength / this.options.stats.audioEncodeFramerate * 1000)
      : (this.options.stats.videoEncodeFramerate
        ? (this.options.stats.videoPacketQueueLength / this.options.stats.videoEncodeFramerate * 1000)
        : this.options.jitterBuffer.min
      )

    const jitterBufferMid = (this.options.jitterBuffer.min + this.options.jitterBuffer.max) / 2

    if ((buffer < (this.options.jitterBuffer.min >> 1)) && buffer < 2000) {
      this.setPlayRate(0.9)
    }
    else if ((buffer < this.options.jitterBuffer.min - BUFFER_STEP) && buffer < 2000) {
      this.setPlayRate(0.95)
    }
    else if (buffer > this.options.jitterBuffer.max + BUFFER_STEP) {
      this.setPlayRate(1.05)
    }
    else if (this.currentPlaybackRate < 1 && buffer >= jitterBufferMid
      || this.currentPlaybackRate > 1 && buffer <= jitterBufferMid
    ) {
      this.setPlayRate(1)
    }

    if (buffer > 2000 && this.max > 2000 && buffer > (this.max << 1)) {
      this.options.observer.onCroppingBuffer(this.options.jitterBuffer.max)
    }
  }

  private process() {
    const average = this.data.reduce((prev, value, index) => {
      return prev + value * (index + 1)
    }, 0) / (QUEUE_MAX * (QUEUE_MAX + 1) / 2)

    const variance = this.data.reduce((pre, value) => {
      return pre + Math.pow(value - average, 2)
    }, 0) / this.data.length

    const jitter = Math.sqrt(variance)

    if (this.options.lowLatency) {
      const incomingFramerate = Math.round(average / (this.interval / 1000))
      const needFramerate = this.options.stats.videoEncodeFramerate + this.options.stats.audioEncodeFramerate

      if ((incomingFramerate < (needFramerate >> 1)) || this.shutterCount > 3) {
        this.options.jitterBuffer.min = Math.min(this.options.jitterBuffer.min * 2, this.max - BUFFER_STEP)
        this.options.jitterBuffer.max = Math.min(this.options.jitterBuffer.max * 2, this.max)
      }
      else if (incomingFramerate >= needFramerate && jitter < 50) {
        this.options.jitterBuffer.min = Math.max(this.options.jitterBuffer.min - BUFFER_STEP, this.min)
        this.options.jitterBuffer.max = Math.max(this.options.jitterBuffer.max - BUFFER_STEP, this.min + BUFFER_STEP)
      }
      else if (jitter > 100) {
        this.options.jitterBuffer.min = Math.min(this.options.jitterBuffer.min + BUFFER_STEP, this.max - BUFFER_STEP)
        this.options.jitterBuffer.max = Math.min(this.options.jitterBuffer.max + BUFFER_STEP, this.max)
      }
      else if (jitter < 20) {
        if (this.options.jitterBuffer.min === this.min) {
          this.options.jitterBuffer.max = Math.max(this.options.jitterBuffer.max - BUFFER_STEP, this.min + BUFFER_STEP)
        }
        else {
          this.options.jitterBuffer.min = Math.max(this.options.jitterBuffer.min - BUFFER_STEP, this.min)
        }
      }
      else {
        if (this.options.jitterBuffer.max === this.max) {
          this.options.jitterBuffer.min = Math.min(this.options.jitterBuffer.min + BUFFER_STEP, this.max - BUFFER_STEP)
        }
        else {
          this.options.jitterBuffer.max = Math.min(this.options.jitterBuffer.max + BUFFER_STEP, this.max)
        }
      }
    }

    this.computePlayRate()

    this.options.stats.jitter = jitter
  }

  private onTimer() {
    const count = this.options.stats.audioPacketCount + this.options.stats.videoPacketCount
    if (this.isFirst) {
      this.isFirst = false
    }
    else {
      this.data.push(static_cast<int32>(count - this.lastIncomingPacketCount))
    }
    this.lastIncomingPacketCount = count

    if (this.options.stats.videoStutter + this.options.stats.audioStutter > this.lastShutterCount) {
      this.shutterCount++
    }
    else {
      this.shutterCount = 0
    }
    this.lastShutterCount = this.options.stats.videoStutter + this.options.stats.audioStutter

    if (this.data.length > QUEUE_MAX) {
      this.data.shift()
    }

    if (this.data.length === QUEUE_MAX) {
      this.process()
    }
  }
}
