/*
 * libmedia flv interface defined
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

import { AVColorPrimaries, AVColorSpace, AVColorTransferCharacteristic } from 'avutil/pixfmt'
import { Data } from 'common/types/type'

export interface FlvMetaData {
  audiocodecid: number
  audiodatarate: number
  audiosamplerate: number
  audiosamplesize: number
  audiosize: number
  canSeekToEnd: boolean
  datasize: number
  duration: number
  filesize: number
  framerate: number
  hasAudio: boolean
  hasKeyframes: boolean
  hasMetadata: boolean
  hasVideo: boolean
  height: number
  keyframes: {
    filepositions: number[]
    times: number[]
  }
  lastkeyframelocation: number
  lastkeyframetimestamp: bigint
  lasttimestamp: bigint
  metadatacreator: string
  stereo: boolean
  videocodecid: number
  videodatarate: number
  videosize: number
  width: number
  audioTrackIdInfoMap?: Record<number, Data>
  videoTrackIdInfoMap?: Record<number, Data>
}

export interface FlvContext {
  keyframeFilePositions: number[]
  keyFrameTimes: number[]
  lastkeyframelocation: number
  lastkeyframetimestamp: bigint
  lasttimestamp: bigint
  framerate: number
  filesize: number
  audioSize: number
  videosize: number
  datasize: number
  duration: number
  scriptWrote: boolean
  frameCount: number
  firstKeyframePositionWrote: boolean
  videoMetadataWrote: boolean
  enableNanoTimestamp: boolean
  multiAudioTracks: boolean
  multiVideoTracks: boolean
  useLegacyHevc: boolean
}

export interface FlvStreamContext {
  trackId: uint8

}

export interface FlvColorInfo {
  colorConfig: {
    // number of bits used to record the color channels for each pixel
    // SHOULD be 8, 10 or 12
    bitDepth?: number
    // colorPrimaries, transferCharacteristics and matrixCoefficients are defined
    // in ISO/IEC 23091-4/ITU-T H.273. The values are an index into
    // respective tables which are described in "Colour primaries",
    // "Transfer characteristics" and "Matrix coefficients" sections.
    // It is RECOMMENDED to provide these values.
    //
    // indicates the chromaticity coordinates of the source color primaries
    colorPrimaries?: AVColorPrimaries
    // opto-electronic transfer characteristic function (e.g., PQ, HLG)
    transferCharacteristics?: AVColorTransferCharacteristic
    // matrix coefficients used in deriving luma and chroma signals
    matrixCoefficients?: AVColorSpace
  }
  hdrCll?: {
    // maximum value of the frame average light level
    // (in 1 cd/m2) of the entire playback sequence
    maxFall: number
    // maximum light level of any single pixel (in 1 cd/m2)
    // of the entire playback sequence
    maxCLL: number
  }
  // The hdrMdcv object defines mastering display (i.e., where
  // creative work is done during the mastering process) color volume (a.k.a., mdcv)
  // metadata which describes primaries, white point and min/max luminance. The
  // hdrMdcv object SHOULD be provided.
  //
  // Specification of the metadata along with its ranges adhere to the
  // ST 2086:2018 - SMPTE Standard (except for minLuminance see
  // comments below)
  hdrMdcv?: {
    redX?: number
    redY?: number
    greenX?: number
    greenY?: number
    blueX?: number
    blueY?: number
    whitePointX?: number
    whitePointY?: number

    // max/min display luminance of the mastering display (in 1 cd/m2 ie. nits)
    //
    // note: ST 2086:2018 - SMPTE Standard specifies minimum display mastering
    // luminance in multiples of 0.0001 cd/m2.
    //
    // For consistency we specify all values
    // in 1 cd/m2. Given that a hypothetical perfect screen has a peak brightness
    // of 10,000 nits and a black level of .0005 nits we do not need to
    // switch units to 0.0001 cd/m2 to increase resolution on the lower end of the
    // minLuminance property. The ranges (in nits) mentioned below suffice
    // the theoretical limit for Mastering Reference Displays and adhere to the
    // SMPTE ST 2084 standard (a.k.a., PQ) which is capable of representing full gamut
    // of luminance level.

    // [5-10000]
    maxLuminance?: number
    // [0.0001-5]
    minLuminance?: number
  }
}
