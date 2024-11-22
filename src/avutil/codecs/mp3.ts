/*
 * libmedia mp3 util
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

import { Uint8ArrayInterface } from 'common/io/interface'
import AVStream from '../AVStream'
import { NOPTS_VALUE } from '../constant'

const MpegAudioV10SampleRateTable = [44100, 48000, 32000, 0]

const MpegAudioV20SampleRateTable = [22050, 24000, 16000, 0]

const MpegAudioV25SampleRateTable = [11025, 12000, 8000, 0]

const MpegAudioV10FrameSizeTable = [0, 1152, 1152, 384]

const MpegAudioV20FrameSizeTable = [0, 576, 1152, 384]

const MpegAudioV25FrameSizeTable = [0, 576, 1152, 384]

const MpegAudioV1L1BitRateTable = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, -1]

const MpegAudioV1L2BitRateTable = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, -1]

const MpegAudioV1L3BitRateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1]

const MpegAudioV2L1BitRateTable = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, -1]

const MpegAudioV2L2L3BitRateTable = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1]

export function getSampleRateByVersionIndex(version: number, samplingFreqIndex: number) {
  switch (version) {
    case 0:
      // MPEG 2.5
      return MpegAudioV25SampleRateTable[samplingFreqIndex]
    case 2:
      // MPEG 2
      return MpegAudioV20SampleRateTable[samplingFreqIndex]
    case 3:
      // MPEG 1
      return MpegAudioV10SampleRateTable[samplingFreqIndex]
  }
  return NOPTS_VALUE
}

export function getFrameSizeByVersionLayer(version: number, layer: number) {
  switch (version) {
    case 0:
      // MPEG 2.5
      return MpegAudioV25FrameSizeTable[layer]
    case 2:
      // MPEG 2
      return MpegAudioV20FrameSizeTable[layer]
    case 3:
      // MPEG 1
      return MpegAudioV10FrameSizeTable[layer]
  }
  return NOPTS_VALUE
}

export function getBitRateByVersionLayerIndex(version: number, layer: number, index: number) {

  switch (layer) {
    // layer3
    case 1:
      switch (version) {
        case 0:
        case 2:
          return MpegAudioV2L2L3BitRateTable[index]
        case 3:
          return MpegAudioV1L3BitRateTable[index]
      }
      break
    // layer2
    case 2:
      switch (version) {
        case 0:
        case 2:
          return MpegAudioV2L2L3BitRateTable[index]
        case 3:
          return MpegAudioV1L2BitRateTable[index]
      }
    // layer1
    case 3:
      switch (version) {
        case 0:
        case 2:
          return MpegAudioV2L1BitRateTable[index]
        case 3:
          return MpegAudioV1L1BitRateTable[index]
      }
  }
  return NOPTS_VALUE
}

export function getProfileByLayer(layer: number) {
  switch (layer) {
    case 1:
      // Layer 3
      return 34
    case 2:
      // Layer 2
      return 33
    case 3:
      // Layer 1
      return 32
  }
  return NOPTS_VALUE
}

export const enum MP3Profile {
  Layer1 = 32,
  Layer2 = 33,
  Layer3 = 34
}

export const MP3Profile2Name: Record<MP3Profile, string> = {
  [MP3Profile.Layer1]: 'Layer1',
  [MP3Profile.Layer2]: 'Layer2',
  [MP3Profile.Layer3]: 'Layer3'
}


export function parseAVCodecParameters(stream: AVStream, buffer: Uint8ArrayInterface) {
  if (buffer && buffer.length >= 4) {
    const ver = (buffer[1] >>> 3) & 0x03
    const layer = (buffer[1] & 0x06) >> 1
    // const bitrateIndex = (buffer[2] & 0xF0) >>> 4
    const samplingFreqIndex = (buffer[2] & 0x0C) >>> 2

    const channelMode = (buffer[3] >>> 6) & 0x03

    const channelCount = channelMode !== 3 ? 2 : 1
    const profile = getProfileByLayer(layer)
    const sampleRate = getSampleRateByVersionIndex(ver, samplingFreqIndex)

    stream.codecpar.profile = profile
    stream.codecpar.sampleRate = sampleRate
    stream.codecpar.chLayout.nbChannels = channelCount
  }
}
