/*
 * libmedia oggs opus page parser
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
 * oggs opus IDPage 和 commentPage
 * 
 * https://datatracker.ietf.org/doc/html/rfc7845
 */

import IOWriter from 'common/io/IOWriterSync'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { OggsCommentPage, PagePayload } from './OggPage'
import IOReaderSync from 'common/io/IOReaderSync'
import * as text from 'common/util/text'

class ChannelMapping {

  /**
   * 1 bytes, unsigned ogg packet 里面编码了多少路 stream
   * 
   */
  public streamCount: number

  /**
   * 1 bytes, unsigned 标识有多少路流是双声声道，必须小于 streamCount
   * opus 要支持超过 2 个声道是使用单声道流和双声道流组合而成
   * 一个 opus 流只能是单声道或双声道
   * 
   */
  public coupledStreamCount: number

  /**
   * C bytes, C 为总输出声道数 coupledStreamCount + streamCount
   */
  public mapping: Uint8Array

  constructor() {
    this.streamCount = 1
    this.coupledStreamCount = 0
    this.mapping = new Uint8Array(1)
  }

  public read(ioReader: IOReaderSync) {
    this.streamCount = ioReader.readUint8()
    this.coupledStreamCount = ioReader.readUint8()
    this.mapping = ioReader.readBuffer(this.streamCount + this.coupledStreamCount)
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeUint8(this.streamCount)
    ioWriter.writeUint8(this.coupledStreamCount)
    ioWriter.writeBuffer(this.mapping)
  }

}

export class OpusOggsIdPage implements PagePayload {

  public streamIndex: number

  /**
   * 8 bytes Magic Signature: OpusHead
   */
  public signature: string

  /**
   * 1 bytes unsigned, 对应值 0x01
   */
  public version: number

  /**
   * 1 bytes unsigned, 声道数， 它可能和编码声道数不一致， 它可能被修改成 packet-by-packet, 对应值 0x01
   */
  public channels: number

  /**
   * 2 bytes unsigned, 这是要从开始播放时的解码器输出， 从页面的颗粒位置减去以计算其 PCM 样本位置。
   */
  public preSkip: number

  /**
   * 4 bytes unsigned, 原始输入采样率
   */
  public sampleRate: number

  /**
   * 2 bytes signed, 这是解码时要应用的增益， 20 * log10 缩放解码器输出以实现所需的播放音量
   */
  public outputGain: number

  /**
   * 1 bytes unsigned, 指示输出渠道的顺序和语音含义。该八位位组的每个当前指定的值表示一个映射系列，它定义了一组允许的通道数，以及每个允许的通道数的通道名称的有序集合
   */
  public channelMappingFamily: number

  /**
   * 可选， 当 Channel Mapping Family 为 0 时被省略。
   */
  public channelMappingTable: ChannelMapping

  constructor() {
    this.signature = 'OpusHead'
    this.version = 0x01
    this.channels = 1
    this.preSkip = 0
    this.sampleRate = 48000
    this.outputGain = 0
    this.channelMappingFamily = 0
    this.channelMappingTable = new ChannelMapping()
  }

  public read(ioReader: IOReaderSync) {
    this.signature = ioReader.readString(8)
    this.version = ioReader.readUint8()
    this.channels = ioReader.readUint8()
    this.preSkip = ioReader.readUint16()
    this.sampleRate = ioReader.readUint32()
    this.outputGain = ioReader.readInt16()
    this.channelMappingFamily = ioReader.readUint8()

    if (this.channelMappingFamily !== 0) {
      this.channelMappingTable.read(ioReader)
    }
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeString(this.signature)
    ioWriter.writeUint8(this.version)
    ioWriter.writeUint8(this.channels)
    ioWriter.writeUint16(this.preSkip)
    ioWriter.writeUint32(this.sampleRate)
    ioWriter.writeInt16(this.outputGain)
    ioWriter.writeUint8(this.channelMappingFamily)
    if (this.channelMappingFamily !== 0) {
      this.channelMappingTable.write(ioWriter)
    }
  }

  public setCodec(codecpar: AVCodecParameters) {
    this.sampleRate = codecpar.sampleRate
    this.channels = codecpar.chLayout.nbChannels
    this.channelMappingFamily = codecpar.format
  }

}

export class OpusOggsCommentPage extends OggsCommentPage {

  constructor() {
    super()
    this.signature = 'OpusTags'
  }

  public read(ioReader: IOReaderSync) {
    this.signature = ioReader.readString(8)
    super.read(ioReader)
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeString(this.signature)
    super.write(ioWriter)
  }

  public addComment(comment: string) {
    this.comments.addComment(comment)
  }

  public setCodec(codecpar: AVCodecParameters) {
  }
}
