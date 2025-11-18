/*
 * libmedia analyzeAVFormat
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

import { AVFormat } from '../avformat'

import {
  type IOReader
} from '@libmedia/common/io'

export default async function analyzeAVFormat(ioReader: IOReader, defaultFormat: AVFormat = AVFormat.UNKNOWN): Promise<AVFormat> {
  let magic = await ioReader.peekString(8)
  if (/^FLV/.test(magic)) {
    return AVFormat.FLV
  }
  else if (/^DKIF/.test(magic)) {
    return AVFormat.IVF
  }
  else if (/^ftyp/.test(magic.slice(4, 8))) {
    return AVFormat.ISOBMFF
  }
  else if (/^OggS/.test(magic)) {
    return AVFormat.OGG
  }
  else if (/^ID3/.test(magic)) {
    return AVFormat.MP3
  }
  else if (/^fLaC/.test(magic)) {
    return AVFormat.FLAC
  }
  else if (/^RIFF/.test(magic)) {
    const dataType = (await ioReader.peekString(12)).slice(8)
    if (/^WAVE/.test(dataType)) {
      return AVFormat.WAV
    }
    else if (/^AVI/.test(dataType)) {
      return AVFormat.AVI
    }
  }
  else if (/^ADIF/.test(magic)) {
    return AVFormat.AAC
  }
  else if ((await ioReader.peekUint32()) === 0x1A45DFA3) {
    return AVFormat.MATROSKA
  }
  else if (/^WEBVTT/.test(magic)) {
    return AVFormat.WEBVTT
  }
  // 私有的 magic
  else if (/^LIMA/.test(magic)) {
    await ioReader.skip(4)
    return await ioReader.readUint16() as AVFormat
  }
  else {
    const buf = await ioReader.peekBuffer(2)
    switch (buf[0]) {
      case 0x56:
        if ((buf[1] & 0xe0) === 0xe0) {
          return AVFormat.AAC
        }
        break
      case 0xff:
        if ((buf[1] & 0xf6) === 0xf0) {
          return AVFormat.AAC
        }
        else if ([0xf2, 0xf4, 0xf6, 0xfa, 0xfc].includes(buf[1] & 0xfe)) {
          return AVFormat.MP3
        }
        break
    }
  }
  return defaultFormat
}
