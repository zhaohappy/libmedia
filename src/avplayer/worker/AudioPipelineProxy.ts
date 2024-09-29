/*
 * libmedia AudioPipelineProxy
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

import { createThreadFromClass, joinThread, Thread } from 'cheap/thread/thread'
import AudioPipeline from './AudioPipeline'
import Stats from 'avpipeline/struct/stats'
import IPCPort, { NOTIFY, RpcMessage } from 'common/network/IPCPort'
import * as object from 'common/util/object'

export default class AudioPipelineProxy {

  private thread: Thread<AudioPipeline>

  private controlMessageChannel: MessageChannel

  private controlPort: IPCPort

  private statsMap: Map<string, Stats>

  constructor() {
    this.statsMap = new Map()
  }

  public async run() {
    this.thread = await createThreadFromClass(AudioPipeline, {
      name: 'AudioPipeline',
      dispatchToWorker: true
    }).run()

    this.controlMessageChannel = new MessageChannel()
    this.controlPort = new IPCPort(this.controlMessageChannel.port1)

    this.controlPort.on(NOTIFY, (request: RpcMessage) => {
      switch (request.method) {
        case 'stats': {
          const data: any[] = request.params.data
          const syncStats = []
          for (let i = 0; i < data.length; i++) {
            const stats = this.statsMap.get(data[i].taskId)
            if (stats) {
              object.each(data[i].stats, (value, key) => {
                stats[key] = value
              })
              syncStats.push({
                taskId: data[i].taskId,
                stats: {
                  audioPacketQueueLength: stats.audioPacketQueueLength,
                  audioEncodeFramerate: stats.audioEncodeFramerate,
                  videoPacketQueueLength: stats.videoPacketQueueLength
                },
                jitterBuffer: {
                  min: stats.jitterBuffer.min,
                  max: stats.jitterBuffer.max
                }
              })
            }
          }

          this.controlPort.notify('stats', {
            data: {
              stats: syncStats
            }
          })
        }
      }
    })

    await this.thread.init.transfer(this.controlMessageChannel.port2).invoke(this.controlMessageChannel.port2)
  }

  public async destroy() {
    await joinThread(this.thread)
    this.thread = null
  }

  public setLogLevel(level: number) {
    this.thread.setLogLevel(level)
  }

  private transformResult(method: string, args: any, result: any) {
    if (method === 'unregisterTask') {
      this.statsMap.delete(args[0])
    }
    else if (method === 'clear') {
      this.statsMap.clear()
    }
    else if (method === 'registerTask') {
      this.statsMap.set(args[0].taskId, accessof(args[0].stats as pointer<Stats>))
    }
    else if (method === 'syncSeekTime') {
      const stats = this.statsMap.get(args[0])
      if (stats) {
        stats.audioCurrentTime = result
        return
      }
    }
    return result
  }

  get AudioDecodePipeline() {
    const me = this
    return new Proxy({}, {
      get(target, propertyKey, receiver) {
        if (target[propertyKey]) {
          return target[propertyKey]
        }
        const call = async function (...args: any[]) {
          return me.thread.invoke('decoder', propertyKey as string, args)
            .then((result) => {
              result = me.transformResult(propertyKey as string, args, result)
              return result
            })
        }
        call.transfer = function (...transfer: Transferable[]) {
          return {
            invoke: async function (...args: any[]) {
              return me.thread.invoke.transfer(...transfer).invoke('decoder', propertyKey as string, args)
                .then((result) => {
                  result = me.transformResult(propertyKey as string, args, result)
                  return result
                })
            }
          }
        }
        target[propertyKey] = call
        return target[propertyKey]
      }
    })
  }

  get AudioRenderPipeline() {

    const me = this

    return new Proxy({}, {
      get(target, propertyKey, receiver) {
        if (target[propertyKey]) {
          return target[propertyKey]
        }
        const call = async function (...args: any[]) {
          return me.thread.invoke('render', propertyKey as string, args)
            .then((result) => {
              result = me.transformResult(propertyKey as string, args, result)
              return result
            })
        }
        call.transfer = function (...transfer: Transferable[]) {
          return {
            invoke: async function (...args: any[]) {
              return me.thread.invoke.transfer(...transfer).invoke('render', propertyKey as string, args)
                .then((result) => {
                  result = me.transformResult(propertyKey as string, args, result)
                  return result
                })
            }
          }
        }
        target[propertyKey] = call
        return target[propertyKey]
      }
    })
  }
}
