/*
 * libmedia flac type
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

import BitReader from 'common/io/BitReader'

export interface StreamInfo {
  minimumBlockSize: int16
  maximumBlockSize: int16
  minimumFrameSize: int32
  maximumFrameSize: int32
  sampleRate: int32
  channels: int32
  bitPerSample: int32
  samples: int64
  md5: string
}

export interface FrameInfo {
  sampleRate: int32
  channels: int32
  bps: int32
  blocksize: int32
  chMode: int32
  frameOrSampleNum: int64
  isVarSize: int32
}

export interface SeekPoint {
  pts: int64
  pos: int64
  samples: int32
}

export interface Track {
  offset: int64
  number: int32
  isrc: Uint8Array
  type: int32
  preEmphasisFlag: int32
  points: {
    offset: int64
    point: int32
  }[]
}

export interface CueSheet {
  catalogNumber: string
  leadInSamples: int64
  compactDisc: boolean
  tracks: Track[]
}

export interface Picture {
  type: int32
  mimeType: string
  description: string
  width: int32
  height: int32
  colorDepth: int32
  indexedColor: int32
  data: Uint8Array
}

export interface FlacContext {
  streamInfo: StreamInfo
  frameInfo: FrameInfo
  seekPoints: SeekPoint[]
  cueSheet: CueSheet
  picture: Picture

  firstFramePos: int64
  fileSize: int64
  cachePos: int64
  cacheBuffer: Uint8Array
  bitReader: BitReader
  isVarSize: number
}
