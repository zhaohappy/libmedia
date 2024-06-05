/*
 * libmedia DemuxPipeline
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

import { Data } from 'common/types/type'
import Pipeline, { TaskOptions } from './Pipeline'
import * as errorType from 'avutil/error'
import IPCPort from 'common/network/IPCPort'
import { REQUEST, RpcMessage } from 'common/network/IPCPort'
import { AVIFormatContext, createAVIFormatContext } from 'avformat/AVFormatContext'
import IOReader from 'common/io/IOReader'
import IFormat from 'avformat/formats/IFormat'
import * as demux from 'avformat/demux'
import { AVFormat } from 'avformat/avformat'
import { avFree, avMalloc } from 'avutil/util/mem'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import SafeUint8Array from 'cheap/std/buffer/SafeUint8Array'
import List from 'cheap/std/collection/List'
import { AVPacketFlags, AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { Mutex } from 'cheap/thread/mutex'
import * as logger from 'common/util/logger'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { IOError } from 'common/io/error'
import { AVMediaType } from 'avutil/codec'
import LoopTask from 'common/timer/LoopTask'
import { IOFlags } from 'common/io/flags'
import * as array from 'common/util/array'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'

export const STREAM_INDEX_ALL = -1

export interface AVStreamInterface {
  index: number
  id: number,
  codecpar: pointer<AVCodecParameters>
  nbFrames: int64
  metadata: Data
  duration: int64
  startTime: int64
  disposition: int32
  timeBase: pointer<Rational>
}

export interface DemuxTaskOptions extends TaskOptions {
  format?: AVFormat
  bufferLength?: number
  isLive?: boolean
  ioloaderOptions?: Data
  mainTaskId?: string
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>,
  flags?: int32
}

type SelfTask = DemuxTaskOptions & {
  leftIPCPort: IPCPort
  rightIPCPorts: Map<number, IPCPort>

  formatContext: AVIFormatContext
  ioReader: IOReader
  buffer: pointer<uint8>

  cacheAVPackets: Map<number, pointer<AVPacketRef>[]>
  cacheRequests: Map<number, RpcMessage>

  realFormat: AVFormat

  demuxEnded: boolean
  loop: LoopTask

  gopCounter: int32
  lastKeyFramePts: int64
  lastAudioDts: int64
  lastVideoDts: int64

  avpacketPool: AVPacketPool
}

export default class DemuxPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private async judgeFormat(ioReader: IOReader, defaultFormat: AVFormat = AVFormat.UNKNOWN) {
    let signature = await ioReader.peekString(8)
    if ( /^FLV/.test(signature)) {
      return AVFormat.FLV
    }
    else if (/^DKIF/.test(signature)) {
      return AVFormat.IVF
    }
    else if (/^ftyp/.test(signature.slice(4, 8))) {
      return AVFormat.MP4
    }
    else if (/^OggS/.test(signature)) {
      return AVFormat.OGGS
    }
    else if (/^ID3/.test(signature)) {
      return AVFormat.MP3
    }
    else if (/^fLaC/.test(signature)) {
      return AVFormat.FLAC
    }
    else if (/^RIFF/.test(signature)) {
      const dataType = (await ioReader.peekString(12)).slice(8)
      if (/^WAVE/.test(dataType)) {
        return AVFormat.WAV
      }
    }
    else if ((await ioReader.peekUint32()) === 0x1A45DFA3) {
      return AVFormat.MATROSKA
    }
    return defaultFormat
  }

  private createTask(options: DemuxTaskOptions): number {

    let leftIPCPort: IPCPort

    if (options.mainTaskId) {
      const mainTask = this.tasks.get(options.mainTaskId)
      leftIPCPort = mainTask.leftIPCPort
    }
    else {
      assert(options.leftPort)
      leftIPCPort = new IPCPort(options.leftPort)
    }

    assert(leftIPCPort)

    const bufferLength = options.bufferLength || 1 * 1024 * 1024

    const buf = avMalloc(bufferLength)

    if (!buf) {
      return errorType.NO_MEMORY
    }

    const buffer = new SafeUint8Array(buf, bufferLength)
    const ioReader = new IOReader(bufferLength, true, buffer)

    if (!options.isLive) {
      ioReader.flags |= IOFlags.SEEKABLE
    }
    if (options.flags) {
      ioReader.flags |= options.flags
    }

    ioReader.onFlush = async (buffer) => {

      assert(buffer.byteOffset >= buf && buffer.byteOffset < buf + bufferLength)

      const params: {
        pointer: pointer<uint8>,
        length: int32
        ioloaderOptions?: Data
      } = {
        pointer: reinterpret_cast<pointer<uint8>>(buffer.byteOffset),
        length: buffer.length
      }
      if (options.ioloaderOptions) {
        params.ioloaderOptions = options.ioloaderOptions
      }
      try {
        const len = await leftIPCPort.request<int32>('read', params)
        return len
      }
      catch (error) {
        return IOError.INVALID_OPERATION
      }
    }

    ioReader.onSeek = async (pos) => {
      try {
        const params: {
          pos: int64,
          ioloaderOptions?: Data
        } = {
          pos
        }
        if (options.ioloaderOptions) {
          params.ioloaderOptions = options.ioloaderOptions
        }
        await leftIPCPort.request('seek', params)
        return 0
      }
      catch (error) {
        return IOError.INVALID_OPERATION
      }
    }

    ioReader.onSize = async () => {
      try {
        return await leftIPCPort.request('size')
      }
      catch (error) {
        return static_cast<int64>(IOError.INVALID_OPERATION)
      }
    }

    const formatContext = createAVIFormatContext()
    formatContext.ioReader = ioReader

    this.tasks.set(options.taskId, {
      ...options,

      leftIPCPort,
      rightIPCPorts: new Map(),

      formatContext,
      ioReader,
      buffer: buf,

      cacheAVPackets: new Map(),
      cacheRequests: new Map(),

      realFormat: AVFormat.UNKNOWN,

      demuxEnded: false,
      loop: null,

      gopCounter: 0,
      lastKeyFramePts: 0n,
      lastAudioDts: 0n,
      lastVideoDts: 0n,

      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)
    })

    return 0
  }

  public async openStream(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      await task.leftIPCPort.request('open')

      let format: AVFormat
      try {
        format = await this.judgeFormat(task.ioReader, task.format)
        task.format = format
      }
      catch (error) {
        return errorType.DATA_INVALID
      }

      let iformat: IFormat

      switch (format) {
        case AVFormat.FLV:
          if (defined(ENABLE_DEMUXER_FLV)) {
            iformat = new ((await import('avformat/formats/IFlvFormat')).default)
          }
          else {
            logger.error('flv format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MP4:
          if (defined(ENABLE_DEMUXER_MP4) || defined(ENABLE_PROTOCOL_DASH)) {
            iformat = new ((await import('avformat/formats/IMovFormat')).default)
          }
          else {
            logger.error('mp4 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MPEGTS:
          if (defined(ENABLE_DEMUXER_MP4) || defined(ENABLE_PROTOCOL_HLS)) {
            iformat = new ((await import('avformat/formats/IMpegtsFormat')).default)
          }
          else {
            logger.error('mpegts format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.IVF:
          if (defined(ENABLE_DEMUXER_IVF)) {
            iformat = new ((await import('avformat/formats/IIvfFormat')).default)
          }
          else {
            logger.error('ivf format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.OGGS:
          if (defined(ENABLE_DEMUXER_OGGS)) {
            iformat = new ((await import('avformat/formats/IOggsFormat')).default)
          }
          else {
            logger.error('oggs format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MP3:
          if (defined(ENABLE_DEMUXER_MP3)) {
            iformat = new ((await import('avformat/formats/IMp3Format')).default)
          }
          else {
            logger.error('mp3 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MATROSKA:
          if (defined(ENABLE_DEMUXER_MATROSKA)) {
            iformat = new (((await import('avformat/formats/IMatroskaFormat')).default))
          }
          else {
            logger.error('matroska format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.AAC:
          if (defined(ENABLE_DEMUXER_AAC)) {
            iformat = new (((await import('avformat/formats/IAacFormat')).default))
          }
          else {
            logger.error('aac format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.FLAC:
          if (defined(ENABLE_DEMUXER_FLAC)) {
            iformat = new (((await import('avformat/formats/IFlacFormat')).default))
          }
          else {
            logger.error('flac format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.WAV:
          if (defined(ENABLE_DEMUXER_WAV)) {
            iformat = new (((await import('avformat/formats/IWavFormat')).default))
          }
          else {
            logger.error('wav format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        default:
          logger.error('format not support')
          return errorType.FORMAT_NOT_SUPPORT
      }

      assert(iformat)

      task.realFormat = format
      task.formatContext.iformat = iformat

      return await demux.open(task.formatContext, {
        maxAnalyzeDuration: 2,
        fastOpen: task.isLive
      })
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async getFormat(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      return task.realFormat
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async analyzeStreams(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {

      await demux.analyzeStreams(task.formatContext)

      const streams: AVStreamInterface[] = []
      for (let i = 0; i < task.formatContext.streams.length; i++) {
        const stream = task.formatContext.streams[i]
        streams.push({
          index: stream.index,
          id: stream.id,
          codecpar: addressof(stream.codecpar),
          nbFrames: stream.nbFrames,
          metadata: stream.metadata,
          duration: stream.duration,
          startTime: stream.startTime,
          disposition: stream.disposition,
          timeBase: addressof(stream.timeBase)
        })
      }
      return streams
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async connectStreamTask(taskId: string, streamIndex: number, port: MessagePort) {
    const task = this.tasks.get(taskId)
    if (task) {
      const ipcPort = new IPCPort(port)

      task.cacheAVPackets.set(streamIndex, [])

      ipcPort.on(REQUEST, async (request: RpcMessage) => {
        switch (request.method) {
          case 'pull': {
            const cacheAVPackets = task.cacheAVPackets.get(streamIndex)
            if (cacheAVPackets.length) {
              const avpacket = cacheAVPackets.shift()
              if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
                task.stats.audioPacketQueueLength--
              }
              else if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
                task.stats.videoPacketQueueLength--
              }
              ipcPort.reply(request, avpacket)
            }
            else {
              if (task.demuxEnded) {
                ipcPort.reply(request, IOError.END)
              }
              else {
                task.cacheRequests.set(streamIndex, request)
                if (task.loop && task.loop.isStarted()) {
                  task.loop.resetInterval()
                }
              }
            }
            break
          }
        }
      })
      task.rightIPCPorts.set(streamIndex, ipcPort)

      logger.debug(`connect stream ${streamIndex}, taskId: ${task.taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async startDemux(taskId: string, isLive: boolean, minQueueLength: int32) {
    const task = this.tasks.get(taskId)
    if (task) {
      // mpegts 最小 20
      minQueueLength = Math.max(minQueueLength, task.format === AVFormat.MPEGTS ? 20 : 10)

      if (task.loop) {
        task.loop.destroy()
      }
      task.loop = new LoopTask(async () => {
        if (!isLive) {
          let canDo = false
          task.cacheAVPackets.forEach((list) => {
            if (list.length < minQueueLength) {
              canDo = true
            }
          })

          if (!canDo) {
            task.loop.emptyTask()
            return
          }
        }

        const avpacket = task.avpacketPool.alloc()

        let ret = await demux.readAVPacket(task.formatContext, avpacket)

        if (!ret) {

          if (defined(ENABLE_LOG_TRACE)) {
            logger.trace(`got packet, index: ${avpacket.streamIndex}, dts: ${avpacket.dts}, pts: ${avpacket.pts}, pos: ${
              avpacket.pos
            }, duration: ${avpacket.duration}, keyframe: ${(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) ? 'true' : 'false'}`)
          }

          const streamIndex = avpacket.streamIndex

          assert(streamIndex !== NOPTS_VALUE)

          if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
            && task.cacheAVPackets.has(streamIndex)
          ) {
            task.stats.audioPacketCount++
            task.stats.audioPacketBytes += static_cast<int64>(avpacket.size)
            if (task.stats.audioPacketCount > 1 && avpacket.dts > task.lastAudioDts) {
              const list = task.cacheAVPackets.get(streamIndex)
              if (list && list.length) {
                task.stats.audioEncodeFramerate = Math.round(avpacket.timeBase.den / avpacket.timeBase.num
                  / (static_cast<int32>(avpacket.dts - list[0].dts) / list.length))
              }
              else {
                task.stats.audioEncodeFramerate = Math.round(avpacket.timeBase.den / avpacket.timeBase.num
                  / static_cast<int32>(avpacket.dts - task.lastAudioDts))
              }
            }
            task.lastAudioDts = avpacket.dts
          }
          else if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
            && task.cacheAVPackets.has(streamIndex)
          ) {
            task.stats.videoPacketCount++
            task.stats.videoPacketBytes += static_cast<int64>(avpacket.size)

            if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
              task.stats.keyFrameCount++
              if (task.stats.keyFrameCount > 1 && avpacket.pts > task.lastKeyFramePts) {
                task.stats.gop = task.gopCounter
                task.gopCounter = 1
                task.stats.keyFrameInterval = static_cast<int32>(avRescaleQ(
                  avpacket.pts - task.lastKeyFramePts,
                  avpacket.timeBase,
                  AV_MILLI_TIME_BASE_Q
                ))
              }
              task.lastKeyFramePts = avpacket.pts
            }
            else {
              task.gopCounter++
            }
            if (task.stats.videoPacketCount > 1 && avpacket.dts > task.lastVideoDts) {
              const list = task.cacheAVPackets.get(streamIndex)
              if (list && list.length) {
                task.stats.videoEncodeFramerate = Math.round(avpacket.timeBase.den / avpacket.timeBase.num
                  / (static_cast<int32>(avpacket.dts - list[0].dts) / list.length))
              }
              else {
                task.stats.videoEncodeFramerate = Math.round(avpacket.timeBase.den / avpacket.timeBase.num
                  / static_cast<int32>(avpacket.dts - task.lastVideoDts))
              }
            }
            task.lastVideoDts = avpacket.dts
          }

          if (task.cacheRequests.has(streamIndex)) {
            task.rightIPCPorts.get(streamIndex).reply(task.cacheRequests.get(streamIndex), avpacket)
            task.cacheRequests.delete(streamIndex)
          }
          else {
            if (task.cacheAVPackets.has(streamIndex)) {
              task.cacheAVPackets.get(streamIndex).push(avpacket)
              if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
                task.stats.audioPacketQueueLength++
              }
              else if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
                task.stats.videoPacketQueueLength++
              }
            }
            else {
              if (task.rightIPCPorts.has(STREAM_INDEX_ALL)) {
                if (task.cacheRequests.has(STREAM_INDEX_ALL)) {
                  task.rightIPCPorts.get(STREAM_INDEX_ALL).reply(task.cacheRequests.get(STREAM_INDEX_ALL), avpacket)
                  task.cacheRequests.delete(STREAM_INDEX_ALL)
                }
                else {
                  task.cacheAVPackets.get(STREAM_INDEX_ALL).push(avpacket)
                }
              }
              else {
                task.avpacketPool.release(avpacket)
              }
            }
          }
        }
        else {
          task.avpacketPool.release(avpacket)
          if (ret !== IOError.END) {
            logger.error(`demux error, ret: ${ret}, taskId: ${taskId}`)
          }

          task.demuxEnded = true

          logger.info(`demuxer ended, taskId: ${task.taskId}`)

          for (let streamIndex of task.cacheRequests.keys()) {
            const cacheAVPackets = task.cacheAVPackets.get(streamIndex)
            if (!cacheAVPackets.length) {
              task.rightIPCPorts.get(streamIndex).reply(task.cacheRequests.get(streamIndex), IOError.END)
              task.cacheRequests.delete(streamIndex)
            }
          }
          task.loop.stop()
        }
      }, 0, 0, true, false)

      task.loop.start()

      logger.debug(`start demux loop, taskId: ${task.taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async seek(taskId: string, timestamp: int64, flags: int32): Promise<int64> {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop) {
        await task.loop.stopBeforeNextTick()
        let ret = await demux.seek(task.formatContext, -1, timestamp, flags)
        if (ret >= 0n) {
          task.cacheAVPackets.forEach((list) => {
            array.each(list, (avpacket) => {
              task.avpacketPool.release(avpacket)
            })
            list.length = 0
          })
          task.stats.audioPacketQueueLength = 0
          task.stats.videoPacketQueueLength = 0

          const avpacket = task.avpacketPool.alloc() as pointer<AVPacketRef>

          while (true) {
            ret = await demux.readAVPacket(task.formatContext, avpacket)
            if (ret < 0 || task.cacheAVPackets.has(avpacket.streamIndex)) {
              break
            }
          }

          if (ret >= 0) {
            task.demuxEnded = false
            const streamIndex = avpacket.streamIndex
            task.cacheAVPackets.get(streamIndex).push(avpacket)

            if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
              task.stats.audioPacketQueueLength++
            }
            else if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              task.stats.videoPacketQueueLength++
            }

            task.loop.start()
            let duration = avpacket.pts
            if (task.formatContext.streams[streamIndex].startTime !== NOPTS_VALUE_BIGINT) {
              duration -= task.formatContext.streams[streamIndex].startTime
            }
            else {
              duration -= task.formatContext.streams[streamIndex].firstDTS
            }
            return avRescaleQ(duration, avpacket.timeBase, AV_MILLI_TIME_BASE_Q)
          }
          else {

            logger.warn(`got first packet failed after seek, taskId: ${task.taskId}`)

            task.avpacketPool.release(avpacket)
            task.demuxEnded = true
            return timestamp
          }
        }
        return ret
      }
      else {

        logger.info('seek before demux loop start')

        let ret = await demux.seek(task.formatContext, -1, timestamp, flags)
        if (ret < 0) {
          return ret
        }
        return timestamp
      }
    }
  }

  /**
   * 裁剪 avpacket 队列大小
   * 
   * @param taskId 
   * @param max （毫秒）
   */
  public async croppingAVPacketQueue(taskId: string, max: int64) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.cacheAVPackets.forEach((list, streamIndex) => {
        const lastDts = list[list.length - 1].dts
        let i = list.length - 2
        for (i = list.length - 2; i >= 0; i--) {
          if (list[i].flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
            if (avRescaleQ(lastDts - list[i].dts, list[i].timeBase, AV_MILLI_TIME_BASE_Q) >= max) {
              break
            }
          }
        }
        if (i > 0) {
          list.splice(0, i).forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
          if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
            task.stats.audioPacketQueueLength = list.length
          }
          else if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            task.stats.videoPacketQueueLength = list.length
          }
        }
      })
    }
  }

  public async registerTask(options: DemuxTaskOptions): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return errorType.INVALID_OPERATE
    }
    return this.createTask(options)
  }

  public async unregisterTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop) {
        await task.loop.stopBeforeNextTick()
        task.loop.destroy()
      }
      task.leftIPCPort.destroy()
      task.rightIPCPorts.forEach((ipcPort) => {
        ipcPort.destroy()
      })
      task.rightIPCPorts.clear()
      task.formatContext.destroy()

      avFree(task.buffer)

      task.cacheAVPackets.forEach((list) => {
        list.forEach((avpacket) => {
          task.avpacketPool.release(avpacket)
        })
      })

      this.tasks.delete(taskId)
    }
  }
}
