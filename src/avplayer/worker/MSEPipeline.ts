
/*
 * libmedia MSEPipelineWorker
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

import * as is from 'common/util/is'
import { AVPlayerGlobalData } from '../struct'
import * as logger from 'common/util/logger'
import { unrefAVFrame } from 'avutil/util/avframe'
import { unrefAVPacket } from 'avutil/util/avpacket'
import * as mutex from 'cheap/thread/mutex'
import IPCPort, { NOTIFY, RpcMessage } from 'common/network/IPCPort'
import Timer from 'common/timer/Timer'
import * as object from 'common/util/object'
import MSEPipeline from '../mse/MSEPipeline'

export default class MSEPipelineWorker {

  private mse: MSEPipeline

  private globalDataMap: Map<string, AVPlayerGlobalData>

  private controlPort: IPCPort

  private timer: Timer

  constructor() {
    this.mse = new MSEPipeline()
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
        result.push({
          taskId: key,
          stats: {
            audioFrameDecodeCount: stats.audioFrameDecodeCount,
            audioFrameRenderCount: stats.audioFrameRenderCount,
            sampleRate: stats.sampleRate,
            channels: stats.channels,
            videoFrameDecodeCount: stats.videoFrameDecodeCount,
            videoFrameRenderCount: stats.videoFrameRenderCount,
            width: stats.width,
            height: stats.height
          }
        })
      })
      this.controlPort.notify('stats', {
        data: result
      })
    }, 0, 500)

    this.controlPort.on(NOTIFY, (request: RpcMessage) => {
      switch (request.method) {
        case 'stats': {
          const data: any[] = request.params.data
          for (let i = 0; i < data.length; i++) {
            const stats = this.globalDataMap.get(data[i].taskId).stats
            if (stats) {
              object.each(data[i].stats, (value, key) => {
                stats[key] = value
              })
              stats.jitterBuffer.min = data[i].jitterBuffer.min
              stats.jitterBuffer.max = data[i].jitterBuffer.max
            }
          }
        }
      }
    })

    this.timer.start()
  }

  public async invoke(method: string, args: any[]) {

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
      return result
    }

    if (method === 'registerTask') {
      const globalData = this.globalDataMap.get(args[0].taskId) || this.createGlobalData(args[0].taskId)
      args[0].stats = addressof(globalData.stats)
      args[0].avpacketList = addressof(globalData.avpacketList)
      args[0].avpacketListMutex = addressof(globalData.avpacketListMutex)
    }
    if (is.func(this.mse[method])) {
      if (!this.mse[method].transfer) {
        this.mse[method].transfer = []
      }
      return this.mse[method](...args)
        .then((result: any) => {
          if (this.mse[method].transfer.length) {
            this.invoke.transfer = this.mse[method].transfer
          }
          result = transformResult(method, args, result)
          return result
        })
    }
    else {
      logger.fatal(`method ${method} not found`)
    }
  }

  public async setLogLevel(level: number) {
    logger.setLevel(level)
  }
}
