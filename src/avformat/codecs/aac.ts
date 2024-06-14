/*
 * libmedia aac util
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

import Stream from '../AVStream'
import { AVPacketSideDataType } from 'avutil/codec'
import { NOPTS_VALUE } from 'avutil/constant'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Uint8ArrayInterface } from 'common/io/interface'

export const enum MPEG4AudioObjectTypes {
  NULL = 0,
  /**
   * Main-AAC
   */
  AAC_MAIN,
  /**
   * LC-AAC
   */
  AAC_LC,
  AAC_SSR,
  AAC_LTP,
  /**
   * HE-AAC
   */
  AAC_SBR,
  AAC_SCALABLE,

  LAYER1 = 32,
  LAYER2,
  /**
   * MP3
   */
  LAYER3
}

export const MPEG4SamplingFrequencyIndex = {
  96000: 0,
  88200: 1,
  64000: 2,
  48000: 3,
  44100: 4,
  32000: 5,
  24000: 6,
  22050: 7,
  16000: 8,
  12000: 9,
  11025: 10,
  8000: 11,
  7350: 12
}

export const MPEG4SamplingFrequencies = [
  96000,
  88200,
  64000,
  48000,
  44100,
  32000,
  24000,
  22050,
  16000,
  12000,
  11025,
  8000,
  7350,
  NOPTS_VALUE,
  NOPTS_VALUE,
  NOPTS_VALUE
]

export const MPEG4Channels = [
  NOPTS_VALUE,
  1,
  2,
  3,
  4,
  5,
  6,
  7
]

/**
 * 解析 AAC AudioSpecificConfig
 *    
 *             frequency
 *              44100Hz        fill bit
 *               4 bit          3 bit
 *              -------         -----
 *    0 0 0 1 0 0 1 0 0 0 0 1 0 0 0 0
 *    ---------         -------
 *      5 bit            4 bit
 *     AAC LC           fl, fr
 *    profile           channel
 * 
 * url: https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Audio_Specific_Config
 * 
 */

export function getAVCodecParameters(extradata: Uint8ArrayInterface) {
  let profile = NOPTS_VALUE
  let sampleRate = NOPTS_VALUE
  let channels = NOPTS_VALUE
  if (extradata.length >= 2) {
    profile = (extradata[0] >> 3) & 0x1f
    sampleRate = MPEG4SamplingFrequencies[((extradata[0] & 0x07) << 1)
      | (extradata[1] >> 7)] ?? 48000

    channels = MPEG4Channels[(extradata[1] >> 3) & 0x0f] ?? 2
  }

  return {
    profile,
    sampleRate,
    channels
  }
}

export function parseAVCodecParameters(stream: Stream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata) {
    const { profile, sampleRate, channels } = getAVCodecParameters(extradata)
    stream.codecpar.profile = profile
    stream.codecpar.sampleRate = sampleRate
    stream.codecpar.chLayout.nbChannels = channels
  }
}

export function avCodecParameters2Extradata(codecpar: AVCodecParameters) {
  const samplingFreqIndex = MPEG4SamplingFrequencyIndex[codecpar.sampleRate]
  const channelConfig = codecpar.chLayout.nbChannels

  const extradata = new Uint8Array(2)
  extradata[0] = ((codecpar.profile & 0x1f) << 3) | ((samplingFreqIndex & 0x0e) >> 1)
  extradata[1] = ((samplingFreqIndex & 0x01) << 7) | ((channelConfig & 0x0f) << 3)

  return extradata
}
