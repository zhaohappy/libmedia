/*
 * libmedia dash parser interface defined
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

export interface Segment {
  idx: number
  start: number
  end: number
  url: string
  segmentDuration: number
}

export interface Media {
  id: string
  baseURL?: string
  file?: string
  initSegment?: string
  mediaSegments?: Segment[]
  mimeType: string
  codecs: string
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
  frameRate?: number
  sar?: string
  startWithSAP: boolean
  bandwidth: number
  timescale: number
  duration: number
  encrypted?: boolean
  lang?: string
}

export interface MPDMediaList {
  source: string
  mediaList: {
    audio: Media[]
    video: Media[]
    subtitle: Media[]
  }
  type: 'live' | 'vod'
  isEnd: boolean
  duration: number
  minBufferTime: number
  maxSegmentDuration: number
  minimumUpdatePeriod: number
  timestamp: number
}

interface S {
  t?: string
  d: string
  r?: string
}

export interface SegmentTimeline {
  S: S | S[]
}

export interface SegmentTemplate {
  initialization: string
  media: string
  startNumber?: string
  timescale?: string
  duration?: string

  SegmentTimeline: SegmentTimeline
}

export interface Representation {
  id: string
  mimeType: string
  codecs: string
  bandwidth: string
  audioSamplingRate?: string
  height?: string
  width?: string
  sar?: string
  maxWidth?: string
  maxHeight?: string
  frameRate?: string
  startWithSAP?: string
  BaseURL?: string | { value: string }
  SegmentBase?: {
    indexRange: string
    Initialization: {
      range: string
    }
  }
  SegmentList?: {
    duration: string
    Initialization: {
      sourceURL: string
    }
    SegmentURL: {
      media: string
    }[] | {
      media: string
    }
  }

  SegmentTemplate?: SegmentTemplate | SegmentTemplate[]

  ContentProtection?: any
}

export interface AdaptationSet {
  id: string
  lang?: string
  bitstreamSwitching: string
  contentType: 'audio' | 'video' | 'text'
  mimeType?: string
  codecs?: string
  width?: string
  height?: string
  sar?: string
  bandwidth?: string
  frameRate?: string
  maxHeight?: string
  maxWidth?: string
  par?: string
  segmentAlignment: string
  startWithSAP: string
  BaseURL?: string

  Representation: Representation | Representation[]
  SegmentTemplate?: SegmentTemplate | SegmentTemplate[]

  ContentProtection?: any
}

export interface Period {
  id: string
  start: string
  AdaptationSet: AdaptationSet | AdaptationSet[]
  duration?: string
}

export interface MPD {
  type: 'static' | 'dynamic'
  ProgramInformation: string
  maxSegmentDuration: string
  mediaPresentationDuration: string
  minBufferTime: string
  minimumUpdatePeriod?: string
  ServiceDescription?: {id: string}[]
  Period: Period | Period[]
  BaseURL?: string | { value: string }
}
