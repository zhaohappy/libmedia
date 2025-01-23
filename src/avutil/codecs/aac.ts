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

import { AVSampleFormat } from '../audiosamplefmt'
import Stream from '../AVStream'
import { AVPacketSideDataType } from '../codec'
import { NOPTS_VALUE } from '../constant'
import AVCodecParameters from '../struct/avcodecparameters'
import BitReader from 'common/io/BitReader'
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

export const AACProfile2Name: Partial<Record<MPEG4AudioObjectTypes, string>> = {
  [MPEG4AudioObjectTypes.AAC_MAIN]: 'Main',
  [MPEG4AudioObjectTypes.AAC_LC]: 'LC',
  [MPEG4AudioObjectTypes.AAC_SSR]: 'LC',
  [MPEG4AudioObjectTypes.AAC_LTP]: 'LC',
  [MPEG4AudioObjectTypes.AAC_SBR]: 'HE',
  [MPEG4AudioObjectTypes.AAC_SCALABLE]: 'HE'
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
      | (extradata[1] >> 7)]

    channels = MPEG4Channels[(extradata[1] >> 3) & 0x0f]
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
    stream.codecpar.frameSize = profile ===  MPEG4AudioObjectTypes.AAC_SBR ? 2048 : 1024
    stream.codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_FLTP
  }
}

export function avCodecParameters2Extradata(codecpar: AVCodecParameters) {
  const samplingFreqIndex = MPEG4SamplingFrequencyIndex[codecpar.sampleRate]
  const channelConfig = codecpar.chLayout.nbChannels
  const profile = codecpar.profile === NOPTS_VALUE ? MPEG4AudioObjectTypes.AAC_LC : codecpar.profile

  const extradata = new Uint8Array(2)
  extradata[0] = ((profile & 0x1f) << 3) | ((samplingFreqIndex & 0x0e) >> 1)
  extradata[1] = ((samplingFreqIndex & 0x01) << 7) | ((channelConfig & 0x0f) << 3)

  return extradata
}

export interface AACADTSHeader {
  syncWord: number
  profile: number
  sampleRate: number
  channels: number
  aacFrameLength: number
  numberOfRawDataBlocksInFrame: number
  headerLength: number
  framePayloadLength: number
}

export interface AACLATMHeader {
  syncWord: number
  profile: number
  sampleRate: number
  channels: number
  useSameStreamMux: boolean
  headerLength: number
  framePayloadLength: number
  muxLengthBytes: number
}

/**
 * 
 * adts 封装转 raw
 * 
 * bits    
 * - 12  syncword
 * - 1   ID (MPEG 标识位，固定为 1)
 * - 2   Layer ( 固定为 0)
 * - 1   Protection Absent ( 指示是否有 CRC 校验，1 表示没有校验）
 * - 2   Profile
 * - 4   Sampling Frequency Index ( 采样率的索引）
 * - 1   Private Bit ( 保留位，一般设置为 0)
 * - 3   Channel Configuration ( 音频通道数）
 * - 1   Original Copy ( 原始拷贝标志位，一般设置为 0)
 * - 1   Home ( 保留位，一般设置为 0)
 * - 1   Copyright Identification Bit（置 0）
 * - 1   Copyright Identification Start（置 0）
 * - 13  Frame Length ( 帧长度，包括 ADTS 头和音频帧数据的长度）
 * - 11  Buffer Fullness ( 缓冲区满度，可用于音频流的同步）
 * - 2   Number of Raw Data Blocks in Frame ( 帧中原始数据块的数量）
 * - 16  CRC (Protection Absent 控制）
 * - N  raw aac data
 * 
 */
export function parseADTSHeader(buffer: Uint8ArrayInterface): AACADTSHeader | number {

  if (buffer.length < 7) {
    return -1
  }

  const syncWord = (buffer[0] << 4) | (buffer[0 + 1] >> 4)

  if (syncWord !== 0xFFF) {
    return -1
  }

  /*
    * const id = (buffer[1] & 0x08) >>> 3
    * const layer = (buffer[1] & 0x06) >>> 1
    */
  const protectionAbsent = buffer[1] & 0x01
  const profile = (buffer[2] & 0xC0) >>> 6
  const samplingFrequencyIndex = (buffer[2] & 0x3C) >>> 2
  const channelConfiguration = ((buffer[2] & 0x01) << 2) | ((buffer[3] & 0xC0) >>> 6)

  // adts_variable_header()
  const aacFrameLength = ((buffer[3] & 0x03) << 11)
    | (buffer[4] << 3)
    | ((buffer[5] & 0xE0) >>> 5)

  const numberOfRawDataBlocksInFrame = buffer[6] & 0x03

  let headerLength = protectionAbsent === 1 ? 7 : 9
  let framePayloadLength = aacFrameLength - headerLength

  return {
    syncWord,
    profile: profile + 1,
    sampleRate: MPEG4SamplingFrequencies[samplingFrequencyIndex],
    channels: MPEG4Channels[channelConfiguration],
    aacFrameLength,
    numberOfRawDataBlocksInFrame,
    headerLength,
    framePayloadLength
  }
}

