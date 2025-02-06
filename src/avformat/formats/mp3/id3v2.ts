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

import IOReader from 'common/io/IOReader'
import { ID3V2, Mp3MetaData } from './type'
import * as logger from 'common/util/logger'
import * as text from 'common/util/text'
import IOWriterSync from 'common/io/IOWriterSync'

const enum ID3v2Encoding {
  ISO8859,
  UTF16BOM,
  UTF16BE,
  UTF8
}

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

export async function parse(ioReader: IOReader, len: int32, id3v2: ID3V2, metadata: Mp3MetaData) {
  const isV34 = id3v2.version !== 2
  const tagHeaderLen = isV34 ? 10 : 6

  let end = ioReader.getPos() + static_cast<int64>(len)

  async function error() {
    await ioReader.seek(end)
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
      await ioReader.seek(end)
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

      // flags
      await ioReader.readUint16()
    }
    else {
      type = await ioReader.readString(3)
      size = await ioReader.readUint24()
    }

    if (type === 'APIC') {
      metadata.poster = await ioReader.readBuffer(size)
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

  await ioReader.seek(end)

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
    ioWriter.writeUint32(buffer.length + 1)
    // flags
    ioWriter.writeUint16(0)

    ioWriter.writeUint8(enc)
    ioWriter.writeBuffer(buffer)
  }

  function writeBuffer(key: string, buffer: Uint8Array) {
    ioWriter.writeString(key)
    ioWriter.writeUint32(buffer.length)
    // flags
    ioWriter.writeUint16(0)

    ioWriter.writeBuffer(buffer)
  }

  if (metadata.poster) {
    writeBuffer('APIC', metadata.poster)
  }

  if (metadata.title) {
    writeText('TIT2', metadata.title)
  }

  if (metadata.artist) {
    writeText('TPE1', metadata.artist)
  }

  if (metadata.albumArtist) {
    writeText('TPE2', metadata.albumArtist)
  }

  if (metadata.disc) {
    writeText('TPOS', metadata.disc)
  }
  if (metadata.copyright) {
    writeText('TCOP', metadata.copyright)
  }

  if (metadata.album) {
    writeText('TALB', metadata.album)
  }

  if (metadata.track) {
    writeText('TRCK', metadata.track)
  }

  if (metadata.date) {
    writeText('TDRC', metadata.date)
  }

  if (metadata.comment) {
    let comment = metadata.comment
    if (comment[3] === ' ') {
      comment = comment.slice(0, 3) + comment.slice(4)
    }
    writeText('COMM', comment)
  }

  if (metadata.lyrics) {
    let lyrics = metadata.lyrics
    if (lyrics[3] === ' ') {
      lyrics = lyrics.slice(0, 3) + lyrics.slice(4)
    }
    writeText('USLT', lyrics)
  }

  if (metadata.genre) {
    writeText('TCON', metadata.genre + '')
  }

  if (metadata.encoder) {
    writeText('TSSE', metadata.encoder)
  }

  if (metadata.composer) {
    writeText('TCOM', metadata.composer)
  }

  if (metadata.vendor) {
    writeText('TENC', metadata.vendor)
  }

  if (metadata.language) {
    writeText('TLAN', metadata.language)
  }

  if (metadata.performer) {
    writeText('TPE3', metadata.performer)
  }

  if (metadata.publisher) {
    writeText('TPUB', metadata.publisher)
  }

  if (metadata.compilation) {
    writeText('TCMP', metadata.compilation)
  }

  if (metadata.creationTime) {
    writeText('TDEN', metadata.creationTime)
  }

  if (metadata.albumSort) {
    writeText('TSOA', metadata.albumSort)
  }

  if (metadata.artistSort) {
    writeText('TSOP', metadata.artistSort)
  }

  if (metadata.titleSort) {
    writeText('TSOT', metadata.titleSort)
  }

  if (metadata.grouping) {
    writeText('TIT1', metadata.grouping)
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
