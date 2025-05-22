/*
 * libmedia MSEPipeline
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

import { createAVOFormatContext, AVOFormatContext } from 'avformat/AVFormatContext'
import Pipeline, { TaskOptions } from 'avpipeline/Pipeline'
import * as errorType from 'avutil/error'
import IPCPort, { NOTIFY, RpcMessage } from 'common/network/IPCPort'
import * as logger from 'common/util/logger'
import OFormat from 'avformat/formats/OFormat'
import IOWriter from 'common/io/IOWriterSync'
import * as mux from 'avformat/mux'
import OMovFormat from 'avformat/formats/OMovFormat'
import { FragmentMode, MovMode } from 'avformat/formats/mov/mov'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { copyCodecParameters, freeCodecParameters } from 'avutil/util/codecparameters'
import LoopTask from 'common/timer/LoopTask'
import Track from 'avrender/track/Track'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import AVPacket, { AVPacketFlags, AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { avQ2D, avRescaleQ, avRescaleQ2 } from 'avutil/util/rational'
import getTimestamp from 'common/function/getTimestamp'
import getAudioMimeType from 'avrender/track/function/getAudioMimeType'
import getVideoMimeType from 'avrender/track/function/getVideoMimeType'
import SeekableWriteBuffer from 'common/io/SeekableWriteBuffer'
import { addAVPacketData, getAVPacketSideData, refAVPacket } from 'avutil/util/avpacket'
import { mapUint8Array, memcpy, memcpyFromUint8Array } from 'cheap/std/memory'
import { avFree, avMalloc, avMallocz } from 'avutil/util/mem'
import browser from 'common/util/browser'
import { milliSecond2Second } from 'avutil/util/common'
import Sleep from 'common/timer/Sleep'
import { IOError } from 'common/io/error'
import * as bigint from 'common/util/bigint'
import mktag from 'avformat/function/mktag'
import getMediaSource from '../function/getMediaSource'
import * as intread from 'avutil/util/intread'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import { AVCodecParametersSerialize, AVPacketSerialize,
  unserializeAVCodecParameters, unserializeAVPacket
} from 'avutil/util/serialize'
import isPointer from 'cheap/std/function/isPointer'
import * as is from 'common/util/is'
import os from 'common/util/os'
import { MPEG4AudioObjectTypes } from 'avutil/codecs/aac'
import { AVStreamMetadataKey } from 'avutil/AVStream'
import WorkerTimer from 'common/timer/WorkerTimer'

export interface MSETaskOptions extends TaskOptions {
  isLive: boolean
  avpacketList: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex: pointer<Mutex>
  enableJitterBuffer: boolean
}

interface PullQueue {
  queue: pointer<AVPacketRef>[]
  index: int32
  frameCount: int64
  lastPTS: int64
  lastDTS: int64
  diff: int64
  ended: boolean
  useSampleRateTimeBase: boolean
}

interface MSEResource {
  type: 'audio' | 'video'
  codecpar: pointer<AVCodecParameters>
  oformatContext: AVOFormatContext
  oformat: OFormat
  ioWriter: IOWriter
  bufferQueue: SeekableWriteBuffer
  track: Track
  streamIndex: int32
  pullIPC: IPCPort
  loop: LoopTask

  startTimestamp: int64

  frontPacket: pointer<AVPacketRef>
  backPacket: pointer<AVPacketRef>
  frontBuffered: boolean

  packetEnded: boolean
  ended: boolean
  seekSync: () => void

  startPTS: int64
  lastDTS: int64

  pullQueue: PullQueue

  enableRawMpeg: boolean

  timestampOffsetUpdated: boolean
}

type SelfTask = MSETaskOptions & {
  mediaSource: MediaSource
  controlIPCPort: IPCPort
  audio: MSEResource
  video: MSEResource

  pauseTimestamp: number
  // playRate / 100 
  playRate: int64
  targetRate: int64

  seeking: boolean
  pausing: boolean

  cacheDuration: int64
  currentTime: double
  currentTimeNTP: int32

  avpacketPool: AVPacketPool
  maxBuffer: float
  minBuffer: float

  visibilityHidden: boolean
  fakePlayTimer: WorkerTimer
}

function checkExtradataChanged(old: pointer<uint8>, oldSize: int32, newer: pointer<uint8>, newSize: int32) {
  if (oldSize !== newSize) {
    return true
  }
  let change = false

  for (let i = 0; i < oldSize; i++) {
    if (accessof(old + i) !== accessof(newer + i)) {
      change = true
      break
    }
  }
  return change
}

export default class MSEPipeline extends Pipeline {

  declare tasks: Map<string, SelfTask>

  constructor() {
    super()
  }

  private async syncToKeyframe(task: SelfTask) {
    let firstIsKeyframe = true
    if (task.video) {
      // 寻找下一个关键帧
      while (true) {
        task.video.backPacket = await this.pullAVPacket(task.video, task)
        if (task.video.backPacket < 0) {
          task.video.packetEnded = true
          task.video.backPacket = nullptr
          break
        }
        // 跳过 pts 小于当前视频 pts 的音频 packet
        if (task.audio
          && !task.audio.packetEnded
          && (!task.audio.backPacket
            || avRescaleQ2(task.audio.backPacket.pts, addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
              < avRescaleQ2(task.video.backPacket.pts, addressof(task.video.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
          )
        ) {
          while (true) {
            if (task.audio.backPacket > 0) {
              task.avpacketPool.release(task.audio.backPacket)
            }
            task.audio.backPacket = await this.pullAVPacket(task.audio, task)
            if (task.audio.backPacket < 0) {
              task.audio.packetEnded = true
              task.audio.backPacket = nullptr
              break
            }
            if (avRescaleQ2(task.audio.backPacket.pts, addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
              > avRescaleQ2(task.video.backPacket.pts, addressof(task.video.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
            ) {
              break
            }
          }
        }
        if ((task.video.backPacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
          || (task.video.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            && h264.isIDR(
              task.video.backPacket,
              task.video.codecpar.extradata
                ? ((intread.r8(task.video.codecpar.extradata + 4) & 0x03) + 1)
                : 4
            )
          )
          || (task.video.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              && hevc.isIDR(
                task.video.backPacket,
                task.video.codecpar.extradata
                  ? ((intread.r8(task.video.codecpar.extradata + 21) & 0x03) + 1)
                  : 4
              )
          )
        ) {
          break
        }
        firstIsKeyframe = false
        task.avpacketPool.release(task.video.backPacket)
      }
    }
    return firstIsKeyframe
  }

  private getSourceOpenHandler(task: SelfTask, startTimestamp: int64 = 0n) {
    return async () => {

      await this.syncToKeyframe(task)

      let audioStartTimestamp = startTimestamp
      let videoStartTimestamp = startTimestamp

      if (task.audio && !task.audio.backPacket && !task.audio.packetEnded) {
        task.audio.backPacket = await this.pullAVPacket(task.audio, task)
        if (task.audio.backPacket < 0) {
          task.audio.packetEnded = true
          task.audio.backPacket = nullptr
        }
      }
      if (task.video && !task.video.backPacket && task.video.packetEnded) {
        task.video.backPacket = await this.pullAVPacket(task.video, task)
        if (task.video.backPacket < 0) {
          task.video.packetEnded = true
          task.video.backPacket = nullptr
        }
      }
      if (task.audio?.backPacket > 0) {
        audioStartTimestamp = bigint.max(audioStartTimestamp, avRescaleQ2(task.audio.backPacket.dts, addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q))
      }
      if (task.video?.backPacket > 0) {
        videoStartTimestamp = bigint.max(videoStartTimestamp, avRescaleQ2(task.video.backPacket.dts, addressof(task.video.backPacket.timeBase), AV_MILLI_TIME_BASE_Q))
      }
      if (task.audio && task.video && bigint.abs(audioStartTimestamp - videoStartTimestamp) > 1000) {
        if (videoStartTimestamp > audioStartTimestamp) {
          const dts = avRescaleQ(audioStartTimestamp, AV_MILLI_TIME_BASE_Q, task.video.backPacket.timeBase)
          task.video.backPacket.duration = task.video.backPacket.dts - dts
          task.video.backPacket.dts = task.video.backPacket.pts
            = dts
          videoStartTimestamp = audioStartTimestamp
        }
        else if (audioStartTimestamp > videoStartTimestamp
          && task.audio.oformatContext.streams[0].codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC
          && task.audio.oformatContext.streams[0].codecpar.profile === MPEG4AudioObjectTypes.AAC_LC
          && task.audio.oformatContext.streams[0].codecpar.chLayout.nbChannels < 3
        ) {
          const avpacket = task.avpacketPool.alloc()
          refAVPacket(avpacket, task.audio.backPacket)
          const sliceData = task.audio.oformatContext.streams[0].codecpar.chLayout.nbChannels === 1
            ? new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x23, 0x80])
            : new Uint8Array([0x21, 0x00, 0x49, 0x90, 0x02, 0x19, 0x00, 0x23, 0x80])

          const data: pointer<uint8> = avMalloc(sliceData.length)
          memcpyFromUint8Array(data, sliceData.length, sliceData)
          addAVPacketData(avpacket, data, sliceData.length)
          avpacket.dts = avpacket.pts
            = avRescaleQ(videoStartTimestamp, AV_MILLI_TIME_BASE_Q, avpacket.timeBase)

          const sampleDuration = 1024000n / static_cast<int64>(task.audio.oformatContext.streams[0].codecpar.sampleRate)
          const samples = static_cast<int32>((audioStartTimestamp - videoStartTimestamp) / sampleDuration)
          let dts = avpacket.dts + avRescaleQ(sampleDuration, AV_MILLI_TIME_BASE_Q, task.audio.backPacket.timeBase)
          for (let i = 0; i < samples - 1; i++) {
            const p = task.avpacketPool.alloc()
            refAVPacket(p, avpacket)
            p.dts = p.pts = dts
            task.audio.pullQueue.queue.push(p)
            dts += avRescaleQ(sampleDuration, AV_MILLI_TIME_BASE_Q, task.audio.backPacket.timeBase)
          }

          task.audio.pullQueue.queue.push(task.audio.backPacket)
          task.audio.backPacket = avpacket

          audioStartTimestamp = videoStartTimestamp
        }
      }

      const promises = []
      if (task.audio) {
        task.audio.track.setSourceBuffer(this.createSourceBuffer(task.mediaSource, addressof(task.audio.oformatContext.streams[0].codecpar)))
        if (!task.audio.enableRawMpeg) {
          mux.open(task.audio.oformatContext)
          mux.writeHeader(task.audio.oformatContext)
        }
        promises.push(this.startMux(task.audio, task, bigint.max(audioStartTimestamp, videoStartTimestamp)))
      }
      if (task.video) {
        task.video.track.setSourceBuffer(this.createSourceBuffer(task.mediaSource, addressof(task.video.oformatContext.streams[0].codecpar)))

        if (!task.video.enableRawMpeg) {
          mux.open(task.video.oformatContext)
          mux.writeHeader(task.video.oformatContext)
        }
        promises.push(this.startMux(task.video, task, bigint.max(audioStartTimestamp, videoStartTimestamp)))
      }

      await Promise.all(promises)

      let startAudioLoop = false
      let startVideoLoop = false

      if (task.audio) {
        task.audio.backPacket = await this.pullAVPacket(task.audio, task)
        if (task.audio.backPacket > 0) {
          startAudioLoop = true
          task.audio.frontPacket = await this.pullAVPacket(task.audio, task)
          if (task.audio.frontPacket > 0) {
            task.audio.frontBuffered = true
          }
          else {
            task.audio.frontPacket = nullptr
            task.audio.packetEnded = true
          }
        }
        else {
          task.audio.packetEnded = true
        }
        if (!task.audio.enableRawMpeg) {
          task.audio.oformatContext.ioWriter.flush()
        }
        task.audio.track.addBuffer(task.audio.bufferQueue.flush())
      }

      if (task.video) {
        task.video.backPacket = await this.pullAVPacket(task.video, task)
        if (task.video.backPacket > 0) {
          startVideoLoop = true
          task.video.frontPacket = await this.pullAVPacket(task.video, task)
          if (task.video.frontPacket > 0) {
            task.video.frontBuffered = true
          }
          else {
            task.video.frontPacket = nullptr
            task.video.packetEnded = true
          }
        }
        else {
          task.video.packetEnded = true
        }
        if (!task.video.enableRawMpeg) {
          task.video.oformatContext.ioWriter.flush()
        }
        task.video.track.addBuffer(task.video.bufferQueue.flush())
      }

      if (task.audio) {
        if (startAudioLoop) {
          this.createLoop(task.audio, task)
          task.audio.loop.start()
        }
        else {
          task.audio.track.end()
        }
      }
      if (task.video) {
        if (startVideoLoop) {
          this.createLoop(task.video, task)
          task.video.loop.start()
        }
        else {
          task.video.track.end()
        }
      }

      // 等待一定的缓冲
      await new Sleep(0.1)

      let min = 0

      if (task.audio) {
        if (task.video) {
          min = Math.max(task.audio.track.getBufferedStart(), task.video.track.getBufferedStart())
        }
        else {
          min = task.audio.track.getBufferedStart()
        }
      }
      else if (task.video) {
        min = task.video.track.getBufferedStart()
      }

      task.currentTimeNTP = getTimestamp()

      if (startTimestamp > 0n) {
        task.currentTime = milliSecond2Second(startTimestamp)
        task.controlIPCPort.notify('seek', {
          time: task.currentTime
        })
      }
      // safari 播放某些视频会卡主，开始时间不是从 0 开始的 seek 到 min buffer 处
      // 倍速的时候也 seek，chrome 会卡主
      else if (browser.safari || os.ios || min > 0.1 || task.playRate > 100n) {
        task.currentTime = min
        task.currentTimeNTP = getTimestamp()
        task.controlIPCPort.notify('seek', {
          time: min
        })
      }
    }
  }

  private getMimeType(codecpar: pointer<AVCodecParameters>) {
    let mimeType = ''

    if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      mimeType = getAudioMimeType(codecpar)
    }
    else if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      mimeType = getVideoMimeType(codecpar)
    }

    if (!mimeType) {
      logger.fatal('invalid stream')
    }
    return mimeType
  }

  private createSourceBuffer(mediaSource: MediaSource, codecpar: pointer<AVCodecParameters>) {
    return mediaSource.addSourceBuffer(this.getMimeType(codecpar))
  }

  // TODO avpacket extradata 混入码流
  private mixExtradata(avpacket: pointer<AVPacket>, resource: MSEResource, extradata: pointer<uint8>, extradataSize: int32) {
    const codecId = resource.oformatContext.streams[0].codecpar.codecId
    if (codecId === AVCodecID.AV_CODEC_ID_H264
      || codecId === AVCodecID.AV_CODEC_ID_H265
      || codecId === AVCodecID.AV_CODEC_ID_AAC
    ) {

    }

    const codecpar = resource.oformatContext.streams[0].codecpar

    if (codecpar.extradata) {
      avFree(codecpar.extradata)
    }
    codecpar.extradata = avMalloc(reinterpret_cast<size>(extradataSize))
    memcpy(codecpar.extradata, extradata, reinterpret_cast<size>(extradataSize))
    codecpar.extradataSize = extradataSize
  }

  private async pullAVPacketInternal(task: SelfTask, leftIPCPort: IPCPort) {
    const result = await leftIPCPort.request<pointer<AVPacketRef> | AVPacketSerialize>('pull')
    if (is.number(result) || isPointer(result)) {
      return result as pointer<AVPacketRef>
    }
    else {
      const avpacket = task.avpacketPool.alloc()
      unserializeAVPacket(result, avpacket)
      return avpacket
    }
  }

  private async pullAVPacket(resource: MSEResource, task: SelfTask): Promise<pointer<AVPacketRef>> {

    const pullQueue = resource.pullQueue

    if (pullQueue.ended && !pullQueue.queue.length) {
      return IOError.END as pointer<AVPacketRef>
    }

    const avpacket = pullQueue.queue.length
      ? pullQueue.queue.shift()
      : (await this.pullAVPacketInternal(task, resource.pullIPC))

    if (avpacket < 0) {
      pullQueue.ended = true
      return IOError.END as pointer<AVPacketRef>
    }

    // 负数直接输出
    if (avpacket.dts < 0n) {
      return avpacket
    }

    if (avpacket.dts < pullQueue.lastDTS) {
      logger.warn(`got packet with dts ${avpacket.dts}, which is earlier then the last packet(${pullQueue.lastDTS})`)
    }

    // 让 muxer 模块去根据 pts 计算 duration
    // 防止中间缺帧导致卡主
    avpacket.duration = NOPTS_VALUE_BIGINT

    // 音频直接让 pts 等于 dts，dts 是递增的可以保证 mse 不会卡主（但声音可能会出现嗒嗒声）
    if (resource.type === 'audio' && avpacket.dts > 0) {
      avpacket.pts = avpacket.dts
    }
    // 某些视频关键帧的 pts 会倒退，这里纠正一下（特别是 m3u8 和 dash 切片转 mp4 flv 格式的视频容易出现）
    // TODO 若是非关键帧出现 pts 不对的情况可能需要其他手段去纠正，否则 mse 因为 duration 不对会卡主
    // 对于没有 B 帧的编码格式可以让 pts 等于 dts，当有 B 帧时可以根据帧类型得到一个最短 pts 递增序列来纠正 pts
    // 直播我们就不去纠正了，一般这种错误出现在老旧视频文件里面，直播不太可能出现，真出现了那也是直播流服务器的问题，应该去修改服务器的问题
    else if (resource.type === 'video' && !task.isLive) {
      if ((avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
        && (
          (task.video.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            && h264.isIDR(
              avpacket,
              task.video.codecpar.extradata
                ? ((intread.r8(task.video.codecpar.extradata + 4) & 0x03) + 1)
                : 4
            )
          )
          || (task.video.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              && hevc.isIDR(
                avpacket,
                task.video.codecpar.extradata
                  ? ((intread.r8(task.video.codecpar.extradata + 21) & 0x03) + 1)
                  : 4
              )
          )
        )
      ) {
        if (avpacket.pts < pullQueue.lastPTS) {
          logger.warn(`got video packet with pts ${avpacket.pts}, which is earlier then the last packet(${pullQueue.lastPTS}), try to fix it!`)
          avpacket.pts = pullQueue.lastPTS + (avpacket.dts - pullQueue.lastDTS)

          const next = await this.pullAVPacketInternal(task, resource.pullIPC)
          if (next < 0) {
            pullQueue.ended = true
          }
          else {
            pullQueue.queue.push(next)
            // 判断下一个 gop pts 是否需要整体往后移
            // 找到下一个最短递增序列的最小 pts
            let nextMinPts = next.pts
            // I 帧后面的的 P 帧 一定是下一个最短递增序列的最大 pts
            const max = next.pts
            while (true) {
              const next2 = await this.pullAVPacketInternal(task, resource.pullIPC)
              if (next2 < 0) {
                pullQueue.ended = true
                break
              }
              pullQueue.queue.push(next2)
              // 当前的 pts 比最大 pts 都大了说明当前的最短递增序列已结束
              if (next2.pts > max) {
                break
              }
              nextMinPts = bigint.min(nextMinPts, next2.pts)
            }
            if (nextMinPts < avpacket.pts) {
              pullQueue.diff = avpacket.dts - pullQueue.lastDTS
            }
          }
        }
        else {
          pullQueue.diff = 0n
        }
      }
      else {
        avpacket.pts += pullQueue.diff
      }
    }
    if (avpacket.pts > pullQueue.lastPTS) {
      pullQueue.lastPTS = avpacket.pts
    }
    pullQueue.lastDTS = avpacket.dts

    // 使用 sampleRate 作为时间基
    // 这里需要根据当前已经处理的 samples count 调整时间基
    // 并将 avpacket 的时间基调整为采样率
    if (resource.type === 'audio' && pullQueue.useSampleRateTimeBase) {
      if (pullQueue.frameCount === NOPTS_VALUE_BIGINT) {
        pullQueue.frameCount = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), resource.oformatContext.streams[0].timeBase)
        avpacket.dts = avpacket.pts = pullQueue.frameCount
      }
      else {
        pullQueue.frameCount = pullQueue.frameCount + static_cast<int64>(resource.codecpar.frameSize)
        avpacket.dts = avpacket.pts = pullQueue.frameCount
      }
      avpacket.timeBase = resource.oformatContext.streams[0].timeBase
    }
    return avpacket
  }

  private writeAVPacket(avpacket: pointer<AVPacketRef>, resource: MSEResource, flush: boolean = false) {
    if (resource.enableRawMpeg) {
      if (!resource.timestampOffsetUpdated) {
        const offset = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
        resource.track.updateTimestampOffset(static_cast<int32>(offset) / 1000)
        resource.timestampOffsetUpdated = true
      }
      resource.bufferQueue.write(mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)).slice())
    }
    else {
      mux.writeAVPacket(resource.oformatContext, avpacket)
      if (flush) {
        resource.oformatContext.ioWriter.flush()
      }
    }
  }

  private swap(resource: MSEResource, task: SelfTask) {
    if (resource.backPacket) {
      task.avpacketPool.release(resource.backPacket)
    }

    resource.backPacket = nullptr

    if (resource.frontBuffered) {
      resource.backPacket = resource.frontPacket
      resource.frontPacket = nullptr
    }
    else {
      return false
    }
    resource.frontBuffered = false

    const now = getTimestamp()

    this.pullAVPacket(resource, task).then((packet) => {
      if (packet < 0) {
        resource.packetEnded = true
        resource.frontPacket = nullptr
        return
      }

      const cost = getTimestamp() - now
      // 超过 5 毫秒认为是网卡了，对齐一下时间
      if (cost > 5) {
        resource.startTimestamp += static_cast<int64>(cost)
      }

      resource.frontPacket = packet
      resource.frontBuffered = true

      if (resource.seekSync) {
        resource.seekSync()
        resource.seekSync = null
      }

      if (!resource.backPacket) {
        this.swap(resource, task)
      }
    })
    return true
  }

  private createLoop(resource: MSEResource, task: SelfTask) {
    resource.loop = new LoopTask(() => {

      const canPlayBufferTime = resource.track.getBufferedDuration(task.currentTime + (getTimestamp() - task.currentTimeNTP) / 1000)

      if (canPlayBufferTime > task.maxBuffer * (task.playRate > 100n ? (Number(task.playRate) / 100) : 1)) {
        resource.loop.emptyTask()
        this.checkWaiting(task)
        return
      }

      if (!resource.backPacket) {
        if (resource.packetEnded && !resource.frontPacket) {
          resource.ended = true
          resource.loop.stop()

          if (!resource.enableRawMpeg) {
            mux.writeTrailer(resource.oformatContext)
            mux.flush(resource.oformatContext)
          }
          if (resource.bufferQueue.size) {
            resource.track.addBuffer(resource.bufferQueue.flush())
          }
          resource.track.end()
        }
        else {
          resource.loop.emptyTask()
        }
        return
      }

      let avpacket: pointer<AVPacketRef> = resource.backPacket

      const dts = avRescaleQ2(
        avpacket.dts,
        addressof(avpacket.timeBase),
        AV_MILLI_TIME_BASE_Q
      )

      // 间距太大先 flush，防止 muxer 计算出一个非常大的 duration
      // 此时会将 buffered 分成两段 
      if (resource.lastDTS !== NOPTS_VALUE_BIGINT
        && dts - resource.lastDTS > 1000
      ) {
        mux.flush(resource.oformatContext)
        resource.startTimestamp -= static_cast<int64>(dts - resource.lastDTS)
      }
      resource.lastDTS = dts

      if (task.enableJitterBuffer) {
        let buffer = task.stats.audioEncodeFramerate
          ? (task.stats.audioPacketQueueLength / task.stats.audioEncodeFramerate * 1000)
          : (task.stats.videoEncodeFramerate
            ? (task.stats.videoPacketQueueLength / task.stats.videoEncodeFramerate * 1000)
            : 0
          )

        if (buffer <= task.stats.jitterBuffer.min) {
          this.setPlayRate(task.taskId, 1)
        }
      }

      const diff = dts * 100n / task.playRate + resource.startTimestamp - static_cast<int64>(getTimestamp())

      if (diff <= 0 || canPlayBufferTime < task.minBuffer * (task.playRate > 100n ? (Number(task.playRate) / 100) : 1)) {

        if (resource.track.isPaused()) {
          resource.track.enqueue()
        }

        avpacket.streamIndex = resource.oformatContext.streams[0].index

        const extradata = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        if (extradata && checkExtradataChanged(
          resource.oformatContext.streams[0].codecpar.extradata,
          resource.oformatContext.streams[0].codecpar.extradataSize,
          extradata.data,
          static_cast<int32>(extradata.size)
        )) {
          this.mixExtradata(avpacket, resource, extradata.data, static_cast<int32>(extradata.size))
        }

        this.writeAVPacket(avpacket, resource, true)

        resource.track.addBuffer(resource.bufferQueue.flush())

        const codecType = resource.oformatContext.streams[0].codecpar.codecType
        if (codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          task.stats.videoFrameDecodeCount++
          task.stats.videoFrameRenderCount++
        }
        else if (codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          task.stats.audioFrameDecodeCount++
          task.stats.audioFrameRenderCount++
        }

        if (task.playRate !== task.targetRate) {
          resource.startTimestamp = static_cast<int64>(getTimestamp()) - (dts * 100n / task.targetRate)
          task.playRate = task.targetRate
        }

        if (resource.packetEnded && !resource.frontPacket) {
          resource.ended = true
          resource.loop.stop()

          if (!resource.enableRawMpeg) {
            mux.writeTrailer(resource.oformatContext)
            mux.flush(resource.oformatContext)
          }

          if (resource.bufferQueue.size) {
            resource.track.addBuffer(resource.bufferQueue.flush())
          }
          resource.track.end()
          return
        }

        this.swap(resource, task)
      }
      else {
        resource.loop.emptyTask()
      }
    }, 0, 0)
  }

  private async startMux(resource: MSEResource, task: SelfTask, startTimestamp: int64 = 0n) {
    let startDTS: int64 = NOPTS_VALUE_BIGINT
    let startPTS: int64 = NOPTS_VALUE_BIGINT
    let lastDTS: int64 = 0n
    let avpacket: pointer<AVPacketRef>
    let cacheDuration = task.cacheDuration

    const timeBase = resource.oformatContext.streams[0].timeBase

    if (resource.backPacket > 0) {
      startDTS = resource.backPacket.dts
      startPTS = resource.backPacket.pts
      if (startTimestamp > startPTS) {
        cacheDuration += startTimestamp - avRescaleQ(startDTS, timeBase, AV_MILLI_TIME_BASE_Q)
      }

      resource.backPacket.streamIndex = resource.oformatContext.streams[0].index
      this.writeAVPacket(resource.backPacket, resource)
      task.avpacketPool.release(resource.backPacket)
      resource.backPacket = nullptr
    }

    while (startDTS === NOPTS_VALUE_BIGINT || avRescaleQ((lastDTS - startDTS), timeBase, AV_MILLI_TIME_BASE_Q) < cacheDuration) {
      avpacket = await this.pullAVPacket(resource, task)

      if (avpacket < 0) {
        resource.packetEnded = true
        break
      }

      lastDTS = avpacket.dts
      if (startDTS === NOPTS_VALUE_BIGINT) {
        startDTS = lastDTS
        startPTS = avpacket.pts
      }
      if (avpacket.pts < startPTS) {
        startPTS = avpacket.pts
      }

      if (task.video && task.video.streamIndex === avpacket.streamIndex) {
        const extradata = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        if (extradata && checkExtradataChanged(
          resource.oformatContext.streams[0].codecpar.extradata,
          resource.oformatContext.streams[0].codecpar.extradataSize,
          extradata.data,
          static_cast<int32>(extradata.size)
        )) {
          this.mixExtradata(avpacket, resource, extradata.data, static_cast<int32>(extradata.size))
        }
      }

      avpacket.streamIndex = resource.oformatContext.streams[0].index

      this.writeAVPacket(avpacket, resource)

      task.avpacketPool.release(avpacket)
    }
    if (startPTS !== NOPTS_VALUE_BIGINT && resource.startPTS <= 0n) {
      resource.startPTS = startPTS
    }
    resource.pullQueue.diff = 0n
    task.currentTimeNTP = getTimestamp()
    task.currentTime = 0
    resource.startTimestamp = static_cast<int64>(getTimestamp()) - avRescaleQ(lastDTS, timeBase, AV_MILLI_TIME_BASE_Q) * 100n / task.playRate
  }

  private resetResource(resource: MSEResource, task: SelfTask) {
    resource.bufferQueue.flush()
    resource.oformatContext.oformat.destroy(resource.oformatContext)
    const oformat = new OMovFormat({
      fragmentMode: FragmentMode.FRAME,
      fragment: true,
      fastOpen: true,
      movMode: MovMode.MP4,
      defaultBaseIsMoof: true
    })
    resource.oformatContext.oformat = oformat

    const track = new Track()
    track.onQuotaExceededError = () => {
      resource.startTimestamp -= 100n
    }
    track.onEnded = () => {
      if ((!task.audio || task.audio.ended) && (!task.video || task.video.ended)) {
        task.mediaSource.endOfStream()
        logger.info(`muxer ended, taskId: ${task.taskId}`)
      }
    }
    resource.track = track

    resource.packetEnded = false
    resource.ended = false
    resource.startTimestamp = 0n
    resource.frontBuffered = false
    resource.seekSync = null

    if (resource.loop) {
      resource.loop.destroy()
      resource.loop = null
    }

    if (resource.frontPacket) {
      task.avpacketPool.release(resource.frontPacket)
      resource.frontPacket = nullptr
    }

    if (resource.backPacket) {
      task.avpacketPool.release(resource.backPacket)
      resource.backPacket = nullptr
    }

    resource.pullQueue.ended = false
    resource.pullQueue.index = 0
    resource.pullQueue.frameCount = NOPTS_VALUE_BIGINT
    resource.pullQueue.lastPTS = 0n
    resource.pullQueue.lastDTS = 0n
    resource.pullQueue.diff = 0n
    resource.lastDTS = NOPTS_VALUE_BIGINT
  }

  public async addStream(
    taskId: string,
    streamIndex: int32,
    parameters: pointer<AVCodecParameters> | AVCodecParametersSerialize,
    timeBase: Rational,
    startPTS: int64,
    pullIPCPort: MessagePort,
    matrix?: number[]
  ) {
    const task = this.tasks.get(taskId)
    if (task) {
      const codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMallocz(sizeof(AVCodecParameters)))
      if (isPointer(parameters)) {
        copyCodecParameters(codecpar, parameters)
      }
      else {
        unserializeAVCodecParameters(parameters, codecpar)
      }

      const ioWriter = new IOWriter(1024 * 1024)
      const oformatContext = createAVOFormatContext()
      const oformat = new OMovFormat({
        fragmentMode: FragmentMode.FRAME,
        fragment: true,
        fastOpen: true,
        movMode: MovMode.MP4,
        defaultBaseIsMoof: true
      })

      const bufferQueue = new SeekableWriteBuffer()

      ioWriter.onFlush = (buffer) => {
        bufferQueue.write(buffer.slice())
        return 0
      }

      ioWriter.onSeek = (pos) => {
        return bufferQueue.seek(pos) ? 0 : errorType.INVALID_OPERATE
      }

      const stream = oformatContext.createStream()
      copyCodecParameters(addressof(stream.codecpar), codecpar)

      if (codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
        stream.codecpar.codecTag = mktag('.mp3')
      }
      if (matrix) {
        stream.metadata[AVStreamMetadataKey.MATRIX] = matrix
      }

      const useSampleRateTimeBase = codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
        && codecpar.frameSize
        && !task.isLive
        && avQ2D(timeBase) > avQ2D({ num: 1, den: codecpar.sampleRate })

      // 点播 frameSize 有并且时间基精度小于采样率精度则使用 sampleRate 作为时间基
      // 避免一些 mp4 ts 转为 flv 因为时间基精度损失导致的 pts 抖动
      // 当 pts 抖动时 mse 播放会有颤音
      if (useSampleRateTimeBase) {
        stream.timeBase.den = codecpar.sampleRate
        stream.timeBase.num = 1
      }
      else {
        stream.timeBase.den = timeBase.den
        stream.timeBase.num = timeBase.num
      }

      oformatContext.oformat = oformat
      oformatContext.ioWriter = ioWriter

      const track = new Track()

      const resource: MSEResource = {
        type: 'audio',
        codecpar,
        ioWriter,
        oformatContext,
        oformat,
        track,
        bufferQueue,
        streamIndex,
        pullIPC: new IPCPort(pullIPCPort),
        loop: null,
        frontPacket: nullptr,
        backPacket: nullptr,
        frontBuffered: false,
        startTimestamp: 0n,
        packetEnded: false,
        ended: false,
        seekSync: null,
        startPTS,
        lastDTS: NOPTS_VALUE_BIGINT,
        pullQueue: {
          queue: [],
          index: 0,
          frameCount: NOPTS_VALUE_BIGINT,
          diff: 0n,
          lastPTS: 0n,
          lastDTS: 0n,
          ended: false,
          useSampleRateTimeBase
        },
        enableRawMpeg: codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3 && !browser.firefox,
        timestampOffsetUpdated: false
      }

      track.onQuotaExceededError = () => {
        resource.startTimestamp -= 100n
      }
      track.onEnded = () => {
        if ((!task.audio || task.audio.ended) && (!task.video || task.video.ended)) {
          task.mediaSource.endOfStream()
          logger.info(`muxer ended, taskId: ${task.taskId}`)
        }
      }

      if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        task.audio = resource
        task.stats.sampleRate = codecpar.sampleRate
        task.stats.channels = codecpar.chLayout.nbChannels
      }
      else if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        resource.type = 'video'
        task.video = resource
        task.stats.width = codecpar.width
        task.stats.height = codecpar.height

        if (task.stats.width * task.stats.height > 3840 * 2160 && (browser.safari || os.ios)) {
          task.cacheDuration = bigint.max(3000n, task.cacheDuration)
        }
      }

      logger.debug(`add stream ${streamIndex}, taskId: ${taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async reAddStream(
    taskId: string,
    streamIndex: int32,
    parameters: pointer<AVCodecParameters> | AVCodecParametersSerialize,
    timeBase: Rational,
    startPTS: int64,
    matrix?: number[]
  ) {
    const task = this.tasks.get(taskId)
    if (task) {

      const codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMallocz(sizeof(AVCodecParameters)))
      if (isPointer(parameters)) {
        copyCodecParameters(codecpar, parameters)
      }
      else {
        unserializeAVCodecParameters(parameters, codecpar)
      }

      const resource = codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO ? task.audio : task.video
      if (resource) {

        resource.bufferQueue.flush()

        // 等待 track abort
        await new Promise<void>((resolve) => {
          resource.track.removeAllBuffer(() => {
            resolve()
          })
        })

        resource.track.reset()

        const oformat = new OMovFormat({
          fragmentMode: FragmentMode.FRAME,
          fragment: true,
          fastOpen: true,
          movMode: MovMode.MP4,
          defaultBaseIsMoof: true
        })
        resource.oformatContext.oformat = oformat

        if (resource.codecpar) {
          freeCodecParameters(resource.codecpar)
        }
        resource.codecpar = codecpar
        resource.streamIndex = streamIndex
        resource.startPTS = startPTS

        const stream = resource.oformatContext.streams[0]
        copyCodecParameters(addressof(stream.codecpar), codecpar)

        if (codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
          stream.codecpar.codecTag = mktag('.mp3')
        }
        if (matrix) {
          stream.metadata[AVStreamMetadataKey.MATRIX] = matrix
        }

        const useSampleRateTimeBase = codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
          && codecpar.frameSize
          && !task.isLive
          && avQ2D(timeBase) > avQ2D({ num: 1, den: codecpar.sampleRate })

        // 点播 frameSize 有并且时间基精度小于采样率精度则使用 sampleRate 作为时间基
        // 避免一些 mp4 ts 转为 flv 因为时间基精度损失导致的 pts 抖动
        // 当 pts 抖动时 mse 播放会有颤音
        if (useSampleRateTimeBase) {
          stream.timeBase.den = codecpar.sampleRate
          stream.timeBase.num = 1
        }
        else {
          stream.timeBase.den = timeBase.den
          stream.timeBase.num = timeBase.num
        }
        resource.enableRawMpeg = codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3 && !browser.firefox
        resource.timestampOffsetUpdated = false
        resource.pullQueue.useSampleRateTimeBase = useSampleRateTimeBase
        try {
          resource.track.changeMimeType(
            this.getMimeType(addressof(stream.codecpar)),
            resource.enableRawMpeg ? 'sequence' : 'segments'
          )
        }
        catch (error) {
          // firefox 会报这个错，但不影响播放，这里忽略
          if (!browser.firefox || error.message.indexOf('An attempt was made to use an object that is not') < 0) {
            throw error
          }
        }
        if (!resource.enableRawMpeg) {
          mux.open(resource.oformatContext)
          mux.writeHeader(resource.oformatContext)
        }
      }
      else {
        freeCodecParameters(codecpar)
      }

      logger.debug(`readd stream ${streamIndex}, taskId: ${taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async pause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (!task.audio?.loop && !task.video?.loop) {
        logger.fatal('task has not played')
      }
      task.pausing = true
      task.pauseTimestamp = getTimestamp()
      task.audio?.loop.stop()
      task.video?.loop.stop()
      if (task.fakePlayTimer) {
        task.fakePlayTimer.stop()
      }

      logger.debug(`pause taskId: ${taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async unpause(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (!task.audio?.loop && !task.video?.loop) {
        logger.fatal('task has not played')
      }

      task.pausing = false

      if (!task.seeking) {
        if (task.audio) {
          task.audio.startTimestamp += static_cast<int64>(getTimestamp() - task.pauseTimestamp)
          task.audio.loop.start()
        }
        if (task.video) {
          task.video.startTimestamp += static_cast<int64>(getTimestamp() - task.pauseTimestamp)
          task.video.loop.start()
        }
      }
      if (task.fakePlayTimer) {
        task.fakePlayTimer.start()
      }
      logger.debug(`unpause taskId: ${taskId}`)
    }
    else {
      logger.fatal('task not found')
    }
  }

  public async beforeSeek(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      // 当前正在 pull frontFrame，等待其结束
      const promise = []
      if (task.audio) {
        if (!task.audio.ended && !task.audio.frontBuffered) {
          promise.push(new Promise<void>((resolve) => {
            task.audio.seekSync = resolve
          }))
        }
      }
      if (task.video) {
        if (!task.video.ended && !task.video.frontBuffered) {
          promise.push(new Promise<void>((resolve) => {
            task.video.seekSync = resolve
          }))
        }
      }

      await Promise.all(promise)

      task.seeking = true

      task.audio?.loop.stop()
      task.video?.loop.stop()

      if (task.audio) {
        if (!task.audio.enableRawMpeg) {
          mux.flush(task.audio.oformatContext)
        }
        task.audio.bufferQueue.flush()

        if (browser.safari || os.ios) {
          await new Promise<void>((resolve) => {
            task.audio.track.removeAllBuffer(() => {
              resolve()
            })
          })
        }

        task.audio.track.reset()
        task.audio.packetEnded = false
        task.audio.timestampOffsetUpdated = false

        if (task.audio.backPacket) {
          task.avpacketPool.release(task.audio.backPacket)
          task.audio.backPacket = nullptr
        }
        if (task.audio.frontPacket) {
          task.avpacketPool.release(task.audio.frontPacket)
          task.audio.frontPacket = nullptr
        }
        if (task.audio.pullQueue.queue.length) {
          task.audio.pullQueue.queue.forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
        }
        task.audio.pullQueue.queue.length = 0
        task.audio.pullQueue.ended = false
        task.audio.pullQueue.index = 0
        task.audio.pullQueue.lastPTS = 0n
        task.audio.pullQueue.lastDTS = 0n
        task.audio.pullQueue.diff = 0n
        task.audio.pullQueue.frameCount = NOPTS_VALUE_BIGINT
        task.audio.lastDTS = NOPTS_VALUE_BIGINT
      }
      if (task.video) {
        if (!task.video.enableRawMpeg) {
          mux.flush(task.video.oformatContext)
        }
        task.video.bufferQueue.flush()

        if (browser.safari || os.ios) {
          await new Promise<void>((resolve) => {
            task.video.track.removeAllBuffer(() => {
              resolve()
            })
          })
        }

        task.video.track.reset()
        task.video.packetEnded = false
        task.video.timestampOffsetUpdated = false

        if (task.video.backPacket) {
          task.avpacketPool.release(task.video.backPacket)
          task.video.backPacket = nullptr
        }
        if (task.video.frontPacket) {
          task.avpacketPool.release(task.video.frontPacket)
          task.video.frontPacket = nullptr
        }
        if (task.video.pullQueue.queue.length) {
          task.video.pullQueue.queue.forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
        }
        task.video.pullQueue.queue.length = 0
        task.video.pullQueue.ended = false
        task.video.pullQueue.index = 0
        task.video.pullQueue.diff = 0n
        task.video.pullQueue.lastPTS = 0n
        task.video.pullQueue.lastDTS = 0n
        task.video.lastDTS = NOPTS_VALUE_BIGINT
      }

      logger.debug(`before seek end taskId: ${taskId}`)
    }
  }

  public async afterSeek(taskId: string, timestamp: int64) {
    const task = this.tasks.get(taskId)
    if (task) {

      let audioRealTimestamp = timestamp
      let videoRealTimestamp = timestamp
      let firstIsKeyframe = await this.syncToKeyframe(task)

      if (task.audio && task.audio.backPacket > 0) {
        if (!firstIsKeyframe || timestamp < 0n) {
          audioRealTimestamp = avRescaleQ2(task.audio.backPacket.pts, addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
        }
        task.audio.backPacket.streamIndex = task.audio.oformatContext.streams[0].index
        this.writeAVPacket(task.audio.backPacket, task.audio)
        task.avpacketPool.release(task.audio.backPacket)
        task.audio.backPacket = nullptr
      }
      if (task.video && task.video.backPacket > 0) {
        if (!firstIsKeyframe || timestamp < 0n) {
          videoRealTimestamp = avRescaleQ2(task.video.backPacket.pts, addressof(task.video.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
        }
        task.video.backPacket.streamIndex = task.video.oformatContext.streams[0].index
        this.writeAVPacket(task.video.backPacket, task.video)
        task.avpacketPool.release(task.video.backPacket)
        task.video.backPacket = nullptr
      }

      const realTimestamp = bigint.max(audioRealTimestamp, videoRealTimestamp)

      // 缓存一定的 buffer
      while (true) {
        if (task.audio && !task.audio.packetEnded) {
          task.audio.backPacket = await this.pullAVPacket(task.audio, task)
          if (task.audio.backPacket < 0) {
            task.audio.packetEnded = true
            task.audio.backPacket = nullptr

            if (!task.video || task.video.packetEnded) {
              break
            }
          }
          if (audioRealTimestamp < 0n) {
            audioRealTimestamp = avRescaleQ2(task.audio.backPacket.pts, addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
          }

          if (avRescaleQ2((task.audio.backPacket.pts), addressof(task.audio.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
            < realTimestamp + task.cacheDuration
          ) {
            task.audio.backPacket.streamIndex = task.audio.oformatContext.streams[0].index

            this.writeAVPacket(task.audio.backPacket, task.audio)
            if (!task.audio.enableRawMpeg) {
              mux.flush(task.audio.oformatContext)
            }

            task.audio.track.addBuffer(task.audio.bufferQueue.flush())
            task.avpacketPool.release(task.audio.backPacket)
            task.audio.backPacket = nullptr
          }
          else {
            break
          }
        }
        if (task.video && !task.video.packetEnded) {
          task.video.backPacket = await this.pullAVPacket(task.video, task)
          if (task.video.backPacket < 0) {
            task.video.packetEnded = true
            task.video.backPacket = nullptr

            if (!task.audio || task.audio.packetEnded) {
              break
            }
          }
          if (avRescaleQ2(task.video.backPacket.pts, addressof(task.video.backPacket.timeBase), AV_MILLI_TIME_BASE_Q)
            < realTimestamp + task.cacheDuration
          ) {
            task.video.backPacket.streamIndex = task.video.oformatContext.streams[0].index
            this.writeAVPacket(task.video.backPacket, task.video)
            if (!task.video.enableRawMpeg) {
              mux.flush(task.video.oformatContext)
            }
            task.video.track.addBuffer(task.video.bufferQueue.flush())
            task.avpacketPool.release(task.video.backPacket)
            task.video.backPacket = nullptr
          }
          else {
            break
          }
        }
      }

      const promises = []

      if (task.audio) {
        if (!task.audio.enableRawMpeg) {
          mux.flush(task.audio.oformatContext)
        }
        promises.push(new Promise<void>((resolve) => {
          task.audio.track.addBuffer(task.audio.bufferQueue.flush(), () => {
            resolve()
          })
        }))
      }

      if (task.video) {
        if (!task.video.enableRawMpeg) {
          mux.flush(task.video.oformatContext)
        }
        promises.push(new Promise<void>((resolve) => {
          task.video.track.addBuffer(task.video.bufferQueue.flush(), () => {
            resolve()
          })
        }))
      }

      await Promise.all(promises)

      if (task.audio && !task.audio.packetEnded) {
        if (task.audio.backPacket <= 0) {
          task.audio.backPacket = await this.pullAVPacket(task.audio, task)
          if (task.audio.backPacket < 0) {
            task.audio.packetEnded = true
            task.audio.backPacket = nullptr
          }
        }
        if (!task.audio.packetEnded) {
          task.audio.frontPacket = await this.pullAVPacket(task.audio, task)
          if (task.audio.frontPacket < 0) {
            task.audio.frontPacket = nullptr
            task.audio.packetEnded = true
            task.audio.frontBuffered = false
          }
          else {
            task.audio.packetEnded = false
            task.audio.frontBuffered = true
          }
          task.audio.startTimestamp = static_cast<int64>(getTimestamp()) - (audioRealTimestamp + task.cacheDuration + avRescaleQ(
            task.audio.startPTS,
            task.audio.oformatContext.streams[0].timeBase,
            AV_MILLI_TIME_BASE_Q
          )
          ) * 100n / task.playRate

          if (task.pausing) {
            task.pauseTimestamp = getTimestamp()
          }
          else {
            task.audio.loop.start()
          }
        }
      }

      if (task.video && !task.video.packetEnded) {
        if (task.video.backPacket <= 0) {
          task.video.backPacket = await this.pullAVPacket(task.video, task)
          if (task.video.backPacket < 0) {
            task.video.packetEnded = true
            task.video.backPacket = nullptr
          }
        }
        if (!task.video.packetEnded) {
          task.video.frontPacket = await this.pullAVPacket(task.video, task)
          if (task.video.frontPacket < 0) {
            task.video.packetEnded = true
            task.video.frontBuffered = false
            task.video.frontPacket = nullptr
          }
          else {
            task.video.packetEnded = false
            task.video.frontBuffered = true
          }
          task.video.startTimestamp = static_cast<int64>(getTimestamp()) - (videoRealTimestamp + task.cacheDuration + avRescaleQ(
            task.video.startPTS,
            task.video.oformatContext.streams[0].timeBase,
            AV_MILLI_TIME_BASE_Q
          )
          ) * 100n / task.playRate

          if (task.pausing) {
            task.pauseTimestamp = getTimestamp()
          }
          else {
            task.video.loop.start()
          }
        }
      }

      await Promise.all([
        new Promise<void>((resolve) => {
          if (task.audio) {
            task.audio.track.insertEnqueueCallback(resolve)
          }
          else {
            resolve()
          }
        }),
        new Promise<void>((resolve) => {
          if (task.video) {
            task.video.track.insertEnqueueCallback(resolve)
          }
          else {
            resolve()
          }
        })
      ])

      let min = 0
      let max = 0

      if (task.audio) {
        if (task.video) {
          min = Math.max(task.audio.track.getBufferedStart(), task.video.track.getBufferedStart())
          max = Math.min(task.audio.track.getBufferedEnd(), task.video.track.getBufferedEnd())
        }
        else {
          min = task.audio.track.getBufferedStart()
          max = task.audio.track.getBufferedEnd()
        }
      }
      else if (task.video) {
        min = task.video.track.getBufferedStart()
        max = task.video.track.getBufferedEnd()
      }

      let seekTime = milliSecond2Second(realTimestamp)

      if (!(seekTime >= min && seekTime <= max)) {
        seekTime = Math.abs(seekTime - min) > Math.abs(seekTime - max) ? max : min
      }

      task.currentTimeNTP = getTimestamp()
      task.currentTime = seekTime
      task.seeking = false

      logger.debug(`after seek end, seekTime: ${seekTime} taskId: ${taskId}`)

      return seekTime
    }
    return 0
  }

  public async setPlayRate(taskId: string, rate: double) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.enableJitterBuffer) {
        let buffer = task.stats.audioEncodeFramerate
          ? (task.stats.audioPacketQueueLength / task.stats.audioEncodeFramerate * 1000)
          : (task.stats.videoEncodeFramerate
            ? (task.stats.videoPacketQueueLength / task.stats.videoEncodeFramerate * 1000)
            : 0
          )
        if (buffer && buffer <= task.stats.jitterBuffer.min) {
          rate = 1
        }
      }

      task.targetRate = static_cast<int64>(Math.floor(rate * 100))

      if (!task.enableJitterBuffer) {
        if (task.audio && task.audio.loop) {
          task.audio.loop.resetInterval()
        }
        if (task.video && task.video.loop) {
          task.video.loop.resetInterval()
        }
      }
    }
  }

  public async restart(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.audio) {
        this.resetResource(task.audio, task)
      }
      if (task.video) {
        this.resetResource(task.video, task)
      }

      const mediaSource = new (getMediaSource())()

      mediaSource.onsourceopen = this.getSourceOpenHandler(task)

      task.mediaSource = mediaSource
    }
  }

  public async setCurrentTime(taskId: string, time: number) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.audio) {
        task.audio.track.removeBuffer(time)
      }
      if (task.video) {
        if (task.stats.keyFrameInterval > 0) {
          task.video.track.setMediaBufferMax(Math.max(
            task.video.track.getMediaBufferMax(),
            Math.ceil(task.stats.keyFrameInterval / 1000 * 1.5),
            10
          ))
          task.video.track.removeBuffer(time)
        }
      }
      task.currentTime = time
      task.currentTimeNTP = getTimestamp()
    }
    else {
      logger.fatal('task not found')
    }
  }

  private async checkWaiting(task: SelfTask) {
    let seekAudio = -1
    let seekVideo = -1
    const currentTime = task.currentTime + (getTimestamp() - task.currentTimeNTP) / 1000
    if (task.audio) {
      const sourceBuffer = task.audio.track.getSourceBuffer()
      if (sourceBuffer && sourceBuffer.buffered.length === 2) {
        if (sourceBuffer.buffered.end(1) - sourceBuffer.buffered.start(1) >= task.maxBuffer
          && sourceBuffer.buffered.end(0) < currentTime
          && task.currentTime < sourceBuffer.buffered.start(1)
        ) {
          seekAudio = sourceBuffer.buffered.start(1)
        }
      }
    }
    if (task.video) {
      const sourceBuffer = task.video.track.getSourceBuffer()
      if (sourceBuffer && sourceBuffer.buffered.length === 2) {
        if (sourceBuffer.buffered.end(1) - sourceBuffer.buffered.start(1) >= task.maxBuffer
          && sourceBuffer.buffered.end(0) < currentTime
          && task.currentTime < sourceBuffer.buffered.start(1)
        ) {
          seekVideo = sourceBuffer.buffered.start(1)
        }
      }
    }
    if (task.audio && task.video) {
      if (seekAudio > 0 && seekVideo > 0) {
        const seek = Math.min(seekAudio, seekVideo)
        task.currentTime = seek
        task.controlIPCPort.notify('seek', {
          time: seek
        })
      }
    }
    else if (seekAudio > 0) {
      task.currentTime = seekAudio
      task.controlIPCPort.notify('seek', {
        time: seekAudio
      })
    }
    else if (seekVideo > 0) {
      task.currentTime = seekVideo
      task.controlIPCPort.notify('seek', {
        time: seekVideo
      })
    }
  }

  public async getMediaSource(taskId: string): Promise<MediaSource> {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.mediaSource.handle) {
        this.getMediaSource.transfer.push(task.mediaSource.handle)
        return task.mediaSource.handle
      }
      else {
        return task.mediaSource
      }
    }
    else {
      logger.fatal('task not found')
    }
  }

  private createTask(options: MSETaskOptions, startTimestamp: int64): number {

    const controlIPCPort = new IPCPort(options.controlPort)
    const mediaSource = new (getMediaSource())()

    const task: SelfTask = {
      ...options,
      mediaSource,
      audio: null,
      video: null,
      playRate: 100n,
      targetRate: 100n,
      pauseTimestamp: 0,
      seeking: false,
      pausing: false,
      controlIPCPort,
      currentTime: 0,
      currentTimeNTP: 0,
      cacheDuration: static_cast<int64>(0.5 * 1000),
      avpacketPool: new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex),
      maxBuffer: options.isLive ? 1 : 4,
      minBuffer: options.isLive ? 0.5 : 2,
      visibilityHidden: false,
      fakePlayTimer: null
    }
    this.tasks.set(options.taskId, task)

    mediaSource.onsourceopen = this.getSourceOpenHandler(task, startTimestamp)

    controlIPCPort.on(NOTIFY, (message: RpcMessage) => {
      if (message.method === 'visibilitychange') {
        this.setVisibilityHidden(options.taskId, message.params.visibilityHidden)
      }
    })

    return 0
  }

  public async setVisibilityHidden(taskId: string, visibilityHidden: boolean) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.visibilityHidden = visibilityHidden
      if (visibilityHidden) {
        if (task.isLive && task.video && !task.audio) {
          if (task.fakePlayTimer) {
            task.fakePlayTimer.destroy()
          }
          task.fakePlayTimer = new WorkerTimer(() => {
            this.setCurrentTime(task.taskId, task.currentTime + (getTimestamp() - task.currentTimeNTP) / 1000)
          }, 0, 1000)
          task.fakePlayTimer.start()
        }
      }
      else {
        if (task.fakePlayTimer) {
          task.fakePlayTimer.destroy()
          task.fakePlayTimer = null
          const cachedTime = task.video.track.getBufferedTime()
          if (cachedTime > (task.isLive ? 2 : 4)) {
            this.setCurrentTime(task.taskId, Math.max(task.video.track.getBufferedEnd() - (task.isLive ? 1 : 4), task.video.track.getBufferedStart()))
            task.controlIPCPort.notify('seek', {
              time: task.currentTime
            })
          }
        }
      }
    }
  }

  public async registerTask(options: MSETaskOptions, startTimestamp: int64 = 0n): Promise<number> {
    if (this.tasks.has(options.taskId)) {
      return errorType.INVALID_OPERATE
    }
    return this.createTask(options, startTimestamp)
  }

  public async unregisterTask(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (task) {
      if (task.audio) {
        if (task.audio.loop) {
          await task.audio.oformatContext.destroy()
          task.audio.loop.destroy()
        }
        if (task.audio.pullIPC) {
          task.audio.pullIPC.destroy()
        }
        if (task.audio.pullQueue.queue.length) {
          task.audio.pullQueue.queue.forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
          task.audio.pullQueue.queue.length = 0
        }
        if (task.audio.codecpar) {
          freeCodecParameters(task.audio.codecpar)
        }
      }
      if (task.video) {
        if (task.video.loop) {
          await task.video.oformatContext.destroy()
          task.video.loop.destroy()
        }
        if (task.video.pullIPC) {
          task.video.pullIPC.destroy()
        }
        if (task.video.pullQueue.queue.length) {
          task.video.pullQueue.queue.forEach((avpacket) => {
            task.avpacketPool.release(avpacket)
          })
          task.video.pullQueue.queue.length = 0
        }
        if (task.video.codecpar) {
          freeCodecParameters(task.video.codecpar)
        }
      }
      if (task.controlIPCPort) {
        task.controlIPCPort.destroy()
      }
      this.tasks.delete(id)
    }
  }
}
