
/*
 * libmedia IODemuxPipeline
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

import type { AVPlayerGlobalData } from '../struct'

import { IOPipeline, DemuxPipeline, type Stats } from '@libmedia/avpipeline'

import {
  is,
  logger
} from '@libmedia/common'

import {
  Timer
} from '@libmedia/common/timer'

import {
  IPCPort
} from '@libmedia/common/network'

import {
  mutex
} from '@libmedia/cheap'

import {
  unrefAVPacket,
  unrefAVFrame,
  AVMediaType,
  serializeAVCodecParameters,
  type AVStreamInterface
} from '@libmedia/avutil'


export default class IODemuxPipeline {

  private ioThread: IOPipeline

  private demuxPipeline: DemuxPipeline

  private globalDataMap: Map<string, AVPlayerGlobalData>

  private controlPort: IPCPort

  private timer: Timer

  constructor() {
    this.ioThread = new IOPipeline()
    this.demuxPipeline = new DemuxPipeline()
    this.globalDataMap = new Map()
  }

  private createGlobalData(taskId: string) {
    const data = make<AVPlayerGlobalData>()
    mutex.init(addressof(data.avpacketListMutex))
    mutex.init(addressof(data.avframeListMutex))
    this.globalDataMap.set(taskId, data)
    return data
  }

  private releaseGlobalData(data: AVPlayerGlobalData) {
    data.avframeList.clear((avframe) => {
      unrefAVFrame(avframe)
    })
    data.avpacketList.clear((avpacket) => {
      unrefAVPacket(avpacket)
    })

    mutex.destroy(addressof(data.avpacketListMutex))
    mutex.destroy(addressof(data.avframeListMutex))

    unmake(data)
  }

  public async init(controlPort: MessagePort) {
    this.controlPort = new IPCPort(controlPort)
    this.timer = new Timer(() => {
      const result = []
      this.globalDataMap.forEach((globalData, key) => {
        const stats = globalData.stats

        const data: Partial<Stats> = {
          bufferReceiveBytes: stats.bufferReceiveBytes
        }
        const task = this.demuxPipeline.tasks.get(key)
        if (!task) {
          return
        }
        if (task.formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)) {
          data.audioPacketQueueLength = stats.audioPacketQueueLength
          data.audioPacketCount = stats.audioPacketCount
          data.audioPacketBytes = stats.audioPacketBytes
          data.audioEncodeFramerate = stats.audioEncodeFramerate
        }
        if (task.formatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)) {
          data.videoPacketQueueLength = stats.videoPacketQueueLength
          data.videoPacketCount = stats.videoPacketCount
          data.videoPacketBytes = stats.videoPacketBytes
          data.keyFrameCount = stats.keyFrameCount
          data.gop = stats.gop
          data.keyFrameInterval = stats.keyFrameInterval
          data.videoEncodeFramerate = stats.videoEncodeFramerate
        }

        result.push({
          taskId: key,
          stats: data
        })
      })
      this.controlPort.notify('stats', {
        data: result
      })
    }, 0, 500)

    this.timer.start()
  }

  public async invoke(type: 'io' | 'demux', method: string, args: any[]) {

    const me = this

    function transformResult(method: string, args: any, result: any) {
      if (method === 'unregisterTask') {
        const globalData = me.globalDataMap.get(args[0])
        if (globalData) {
          me.releaseGlobalData(globalData)
          me.globalDataMap.delete(args[0])
        }
      }
      else if (method === 'clear') {
        me.globalDataMap.forEach((globalData) => {
          me.releaseGlobalData(globalData)
        })
        me.globalDataMap.clear()
      }
      else if (method === 'analyzeStreams' && !is.number(result)) {
        result.streams.forEach((stream: AVStreamInterface) => {
          stream.codecpar = serializeAVCodecParameters(stream.codecpar) as any
        })
      }
    }

    if (type === 'io') {
      if (method === 'registerTask') {
        const globalData = this.globalDataMap.get(args[0].taskId) || this.createGlobalData(args[0].taskId)
        args[0].stats = addressof(globalData.stats)
      }
      if (is.func(this.ioThread[method])) {
        return this.ioThread[method](...args)
          .then((result: any) => {
            transformResult(method, args, result)
            return result
          })
      }
      else {
        logger.fatal(`method ${method} not found`)
      }
    }
    else {
      if (method === 'registerTask') {
        const globalData = this.globalDataMap.get(args[0].taskId) || this.createGlobalData(args[0].taskId)
        args[0].stats = addressof(globalData.stats)
        args[0].avpacketList = addressof(globalData.avpacketList)
        args[0].avpacketListMutex = addressof(globalData.avpacketListMutex)
      }
      if (is.func(this.demuxPipeline[method])) {
        return this.demuxPipeline[method](...args)
          .then((result: any) => {
            transformResult(method, args, result)
            return result
          })
      }
      else {
        logger.fatal(`method ${method} not found`)
      }
    }
  }

  public async setLogLevel(level: number) {
    logger.setLevel(level)
  }
}