export function parseLATMHeader(buffer: Uint8ArrayInterface, bitReader?: BitReader) {
  if (!bitReader) {
    bitReader = new BitReader()
    bitReader.appendBuffer(buffer)
  }

  function getLATMValue() {
    const bytesForValue = bitReader.readU(2)
    let value = 0

    for (let i = 0; i <= bytesForValue; i++) {
      value = value << 8
      value = value | bitReader.readU(8)
    }
    return value
  }

  const now = bitReader.getPointer()

  const info: AACLATMHeader = {
    syncWord: 0,
    profile: 0,
    sampleRate: 0,
    channels: 0,
    useSameStreamMux: false,
    headerLength: 0,
    framePayloadLength: 0,
    muxLengthBytes: 0
  }

  const syncWord = bitReader.readU(11)

  if (syncWord !== 0x2B7) {
    return -1
  }

  info.syncWord = syncWord

  info.muxLengthBytes = bitReader.readU(13)

  const useSameStreamMux = bitReader.readU1() === 0x01

  info.useSameStreamMux = useSameStreamMux

  if (!useSameStreamMux) {
    const audioMuxVersion = bitReader.readU1() === 0x01
    const audioMuxVersionA = audioMuxVersion && bitReader.readU1() === 0x01
    if (audioMuxVersionA) {
      return -1
    }
    if (audioMuxVersion) {
      getLATMValue()
    }
    const allStreamsSameTimeFraming = bitReader.readU1() === 0x01
    if (!allStreamsSameTimeFraming) {
      return -1
    }
    const numSubFrames = bitReader.readU(6)
    if (numSubFrames !== 0) {
      return -1
    }

    const numProgram = bitReader.readU(4)
    if (numProgram !== 0) {
      return -1
    }

    const numLayer = bitReader.readU(3)
    if (numLayer !== 0) {
      return -1
    }

    let fillBits = audioMuxVersion ? getLATMValue() : 0

    const audioObjectType = bitReader.readU(5)
    fillBits -= 5

    const samplingFreqIndex = bitReader.readU(4)
    fillBits -= 4

    const channelConfig = bitReader.readU(4)
    fillBits -= 4

    bitReader.readU(3)
    fillBits -= 3

    if (fillBits > 0) {
      bitReader.readU(fillBits)
    }

    const frameLengthType = bitReader.readU(3)
    if (frameLengthType === 0) {
      bitReader.readU(8)
    }
    else {
      return -1
    }

    const otherDataPresent = bitReader.readU1() === 0x01
    if (otherDataPresent) {
      if (audioMuxVersion) {
        getLATMValue()
      }
      else {
        let otherDataLenBits = 0
        while (true) {
          otherDataLenBits = otherDataLenBits << 8
          const otherDataLenEsc = bitReader.readU1() === 0x01
          const otherDataLenTmp = bitReader.readU(8)
          otherDataLenBits += otherDataLenTmp
          if (!otherDataLenEsc) {
            break
          }
        }
      }
    }

    const crcCheckPresent = bitReader.readU1() === 0x01
    if (crcCheckPresent) {
      bitReader.readU(8)
    }

    info.profile = audioObjectType + 1
    info.sampleRate = MPEG4SamplingFrequencies[samplingFreqIndex]
    info.channels = MPEG4Channels[channelConfig]
  }

  let length = 0
  while (true) {
    const tmp = bitReader.readU(8)
    length += tmp
    if (tmp !== 0xff) {
      break
    }
  }

  info.framePayloadLength = length
  info.headerLength = bitReader.getPointer() - now + (bitReader.getBitLeft() === 8 ? 0 : 1)

  return info
}
