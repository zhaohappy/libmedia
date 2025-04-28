/*
 * libmedia AVTranscoder
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

import { AVCodecID, AVMediaType } from 'avutil/codec'
import IOPipeline from 'avpipeline/IOPipeline'
import DemuxPipeline from 'avpipeline/DemuxPipeline'
import VideoDecodePipeline from 'avpipeline/VideoDecodePipeline'
import AudioDecodePipeline from 'avpipeline/AudioDecodePipeline'
import { Thread, closeThread, createThreadFromClass } from 'cheap/thread/thread'
import generateUUID from 'common/function/generateUUID'
import * as is from 'common/util/is'
import * as object from 'common/util/object'
import * as array from 'common/util/array'
import { AVPacketRef } from 'avutil/struct/avpacket'
import List from 'cheap/std/collection/List'
import { AVFrameRef } from 'avutil/struct/avframe'
import { Mutex } from 'cheap/thread/mutex'
import compile, { WebAssemblyResource } from 'cheap/webassembly/compiler'
import { AVFormat, AVSeekFlags, IOType, IOFlags } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import support from 'common/util/support'
import browser from 'common/util/browser'
import { avQ2D, avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, AV_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import getVideoCodec from 'avutil/function/getVideoCodec'
import * as mutex from 'cheap/thread/mutex'
import AudioEncodePipeline from 'avpipeline/AudioEncodePipeline'
import VideoEncodePipeline from 'avpipeline/VideoEncodePipeline'
import { AudioCodecString2CodecId, Ext2Format,
  Format2AVFormat, PixfmtString2AVPixelFormat, SampleFmtString2SampleFormat,
  VideoCodecString2CodecId
} from 'avutil/stringEnum'
import MuxPipeline from 'avpipeline/MuxPipeline'
import IOWriterSync from 'common/io/IOWriterSync'
import { AVStreamInterface, AVStreamMetadataKey } from 'avutil/AVStream'
import Stats from 'avpipeline/struct/stats'
import IPCPort, { NOTIFY, REQUEST, RpcMessage } from 'common/network/IPCPort'
import * as errorType from 'avutil/error'
import getAudioCodec from 'avutil/function/getAudioCodec'
import { avFree, avMalloc, avMallocz } from 'avutil/util/mem'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { copyCodecParameters, freeCodecParameters } from 'avutil/util/codecparameters'
import SafeFileIO from 'common/io/SafeFileIO'
import Emitter from 'common/event/Emitter'
import * as eventType from './eventType'
import { BitFormat } from 'avutil/codecs/h264'
import { unrefAVFrame } from 'avutil/util/avframe'
import { unrefAVPacket } from 'avutil/util/avpacket'

import * as aac from 'avutil/codecs/aac'
import * as opus from 'avutil/codecs/opus'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import Sleep from 'common/timer/Sleep'
import AVFilterPipeline from './filter/AVFilterPipeline'
import { AVFilterGraphDesVertex, FilterGraphPortDes, GraphNodeType, createGraphDesVertex } from 'avfilter/graph'
import { AVSampleFormat } from 'avutil/audiosamplefmt'
import { AVPixelFormat } from 'avutil/pixfmt'
import getTimestamp from 'common/function/getTimestamp'
import Timer from 'common/timer/Timer'
import createMessageChannel from './function/createMessageChannel'
import Controller, { ControllerObserver } from './Controller'
import { AVFormatContextInterface } from 'avformat/AVFormatContext'
import dump, { dumpCodecName, dumpTime } from 'avformat/dump'
import { Data } from 'common/types/type'
import os from 'common/util/os'
import compileResource from 'avutil/function/compileResource'
import CustomIOLoader from 'avnetwork/ioLoader/CustomIOLoader'
import FetchIOLoader from 'avnetwork/ioLoader/FetchIOLoader'
import FileIOLoader from 'avnetwork/ioLoader/FileIOLoader'
import analyzeUrlIOLoader from 'avutil/function/analyzeUrlIOLoader'
import getWasmUrl from 'avutil/function/getWasmUrl'
import * as bigint from 'common/util/bigint'
import align from 'common/math/align'
import { Rational } from 'avutil/struct/rational'
import { getAVPixelFormatDescriptor } from 'avutil/pixelFormatDescriptor'
import isHdr from 'avutil/function/isHdr'
import hasAlphaChannel from 'avutil/function/hasAlphaChannel'

export interface AVTranscoderOptions {
  /**
   * 自定义 wasm 请求 base url
   * 
   *  `${wasmBaseUrl}/decode/aac.wasm`
   */
  wasmBaseUrl?: string
  getWasm?: (type: 'decoder' | 'resampler' | 'scaler' | 'encoder', codec?: AVCodecID, mediaType?: AVMediaType) => string | ArrayBuffer | WebAssemblyResource
  onprogress?: (taskId: string, progress: number) => void
}

export interface TaskOptions {
  input: {
    file: string | File | CustomIOLoader
    format?: keyof (typeof Format2AVFormat)
    formatOptions?: Data
    /**
     * 源扩展名
     * 强制指定扩展名，对没有扩展名的 url 链接使用
     */
    ext?: string
    /**
     * http 请求配置
     */
    http?: {
      /**
       * http 请求需要添加的 header
       */
      headers?: Data
      /**
       * http 请求的 credentials 配置
       */
      credentials?: RequestCredentials
      /**
       * http 请求的 referrerPolicy 配置
       */
      referrerPolicy?: ReferrerPolicy
    },
    /**
     * webtransport 配置
     */
    webtransport?: WebTransportOptions

    /**
     * 是否启用 WebCodecs 解码
     */
    enableWebCodecs?: boolean

    /**
     * 是否启用硬件解码
     */
    enableHardware?: boolean
  }
  start?: number
  duration?: number
  nbFrame?: number
  output: {
    file: FileSystemFileHandle | IOWriterSync
    format?: keyof (typeof Format2AVFormat)
    formatOptions?: Data
    video?: {
      /**
       * 输出编码类型
       */
      codec?: keyof (typeof VideoCodecString2CodecId)
      /**
       * 是否不输出
       */
      disable?: boolean
      /**
       * 输出宽度
       */
      width?: number
      /**
       * 输出高度
       */
      height?: number
      /**
       * 输出帧率
       */
      framerate?: number
      /**
       * 输出码率
       */
      bitrate?: number
      /**
       * 输出视频高宽比
       */
      aspect?: {
        den: number
        num: number
      }
      /**
       * 输出像素格式
       */
      pixfmt?: keyof (typeof PixfmtString2AVPixelFormat)
      /**
       * 输出关键帧间隔（毫秒）
       */
      keyFrameInterval?: number

      /**
       * 是否启用 WebCodecs 编码
       */
      enableWebCodecs?: boolean

      /**
       * 是否启用硬件编码
       */
      enableHardware?: boolean

      /**
       * 配置编码器 profile
       */
      profile?: number
      /**
       * 配置编码器 level
       */
      level?: number
      /**
       * 配置最大 b 帧长度（默认 4）
       * 只有 wasm 的 h264/h265 编码器支持
       */
      delay?: number
      /**
       * 编码器的参数设置 wasm 编码器生效
       * 
       * 详情参考 ffmpeg 的编码器 options 配置
       */
      encoderOptions?: Data
    }
    audio?: {
      /**
       * 输出编码类型
       */
      codec?: keyof (typeof AudioCodecString2CodecId)
      /**
       * 是否不输出
       */
      disable?: boolean
      /**
       * 输出声道数
       */
      channels?: number
      /**
       * 输出采样率
       */
      sampleRate?: number
      /**
       * 输出码率
       */
      bitrate?: number
      /**
       * 输出采样格式
       */
      sampleFmt?: keyof (typeof SampleFmtString2SampleFormat)
      /**
       * 配置编码器 profile
       */
      profile?: number
    }
  }
}

interface SelfTask {
  taskId: string
  startTime: number
  subTaskId?: string
  ext?: string
  options: TaskOptions
  ioloader2DemuxerChannel: MessageChannel
  muxer2OutputChannel: MessageChannel
  stats: Stats
  inputIPCPort?: IPCPort
  outputIPCPort?: IPCPort
  safeFileIO?: SafeFileIO
  format: AVFormat
  formatContext: AVFormatContextInterface
  streams: {
    taskId?: string
    input: AVStreamInterface
    output?: AVStreamInterface
    demuxer2DecoderChannel?: MessageChannel
    decoder2EncoderChannel?: MessageChannel
    decoder2FilterChannel?: MessageChannel
    filter2EncoderChannel?: MessageChannel
    encoder2MuxerChannel?: MessageChannel
    demuxer2MuxerChannel?: MessageChannel
  }[]
  controller: Controller
}

