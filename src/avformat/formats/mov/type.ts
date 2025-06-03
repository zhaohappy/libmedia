/*
 * libmedia mp4 interface defined
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

import IOWriter from 'common/io/IOWriterSync'
import { BoxType } from './boxType'
import { FragmentMode, MovMode } from './mov'
import { AC3HeaderInfo } from 'avutil/codecs/ac3'

export interface BoxsPositionSizeInfo {
  pos: bigint
  type: BoxType
  size: number
}

export interface Atom {
  type: number
  size: number
}

export interface FragmentTrack {
  trackId: number
  baseDataOffset: bigint
  defaultSampleDuration: number
  defaultSampleSize: number
  defaultSampleFlags: number
  baseMediaDecodeTime: bigint
  sampleCount: number
  dataOffset: number
  remainDataOffsets: number[]
  remainDataOffsetIndex: number[]
  dataOffsetPos: bigint
  firstSampleFlags: number
  sampleDurations: number[]
  sampleSizes: number[]
  sampleFlags: number[]
  sampleCompositionTimeOffset: number[]
  baseIsMoof: boolean
  ioWriter: IOWriter
  buffers: Uint8Array[]
  streamIndex?: number
}

export interface Sample {
  dts: bigint
  pts: bigint
  pos: bigint
  size: number
  duration: number
  flags: number
}

export interface EC3Info {
  done: boolean
  numBlocks: uint8
  dataRate: uint16
  ac3BitrateCode: int8
  numIndSub: uint8
  substream: {
    fscod: uint8
    bsid: uint8
    bsmod: uint8
    acmod: uint8
    lfeon: uint8
    numDepSub: uint8
    chanLoc: uint8
  }[]
}

export interface MOVContext {
  isom: boolean
  timescale: number
  duration: bigint
  foundMoov: boolean
  foundMdat: boolean
  majorBrand: number
  minorVersion: number
  compatibleBrand: number[]
  creationTime: bigint
  modificationTime: bigint
  rate: number
  volume: number
  matrix: Uint32Array
  nextTrackId: number
  fragment: boolean
  trexs: {
    trackId: number
    size: number
    duration: number
    flags: number
  }[]
  currentFragment: {
    sequence: number
    currentTrack: FragmentTrack
    tracks: FragmentTrack[]
    pos: bigint
    size: number
    firstWrote?: boolean
  }
  boxsPositionInfo: BoxsPositionSizeInfo[]
  holdMoovPos: bigint
  currentChunk: {
    sampleCount: number
    streamIndex: number
    pos: bigint
  }
  ac3Info?: EC3Info
  firstMoof?: int64
  ignoreEditlist?: boolean
  use64Mdat?: boolean
}

export interface MOVStreamContext {
  chunkOffsets: bigint[]
  cttsSampleCounts: number[]
  cttsSampleOffsets: number[]
  stscFirstChunk: number[]
  stscSamplesPerChunk: number[]
  stscSampleDescriptionIndex: number[]
  stssSampleNumbersMap: Map<number, boolean>
  stssSampleNumbers: number[]
  sampleSizes: number[]
  sttsSampleCounts: number[]
  sttsSampleDeltas: number[]
  fragIndexes: { pos: bigint, time: bigint }[]

  duration: bigint
  trackId: number
  layer: number
  alternateGroup: number
  volume: number
  matrix: Int32Array,
  width: number
  height: number

  audioCid: number
  samplesPerFrame: number
  bytesPerFrame: number

  currentSample: number
  sampleEnd: boolean
  samplesIndex: Sample[]

  lastPts: bigint
  lastDts: bigint
  startDts: bigint
  startCT: number
  startPts: bigint
  lastDuration: number
  chunkCount: number
  firstWrote: boolean
  lastStscCount: number
  perStreamGrouping: boolean
  index: number
  flags: number
}

export interface ElstEntry {
  segmentDuration: int64
  mediaTime: int64
  mediaRate: number
  mediaRateFraction: number
}
