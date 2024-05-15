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

import { AVMediaType } from 'avutil/codec'

import AVStream from './AVStream'
import AVPacket from 'avutil/struct/avpacket'

import OFormat from './formats/OFormat'
import IFormat from './formats/IFormat'

import IOWriter from 'common/io/IOWriterSync'
import IOReader from 'common/io/IOReader'
import IOReaderSync from 'common/io/IOReaderSync'

class AVFormatContextInterval {

  public packetBuffer: pointer<AVPacket>[]

  constructor() {
    this.packetBuffer = []
  }
}

export interface AVIFormatContext {
  streams: AVStream[]

  options: Record<string, any>

  privateData: Record<string, any>

  iformat: IFormat

  ioReader: IOReader

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

  destroy(): void
}

export interface AVOFormatContext {

  metadataHeaderPadding: int32

  streams: AVStream[]

  options: Record<string, any>

  privateData: Record<string, any>
  processPrivateData: Record<string, any>

  oformat: OFormat

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

  destroy(): void
}

class AVFormatContext implements AVIFormatContext, AVOFormatContext {

  public metadataHeaderPadding = -1

  public streams: AVStream[]

  public options: Record<string, any>

  public privateData: Record<string, any>
  public processPrivateData: Record<string, any>

  public iformat: IFormat

  public oformat: OFormat

  // @ts-ignore
  public ioReader: IOReader | IOReaderSync

  public ioWriter: IOWriter

  public errorFlag: number

  public interval: AVFormatContextInterval

  public streamIndex: number

  constructor() {
    this.streams = []
    this.errorFlag = 0
    this.streamIndex  = 0
    this.interval = new AVFormatContextInterval()

    this.options = {}
    this.privateData = {}
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
    stream.id = stream.index
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

  public destroy() {

    if (this.oformat) {
      this.oformat.destroy(this)
    }
    if (this.iformat) {
      this.iformat.destroy(this as AVIFormatContext)
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