@struct
class AVTranscoderGlobalData {
  avpacketList: List<pointer<AVPacketRef>>
  avframeList: List<pointer<AVFrameRef>>
  avpacketListMutex: Mutex
  avframeListMutex: Mutex
}

const defaultAVTranscoderOptions: Partial<AVTranscoderOptions> = {
}

export default class AVTranscoder extends Emitter implements ControllerObserver {

  static Util = {
    compile,
    browser,
    os
  }

  static IOLoader = {
    CustomIOLoader,
    FetchIOLoader,
    FileIOLoader
  }
  /**
   * @hidden
   */
  static Resource: Map<string, WebAssemblyResource | ArrayBuffer> = new Map()

  private level: number = logger.INFO

  private DemuxThreadReady: Promise<void>
  private AudioThreadReady: Promise<void>
  private VideoThreadReady: Promise<void>
  private MuxThreadReady: Promise<void>

  // 下面的线程所有 AVTranscoder 实例共享
  private IOThread: Thread<IOPipeline>
  private DemuxerThread: Thread<DemuxPipeline>
  private MuxThread: Thread<MuxPipeline>

  private AudioDecoderThread: Thread<AudioDecodePipeline>
  private AudioFilterThread: Thread<AVFilterPipeline>
  private AudioEncoderThread: Thread<AudioEncodePipeline>

  private VideoDecoderThread: Thread<VideoDecodePipeline>
  private VideoFilterThread: Thread<AVFilterPipeline>
  private VideoEncoderThread: Thread<VideoEncodePipeline>

  // AVTranscoder 各个线程间共享的数据
  private GlobalData: AVTranscoderGlobalData

  private tasks: Map<string, SelfTask>
  private options: AVTranscoderOptions

  private reportTimer: Timer

  constructor(options: AVTranscoderOptions) {
    super(true)
    this.options = object.extend({}, defaultAVTranscoderOptions, options)

    this.GlobalData = make<AVTranscoderGlobalData>()

    mutex.init(addressof(this.GlobalData.avpacketListMutex))
    mutex.init(addressof(this.GlobalData.avframeListMutex))
    this.tasks = new Map()

    this.reportTimer = new Timer(() => {
      this.report()
    }, 0, 1000)

    logger.info('create transcoder')
  }

  private async getResource(type: 'decoder' | 'resampler' | 'scaler' | 'encoder', codecId?: AVCodecID, mediaType?: AVMediaType) {
    const key = codecId != null ? `${type}-${codecId}` : type

    if (AVTranscoder.Resource.has(key)) {
      return AVTranscoder.Resource.get(key)
    }

    const wasmUrl = this.options.getWasm
      ? this.options.getWasm(type, codecId, mediaType)
      : getWasmUrl(
        this.options.wasmBaseUrl ?? `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@${defined(VERSION).split('-')[0].replace(/^[v|n]/, '')}/dist`,
        type,
        codecId
      )

    if (wasmUrl) {
      let resource: WebAssemblyResource | ArrayBuffer
      // safari 16 以下不支持将 WebAssembly.Module 传递到 worker 中
      if ((browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      )
        && (is.string(wasmUrl) || is.arrayBuffer(wasmUrl))
      ) {
        if (is.string(wasmUrl)) {
          const params: Partial<Data> = {
            method: 'GET',
            headers: {},
            mode: 'cors',
            cache: 'default',
            referrerPolicy: 'no-referrer-when-downgrade'
          }
          const response = await fetch(wasmUrl, params)
          resource = await response.arrayBuffer()
        }
        else {
          resource = wasmUrl
        }
      }
      else {
        resource = await compileResource(wasmUrl, mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO)
      }

      AVTranscoder.Resource.set(key, resource)

      return resource
    }
  }

