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
import * as bigint from 'common/util/bigint'

export interface StatsControllerObserver {
  onVideoStutter: () => void
  onVideoDiscard: () => void
  onMasterTimerUpdate: (time: int64) => void
}

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

  private observer: StatsControllerObserver
  private isWorkerMain: boolean
  private videoDecodeMaxIntervalCounter: number
  private lastAudioStutterCount: number
  private lastAVDelta: int64

  constructor(stats: pointer<Stats>, isWorkerMain: boolean, observer: StatsControllerObserver) {
    this.stats = stats
    this.observer = observer
    this.isWorkerMain = isWorkerMain
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
    if (!this.isWorkerMain) {
      this.stats.audioFrameDecodeIntervalMax = 0
      this.stats.audioFrameRenderIntervalMax = 0
      this.stats.videoFrameDecodeIntervalMax = 0
      this.stats.videoFrameRenderIntervalMax = 0
    }
  }

  public start() {
    this.reset()
    this.videoDecodeMaxIntervalCounter = 0
    this.lastAudioStutterCount = 0
    this.lastAVDelta = 0n
    this.timer.start()
  }

  public stop() {
    this.timer.stop()
  }

  private onTimer() {
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
      this.observer.onVideoStutter()
    }
    if (this.stats.videoFrameDecodeIntervalMax > 1000 / this.stats.videoEncodeFramerate
      && this.stats.videoDecodeFramerate < this.stats.videoEncodeFramerate * 0.9
      && (this.stats.audioCurrentTime > 0
        && this.stats.videoCurrentTime > 0
        && this.stats.audioCurrentTime - this.stats.videoCurrentTime > 1000n
        && this.stats.audioCurrentTime - this.stats.videoCurrentTime > this.lastAVDelta
        || this.stats.audioStutter > this.lastAudioStutterCount
      )
    ) {
      this.videoDecodeMaxIntervalCounter++
    }
    else {
      this.videoDecodeMaxIntervalCounter = 0
    }
    if (this.videoDecodeMaxIntervalCounter > 5) {
      this.observer.onVideoDiscard()
      this.videoDecodeMaxIntervalCounter = 0
    }
    this.lastAudioStutterCount = this.stats.audioStutter
    this.lastAVDelta = this.stats.audioCurrentTime - this.stats.videoCurrentTime
    this.reset()

    const audioNextTime = this.stats.audioNextTime
    const videoNextTime = this.stats.videoNextTime
    const audioCurrentTime = this.stats.audioCurrentTime
    const videoCurrentTime = this.stats.videoCurrentTime
    if (audioNextTime
        && videoNextTime
        && (audioNextTime - audioCurrentTime) > 2000
        && (videoNextTime - videoCurrentTime) > 2000
      || audioNextTime
        && !videoNextTime
        && (audioNextTime - audioCurrentTime) > 2000
      || videoNextTime
        && !audioNextTime
        && (videoNextTime - videoCurrentTime) > 2000
    ) {
      const min = (audioNextTime && videoNextTime)
        ? bigint.min(audioNextTime, videoNextTime)
        : (audioNextTime
          ? audioNextTime
          : videoNextTime
        )
      // 音视频都空了，直接跳过
      this.observer.onMasterTimerUpdate(min)
    }
  }
}
