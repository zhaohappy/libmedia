/*
 * libmedia avi interface defined
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

export const enum AVIFlags {
  AVIF_HASINDEX = 16,
  AVIF_MUSTUSEINDEX = 32,
  AVIF_ISINTERLEAVED = 256,
  AVIF_WASCAPTUREFILE = 65536,
  AVIF_COPYRIGHTED = 131072,
  AVIF_TRUSTCKTYPE = 2048
}

export const enum AVFIndexFlags {
  AVIIF_INDEX = 16,
  AVIIF_NO_TIME = 256
}

export const enum AVIStreamFlags {
  AVISF_VIDEO_PALCHANGES = 65536
}

export interface AVIMainHeader {
  dwMicroSecPerFrame: number
  dwMaxBytesPerSec: number
  dwPaddingGranularity: number
  dwFlages: number
  dwTotalFrame: number
  dwInitialFrames: number
  dwStreams: number
  dwSuggestedBufferSize: number
  dwWidth: number
  dwHeight: number
}

export interface AVISample {
  pos: int64
  dts: int64
  size: int32
  key: boolean
}

export interface AVIStreamContext {
  fccType: string
  fccHandler: string
  dwFlags: number
  wPriority: number
  wLanguage: number
  dwInitalFrames: number
  dwScale: number
  dwRate: number
  dwStart: number
  dwLength: number
  dwSuggestedBufferSize: number
  dwQuality: number
  dwSampleSize: number
  rcFrame: {
    left: number
    top: number
    right: number
    bottom: number
  }

  currentDts: int64
  pal: Uint32Array
  hasPal: boolean
  dshowBlockAlign: number

  samples: AVISample[]
  sampleEnd: boolean
  currentSample: number
}
