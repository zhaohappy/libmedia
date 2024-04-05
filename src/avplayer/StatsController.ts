/*
 * libmedia AVPlayer Stats Controller
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

import Stats from 'avpipeline/struct/stats'
import Timer from 'common/timer/Timer'

export default class StatsController {

  private stats: pointer<Stats>

  private timer: Timer

  private videoFrameRenderCount: int64
  private videoFrameDecodeCount: int64

  private audioFrameRenderCount: int64
  private audioFrameDecodeCount: int64

  private videoPacketBytes: int64
  private audioPacketBytes: int64

  private bufferReceiveBytes: int64

  constructor(stats: pointer<Stats>) {
    this.stats = stats
    this.timer = new Timer(this.onTimer.bind(this), 1000, 1000)
  }

  private reset() {
    this.videoFrameRenderCount = this.stats.videoFrameRenderCount
    this.videoFrameDecodeCount = this.stats.videoFrameDecodeCount
    this.audioFrameRenderCount = this.stats.audioFrameRenderCount
    this.audioFrameDecodeCount = this.stats.audioFrameDecodeCount
    this.videoPacketBytes = this.stats.videoPacketBytes
    this.audioPacketBytes = this.stats.audioPacketBytes
    this.bufferReceiveBytes = this.stats.bufferReceiveBytes
  }

  public start() {
    this.reset()

    this.timer.start()
  }

  public stop() {
    this.timer.stop()
  }

  private onTimer() {
    this.stats.audioFrameDecodeIntervalMax = 0
    this.stats.audioFrameRenderIntervalMax = 0
    this.stats.videoFrameDecodeIntervalMax = 0
    this.stats.videoFrameRenderIntervalMax = 0

    this.stats.videoRenderFramerate = static_cast<int32>(this.stats.videoFrameRenderCount - this.videoFrameRenderCount)
    this.stats.videoDecodeFramerate = static_cast<int32>(this.stats.videoFrameDecodeCount - this.videoFrameDecodeCount)
    this.stats.audioRenderFramerate = static_cast<int32>(this.stats.audioFrameRenderCount - this.audioFrameRenderCount)
    this.stats.audioDecodeFramerate = static_cast<int32>(this.stats.audioFrameDecodeCount - this.audioFrameDecodeCount)

    this.stats.videoBitrate = static_cast<int32>(this.stats.videoPacketBytes - this.videoPacketBytes)
    this.stats.audioBitrate = static_cast<int32>(this.stats.audioPacketBytes - this.audioPacketBytes)
    this.stats.bandwidth = static_cast<int32>(this.stats.bufferReceiveBytes - this.bufferReceiveBytes)

    if (document.visibilityState === 'visible'
      && (this.stats.videoRenderFramerate < this.stats.videoEncodeFramerate * 0.5
        || this.stats.videoFrameRenderIntervalMax > 6 * 1000 / this.stats.videoEncodeFramerate
      )
    ) {
      this.stats.videoStutter++
    }

    this.reset()
  }
}
