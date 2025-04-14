/*
 * libmedia AudioRenderPipeline
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
import { AVFrameRef } from 'avutil/struct/avframe'
import * as logger from 'common/util/logger'
import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import AVFramePoolImpl from 'avutil/implement/AVFramePoolImpl'
import Resampler from 'audioresample/Resampler'
import { AVSampleFormat } from 'avutil/audiosamplefmt'
import AVPCMBuffer, { AVPCMBufferPool, AVPCMBufferRef } from 'avutil/struct/avpcmbuffer'
import AVPCMBufferPoolImpl from 'avutil/implement/AVPCMBufferPoolImpl'
import { avFreep, avMalloc, avMallocz } from 'avutil/util/mem'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import StretchPitcher from 'audiostretchpitch/StretchPitcher'
import { REQUEST, RpcMessage } from 'common/network/IPCPort'
import { IOError } from 'common/io/error'
import { memcpy, memset, mapUint8Array } from 'cheap/std/memory'
import { avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import getTimestamp from 'common/function/getTimestamp'
import { Timeout } from 'common/types/type'
import Sleep from 'common/timer/Sleep'
import * as bigint from 'common/util/bigint'
import compileResource from 'avutil/function/compileResource'
import WorkerSetTimeout from 'common/timer/WorkerSetTimeout'
import isWorker from 'common/function/isWorker'
import MasterTimer from 'common/timer/MasterTimer'

const MASTER_SYNC_THRESHOLD = 400n

export interface AudioRenderTaskOptions extends TaskOptions {
  playSampleRate: int32
  playFormat: AVSampleFormat
  playChannels: int32
  resamplerResource: ArrayBuffer | WebAssemblyResource
  stretchpitcherResource: ArrayBuffer | WebAssemblyResource
  startPTS: int64
  avframeList: pointer<List<pointer<AVFrameRef>>>
  avframeListMutex: pointer<Mutex>
  enableJitterBuffer: boolean
  isLive: boolean
}

type SelfTask = AudioRenderTaskOptions & {
  leftIPCPort: IPCPort
  rightIPCPort: IPCPort
  controlIPCPort: IPCPort
  resamplerResource: WebAssemblyResource
  stretchpitcherResource: WebAssemblyResource
  resampler: Resampler
  stretchpitcher: Map<int32, StretchPitcher>
  outPCMBuffer: AVPCMBuffer

  waitPCMBuffer: pointer<AVPCMBufferRef>
  waitPCMBufferPos: int32
  waitAVFrame: pointer<AVFrameRef>

  ended: boolean
  stretchpitcherEnded: boolean

  playRate: double
  playTempo: double
  playPitch: double

  useStretchpitcher: boolean

  firstPlayed: boolean
  lastNotifyPTS: int64
  currentPTS: int64
  lastMasterPts: int64
  masterTimer: MasterTimer

  seeking: boolean
  pausing: boolean
  stopping: boolean
  seekSync: () => void
  receivePCMSync: () => void

  paddingAVFrame: pointer<AVFrameRef>

  fakePlayStartTimestamp: number
  fakePlaySamples: int64
  fakePlayTimer: Timeout
  fakePlayWorkerTimer: WorkerSetTimeout
  fakePlay: boolean

  lastRenderTimestamp: number

  avframePool: AVFramePoolImpl
}

export default class AudioRenderPipeline extends Pipeline {
  declare tasks: Map<string, SelfTask>

  private avPCMBufferPool: AVPCMBufferPool
  private avPCMBufferList: List<pointer<AVPCMBufferRef>>
  private avPCMBufferListMutex: Mutex

  constructor() {
    super()
    this.avPCMBufferList = make<List<pointer<AVPCMBufferRef>>>()
    this.avPCMBufferListMutex = make<Mutex>()
    this.avPCMBufferPool = new AVPCMBufferPoolImpl(this.avPCMBufferList, addressof(this.avPCMBufferListMutex))
  }

  private async createTask(options: AudioRenderTaskOptions): Promise<number> {
    const leftIPCPort = new IPCPort(options.leftPort)
    const rightIPCPort = new IPCPort(options.rightPort)
    const controlIPCPort = new IPCPort(options.controlPort)

    const task: SelfTask = {
      ...options,
      leftIPCPort,
      rightIPCPort,
      controlIPCPort,
      resamplerResource: await compileResource(options.resamplerResource),
      stretchpitcherResource: await compileResource(options.stretchpitcherResource),
      resampler: null,
      stretchpitcher: new Map(),
      outPCMBuffer: null,
      waitPCMBuffer: nullptr,
      waitAVFrame: nullptr,
      waitPCMBufferPos: 0,
      ended: false,
      stretchpitcherEnded: false,

      playRate: 1,
      playTempo: 1,
      playPitch: 1,

      useStretchpitcher: false,
      lastNotifyPTS: 0n,
      currentPTS: NOPTS_VALUE_BIGINT,
      lastMasterPts: NOPTS_VALUE_BIGINT,
      masterTimer: new MasterTimer(),
      firstPlayed: false,
      seeking: false,
      pausing: false,
      stopping: false,
      seekSync: null,
      receivePCMSync: null,

      paddingAVFrame: nullptr,

      fakePlayStartTimestamp: 0,
      fakePlaySamples: 0n,
      fakePlayTimer: null,
      fakePlayWorkerTimer: null,
      fakePlay: false,

      lastRenderTimestamp: 0,

      avframePool: new AVFramePoolImpl(accessof(options.avframeList), options.avframeListMutex)
    }

    for (let i = 0; i < options.playChannels; i++) {

      const stretchpitcher = new StretchPitcher({
        resource: task.stretchpitcherResource
      })

      task.stretchpitcher.set(i, stretchpitcher)

      await stretchpitcher.open({
        sampleRate: options.playSampleRate,
        channels: 1
      })
      stretchpitcher.setTempo(task.playTempo)
      stretchpitcher.setPitch(task.playPitch)
      stretchpitcher.setRate(task.playRate)
    }

    const pullNewAudioFrame = async () => {
      let audioFrame: pointer<AVFrameRef>
      if (task.paddingAVFrame) {
        audioFrame = task.paddingAVFrame
        task.paddingAVFrame = nullptr
      }
      else {
        audioFrame = await task.leftIPCPort.request<pointer<AVFrameRef>>('pull')
      }

      if (audioFrame === IOError.END) {
        for (let i = 0; i < task.playChannels; i++) {
          const stretchpitcher = task.stretchpitcher.get(i)
          stretchpitcher.flush()
        }
        logger.info(`audio render ended, taskId: ${task.taskId}`)
        return IOError.END
      }
      else if (audioFrame < 0) {
        logger.error(`pull audio frame failed, taskId: ${task.taskId}`)
        return audioFrame as number
      }
      else {
        if (task.playRate !== 1
          || task.playTempo !== 1
          || task.playPitch !== 1
          || task.enableJitterBuffer
        ) {
          task.useStretchpitcher = true
        }
        else {
          task.useStretchpitcher = false
        }

        if (!task.firstPlayed) {
          const start = avRescaleQ2(
            audioFrame.pts,
            addressof(audioFrame.timeBase),
            AV_MILLI_TIME_BASE_Q
          )
          task.firstPlayed = true
          logger.debug(`got first audio frame, pts: ${audioFrame.pts}(${start}ms), taskId: ${task.taskId}`)
        }

        const pts = avRescaleQ2(audioFrame.pts, addressof(audioFrame.timeBase), AV_MILLI_TIME_BASE_Q)
        if (pts > 0n && (task.masterTimer.getMasterTime() - pts > MASTER_SYNC_THRESHOLD)) {
          task.masterTimer.setMasterTime(pts)
        }
        // 直播差值大于 4s 认为从某一处开始了
        else if (task.isLive && (pts - task.currentPTS > 4000n)) {
          task.masterTimer.setMasterTime(pts)
        }
        task.currentPTS = pts
        task.stats.audioFrameRenderCount++
        task.stats.audioNextTime = pts

        if (task.lastRenderTimestamp) {
          task.stats.audioFrameRenderIntervalMax = Math.max(
            getTimestamp() - task.lastRenderTimestamp,
            task.stats.audioFrameRenderIntervalMax
          )
        }
        task.lastRenderTimestamp = getTimestamp()

        let releaseAudioFrame = true

        if (audioFrame.sampleRate !== task.playSampleRate
          || audioFrame.format !== task.playFormat
          || audioFrame.chLayout.nbChannels !== task.playChannels
        ) {
          if (task.resampler) {
            const current = task.resampler.getInputPCMParameters()
            if (current.format !== audioFrame.format
              || current.sampleRate !== audioFrame.sampleRate
              || current.channels !== audioFrame.chLayout.nbChannels
            ) {
              task.resampler.close()
              task.resampler = null
            }
          }
          if (!task.resampler) {
            task.resampler = new Resampler({
              resource: task.resamplerResource
            })
            await task.resampler.open(
              {
                sampleRate: audioFrame.sampleRate,
                format: audioFrame.format,
                channels: audioFrame.chLayout.nbChannels
              },
              {
                sampleRate: task.playSampleRate,
                format: task.playFormat,
                channels: task.playChannels
              }
            )
          }

          let pcmBuffer = this.avPCMBufferPool.alloc()
          let ret = task.resampler.resample(audioFrame.extendedData, pcmBuffer, audioFrame.nbSamples)
          if (ret < 0) {
            logger.error(`resample error, ret: ${ret}, taskId: ${task.taskId}`)
            this.avPCMBufferPool.release(pcmBuffer)
            return ret
          }
          if (!task.useStretchpitcher) {
            task.waitPCMBuffer = pcmBuffer
            task.waitPCMBufferPos = 0
          }
          else {
            for (let i = 0; i < task.playChannels; i++) {
              const stretchpitcher = task.stretchpitcher.get(i)
              stretchpitcher.sendSamples(
                reinterpret_cast<pointer<float>>(pcmBuffer.data[i]),
                pcmBuffer.nbSamples
              )
            }
            this.avPCMBufferPool.release(pcmBuffer)
          }
        }
        else {
          if (!task.useStretchpitcher) {
            let pcmBuffer = this.avPCMBufferPool.alloc()

            if (pcmBuffer.data) {
              avFreep(addressof(pcmBuffer.data[0]))
              avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(pcmBuffer.data)))
            }

            pcmBuffer.nbSamples = audioFrame.nbSamples
            pcmBuffer.maxnbSamples = audioFrame.nbSamples
            pcmBuffer.sampleRate = audioFrame.sampleRate
            pcmBuffer.channels = audioFrame.chLayout.nbChannels
            pcmBuffer.data = audioFrame.extendedData

            task.waitAVFrame = audioFrame

            task.waitPCMBuffer = pcmBuffer
            task.waitPCMBufferPos = 0

            releaseAudioFrame = false
          }
          else {
            for (let i = 0; i < task.playChannels; i++) {
              const stretchpitcher = task.stretchpitcher.get(i)
              stretchpitcher.sendSamples(
                reinterpret_cast<pointer<float>>(audioFrame.extendedData[i]),
                audioFrame.nbSamples
              )
            }
          }
        }

        task.stats.sampleRate = audioFrame.sampleRate
        task.stats.channels = audioFrame.chLayout.nbChannels
        task.stats.audioFrameSize = audioFrame.nbSamples

        if (releaseAudioFrame) {
          task.avframePool.release(audioFrame)
        }
      }
      return 0
    }

    const receiveToPCMBuffer = async (pcmBuffer: pointer<AVPCMBuffer>) => {
      let receive = 0

      if (task.seeking) {
        await new Promise<void>((resolve) => {
          task.receivePCMSync = resolve
        })
        if (task.stopping) {
          return IOError.END
        }
      }

      if (task.enableJitterBuffer) {
        let buffer = task.stats.audioPacketQueueLength / task.stats.audioEncodeFramerate * 1000
        if (buffer <= task.stats.jitterBuffer.min) {
          this.setPlayRate(task.taskId, 1)
        }
      }

      if (task.ended && task.useStretchpitcher) {
        let ret = 0
        for (let i = 0; i < task.playChannels; i++) {
          const stretchpitcher = task.stretchpitcher.get(i)
          if (pcmBuffer.data[i]) {
            ret = stretchpitcher.receiveSamples(
              reinterpret_cast<pointer<float>>(reinterpret_cast<pointer<float>>(pcmBuffer.data[i]) + receive),
              pcmBuffer.maxnbSamples - receive
            )
          }
        }
        if (receive + ret < pcmBuffer.maxnbSamples) {
          task.stretchpitcherEnded = true
          for (let i = 0; i < task.playChannels; i++) {
            // 将不足的置为 0 
            memset(pcmBuffer.data[i] + receive, 0, (pcmBuffer.maxnbSamples - receive) * reinterpret_cast<int32>(sizeof(float)))
          }
        }
        pcmBuffer.nbSamples = receive
        return 0
      }

      while (receive < pcmBuffer.maxnbSamples) {
        let len = 0

        if (!task.useStretchpitcher) {
          if (task.waitPCMBuffer) {
            len = Math.min(
              task.waitPCMBuffer.nbSamples - task.waitPCMBufferPos,
              pcmBuffer.maxnbSamples - receive
            )
            if (len) {
              for (let i = 0; i < task.playChannels; i++) {
                memcpy(
                  pcmBuffer.data[i] + receive * reinterpret_cast<int32>(sizeof(float)),
                  task.waitPCMBuffer.data[i] + task.waitPCMBufferPos * reinterpret_cast<int32>(sizeof(float)),
                  len * reinterpret_cast<int32>(sizeof(float))
                )
              }
              task.waitPCMBufferPos += len
            }
            if (task.waitPCMBuffer.nbSamples === task.waitPCMBufferPos) {
              if (task.waitAVFrame) {
                // data 是 avframe 的引用，这里需要置空，防止 waitPCMBuffer 释放的时候将 avframe 的内存释放了
                task.waitPCMBuffer.data = nullptr
                task.waitPCMBuffer.maxnbSamples = 0
                task.avframePool.release(task.waitAVFrame)
                task.waitAVFrame = nullptr
              }
              this.avPCMBufferPool.release(task.waitPCMBuffer)
              task.waitPCMBuffer = nullptr
            }
          }
        }
        else {
          for (let i = 0; i < task.playChannels; i++) {
            const stretchpitcher = task.stretchpitcher.get(i)
            if (pcmBuffer.data[i]) {
              len = stretchpitcher.receiveSamples(
                reinterpret_cast<pointer<float>>(reinterpret_cast<pointer<float>>(pcmBuffer.data[i]) + receive),
                pcmBuffer.maxnbSamples - receive
              )
            }
          }
        }

        receive += len

        if (receive < pcmBuffer.maxnbSamples) {
          let ret = await pullNewAudioFrame()
          if (ret === IOError.END) {
            task.ended = true
            if (task.useStretchpitcher) {
              for (let i = 0; i < task.playChannels; i++) {
                const stretchpitcher = task.stretchpitcher.get(i)
                if (pcmBuffer.data[i]) {
                  stretchpitcher.flush()
                  ret = stretchpitcher.receiveSamples(
                    reinterpret_cast<pointer<float>>(reinterpret_cast<pointer<float>>(pcmBuffer.data[i]) + receive),
                    pcmBuffer.maxnbSamples - receive
                  )
                }
              }
              if (receive + ret < pcmBuffer.maxnbSamples) {
                task.stretchpitcherEnded = true
                for (let i = 0; i < task.playChannels; i++) {
                  // 将不足的置为 0 
                  memset(pcmBuffer.data[i] + receive, 0, (pcmBuffer.maxnbSamples - receive) * reinterpret_cast<int32>(sizeof(float)))
                }
              }
              receive += ret
            }
            break
          }
          else if (ret < 0) {
            return ret
          }
        }
      }
      pcmBuffer.nbSamples = receive

      if (task.seekSync) {
        task.seekSync()
        task.seekSync = null
      }

      return 0
    }

    rightIPCPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'pull': {
          if (task.fakePlay) {
            task.fakePlay = false
            this.clearFakePlayTimer(task)
            task.fakePlaySamples = 0n
            task.fakePlayStartTimestamp = 0
          }
          if (task.ended && (task.stretchpitcherEnded || !task.useStretchpitcher)) {
            rightIPCPort.reply(request, IOError.END)
            return
          }
          const pcmBuffer: pointer<AVPCMBuffer> = request.params.buffer

          if (!task.firstPlayed) {
            task.masterTimer.setMasterTime(task.lastMasterPts === NOPTS_VALUE_BIGINT ? task.startPTS : task.lastMasterPts)
            task.lastMasterPts = NOPTS_VALUE_BIGINT
            let ret = await pullNewAudioFrame()
            if (ret < 0) {
              rightIPCPort.reply(request, ret)
              break
            }
          }

          const diff = task.currentPTS - task.masterTimer.getMasterTime()

          if (diff > MASTER_SYNC_THRESHOLD) {
            memset(pcmBuffer.data[0], 0, pcmBuffer.maxnbSamples * reinterpret_cast<int32>(sizeof(float)) * pcmBuffer.channels)
            rightIPCPort.reply(request, 0)
            this.fakeSyncPts(task)
            break
          }
          else {
            this.syncPts(task, pcmBuffer.maxnbSamples)
          }

          const ret = await receiveToPCMBuffer(pcmBuffer)
          rightIPCPort.reply(request, ret)
          break
        }

        case 'pullBuffer': {
          if (task.fakePlay) {
            task.fakePlay = false
            this.clearFakePlayTimer(task)
            task.fakePlaySamples = 0n
            task.fakePlayStartTimestamp = 0
          }

          if (task.ended && (task.stretchpitcherEnded || !task.useStretchpitcher)) {
            rightIPCPort.reply(request, IOError.END)
            return
          }

          const nbSamples: int32 = request.params.nbSamples

          if (!task.outPCMBuffer || task.outPCMBuffer.maxnbSamples !== nbSamples) {
            if (task.outPCMBuffer) {
              avFreep(addressof(task.outPCMBuffer.data[0]))
              avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(task.outPCMBuffer.data)))
              unmake(task.outPCMBuffer)
            }
            task.outPCMBuffer = make<AVPCMBuffer>()
            task.outPCMBuffer.data = reinterpret_cast<pointer<pointer<uint8>>>(avMalloc(reinterpret_cast<int32>(sizeof(pointer)) * task.playChannels))
            const data = avMallocz(nbSamples * reinterpret_cast<int32>(sizeof(float)) * task.playChannels)
            for (let i = 0; i < task.playChannels; i++) {
              task.outPCMBuffer.data[i] = reinterpret_cast<pointer<uint8>>(data + nbSamples * reinterpret_cast<int32>(sizeof(float)) * i)
            }
            task.outPCMBuffer.maxnbSamples = nbSamples
          }

          if (!task.firstPlayed) {
            task.masterTimer.setMasterTime(task.lastMasterPts === NOPTS_VALUE_BIGINT ? task.startPTS : task.lastMasterPts)
            task.lastMasterPts = NOPTS_VALUE_BIGINT
            let ret = await pullNewAudioFrame()
            if (ret < 0) {
              rightIPCPort.reply(request, ret)
              break
            }
          }

          const diff = task.currentPTS - task.masterTimer.getMasterTime()

          if (diff > MASTER_SYNC_THRESHOLD) {
            const pcm = new Uint8Array(task.outPCMBuffer.nbSamples * reinterpret_cast<int32>(sizeof(float)) * task.playChannels)
            rightIPCPort.reply(request, pcm.buffer, null, [pcm.buffer])
            this.fakeSyncPts(task)
            break
          }
          else {
            this.syncPts(task, task.outPCMBuffer.maxnbSamples)
          }

          const ret = await receiveToPCMBuffer(addressof(task.outPCMBuffer))

          if (ret < 0) {
            rightIPCPort.reply(request, ret)
            return
          }

          const pcm = mapUint8Array(
            task.outPCMBuffer.data[0],
            task.outPCMBuffer.nbSamples * reinterpret_cast<int32>(sizeof(float)) * task.playChannels
          ).slice()

          rightIPCPort.reply(request, pcm.buffer, null, [pcm.buffer])

          break
        }
      }
    })

    this.tasks.set(options.taskId, task)
    return 0
  }

  private checkUseStretchpitcher(task: SelfTask) {
    const use = task.playRate !== 1
      || task.playTempo !== 1
      || task.playPitch !== 1
      || task.enableJitterBuffer

    if (task.useStretchpitcher && !use) {
      for (let i = 0; i < task.playChannels; i++) {
        task.stretchpitcher.get(i).flush()
      }
    }
  }

  public setPlayRate(taskId: string, rate: double) {
    const task = this.tasks.get(taskId)
    if (task) {

      if (task.enableJitterBuffer) {
        let buffer = task.stats.audioPacketQueueLength / task.stats.audioEncodeFramerate * 1000
        if (buffer <= task.stats.jitterBuffer.min) {
          rate = 1
        }
      }

      task.playRate = rate
      for (let i = 0; i < task.playChannels; i++) {
        task.stretchpitcher.get(i).setRate(rate)
      }
      this.checkUseStretchpitcher(task)
      task.masterTimer.setRate(task.playRate * task.playTempo)
      if (task.fakePlay) {
        task.fakePlayStartTimestamp = getTimestamp()
        task.fakePlaySamples = 0n
      }
    }
  }

  public async setPlayTempo(taskId: string, tempo: double) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.playTempo = tempo
      for (let i = 0; i < task.playChannels; i++) {
        task.stretchpitcher.get(i).setTempo(tempo)
      }
      this.checkUseStretchpitcher(task)
      task.masterTimer.setRate(task.playRate * task.playTempo)
      if (task.fakePlay) {
        task.fakePlayStartTimestamp = getTimestamp()
        task.fakePlaySamples = 0n
      }
    }
  }

  public setPlayPitch(taskId: string, pitch: double) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.playPitch = pitch
      for (let i = 0; i < task.playChannels; i++) {
        task.stretchpitcher.get(i).setPitch(pitch)
      }
      this.checkUseStretchpitcher(task)
    }
  }

  public async beforeSeek(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (!task.fakePlay && !task.pausing) {
        logger.debug(`wait current pull front frame before seek, taskId: ${task.taskId}`)
        await new Promise<void>((resolve) => {
          task.seekSync = resolve
        })
      }
      else {
        this.clearFakePlayTimer(task)
      }

      task.seeking = true

      if (task.stretchpitcher.size) {
        for (const key of task.stretchpitcher.keys()) {
          task.stretchpitcher.get(key).clear()
        }
      }
      if (task.waitPCMBuffer) {
        if (task.waitAVFrame) {
          // data 是 avframe 的引用，这里需要置空，防止 waitPCMBuffer 释放的时候将 avframe 的内存释放了
          task.waitPCMBuffer.data = nullptr
          task.waitPCMBuffer.maxnbSamples = 0
          task.avframePool.release(task.waitAVFrame)
          task.waitAVFrame = nullptr
        }
        this.avPCMBufferPool.release(task.waitPCMBuffer)
        task.waitPCMBuffer = nullptr
      }

      logger.debug(`before seek end, taskId: ${task.taskId}`)
    }
  }

  public async syncSeekTime(taskId: string, timestamp: int64, maxQueueLength?: number) {
    const task = this.tasks.get(taskId)
    if (task) {

      let videoEnded = false

      while (true) {
        // 已经调用了 unregisterTask
        if (!task.leftIPCPort) {
          task.ended = true
          logger.warn(`pull audio frame end after unregisterTask, taskId: ${taskId}`)
          return
        }

        let now = getTimestamp()
        let videoPacketQueueLength = task.stats.videoPacketQueueLength
        while (!videoEnded && maxQueueLength && task.stats.videoPacketQueueLength > maxQueueLength) {
          await new Sleep(0)
          // 检查 videoPacketQueueLength 200ms 内没有变化说明 video 已经 sync 完成
          // 否则某些条件下会卡主
          if (getTimestamp() - now > 200 && videoPacketQueueLength === task.stats.videoPacketQueueLength) {
            videoEnded = true
          }
          if (videoPacketQueueLength !== task.stats.videoPacketQueueLength) {
            videoPacketQueueLength = task.stats.videoPacketQueueLength
            now = getTimestamp()
          }
        }

        let audioFrame = await task.leftIPCPort.request<pointer<AVFrameRef>>('pull')

        if (audioFrame < 0) {
          logger.warn(`pull audio frame end after seek, taskId: ${taskId}`)
          task.ended = true
          break
        }

        if (timestamp < 0n) {
          logger.info(`use the first audio frame because of the seek time${timestamp} < 0`)
          break
        }

        const pts = avRescaleQ2(
          audioFrame.pts,
          addressof(audioFrame.timeBase),
          AV_MILLI_TIME_BASE_Q
        )

        if (pts >= timestamp) {
          task.paddingAVFrame = audioFrame
          task.ended = false
          task.lastNotifyPTS = pts
          task.stats.audioCurrentTime = pts
          task.currentPTS = pts
          task.masterTimer.setMasterTime(timestamp)
          task.lastMasterPts = timestamp
          break
        }
        else {
          if (defined(ENABLE_LOG_TRACE)) {
            logger.trace(`skip audio frame pts: ${audioFrame.pts}(${pts}ms), which is earlier then the seeked time(${timestamp}ms), taskId: ${task.taskId}`)
          }
          task.avframePool.release(audioFrame)
        }
      }

      logger.debug(`sync seek time end, taskId: ${task.taskId}`)
    }
  }

  public async afterSeek(taskId: string, timestamp: int64) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.seeking = false
      if (task.receivePCMSync) {
        task.receivePCMSync()
        task.receivePCMSync = null
      }

      if (!task.pausing) {
        if (task.fakePlay) {
          task.fakePlayStartTimestamp = getTimestamp()
          task.fakePlaySamples = 0n
          this.fakePlayNext(task)
        }
        task.lastRenderTimestamp = getTimestamp()
      }

      logger.debug(`after seek end, taskId: ${task.taskId}`)
    }
  }

  public async restart(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.lastNotifyPTS = 0n
      task.ended = false
      task.firstPlayed = false
      task.stretchpitcherEnded = false
      if (task.stretchpitcher?.size) {
        for (let i = 0; i < task.playChannels; i++) {
          task.stretchpitcher.get(i)?.clear()
        }
      }
      this.clearFakePlayTimer(task)
      task.fakePlaySamples = 0n
      task.fakePlayStartTimestamp = 0
      task.lastRenderTimestamp = getTimestamp()
      task.masterTimer.setMasterTime(task.startPTS)

      logger.debug(`restart task, taskId: ${task.taskId}`)
    }
  }

  public async setMasterTime(taskId: string, masterTime: int64) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.masterTimer.setMasterTime(masterTime)
    }
  }

  private fakeSyncPts(task: SelfTask) {
    const pts = task.masterTimer.getMasterTime()
    if (pts - task.lastNotifyPTS >= 1000n) {
      task.lastNotifyPTS = pts
      task.stats.audioCurrentTime = pts
      task.controlIPCPort.notify('syncPts', {
        pts
      })
    }
  }

  private syncPts(task: SelfTask, maxnbSamples: int32) {
    const latency = (((task.useStretchpitcher ? task.stretchpitcher.get(0).getLatency() : 0)
        // 双缓冲，假定后缓冲播放到中间
        + (maxnbSamples * 3 >>> 1)) / task.playSampleRate * 1000) >>> 0
    const currentPts = bigint.max(task.currentPTS - static_cast<int64>(latency), 0n)
    task.stats.audioCurrentTime = currentPts
    if (task.currentPTS - task.lastNotifyPTS >= 1000n) {
      task.lastNotifyPTS = task.currentPTS
      task.controlIPCPort.notify('syncPts', {
        pts: currentPts
      })
    }
  }

  private clearFakePlayTimer(task: SelfTask) {
    if (task.fakePlayTimer) {
      if (task.fakePlayWorkerTimer) {
        task.fakePlayWorkerTimer.clearTimeout(task.fakePlayTimer as unknown as number)
        task.fakePlayWorkerTimer.destroy()
        task.fakePlayWorkerTimer = null
      }
      else {
        clearTimeout(task.fakePlayTimer)
      }
      task.fakePlayTimer = null
    }
  }

  private setFakePlayTimer(task: SelfTask, fn: Function, timeout: number) {
    if (isWorker()) {
      return setTimeout(fn, timeout) as unknown as Timeout
    }
    else {
      if (!task.fakePlayWorkerTimer) {
        task.fakePlayWorkerTimer = new WorkerSetTimeout()
      }
      return task.fakePlayWorkerTimer.setTimeout(fn, timeout) as unknown as Timeout
    }
  }

  private async fakePlayNext(task: SelfTask) {

    const audioFrame = task.paddingAVFrame || await task.leftIPCPort.request<pointer<AVFrameRef>>('pull')

    task.paddingAVFrame = nullptr

    if (audioFrame < 0) {
      task.ended = true

      logger.info(`audio fake render ended, taskId: ${task.taskId}`)
      task.controlIPCPort.notify('ended')
      return
    }

    if (!task.fakePlay || task.pausing) {
      task.avframePool.release(audioFrame)
      return
    }

    let next = (audioFrame.nbSamples / audioFrame.sampleRate * 1000) >>> 0

    next /= (task.playRate * task.playTempo)

    const pts = avRescaleQ2(audioFrame.pts, addressof(audioFrame.timeBase), AV_MILLI_TIME_BASE_Q)
    if (pts > 0n && (task.masterTimer.getMasterTime() - pts > MASTER_SYNC_THRESHOLD)) {
      task.masterTimer.setMasterTime(pts)
    }
    // 直播差值大于 4s 认为从某一处开始了
    else if (task.isLive && (pts - task.currentPTS > 4000n)) {
      task.masterTimer.setMasterTime(pts)
    }
    task.currentPTS = pts

    const diffPts = task.currentPTS - task.masterTimer.getMasterTime()
    if (diffPts > MASTER_SYNC_THRESHOLD) {
      task.paddingAVFrame = audioFrame
      this.fakeSyncPts(task)
      task.fakePlayTimer = this.setFakePlayTimer(task, () => {
        task.fakePlayTimer = null
        this.fakePlayNext(task)
      }, next)
      return
    }
    else {
      this.syncPts(task, 0)
    }

    let targetSamples = static_cast<int64>(getTimestamp() - task.fakePlayStartTimestamp) * static_cast<int64>(audioFrame.sampleRate) / 1000n
    targetSamples = targetSamples * static_cast<int64>(task.playRate * task.playTempo * 100) / 100n

    const diff = Number(targetSamples - task.fakePlaySamples)

    next -= (diff / audioFrame.sampleRate * 1000) >>> 0

    task.fakePlaySamples += static_cast<int64>(audioFrame.nbSamples)

    task.avframePool.release(audioFrame)
    if (task.currentPTS - task.lastNotifyPTS >= 1000n) {
      task.lastNotifyPTS = task.currentPTS
      task.stats.audioCurrentTime = task.currentPTS
      task.controlIPCPort.notify('syncPts', {
        pts: task.currentPTS
      })
    }

    task.fakePlayTimer = this.setFakePlayTimer(task, () => {
      task.fakePlayTimer = null
      this.fakePlayNext(task)
    }, next)
  }

  public async fakePlay(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.fakePlayStartTimestamp = getTimestamp()
      task.fakePlay = true
      task.fakePlaySamples = 0n
      this.fakePlayNext(task)

      logger.info(`start fake play, taskId: ${task.taskId}`)
    }
  }

  public async pause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.pausing = true
      task.lastMasterPts = task.masterTimer.getMasterTime()
      if (task.fakePlay) {
        this.clearFakePlayTimer(task)
      }

      logger.info(`task paused, taskId: ${task.taskId}`)
    }
  }

  public async unpause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.pausing = false
      task.masterTimer.setMasterTime(task.lastMasterPts)
      task.lastMasterPts = NOPTS_VALUE_BIGINT
      if (task.fakePlay) {
        task.fakePlayStartTimestamp = getTimestamp()
        task.fakePlaySamples = 0n
        task.lastRenderTimestamp = getTimestamp()
        this.fakePlayNext(task)
      }

      logger.info(`task unpaused, taskId: ${task.taskId}`)
    }
  }

  public async stop(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.stopping = true
      if (task.receivePCMSync) {
        task.receivePCMSync()
        task.receivePCMSync = null
      }
      logger.info(`task stopping, taskId: ${task.taskId}`)
    }
  }

  public async registerTask(options: AudioRenderTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return error.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      this.clearFakePlayTimer(task)
      if (task.resampler) {
        task.resampler.close()
      }
      if (task.stretchpitcher.size) {
        for (const key of task.stretchpitcher.keys()) {
          task.stretchpitcher.get(key).close()
        }
        task.stretchpitcher.clear()
      }
      if (task.outPCMBuffer) {
        avFreep(addressof(task.outPCMBuffer.data[0]))
        avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(task.outPCMBuffer.data)))
        unmake(task.outPCMBuffer)
      }

      if (task.waitPCMBuffer) {
        if (task.waitAVFrame) {
          // data 是 avframe 的引用，这里需要置空，防止 waitPCMBuffer 释放的时候将 avframe 的内存释放了
          task.waitPCMBuffer.data = nullptr
          task.waitPCMBuffer.maxnbSamples = 0
          task.avframePool.release(task.waitAVFrame)
          task.waitAVFrame = nullptr
        }
        this.avPCMBufferPool.release(task.waitPCMBuffer)
        task.waitPCMBuffer = nullptr
      }
      if (task.paddingAVFrame) {
        task.avframePool.release(task.paddingAVFrame)
      }
      if (task.leftIPCPort) {
        task.leftIPCPort.destroy()
        task.leftIPCPort = null
      }
      if (task.rightIPCPort) {
        task.rightIPCPort.destroy()
        task.rightIPCPort = null
      }
      this.tasks.delete(taskId)
    }
  }

  public async clear() {
    await super.clear()
    this.avPCMBufferList.clear((buffer) => {
      if (buffer.data) {
        avFreep(addressof(buffer.data[0]))
        avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(buffer.data)))
      }
    })
    unmake(this.avPCMBufferList)
    unmake(this.avPCMBufferListMutex)
  }
}