  private report() {
    this.tasks.forEach((task) => {
      if (task.startTime) {
        const frameCount = task.stats.videoPacketEncodeCount || task.stats.audioPacketEncodeCount
        const time = (getTimestamp() - task.startTime)
        let dts: int64 = 0n
        let duration: int64 = 0n
        if (task.stats.lastVideoMuxDts) {
          const stream =  task.streams.find((s) => s.input.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
          dts = task.stats.lastVideoMuxDts - task.stats.firstVideoMuxDts
          if (stream.output) {
            duration = avRescaleQ(stream.output.duration, stream.output.timeBase, AV_MILLI_TIME_BASE_Q)
          }
          else {
            duration = avRescaleQ(stream.input.duration, stream.input.timeBase, AV_MILLI_TIME_BASE_Q)
          }
        }
        if (task.stats.lastAudioMuxDts && !dts) {
          const stream =  task.streams.find((s) => s.input.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO)
          dts = task.stats.lastAudioMuxDts - task.stats.firstAudioMuxDts
          if (stream.output) {
            duration = avRescaleQ(stream.output.duration, stream.output.timeBase, AV_MILLI_TIME_BASE_Q)
          }
          else {
            duration = avRescaleQ(stream.input.duration, stream.input.timeBase, AV_MILLI_TIME_BASE_Q)
          }
        }

        const fps = time ? (static_cast<double>(frameCount) / (time / 1000)) : static_cast<double>(frameCount)
        const size = static_cast<double>(task.stats.bufferOutputBytes) / 1000
        const bitrate = (dts ? size * 8 / (static_cast<double>(dts) / 1000) : 0)
        const speed = static_cast<double>(dts) / 1000 / (time / 1000)
        let progress = duration ? ((static_cast<double>(dts) / static_cast<double>(duration) * 100)) : 0
        if (progress > 100) {
          progress = 100
        }

        logger.info(`[${task.taskId}] frame=${frameCount} fps=${fps.toFixed(2)} size=${size}kB time=${dumpTime(dts)} bitrate=${bitrate.toFixed(2)}kbps speed=${speed.toFixed(2)}x progress=${progress.toFixed(2)}%`)

        if (this.options.onprogress) {
          this.options.onprogress(task.taskId, progress)
        }
      }
    })
  }

  private async startDemuxPipeline() {
    if (this.DemuxThreadReady) {
      return this.DemuxThreadReady
    }
    return this.DemuxThreadReady = new Promise(async (resolve) => {
      this.IOThread = await createThreadFromClass(IOPipeline, {
        name: 'IOThread'
      }).run()
      this.IOThread.setLogLevel(this.level)

      this.DemuxerThread = await createThreadFromClass(DemuxPipeline, {
        name: 'DemuxerThread'
      }).run()
      this.DemuxerThread.setLogLevel(this.level)
      resolve()
    })
  }

  private async startVideoPipeline() {
    if (this.VideoThreadReady) {
      return this.VideoThreadReady
    }
    return this.VideoThreadReady = new Promise(async (resolve) => {
      this.VideoDecoderThread = await createThreadFromClass(VideoDecodePipeline, {
        name: 'VideoDecoderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.VideoDecoderThread.setLogLevel(this.level)

      this.VideoFilterThread = await createThreadFromClass(AVFilterPipeline, {
        name: 'VideoFilterThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.VideoFilterThread.setLogLevel(this.level)

      this.VideoEncoderThread = await createThreadFromClass(VideoEncodePipeline, {
        name: 'VideoEncoderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.VideoEncoderThread.setLogLevel(this.level)
      resolve()
    })
  }

  private async startAudioPipeline() {
    if (this.AudioThreadReady) {
      return this.AudioThreadReady
    }
    return this.AudioThreadReady = new Promise(async (resolve) => {
      this.AudioDecoderThread = await createThreadFromClass(AudioDecodePipeline, {
        name: 'AudioDecoderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.AudioDecoderThread.setLogLevel(this.level)

      this.AudioFilterThread = await createThreadFromClass(AVFilterPipeline, {
        name: 'AudioFilterThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.AudioFilterThread.setLogLevel(this.level)

      this.AudioEncoderThread = await createThreadFromClass(AudioEncodePipeline, {
        name: 'AudioEncoderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
          || os.ios && !browser.checkVersion(os.version, '16.1', true)
      }).run()
      this.AudioEncoderThread.setLogLevel(this.level)
      resolve()
    })
  }

  private async startMuxPipeline() {
    if (this.MuxThreadReady) {
      return this.MuxThreadReady
    }
    return this.MuxThreadReady = new Promise(async (resolve) => {
      this.MuxThread = await createThreadFromClass(MuxPipeline, {
        name: 'MuxThread',
        disableWorker: !support.workerMSE
      }).run()
      this.MuxThread.setLogLevel(this.level)
      resolve()
    })
  }

  private isHls(task: SelfTask) {
    if (task.ext) {
      return task.ext === 'm3u8' || task.ext === 'm3u'
    }
    if (task.options.input.file instanceof CustomIOLoader) {
      return task.options.input.file.ext === 'm3u8'
    }
    return task.options.input.ext === 'm3u8'
  }

  private isDash(task: SelfTask) {
    if (task.ext) {
      return task.ext === 'mpd'
    }
    if (task.options.input.file instanceof CustomIOLoader) {
      return task.options.input.file.ext === 'mpd'
    }
    return task.options.input.ext === 'mpd'
  }

  public async ready() {
    await this.startDemuxPipeline()
    await this.startAudioPipeline()
    await this.startVideoPipeline()
    await this.startMuxPipeline()
    logger.info('AVTranscoder pipelines started')
  }

  private changeAVStreamTimebase(stream: AVStreamInterface, timeBase: Rational) {
    let startTime = stream.startTime
    let duration = stream.duration

    if (startTime !== NOPTS_VALUE_BIGINT) {
      startTime = avRescaleQ(startTime, stream.timeBase, timeBase)
    }
    if (duration !== NOPTS_VALUE_BIGINT) {
      duration = avRescaleQ(duration, stream.timeBase, timeBase)
    }

    stream.duration = duration
    stream.startTime = startTime

    stream.timeBase.den = timeBase.den
    stream.timeBase.num = timeBase.num
  }

  private copyAVStreamInterface(task: SelfTask, stream: AVStreamInterface) {
    const newStream = object.extend({}, stream)
    newStream.codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMallocz(sizeof(AVCodecParameters)))
    copyCodecParameters(newStream.codecpar, stream.codecpar)
    newStream.timeBase = {
      den: 1,
      num: 1
    }

    newStream.timeBase.den = stream.timeBase.den
    newStream.timeBase.num = stream.timeBase.num

    if (newStream.codecpar.extradata) {
      avFree(newStream.codecpar.extradata)
      newStream.codecpar.extradata = nullptr
      newStream.codecpar.extradataSize = 0
    }

    if (task.options.duration) {
      newStream.duration = avRescaleQ(static_cast<int64>(task.options.duration), AV_MILLI_TIME_BASE_Q, newStream.timeBase)
    }

    newStream.metadata[AVStreamMetadataKey.ENCODER] = `libmedia-${defined(VERSION)}`

    return newStream
  }

  private async setTaskInput(task: SelfTask) {
    const taskId = task.taskId
    const taskOptions = task.options
    const ioloader2DemuxerChannel = task.ioloader2DemuxerChannel = createMessageChannel()
    const stats = task.stats

    let ret = 0
    let ext: string
    if (is.string(taskOptions.input.file)) {
      let { info, type, ext: ext_ } = await analyzeUrlIOLoader(
        taskOptions.input.file,
        taskOptions.input.ext,
        taskOptions.input.http
      )
      ext = ext_
      // 注册一个 url io 任务
      ret = await this.IOThread.registerTask
        .transfer(ioloader2DemuxerChannel.port1)
        .invoke({
          type: type,
          info: {
            ...info
          },
          range: {
            from: -1,
            to: -1
          },
          taskId,
          options: {
            isLive: false
          },
          rightPort: ioloader2DemuxerChannel.port1,
          stats: addressof(stats)
        })
    }
    else if (taskOptions.input.file instanceof File) {
      ext = taskOptions.input.file.name.split('.').pop()
      // 注册一个文件 io 任务
      ret = await this.IOThread.registerTask
        .transfer(ioloader2DemuxerChannel.port1)
        .invoke({
          type: IOType.File,
          info: {
            file: taskOptions.input.file
          },
          range: {
            from: -1,
            to: -1
          },
          taskId,
          options: {
            isLive: false
          },
          rightPort: ioloader2DemuxerChannel.port1,
          stats: addressof(stats)
        })
    }
    else if (taskOptions.input.file instanceof CustomIOLoader) {
      const ipcPort = task.inputIPCPort = new IPCPort(ioloader2DemuxerChannel.port1)
      ipcPort.on(REQUEST, async (request: RpcMessage) => {
        switch (request.method) {
          case 'open': {
            const ret = await (task.options.input.file as CustomIOLoader).open()
            if (ret < 0) {
              logger.error(`custom loader open error, ${ret}, taskId: ${task.taskId}`)
              ipcPort.reply(request, null, ret)
              break
            }
            ipcPort.reply(request, ret)
            break
          }
          case 'read': {
            const pointer = request.params.pointer
            const length = request.params.length

            assert(pointer)
            assert(length)

            const buffer = mapSafeUint8Array(pointer, length)

            try {
              const len = await (task.options.input.file as CustomIOLoader).read(length, buffer)
              if (len > 0) {
                task.stats.bufferReceiveBytes += static_cast<int64>(len)
              }
              ipcPort.reply(request, len)
            }
            catch (error) {
              logger.error(`loader read error, ${error}, taskId: ${task.taskId}`)
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
              const ret = await (task.options.input.file as CustomIOLoader).write(buffer)
              task.stats.bufferSendBytes += static_cast<int64>(length)
              ipcPort.reply(request, ret)
            }
            catch (error) {
              logger.error(`loader write error, ${error}, taskId: ${task.taskId}`)
              ipcPort.reply(request, errorType.DATA_INVALID)
            }

            break
          }

          case 'seek': {
            const pos = request.params.pos

            assert(pos >= 0)

            try {
              const ret = await (task.options.input.file as CustomIOLoader).seek(pos)
              if (ret < 0) {
                logger.error(`custom loader seek error, ${ret}, taskId: ${task.taskId}`)
                ipcPort.reply(request, null, ret)
                break
              }
              ipcPort.reply(request, ret)
            }
            catch (error) {
              logger.error(`loader seek error, ${error}, taskId: ${task.taskId}`)
              ipcPort.reply(request, null, error)
            }
            break
          }

          case 'size': {
            ipcPort.reply(request, await (task.options.input.file as CustomIOLoader).size())
            break
          }
        }
      })
    }
    else {
      logger.fatal('invalid source')
    }


    if (ext) {
      task.ext = ext
    }

    if (ret < 0) {
      logger.fatal(`register io task failed, ret: ${ret}, taskId: ${taskId}`)
    }
  }

  private async setTaskOutput(task: SelfTask) {
    const muxer2OutputChannel = task.muxer2OutputChannel = createMessageChannel()
    const ipcPort = task.outputIPCPort = new IPCPort(muxer2OutputChannel.port2)

    let format: AVFormat

    if (task.options.output.format) {
      format = Format2AVFormat[task.options.output.format]
    }
    else if (task.options.output.file instanceof FileSystemFileHandle) {
      let ext = task.options.output.file.name.split('.').pop()
      format = Ext2Format[ext]
    }

    if (!is.number(format)) {
      logger.fatal('invalid output format')
    }

    task.format = format

    let ret = await this.MuxThread.registerTask.transfer(muxer2OutputChannel.port1)
      .invoke({
        taskId: task.taskId,
        format,
        avpacketList: addressof(this.GlobalData.avpacketList),
        avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
        stats: addressof(task.stats),
        rightPort: muxer2OutputChannel.port1,
        formatOptions: task.options.output.formatOptions
      })

    if (ret < 0) {
      logger.fatal(`register mux task failed, ret: ${ret}, taskId: ${task.taskId}`)
    }

    let ioWriter: {
      write: (buffer: Uint8Array) => void
      appendBufferByPosition: (buffer: Uint8Array, pos: number) => void
      seek: (pos: number) => void
      close: () => void | Promise<void>
    }

    if (task.options.output.file instanceof FileSystemFileHandle) {
      ioWriter = task.safeFileIO = new SafeFileIO(task.options.output.file)
      await task.safeFileIO.ready()
    }
    else {
      ioWriter = {
        write: (buffer) => {
          (task.options.output.file as IOWriterSync).writeBuffer(buffer)
        },
        appendBufferByPosition: (buffer, pos) => {
          (task.options.output.file as IOWriterSync).flush()
          ;(task.options.output.file as IOWriterSync).writeBuffer(buffer)
          ;(task.options.output.file as IOWriterSync).flushToPos(static_cast<int64>(pos))
        },
        seek: (pos) => {
          (task.options.output.file as IOWriterSync).seek(static_cast<int64>(pos))
        },
        close: () => {
          (task.options.output.file as IOWriterSync).flush()
        }
      }
    }

    ipcPort.on(NOTIFY, async (request: RpcMessage) => {
      switch (request.method) {
        case 'write': {
          try {
            if (request.params.pos != null) {
              ioWriter.appendBufferByPosition(request.params.data, Number(request.params.pos))
            }
            else {
              ioWriter.write(request.params.data)
            }
            if (task.options.output.file instanceof FileSystemFileHandle) {
              if (task.safeFileIO.writeQueueSize > 5) {
                try {
                  await this.MuxThread.pause(task.taskId)
                  while (task.safeFileIO.writeQueueSize > 5) {
                    await new Sleep(0)
                  }
                  await this.MuxThread.unpause(task.taskId)
                }
                catch (e) {}
              }
            }
          }
          catch (error) {
            logger.error(`ioWriter write error, ${error}, taskId: ${task.taskId}`)
          }
          break
        }
        case 'seek': {
          const pos = request.params.pos

          assert(pos >= 0)

          try {
            ioWriter.seek(Number(pos))
          }
          catch (error) {
            logger.error(`ioWriter seek error, ${error}, taskId: ${task.taskId}`)
          }
          break
        }
        case 'end': {
          await ioWriter.close()
          await this.clearTask(task)
          this.fire(eventType.TASK_ENDED, [task.taskId])
          logger.info(`transcode ended, taskId: ${task.taskId}, cost: ${dumpTime(static_cast<int64>(getTimestamp() - task.startTime))}`)
          break
        }

        case 'error': {
          await ioWriter.close()
          await this.clearTask(task)
          this.fire(eventType.TASK_ERROR, [task.taskId])
          logger.info(`transcode error, taskId: ${task.taskId}`)
          break
        }
      }
    })
  }

  private async analyzeInputStreams(task: SelfTask) {
    const taskId = task.taskId
    const ioloader2DemuxerChannel = task.ioloader2DemuxerChannel
    const ext = task.ext
    const stats = task.stats

    let ret = 0
    let subTaskId: string
    if (defined(ENABLE_PROTOCOL_DASH) && this.isDash(task)) {
      await this.IOThread.open(taskId)
      const hasAudio = await this.IOThread.hasAudio(taskId)
      const hasVideo = await this.IOThread.hasVideo(taskId)
      if (hasAudio && hasVideo) {
        // dash 因为音视频各自独立，因此这里注册两个解封装任务
        subTaskId = generateUUID()
        await this.DemuxerThread.registerTask
          .transfer(ioloader2DemuxerChannel.port2, task.controller.getDemuxerRenderControlPort())
          .invoke({
            taskId,
            leftPort: ioloader2DemuxerChannel.port2,
            controlPort: task.controller.getDemuxerRenderControlPort(),
            format: Ext2Format[ext],
            stats: addressof(stats),
            isLive: false,
            flags: IOFlags.SLICE,
            ioloaderOptions: {
              mediaType: 'audio'
            },
            avpacketList: addressof(this.GlobalData.avpacketList),
            avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
            formatOptions: task.options.input.formatOptions
          })
        await this.DemuxerThread.registerTask({
          taskId: subTaskId,
          mainTaskId: taskId,
          flags: IOFlags.SLICE,
          format: Ext2Format[ext],
          stats: addressof(stats),
          isLive: false,
          ioloaderOptions: {
            mediaType: 'video'
          },
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          formatOptions: task.options.input.formatOptions
        })
      }
      else {
        // dash 只有一个媒体类型
        await this.DemuxerThread.registerTask
          .transfer(ioloader2DemuxerChannel.port2, task.controller.getDemuxerRenderControlPort())
          .invoke({
            taskId,
            leftPort: ioloader2DemuxerChannel.port2,
            controlPort: task.controller.getDemuxerRenderControlPort(),
            format: Ext2Format[ext],
            stats: addressof(stats),
            isLive: false,
            flags: IOFlags.SLICE,
            ioloaderOptions: {
              mediaType: hasAudio ? 'audio' : 'video'
            },
            avpacketList: addressof(this.GlobalData.avpacketList),
            avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
            formatOptions: task.options.input.formatOptions
          })
      }
    }
    else {
      await this.DemuxerThread.registerTask
        .transfer(ioloader2DemuxerChannel.port2, task.controller.getDemuxerRenderControlPort())
        .invoke({
          taskId,
          leftPort: ioloader2DemuxerChannel.port2,
          controlPort: task.controller.getDemuxerRenderControlPort(),
          format: Ext2Format[ext],
          stats: addressof(stats),
          isLive: false,
          flags: this.isHls(task) ? IOFlags.SLICE : 0,
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          formatOptions: task.options.input.formatOptions
        })
    }

    ret = await this.DemuxerThread.openStream(taskId, 15000)
    if (ret < 0) {
      logger.fatal(`open stream failed, ret: ${ret}, taskId: ${taskId}`)
    }
    let formatContext = await this.DemuxerThread.analyzeStreams(taskId)
    if (is.number(formatContext)) {
      logger.fatal(`analyze stream failed, ret: ${formatContext}`)
      return
    }
    else if (!formatContext.streams.length) {
      logger.fatal('not found any stream')
    }

    if (defined(ENABLE_PROTOCOL_DASH) && subTaskId) {
      ret = await this.DemuxerThread.openStream(subTaskId, 15000)
      if (ret < 0) {
        logger.fatal(`open stream failed, ret: ${ret}, taskId: ${taskId}`)
      }
      const subFormatContext = await this.DemuxerThread.analyzeStreams(subTaskId)
      if (is.number(subFormatContext)) {
        logger.fatal(`analyze stream failed, ret: ${subFormatContext}`)
        return
      }
      else if (!subFormatContext.streams.length) {
        logger.fatal('not found any stream')
      }
      formatContext.streams = formatContext.streams.concat(subFormatContext.streams)
    }

    if (subTaskId) {
      task.subTaskId = subTaskId
    }

    if (defined(ENABLE_PROTOCOL_DASH) || defined(ENABLE_PROTOCOL_HLS)) {
      // m3u8 和 dash 的 duration 来自于协议本身
      if (this.isHls(task) || this.isDash(task)) {
        const duration: double = (await this.IOThread.getDuration(taskId)) * 1000
        if (duration > 0) {
          for (let i = 0; i < formatContext.streams.length; i++) {
            formatContext.streams[i].duration = avRescaleQ(
              static_cast<int64>(duration),
              AV_MILLI_TIME_BASE_Q,
              formatContext.streams[i].timeBase
            )
          }
        }
      }
    }
    return formatContext
  }

  private async handleAudioStream(stream: AVStreamInterface, task: SelfTask): Promise<number> {
    const audioConfig = task.options.output.audio
    if (audioConfig?.disable) {
      return 0
    }
    else if (audioConfig?.codec === 'copy' && !(task.options.start || task.options.duration)) {
      const demuxer2MuxerChannel = createMessageChannel()
      await this.DemuxerThread.connectStreamTask
        .transfer(demuxer2MuxerChannel.port1)
        .invoke(task.taskId, stream.index, demuxer2MuxerChannel.port1)

      await this.MuxThread.addStream
        .transfer(demuxer2MuxerChannel.port2)
        .invoke(task.taskId, stream, demuxer2MuxerChannel.port2)

      task.streams.push({
        input: stream,
        demuxer2MuxerChannel
      })

      return 0
    }
    else {
      const demuxer2DecoderChannel = createMessageChannel()
      const encoder2MuxerChannel = createMessageChannel()

      const decoder2FilterChannel = createMessageChannel()
      const filter2EncoderChannel = createMessageChannel()

      const newStream = this.copyAVStreamInterface(task, stream)
      const taskId = generateUUID()

      let ret = 0

      if (audioConfig) {
        if (audioConfig.codec && audioConfig.codec !== 'copy') {
          const codecId = AudioCodecString2CodecId[audioConfig.codec]
          if (!is.number(codecId)) {
            logger.fatal(`invalid codec name(${audioConfig.codec})`)
          }
          newStream.codecpar.codecId = codecId

          if (newStream.codecpar.codecId !== stream.codecpar.codecId) {
            newStream.codecpar.profile = NOPTS_VALUE
            newStream.codecpar.level = NOPTS_VALUE
          }
        }
        if (audioConfig.bitrate) {
          newStream.codecpar.bitrate = static_cast<int64>(audioConfig.bitrate)
        }
        if (audioConfig.channels) {
          newStream.codecpar.chLayout.nbChannels = audioConfig.channels
        }
        if (audioConfig.sampleRate) {
          newStream.codecpar.sampleRate = audioConfig.sampleRate
        }
        if (audioConfig.sampleFmt) {
          const sampleFmt = SampleFmtString2SampleFormat[audioConfig.sampleFmt]
          if (!is.number(sampleFmt)) {
            logger.fatal(`invalid sampleFmt name(${audioConfig.sampleFmt})`)
          }
          newStream.codecpar.format = sampleFmt
        }
        if (audioConfig.profile) {
          newStream.codecpar.profile = audioConfig.profile
        }
      }

      if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
        newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_FLTP
        if (newStream.codecpar.sampleRate > 48000) {
          newStream.codecpar.sampleRate = 48000
        }
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
        newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_FLTP
        if (newStream.codecpar.sampleRate > 48000) {
          newStream.codecpar.sampleRate = 48000
        }
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
        newStream.codecpar.sampleRate = 48000
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC) {
        if (newStream.codecpar.format !== AVSampleFormat.AV_SAMPLE_FMT_S16
          && newStream.codecpar.format !== AVSampleFormat.AV_SAMPLE_FMT_S32
        ) {
          newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_S16
        }
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_ALAW
        || newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_MULAW
      ) {
        newStream.codecpar.sampleRate = 8000
        newStream.codecpar.bitrate = 64000n
        newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_S16
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX) {
        newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_S16
        if (newStream.codecpar.sampleRate > 32000) {
          newStream.codecpar.sampleRate = 32000
        }
      }
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS) {
        newStream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_S32
        let fullbandChannels = newStream.codecpar.chLayout.nbChannels
        const lfeChannel = (fullbandChannels === 6 || fullbandChannels === 3) ? 1 : 0
        if (lfeChannel) {
          fullbandChannels--
        }
        const minFrameBits = align(132 + (493 + 28 * 32) * fullbandChannels + lfeChannel * 72, 32)
        const minBitrate: int32 = (minFrameBits * newStream.codecpar.sampleRate - newStream.codecpar.sampleRate + 1) / 512
        newStream.codecpar.bitrate = bigint.max(static_cast<int64>(minBitrate), newStream.codecpar.bitrate)
      }

      if (newStream.codecpar.profile === NOPTS_VALUE) {
        if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          newStream.codecpar.profile = aac.MPEG4AudioObjectTypes.AAC_LC
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
          newStream.codecpar.profile = 34
        }
      }

      if (task.format === AVFormat.MOV) {
        this.changeAVStreamTimebase(newStream, { num: 1, den: newStream.codecpar.sampleRate })
      }

      await this.DemuxerThread.connectStreamTask
        .transfer(demuxer2DecoderChannel.port1)
        .invoke(task.taskId, stream.index, demuxer2DecoderChannel.port1)

      let decoderResource = await this.getResource('decoder', stream.codecpar.codecId, stream.codecpar.codecType)
      if (!decoderResource) {
        if (support.audioDecoder) {
          const isSupport = await AudioDecoder.isConfigSupported({
            codec: getVideoCodec(stream.codecpar),
            sampleRate: stream.codecpar.sampleRate,
            numberOfChannels: stream.codecpar.chLayout.nbChannels
          })
          if (!isSupport.supported) {
            logger.error(`AudioDecoder codecId ${stream.codecpar.codecId} not support`)
            freeCodecParameters(newStream.codecpar)
            return errorType.OPERATE_NOT_SUPPORT
          }
        }
        else {
          logger.error(`audio decoder codecId ${stream.codecpar.codecId} not support`)
          freeCodecParameters(newStream.codecpar)
          return errorType.OPERATE_NOT_SUPPORT
        }
      }

      // 注册一个音频解码任务
      await this.AudioDecoderThread.registerTask
        .transfer(demuxer2DecoderChannel.port2, decoder2FilterChannel.port1)
        .invoke({
          taskId: taskId,
          resource: decoderResource,
          leftPort: demuxer2DecoderChannel.port2,
          rightPort: decoder2FilterChannel.port1,
          stats: addressof(task.stats),
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex)
        })

      ret = await this.AudioDecoderThread.open(taskId, stream.codecpar)

      if (ret < 0) {
        logger.error(`cannot open audio ${dumpCodecName(stream.codecpar.codecType, stream.codecpar.codecId)} decoder`)
        freeCodecParameters(newStream.codecpar)
        return ret
      }

      let resamplerResource = await this.getResource('resampler')
      if (!resamplerResource) {
        logger.error('resampler not found')
        freeCodecParameters(newStream.codecpar)
        return errorType.OPERATE_NOT_SUPPORT
      }

      const vertices: AVFilterGraphDesVertex<GraphNodeType>[] = []
      const edges: { parent: number, child: number }[] = []
      let input: FilterGraphPortDes
      let output: FilterGraphPortDes

      const resampleNode = createGraphDesVertex('resampler', {
        resource: resamplerResource,
        output: {
          channels: newStream.codecpar.chLayout.nbChannels,
          sampleRate: newStream.codecpar.sampleRate,
          format: newStream.codecpar.format as AVSampleFormat
        }
      })
      vertices.push(resampleNode)
      input = {
        id: resampleNode.id,
        port: decoder2FilterChannel.port2
      }
      output = {
        id: resampleNode.id,
        port: filter2EncoderChannel.port1
      }

      if (task.options.start || task.options.duration) {
        const start = avRescaleQ(static_cast<int64>(task.options.start || 0), AV_MILLI_TIME_BASE_Q, stream.timeBase)
        const rangeNode = createGraphDesVertex('range', {
          start: start,
          end: task.options.duration
            ? (avRescaleQ(static_cast<int64>(task.options.duration), AV_MILLI_TIME_BASE_Q, AV_TIME_BASE_Q) + start)
            : -1n
        })
        vertices.push(rangeNode)
        input = {
          id: rangeNode.id,
          port: decoder2FilterChannel.port2
        }
        edges.push({
          parent: rangeNode.id,
          child: resampleNode.id
        })
      }

      await this.AudioFilterThread.registerTask
        .transfer(decoder2FilterChannel.port2, filter2EncoderChannel.port1)
        .invoke({
          taskId: taskId,
          graph: {
            vertices: vertices,
            edges: edges
          },
          inputPorts: [input],
          outputPorts: [output],
          stats: addressof(task.stats),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex),
        })

      let encoderResource = await this.getResource('encoder', newStream.codecpar.codecId, newStream.codecpar.codecType)
      if (!encoderResource) {
        if (support.audioEncoder) {
          const isSupport = await AudioEncoder.isConfigSupported({
            codec: getAudioCodec(newStream.codecpar),
            sampleRate: newStream.codecpar.sampleRate,
            numberOfChannels: newStream.codecpar.chLayout.nbChannels,
            bitrate: static_cast<int32>(newStream.codecpar.bitrate),
            bitrateMode: 'constant'
          })
          if (!isSupport.supported) {
            logger.error(`AudioEncoder ${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} codecId ${newStream.codecpar.codecId} not support`)
            freeCodecParameters(newStream.codecpar)
            return errorType.OPERATE_NOT_SUPPORT
          }
        }
        else {
          logger.error(`${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} encoder codecId ${newStream.codecpar.codecId} not support`)
          freeCodecParameters(newStream.codecpar)
          return errorType.OPERATE_NOT_SUPPORT
        }
      }

      // 注册一个音频编码任务
      await this.AudioEncoderThread.registerTask
        .transfer(filter2EncoderChannel.port2, encoder2MuxerChannel.port1)
        .invoke({
          taskId: taskId,
          resource: encoderResource,
          leftPort: filter2EncoderChannel.port2,
          rightPort: encoder2MuxerChannel.port1,
          stats: addressof(task.stats),
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex),
        })

      ret = await this.AudioEncoderThread.open(taskId, newStream.codecpar, { num: newStream.timeBase.num, den: newStream.timeBase.den })

      if (ret < 0) {
        logger.error(`cannot open audio ${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} encoder`)
        freeCodecParameters(newStream.codecpar)
        return ret
      }

      await this.MuxThread.addStream
        .transfer(encoder2MuxerChannel.port2)
        .invoke(task.taskId, newStream, encoder2MuxerChannel.port2)

      task.streams.push({
        taskId,
        input: stream,
        output: newStream,
        demuxer2DecoderChannel,
        decoder2FilterChannel,
        filter2EncoderChannel,
        encoder2MuxerChannel
      })

      return 0
    }
  }

  private async handleVideoStream(stream: AVStreamInterface, task: SelfTask): Promise<number> {
    const videoConfig = task.options.output.video
    if (videoConfig?.disable) {
      return 0
    }
    else if (videoConfig?.codec === 'copy' && !(task.options.start || task.options.duration)) {
      const demuxer2MuxerChannel = createMessageChannel()
      await this.DemuxerThread.connectStreamTask
        .transfer(demuxer2MuxerChannel.port1)
        .invoke(task.subTaskId || task.taskId, stream.index, demuxer2MuxerChannel.port1)

      await this.MuxThread.addStream
        .transfer(demuxer2MuxerChannel.port2)
        .invoke(task.taskId, stream, demuxer2MuxerChannel.port2)

      task.streams.push({
        input: stream,
        demuxer2MuxerChannel
      })

      return 0
    }
    else {
      const demuxer2DecoderChannel = createMessageChannel()
      const encoder2MuxerChannel = createMessageChannel()

      const decoder2FilterChannel = createMessageChannel()
      const filter2EncoderChannel = createMessageChannel()

      const newStream = this.copyAVStreamInterface(task, stream)

      const taskId = generateUUID()

      let ret = 0

      if (videoConfig) {
        if (videoConfig.codec && videoConfig.codec !== 'copy') {
          const codecId = VideoCodecString2CodecId[videoConfig.codec]
          if (!is.number(codecId)) {
            logger.fatal(`invalid codec name(${videoConfig.codec})`)
          }
          newStream.codecpar.codecId = codecId

          if (newStream.codecpar.codecId !== stream.codecpar.codecId) {
            newStream.codecpar.profile = NOPTS_VALUE
            newStream.codecpar.level = NOPTS_VALUE
          }
        }
        if (videoConfig.width) {
          newStream.codecpar.width = videoConfig.width
        }
        if (videoConfig.height) {
          newStream.codecpar.height = videoConfig.height
        }
        if (videoConfig.bitrate) {
          newStream.codecpar.bitrate = static_cast<int64>(videoConfig.bitrate)
        }
        if (videoConfig.pixfmt) {
          const pixfmt = PixfmtString2AVPixelFormat[videoConfig.pixfmt]
          if (!is.number(pixfmt)) {
            logger.fatal(`invalid pixfmt name(${videoConfig.pixfmt})`)
          }
          newStream.codecpar.format = pixfmt
        }
        if (videoConfig.framerate) {
          newStream.codecpar.framerate.num = videoConfig.framerate >>> 0
          newStream.codecpar.framerate.den = 1
        }
        if (videoConfig.aspect) {
          newStream.codecpar.sampleAspectRatio.den = videoConfig.aspect.den
          newStream.codecpar.sampleAspectRatio.num = videoConfig.aspect.num
        }
        if (videoConfig.profile) {
          newStream.codecpar.profile = videoConfig.profile
        }
        if (videoConfig.level) {
          newStream.codecpar.level = videoConfig.level
        }
        if (videoConfig.delay) {
          newStream.codecpar.videoDelay = videoConfig.delay
        }
      }

      if (newStream.codecpar.profile === NOPTS_VALUE) {
        if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
          const descriptor = getAVPixelFormatDescriptor(newStream.codecpar.format as AVPixelFormat)
          newStream.codecpar.profile = descriptor?.comp[0]?.depth === 10 ? h264.H264Profile.kHigh10 : h264.H264Profile.kHigh
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          const descriptor = getAVPixelFormatDescriptor(newStream.codecpar.format as AVPixelFormat)
          newStream.codecpar.profile = descriptor?.comp[0]?.depth === 10 ? hevc.HEVCProfile.Main10 : hevc.HEVCProfile.Main
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {

        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
          newStream.codecpar.profile = av1.AV1Profile.Main
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
          newStream.codecpar.profile = vp9.VP9Profile.Profile0
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP8) {
          newStream.codecpar.profile = 0
        }
      }
      if (newStream.codecpar.level === NOPTS_VALUE) {
        if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
          newStream.codecpar.level = h264.getLevelByResolution(newStream.codecpar.width, newStream.codecpar.height, avQ2D(newStream.codecpar.framerate))
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          newStream.codecpar.level = hevc.getLevelByResolution(
            newStream.codecpar.profile,
            newStream.codecpar.width,
            newStream.codecpar.height,
            avQ2D(newStream.codecpar.framerate),
            static_cast<double>(newStream.codecpar.bitrate)
          )
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
          // TODO 现在还没有 vvc 编码器，将来如果加入了 vvc 编码器再来实现
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
          newStream.codecpar.level = av1.getLevelByResolution(newStream.codecpar.width, newStream.codecpar.height, avQ2D(newStream.codecpar.framerate))
        }
        else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
          newStream.codecpar.level = vp9.getLevelByResolution(newStream.codecpar.width, newStream.codecpar.height, avQ2D(newStream.codecpar.framerate))
        }
      }

      if (!videoConfig || videoConfig.delay == null) {
        // 这个用来设置 max_b_frame_count，只针对 wasm 编码器，webcodecs 目前无法编码出 B 帧
        newStream.codecpar.videoDelay = 4
      }

      if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        || newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
      ) {
        if (task.format === AVFormat.MPEGTS) {
          newStream.codecpar.bitFormat = BitFormat.ANNEXB
        }
        else {
          newStream.codecpar.bitFormat = BitFormat.AVCC
        }
      }

      if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4 && newStream.timeBase.den > 65535) {
        this.changeAVStreamTimebase(newStream, { num: 1, den: 65535 })
      }
      else if (task.format === AVFormat.MOV) {
        // 如果是整数帧率，调整时间基为 framerate 的倍数，节省 stts box 的大小
        const framerate = avQ2D(newStream.codecpar.framerate)
        if (framerate === Math.floor(framerate)) {
          this.changeAVStreamTimebase(newStream, { num: 1, den: framerate * 256 })
        }
      }

      await this.DemuxerThread.connectStreamTask
        .transfer(demuxer2DecoderChannel.port1)
        .invoke(task.subTaskId || task.taskId, stream.index, demuxer2DecoderChannel.port1)

      let decoderResource = await this.getResource('decoder', stream.codecpar.codecId, stream.codecpar.codecType)
      if (!decoderResource) {
        if (support.videoDecoder) {
          const isSupport = await VideoDecoder.isConfigSupported({
            codec: getVideoCodec(stream.codecpar)
          })
          if (!isSupport.supported) {
            logger.error(`VideoDecoder codecId ${stream.codecpar.codecId} not support`)
            freeCodecParameters(newStream.codecpar)
            return errorType.OPERATE_NOT_SUPPORT
          }
        }
        else {
          logger.error(`video decoder codecId ${stream.codecpar.codecId} not support`)
          freeCodecParameters(newStream.codecpar)
          return errorType.OPERATE_NOT_SUPPORT
        }
      }

      const descriptor = getAVPixelFormatDescriptor(stream.codecpar.format as AVPixelFormat)
      let canUseHardware = true
      // 硬解只能支持 8 位，webcodecs 10 位的解出来无法拿数据出来编码
      if (descriptor?.comp[0]?.depth > 8) {
        canUseHardware = false
      }

      // 注册一个视频解码任务
      await this.VideoDecoderThread.registerTask
        .transfer(demuxer2DecoderChannel.port2, decoder2FilterChannel.port1)
        .invoke({
          taskId: taskId,
          resource: decoderResource,
          leftPort: demuxer2DecoderChannel.port2,
          rightPort: decoder2FilterChannel.port1,
          stats: addressof(task.stats),
          enableHardware: !!task.options.input.enableHardware && !!task.options.input.enableWebCodecs && canUseHardware,
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex),
          preferWebCodecs: !isHdr(stream.codecpar) && !hasAlphaChannel(stream.codecpar) && !!task.options.input.enableWebCodecs
        })

      ret = await this.VideoDecoderThread.open(taskId, stream.codecpar)

      if (ret < 0) {
        logger.error(`cannot open video ${dumpCodecName(stream.codecpar.codecType, stream.codecpar.codecId)} decoder`)
        freeCodecParameters(newStream.codecpar)
        return ret
      }

      let scalerResource = await this.getResource('scaler')
      if (!scalerResource) {
        logger.fatal('scaler not found')
      }

      const vertices: AVFilterGraphDesVertex<GraphNodeType>[] = []
      const edges: { parent: number, child: number }[] = []
      let input: FilterGraphPortDes
      let output: FilterGraphPortDes

      let rangeNodeId: number

      const scaleNode = createGraphDesVertex('scaler', {
        resource: scalerResource,
        output: {
          width: newStream.codecpar.width,
          height: newStream.codecpar.height,
          format: newStream.codecpar.format as AVPixelFormat
        }
      })

      vertices.push(scaleNode)
      input = {
        id: scaleNode.id,
        port: decoder2FilterChannel.port2
      }
      output = {
        id: scaleNode.id,
        port: filter2EncoderChannel.port1
      }

      if (task.options.start || task.options.duration) {
        const start = avRescaleQ(static_cast<int64>(task.options.start || 0), AV_MILLI_TIME_BASE_Q, AV_TIME_BASE_Q)
        const rangeNode = createGraphDesVertex('range', {
          start: start,
          end: task.options.duration
            ? (avRescaleQ(static_cast<int64>(task.options.duration), AV_MILLI_TIME_BASE_Q, AV_TIME_BASE_Q) + start)
            : -1n
        })
        vertices.push(rangeNode)
        input = {
          id: rangeNode.id,
          port: decoder2FilterChannel.port2
        }
        edges.push({
          parent: rangeNode.id,
          child: scaleNode.id
        })
        rangeNodeId = rangeNode.id
      }

      if (avQ2D(stream.codecpar.framerate) > avQ2D(newStream.codecpar.framerate)) {
        const framerateNode = createGraphDesVertex('framerate', {
          framerate: {
            num: newStream.codecpar.framerate.num,
            den: newStream.codecpar.framerate.den
          }
        })
        vertices.push(framerateNode)

        edges.length = 0
        if (rangeNodeId) {
          edges.push({
            parent: rangeNodeId,
            child: framerateNode.id
          })
          edges.push({
            parent: framerateNode.id,
            child: scaleNode.id
          })
        }
        else {
          input = {
            id: framerateNode.id,
            port: decoder2FilterChannel.port2
          }
          edges.push({
            parent: framerateNode.id,
            child: scaleNode.id
          })
        }
      }

      await this.VideoFilterThread.registerTask
        .transfer(decoder2FilterChannel.port2, filter2EncoderChannel.port1)
        .invoke({
          taskId: taskId,
          graph: {
            vertices,
            edges
          },
          inputPorts: [input],
          outputPorts: [output],
          stats: addressof(task.stats),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex),
        })

