/*
 * libmedia IOPipeline
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

import { Data, Range } from 'common/types/type'
import Pipeline, { TaskOptions } from './Pipeline'
import FetchIOLoader from 'avnetwork/ioLoader/FetchIOLoader'
import IOLoader, { IOLoaderOptions } from 'avnetwork/ioLoader/IOLoader'
import * as errorType from 'avutil/error'
import IPCPort from 'common/network/IPCPort'
import { REQUEST, RpcMessage } from 'common/network/IPCPort'
import { mapSafeUint8Array } from 'cheap/std/memory'
import FileIOLoader from 'avnetwork/ioLoader/FileIOLoader'
import * as logger from 'common/util/logger'
import DashIOLoader from 'avnetwork/ioLoader/DashIOLoader'
import HlsIOLoader from 'avnetwork/ioLoader/HlsIOLoader'
import WebSocketIOLoader from 'avnetwork/ioLoader/WebSocketIOLoader'
import WebTransportIOLoader from 'avnetwork/ioLoader/WebTransportIOLoader'
import { IOType } from 'avutil/avformat'

export interface IOTaskOptions extends TaskOptions {
  type: IOType
  options: IOLoaderOptions
  info: Data
  range: Range
}

type SelfTask = IOTaskOptions & {
  ioLoader: IOLoader
  ipcPort: IPCPort
}

export default class IOPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private async createTask(options: IOTaskOptions): Promise<number> {
    let ioLoader: IOLoader

    switch (options.type) {
      case IOType.Fetch:
        ioLoader = new FetchIOLoader(options.options)
        break
      case IOType.File:
        ioLoader = new FileIOLoader(options.options)
        break
      case IOType.WEBSOCKET:
        ioLoader = new WebSocketIOLoader(options.options)
        break
      case IOType.WEBTRANSPORT:
        ioLoader = new WebTransportIOLoader(options.options)
        break
      case IOType.HLS:
        if (defined(ENABLE_PROTOCOL_HLS)) {
          ioLoader = new (await import('avnetwork/ioLoader/HlsIOLoader')).default(options.options)
        }
        else {
          logger.error('hls protocol not support, maybe you can rebuild avmedia')
          return errorType.FORMAT_NOT_SUPPORT
        }
        break
      case IOType.DASH:
        if (defined(ENABLE_PROTOCOL_DASH)) {
          ioLoader = new (await import('avnetwork/ioLoader/DashIOLoader')).default(options.options)
        }
        else {
          logger.error('dash protocol not support, maybe you can rebuild avmedia')
          return errorType.FORMAT_NOT_SUPPORT
        }
        break
      case IOType.RTMP:
        if (defined(ENABLE_PROTOCOL_RTMP)) {
          ioLoader = new (await import('avnetwork/ioLoader/RtmpIOLoader')).default(options.options)
        }
        else {
          logger.error('rtmp protocol not support, maybe you can rebuild avmedia')
          return errorType.FORMAT_NOT_SUPPORT
        }
        break
    }

    if (!ioLoader) {
      return errorType.INVALID_ARGUMENT
    }

    assert(options.rightPort)

    const ipcPort = new IPCPort(options.rightPort)

    const task = {
      ...options,
      ioLoader,
      ipcPort
    }

    ipcPort.on(REQUEST, async (request: RpcMessage) => {
      switch (request.method) {
        case 'open': {
          try {
            const ret = await ioLoader.open(options.info, options.range)
            if (ret < 0) {
              logger.error(`loader open error, ${ret}, taskId: ${options.taskId}`)
              ipcPort.reply(request, null, ret)
              break
            }
            ipcPort.reply(request, ret)
          }
          catch (error) {
            logger.error(`loader open error, ${error}, taskId: ${options.taskId}`)
            ipcPort.reply(request, null, error)
          }
          break
        }
        case 'read': {
          const pointer: pointer<void> = request.params.pointer
          const length: size = request.params.length
          const ioloaderOptions: Data = request.params.ioloaderOptions

          assert(pointer)
          assert(length)

          const buffer = mapSafeUint8Array(pointer, length)

          try {
            const len = await ioLoader.read(buffer, ioloaderOptions)
            task.stats.bufferReceiveBytes += static_cast<int64>(len)
            ipcPort.reply(request, len)
          }
          catch (error) {
            logger.error(`loader read error, ${error}, taskId: ${options.taskId}`)
            ipcPort.reply(request, errorType.DATA_INVALID)
          }

          break
        }

        case 'write': {
          const pointer = request.params.pointer
          const length = request.params.length

          assert(pointer)
          assert(length)

          const buffer = mapSafeUint8Array(pointer, length)

          try {
            const ret = await ioLoader.write(buffer)
            task.stats.bufferSendBytes += static_cast<int64>(length as int32)
            ipcPort.reply(request, ret)
          }
          catch (error) {
            logger.error(`loader write error, ${error}, taskId: ${options.taskId}`)
            ipcPort.reply(request, errorType.DATA_INVALID)
          }

          break
        }

        case 'seek': {
          const pos = request.params.pos
          const ioloaderOptions = request.params.ioloaderOptions

          assert(pos >= 0)

          try {
            const ret = await ioLoader.seek(pos, ioloaderOptions)
            if (ret < 0) {
              logger.error(`loader seek error, ${ret}, taskId: ${options.taskId}`)
              ipcPort.reply(request, null, ret)
              break
            }
            ipcPort.reply(request, ret)
          }
          catch (error) {
            logger.error(`loader seek error, ${error}, taskId: ${options.taskId}`)
            ipcPort.reply(request, null, error)
          }
          break
        }

        case 'size': {
          ipcPort.reply(request, await ioLoader.size())
          break
        }
      }
    })

    this.tasks.set(options.taskId, task)

    return 0
  }

  public async open(id: string) {
    const task = this.tasks.get(id)
    if (task) {
      await task.ioLoader.open(task.info, task.range)
      return 0
    }
  }

  public async getDuration(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH) || defined(ENABLE_PROTOCOL_HLS)) {
        if (task.type === IOType.HLS || task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).getDuration()
        }
      }
      return 0
    }
  }

  public async hasAudio(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).hasAudio()
        }
      }
    }
    return false
  }

  public async hasVideo(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).hasVideo()
        }
      }
    }
    return false
  }

  public async hasSubtitle(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).hasSubtitle()
        }
      }
    }
    return false
  }

  public async getVideoList(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH) || defined(ENABLE_PROTOCOL_HLS)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).getVideoList()
        }
        else if (task.type === IOType.HLS) {
          return (task.ioLoader as HlsIOLoader).getVideoList()
        }
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public async getAudioList(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).getAudioList()
        }
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public async getSubtitleList(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).getSubtitleList()
        }
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public async selectVideo(taskId: string, index: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH) || defined(ENABLE_PROTOCOL_HLS)) {
        if (task.type === IOType.DASH) {
          (task.ioLoader as DashIOLoader).selectVideo(index)
        }
        else if (task.type === IOType.HLS) {
          return (task.ioLoader as HlsIOLoader).selectVideo(index)
        }
      }
    }
  }

  public async selectAudio(taskId: string, index: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          (task.ioLoader as DashIOLoader).selectAudio(index)
        }
      }
    }
  }

  public async selectSubtitle(taskId: string, index: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          (task.ioLoader as DashIOLoader).selectSubtitle(index)
        }
      }
    }
  }

  public async getMinBuffer(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (defined(ENABLE_PROTOCOL_DASH)) {
        if (task.type === IOType.DASH) {
          return (task.ioLoader as DashIOLoader).getMinBuffer()
        }
      }
      if (defined(ENABLE_PROTOCOL_HLS)) {
        if (task.type === IOType.HLS) {
          return (task.ioLoader as HlsIOLoader).getMinBuffer()
        }
      }
    }
    return 0
  }

  public async registerTask(options: IOTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return errorType.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (task) {
      await task.ioLoader.stop()
      task.ipcPort.destroy()
      this.tasks.delete(id)
    }
  }
}
