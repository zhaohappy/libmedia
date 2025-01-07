/*
 * libmedia flac util
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

import BufferReader from 'common/io/BufferReader'
import Stream from '../AVStream'
import { AVPacketSideDataType } from '../codec'
import { Uint8ArrayInterface } from 'common/io/interface'

export const enum MetaDataBlockType {
  STREAMINFO,
  PADDING,
  APPLICATION,
  SEEKTABLE,
  VORBIS_COMMENT,
  CUESHEET,
  PICTURE
}

export const enum FlacCHMode {
  INDEPENDENT = 0,
  LEFT_SIDE = 1,
  RIGHT_SIDE = 2,
  MID_SIDE = 3
}

export const FLAC_STREAMINFO_SIZE = 34
export const FLAC_MAX_CHANNELS = 8
export const FLAC_MIN_BLOCKSIZE = 16
export const FLAC_MAX_BLOCKSIZE = 65535
export const FLAC_MIN_FRAME_SIZE = 10

export const SampleSizeTable: number[] = [0, 8, 12, 0, 16, 20, 24, 32]

export const SampleRateTable: number[] = [
  0, 88200, 176400, 192000, 8000, 16000, 22050,
  24000, 32000, 44100, 48000, 96000,
  0, 0, 0, 0
]

export const BlockSizeTable: number[] = [
  0, 192, 576 << 0, 576 << 1, 576 << 2, 576 << 3, 0, 0,
  256 << 0, 256 << 1, 256 << 2, 256 << 3, 256 << 4, 256 << 5, 256 << 6, 256 << 7
]

export const enum FlacChmode {
  FLAC_CHMODE_INDEPENDENT = 0,
  FLAC_CHMODE_LEFT_SIDE   = 1,
  FLAC_CHMODE_RIGHT_SIDE  = 2,
  FLAC_CHMODE_MID_SIDE    = 3,
}

export const enum FlacMetadataType {
  FLAC_METADATA_TYPE_STREAMINFO = 0,
  FLAC_METADATA_TYPE_PADDING,
  FLAC_METADATA_TYPE_APPLICATION,
  FLAC_METADATA_TYPE_SEEKTABLE,
  FLAC_METADATA_TYPE_VORBIS_COMMENT,
  FLAC_METADATA_TYPE_CUESHEET,
  FLAC_METADATA_TYPE_PICTURE,
  FLAC_METADATA_TYPE_INVALID = 127
}

export function parseAVCodecParameters(stream: Stream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length === FLAC_STREAMINFO_SIZE) {
    const { bitsPerRawSample, sampleRate, channels } = getAVCodecParameters(extradata)
    stream.codecpar.bitsPerRawSample = bitsPerRawSample
    stream.codecpar.sampleRate = sampleRate
    stream.codecpar.chLayout.nbChannels = channels
  }
}

function getAVCodecParameters(extradata: Uint8ArrayInterface) {
  const bufferReader = new BufferReader(extradata)
  bufferReader.skip(10)
  const value = bufferReader.readUint24()
  const sampleRate = (value >> 4)
  const channels = ((value & 0x0f) >>> 1) + 1
  const bitPerSample = bufferReader.readUint8()
  return {
    sampleRate,
    channels,
    bitsPerRawSample: (((value & 0x01) << 4) | ((bitPerSample & 0xf0) >>> 4)) + 1
  }
}
