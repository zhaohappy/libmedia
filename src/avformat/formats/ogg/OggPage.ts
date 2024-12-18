/*
 * libmedia oggs page parser
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

import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriterSync'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import IOReaderSync from 'common/io/IOReaderSync'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as text from 'common/util/text'

export interface PagePayload {
  signature: string
  read(ioReader: IOReaderSync): void
  write(ioWriter: IOWriter): void
  setCodec(codecpar: AVCodecParameters): void
  streamIndex: number
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

export class OggPage {
  /**
   * 4 bytes 页标识， OggS ASCII 字符
   */
  public capturePattern: string

  /**
   * 1 bytes 版本 id, 目前为 0
   */
  public streamStructureVersion: number

  /**
   * 1 bytes 类型标识， 表示该页为逻辑流的第一页
   * 
   * - 0x01：本页媒体编码数据与前一页属于同一个逻辑流的同一个 packet，若此位没有设，表示本页是以一个新的 packet 开始的；
   * - 0x02：表示该页为逻辑流的第一页，bos 标识，如果此位未设置，那表示不是第一页；
   * - 0x04：表示该页为逻辑流的最后一页，eos 标识，如果此位未设置，那表示本页不是最后一页；
   */
  public headerTypeFlag: number

  /**
   * 8 bytes 媒体编码相关的参数信息
   * 
   * 对于音频流来说，它存储着到本页为止逻辑流在 PCM 输出中采样码的数目，可以由它来算得时间戳
   * 对于视频流来说，它存储着到本页为止视频帧编码的数目
   * 若此值为 -1，那表示截止到本页，逻辑流的 packet 未结束
   */
  public granulePosition: bigint

  /**
   * 4 bytes 当前页中的流的 id，它是区分本页所属逻辑流与其他逻辑流的序号，我们可以通过这个值来划分流
   */
  public serialNumber: number

  /**
   * 4 bytes 本页在逻辑流的序号
   */
  public pageSequenceNumber: number

  /**
   * 4 bytes 循环冗余效验码效验， 用来效验每页的有效性
   */
  public crcCheckSum: number

  /**
   * 1 bytes 给定本页在 segment_table 域中出现的 segment 个数
   */
  public numberPageSegments: number

  /**
   * segment 长度表
   * 
   * 表示着每个 segment 的长度，取值范围是 0~255
   * 由 segment（1 个 segment 就是 1 个字节）可以得到 packet 的值，每个 packet 的大小是以最后一个不等于 255 的 segment 结束的
   */
  public segmentTable: number[]

  public payload: Uint8Array

  public pos: int64

  constructor() {
    this.reset()
  }

  public reset() {
    this.capturePattern = 'OggS'
    this.streamStructureVersion = 0
    this.headerTypeFlag = 0
    this.granulePosition = NOPTS_VALUE_BIGINT
    this.serialNumber = 0
    this.pageSequenceNumber = 0
    this.crcCheckSum = 0
    this.numberPageSegments = 0
    this.segmentTable = []
    this.pos = 0n
  }

  public async read(ioReader: IOReader) {
    this.pos = ioReader.getPos()
    await this.readPageHeader(ioReader)

    const length = this.segmentTable.reduce((prev, len) => {
      return prev + len
    }, 0)

    if (length) {
      this.payload = await ioReader.readBuffer(length)
    }
  }

  public async readPageHeader(ioReader: IOReader) {
    this.capturePattern = await ioReader.readString(4)
    this.streamStructureVersion = await ioReader.readUint8()
    this.headerTypeFlag = await ioReader.readUint8()
    this.granulePosition = await ioReader.readUint64()
    this.serialNumber = await ioReader.readUint32()
    this.pageSequenceNumber = await ioReader.readUint32()
    this.crcCheckSum = await ioReader.readUint32()
    this.numberPageSegments = await ioReader.readUint8()

    if (this.numberPageSegments) {
      for (let i = 0; i < this.numberPageSegments; i++) {
        const len = await ioReader.readUint8()
        this.segmentTable.push(len)
      }
    }
  }

  public write(ioWriter: IOWriter) {
    this.pos = ioWriter.getPos()
    ioWriter.writeString(this.capturePattern)
    ioWriter.writeUint8(this.streamStructureVersion)
    ioWriter.writeUint8(this.headerTypeFlag)
    ioWriter.writeUint64(this.granulePosition)
    ioWriter.writeUint32(this.serialNumber)
    ioWriter.writeUint32(this.pageSequenceNumber)
    ioWriter.writeUint32(this.crcCheckSum)

    if (this.payload) {
      this.numberPageSegments = Math.floor(this.payload.length / 255) + 1
      const last = this.payload.length % 255

      ioWriter.writeUint8(this.numberPageSegments)

      for (let i = 0; i < this.numberPageSegments - 1; i++) {
        ioWriter.writeUint8(255)
      }
      ioWriter.writeUint8(last)
      ioWriter.writeBuffer(this.payload)
    }
    else {
      ioWriter.writeUint8(0)
    }
  }
}

export class OggsCommentPage implements PagePayload {

  public streamIndex: number

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

  constructor() {
    this.vendorString = defined(VERSION)
    this.vendorStringLength = this.vendorString.length
    this.userCommentListLength = 0
    this.comments = new UserComment()
  }

  public read(ioReader: IOReaderSync) {
    this.vendorStringLength = ioReader.readUint32()
    this.vendorString = ioReader.readString(this.vendorStringLength)
    this.userCommentListLength = ioReader.readUint32()
    if (this.userCommentListLength) {
      this.comments.read(ioReader, this.userCommentListLength)
    }
  }

  public write(ioWriter: IOWriter) {
    const buffer = text.encode(this.vendorString)
    ioWriter.writeUint32(buffer.length)
    ioWriter.writeBuffer(buffer)

    ioWriter.writeUint32(this.comments.list.length)
    this.comments.write(ioWriter)
  }

  public addComment(comment: string) {
    this.comments.addComment(comment)
  }

  public setCodec(codecpar: AVCodecParameters) {
  }
}
