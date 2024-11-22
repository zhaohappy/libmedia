/*
 * libmedia IODemuxPipelineProxy
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
import IODemuxPipeline from './IODemuxPipeline'
import { AVStreamInterface } from 'avutil/AVStream'
import { AVCodecParametersSerialize, unserializeAVCodecParameters } from 'avutil/util/serialize'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import * as is from 'common/util/is'
import isPointer from 'cheap/std/function/isPointer'
import { freeCodecParameters } from 'avutil/util/codecparameters'
import IPCPort, { NOTIFY, RpcMessage } from 'common/network/IPCPort'
import Stats from 'avpipeline/struct/stats'
import * as object from 'common/util/object'

export default class IODemuxPipelineProxy {

  private thread: Thread<IODemuxPipeline>

  private codecparMap: Map<string, pointer<AVCodecParameters>[]>

  private controlMessageChannel: MessageChannel

  private controlPort: IPCPort

  private statsMap: Map<string, Stats>

  constructor() {
    this.codecparMap = new Map()
    this.statsMap = new Map()
  }

  public async run() {
    this.thread = await createThreadFromClass(IODemuxPipeline, {
      name: 'IODemuxPipeline',
      dispatchToWorker: true
    }).run()

    this.controlMessageChannel = new MessageChannel()
    this.controlPort = new IPCPort(this.controlMessageChannel.port1)

    this.controlPort.on(NOTIFY, (request: RpcMessage) => {
      switch (request.method) {
        case 'stats': {
          const data: any[] = request.params.data
          for (let i = 0; i < data.length; i++) {
            const stats = this.statsMap.get(data[i].taskId)
            if (stats) {
              object.each(data[i].stats, (value, key) => {
                stats[key] = value
              })
            }
          }
        }
      }
    })
    await this.thread.init.transfer(this.controlMessageChannel.port2).invoke(this.controlMessageChannel.port2)
  }

  public setLogLevel(level: number) {
    this.thread.setLogLevel(level)
  }

  public async destroy() {
    await joinThread(this.thread)
    this.thread = null
  }

  get IOPipeline() {

    const me = this

    return new Proxy({}, {
      get(target, propertyKey, receiver) {
        if (target[propertyKey]) {
          return target[propertyKey]
        }
        const call = async function (...args: any[]) {
          return me.thread.invoke('io', propertyKey as string, args)
        }
        call.transfer = function (...transfer: Transferable[]) {
          return {
            invoke: async function (...args: any[]) {
              return me.thread.invoke.transfer(...transfer).invoke('io', propertyKey as string, args)
            }
          }
        }
        target[propertyKey] = call
        return target[propertyKey]
      }
    })
  }

  get DemuxPipeline() {

    const me = this

    function transformResult(method: string, args: any, result: any) {
      if (method === 'analyzeStreams' && !is.number(result)) {
        const codecpar: pointer<AVCodecParameters>[] = []
        result.streams.forEach((stream: AVStreamInterface) => {
          if (!isPointer(stream.codecpar)) {
            stream.codecpar = unserializeAVCodecParameters(stream.codecpar as unknown as AVCodecParametersSerialize)
            codecpar.push(stream.codecpar)
          }
          me.codecparMap.set(args[0], codecpar)
        })
      }
      else if (method === 'unregisterTask') {
        const codecpar = me.codecparMap.get(args[0])
        if (codecpar) {
          codecpar.forEach((par) => {
            freeCodecParameters(par)
          })
          me.codecparMap.delete(args[0])
        }
        me.statsMap.delete(args[0])
      }
      else if (method === 'clear') {
        me.codecparMap.forEach((codecpar) => {
          codecpar.forEach((par) => {
            freeCodecParameters(par)
          })
        })
        me.codecparMap.clear()
        me.statsMap.clear()
      }
      else if (method === 'registerTask') {
        me.statsMap.set(args[0].taskId, accessof(args[0].stats as pointer<Stats>))
      }
    }

    return new Proxy({}, {
      get(target, propertyKey, receiver) {
        if (target[propertyKey]) {
          return target[propertyKey]
        }
        const call = async function (...args: any[]) {
          return me.thread.invoke('demux', propertyKey as string, args)
            .then((result) => {
              transformResult(propertyKey as string, args, result)
              return result
            })
        }
        call.transfer = function (...transfer: Transferable[]) {
          return {
            invoke: async function (...args: any[]) {
              return me.thread.invoke.transfer(...transfer).invoke('demux', propertyKey as string, args)
                .then((result) => {
                  transformResult(propertyKey as string, args, result)
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
