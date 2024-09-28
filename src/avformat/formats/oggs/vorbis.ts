/*
 * libmedia oggs vorbis page parser
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

/**
 * oggs vorbis IDPage 和 commentPage
 * 
 * https://datatracker.ietf.org/doc/html/rfc7845
 */

import IOWriter from 'common/io/IOWriterSync'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { PagePayload } from './OggPage'
import IOReaderSync from 'common/io/IOReaderSync'
import * as text from 'common/util/text'

export class VorbisOggsIdPage implements PagePayload {

  public streamIndex: number

  /**
   * 8 bits packet_type 
   */
  public packetType: number

  /**
   * 6 bytes Magic Signature: vorbis
   */
  public signature: string

  /**
   * 4 bytes unsigned, 对应值 0x01
   */
  public version: number

  /**
   * 1 bytes unsigned, 声道数
   */
  public channels: number

  /**
   * 4 bytes unsigned, 原始输入采样率
   */
  public sampleRate: number

  /**
   * 4 bytes 
   */
  public bitrateMaximum: number

  /**
   * 4 bytes 
   */
  public bitrateNominal: number

  /**
   * 4 bytes 
   */
  public bitrateMinimum: number

  /**
   * 4 bits
   */
  public blocksize0: number

  /**
   * 4 bits
   */
  public blocksize1: number

  /**
   * 1 bit
   */
  public framingFlag: number

  constructor() {
    this.signature = 'vorbis'
    this.version = 0
    this.channels = 1
    this.sampleRate = 48000
    this.bitrateMaximum = 0
    this.bitrateNominal = 0
    this.bitrateMinimum = 0
  }

  public read(ioReader: IOReaderSync) {
    this.packetType = ioReader.readUint8()
    this.signature = ioReader.readString(6)
    this.version = ioReader.readUint32()
    this.channels = ioReader.readUint8()
    this.sampleRate = ioReader.readInt32()
    this.bitrateMaximum = ioReader.readInt32()
    this.bitrateNominal = ioReader.readInt32()
    this.bitrateMinimum = ioReader.readInt32()

    const block = ioReader.readUint8() & 0xff

    this.blocksize0 = Math.pow(2, block >>> 4)
    this.blocksize1 = Math.pow(2, block & 0x0f)

    this.framingFlag = ioReader.readUint8()
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeUint8(0x01)
    ioWriter.writeString(this.signature)
    ioWriter.writeUint32(this.version)
    ioWriter.writeUint8(this.channels)
    ioWriter.writeInt32(this.sampleRate)
    ioWriter.writeInt32(this.bitrateMaximum)
    ioWriter.writeInt32(this.bitrateNominal)
    ioWriter.writeInt32(this.bitrateMinimum)

    ioWriter.writeUint8((Math.log2(this.blocksize0) << 4) | Math.log2(this.blocksize1))

    ioWriter.writeUint8(0x01)
  }

  public setCodec(codecpar: AVCodecParameters) {
    this.sampleRate = codecpar.sampleRate
    this.channels = codecpar.chLayout.nbChannels
  }
}

class UserComment {

  public list: string[]

  constructor() {
    this.list = []
  }

  public read(ioReader: IOReaderSync, count: number) {
    for (let i = 0; i < count; i++) {
      const length = ioReader.readUint32()
      this.list.push(ioReader.readString(length))
    }
  }

  public write(ioWriter: IOWriter) {
    for (let i = 0; i < this.list.length; i++) {
      const buffer = text.encode(this.list[i])
      ioWriter.writeUint32(buffer.length)
      ioWriter.writeBuffer(buffer)
    }
  }

  public addComment(comment: string) {
    this.list.push(comment)
  }
}

export class VorbisOggsCommentPage implements PagePayload {

  public streamIndex: number

  /**
   * 8 bits packet_type 
   */
  public packetType: number

  /**
   * 8 bytes Magic Signature: OpusTags
   */
  public signature: string

  /**
   * 4 bytes unsigned
   */
  public vendorStringLength: number

  /**
   * 长度由 Vendor String Length 指定， utf-8 编码
   */
  public vendorString: string

  /**
   * 4 bytes unsigned, 该字段指示用户提供的注释数。它可能表示用户提供的评论为零，在这种情况下数据包中没有其他字段。
   * 一定不要表示评论太多，以至于评论字符串长度将需要比其余的可用数据更多的数据数据包
   */
  public userCommentListLength: number

  public comments: UserComment

  /**
   * 1 bit
   */
  public framingFlag: number

  constructor() {
    this.signature = 'vorbis'
    this.vendorString = defined(VERSION)
    this.vendorStringLength = this.vendorString.length
    this.userCommentListLength = 0
    this.comments = new UserComment()
  }

  public read(ioReader: IOReaderSync) {
    this.packetType = ioReader.readUint8()
    this.signature = ioReader.readString(6)
    this.vendorStringLength = ioReader.readUint32()
    this.vendorString = ioReader.readString(this.vendorStringLength)
    this.userCommentListLength = ioReader.readUint32()
    if (this.userCommentListLength) {
      this.comments.read(ioReader, this.userCommentListLength)
    }
    this.framingFlag = ioReader.readUint8()
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeString(this.signature)

    const buffer = text.encode(this.vendorString)
    ioWriter.writeUint32(buffer.length)
    ioWriter.writeBuffer(buffer)

    ioWriter.writeUint32(this.comments.list.length)
    this.comments.write(ioWriter)

    ioWriter.writeUint8(0x01)
  }

  public addComment(comment: string) {
    this.comments.addComment(comment)
  }

  public setCodec(codecpar: AVCodecParameters) {
  }
}
