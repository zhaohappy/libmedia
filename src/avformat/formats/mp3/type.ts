/*
 * libmedia mp3 interface
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

import { FrameHeader } from './frameHeader'

export interface Mp3MetaData {
  title?: string
  artist?: string
  album?: string
  date?: string
  comment?: string
  track?: string
  genre?: string | number
  encoder?: string
  poster?: Uint8Array
  lyrics?: string
  albumArtist?: string
  disc?: string
  copyright?: string
  language?: string
  performer?: string
  publisher?: string
  vendor?: string
  composer?: string
  compilation?: string
  creationTime?: string
  albumSort?: string
  artistSort?: string
  titleSort?: string
  grouping?: string
}

export interface ID3V2 {
  version: number
  revision: number
  flags: number
}

export interface Mp3StreamContext {
  nbFrame: int64
  frameHeader: FrameHeader
  tocIndexes: { pos: int64, dts: int64 }[]
  nextDTS: int64
  frameLength: int32
}

export interface Mp3FormatOptions {
  id3v2Version?: 0 | 3 | 4
  hasID3v1?: boolean
  hasXing?: boolean
}
