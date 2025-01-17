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

import { AVCodecID, AVMediaType } from 'avutil/codec'

import AVStream, { AVStreamInterface } from 'avutil/AVStream'
import AVPacket from 'avutil/struct/avpacket'

import OFormat from './formats/OFormat'
import IFormat from './formats/IFormat'

import IOWriterSync from 'common/io/IOWriterSync'
import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriter'
import IOReaderSync from 'common/io/IOReaderSync'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import { AVFormat } from 'avutil/avformat'
import { destroyAVPacket } from 'avutil/util/avpacket'
import { Rational } from 'avutil/struct/rational'
import * as staticData from 'cheap/staticData'
import { Mutex, lock, unlock } from 'cheap/thread/mutex'

// 在静态区分配 stream 计数器和计数器操作锁
const streamCounter: pointer<int32> = reinterpret_cast<pointer<int32>>(staticData.malloc(sizeof(int32), sizeof(int32)))
const streamCounterMutex: pointer<Mutex> = reinterpret_cast<pointer<Mutex>>(staticData.malloc(sizeof(Mutex), sizeof(atomic_int32)))

export interface AVChapter {
  /**
   * 章节 id
   */
  id: uint64
  /**
   * 时间基
   */
  timeBase: Rational
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

  getStreamById(id: number): AVStream

  getStreamByIndex(index: number): AVStream

  getStreamByMediaType(mediaType: AVMediaType): AVStream

  createStream(): AVStream

  addStream(stream: AVStream): void

  removeStream(stream: AVStream): void

  removeStreamById(id: number): void

  removeStreamByIndex(index: number): void

  destroy(): Promise<void>

  getDecoderResource: (mediaType: AVMediaType, codecId: AVCodecID) => Promise<WebAssemblyResource> | WebAssemblyResource
}

export interface AVOFormatContext {

  metadataHeaderPadding: int32

  metadata: Record<string, any>
  streams: AVStream[]

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

  getStreamById(id: number): AVStream

  getStreamByIndex(index: number): AVStream

  getStreamByMediaType(mediaType: AVMediaType): AVStream

  createStream(): AVStream

  addStream(stream: AVStream): void

  removeStream(stream: AVStream): void

  removeStreamById(id: number): void

  removeStreamByIndex(index: number): void

  destroy(): Promise<void>
}

export interface AVFormatContextInterface {
  metadata: Record<string, any>
  format: AVFormat
  streams: AVStreamInterface[]
  chapters: AVChapter[]
}

export class AVFormatContext {

  public metadataHeaderPadding = -1

  public metadata: Record<string, any>
  public streams: AVStream[]

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

  public getDecoderResource: (mediaType: AVMediaType, codecId: AVCodecID) => Promise<WebAssemblyResource> | WebAssemblyResource = null

  constructor() {
    this.streams = []
    this.errorFlag = 0
    this.streamIndex  = 0
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

  public getStreamByIndex(index: number) {
    return this.streams.find((stream) => stream.index === index)
  }

  public getStreamByMediaType(mediaType: AVMediaType) {
    return this.streams.find((stream) => stream.codecpar?.codecType === mediaType)
  }

  public createStream() {
    const stream = new AVStream()
    stream.index = this.streamIndex++

    if (defined(ENABLE_THREADS)) {
      lock(streamCounterMutex)
    }
    stream.id = accessof(streamCounter)
    accessof(streamCounter) <- reinterpret_cast<int32>(stream.id + 1)
    if (defined(ENABLE_THREADS)) {
      unlock(streamCounterMutex)
    }

    this.removeStreamByIndex(stream.index)
    this.streams.push(stream)

    return stream
  }

  public addStream(stream: AVStream) {
    this.removeStreamByIndex(stream.index)
    this.streams.push(stream)
  }

  public removeStream(stream: AVStream) {
    this.removeStreamByIndex(stream.index)
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

  public removeStreamByIndex(i: number) {

    const index = this.streams.findIndex((stream) => stream.index === i)

    if (index > -1) {
      const st = this.streams.splice(index, 1)
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
