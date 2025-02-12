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
import { OggsCommentPage, PagePayload } from './OggPage'
import IOReaderSync from 'common/io/IOReaderSync'
import { Data } from 'common/types/type'
import { AVStreamMetadataKey } from 'avutil/AVStream'
import * as object from 'common/util/object'
import isDef from 'common/function/isDef'

const CommentKeyMap = {
  'album': AVStreamMetadataKey.ALBUM,
  'artist': AVStreamMetadataKey.ARTIST,
  'description': AVStreamMetadataKey.DESCRIPTION,
  'encoder': AVStreamMetadataKey.ENCODER,
  'title': AVStreamMetadataKey.TITLE,
  'tracknumber': AVStreamMetadataKey.TRACK,
  'date': AVStreamMetadataKey.DATE,
  'genre': AVStreamMetadataKey.GENRE,
  'comment': AVStreamMetadataKey.COMMENT,
  'albumartist': AVStreamMetadataKey.ALBUM_ARTIST,
  'composer': AVStreamMetadataKey.COMPOSER,
  'performer': AVStreamMetadataKey.PERFORMER,
  'discnumber': AVStreamMetadataKey.DISC,
  'organization': AVStreamMetadataKey.VENDOR,
  'copyright': AVStreamMetadataKey.COPYRIGHT,
  'license': AVStreamMetadataKey.LICENSE,
  'isrc': AVStreamMetadataKey.ISRC,
  'lyrics': AVStreamMetadataKey.LYRICS,
  'language': AVStreamMetadataKey.LANGUAGE,
  'label': AVStreamMetadataKey.VENDOR,
  'script': AVStreamMetadataKey.LYRICS,
  'encoded_by': AVStreamMetadataKey.VENDOR
}

export function parseVorbisComment(list: string[], metadata: Data) {
  if (!list) {
    return
  }
  list.forEach((value) => {
    const l = value.split('=')
    if (l.length === 2) {
      const k = l[0].trim().toLowerCase()
      const v = l[1].trim()
      if (CommentKeyMap[k]) {
        metadata[CommentKeyMap[k]] = v
      }
      else {
        metadata[k.toLowerCase()] = v
      }
    }
  })
}

export function addVorbisComment(metadata: Data) {
  const list: string[] = []
  object.each(CommentKeyMap, (value, key) => {
    if (isDef(metadata[value])) {
      list.push(`${key.toUpperCase()}=${metadata[value]}`)
    }
  })
  return list
}

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

  constructor(signature: string = 'vorbis') {
    this.signature = signature
    this.version = 0
    this.channels = 1
    this.sampleRate = 48000
    this.bitrateMaximum = 0
    this.bitrateNominal = 0
    this.bitrateMinimum = 0
    this.blocksize0 = 2048
    this.blocksize1 = 256
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

export class VorbisOggsCommentPage extends OggsCommentPage {
  /**
   * 8 bits packet_type 
   */
  public packetType: number

  /**
   * 1 bit
   */
  public framingFlag: number

  constructor(signature: string = 'vorbis') {
    super()
    this.signature = signature
    this.packetType = 0x01
    this.framingFlag = 0x01
  }

  public read(ioReader: IOReaderSync) {
    this.packetType = ioReader.readUint8()
    this.signature = ioReader.readString(6)
    super.read(ioReader)
    if (this.signature === 'vorbis') {
      this.framingFlag = ioReader.readUint8()
    }
  }

  public write(ioWriter: IOWriter) {
    ioWriter.writeUint8(this.packetType)
    ioWriter.writeString(this.signature)
    super.write(ioWriter)
    if (this.signature === 'vorbis') {
      ioWriter.writeUint8(this.framingFlag)
    }
  }

  public addComment(comment: string) {
    this.comments.addComment(comment)
  }

  public setCodec(codecpar: AVCodecParameters) {
  }
}
