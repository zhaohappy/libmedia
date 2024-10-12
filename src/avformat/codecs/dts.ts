/*
 * libmedia dts util
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
import { Uint8ArrayInterface } from 'common/io/interface'
import align from 'common/math/align'

const DTSChannelTab = [1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 6, 7, 8, 8]

const DTSSampleRateTab = [0, 8000, 16000, 32000, 0, 0, 11025, 22050, 44100, 0, 0, 12000, 24000, 48000, 96000, 192000]

const DTSBitrateTab = [32000, 56000, 64000, 96000, 112000, 128000, 192000, 224000, 256000, 320000, 384000, 448000,
  512000, 576000, 640000, 768000, 960000, 1024000, 1152000, 1280000, 1344000, 1408000, 1411200, 1472000, 1536000,
  1920000, 2048000, 3072000, 3840000, 0, 0, 0
]

export const DTS_PCMBLOCK_SAMPLES = 32

export interface DTSHeaderInfo {
  syncWord: uint32
  frameType: int32
  deficitSamples: int32
  crcFlag: int32
  sampleBlock: int32
  frameSize: int32
  channelIndex: int32
  sampleRateIndex: int32
  bitrateIndex: int32

  channels: int32
  sampleRate: int32
  bitrate: int32
}

export function parseHeader(buf: Uint8ArrayInterface) {
  const bitReader = new BitReader(buf.length)
  bitReader.appendBuffer(buf)

  const info: DTSHeaderInfo = {
    syncWord: 0,
    frameType: 0,
    deficitSamples: 0,
    crcFlag: 0,
    sampleBlock: 0,
    frameSize: 0,
    channelIndex: 0,
    sampleRateIndex: 0,
    bitrateIndex: 0,

    channels: 0,
    sampleRate: 0,
    bitrate: 0
  }

  info.syncWord = bitReader.readU(32)

  if (info.syncWord !== 0x7ffe8001 && info.syncWord !== 0xfe7f0180) {
    return -1
  }

  info.frameType = bitReader.readU1()
  info.deficitSamples = bitReader.readU(5) + 1
  info.crcFlag = bitReader.readU1()
  info.sampleBlock = bitReader.readU(7) + 1
  info.frameSize = align(bitReader.readU(14) + 1, 4)
  info.channelIndex = bitReader.readU(6)
  info.sampleRateIndex = bitReader.readU(4)
  info.bitrateIndex = bitReader.readU(5)

  info.channels = DTSChannelTab[info.channelIndex]
  info.sampleRate = DTSSampleRateTab[info.sampleRateIndex]
  info.bitrate = DTSBitrateTab[info.bitrateIndex]

  return info
}
