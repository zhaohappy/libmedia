/*
 * libmedia AVFormatContext
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

import type OFormat from './formats/OFormat'
import type IFormat from './formats/IFormat'

import {
  AVFormat,
  AVMediaType,
  type AVCodecID,
  type AVPacket,
  type AVStreamGroupInterface,
  type AVStreamGroupParamsType,
  type AVStreamInterface,
  AVStream,
  AVDisposition,
  AVStreamGroup,
  type AVRational,
  destroyAVPacket
} from '@libmedia/avutil'

import type {
  IOWriterSync,
  IOReader,
  IOWriter,
  IOReaderSync
} from '@libmedia/common/io'

import { type WebAssemblyResource, getUniqueCounter32 } from '@libmedia/cheap'

export interface AVChapter {
  /**
   * 章节 id
   */
  id: uint64
  /**
   * 时间基
   */
  timeBase: AVRational
  /**
   * 开始时间
   */
  start: int64
  /**
   * 结束时间
   */
  end: int64
  /**
   * 元数据
   */
  metadata: Record<string, any>
}

class AVFormatContextInterval {

  public packetBuffer: pointer<AVPacket>[]

  constructor() {
    this.packetBuffer = []
  }
}

export interface AVIFormatContext {
  metadata: Record<string, any>
  streams: AVStream[]
  streamGroups: AVStreamGroup[]

  options: Record<string, any>
  chapters: AVChapter[]

  privateData: Record<string, any>
  privateData2: Record<string, any>

  format: AVFormat
  iformat: IFormat

  ioReader: IOReader
  ioWriter: IOWriter

  errorFlag: number

  interval: AVFormatContextInterval

  streamIndex: number
  streamGroupIndex: number

  getStreamById(id: number): AVStream
  getStreamGroupById(id: number): AVStreamGroup

  getStreamByIndex(index: number): AVStream
  getStreamGroupByIndex(index: number): AVStreamGroup

  getStreamByMediaType(mediaType: AVMediaType): AVStream
  getStreamGroupByGroupType(groupType: AVStreamGroupParamsType): AVStreamGroup

  createStream(): AVStream
  createStreamGroup(type: AVStreamGroupParamsType): AVStreamGroup

  addStream(stream: AVStream): void
  addStreamGroup(group: AVStreamGroup): void
  addStreamToStreamGroup(group: AVStreamGroup, stream: AVStream): void

  removeStream(stream: AVStream): void
  removeStreamGroup(group: AVStreamGroup): void

  removeStreamById(id: number): void
  removeStreamGroupById(id: number): void

  removeStreamByIndex(index: number): void
  removeStreamGroupByIndex(index: number): void

  destroy(): Promise<void>

  getDecoderResource: (mediaType: AVMediaType, codecId: AVCodecID) => Promise<WebAssemblyResource> | WebAssemblyResource
}

export interface AVOFormatContext {

  metadataHeaderPadding: int32

  metadata: Record<string, any>
  streams: AVStream[]
  streamGroups: AVStreamGroup[]

  options: Record<string, any>
  chapters: AVChapter[]

  privateData: Record<string, any>
  privateData2: Record<string, any>

  format: AVFormat
  oformat: OFormat

  ioWriter: IOWriterSync

  errorFlag: number

  interval: AVFormatContextInterval

  streamIndex: number
  streamGroupIndex: number

  getStreamById(id: number): AVStream
  getStreamGroupById(id: number): AVStreamGroup

  getStreamByIndex(index: number): AVStream
  getStreamGroupByIndex(index: number): AVStreamGroup

  getStreamByMediaType(mediaType: AVMediaType): AVStream
  getStreamGroupByGroupType(groupType: AVStreamGroupParamsType): AVStreamGroup

  createStream(): AVStream
  createStreamGroup(type: AVStreamGroupParamsType): AVStreamGroup

  addStream(stream: AVStream): void
  addStreamGroup(group: AVStreamGroup): void
  addStreamToStreamGroup(group: AVStreamGroup, stream: AVStream): void

  removeStream(stream: AVStream): void
  removeStreamGroup(group: AVStreamGroup): void

  removeStreamById(id: number): void
  removeStreamGroupById(id: number): void

  removeStreamByIndex(index: number): void
  removeStreamGroupByIndex(index: number): void

  destroy(): Promise<void>
}

export interface AVFormatContextInterface {
  metadata: Record<string, any>
  format: AVFormat
  streams: AVStreamInterface[]
  streamGroups: AVStreamGroupInterface[]
  chapters: AVChapter[]
}

export class AVFormatContext {

  public metadataHeaderPadding = -1

  public metadata: Record<string, any>
  public streams: AVStream[]
  public streamGroups: AVStreamGroup[]

  public options: Record<string, any>
  public chapters: AVChapter[]

  public privateData: Record<string, any>
  public privateData2: Record<string, any>

  public iformat: IFormat
  public oformat: OFormat

  public ioReader: IOReader | IOReaderSync
  public ioWriter: IOWriter | IOWriterSync

