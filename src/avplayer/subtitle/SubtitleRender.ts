/*
 * libmedia subtitle render
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

import SubtitleDecoder from 'avcodec/subtitle/SubtitleDecoder'
import IPCPort from 'common/network/IPCPort'
import LoopTask from 'common/timer/LoopTask'
import * as logger from 'common/util/logger'
import AssRender from './AssRender'
import { AVSubtitleType } from 'avutil/struct/avsubtitle'
import { AVPacketPool, AVPacketRef } from 'avutil/struct/avpacket'
import { IOError } from 'common/io/error'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { AVCodecID } from 'avutil/codec'
import * as text from 'common/util/text'
import { mapUint8Array } from 'cheap/std/memory'
import { AssEvent, AssEventType } from 'avformat/formats/ass/ass'
import * as iass from 'avformat/formats/ass/iass'
import List from 'cheap/std/collection/List'
import { Mutex } from 'cheap/thread/mutex'
import AVPacketPoolImpl from 'avutil/implement/AVPacketPoolImpl'
import { avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q } from 'avutil/constant'
import * as object from 'common/util/object'
import { destroyAVPacket } from 'avutil/util/avpacket'

export interface SubtitleRenderOptions {
  delay?: int64
  getCurrentTime: () => int64
  avpacketList?: pointer<List<pointer<AVPacketRef>>>
  avpacketListMutex?: pointer<Mutex>
  codecpar: pointer<AVCodecParameters>
  dom: HTMLElement
  container: HTMLElement
  videoWidth: int32
  videoHeight: int32
}

const WebVttReplace = [
  {
    reg: /<i>/g,
    value: '{\\i1}'
  },
  {
    reg: /<\/i>/g,
    value: '{\\i0}'
  },
  {
    reg: /<b>/g,
    value: '{\\b1}'
  },
  {
    reg: /<\/b>/g,
    value: '{\\b0}'
  },
  {
    reg: /<u>/g,
    value: '{\\u1}'
  },
  {
    reg: /<\/u>/g,
    value: '{\\u0}'
  },
  {
    reg: /{/g,
    value: '\\{'
  },
  {
    reg: /}/g,
    value: '\\}'
  },
  {
    reg: /&gt;/g,
    value: '>'
  },
  {
    reg: /&lt;/g,
    value: '<'
  },
  {
    reg: /&lrm;/g,
    value: ''
  },
  {
    reg: /&rlm;/g,
    value: ''
  },
  {
    reg: /&amp;/g,
    value: '&'
  },
  {
    reg: /&nbsp;/g,
    value: '\\h'
  },
  {
    reg: /(<br\s*\/?>)|\n>/g,
    value: '\\N'
  }
]

export default class SubtitleRender {

  private decoder: SubtitleDecoder

  private loop: LoopTask

  private demuxer2SubtitleRenderChannels: Map<string, MessageChannel>
  private leftPorts: Map<string, IPCPort>
  private currentPort: string

  private render: AssRender

  private queue: AssEvent[]

  private ended: boolean

  private options: SubtitleRenderOptions

  private pulling: boolean

  private formats: string[]

  private avpacketPool: AVPacketPool

  private delay: int64

  private enable: boolean

  constructor(options: SubtitleRenderOptions) {
    this.options = object.extend({}, options)
    this.ended = false
    this.pulling = false
    this.queue = []
    this.delay = 0n
    this.demuxer2SubtitleRenderChannels = new Map()
    this.leftPorts = new Map()

    if (options.avpacketList) {
      this.avpacketPool = new AVPacketPoolImpl(accessof(options.avpacketList), options.avpacketListMutex)
    }

    this.createDecoder()

    this.render = new AssRender(this.options.dom, {
      header: this.getAssHeader(this.options.codecpar),
      container: this.options.container,
      videoWidth: this.options.videoWidth,
      videoHeight: this.options.videoHeight
    })

    this.loop = new LoopTask(() => {

      if (!this.queue.length && this.ended) {
        this.loop.stop()
      }

      if (this.queue.length < 6 && !this.ended) {
        this.pull()
      }

      const currentTime = this.options.getCurrentTime() - this.delay

      this.render.clear(currentTime)

      while (this.queue.length) {
        const event = this.queue[0]
        if (event.Start > currentTime) {
          break
        }
        if (event.End > currentTime) {
          this.render.render(event)
        }
        this.queue.shift()
      }
    }, 0, 50, false)
  }

  private getAssHeader(codecpar: pointer<AVCodecParameters>) {
    let header = ''
    if (codecpar.codecId === AVCodecID.AV_CODEC_ID_ASS && codecpar.extradataSize) {
      header = text.decode(mapUint8Array(codecpar.extradata, reinterpret_cast<size>(codecpar.extradataSize)))
      const lines = header.split(/\r?\n/)
      let hasEvent = false
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line === '[Events]') {
          hasEvent = true
        }
        if (/^Format:/.test(line) && hasEvent) {
          this.formats = iass.parseEventFormat(line.trim())
        }
      }
    }
    return header
  }

  private createDecoder() {
    if (this.decoder) {
      this.decoder.close()
    }
    this.decoder = new SubtitleDecoder({
      onReceiveSubtitle: (subtitle) => {
        for (let i = 0; i < subtitle.rects.length; i++) {
          const rect = subtitle.rects[i]
          if (rect.type === AVSubtitleType.SUBTITLE_ASS) {
            const event = iass.parseEvent(this.formats, rect.text)
            if (event.Start == null) {
              event.Start = subtitle.pts
            }
            if (event.End == null) {
              event.End = subtitle.pts + subtitle.duration
            }
            this.queue.push(event)
          }
          else if (rect.type === AVSubtitleType.SUBTITLE_WEBVTT) {
            this.queue.push(this.webvtt2AssEvent(rect.text, subtitle.pts, subtitle.pts + subtitle.duration))
          }
          else {
            this.queue.push(this.text2AssEvent(rect.text, subtitle.pts, subtitle.pts + subtitle.duration))
          }
        }
      }
    })
    this.decoder.open(this.options.codecpar)
  }

  private text2AssEvent(text: string, start: int64, end: int64) {
    return {
      type: AssEventType.Dialogue,
      ReadOrder: 0,
      Layer: 0,
      Start: start,
      End: end,
      Style: 'Default',
      Name: '',
      MarginL: 0,
      MarginR: 0,
      MarginV: 0,
      Text: {
        raw: text,
        combined: text,
        parsed: [
          {
            tags: [],
            text: text,
            drawing: []
          }
        ]
      }
    }
  }

  private webvtt2AssEvent(text: string, start: int64, end: int64) {
    for (let i = 0; i < WebVttReplace.length; i++) {
      text = text.replace(WebVttReplace[i].reg, WebVttReplace[i].value)
    }
    return this.text2AssEvent(text, start, end)
  }

  private async pull() {
    if (this.pulling && !this.ended) {
      return
    }
    this.pulling = true
    const currentPort = this.currentPort
    const avpacket = await this.leftPorts.get(this.currentPort).request<pointer<AVPacketRef>>('pull')
    if (avpacket === IOError.END) {
      logger.debug('SubtitleRender end')
      this.decoder?.flush()
      this.ended = true
    }
    else if (avpacket < 0) {
      logger.debug(`SubtitleRender pull avpacket error, ret: ${avpacket}`)
      this.ended = true
    }
    else if (this.loop && currentPort === this.currentPort) {
      avpacket.pts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
      avpacket.duration = avRescaleQ2(avpacket.duration, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
      const ret = this.decoder.decode(avpacket)
      if (this.avpacketPool) {
        this.avpacketPool.release(avpacket)
      }
      else {
        destroyAVPacket(avpacket)
      }
      if (ret < 0) {
        logger.debug(`SubtitleRender decode avpacket error, ret: ${avpacket}`)
        this.ended = true
      }
    }
    else {
      if (this.avpacketPool) {
        this.avpacketPool.release(avpacket)
      }
      else {
        destroyAVPacket(avpacket)
      }
    }
    this.pulling = false
  }

  public getDemuxerPort(taskId: string) {
    if (this.demuxer2SubtitleRenderChannels.has(taskId)) {
      return this.demuxer2SubtitleRenderChannels.get(taskId).port1
    }
    const messageChannel = new MessageChannel()
    const ipcPort = new IPCPort(messageChannel.port2)
    this.demuxer2SubtitleRenderChannels.set(taskId, messageChannel)
    this.leftPorts.set(taskId, ipcPort)
    return messageChannel.port1
  }

  public start() {
    if (!this.loop.isStarted()) {
      this.loop.start()
    }
    this.ended = false
  }

  public stop() {
    this.loop.stop()
    this.render.clearAll()
  }

  public pause() {
    this.loop.stop()
  }

  public reset() {
    this.queue.length = 0
    this.render.clearAll()
  }

  public reopenDecoder(codecpar: pointer<AVCodecParameters>) {
    this.options.codecpar = codecpar
    this.createDecoder()
    this.render.updateHeader(this.getAssHeader(codecpar))
  }

  public updateVideoResolution(videoWidth: number, videoHeight: number) {
    if (videoWidth !== this.options.videoWidth || videoHeight !== this.options.videoHeight) {
      this.render.updateVideoResolution(videoWidth, videoHeight)
      this.options.videoWidth = videoWidth
      this.options.videoHeight = videoHeight
    }
  }

  public setDemuxTask(taskId: string) {
    if (this.currentPort !== taskId) {
      this.pulling = false
    }
    this.currentPort = taskId
  }

  public destroy() {
    this.loop.destroy()
    this.loop = null
    this.leftPorts.clear()
    this.demuxer2SubtitleRenderChannels.clear()
    this.queue.length = 0
    this.render.destroy()
    this.render = null
    this.decoder.close()
    this.decoder = null
  }

  public setDelay(d: int64) {
    this.delay = d
  }

  public getDelay() {
    return this.delay
  }
}