      let encoderResource = await this.getResource('encoder', newStream.codecpar.codecId, newStream.codecpar.codecType)
      if (!encoderResource) {
        if (support.videoEncoder) {
          const isSupport = await VideoEncoder.isConfigSupported({
            codec: getVideoCodec(newStream.codecpar),
            width: newStream.codecpar.width,
            height: newStream.codecpar.height
          })
          if (!isSupport.supported) {
            logger.error(`VideoEncoder ${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} codecId ${newStream.codecpar.codecId} not support`)
            freeCodecParameters(newStream.codecpar)
            return errorType.OPERATE_NOT_SUPPORT
          }
        }
        else {
          logger.error(`${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} encoder codecId ${newStream.codecpar.codecId} not support`)
          freeCodecParameters(newStream.codecpar)
          return errorType.OPERATE_NOT_SUPPORT
        }
      }

      const wasmEncoderOptions: Data = {}
      const resourceExtraData: Data = {}

      // x265 需要提前创建线程
      if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        resourceExtraData.enableThreadPool = true
        resourceExtraData.enableThreadCountRate = 2
      }
      // libvpx 需要提前创建线程
      else if (newStream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
        resourceExtraData.enableThreadPool = true
      }

      if (task.options?.output?.video?.encoderOptions) {
        object.each(task.options.output.video.encoderOptions, (value, key) => {
          wasmEncoderOptions[key] = value
        })
      }

      // 注册一个视频编码任务
      await this.VideoEncoderThread.registerTask
        .transfer(filter2EncoderChannel.port2, encoder2MuxerChannel.port1)
        .invoke({
          taskId: taskId,
          resource: encoderResource,
          resourceExtraData,
          leftPort: filter2EncoderChannel.port2,
          rightPort: encoder2MuxerChannel.port1,
          stats: addressof(task.stats),
          enableHardware: !!videoConfig.enableHardware && !!videoConfig.enableWebCodecs,
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          avframeList: addressof(this.GlobalData.avframeList),
          avframeListMutex: addressof(this.GlobalData.avframeListMutex),
          gop: static_cast<int32>(avQ2D(newStream.codecpar.framerate) * (videoConfig.keyFrameInterval ?? 5000) / 1000),
          preferWebCodecs: !isHdr(newStream.codecpar) && !hasAlphaChannel(newStream.codecpar) && !!videoConfig.enableWebCodecs
        })

      ret = await this.VideoEncoderThread.open(taskId, newStream.codecpar, { num: newStream.timeBase.num, den: newStream.timeBase.den }, wasmEncoderOptions)

      if (ret < 0) {
        logger.error(`cannot open video ${dumpCodecName(newStream.codecpar.codecType, newStream.codecpar.codecId)} encoder`)
        freeCodecParameters(newStream.codecpar)
        return ret
      }

      await this.MuxThread.addStream.transfer(encoder2MuxerChannel.port2)
        .invoke(task.taskId, newStream, encoder2MuxerChannel.port2)

      task.streams.push({
        taskId,
        input: stream,
        output: newStream,
        demuxer2DecoderChannel,
        decoder2FilterChannel,
        filter2EncoderChannel,
        encoder2MuxerChannel
      })

      return 0
    }
  }

  private async handleCopyStream(stream: AVStreamInterface, task: SelfTask): Promise<number> {
    const demuxer2MuxerChannel = createMessageChannel()
    await this.DemuxerThread.connectStreamTask
      .transfer(demuxer2MuxerChannel.port1)
      .invoke(task.subTaskId || task.taskId, stream.index, demuxer2MuxerChannel.port1)

    await this.MuxThread.addStream
      .transfer(demuxer2MuxerChannel.port2)
      .invoke(task.taskId, stream, demuxer2MuxerChannel.port2)

    task.streams.push({
      input: stream,
      demuxer2MuxerChannel
    })

    return 0
  }

  private async clearTask(task: SelfTask) {
    this.MuxThread.unregisterTask(task.taskId)
    for (let i = 0; i < task.streams.length; i++) {
      if (task.streams[i].taskId) {
        if (task.streams[i].input.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          await this.AudioEncoderThread.unregisterTask(task.streams[i].taskId)
          await this.AudioFilterThread.unregisterTask(task.streams[i].taskId)
          await this.AudioDecoderThread.unregisterTask(task.streams[i].taskId)
        }
        else if (task.streams[i].input.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          await this.VideoEncoderThread.unregisterTask(task.streams[i].taskId)
          await this.VideoFilterThread.unregisterTask(task.streams[i].taskId)
          await this.VideoDecoderThread.unregisterTask(task.streams[i].taskId)
        }
      }
      if (task.streams[i].output) {
        freeCodecParameters(task.streams[i].output.codecpar)
      }
    }

    this.DemuxerThread.unregisterTask(task.taskId)
    if (task.subTaskId) {
      this.DemuxerThread.unregisterTask(task.subTaskId)
    }
    this.IOThread.unregisterTask(task.taskId)

    if (task.inputIPCPort) {
      task.inputIPCPort.destroy()
    }
    if (task.outputIPCPort) {
      task.outputIPCPort.destroy()
    }
    if (task.safeFileIO) {
      task.safeFileIO.destroy()
    }
    if (task.stats) {
      unmake(task.stats)
    }

    this.tasks.delete(task.taskId)

    if (!this.tasks.size) {
      this.reportTimer.stop()
    }
  }

  public async addTask(taskOptions: TaskOptions) {
    if (taskOptions.output.audio?.disable && taskOptions.output.video?.disable) {
      logger.fatal('audio and video are all disable')
    }

    const taskId = generateUUID()
    const stats = make<Stats>()
    const task: SelfTask = {
      taskId,
      startTime: 0,
      options: taskOptions,
      ioloader2DemuxerChannel: null,
      muxer2OutputChannel: null,
      stats,
      format: AVFormat.UNKNOWN,
      streams: [],
      formatContext: null,
      controller: new Controller(this)
    }
    try {

      let ret = 0

      await this.setTaskInput(task)
      await this.setTaskOutput(task)

      const formatContext = task.formatContext = await this.analyzeInputStreams(task)

      for (let i = 0; i < formatContext.streams.length; i++) {
        const mediaType = formatContext.streams[i].codecpar.codecType
        if (mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          ret = await this.handleAudioStream(formatContext.streams[i], task)
        }
        else if (mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          ret = await this.handleVideoStream(formatContext.streams[i], task)
        }
        else {
          ret = await this.handleCopyStream(formatContext.streams[i], task)
        }

        if (ret < 0) {
          logger.fatal(`config transcode error, ret: ${ret}`)
        }
      }

      const oformatContext: AVFormatContextInterface = {
        streams: [],
        format: task.format,
        metadata: {},
        chapters: []
      }

      let mappingDump = ''
      task.streams.forEach((stream) => {
        if (stream.output) {
          oformatContext.streams.push(stream.output)
          mappingDump += `  Stream #0:${stream.input.index} -> #0:${stream.output.index} (${
            dumpCodecName(stream.input.codecpar.codecType, stream.input.codecpar.codecId)
          } -> ${dumpCodecName(stream.output.codecpar.codecType, stream.output.codecpar.codecId)})\n`
        }
        else {
          oformatContext.streams.push(stream.input)
          mappingDump += `  Stream #0:${stream.input.index} -> #0:${stream.input.index} (${
            dumpCodecName(stream.input.codecpar.codecType, stream.input.codecpar.codecId)} -> copy)\n`
        }
      })
      logger.info(`\nAVTranscoder version ${defined(VERSION)} Copyright (c) 2024-present the libmedia developers\n`
        + dump([formatContext], [{
          from: is.string(task.options.input.file) ? task.options.input.file : (task.options.input.file instanceof File ? task.options.input.file.name : 'ioReader'),
          tag: 'Input'
        }])
        + mappingDump
        + '\n'
        + dump([oformatContext], [{
          from: task.options.output.file instanceof FileSystemFileHandle ? task.options.output.file.name : 'IOWriter',
          tag: 'Output'
        }]))

      this.tasks.set(taskId, task)
      return taskId
    }
    catch (error) {
      await this.clearTask(task)
      throw error
    }
  }

  public async startTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.options.start) {
        await this.DemuxerThread.seek(task.taskId, static_cast<int64>(task.options.start), AVSeekFlags.TIMESTAMP)
      }
      let ret = 0
      await this.DemuxerThread.startDemux(taskId, false, 10)
      ret = await this.MuxThread.open(taskId)

      if (ret < 0) {
        await this.clearTask(task)
        logger.fatal(`start transcode error, ret ${ret}`)
      }

      const streams = task.streams

      for (let i = 0; i < streams.length; i++) {
        if (!streams[i].output) {
          continue
        }

        let buffer: Uint8Array
        let updated = false
        if (streams[i].output.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          buffer = await this.AudioEncoderThread.getExtraData(streams[i].taskId)
        }
        else if (streams[i].output.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          buffer = await this.VideoEncoderThread.getExtraData(streams[i].taskId)
          const colorSpace = await this.VideoEncoderThread.getColorSpace(streams[i].taskId)
          if (colorSpace) {
            streams[i].output.codecpar.colorSpace = colorSpace.colorSpace
            streams[i].output.codecpar.colorPrimaries = colorSpace.colorPrimaries
            streams[i].output.codecpar.colorTrc = colorSpace.colorTrc
            updated = true
          }
        }
        if (!buffer) {
          const codecId = streams[i].output.codecpar.codecId
          if (codecId === AVCodecID.AV_CODEC_ID_AAC) {
            buffer = aac.avCodecParameters2Extradata(accessof(streams[i].output.codecpar))
          }
          else if (codecId === AVCodecID.AV_CODEC_ID_OPUS) {
            buffer = opus.avCodecParameters2Extradata(accessof(streams[i].output.codecpar))
          }
        }
        if (buffer) {
          const extradata: pointer<uint8> = avMalloc(buffer.length)
          memcpyFromUint8Array(extradata, buffer.length, buffer)
          streams[i].output.codecpar.extradata = extradata
          streams[i].output.codecpar.extradataSize = buffer.length
          updated = true
        }
        if (updated) {
          await this.MuxThread.updateAVCodecParameters(task.taskId, streams[i].output.index, streams[i].output.codecpar)
        }
      }

      ret = await this.MuxThread.start(taskId)

      if (ret < 0) {
        await this.clearTask(task)
        logger.fatal(`start transcode error, ret ${ret}`)
      }

      task.startTime = getTimestamp()
      if (!this.reportTimer.isStarted()) {
        this.reportTimer.start()
      }
    }
    else {
      logger.fatal(`task ${taskId} not found`)
    }
  }

  public async pauseTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      await this.MuxThread.pause(taskId)
    }
    else {
      logger.fatal(`task ${taskId} not found`)
    }
  }

  public async unpauseTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      await this.MuxThread.unpause(taskId)
    }
    else {
      logger.fatal(`task ${taskId} not found`)
    }
  }

  public async cancelTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      await this.MuxThread.unpause(taskId)
      await this.clearTask(task)
    }
    else {
      logger.fatal(`task ${taskId} not found`)
    }
  }

  public async destroy() {
    if (this.MuxThread) {
      await this.MuxThread.clear()
      closeThread(this.MuxThread)
    }
    if (this.AudioEncoderThread) {
      await this.AudioEncoderThread.clear()
      closeThread(this.AudioEncoderThread)
    }
    if (this.AudioFilterThread) {
      await this.AudioFilterThread.clear()
      closeThread(this.AudioFilterThread)
    }
    if (this.AudioDecoderThread) {
      await this.AudioDecoderThread.clear()
      closeThread(this.AudioDecoderThread)
    }
    if (this.VideoEncoderThread) {
      await this.VideoEncoderThread.clear()
      closeThread(this.VideoEncoderThread)
    }
    if (this.VideoFilterThread) {
      await this.VideoFilterThread.clear()
      closeThread(this.VideoFilterThread)
    }
    if (this.VideoDecoderThread) {
      await this.VideoDecoderThread.clear()
      closeThread(this.VideoDecoderThread)
    }
    if (this.DemuxerThread) {
      await this.DemuxerThread.clear()
      closeThread(this.DemuxerThread)
    }
    if (this.IOThread) {
      await this.IOThread.clear()
      closeThread(this.IOThread)
    }

    this.VideoEncoderThread = null
    this.VideoFilterThread = null
    this.VideoDecoderThread = null
    this.AudioEncoderThread = null
    this.AudioFilterThread = null
    this.AudioDecoderThread = null
    this.DemuxerThread = null
    this.IOThread = null
    this.MuxThread = null

    if (this.GlobalData) {
      this.GlobalData.avframeList.clear((avframe) => {
        unrefAVFrame(avframe)
      })
      this.GlobalData.avpacketList.clear((avpacket) => {
        unrefAVPacket(avpacket)
      })

      mutex.destroy(addressof(this.GlobalData.avpacketListMutex))
      mutex.destroy(addressof(this.GlobalData.avframeListMutex))

      unmake(this.GlobalData)
      this.GlobalData = null
    }

    logger.info('AVTranscoder pipelines stopped')

  }

  public setLogLevel(level: number) {
    this.level = level
    logger.setLevel(level)

    if (this.IOThread) {
      this.IOThread.setLogLevel(level)
    }
    if (this.DemuxerThread) {
      this.DemuxerThread.setLogLevel(level)
    }
    if (this.AudioDecoderThread) {
      this.AudioDecoderThread.setLogLevel(level)
    }
    if (this.AudioFilterThread) {
      this.AudioFilterThread.setLogLevel(level)
    }
    if (this.AudioEncoderThread) {
      this.AudioEncoderThread.setLogLevel(level)
    }
    if (this.VideoDecoderThread) {
      this.VideoDecoderThread.setLogLevel(level)
    }
    if (this.VideoFilterThread) {
      this.VideoFilterThread.setLogLevel(level)
    }
    if (this.VideoEncoderThread) {
      this.VideoEncoderThread.setLogLevel(level)
    }
    if (this.MuxThread) {
      this.MuxThread.setLogLevel(level)
    }

    logger.info(`set log level: ${level}`)
  }
  /**
   * @hidden
   */
  public async onGetDecoderResource(mediaType: AVMediaType, codecId: AVCodecID): Promise<WebAssemblyResource | ArrayBuffer> {
    return this.getResource('decoder', codecId, mediaType)
  }
}
