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
import { AVFormatContextInterface, AVIFormatContext, createAVIFormatContext } from 'avformat/AVFormatContext'
import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriter'
import IFormat from 'avformat/formats/IFormat'
import * as demux from 'avformat/demux'
import { AVFormat, IOFlags } from 'avutil/avformat'
import { avFree, avMalloc } from 'avutil/util/mem'
import SafeUint8Array from 'cheap/std/buffer/SafeUint8Array'
import List from 'cheap/std/collection/List'
import { AVPacketFlags, AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { Mutex } from 'cheap/thread/mutex'
import * as logger from 'common/util/logger'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { IOError } from 'common/io/error'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import LoopTask from 'common/timer/LoopTask'
import * as array from 'common/util/array'
import { avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE } from 'avutil/constant'
import * as bigint from 'common/util/bigint'
import { AVStreamInterface } from 'avutil/AVStream'
import { addAVPacketSideData, getAVPacketData, getAVPacketSideData } from 'avutil/util/avpacket'
import { mapUint8Array, memcpy, memcpyFromUint8Array } from 'cheap/std/memory'
import analyzeAVFormat from 'avutil/function/analyzeAVFormat'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import compileResource from 'avutil/function/compileResource'
import isWorker from 'common/function/isWorker'
import * as cheapConfig from 'cheap/config'
import { serializeAVPacket } from 'avutil/util/serialize'
import isPointer from 'cheap/std/function/isPointer'
import * as is from 'common/util/is'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import { IRtspFormatOptions } from 'avformat/formats/IRtspFormat'
import { IFlvFormatOptions } from 'avformat/formats/IFlvFormat'
import { IMovFormatOptions } from 'avformat/formats/IMovFormat'
import { IH264FormatOptions } from 'avformat/formats/IH264Format'
import { IHevcFormatOptions } from 'avformat/formats/IHevcFormat'
import { IVvcFormatOptions } from 'avformat/formats/IVvcFormat'
import support from 'common/util/support'

export const STREAM_INDEX_ALL = -1
const MAX_QUEUE_LENGTH_DEFAULT = 5000

export interface DemuxTaskOptions extends TaskOptions {
  format?: AVFormat
  bufferLength?: number
  isLive?: boolean
  ioloaderOptions?: Data
  formatOptions?: Data
  mainTaskId?: string
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  flags?: int32
}

type SelfTask = DemuxTaskOptions & {
  leftIPCPort: IPCPort
  rightIPCPorts: Map<number, IPCPort & { streamIndex?: number }>
  controlIPCPort: IPCPort

  formatContext: AVIFormatContext
  ioReader: IOReader
  iBuffer: pointer<uint8>
  oBuffer: pointer<uint8>

  cacheAVPackets: Map<number, pointer<AVPacketRef>[]>
  pendingAVPackets: Map<number, pointer<AVPacketRef>[]>
  cacheRequests: Map<number, RpcMessage>
  streamIndexFlush: Map<number, boolean>

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

  private createTask(options: DemuxTaskOptions): number {
    let leftIPCPort: IPCPort
    let controlIPCPort: IPCPort

    if (options.mainTaskId) {
      const mainTask = this.tasks.get(options.mainTaskId)
      leftIPCPort = mainTask.leftIPCPort
      controlIPCPort = mainTask.controlIPCPort
    }
    else {
      assert(options.leftPort)
      leftIPCPort = new IPCPort(options.leftPort)
      if (options.controlPort) {
        controlIPCPort = new IPCPort(options.controlPort)
      }
    }

    assert(leftIPCPort)

    const bufferLength = options.bufferLength || 1 * 1024 * 1024

    const iBuf: pointer<uint8> = avMalloc(bufferLength)
    if (!iBuf) {
      return errorType.NO_MEMORY
    }
    const oBuf: pointer<uint8> = avMalloc(bufferLength)
    if (!oBuf) {
      return errorType.NO_MEMORY
    }

    const iBuffer = new SafeUint8Array(iBuf, bufferLength)
    const ioReader = new IOReader(bufferLength, true, iBuffer)

    const oBuffer = new SafeUint8Array(oBuf, bufferLength)
    const ioWriter = new IOWriter(bufferLength, true, oBuffer)

    if (!options.isLive) {
      ioReader.flags |= IOFlags.SEEKABLE
    }
    if (options.flags) {
      ioReader.flags |= options.flags
    }

    ioReader.onFlush = async (buffer) => {

      assert(buffer.byteOffset >= iBuf && buffer.byteOffset < iBuf + bufferLength)

      const params: {
        pointer: pointer<void>
        length: size
        ioloaderOptions?: Data
      } = {
        pointer: reinterpret_cast<pointer<void>>(buffer.byteOffset as uint32),
        length: buffer.length
      }
      if (options.ioloaderOptions) {
        params.ioloaderOptions = options.ioloaderOptions
      }
      try {
        const result = await leftIPCPort.request<int32 | Uint8Array>('read', params)
        if (is.number(result)) {
          return result
        }
        assert(result.length <= params.length)
        memcpyFromUint8Array(params.pointer, result.length, result)
        return result.length
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
        return leftIPCPort.request<int32>('seek', params)
      }
      catch (error) {
        return IOError.INVALID_OPERATION
      }
    }

    ioReader.onSize = async () => {
      try {
        return leftIPCPort.request<int64>('size')
      }
      catch (error) {
        return static_cast<int64>(IOError.INVALID_OPERATION)
      }
    }

    ioWriter.onFlush = async (buffer) => {
      assert(buffer.byteOffset >= oBuf && buffer.byteOffset < oBuf + bufferLength)

      const params: {
        pointer: pointer<uint8>
        length: int32
      } = {
        pointer: reinterpret_cast<pointer<uint8>>(buffer.byteOffset),
        length: buffer.length
      }
      try {
        return await leftIPCPort.request<int32>('write', params)
      }
      catch (error) {
        return IOError.INVALID_OPERATION
      }
    }

    const formatContext = createAVIFormatContext()
    formatContext.ioReader = ioReader
    formatContext.ioWriter = ioWriter

    if (support.wasmBaseSupported) {
      formatContext.getDecoderResource = async (mediaType, codecId) => {
        if (!controlIPCPort) {
          return
        }
        const wasm: ArrayBuffer | WebAssemblyResource = await controlIPCPort.request('getDecoderResource', {
          codecId,
          mediaType
        })

        return compileResource(wasm, mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO)
      }
    }

    this.tasks.set(options.taskId, {
      ...options,

      leftIPCPort,
      rightIPCPorts: new Map(),
      controlIPCPort,

      formatContext,
      ioReader,
      iBuffer: iBuf,
      oBuffer: oBuf,

      cacheAVPackets: new Map(),
      cacheRequests: new Map(),
      streamIndexFlush: new Map(),
      pendingAVPackets: new Map(),

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

  public async openStream(taskId: string, maxProbeDuration: int32 = 3000) {
    const task = this.tasks.get(taskId)
    if (task) {
      let ret = await task.leftIPCPort.request<int32>('open')

      if (ret < 0) {
        logger.error(`open ioloader failed, ret: ${ret}`)
        return ret
      }

      let format: AVFormat
      try {
        if (task.format !== AVFormat.RTSP) {
          format = await analyzeAVFormat(task.ioReader, task.format)
          task.format = format
        }
        else {
          format = task.format
        }
      }
      catch (error) {
        return errorType.DATA_INVALID
      }

      let iformat: IFormat

      switch (format) {
        case AVFormat.FLV:
          if (defined(ENABLE_DEMUXER_FLV)) {
            iformat = new ((await import('avformat/formats/IFlvFormat')).default)(task.formatOptions as IFlvFormatOptions)
          }
          else {
            logger.error('flv format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MP4:
          if (defined(ENABLE_DEMUXER_MP4) || defined(ENABLE_PROTOCOL_DASH)) {
            iformat = new ((await import('avformat/formats/IMovFormat')).default)(task.formatOptions as IMovFormatOptions)
          }
          else {
            logger.error('mp4 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MPEGTS:
          if (defined(ENABLE_DEMUXER_MPEGPS) || defined(ENABLE_PROTOCOL_HLS)) {
            iformat = new ((await import('avformat/formats/IMpegtsFormat')).default)
          }
          else {
            logger.error('mpegts format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.MPEGPS:
          if (defined(ENABLE_DEMUXER_MPEGPS)) {
            iformat = new ((await import('avformat/formats/IMpegpsFormat')).default)
          }
          else {
            logger.error('mpegps format not support, maybe you can rebuild avmedia')
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
        case AVFormat.OGG:
          if (defined(ENABLE_DEMUXER_OGG)) {
            iformat = new ((await import('avformat/formats/IOggFormat')).default)
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
        case AVFormat.WEBM:
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
        case AVFormat.WEBVTT:
          if (defined(ENABLE_DEMUXER_WEBVTT)) {
            iformat = new (((await import('avformat/formats/IWebVttFormat')).default))
          }
          else {
            logger.error('webvtt format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.SUBRIP:
          if (defined(ENABLE_DEMUXER_SUBRIP)) {
            iformat = new (((await import('avformat/formats/ISubRipFormat')).default))
          }
          else {
            logger.error('subrip format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.ASS:
          if (defined(ENABLE_DEMUXER_ASS)) {
            iformat = new (((await import('avformat/formats/IAssFormat')).default))
          }
          else {
            logger.error('ass format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.TTML:
          if (defined(ENABLE_DEMUXER_TTML)) {
            iformat = new (((await import('avformat/formats/ITtmlFormat')).default))
          }
          else {
            logger.error('ttml format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.H264:
          if (defined(ENABLE_DEMUXER_H264)) {
            iformat = new (((await import('avformat/formats/IH264Format')).default))(task.formatOptions as IH264FormatOptions)
          }
          else {
            logger.error('h264 format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.HEVC:
          if (defined(ENABLE_DEMUXER_HEVC)) {
            iformat = new (((await import('avformat/formats/IHevcFormat')).default))(task.formatOptions as IHevcFormatOptions)
          }
          else {
            logger.error('hevc format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.VVC:
          if (defined(ENABLE_DEMUXER_VVC)) {
            iformat = new (((await import('avformat/formats/IVvcFormat')).default))(task.formatOptions as IVvcFormatOptions)
          }
          else {
            logger.error('vvc format not support, maybe you can rebuild avmedia')
            return errorType.FORMAT_NOT_SUPPORT
          }
          break
        case AVFormat.RTSP:
          if (defined(ENABLE_PROTOCOL_RTSP)) {
            iformat = new (((await import('avformat/formats/IRtspFormat')).default))(task.formatOptions as IRtspFormatOptions)
          }
          else {
            logger.error('vvc format not support, maybe you can rebuild avmedia')
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

      return demux.open(task.formatContext, {
        maxAnalyzeDuration: maxProbeDuration,
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

  public async analyzeStreams(taskId: string): Promise<AVFormatContextInterface | int32> {
    const task = this.tasks.get(taskId)
    if (task) {

      let ret = await demux.analyzeStreams(task.formatContext)

      if (ret) {
        return ret
      }

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
          timeBase: {
            den: stream.timeBase.den,
            num: stream.timeBase.num
          }
        })
      }
      return {
        metadata: task.formatContext.metadata,
        format: task.realFormat,
        chapters: task.formatContext.chapters,
        streams
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  private replyAVPacket(task: SelfTask, ipcPort: IPCPort, request: RpcMessage, avpacket: pointer<AVPacketRef>) {
    if (isWorker() && !cheapConfig.USE_THREADS && isPointer(avpacket)) {
      const data = serializeAVPacket(avpacket)
      const transfer = [data.data.buffer]
      if (data.sideData.length) {
        data.sideData.forEach((side) => {
          transfer.push(side.data.buffer)
        })
      }
      ipcPort.reply(request, data, null, transfer)
      task.avpacketPool.release(avpacket)
      return
    }
    ipcPort.reply(request, avpacket)
  }

  public async connectStreamTask(taskId: string, streamIndex: number, port: MessagePort) {
    const task = this.tasks.get(taskId)
    if (task) {
      const ipcPort: IPCPort & { streamIndex?: number } = new IPCPort(port)

      task.cacheAVPackets.set(streamIndex, [])

      ipcPort.streamIndex = streamIndex
      ipcPort.on(REQUEST, async (request: RpcMessage) => {
        switch (request.method) {
          case 'pull': {
            const cacheAVPackets = task.cacheAVPackets.get(ipcPort.streamIndex)
            if (cacheAVPackets.length) {
              const avpacket = cacheAVPackets.shift()
              if (task.stats !== nullptr) {
                if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
                  task.stats.audioPacketQueueLength--
                }
                else if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
                  task.stats.videoPacketQueueLength--
                }
              }
              this.replyAVPacket(task, ipcPort, request, avpacket)
            }
            else {
              if (task.demuxEnded) {
                ipcPort.reply(request, IOError.END)
              }
              else {
                task.cacheRequests.set(ipcPort.streamIndex, request)
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

  public async addPendingStream(taskId: string, streamIndex: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.pendingAVPackets.set(streamIndex, [])
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async changeConnectStream(taskId: string, newStreamIndex: number, oldStreamIndex: number, force: boolean = true, start: boolean = false) {
    const task = this.tasks.get(taskId)
    if (task) {

      if (newStreamIndex === oldStreamIndex) {
        return
      }

      let cache = task.cacheAVPackets.get(oldStreamIndex)
      const ipcPort = task.rightIPCPorts.get(oldStreamIndex)
      const request = task.cacheRequests.get(oldStreamIndex)

      if (!cache) {
        logger.warn(`oldStreamIndex ${oldStreamIndex} not found`)
      }

      await task.loop.stopBeforeNextTick()

      if (force) {
        if (!task.pendingAVPackets.has(newStreamIndex)) {
          array.each(cache, (avpacket) => {
            task.avpacketPool.release(avpacket)
          })
          cache.length = 0
        }
      }
      else {
        task.streamIndexFlush.set(newStreamIndex, true)
      }

      if (task.pendingAVPackets.has(newStreamIndex)) {
        task.pendingAVPackets.set(oldStreamIndex, cache)
        cache = task.pendingAVPackets.get(newStreamIndex)
        task.pendingAVPackets.delete(newStreamIndex)
      }
      if (task.formatContext.streams[newStreamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        task.stats.audioPacketQueueLength = cache.length
      }
      else if (task.formatContext.streams[newStreamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        task.stats.videoPacketQueueLength = cache.length
      }

      ipcPort.streamIndex = newStreamIndex

      task.cacheAVPackets.set(newStreamIndex, cache)
      task.rightIPCPorts.set(newStreamIndex, ipcPort)

      task.cacheAVPackets.delete(oldStreamIndex)
      task.rightIPCPorts.delete(oldStreamIndex)

      if (request) {
        task.cacheRequests.set(newStreamIndex, request)
        task.cacheRequests.delete(oldStreamIndex)
      }

      if (!force || start) {
        task.loop.start()
      }

      logger.debug(`changed connect stream, new ${newStreamIndex}, old: ${oldStreamIndex}, force: ${force}, taskId: ${task.taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  private async doDemux(task: SelfTask, minQueueLength: int32) {
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

      if (task.stats !== nullptr) {
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
              task.stats.keyFrameInterval = static_cast<int32>(avRescaleQ2(
                avpacket.pts - task.lastKeyFramePts,
                addressof(avpacket.timeBase),
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
      }

      if (task.streamIndexFlush.get(streamIndex)) {
        const stream = task.formatContext.streams.find((stream) => {
          return stream.index === streamIndex
        })
        const ele = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        if (!ele && stream && stream.codecpar.extradataSize) {
          const data = avMalloc(reinterpret_cast<size>(stream.codecpar.extradataSize))
          memcpy(data, stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
          addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, data, reinterpret_cast<size>(stream.codecpar.extradataSize))
        }
        task.streamIndexFlush.set(streamIndex, false)
      }

      if (task.cacheRequests.has(streamIndex)) {
        this.replyAVPacket(task, task.rightIPCPorts.get(streamIndex), task.cacheRequests.get(streamIndex), avpacket)
        task.cacheRequests.delete(streamIndex)
      }
      else {
        if (task.cacheAVPackets.has(streamIndex)) {
          task.cacheAVPackets.get(streamIndex).push(avpacket)
          if (task.stats !== nullptr) {
            if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
              task.stats.audioPacketQueueLength++
            }
            else if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              task.stats.videoPacketQueueLength++
            }
          }
          if (task.formatContext.streams[streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
            if (task.cacheAVPackets.get(streamIndex).length > minQueueLength) {
              task.avpacketPool.release(task.cacheAVPackets.get(streamIndex).shift())
            }
          }
        }
        else if (task.pendingAVPackets.has(streamIndex)) {
          const pending = task.pendingAVPackets.get(streamIndex)
          pending.push(avpacket)
          if (task.stats !== nullptr) {
            const type = task.formatContext.streams[streamIndex].codecpar.codecType
            while (pending.length) {
              const head = pending[0]
              const time = avRescaleQ2(head.pts, addressof(head.timeBase), AV_MILLI_TIME_BASE_Q)
              const currentTime = bigint.max(task.stats.audioCurrentTime, task.stats.videoCurrentTime)
              if (type === AVMediaType.AVMEDIA_TYPE_AUDIO
                && time >= currentTime
                || type === AVMediaType.AVMEDIA_TYPE_VIDEO
                  && time >= currentTime
                || (type !== AVMediaType.AVMEDIA_TYPE_AUDIO && type !== AVMediaType.AVMEDIA_TYPE_VIDEO)
                  && pending.length <= minQueueLength
              ) {
                break
              }
              task.avpacketPool.release(pending.shift())
            }
          }
          else {
            if (pending.length > minQueueLength) {
              task.avpacketPool.release(pending.shift())
            }
          }
        }
        else {
          if (task.rightIPCPorts.has(STREAM_INDEX_ALL)) {
            if (task.cacheRequests.has(STREAM_INDEX_ALL)) {
              this.replyAVPacket(task, task.rightIPCPorts.get(STREAM_INDEX_ALL), task.cacheRequests.get(STREAM_INDEX_ALL), avpacket)
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
        logger.error(`demux error, ret: ${ret}, taskId: ${task.taskId}`)
      }
      for (let streamIndex of task.cacheRequests.keys()) {
        const cacheAVPackets = task.cacheAVPackets.get(streamIndex)
        if (!cacheAVPackets.length) {
          task.rightIPCPorts.get(streamIndex).reply(task.cacheRequests.get(streamIndex), IOError.END)
          task.cacheRequests.delete(streamIndex)
        }
      }
    }

    return ret
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
          let isMaxQueue = false
          task.cacheAVPackets.forEach((list, streamIndex) => {
            const stream = task.formatContext.streams.find((stream) => {
              return stream.index === streamIndex
            })
            if (list.length < minQueueLength
              && (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_SUBTITLE
                || task.cacheAVPackets.size === 1
              )
            ) {
              canDo = true
            }
            if (list.length > Math.max(minQueueLength * 2, MAX_QUEUE_LENGTH_DEFAULT)) {
              isMaxQueue = true
            }
          })

          if (!canDo || isMaxQueue) {
            task.loop.emptyTask()
            return
          }
        }
        const ret = await this.doDemux(task, minQueueLength)
        if (ret) {
          task.demuxEnded = true
          logger.info(`demuxer ended, taskId: ${task.taskId}`)
          task.loop.stop()
        }
      }, 0, 0, true, false)

      if (isLive) {
        while (true) {
          let done = false
          task.cacheAVPackets.forEach((list, streamIndex) => {
            if (list.length > minQueueLength) {
              done = true
            }
          })
          if (!done) {
            const ret = await this.doDemux(task, minQueueLength)
            if (ret) {
              task.demuxEnded = true
              return
            }
          }
          else {
            break
          }
        }
      }

      task.loop.start()

      logger.debug(`start demux loop, taskId: ${task.taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async seek(taskId: string, timestamp: int64, flags: int32, streamIndex: int32 = -1): Promise<int64> {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.loop) {
        await task.loop.stopBeforeNextTick()
        let ret: int32 | int64 = await demux.seek(task.formatContext, streamIndex, timestamp, flags)
        if (ret >= 0n) {

          function resetList(list: pointer<AVPacketRef>[]) {
            array.each(list, (avpacket) => {
              if (task.formatContext.ioReader.flags & IOFlags.SLICE) {
                const newSideData = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
                const stream = task.formatContext.streams[avpacket.streamIndex]
                if (!stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] && newSideData) {
                  stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(newSideData.data, newSideData.size).slice()
                }
              }
              task.avpacketPool.release(avpacket)
            })
            list.length = 0
          }

          task.cacheAVPackets.forEach(resetList)
          task.pendingAVPackets.forEach(resetList)

          if (task.stats !== nullptr) {
            // 判断当前 task 处理的 stream 来重置
            task.cacheAVPackets.forEach((list, streamIndex) => {
              const stream = task.formatContext.streams.find((stream) => {
                return stream.index === streamIndex
              })
              if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
                task.stats.audioPacketQueueLength = 0
              }
              else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
                task.stats.videoPacketQueueLength = 0
              }
            })
          }

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

            if (task.stats !== nullptr) {
              if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
                task.stats.audioPacketQueueLength++
              }
              else if (task.formatContext.streams[avpacket.streamIndex].codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
                task.stats.videoPacketQueueLength++
              }
            }
            task.loop.start()
            return avRescaleQ2(bigint.max(avpacket.pts, 0n), addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
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

      let croppingMax = max

      const indexes: Map<number, number> = new Map()

      function hasSps(avpacket: pointer<AVPacketRef>, codecId: AVCodecID) {
        if (!(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)) {
          return false
        }
        let hasNewSps = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA) !== nullptr
        if (!hasNewSps && avpacket.bitFormat === h264.BitFormat.ANNEXB) {
          if (codecId === AVCodecID.AV_CODEC_ID_H264) {
            hasNewSps = !!h264.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
          else if (codecId === AVCodecID.AV_CODEC_ID_HEVC) {
            hasNewSps = !!hevc.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
          else if (codecId === AVCodecID.AV_CODEC_ID_VVC) {
            hasNewSps = !!vvc.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
        }
        return hasNewSps
      }

      const cacheAVPackets: Map<number, pointer<AVPacketRef>[]> = new Map()
      task.cacheAVPackets.forEach((list, streamIndex) => {
        cacheAVPackets.set(streamIndex, list)
      })
      task.pendingAVPackets.forEach((list, streamIndex) => {
        cacheAVPackets.set(streamIndex, list)
      })

      // 先处理视频
      cacheAVPackets.forEach((list, streamIndex) => {
        const codecType = task.formatContext.streams[streamIndex].codecpar.codecType
        const codecId = task.formatContext.streams[streamIndex].codecpar.codecId
        if (codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          const lastDts = list[list.length - 1].dts
          let i = list.length - 2
          for (i = list.length - 2; i >= 0; i--) {
            if ((list[i].flags & AVPacketFlags.AV_PKT_FLAG_KEY)) {
              if (avRescaleQ2(lastDts - list[i].dts, addressof(list[i].timeBase), AV_MILLI_TIME_BASE_Q) >= max) {
                croppingMax = bigint.max(croppingMax, avRescaleQ2(lastDts - list[i].dts, addressof(list[i].timeBase), AV_MILLI_TIME_BASE_Q))
                break
              }
            }
          }
          if (codecId === AVCodecID.AV_CODEC_ID_H264
            || codecId === AVCodecID.AV_CODEC_ID_HEVC
            || codecId === AVCodecID.AV_CODEC_ID_VVC
          ) {
            if (i > 0 && !hasSps(list[i], codecId)) {
              for (let j = i - 1; j > 0; j--) {
                if ((list[j].flags & AVPacketFlags.AV_PKT_FLAG_KEY)) {
                  // 前面有新的 sps，裁剪到最新的 sps 处
                  if (hasSps(list[j], codecId)) {
                    croppingMax = bigint.max(croppingMax, avRescaleQ2(lastDts - list[j].dts, addressof(list[j].timeBase), AV_MILLI_TIME_BASE_Q))
                    i = j
                    break
                  }
                }
              }
            }
          }
          if (i > 0) {
            indexes.set(streamIndex, i)
          }
        }
      })

      // 再处理非视频，裁剪到视频处
      cacheAVPackets.forEach((list, streamIndex) => {
        const codecType = task.formatContext.streams[streamIndex].codecpar.codecType
        if (codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
          const lastDts = list[list.length - 1].dts
          let i = list.length - 2
          for (i = list.length - 2; i >= 0; i--) {
            // 使用视频的裁剪时间
            if (avRescaleQ2(lastDts - list[i].dts, addressof(list[i].timeBase), AV_MILLI_TIME_BASE_Q) >= croppingMax) {
              break
            }
          }
          if (i >= 0) {
            indexes.set(streamIndex, i)
          }
        }
      })
      // 判断所有流是否都支持裁剪
      if (indexes.size === cacheAVPackets.size) {
        indexes.forEach((index, streamIndex) => {

          const list = cacheAVPackets.get(streamIndex)
          list.splice(0, index).forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })

          const codecType = task.formatContext.streams[streamIndex].codecpar.codecType

          if (task.stats !== nullptr) {
            if (codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
              task.stats.audioPacketQueueLength = list.length
            }
            else if (codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              task.stats.videoPacketQueueLength = list.length
            }
          }
        })
      }
    }
  }

  public async stop(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.formatContext.ioReader.flags |= IOFlags.ABORT
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

      task.cacheAVPackets.forEach((list) => {
        list.forEach((avpacket) => {
          task.avpacketPool.release(avpacket)
        })
      })
      task.pendingAVPackets.forEach((list) => {
        list.forEach((avpacket) => {
          task.avpacketPool.release(avpacket)
        })
      })

      task.cacheRequests.forEach((request, streamId) => {
        task.rightIPCPorts.get(streamId).reply(request, IOError.END)
      })
      task.cacheRequests.clear()

      await task.formatContext.destroy()

      task.leftIPCPort.destroy()
      task.rightIPCPorts.forEach((ipcPort) => {
        ipcPort.destroy()
      })
      task.rightIPCPorts.clear()

      if (task.iBuffer) {
        avFree(task.iBuffer)
        task.iBuffer = nullptr
      }
      if (task.oBuffer) {
        avFree(task.oBuffer)
        task.oBuffer = nullptr
      }
      this.tasks.delete(taskId)
    }
  }
}