  public errorFlag: number

  public interval: AVFormatContextInterval

  public streamIndex: number
  public streamGroupIndex: number

  public getDecoderResource: (mediaType: AVMediaType, codecId: AVCodecID) => Promise<WebAssemblyResource> | WebAssemblyResource = null

  constructor() {
    this.streams = []
    this.streamGroups = []
    this.errorFlag = 0
    this.streamIndex = 0
    this.streamGroupIndex = 0
    this.interval = new AVFormatContextInterval()

    this.options = {}
    this.privateData = {}
    this.metadata = {}
    this.chapters = []
  }

  get format() {
    if (this.iformat) {
      return this.iformat.type
    }
    else if (this.oformat) {
      return this.oformat.type
    }
    return AVFormat.UNKNOWN
  }

  public getStreamById(id: number) {
    return this.streams.find((stream) => stream.id === id)
  }
  public getStreamGroupById(id: number) {
    return this.streamGroups.find((group) => group.id === id)
  }

  public getStreamByIndex(index: number) {
    return this.streams.find((stream) => stream.index === index)
  }
  public getStreamGroupByIndex(index: number) {
    return this.streamGroups.find((group) => group.index === index)
  }

  public getStreamByMediaType(mediaType: AVMediaType) {
    return this.streams.find((stream) => stream.codecpar?.codecType === mediaType && !(stream.disposition & AVDisposition.ATTACHED_PIC))
  }
  public getStreamGroupByGroupType(groupType: AVStreamGroupParamsType) {
    return this.streamGroups.find((group) => group.type === groupType)
  }

  public getAttachmentPicture() {
    return this.streams.find((stream) => stream.codecpar?.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO && (stream.disposition & AVDisposition.ATTACHED_PIC))
  }

  public createStream() {
    const stream = new AVStream()
    stream.index = this.streamIndex++
    stream.id = reinterpret_cast<int32>(getUniqueCounter32())

    this.removeStreamByIndex(stream.index)
    this.streams.push(stream)

    return stream
  }
  public createStreamGroup(type: AVStreamGroupParamsType) {
    const group = new AVStreamGroup()
    group.index = this.streamGroupIndex++
    group.type = type
    group.id = reinterpret_cast<int32>(getUniqueCounter32())

    this.removeStreamGroupByIndex(group.index)
    this.streamGroups.push(group)

    return group
  }

  public addStream(stream: AVStream) {
    this.removeStreamByIndex(stream.index)
    this.streams.push(stream)
  }
  public addStreamGroup(group: AVStreamGroup) {
    this.removeStreamGroupByIndex(group.index)
    this.streamGroups.push(group)
  }

  public addStreamToStreamGroup(group: AVStreamGroup, stream: AVStream) {
    if (group.streams.some((s) => s === stream)) {
      return
    }
    group.streams.push(stream)
  }

  public removeStream(stream: AVStream) {
    this.removeStreamByIndex(stream.index)
  }
  public removeStreamGroup(group: AVStreamGroup) {
    this.removeStreamGroupByIndex(group.index)
  }

  public removeStreamById(id: number) {
    const index = this.streams.findIndex((stream) => stream.id === id)

    if (index > -1) {
      const st = this.streams.splice(index, 1)
      if (st[0]) {
        st[0].destroy()
      }
    }
  }
  public removeStreamGroupById(id: number) {
    const index = this.streamGroups.findIndex((group) => group.id === id)

    if (index > -1) {
      const st = this.streamGroups.splice(index, 1)
      if (st[0]) {
        st[0].destroy()
      }
    }
  }

  public removeStreamByIndex(i: number) {

    const index = this.streams.findIndex((stream) => stream.index === i)

    if (index > -1) {
      const st = this.streams.splice(index, 1)
      if (st[0]) {
        st[0].destroy()
      }
    }
  }
  public removeStreamGroupByIndex(i: number) {

    const index = this.streamGroups.findIndex((group) => group.index === i)

    if (index > -1) {
      const st = this.streamGroups.splice(index, 1)
      if (st[0]) {
        st[0].destroy()
      }
    }
  }

  public async destroy() {

    if (this.oformat) {
      this.oformat.destroy(this as AVOFormatContext)
    }
    if (this.iformat) {
      await this.iformat.destroy(this as AVIFormatContext)
    }

    if (this.interval.packetBuffer.length) {
      this.interval.packetBuffer.forEach((avpacket) => {
        destroyAVPacket(avpacket)
      })
    }

    this.streams.forEach((stream) => {
      stream.destroy()
    })
    this.streams = []
    this.interval = null
    this.ioReader = this.ioWriter = null
    this.oformat = this.iformat = null
  }
}

/**
 * 创建 AVIFormatContext
 * 
 * @returns 
 */
export function createAVIFormatContext() {
  return new AVFormatContext() as AVIFormatContext
}

/**
 * 创建 AVOFormatContext
 * 
 * @returns 
 */
export function createAVOFormatContext() {
  return new AVFormatContext() as AVOFormatContext
}
