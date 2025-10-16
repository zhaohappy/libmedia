/*
 * libmedia mp3 id3v2 utils
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

import type IOReader from 'common/io/IOReader'
import type { ID3V2, Mp3MetaData } from './type'
import * as logger from 'common/util/logger'
import * as text from 'common/util/text'
import IOWriterSync from 'common/io/IOWriterSync'
import { IOFlags } from 'avutil/avformat'
import { AVDisposition, AVStreamMetadataKey } from 'avutil/AVStream'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { type AVOFormatContext, type AVIFormatContext } from '../../AVFormatContext'
import BufferReader from 'common/io/BufferReader'
import { addAVPacketData, createAVPacket, getAVPacketData } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import * as array from 'common/util/array'
import * as object from 'common/util/object'
import concatTypeArray from 'common/function/concatTypeArray'
import { AVPacketFlags } from 'avutil/struct/avpacket'

export const enum ID3v2Encoding {
  ISO8859,
  UTF16BOM,
  UTF16BE,
  UTF8
}

export const ID3v2Mime2CodecId: Record<string, AVCodecID> = {
  'JPG': AVCodecID.AV_CODEC_ID_MJPEG,
  'PNG': AVCodecID.AV_CODEC_ID_PNG,
  'image/gif': AVCodecID.AV_CODEC_ID_GIF,
  'image/jpeg': AVCodecID.AV_CODEC_ID_MJPEG,
  'image/jpg': AVCodecID.AV_CODEC_ID_MJPEG,
  'image/png': AVCodecID.AV_CODEC_ID_PNG,
  'image/tiff': AVCodecID.AV_CODEC_ID_TIFF,
  'image/bmp': AVCodecID.AV_CODEC_ID_BMP,
  'image/webp': AVCodecID.AV_CODEC_ID_WEBP
}

export const ID3v2PictureType: string[] = [
  'Other',
  '32x32 pixels \'file icon\'',
  'Other file icon',
  'Cover (front)',
  'Cover (back)',
  'Leaflet page',
  'Media (e.g. label side of CD)',
  'Lead artist/lead performer/soloist',
  'Artist/performer',
  'Conductor',
  'Band/Orchestra',
  'Composer',
  'Lyricist/text writer',
  'Recording Location',
  'During recording',
  'During performance',
  'Movie/video screen capture',
  'A bright coloured fish',
  'Illustration',
  'Band/artist logotype',
  'Publisher/Studio logotype',
]

async function getSize(ioReader: IOReader, len: number) {
  let v = 0
  while (len--) {
    v = (v << 7) + ((await ioReader.readUint8()) & 0x7F)
  }
  return v
}

function putSize(ioWriter: IOWriterSync, size: number) {
  ioWriter.writeUint8(size >> 21 & 0x7f)
  ioWriter.writeUint8(size >> 14 & 0x7f)
  ioWriter.writeUint8(size >> 7 & 0x7f)
  ioWriter.writeUint8(size & 0x7f)
}

function decodeString(encoding: ID3v2Encoding, buffer: Uint8Array) {
  let label: string = 'utf-8'

  if (encoding === ID3v2Encoding.ISO8859) {
    label = 'iso-8859-1'
  }
  else if (encoding === ID3v2Encoding.UTF16BOM) {
    label = 'utf-16'
  }
  else if (encoding === ID3v2Encoding.UTF16BE) {
    label = 'utf-16be'
  }

  const decoder = new TextDecoder(label)
  return decoder.decode(buffer)
}

function sizeToSyncSafe(size: number) {
  return ((size & (0x7f <<  0)) >> 0) +
    ((size & (0x7f <<  8)) >> 1) +
    ((size & (0x7f << 16)) >> 2) +
    ((size & (0x7f << 24)) >> 3)
}

async function isTag(ioReader: IOReader, pos: int64) {
  await ioReader.seek(pos)
  const tag = await ioReader.readString(4)
  return /^[A-Z0-9]+$/.test(tag)
}

export async function parse(ioReader: IOReader, len: int32, id3v2: ID3V2, metadata: Mp3MetaData) {
  const isV34 = id3v2.version !== 2
  const tagHeaderLen = isV34 ? 10 : 6

  let end = ioReader.getPos() + static_cast<int64>(len)

  async function error() {
    await ioReader.skip(static_cast<int32>(end - ioReader.getPos()))
  }

  if (isV34 && (id3v2.flags & 0x40)) {
    let extLen = await getSize(ioReader, 4)
    if (id3v2.version === 4) {
      // in v2.4 the length includes the length field we just read.
      extLen -= 4
    }
    if (extLen < 0) {
      logger.error('invalid extended header length')
      return await error()
    }
    await ioReader.skip(extLen)
    len -= extLen + 4
    if (len < 0) {
      logger.error('extended header too long')
      return await error()
    }
  }

  while (len > tagHeaderLen) {
    let type: string
    let size: number
    if (isV34) {
      type = await ioReader.readString(4)
      size = await ioReader.readUint32()

      if (!size) {
        logger.error('invalid frame size')
        break
      }

      if (id3v2.version === 4) {
        if (size > 0x7f) {
          if (size < len) {
            await ioReader.flush()
            const cur = ioReader.getPos()
            if (!(ioReader.flags & IOFlags.SEEKABLE
              || 6 + size < ioReader.remainingLength()
            )) {
              break
            }
            if (await isTag(ioReader, cur + 2n + static_cast<int64>(sizeToSyncSafe(size) as uint32))) {
              size = sizeToSyncSafe(size)
            }
            else if (!(await isTag(ioReader, cur + 2n + static_cast<int64>(size as uint32)))) {
              break
            }
            await ioReader.seek(cur)
          }
          else {
            size = sizeToSyncSafe(size)
          }
        }
      }

      // flags
      await ioReader.readUint16()
    }
    else {
      type = await ioReader.readString(3)
      size = await ioReader.readUint24()
    }

    if (type === 'APIC') {
      if (!metadata.apic) {
        metadata.apic = []
      }
      metadata.apic.push(await ioReader.readBuffer(size))
    }
    else if (type === 'USLT') {
      const encoding = await ioReader.readUint8()
      const language = await ioReader.readString(3)
      const buffer = await ioReader.readBuffer(size - 4)
      metadata.lyrics = `${language} ${decodeString(encoding, buffer)}`
    }
    else if (type === 'COMM' || type === 'COM') {
      const encoding = await ioReader.readUint8()
      const language = await ioReader.readString(3)
      const buffer = await ioReader.readBuffer(size - 4)
      metadata.comment = `${language} ${decodeString(encoding, buffer)}`
    }
    else if (type === 'PRIV') {
      const pos = ioReader.getPos()
      const items = []
      while (true) {
        const c = await ioReader.readUint8()
        if (c === 0) {
          break
        }
        items.push(c)
      }
      const identifier = text.decode(new Uint8Array(items))
      let value: any
      if (identifier === 'com.apple.streaming.transportStreamTimestamp') {
        value = await ioReader.readUint64()
      }
      else {
        value = await ioReader.readBuffer(size - Number(ioReader.getPos() - pos))
      }
      metadata[identifier] = value
    }
    else {
      let content: string
      if (type[0] === 'T') {
        const encoding = await ioReader.readUint8()
        const buffer = await ioReader.readBuffer(size - 1)
        content = decodeString(encoding, buffer)
      }
      else {
        // @ts-ignore
        content = await ioReader.readBuffer(size)
      }

      switch (type) {
        case 'TIT2':
        case 'TT2':
          metadata.title = content
          break
        case 'TPE1':
        case 'TP1':
          metadata.artist = content
          break
        case 'TPE2':
        case 'TP2':
          metadata.albumArtist = content
          break
        case 'TPOS':
          metadata.disc = content
          break
        case 'TCOP':
          metadata.copyright = content
          break
        case 'TALB':
        case 'TAL':
          metadata.album = content
          break
        case 'TRCK':
        case 'TRK':
          metadata.track = content
          break
        case 'TYER':
        case 'TDRL':
        case 'TDRC':
          metadata.date = content
          break
        case 'COMM':
        case 'COM':
          metadata.comment = content
          break
        case 'TCON':
        case 'TCO':
          metadata.genre = content
          break
        case 'TSSE':
        case 'TEN':
          metadata.encoder = content
          break
        case 'TCOM':
          metadata.composer = content
          break
        case 'TENC':
          metadata.vendor = content
          break
        case 'TLAN':
          metadata.language = content
          break
        case 'TPE3':
        case 'TP3':
          metadata.performer = content
          break
        case 'TPUB':
          metadata.publisher = content
          break
        case 'TCMP':
        case 'TCP':
          metadata.compilation = content
          break
        case 'TDEN':
          metadata.creationTime = content
          break
        case 'TSOA':
          metadata.albumSort = content
          break
        case 'TSOP':
          metadata.artistSort = content
          break
        case 'TSOT':
          metadata.titleSort = content
          break
        case 'TIT1':
          metadata.grouping = content
          break
        default:
          metadata[type] = content
          break
      }
    }

    len -= size + tagHeaderLen
  }

  // footer preset, always 10 bytes, skip over it
  if (id3v2.version == 4 && id3v2.flags & 0x10) {
    end += 10n
  }

  await ioReader.skip(static_cast<int32>(end - ioReader.getPos()))

}

export function parseAPIC(formatContext: AVIFormatContext, apic: Uint8Array[], id3v2: ID3V2) {
  const isV34 = id3v2.version !== 2
  apic.forEach((buffer) => {
    const reader = new BufferReader(buffer)
    const encoding = reader.readUint8()
    let mimetype: string
    function getNextEOF() {
      let pos = Number(reader.getPos())
      while (pos < buffer.length && buffer[pos]) {
        pos++
      }
      return pos
    }

    if (isV34) {
      mimetype = reader.readString(getNextEOF() - Number(reader.getPos()))
      reader.skip(1)
    }
    else {
      mimetype = reader.readString(3)
    }

    if (!ID3v2Mime2CodecId[mimetype]) {
      return
    }

    const pictureType = reader.readUint8()
    let description: string

    const describeLen = getNextEOF() - Number(reader.getPos())
    if (describeLen) {
      description = decodeString(encoding, reader.readBuffer(describeLen))
    }
    reader.skip(1)
    const stream = formatContext.createStream()
    stream.codecpar.codecId = ID3v2Mime2CodecId[mimetype]
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
    stream.disposition |= AVDisposition.ATTACHED_PIC
    stream.attachedPic = createAVPacket()
    stream.attachedPic.streamIndex = stream.index
    const size = reader.remainingSize()
    const data: pointer<uint8> = avMalloc(size)
    const pictureBuffer = reader.readBuffer(size)
    memcpyFromUint8Array(data, size, pictureBuffer)
    if (pictureBuffer.length >= 8 && array.same(pictureBuffer.subarray(0, 8), new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PNG
    }
    addAVPacketData(stream.attachedPic, data, size)
    stream.attachedPic.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    stream.metadata[AVStreamMetadataKey.COMMENT] = ID3v2PictureType[pictureType]
    if (description) {
      stream.metadata[AVStreamMetadataKey.TITLE] = description
    }
  })
}

export function write(ioWriter: IOWriterSync, version: number, padding: int32, metadata: Mp3MetaData) {
  let now = ioWriter.getPos()
  ioWriter.writeString('ID3')
  ioWriter.writeUint8(version)
  ioWriter.writeUint16(0)
  const sizePos = ioWriter.getPos()
  ioWriter.writeUint32(0)

  const enc = ID3v2Encoding.UTF8

  function writeText(key: string, str: string) {
    const buffer = text.encode(str)

    ioWriter.writeString(key)
    version === 4 ? putSize(ioWriter, buffer.length + 1) : ioWriter.writeUint32(buffer.length + 1)
    // flags
    ioWriter.writeUint16(0)

    ioWriter.writeUint8(enc)
    ioWriter.writeBuffer(buffer)
  }

  function writeBuffer(key: string, buffer: Uint8Array) {
    ioWriter.writeString(key)
    version === 4 ? putSize(ioWriter, buffer.length) : ioWriter.writeUint32(buffer.length)
    // flags
    ioWriter.writeUint16(0)

    ioWriter.writeBuffer(buffer)
  }

  if (metadata[AVStreamMetadataKey.POSTER]) {
    writeBuffer('APIC', metadata[AVStreamMetadataKey.POSTER])
  }
  if (metadata.apic) {
    metadata.apic.forEach((apic) => {
      writeBuffer('APIC', apic)
    })
  }

  if (metadata[AVStreamMetadataKey.TITLE]) {
    writeText('TIT2', metadata[AVStreamMetadataKey.TITLE])
  }

  if (metadata[AVStreamMetadataKey.ARTIST]) {
    writeText('TPE1', metadata[AVStreamMetadataKey.ARTIST])
  }

  if (metadata[AVStreamMetadataKey.ALBUM_ARTIST]) {
    writeText('TPE2', AVStreamMetadataKey.ALBUM_ARTIST)
  }

  if (metadata[AVStreamMetadataKey.DISC]) {
    writeText('TPOS', metadata[AVStreamMetadataKey.DISC])
  }
  if (metadata[AVStreamMetadataKey.COPYRIGHT]) {
    writeText('TCOP', metadata[AVStreamMetadataKey.COPYRIGHT])
  }

  if (metadata[AVStreamMetadataKey.ALBUM]) {
    writeText('TALB', metadata[AVStreamMetadataKey.ALBUM])
  }

  if (metadata[AVStreamMetadataKey.TRACK]) {
    writeText('TRCK', metadata[AVStreamMetadataKey.TRACK])
  }

  if (metadata[AVStreamMetadataKey.DATE]) {
    writeText('TDRC', metadata[AVStreamMetadataKey.DATE])
  }

  if (metadata[AVStreamMetadataKey.COMMENT]) {
    let comment = metadata[AVStreamMetadataKey.COMMENT]
    if (comment[3] === ' ') {
      comment = comment.slice(0, 3) + comment.slice(4)
    }
    writeText('COMM', comment)
  }

  if (metadata[AVStreamMetadataKey.LYRICS]) {
    let lyrics = metadata[AVStreamMetadataKey.LYRICS]
    if (lyrics[3] === ' ') {
      lyrics = lyrics.slice(0, 3) + lyrics.slice(4)
    }
    writeText('USLT', lyrics)
  }

  if (metadata[AVStreamMetadataKey.GENRE]) {
    writeText('TCON', metadata[AVStreamMetadataKey.GENRE] + '')
  }

  if (metadata[AVStreamMetadataKey.ENCODER]) {
    writeText('TSSE', metadata[AVStreamMetadataKey.ENCODER])
  }

  if (metadata[AVStreamMetadataKey.COMPOSER]) {
    writeText('TCOM', metadata[AVStreamMetadataKey.COMPOSER])
  }

  if (metadata[AVStreamMetadataKey.VENDOR]) {
    writeText('TENC', metadata[AVStreamMetadataKey.VENDOR])
  }

  if (metadata[AVStreamMetadataKey.LANGUAGE]) {
    writeText('TLAN', metadata[AVStreamMetadataKey.LANGUAGE])
  }

  if (metadata[AVStreamMetadataKey.PERFORMER]) {
    writeText('TPE3', metadata[AVStreamMetadataKey.PERFORMER])
  }

  if (metadata[AVStreamMetadataKey.PUBLISHER]) {
    writeText('TPUB', metadata[AVStreamMetadataKey.PUBLISHER])
  }

  if (metadata[AVStreamMetadataKey.COMPILATION]) {
    writeText('TCMP', metadata[AVStreamMetadataKey.COMPILATION])
  }

  if (metadata[AVStreamMetadataKey.CREATION_TIME]) {
    writeText('TDEN', metadata[AVStreamMetadataKey.CREATION_TIME])
  }

  if (metadata[AVStreamMetadataKey.ALBUM_SORT]) {
    writeText('TSOA', metadata[AVStreamMetadataKey.ALBUM_SORT])
  }

  if (metadata[AVStreamMetadataKey.ARTIST_SORT]) {
    writeText('TSOP', metadata[AVStreamMetadataKey.ARTIST_SORT])
  }

  if (metadata[AVStreamMetadataKey.TITLE_SORT]) {
    writeText('TSOT', metadata[AVStreamMetadataKey.TITLE_SORT])
  }

  if (metadata[AVStreamMetadataKey.GROUPING]) {
    writeText('TIT1', metadata[AVStreamMetadataKey.GROUPING])
  }

  if (padding < 10) {
    padding = 10
  }

  const len = static_cast<int32>(ioWriter.getPos() - now)

  if (padding > 268435455 - len) {
    padding = 268435455 - len
  }

  ioWriter.writeBuffer(new Uint8Array(padding).fill(0))

  now = ioWriter.getPos()

  ioWriter.seek(sizePos)
  putSize(ioWriter, len)
  ioWriter.seek(now)
}

export function writeAPIC(formatContext: AVOFormatContext, id3v2Version: number) {
  const apic: Uint8Array[] = []

  const writer = new IOWriterSync()
  const buffers: Uint8Array[] = []
  writer.onFlush = (data) => {
    buffers.push(data.slice())
    return 0
  }
  const isV34 = id3v2Version !== 2
  formatContext.streams.forEach((stream) => {
    if (stream.disposition & AVDisposition.ATTACHED_PIC
      && ((isV34
          && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MJPEG
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PNG
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_TIFF
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_GIF
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_WEBP
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_BMP
          ))
        || (!isV34
          && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PNG
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MJPEG
          ))
      )
      && stream.attachedPic
    ) {
      buffers.length = 0
      writer.writeUint8(ID3v2Encoding.UTF8)
      if (isV34) {
        writer.writeString(object.reverse(ID3v2Mime2CodecId)[stream.codecpar.codecId])
        writer.writeUint8(0)
      }
      else {
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PNG) {
          writer.writeString('PNG')
        }
        else {
          writer.writeString('JPG')
        }
      }
      let pictureType = 0
      if (stream.metadata[AVStreamMetadataKey.COMMENT]) {
        if (ID3v2PictureType.indexOf(stream.metadata[AVStreamMetadataKey.COMMENT]) > -1) {
          pictureType = ID3v2PictureType.indexOf(stream.metadata[AVStreamMetadataKey.COMMENT])
        }
      }
      writer.writeUint8(pictureType)

      if (stream.metadata[AVStreamMetadataKey.DESCRIPTION]) {
        writer.writeString(stream.metadata[AVStreamMetadataKey.DESCRIPTION])
      }
      writer.writeUint8(0)

      writer.writeBuffer(getAVPacketData(stream.attachedPic))
      writer.flush()
      apic.push(concatTypeArray(Uint8Array, buffers))
    }
  })

  return apic
}
