/*
 * libmedia MuxPipeline
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
import * as errorType from 'avutil/error'
import IPCPort from 'common/network/IPCPort'
import { AVOFormatContext, createAVOFormatContext } from 'avformat/AVFormatContext'
import * as mux from 'avformat/mux'
import { AVFormat } from 'avutil/avformat'
import List from 'cheap/std/collection/List'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { Mutex } from 'cheap/thread/mutex'
import * as logger from 'common/util/logger'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { IOError } from 'common/io/error'
import LoopTask from 'common/timer/LoopTask'
import * as array from 'common/util/array'
import { avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import OFormat from 'avformat/formats/OFormat'
import IOWriterSync from 'common/io/IOWriterSync'
import { AVStreamInterface } from 'avutil/AVStream'
import { copyCodecParameters } from 'avutil/util/codecparameters'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { AVMediaType } from 'avutil/codec'
import { Data } from 'common/types/type'
import * as object from 'common/util/object'

const MIN_QUEUE_CACHE = 30

export interface MuxTaskOptions extends TaskOptions {
  isLive?: boolean
  format: AVFormat
  formatOptions: Data
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
}

type SelfTask = MuxTaskOptions & {
  rightIPCPort: IPCPort
  formatContext: AVOFormatContext
  avpacketPool: AVPacketPool
  loop: LoopTask
  ended: boolean
  streams: {
    stream: AVStreamInterface
    pullIPC: IPCPort
    avpacketQueue: pointer<AVPacketRef>[]
    ended: boolean
    pulling: Promise<void>
  }[]
}

export default class MuxPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private createTask(options: MuxTaskOptions): number {

    assert(options.rightPort)
    const rightIPCPort = new IPCPort(options.rightPort)

    const formatContext = createAVOFormatContext()
    const ioWriter = new IOWriterSync(5 * 1024 * 1024)

    ioWriter.onFlush = (data: Uint8Array, pos: int64) => {
      const buffer = data.slice()
      rightIPCPort.notify('write', {
        data: buffer,
        pos
      }, [buffer.buffer])
      return 0
    }
    ioWriter.onSeek = (pos) => {
      rightIPCPort.notify('seek', {
        pos
      })
      return 0
    }

    formatContext.ioWriter = ioWriter

    this.tasks.set(options.taskId, {
      ...options,
      rightIPCPort,
      formatContext,
      loop: null,
      ended: false,
      streams: [],
      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)
    })

    return 0
  }

  public async open(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {

      let oformat: OFormat

      switch (task.format) {
        case AVFormat.FLV:
          if (defined(ENABLE_MUXER_FLV)) {
            oformat = new ((await import('avformat/formats/OFlvFormat')).default)(task.formatOptions)
          }
          else {
            logger.error('flv format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MP4:
          if (defined(ENABLE_MUXER_MP4) || defined(ENABLE_PROTOCOL_DASH)) {
            oformat = new ((await import('avformat/formats/OMovFormat')).default)(task.formatOptions)
          }
          else {
            logger.error('mp4 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MPEGTS:
          if (defined(ENABLE_MUXER_MP4) || defined(ENABLE_PROTOCOL_HLS)) {
            oformat = new ((await import('avformat/formats/OMpegtsFormat')).default)(task.formatOptions)
          }
          else {
            logger.error('mpegts format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.IVF:
          if (defined(ENABLE_MUXER_IVF)) {
            oformat = new ((await import('avformat/formats/OIvfFormat')).default)
          }
          else {
            logger.error('ivf format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.OGG:
          if (defined(ENABLE_MUXER_OGG)) {
            oformat = new ((await import('avformat/formats/OOggFormat')).default)
          }
          else {
            logger.error('oggs format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MP3:
          if (defined(ENABLE_MUXER_MP3)) {
            oformat = new ((await import('avformat/formats/OMp3Format')).default)(task.formatOptions)
          }
          else {
            logger.error('mp3 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MATROSKA:
        case AVFormat.WEBM:
          if (defined(ENABLE_MUXER_MATROSKA)) {
            const options = {
              isLive: task.isLive,
              docType: task.format === AVFormat.WEBM ? 'webm' : 'matroska'
            }
            oformat = new (((await import('avformat/formats/OMatroskaFormat')).default))(object.extend(task.formatOptions, options))
          }
          else {
            logger.error('matroska format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        default:
          logger.error('format not support')
          return errorType.FORMAT_NOT_SUPPORT
      }

      assert(oformat)

      task.formatContext.oformat = oformat

      for (let i = 0; i < task.streams.length; i++) {
        if (task.streams[i].ended
          || (task.streams[i].stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_AUDIO
            && task.streams[i].stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO
          )
        ) {
          continue
        }
        const avpacket = await task.streams[i].pullIPC.request<pointer<AVPacketRef>>('pull')
        if (avpacket === IOError.END) {
          task.streams[i].ended = true
        }
        else if (avpacket < 0) {
          logger.error(`pull stream ${i} avpacket error, ret: ${avpacket}`)
          task.streams[i].ended = true
          return errorType.DATA_INVALID
        }
        else {
          avpacket.streamIndex = task.streams[i].stream.index
          task.streams[i].avpacketQueue.push(avpacket)
          const currentDts = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
          if (task.streams[i].stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
            task.stats.firstAudioMuxDts = currentDts
          }
          else if (task.streams[i].stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            task.stats.firstVideoMuxDts = currentDts
          }
        }
      }
      return 0
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async addStream(taskId: string, stream: AVStreamInterface, port: MessagePort) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.streams.push({
        stream,
        pullIPC: new IPCPort(port),
        avpacketQueue: [],
        ended: stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_ATTACHMENT
          || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_DATA,
        pulling: null
      })
      const ostream = task.formatContext.createStream()
      ostream.id = stream.id
      ostream.index = stream.index
      copyCodecParameters(addressof(ostream.codecpar), stream.codecpar)
      ostream.timeBase.num = stream.timeBase.num
      ostream.timeBase.den = stream.timeBase.den
      ostream.metadata = stream.metadata
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async updateAVCodecParameters(taskId: string, streamIndex: int32, codecpar: pointer<AVCodecParameters>) {
    const task = this.tasks.get(taskId)
    if (task) {
      const stream = task.formatContext.getStreamByIndex(streamIndex)
      if (stream) {
        copyCodecParameters(addressof(stream.codecpar), codecpar)
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async start(taskId: string): Promise<number> {
    const task = this.tasks.get(taskId)
    if (task) {

      if (task.loop) {
        logger.error('task has started')
        return errorType.INVALID_OPERATE
      }

      let ret = mux.open(task.formatContext, {
        nonnegative: task.format !== AVFormat.MOV
          && task.format !== AVFormat.MATROSKA
      })

      if (ret < 0) {
        logger.error('mux task open error')
        return errorType.FORMAT_NOT_SUPPORT
      }

      mux.writeHeader(task.formatContext)

      if (!task.streams.length) {
        logger.error('task streams not found')
        return errorType.INVALID_OPERATE
      }

      function process(index: number, avpacket: pointer<AVPacketRef>) {
        if (avpacket === IOError.END) {
          task.streams[index].ended = true
        }
        else if (avpacket < 0) {
          logger.error(`pull stream ${index} avpacket error, ret: ${avpacket}`)
          task.streams[index].ended = true
          task.loop.stop()
          task.ended = true
          task.rightIPCPort.notify('error')
        }
        else {
          avpacket.streamIndex = task.streams[index].stream.index
          task.streams[index].avpacketQueue.push(avpacket)
        }
      }

      function pull(index: number) {
        if (task.streams[index].pulling) {
          return
        }
        task.streams[index].pulling = task.streams[index].pullIPC.request<pointer<AVPacketRef>>('pull').then((avpacket) => {
          process(index, avpacket)
          task.streams[index].pulling = null
        })
      }

      task.loop = new LoopTask(async () => {
        for (let i = 0; i < task.streams.length; i++) {
          if (!task.streams[i].ended && task.streams[i].avpacketQueue.length < MIN_QUEUE_CACHE) {
            const mediaType = task.streams[i].stream.codecpar.codecType
            if ((mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO || mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO)
              && !task.streams[i].avpacketQueue.length
            ) {
              if (task.streams[i].pulling) {
                await task.streams[i].pulling
              }
              else {
                process(i, await task.streams[i].pullIPC.request<pointer<AVPacketRef>>('pull'))
              }
            }
            else {
              pull(i)
            }
          }
        }

        let avpacket: pointer<AVPacketRef> = nullptr
        let dts: int64 = NOPTS_VALUE_BIGINT
        let index = 0
        let type: AVMediaType = AVMediaType.AVMEDIA_TYPE_UNKNOWN

        for (let i = 0; i < task.streams.length; i++) {
          if (task.streams[i].avpacketQueue.length) {
            const currentDts = avRescaleQ2(task.streams[i].avpacketQueue[0].dts, addressof(task.streams[i].avpacketQueue[0].timeBase), AV_MILLI_TIME_BASE_Q)
            if (dts === NOPTS_VALUE_BIGINT || currentDts < dts) {
              avpacket = task.streams[i].avpacketQueue[0]
              dts = currentDts
              index = i
              type = task.streams[i].stream.codecpar.codecType
            }
          }
        }
        if (avpacket) {
          const now = task.formatContext.ioWriter.getPos()
          mux.writeAVPacket(task.formatContext, avpacket)
          task.stats.bufferOutputBytes += task.formatContext.ioWriter.getPos() - now
          task.avpacketPool.release(avpacket)
          task.streams[index].avpacketQueue.shift()

          if (type === AVMediaType.AVMEDIA_TYPE_AUDIO) {
            task.stats.lastAudioMuxDts = dts
          }
          else if (type === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            task.stats.lastVideoMuxDts = dts
          }
        }
        else if (!task.streams.some((s) => !s.ended)) {
          mux.writeTrailer(task.formatContext)
          mux.flush(task.formatContext)
          task.rightIPCPort.notify('end')
          task.loop.stop()
          task.ended = true
        }
      }, 0, 0, false, false)
      task.loop.start()

      return 0
    }
    else {
      logger.error('task not found')
      return errorType.INVALID_OPERATE
    }
  }

  public async pause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop) {
        await task.loop.stopBeforeNextTick()
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async unpause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop && !task.loop.isStarted() && !task.ended) {
        task.loop.start()
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async registerTask(options: MuxTaskOptions): Promise<number> {
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
      array.each(task.streams, (stream) => {
        if (stream.avpacketQueue.length) {
          stream.avpacketQueue.forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
          stream.avpacketQueue.length = 0
        }
        stream.pullIPC.destroy()
      })
      await task.formatContext.destroy()
      this.tasks.delete(taskId)
    }
  }
}
