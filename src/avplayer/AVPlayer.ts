/*
 * libmedia AVPlayer
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
import IOPipeline, { IOType } from 'avpipeline/IOPipeline'
import DemuxPipeline, { AVStreamInterface } from 'avpipeline/DemuxPipeline'
import VideoDecodePipeline from 'avpipeline/VideoDecodePipeline'
import AudioDecodePipeline from 'avpipeline/AudioDecodePipeline'
import { Thread, closeThread, createThreadFromClass } from 'cheap/thread/thread'
import Emitter from 'common/event/Emitter'
import generateUUID from 'common/function/generateUUID'
import * as is from 'common/util/is'
import * as object from 'common/util/object'
import { AVPacketRef } from 'avutil/struct/avpacket'
import List from 'cheap/std/collection/List'
import { AVFrameRef } from 'avutil/struct/avframe'
import { Mutex } from 'cheap/thread/mutex'
import compile, { WebAssemblyResource } from 'cheap/webassembly/compiler'
import { unrefAVFrame } from 'avutil/util/avframe'
import { unrefAVPacket } from 'avutil/util/avpacket'
import AudioRenderPipeline from 'avpipeline/AudioRenderPipeline'
import VideoRenderPipeline from 'avpipeline/VideoRenderPipeline'
import { AVFormat, AVSeekFlags } from 'avformat/avformat'
import * as urlUtils from 'common/util/url'
import * as cheapConfig from 'cheap/config'
import { AVSampleFormat } from 'avutil/audiosamplefmt'
import registerProcessor from 'avrender/pcm/audioWorklet/base/registerProcessor'
import AudioSourceWorkletNode from 'avrender/pcm/AudioSourceWorkletNode'
import { Memory } from 'cheap/heap'
import { RenderMode } from 'avrender/image/ImageRender'
import Controller, { ControllerObserver } from './Controller'
import * as eventType from './eventType'
import supportOffscreenCanvas from './function/supportOffscreenCanvas'
import * as logger from 'common/util/logger'
import support from 'common/util/support'
import AudioSourceBufferNode from 'avrender/pcm/AudioSourceBufferNode'
import restrain from 'common/function/restrain'
import browser from 'common/util/browser'
import { avQ2D, avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import Stats from 'avpipeline/struct/stats'
import { memset, mapUint8Array } from 'cheap/std/memory'
import createMessageChannel from './function/createMessageChannel'
import getVideoCodec from 'avcodec/function/getVideoCodec'
import getVideoMimeType from 'avrender/track/function/getVideoMimeType'
import getAudioMimeType from 'avrender/track/function/getAudioMimeType'
import MSEPipeline from './mse/MSEPipeline'
import { getHardwarePreference } from 'avcodec/function/getHardwarePreference'
import Sleep from 'common/timer/Sleep'
import StatsController from './StatsController'
import * as mutex from 'cheap/thread/mutex'
import * as bigint from 'common/util/bigint'
import getMediaSource from './function/getMediaSource'
import JitterBufferController from './JitterBufferController'
import { JitterBuffer } from 'avpipeline/struct/jitter'
import getAudioCodec from 'avcodec/function/getAudioCodec'

const ObjectFitMap = {
  [RenderMode.FILL]: 'cover',
  [RenderMode.FIT]: 'contain'
}

export interface AVPlayerOptions {
  container: HTMLDivElement
  getWasm: (type: 'decoder' | 'resampler' | 'stretchpitcher', codec?: AVCodecID) => string | ArrayBuffer
  isLive?: boolean
  checkUseMES?: (streams: AVStreamInterface[]) => boolean
  enableHardware?: boolean
  enableWebGPU?: boolean
  loop?: boolean
  jitterBufferMax?: float
  jitterBufferMin?: float
  lowLatency?: boolean
}

const defaultAVPlayerOptions: Partial<AVPlayerOptions> = {
  enableHardware: true,
  enableWebGPU: true,
  loop: false,
  jitterBufferMax: 10,
  jitterBufferMin: 4,
  lowLatency: false
}

@struct
class AVPlayerGlobalData {
  avpacketList: List<pointer<AVPacketRef>>
  avframeList: List<pointer<AVFrameRef>>
  avpacketListMutex: Mutex
  avframeListMutex: Mutex
  jitterBuffer: JitterBuffer
}

const Ext2Format: Record<string, AVFormat> = {
  'flv': AVFormat.FLV,
  'mp4': AVFormat.MOV,
  'mov': AVFormat.MOV,
  'ts': AVFormat.MPEGTS,
  'ivf': AVFormat.IVF,
  'opus': AVFormat.OGGS,
  'ogg': AVFormat.OGGS,
  'm3u8': AVFormat.MPEGTS,
  'm3u': AVFormat.MPEGTS,
  'mpd': AVFormat.MOV,
  'mp3': AVFormat.MP3,
  'mkv': AVFormat.MATROSKA,
  'mka': AVFormat.MATROSKA,
  'webm': AVFormat.WEBM,
  'aac': AVFormat.AAC,
  'flac': AVFormat.FLAC
}

const Ext2IOLoader: Record<string, IOType> = {
  'm3u8': IOType.HLS,
  'm3u': IOType.HLS,
  'mpd': IOType.DASH
}

export const enum AVPlayerStatus {
  STOPPED,
  LOADING,
  LOADED,
  PLAYING,
  PLAYED,
  PAUSED,
  SEEKING,
  DESTROYING,
  DESTROYED
}

export default class AVPlayer extends Emitter implements ControllerObserver {
  static level: number = logger.INFO

  static DemuxThreadReady: Promise<void>
  static AudioThreadReady: Promise<void>
  static VideoThreadReady: Promise<void>
  static MSEThreadReady: Promise<void>

  // 下面的线程所有 AVPlayer 实例共享
  static IOThread: Thread<IOPipeline>
  static DemuxerThread: Thread<DemuxPipeline>
  static AudioDecoderThread: Thread<AudioDecodePipeline>
  static AudioRenderThread: Thread<AudioRenderPipeline>
  static VideoRenderThread: Thread<VideoRenderPipeline>
  static MSEThread: Thread<MSEPipeline>

  static audioContext: AudioContext

  // 解码线程每个 player 独占一个
  // TODO 若需要同时播放大量视频，可以考虑实现一个 VideoDecoderThreadPool
  // 来根据各个视频规格做线程解码任务调度，降低系统线程切换开销，这里就不实现了
  private VideoDecoderThread: Thread<VideoDecodePipeline>

  // AVPlayer 各个线程间共享的数据
  private GlobalData: AVPlayerGlobalData

  private taskId: string
  private subTaskId: string
  private ext: string
  private source: string | File
  private options: AVPlayerOptions

  private ioloader2DemuxerChannel: MessageChannel
  private demuxer2VideoDecoderChannel: MessageChannel
  private demuxer2AudioDecoderChannel: MessageChannel
  private videoDecoder2VideoRenderChannel: MessageChannel
  private audioDecoder2AudioRenderChannel: MessageChannel
  private audioRender2AudioWorkletChannel: MessageChannel

  private audioSourceNode: AudioSourceWorkletNode | AudioSourceBufferNode
  private gainNode: GainNode

  private streams: AVStreamInterface[]
  private canvas: HTMLCanvasElement
  private updateCanvas: HTMLCanvasElement
  private video: HTMLVideoElement
  private audio: HTMLAudioElement
  private controller: Controller

  private volume: double
  private playRate: double
  private renderMode: RenderMode
  private renderRotate: double
  private flipHorizontal: boolean
  private flipVertical: boolean

  private useMSE: boolean
  private audioEnded: boolean
  private videoEnded: boolean
  private status: AVPlayerStatus
  private lastStatus: AVPlayerStatus

  private stats: Stats
  private statsController: StatsController
  private jitterBufferController: JitterBufferController

  constructor(options: AVPlayerOptions) {
    super(true)
    this.options = object.extend({}, defaultAVPlayerOptions, options)
    this.taskId = generateUUID()
    this.status = AVPlayerStatus.STOPPED

    this.volume = 1
    this.playRate = 1
    this.renderMode = RenderMode.FIT
    this.renderRotate = 0
    this.flipHorizontal = false
    this.flipVertical = false

    this.stats = make(Stats)
    this.statsController = new StatsController(addressof(this.stats))

    this.GlobalData = make(AVPlayerGlobalData)
    mutex.init(addressof(this.GlobalData.avpacketListMutex))
    mutex.init(addressof(this.GlobalData.avframeListMutex))

    logger.info(`create player, taskId: ${this.taskId}`)
  }

  private async checkUseMSE() {
    if (defined(ENABLE_MSE)) {
      if (!support.mse) {
        return false
      }

      // 不支持 wasm
      if (!support.wasmBaseSupported) {
        return true
      }

      const videoStream = this.streams.find((stream) => {
        return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
      })
      const audioStream = this.streams.find((stream) => {
        return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
      })

      // 检查音视频在 MediaSource 里面是否支持，不支持的只能使用 wasm 软解了
      if (videoStream && !getMediaSource().isTypeSupported(getVideoMimeType(videoStream.codecpar))) {
        logger.warn(`can not support mse for codec: ${getVideoMimeType(videoStream.codecpar)}, taskId: ${this.taskId}`)
        return false
      }
      if (audioStream && !getMediaSource().isTypeSupported(getAudioMimeType(audioStream.codecpar))) {
        logger.warn(`can not support mse for codec: ${getAudioMimeType(audioStream.codecpar)}, taskId: ${this.taskId}`)
        return false
      }

      if (this.options.checkUseMES) {
        return this.options.checkUseMES(this.streams)
      }

      if (videoStream) {
        // 1080p 以上使用 mse
        if (videoStream.codecpar.width * videoStream.codecpar.height > 1920 * 1080) {
          // 不支持 webcodec
          if (!support.videoDecoder) {
            return true
          }

          let extradata = null
          if (videoStream.codecpar.extradata !== nullptr) {
            extradata = mapUint8Array(videoStream.codecpar.extradata, videoStream.codecpar.extradataSize)
          }
          // 检查视频格式是否支持硬解，不支持使用 mse
          const isWebcodecSupport = await VideoDecoder.isConfigSupported({
            codec: getVideoCodec(videoStream.codecpar),
            codedWidth: videoStream.codecpar.width,
            codedHeight: videoStream.codecpar.height,
            description: extradata,
            hardwareAcceleration: getHardwarePreference(true)
          })

          if (!isWebcodecSupport.supported) {
            return true
          }
        }
        else if (videoStream.codecpar.width * videoStream.codecpar.height === 1920 * 1080) {
          // safari 1080p@30fps 无法在 worker 中解码
          if (browser.safari && !browser.checkVersion(browser.version, '16.1', true) && avQ2D(videoStream.codecpar.framerate) > 30) {
            return true
          }
        }
      }
    }
    else {
      logger.warn('player built without enable mse')
    }
    return false
  }

  private createCanvas() {
    const canvas = document.createElement('canvas')
    canvas.className = 'avplayer-canvas'
    canvas.width = this.options.container.offsetWidth * devicePixelRatio
    canvas.height = this.options.container.offsetHeight * devicePixelRatio
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
    `
    canvas.ondragstart = () => false
    return canvas
  }

  private createVideo() {
    if (this.video) {
      this.options.container.removeChild(this.video)
    }
    const video = document.createElement('video')
    video.autoplay = true
    video.className = 'avplayer-video'
    video.style.cssText = `
      width: 100%;
      height: 100%;
    `
    this.options.container.appendChild(video)
    this.video = video
  }

  private createAudio() {
    if (this.audio) {
      this.options.container.removeChild(this.audio)
    }
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.className = 'avplayer-audio'
    this.options.container.appendChild(audio)
    this.audio = audio
  }

  private handleTimeupdate(element: HTMLAudioElement | HTMLVideoElement) {
    let lastNotifyTime = 0
    element.ontimeupdate = () => {
      const time = element.currentTime
      if (Math.abs(time - lastNotifyTime) >= 1) {
        if (this.status === AVPlayerStatus.PLAYED) {
          this.fire(eventType.TIME, [static_cast<int64>(time * 1000)])
          AVPlayer.MSEThread.setCurrentTime(this.taskId, time)
        }
        lastNotifyTime = time
      }
    }
    element.onended = () => {
      this.audioEnded = true
      this.videoEnded = true
      this.handleEnded()
    }
    element.onwaiting = () => {
      if (this.audio === element) {
        this.stats.audioStutter++
      }
      else {
        this.stats.audioStutter++
        this.stats.videoStutter++
      }
    }
  }

  private async handleEnded() {
    if (this.audioEnded && this.videoEnded) {

      logger.info(`player ended, taskId: ${this.taskId}`)

      if (this.options.loop && !this.options.isLive) {

        logger.info(`loop play, taskId: ${this.taskId}`)

        if (defined(ENABLE_PROTOCOL_HLS) && (this.ext === 'm3u8' || this.ext === 'm3u')) {
          await AVPlayer.DemuxerThread.seek(this.taskId, 0n, AVSeekFlags.TIMESTAMP)
        }
        else if (defined(ENABLE_PROTOCOL_DASH) && this.ext === 'mpd') {
          await AVPlayer.DemuxerThread.seek(this.taskId, 0n, AVSeekFlags.TIMESTAMP)
          if (this.subTaskId) {
            await AVPlayer.DemuxerThread.seek(this.subTaskId, 0n, AVSeekFlags.TIMESTAMP)
          }
        }
        else {
          await AVPlayer.DemuxerThread.seek(this.taskId, 0n, AVSeekFlags.FRAME)
        }

        this.fire(eventType.TIME, [0n])

        if (defined(ENABLE_MSE) && this.useMSE) {
          if ((this.video || this.audio)?.src) {
            URL.revokeObjectURL((this.video || this.audio).src)
          }
          await AVPlayer.MSEThread.restart(this.taskId)
          const mediaSource = await AVPlayer.MSEThread.getMediaSource(this.taskId)
          if (mediaSource) {
            if (support.workerMSE && mediaSource instanceof MediaSourceHandle) {
              (this.video || this.audio).srcObject = mediaSource
            }
            else {
              (this.video || this.audio).src = URL.createObjectURL(mediaSource)
            }
            if (this.video) {
              this.video.currentTime = 0
              this.video.playbackRate = this.playRate
            }
            else if (this.audio) {
              this.audio.currentTime = 0
              this.audio.playbackRate = this.playRate
            }
            await Promise.all([
              this.video?.play(),
              this.audio?.play()
            ])
          }
        }
        else {
          if (this.audioDecoder2AudioRenderChannel) {
            await AVPlayer.AudioDecoderThread.resetTask(this.taskId)
            await AVPlayer.AudioRenderThread.restart(this.taskId)
          }

          if (this.audioSourceNode) {
            await this.audioSourceNode.request('restart')
            if (AVPlayer.audioContext.state === 'suspended') {
              await AVPlayer.AudioRenderThread.fakePlay(this.taskId)
            }
            this.audioEnded = false
          }

          if (this.videoDecoder2VideoRenderChannel) {
            await this.VideoDecoderThread.resetTask(this.taskId)
            await AVPlayer.VideoRenderThread.restart(this.taskId)
            this.videoEnded = false
          }
        }
      }
      else {

        if ((this.video || this.audio)?.src) {
          URL.revokeObjectURL((this.video || this.audio).src)
        }

        if (this.video) {
          this.options.container.removeChild(this.video)
          this.video = null
        }
        if (this.audio) {
          this.options.container.removeChild(this.audio)
          this.audio = null
        }
        if (this.canvas) {
          this.options.container.removeChild(this.canvas)
          this.canvas = null
        }

        await this.stop()

        this.fire(eventType.ENDED)
      }
    }
  }

  public async load(source: string | File) {

    logger.info(`call load, taskId: ${this.taskId}`)

    this.status = AVPlayerStatus.LOADING
    this.fire(eventType.LOADING)

    this.controller = new Controller(this)
    this.ioloader2DemuxerChannel = createMessageChannel()

    memset(addressof(this.stats), 0, sizeof(Stats))

    await AVPlayer.startDemuxPipeline()

    let ext = ''
    let ret = 0
    if (is.string(source)) {
      ext = urlUtils.parse(source).file.split('.').pop()
      // 注册一个 url io 任务
      ret = await AVPlayer.IOThread.registerTask
        .transfer(this.ioloader2DemuxerChannel.port1)
        .invoke({
          type: Ext2IOLoader[ext] ?? IOType.Fetch,
          info: {
            url: source
          },
          range: {
            from: -1,
            to: -1
          },
          taskId: this.taskId,
          options: {
            isLive: this.options.isLive
          },
          rightPort: this.ioloader2DemuxerChannel.port1,
          stats: addressof(this.stats)
        })
    }
    else {
      this.options.isLive = false
      ext = source.name.split('.').pop()
      // 注册一个文件 io 任务
      ret = await AVPlayer.IOThread.registerTask
        .transfer(this.ioloader2DemuxerChannel.port1)
        .invoke({
          type: IOType.File,
          info: {
            file: source
          },
          range: {
            from: -1,
            to: -1
          },
          taskId: this.taskId,
          options: {
            isLive: false
          },
          rightPort: this.ioloader2DemuxerChannel.port1,
          stats: addressof(this.stats)
        })
    }

    if (ret < 0) {
      logger.fatal(`register io task failed, ret: ${ret}, taskId: ${this.taskId}`)
    }

    if (defined(ENABLE_PROTOCOL_DASH) && ext === 'mpd') {
      await AVPlayer.IOThread.open(this.taskId)
      const hasAudio = await AVPlayer.IOThread.hasAudio(this.taskId)
      const hasVideo = await AVPlayer.IOThread.hasVideo(this.taskId)
      if (hasAudio && hasVideo) {
        // dash 因为音视频各自独立，因此这里注册两个解封装任务
        this.subTaskId = generateUUID()
        await AVPlayer.DemuxerThread.registerTask
          .transfer(this.ioloader2DemuxerChannel.port2)
          .invoke({
            taskId: this.taskId,
            leftPort: this.ioloader2DemuxerChannel.port2,
            format: Ext2Format[ext],
            stats: addressof(this.stats),
            isLive: this.options.isLive,
            ioloaderOptions: {
              type: 'audio'
            },
            avpacketList: addressof(this.GlobalData.avpacketList),
            avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          })
        await AVPlayer.DemuxerThread.registerTask({
          taskId: this.subTaskId,
          mainTaskId: this.taskId,
          format: Ext2Format[ext],
          stats: addressof(this.stats),
          isLive: this.options.isLive,
          ioloaderOptions: {
            type: 'video'
          },
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
        })
      }
      else {
        // dash 只有一个媒体类型
        await AVPlayer.DemuxerThread.registerTask
          .transfer(this.ioloader2DemuxerChannel.port2)
          .invoke({
            taskId: this.taskId,
            leftPort: this.ioloader2DemuxerChannel.port2,
            format: Ext2Format[ext],
            stats: addressof(this.stats),
            isLive: this.options.isLive,
            ioloaderOptions: {
              type: hasAudio ? 'audio' : 'video'
            },
            avpacketList: addressof(this.GlobalData.avpacketList),
            avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          })
      }
    }
    else {
      await AVPlayer.DemuxerThread.registerTask
        .transfer(this.ioloader2DemuxerChannel.port2)
        .invoke({
          taskId: this.taskId,
          leftPort: this.ioloader2DemuxerChannel.port2,
          format: Ext2Format[ext],
          stats: addressof(this.stats),
          isLive: this.options.isLive,
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
        })
    }

    ret = await AVPlayer.DemuxerThread.openStream(this.taskId)
    if (ret < 0) {
      logger.fatal(`open stream failed, ret: ${ret}, taskId: ${this.taskId}`)
    }
    let streams = await AVPlayer.DemuxerThread.analyzeStreams(this.taskId)
    if (!streams.length) {
      logger.fatal(`analyze stream failed, ret: ${streams}`)
    }

    if (defined(ENABLE_PROTOCOL_DASH) && this.subTaskId) {
      ret = await AVPlayer.DemuxerThread.openStream(this.subTaskId)
      if (ret < 0) {
        logger.fatal(`open stream failed, ret: ${ret}, taskId: ${this.taskId}`)
      }
      const subStreams = await AVPlayer.DemuxerThread.analyzeStreams(this.subTaskId)
      if (!subStreams.length) {
        logger.fatal(`analyze stream failed, ret: ${streams}`)
      }
      streams = streams.concat(subStreams)
    }

    this.streams = streams
    this.ext = ext
    this.source = source

    let info = `
      taskId: ${this.taskId}
      input: ${is.string(source) ? source : source.name}
      stream:
    `
    this.streams.forEach((stream) => {
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        this.stats.audiocodec = getAudioCodec(stream.codecpar)
      }
      else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        this.stats.videocodec = getVideoCodec(stream.codecpar)
      }
      info += `
        #${stream.index}(und): ${stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO ? 'Audio' : 'Video'}: ${stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO ? this.stats.audiocodec : this.stats.videocodec}
      `
    })

    logger.info(info)

    if (defined(ENABLE_PROTOCOL_DASH) || defined(ENABLE_PROTOCOL_HLS)) {
      // m3u8 和 dash 的 duration 来自于协议本身
      if (ext === 'm3u8' || ext === 'm3u' || ext === 'mpd') {
        const duration: double = (await AVPlayer.IOThread.getDuration(this.taskId)) * 1000
        if (duration > 0) {
          for (let i = 0; i < this.streams.length; i++) {
            this.streams[i].duration = avRescaleQ(
              static_cast<int64>(duration),
              AV_MILLI_TIME_BASE_Q,
              accessof(this.streams[i].timeBase)
            )
          }
        }
      }
    }

    if (this.options.isLive && this.options.lowLatency) {
      const min = Math.max(await AVPlayer.IOThread.getMinBuffer(this.taskId), this.options.jitterBufferMin)
      let max = this.options.jitterBufferMax
      if (max <= min) {
        max = min + ((ext === 'm3u8' || ext === 'm3u' || ext === 'mpd') ? min : 1)
      }
      this.jitterBufferController = new JitterBufferController({
        stats: addressof(this.stats),
        jitterBuffer: addressof(this.GlobalData.jitterBuffer),
        lowLatencyStart: !(ext === 'm3u8' || ext === 'm3u' || ext === 'mpd'),
        useMse: this.useMSE,
        max,
        min,
        observer: {
          onCroppingBuffer: (max) => {
            logger.debug(`cropping buffer by jitter buffer, max: ${max}, taskId: ${this.taskId}`)
            AVPlayer.DemuxerThread?.croppingAVPacketQueue(this.taskId, static_cast<int64>(max))
          },
          onSetPlayRate: (rate) => {
            logger.debug(`set play rate by jitter buffer, rate: ${rate}, taskId: ${this.taskId}`)
            if (defined(ENABLE_MSE) && this.useMSE) {
              AVPlayer.MSEThread.setPlayRate(this.taskId, rate)
              if (this.video) {
                this.video.playbackRate = rate
              }
              else if (this.audio) {
                this.audio.playbackRate = rate
              }
            }
            else {
              if (this.audioDecoder2AudioRenderChannel) {
                AVPlayer.AudioRenderThread.setPlayTempo(this.taskId, rate)
              }
              if (this.videoDecoder2VideoRenderChannel) {
                AVPlayer.VideoRenderThread.setPlayRate(this.taskId, rate)
              }
            }
          }
        }
      })
    }

    this.status = AVPlayerStatus.LOADED

    this.fire(eventType.LOADED)
  }

  public async play(options: {
    audio?: boolean
    video?: boolean
  } = {
    audio: true,
    video: true
  }) {

    logger.info(`call play, options: ${JSON.stringify(options)}, status: ${this.status} taskId: ${this.taskId}`)

    if (this.status === AVPlayerStatus.PLAYED) {
      return
    }

    if (!options.audio && !options.video) {
      logger.warn(`video and audio must play one, ignore options, we will try to play video and audio, taskId: ${this.taskId}`)
      options.audio = true
      options.video = true
    }

    const promises = []

    if (this.status === AVPlayerStatus.PAUSED) {
      if (defined(ENABLE_MSE) && this.useMSE) {
        promises.push(AVPlayer.MSEThread.unpause(this.taskId))
        if (this.audio) {
          this.audio.play()
        }
        else if (this.video) {
          this.video.play()
        }
      }
      else {
        if (this.audioSourceNode) {
          promises.push(this.audioSourceNode.request('unpause'))
          if (AVPlayer.audioContext.state === 'suspended') {
            promises.push(AVPlayer.AudioRenderThread.unpause(this.taskId))
          }
        }
        if (this.videoDecoder2VideoRenderChannel) {
          promises.push(AVPlayer.VideoRenderThread.unpause(this.taskId))
        }
      }
      return Promise.all(promises).then(() => {
        this.status = AVPlayerStatus.PLAYED
        this.fire(eventType.PLAYED)
        if (this.jitterBufferController) {
          this.jitterBufferController.start()
        }
      })
    }

    this.status = AVPlayerStatus.PLAYING
    this.fire(eventType.PLAYING)

    this.useMSE = await this.checkUseMSE()

    this.audioEnded = true
    this.videoEnded = true

    if (defined(ENABLE_MSE) && this.useMSE) {
      await AVPlayer.startMSEPipeline()
      // 注册一个 mse 处理任务
      await AVPlayer.MSEThread.registerTask.transfer(this.controller.getMuxerRenderControlPort())
        .invoke({
          taskId: this.taskId,
          stats: addressof(this.stats),
          format: await AVPlayer.DemuxerThread.getFormat(this.taskId),
          controlPort: this.controller.getMuxerRenderControlPort(),
          isLive: this.options.isLive,
          avpacketList: addressof(this.GlobalData.avpacketList),
          avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
          enableJitterBuffer: !!this.jitterBufferController,
          jitterBuffer: addressof(this.GlobalData.jitterBuffer)
        })

      let hasVideo = false

      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i]
        if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO && options.video) {
          hasVideo = true
          this.videoEnded = false
          this.demuxer2VideoDecoderChannel = createMessageChannel()
          await AVPlayer.DemuxerThread.connectStreamTask
            .transfer(this.demuxer2VideoDecoderChannel.port1)
            .invoke(this.subTaskId || this.taskId, stream.index, this.demuxer2VideoDecoderChannel.port1)
          await AVPlayer.MSEThread.addStream.transfer(this.demuxer2VideoDecoderChannel.port2)
            .invoke(
              this.taskId,
              stream.index,
              stream.codecpar,
              stream.timeBase,
              stream.startTime,
              this.demuxer2VideoDecoderChannel.port2
            )
        }
        else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO && options.audio) {
          this.audioEnded = false
          this.demuxer2AudioDecoderChannel = createMessageChannel()
          await AVPlayer.DemuxerThread.connectStreamTask
            .transfer(this.demuxer2AudioDecoderChannel.port1)
            .invoke(this.taskId, stream.index, this.demuxer2AudioDecoderChannel.port1)
          await AVPlayer.MSEThread.addStream.transfer(this.demuxer2AudioDecoderChannel.port2)
            .invoke(
              this.taskId,
              stream.index,
              stream.codecpar,
              stream.timeBase,
              stream.startTime,
              this.demuxer2AudioDecoderChannel.port2
            )
        }
      }

      if (hasVideo) {
        this.createVideo()
      }
      else {
        this.createAudio()
      }

      const mediaSource = await AVPlayer.MSEThread.getMediaSource(this.taskId)

      if (mediaSource) {
        if (support.workerMSE && mediaSource instanceof MediaSourceHandle) {
          (this.video || this.audio).srcObject = mediaSource
        }
        else {
          (this.video || this.audio).src = URL.createObjectURL(mediaSource)
        }
        this.handleTimeupdate(this.video || this.audio)
      }
    }
    else {

      let audioStartTime: int64 = 0n
      let videoStartTime: int64 = 0n

      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i]
        if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO && options.video) {

          await this.createVideoDecoderThread()
          await AVPlayer.startVideoRenderPipeline()

          videoStartTime = avRescaleQ(stream.startTime, accessof(stream.timeBase), AV_MILLI_TIME_BASE_Q)

          this.demuxer2VideoDecoderChannel = createMessageChannel()
          this.videoDecoder2VideoRenderChannel = createMessageChannel()

          const wasmUrl = this.options.getWasm('decoder', stream.codecpar.codecId)
          let resource: WebAssemblyResource

          if (wasmUrl) {
            resource = await compile({
              source: wasmUrl
            })

            if (cheapConfig.USE_THREADS && defined(ENABLE_THREADS)) {
              resource.threadModule = await compile(
                {
                  // firefox 使用 arraybuffer 会卡主
                  source: browser.firefox ? wasmUrl : resource.buffer
                },
                {
                  child: true
                }
              )
            }

            delete resource.buffer
          }
          else {
            if (support.videoDecoder) {
              const isSupport = await VideoDecoder.isConfigSupported({
                codec: getVideoCodec(stream.codecpar)
              })
              if (!isSupport.supported) {
                logger.fatal(`codecId ${stream.codecpar.codecId} not support`)
              }
            }
            else {
              logger.fatal(`codecId ${stream.codecpar.codecId} not support`)
            }
          }

          // 注册一个视频解码任务
          await this.VideoDecoderThread.registerTask
            .transfer(this.demuxer2VideoDecoderChannel.port2, this.videoDecoder2VideoRenderChannel.port1)
            .invoke({
              taskId: this.taskId,
              resource,
              leftPort: this.demuxer2VideoDecoderChannel.port2,
              rightPort: this.videoDecoder2VideoRenderChannel.port1,
              stats: addressof(this.stats),
              enableHardware: this.options.enableHardware,
              avpacketList: addressof(this.GlobalData.avpacketList),
              avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
              avframeList: addressof(this.GlobalData.avframeList),
              avframeListMutex: addressof(this.GlobalData.avframeListMutex)
            })
          await this.VideoDecoderThread.open(this.taskId, stream.codecpar)
          await AVPlayer.DemuxerThread.connectStreamTask
            .transfer(this.demuxer2VideoDecoderChannel.port1)
            .invoke(this.subTaskId || this.taskId, stream.index, this.demuxer2VideoDecoderChannel.port1)
        }
        else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO && options.audio) {

          await AVPlayer.startAudioPipeline()

          if (AVPlayer.audioContext.state === 'suspended') {
            await Promise.race([
              AVPlayer.audioContext.resume(),
              new Sleep(0.1)
            ])
          }

          audioStartTime = avRescaleQ(stream.startTime, accessof(stream.timeBase), AV_MILLI_TIME_BASE_Q)

          this.demuxer2AudioDecoderChannel = createMessageChannel()
          this.audioDecoder2AudioRenderChannel = createMessageChannel()

          // 注册一个音频解码任务
          await AVPlayer.AudioDecoderThread.registerTask
            .transfer(this.demuxer2AudioDecoderChannel.port2, this.audioDecoder2AudioRenderChannel.port1)
            .invoke({
              taskId: this.taskId,
              resource: await compile({
                source: this.options.getWasm('decoder', stream.codecpar.codecId)
              }),
              leftPort: this.demuxer2AudioDecoderChannel.port2,
              rightPort: this.audioDecoder2AudioRenderChannel.port1,
              stats: addressof(this.stats),
              avpacketList: addressof(this.GlobalData.avpacketList),
              avpacketListMutex: addressof(this.GlobalData.avpacketListMutex),
              avframeList: addressof(this.GlobalData.avframeList),
              avframeListMutex: addressof(this.GlobalData.avframeListMutex)
            })
          await AVPlayer.AudioDecoderThread.open(this.taskId, stream.codecpar, stream.timeBase)
          await AVPlayer.DemuxerThread.connectStreamTask
            .transfer(this.demuxer2AudioDecoderChannel.port1)
            .invoke(this.taskId, stream.index, this.demuxer2AudioDecoderChannel.port1)
        }
      }

      if (this.videoDecoder2VideoRenderChannel) {
        this.canvas = this.createCanvas()
        this.options.container.appendChild(this.canvas)
        const canvas = (supportOffscreenCanvas() && cheapConfig.USE_THREADS && defined(ENABLE_THREADS))
          ? this.canvas.transferControlToOffscreen()
          : this.canvas
        const stream = this.streams.find((stream) => {
          return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
        })

        // 注册一个视频渲染任务
        await AVPlayer.VideoRenderThread.registerTask
          .transfer(
            this.videoDecoder2VideoRenderChannel.port2,
            this.controller.getVideoRenderControlPort(),
            canvas as OffscreenCanvas
          )
          .invoke({
            taskId: this.taskId,
            leftPort: this.videoDecoder2VideoRenderChannel.port2,
            controlPort: this.controller.getVideoRenderControlPort(),
            canvas,
            renderMode: this.renderMode,
            renderRotate: this.renderRotate,
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical,
            timeBase: {
              num: stream.timeBase.num,
              den: stream.timeBase.den,
            },
            viewportWidth: this.options.container.offsetWidth,
            viewportHeight: this.options.container.offsetHeight,
            devicePixelRatio: devicePixelRatio,
            stats: addressof(this.stats),
            enableWebGPU: this.options.enableWebGPU,
            startPTS: stream.startTime,
            avframeList: addressof(this.GlobalData.avframeList),
            avframeListMutex: addressof(this.GlobalData.avframeListMutex),
            enableJitterBuffer: !!this.jitterBufferController && !this.audioDecoder2AudioRenderChannel,
            jitterBuffer: addressof(this.GlobalData.jitterBuffer)
          })

        this.videoEnded = false
        await AVPlayer.VideoRenderThread.setPlayRate(this.taskId, this.playRate)
        promises.push(AVPlayer.VideoRenderThread.play(this.taskId))

      }
      if (this.audioDecoder2AudioRenderChannel) {

        const stream = this.streams.find((stream) => {
          return stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        })

        this.audioRender2AudioWorkletChannel = new MessageChannel()

        // 注册一个音频渲染任务
        await AVPlayer.AudioRenderThread.registerTask
          .transfer(
            this.audioDecoder2AudioRenderChannel.port2,
            this.audioRender2AudioWorkletChannel.port1,
            this.controller.getAudioRenderControlPort()
          )
          .invoke({
            taskId: this.taskId,
            leftPort: this.audioDecoder2AudioRenderChannel.port2,
            rightPort: this.audioRender2AudioWorkletChannel.port1,
            controlPort: this.controller.getAudioRenderControlPort(),
            playFormat: AVSampleFormat.AV_SAMPLE_FMT_FLTP,
            playSampleRate: AVPlayer.audioContext.sampleRate,
            playChannels: stream.codecpar.chLayout.nbChannels,
            resamplerResource: await compile({
              source: this.options.getWasm('resampler')
            }),
            stretchpitcherResource: await compile({
              source: this.options.getWasm('stretchpitcher')
            }),
            stats: addressof(this.stats),
            timeBase: {
              num: stream.timeBase.num,
              den: stream.timeBase.den,
            },
            startPTS: stream.startTime,
            avframeList: addressof(this.GlobalData.avframeList),
            avframeListMutex: addressof(this.GlobalData.avframeListMutex),
            enableJitterBuffer: !!this.jitterBufferController,
            jitterBuffer: addressof(this.GlobalData.jitterBuffer)
          })

        // 创建一个音频源节点
        if (support.audioWorklet) {
          this.audioSourceNode = new AudioSourceWorkletNode(
            AVPlayer.audioContext,
            {
              onEnded: () => {
                this.onAudioEnded()
              },
              onFirstRendered: () => {
                this.onFirstAudioRendered()
              },
              onStutter: () => {
                this.onStutter()
              }
            },
            {
              numberOfInputs: 1,
              numberOfOutputs: 1,
              outputChannelCount: [stream.codecpar.chLayout.nbChannels]
            }
          )
        }
        else {
          this.audioSourceNode = new AudioSourceBufferNode(
            AVPlayer.audioContext,
            {
              onEnded: () => {
                this.onAudioEnded()
              },
              onFirstRendered: () => {
                this.onFirstAudioRendered()
              },
              onStutter: () => {
                this.onStutter()
              }
            },
            {
              numberOfInputs: 1,
              numberOfOutputs: 1,
              outputChannelCount: [stream.codecpar.chLayout.nbChannels]
            }
          )
        }

        if (cheapConfig.USE_THREADS
          && defined(ENABLE_THREADS)
          && support.audioWorklet
          && (!browser.safari || browser.checkVersion(browser.version, '16.1', true))
        ) {
          await this.audioSourceNode.request('init', {
            memory: Memory
          })
        }

        await AVPlayer.AudioRenderThread.setPlayTempo(this.taskId, this.playRate)

        this.gainNode = AVPlayer.audioContext.createGain()
        this.gainNode.connect(AVPlayer.audioContext.destination)
        this.audioSourceNode.connect(this.gainNode)

        this.setVolume(this.volume)

        this.audioEnded = false

        promises.push(this.audioSourceNode.request('start', {
          port: this.audioRender2AudioWorkletChannel.port2,
          channels: stream.codecpar.chLayout.nbChannels
        }, [this.audioRender2AudioWorkletChannel.port2]))
      }
      if (this.audioDecoder2AudioRenderChannel) {
        this.controller.setTimeUpdateListenType(AVMediaType.AVMEDIA_TYPE_AUDIO)
      }
      else if (this.videoDecoder2VideoRenderChannel) {
        this.controller.setTimeUpdateListenType(AVMediaType.AVMEDIA_TYPE_VIDEO)
      }

      // 开始时间戳超过 10 秒不对齐就不再同步音视频了
      // 这种情况下可视为音频和视频本身就是独立的，各自播放
      if (this.videoDecoder2VideoRenderChannel
        && this.audioDecoder2AudioRenderChannel
        && bigint.abs(videoStartTime - audioStartTime) > 10000n
      ) {
        this.controller.setEnableAudioVideoSync(false)
      }
    }

    let maxQueueLength = 10
    if (is.string(this.source) && !this.options.isLive) {
      this.streams.forEach((stream) => {
        maxQueueLength = Math.max(Math.ceil(avQ2D(stream.codecpar.framerate) * 4), maxQueueLength)
      })
    }
    promises.push(AVPlayer.DemuxerThread.startDemux(this.taskId, this.options.isLive, maxQueueLength))
    if (this.subTaskId) {
      promises.push(AVPlayer.DemuxerThread.startDemux(this.subTaskId, this.options.isLive, maxQueueLength))
    }

    return Promise.all(promises).then(async () => {
      this.status = AVPlayerStatus.PLAYED
      if (defined(ENABLE_MSE) && this.useMSE) {
        await Promise.all([
          this.video?.play(),
          this.audio?.play()
        ]).catch((error) => {
          if (this.video) {
            this.video.muted = true
            this.fire(eventType.RESUME)
            logger.warn('the audioContext was not started. It must be resumed after a user gesture')
            return this.video.play()
          }
          else {
            throw error
          }
        })
      }
      else {
        if (this.audioSourceNode && AVPlayer.audioContext.state === 'suspended') {
          if (AVPlayer.audioContext.state === 'suspended') {
            this.fire(eventType.RESUME)
            logger.warn('the audioContext was not started. It must be resumed after a user gesture')
          }
          if (this.videoDecoder2VideoRenderChannel) {
            AVPlayer.AudioRenderThread.fakePlay(this.taskId)
            this.controller.setTimeUpdateListenType(AVMediaType.AVMEDIA_TYPE_VIDEO)
          }
          else {
            // 只有音频无法播放时直接抛错，和 mse 行为保持一致
            throw new Error('the audioContext was not started. It must be resumed after a user gesture')
          }
        }
      }
      this.fire(eventType.PLAYED)
      this.statsController.start()
      if (this.jitterBufferController) {
        this.jitterBufferController.start()
      }
    })
  }

  /**
   * 暂停播放
   */
  public async pause() {

    logger.info(`call pause, taskId: ${this.taskId}`)

    if (!this.options.isLive) {
      const promises = []
      if (defined(ENABLE_MSE) && this.useMSE) {
        if (this.audio) {
          this.audio.pause()
        }
        if (this.video) {
          this.video.pause()
        }
        promises.push(AVPlayer.MSEThread.pause(this.taskId))
      }
      else {
        if (this.audioSourceNode) {
          promises.push(this.audioSourceNode.request('pause'))
          // stop fake play
          if (AVPlayer.audioContext.state === 'suspended') {
            promises.push(AVPlayer.AudioRenderThread.pause(this.taskId))
          }
        }
        if (this.videoDecoder2VideoRenderChannel) {
          promises.push(AVPlayer.VideoRenderThread.pause(this.taskId))
        }
      }
      return Promise.all(promises).then(() => {
        if (this.status === AVPlayerStatus.SEEKING) {
          this.lastStatus = AVPlayerStatus.PAUSED
        }
        else {
          this.status = AVPlayerStatus.PAUSED
        }
        this.fire(eventType.PAUSED)
        if (this.jitterBufferController) {
          this.jitterBufferController.stop()
        }
      })
    }
    else {
      logger.warn(`pause can only used in vod, taskId: ${this.taskId}`)
    }
  }

  /**
   * 跳转到指定时间戳位置播放（只支持点播）
   * 某些文件可能不会 seek 成功
   * 
   * @param timestamp 毫秒
   */
  public async seek(timestamp: double) {

    logger.info(`call seek, timestamp: ${timestamp}, taskId: ${this.taskId}`)

    if (!this.streams.length) {
      logger.error(`cannot found any stream to seek, taskId: ${this.taskId}`)
      return
    }

    if (this.status === AVPlayerStatus.SEEKING) {
      logger.warn(`player is seeking now, taskId: ${this.taskId}`)
      return
    }

    this.fire(eventType.SEEKING)

    if (!this.options.isLive) {
      this.lastStatus = this.status
      this.status = AVPlayerStatus.SEEKING

      const timestampBigInt = static_cast<int64>(timestamp)
      if (defined(ENABLE_MSE) && this.useMSE) {
        await AVPlayer.MSEThread.beforeSeek(this.taskId)
      }
      else {
        await Promise.all([
          AVPlayer.AudioRenderThread?.beforeSeek(this.taskId),
          AVPlayer.VideoRenderThread?.beforeSeek(this.taskId)
        ])
      }

      let seekedTimestamp = -1n

      if (defined(ENABLE_PROTOCOL_HLS) && (this.ext === 'm3u8' || this.ext === 'm3u')) {
        seekedTimestamp = await AVPlayer.DemuxerThread.seek(this.taskId, timestampBigInt, AVSeekFlags.TIMESTAMP)
      }
      else if (defined(ENABLE_PROTOCOL_DASH) && this.ext === 'mpd') {
        seekedTimestamp = await AVPlayer.DemuxerThread.seek(this.taskId, timestampBigInt, AVSeekFlags.TIMESTAMP)
        if (this.subTaskId) {
          await AVPlayer.DemuxerThread.seek(this.subTaskId, timestampBigInt, AVSeekFlags.TIMESTAMP)
        }
      }
      else {
        seekedTimestamp = await AVPlayer.DemuxerThread.seek(this.taskId, timestampBigInt, AVSeekFlags.FRAME)
      }

      if (seekedTimestamp >= 0n) {
        logger.debug(`seeked to packet timestamp: ${seekedTimestamp}, taskId: ${this.taskId}`)
      }
      else {
        logger.error(`demuxer seek failed, code: ${seekedTimestamp}, taskId: ${this.taskId}`)
      }

      if (defined(ENABLE_MSE) && this.useMSE) {
        if (seekedTimestamp >= 0n) {
          const time = await AVPlayer.MSEThread.afterSeek(this.taskId, seekedTimestamp > timestampBigInt ? seekedTimestamp : timestampBigInt)
          if (this.video) {
            this.video.currentTime = time
          }
          else if (this.audio) {
            this.audio.currentTime = time
          }
        }
        else {
          await AVPlayer.MSEThread.afterSeek(this.taskId, NOPTS_VALUE_BIGINT)
        }
        this.status = this.lastStatus

        this.fire(eventType.SEEKED)
      }
      else {
        let maxQueueLength = 20
        this.streams.forEach((stream) => {
          if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            maxQueueLength = Math.max(Math.ceil(avQ2D(stream.codecpar.framerate)), maxQueueLength)
          }
        })
        if (seekedTimestamp >= 0n) {
          await Promise.all([
            AVPlayer.AudioDecoderThread?.resetTask(this.taskId),
            this.VideoDecoderThread?.resetTask(this.taskId)
          ])
          await Promise.all([
            AVPlayer.AudioRenderThread?.syncSeekTime(
              this.taskId,
              seekedTimestamp > timestampBigInt ? seekedTimestamp : timestampBigInt,
              maxQueueLength
            ),
            AVPlayer.VideoRenderThread?.syncSeekTime(
              this.taskId,
              seekedTimestamp > timestampBigInt ? seekedTimestamp : timestampBigInt,
              maxQueueLength
            ),
          ])
          await Promise.all([
            AVPlayer.AudioRenderThread?.afterSeek(this.taskId, seekedTimestamp > timestampBigInt ? seekedTimestamp : timestampBigInt),
            AVPlayer.VideoRenderThread?.afterSeek(this.taskId, seekedTimestamp > timestampBigInt ? seekedTimestamp : timestampBigInt),
          ])
        }
        else {
          await Promise.all([
            AVPlayer.AudioRenderThread?.syncSeekTime(this.taskId, NOPTS_VALUE_BIGINT, maxQueueLength),
            AVPlayer.VideoRenderThread?.syncSeekTime(this.taskId, NOPTS_VALUE_BIGINT, maxQueueLength),
          ])
          await Promise.all([
            AVPlayer.AudioRenderThread?.afterSeek(this.taskId, NOPTS_VALUE_BIGINT),
            AVPlayer.VideoRenderThread?.afterSeek(this.taskId, NOPTS_VALUE_BIGINT),
          ])
        }
        this.status = this.lastStatus
        if (this.jitterBufferController) {
          this.jitterBufferController.reset()
        }
      }
    }
    else {
      logger.warn(`seek can only used in vod, taskId: ${this.taskId}`)
    }
  }

  public getStreams() {
    return this.streams
  }

  /**
   * 获取总时长（毫秒）
   * 
   * @returns 
   */
  public getDuration() {
    if (!this.options.isLive) {
      let max = 0n
      this.streams.forEach((stream) => {
        const duration =  avRescaleQ(
          stream.duration,
          {
            den: stream.timeBase.den,
            num: stream.timeBase.num
          },
          AV_MILLI_TIME_BASE_Q
        )
        if (duration > max) {
          max = duration
        }
      })
      return max
    }
    return 0n
  }

  public async stop() {

    logger.info(`call stop, taskId: ${this.taskId}`)

    if (this.status === AVPlayerStatus.STOPPED) {
      logger.warn(`player has already stopped, taskId: ${this.taskId}`)
      return
    }

    if (this.audioSourceNode) {
      await this.audioSourceNode.request('stop')
      this.audioSourceNode.disconnect()
      this.audioSourceNode = null
    }
    if (AVPlayer.VideoRenderThread) {
      await AVPlayer.VideoRenderThread.unregisterTask(this.taskId)
    }
    if (AVPlayer.AudioRenderThread) {
      await AVPlayer.AudioRenderThread.unregisterTask(this.taskId)
    }
    if (this.VideoDecoderThread) {
      await this.VideoDecoderThread.unregisterTask(this.taskId)
    }
    if (AVPlayer.AudioDecoderThread) {
      await AVPlayer.AudioDecoderThread.unregisterTask(this.taskId)
    }
    if (AVPlayer.MSEThread) {
      await AVPlayer.MSEThread.unregisterTask(this.taskId)
    }
    if (AVPlayer.DemuxerThread) {
      await AVPlayer.DemuxerThread.unregisterTask(this.taskId)
      if (this.subTaskId) {
        await AVPlayer.DemuxerThread.unregisterTask(this.subTaskId)
      }
    }
    if (AVPlayer.IOThread) {
      await AVPlayer.IOThread.unregisterTask(this.taskId)
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.controller) {
      this.controller.destroy()
    }
    if ((this.video || this.audio)?.src) {
      URL.revokeObjectURL((this.video || this.audio).src)
    }
    if (this.video) {
      this.options.container.removeChild(this.video)
      this.video = null
    }
    if (this.audio) {
      this.options.container.removeChild(this.audio)
      this.audio = null
    }
    if (this.canvas) {
      this.options.container.removeChild(this.canvas)
      this.canvas = null
    }

    this.ioloader2DemuxerChannel = null
    this.demuxer2VideoDecoderChannel = null
    this.demuxer2AudioDecoderChannel = null
    this.videoDecoder2VideoRenderChannel = null
    this.audioDecoder2AudioRenderChannel = null
    this.audioRender2AudioWorkletChannel = null
    
    this.statsController.stop()
    if (this.jitterBufferController) {
      this.jitterBufferController.stop()
    }

    this.fire(eventType.STOPPED)

    this.status = AVPlayerStatus.STOPPED
  }

  /*
  * 设置播放速率（只支持点播）
  * 
  * @param rate 
  */
  public setPlaybackRate(rate: number) {
    if (!this.options.isLive) {
      this.playRate = restrain(rate, 0.5, 2)
      if (defined(ENABLE_MSE) && this.useMSE) {
        AVPlayer.MSEThread.setPlayRate(this.taskId, this.playRate)
        if (this.video) {
          this.video.playbackRate = this.playRate
        }
        else if (this.audio) {
          this.audio.playbackRate = this.playRate
        }
      }
      else {
        AVPlayer.AudioRenderThread?.setPlayTempo(this.taskId, this.playRate)
        AVPlayer.VideoRenderThread?.setPlayRate(this.taskId, this.playRate)
        this.VideoDecoderThread?.setPlayRate(this.taskId, this.playRate)
      }
      logger.info(`player call setPlaybackRate, set ${this.playRate}, taskId: ${this.taskId}`)
    }
    else {
      logger.warn(`setPlaybackRate can only used in playback, taskId: ${this.taskId}`)
    }
  }

  /**
   * 获取倍数值
   * 
   * @returns 
   */
  public getPlaybackRate() {
    return this.playRate
  }

  /**
   * resume 音频
   */
  public async resume() {
    if (AVPlayer.audioContext?.state === 'suspended') {
      await Promise.race([
        AVPlayer.audioContext.resume(),
        new Sleep(0.1)
      ])
      if (AVPlayer.audioContext.state === 'suspended') {
        logger.warn('the audioContext was not allowed to start. It must be resumed after a user gesture')
      }
      else {
        if (this.audioSourceNode) {
          this.controller.setTimeUpdateListenType(AVMediaType.AVMEDIA_TYPE_AUDIO)
        }
        if (this.video) {
          this.video.muted = false
        }
      }
    }
    if (this.video) {
      this.video.muted = false
      if (!this.video.played) {
        await this.video.play()
      }
    }
    else if (this.audio) {
      this.audio.muted = false
      if (!this.audio.played) {
        await this.audio.play()
      }
    }

    logger.info(`call resume, taskId: ${this.taskId}`)
  }

  /**
   * 获取播放音量
   * 
   * @returns 
   */
  public getVolume() {
    return this.volume
  }

  /**
   * 设置播放音量
   * 
   * @param volume [0, 3]
   * 
   */
  public setVolume(volume: number, force: boolean = false) {
    this.volume = restrain(volume, 0, 3)
    if (this.gainNode && AVPlayer.audioContext) {
      this.gainNode.gain.cancelScheduledValues(AVPlayer.audioContext.currentTime)

      if (browser.firefox && !force) {
        this.gainNode.gain.setValueAtTime(this.volume, AVPlayer.audioContext.currentTime + 1)
      }
      else {
        if (this.gainNode.gain.value === 0 || this.volume === 0 || force) {
          this.gainNode.gain.value = this.volume
        }
        else {
          this.gainNode.gain.exponentialRampToValueAtTime(this.volume, AVPlayer.audioContext.currentTime + 1)
        }
      }
    }
    else if (this.video) {
      this.video.volume = this.volume
    }
    else if (this.audio) {
      this.audio.volume = this.volume
    }

    logger.info(`player call setVolume, set ${volume}, used ${this.volume}, taskId: ${this.taskId}`)
  }

  /**
   * 
   * 获取渲染模式
   * 
   * @param mode 
   * @returns 
   */
  public getRenderMode() {
    return this.renderMode
  }

  /**
   * 设置画面填充模式
   * 
   * - 0 自适应
   * - 1 填充
   * 
   * @param mode 
   */
  public setRenderMode(mode: RenderMode) {
    this.renderMode = mode
    if (defined(ENABLE_MSE) && this.useMSE && this.video) {
      this.video.style['object-fit'] = ObjectFitMap[this.renderMode]
    }
    else {
      AVPlayer.VideoRenderThread?.setRenderMode(this.taskId, mode)
    }
    logger.info(`player call setRenderMode, mode: ${mode}, taskId: ${this.taskId}`)
  }

  private getVideoTransformContext() {
    let text = ''
    if (this.renderRotate !== 0) {
      text += `rotateZ(${this.renderRotate}deg)`
    }
    if (this.flipHorizontal) {
      text += `${text.length ? ' ' : ''}scaleX(-1)`
    }
    if (this.flipVertical) {
      text += `${text.length ? ' ' : ''}scaleY(-1)`
    }
    return text
  }

  /**
   * 设置视频渲染旋转角度
   * 
   * @param angle 
   */
  public setRotate(angle: double) {
    this.renderRotate = angle
    if (defined(ENABLE_MSE) && this.useMSE && this.video) {
      this.video.style.transform = this.getVideoTransformContext()
    }
    else {
      AVPlayer.VideoRenderThread?.setRenderRotate(this.taskId, angle)
    }
    logger.info(`player call setRotate, angle: ${angle}, taskId: ${this.taskId}`)
  }

  public enableHorizontalFlip(enable: boolean) {
    this.flipHorizontal = enable
    if (defined(ENABLE_MSE) && this.useMSE && this.video) {
      this.video.style.transform = this.getVideoTransformContext()
    }
    else {
      AVPlayer.VideoRenderThread?.enableHorizontalFlip(this.taskId, enable)
    }
    logger.info(`player call enableHorizontalFlip, enable: ${enable}, taskId: ${this.taskId}`)
  }

  public enableVerticalFlip(enable: boolean) {
    this.flipVertical = enable
    if (defined(ENABLE_MSE) && this.useMSE && this.video) {
      this.video.style.transform = this.getVideoTransformContext()
    }
    else {
      AVPlayer.VideoRenderThread?.enableVerticalFlip(this.taskId, enable)
    }
    logger.info(`player call enableVerticalFlip, enable: ${enable}, taskId: ${this.taskId}`)
  }

  /**
   * 设置是否循环播放
   * 
   * @param enable 
   */
  public setLoop(enable: boolean) {

    this.options.loop = enable

    logger.info(`call setLoop, enable: ${enable}, taskId: ${this.taskId}`)
  }

  /**
   * 重置渲染视图大小
   * 
   * @param width 
   * @param height 
   */
  public resize(width: number, height: number) {
    if (!this.useMSE) {
      AVPlayer.VideoRenderThread?.resize(this.taskId, width, height)
    }
    logger.info(`player call resize, width: ${width}, height: ${height}, taskId: ${this.taskId}`)
  }

  public isMSE() {
    return this.useMSE
  }

  public async getVideoList() {
    return AVPlayer.IOThread?.getVideoList(this.taskId)
  }

  public async getAudioList() {
    return AVPlayer.IOThread?.getAudioList(this.taskId)
  }

  public async getSubtitleList() {
    return AVPlayer.IOThread?.getSubtitleList(this.taskId)
  }

  public async selectVideo(index: number) {
    return AVPlayer.IOThread?.selectVideo(this.taskId, index)
  }

  public async selectAudio(index: number) {
    return AVPlayer.IOThread?.selectAudio(this.taskId, index)
  }

  public async selectSubtitle(index: number) {
    return AVPlayer.IOThread?.selectSubtitle(this.taskId, index)
  }

  /**
   * 全屏
   */
  public enterFullscreen() {
    const element: HTMLElement = this.useMSE ? this.video : this.canvas
    if (element.requestFullscreen) {
      element.requestFullscreen()
    }
    else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen()
    }
    else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen()
    }
    else if (element.msRequestFullscreen) {
      element.msRequestFullscreen()
    }
    logger.info(`player call enterFullscreen, taskId: ${this.taskId}`)
  }

  /**
   * 退出全屏
   */
  public exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
    else if (document.mozExitFullScreen) {
      document.mozExitFullScreen()
    }
    else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    }
    logger.info(`player call exitFullscreen, taskId: ${this.taskId}`)
  }

  /**
   * 获取截图
   * 
   * @param type 生成图片格式
   * @param quality 生成图片质量
   */
  public snapshot(type: 'png' | 'jpeg' | 'webp' = 'png', quality: number = 1) {
    if (defined(ENABLE_MSE) && this.useMSE && this.video) {
      const canvas = document.createElement('canvas')
      canvas.width = this.video.videoWidth
      canvas.height = this.video.videoHeight
      const context = canvas.getContext('2d')
      context.drawImage(this.video, 0, 0)
      return canvas.toDataURL(`image/${type}`, quality)
    }
    else if (this.canvas) {
      return this.canvas.toDataURL(`image/${type}`, quality)
    }
  }

  public getStats() {
    return this.stats
  }

  public async destroy() {

    logger.info(`call destroy, taskId: ${this.taskId}`)

    if (this.status === AVPlayerStatus.DESTROYED) {
      logger.warn(`player has already destroyed, taskId: ${this.taskId}`)
      return
    }

    await this.stop()
    unmake(this.stats)
    this.stats = null

    if (this.VideoDecoderThread) {
      await this.VideoDecoderThread.clear()
      closeThread(this.VideoDecoderThread)
      this.VideoDecoderThread = null
    }

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

    this.status = AVPlayerStatus.DESTROYED
  }

  public onVideoEnded(): void {
    this.videoEnded = true
    this.handleEnded()
  }

  public onAudioEnded(): void {
    this.audioEnded = true
    this.handleEnded()
  }

  public onCanvasUpdated(): void {
    this.updateCanvas = this.createCanvas()
    const canvas = (supportOffscreenCanvas() && cheapConfig.USE_THREADS && defined(ENABLE_THREADS))
      ? this.updateCanvas.transferControlToOffscreen()
      : this.updateCanvas
    AVPlayer.VideoRenderThread.updateCanvas
      .transfer(canvas as OffscreenCanvas)
      .invoke(this.taskId, canvas)
  }

  public onFirstVideoRendered(): void {
    logger.info(`first video frame rendered, taskId: ${this.taskId}`)
    this.fire(eventType.FIRST_VIDEO_RENDERED)
  }

  public onFirstAudioRendered(): void {
    logger.info(`first audio frame rendered, taskId: ${this.taskId}`)
    this.fire(eventType.FIRST_VIDEO_RENDERED)
  }

  public onStutter() {
    this.stats.audioStutter++
  }

  public onFirstVideoRenderedAfterUpdateCanvas(): void {
    if (this.updateCanvas) {
      if (this.canvas) {
        this.options.container.removeChild(this.canvas)
      }
      this.canvas = this.updateCanvas
      this.options.container.appendChild(this.canvas)
      this.updateCanvas = null
    }
  }

  public onTimeUpdate(pts: int64): void {
    this.fire(eventType.TIME, [pts])
  }

  public onMSESeek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time
    }
    else if (this.video) {
      this.video.currentTime = time
    }
  }

  private async createVideoDecoderThread() {

    if (this.VideoDecoderThread) {
      return
    }

    this.VideoDecoderThread = await createThreadFromClass(VideoDecodePipeline, {
      name: 'VideoDecoderThread',
      disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
    }).run()
    this.VideoDecoderThread.setLogLevel(AVPlayer.level)
  }

  static async startDemuxPipeline() {
    if (AVPlayer.DemuxThreadReady) {
      return AVPlayer.DemuxThreadReady
    }

    return AVPlayer.DemuxThreadReady = new Promise(async (resolve) => {
      AVPlayer.IOThread = await createThreadFromClass(IOPipeline, {
        name: 'IOThread'
      }).run()
      AVPlayer.IOThread.setLogLevel(AVPlayer.level)

      AVPlayer.DemuxerThread = await createThreadFromClass(DemuxPipeline, {
        name: 'DemuxerThread'
      }).run()
      AVPlayer.DemuxerThread.setLogLevel(AVPlayer.level)
      resolve()
    })
  }

  static async startAudioPipeline() {
    if (AVPlayer.AudioThreadReady) {
      return AVPlayer.AudioThreadReady
    }

    return AVPlayer.AudioThreadReady = new Promise(async (resolve) => {
      AVPlayer.audioContext = new (AudioContext || webkitAudioContext)()
      if (support.audioWorklet) {
        await registerProcessor(
          AVPlayer.audioContext,
          defined(ENABLE_THREADS) && cheapConfig.USE_THREADS && (!browser.safari || browser.checkVersion(browser.version, '16.1', true))
            ? require.resolve('avrender/pcm/AudioSourceWorkletProcessor2')
            : require.resolve('avrender/pcm/AudioSourceWorkletProcessor')
        )
      }
      AVPlayer.AudioDecoderThread = await createThreadFromClass(AudioDecodePipeline, {
        name: 'AudioDecoderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
      }).run()
      AVPlayer.AudioDecoderThread.setLogLevel(AVPlayer.level)

      AVPlayer.AudioRenderThread = await createThreadFromClass(AudioRenderPipeline, {
        name: 'AudioRenderThread',
        disableWorker: browser.safari && !browser.checkVersion(browser.version, '16.1', true)
      }).run()
      AVPlayer.AudioRenderThread.setLogLevel(AVPlayer.level)
      resolve()
    })
  }

  static async startVideoRenderPipeline() {
    if (AVPlayer.VideoThreadReady) {
      return AVPlayer.VideoThreadReady
    }

    return AVPlayer.VideoThreadReady = new Promise(async (resolve) => {
      AVPlayer.VideoRenderThread = await createThreadFromClass(VideoRenderPipeline, {
        name: 'VideoRenderThread',
        disableWorker: !supportOffscreenCanvas()
      }).run()
      AVPlayer.VideoRenderThread.setLogLevel(AVPlayer.level)
      resolve()
    })
  }

  static async startMSEPipeline() {
    if (defined(ENABLE_MSE)) {
      if (AVPlayer.MSEThreadReady) {
        return AVPlayer.MSEThreadReady
      }

      return AVPlayer.MSEThreadReady = new Promise(async (resolve) => {
        AVPlayer.MSEThread = await createThreadFromClass(MSEPipeline, {
          name: 'MSEThread',
          disableWorker: !support.workerMSE
        }).run()
        AVPlayer.MSEThread.setLogLevel(AVPlayer.level)
        resolve()
      })
    }
  }

  static async startPipelines() {
    await AVPlayer.startDemuxPipeline()
    await AVPlayer.startAudioPipeline()
    await AVPlayer.startVideoRenderPipeline()
    await AVPlayer.startMSEPipeline()
    logger.info('AVPlayer pipelines started')
  }

  static async stopPipelines() {
    if (AVPlayer.VideoRenderThread) {
      await AVPlayer.VideoRenderThread.clear()
      closeThread(AVPlayer.VideoRenderThread)
    }
    if (AVPlayer.AudioRenderThread) {
      await AVPlayer.AudioRenderThread.clear()
      closeThread(AVPlayer.AudioRenderThread)
    }
    if (AVPlayer.AudioDecoderThread) {
      await AVPlayer.AudioDecoderThread.clear()
      closeThread(AVPlayer.AudioDecoderThread)
    }
    if (AVPlayer.DemuxerThread) {
      await AVPlayer.DemuxerThread.clear()
      closeThread(AVPlayer.DemuxerThread)
    }
    if (AVPlayer.IOThread) {
      await AVPlayer.IOThread.clear()
      closeThread(AVPlayer.IOThread)
    }
    if (defined(ENABLE_MSE)) {
      if (AVPlayer.MSEThread) {
        await AVPlayer.MSEThread.clear()
        closeThread(AVPlayer.MSEThread)
      }
    }

    AVPlayer.AudioDecoderThread = null
    AVPlayer.DemuxerThread = null
    AVPlayer.IOThread = null
    AVPlayer.audioContext = null
    AVPlayer.MSEThread = null

    logger.info('AVPlayer pipelines stopped')

  }

  static setLogLevel(level: number) {
    AVPlayer.level = level
    logger.setLevel(level)

    if (AVPlayer.IOThread) {
      AVPlayer.IOThread.setLogLevel(level)
    }
    if (AVPlayer.DemuxerThread) {
      AVPlayer.DemuxerThread.setLogLevel(level)
    }
    if (AVPlayer.AudioDecoderThread) {
      AVPlayer.AudioDecoderThread.setLogLevel(level)
    }
    if (AVPlayer.AudioRenderThread) {
      AVPlayer.AudioRenderThread.setLogLevel(level)
    }
    if (AVPlayer.VideoRenderThread) {
      AVPlayer.VideoRenderThread.setLogLevel(level)
    }
    if (AVPlayer.MSEThread) {
      AVPlayer.MSEThread.setLogLevel(level)
    }

    logger.info(`set log level: ${level}`)
  }
}
