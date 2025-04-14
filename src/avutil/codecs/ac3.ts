/*
 * libmedia ac3 util
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

import { AVChannelLayout } from '../audiosamplefmt'
import BitReader from 'common/io/BitReader'
import { Uint8ArrayInterface } from 'common/io/interface'

export const enum AC3DeltaStrategy {
  DBA_REUSE = 0,
  DBA_NEW,
  DBA_NONE,
  DBA_RESERVED
}

export const enum AC3ChannelMode {
  AC3_CHMODE_DUALMONO = 0,
  AC3_CHMODE_MONO,
  AC3_CHMODE_STEREO,
  AC3_CHMODE_3F,
  AC3_CHMODE_2F1R,
  AC3_CHMODE_3F1R,
  AC3_CHMODE_2F2R,
  AC3_CHMODE_3F2R
}

export const enum AC3DolbySurroundMode {
  AC3_DSURMOD_NOTINDICATED = 0,
  AC3_DSURMOD_OFF,
  AC3_DSURMOD_ON,
  AC3_DSURMOD_RESERVED
}

export const enum AC3DolbySurroundEXMode {
  AC3_DSUREXMOD_NOTINDICATED = 0,
  AC3_DSUREXMOD_OFF,
  AC3_DSUREXMOD_ON,
  AC3_DSUREXMOD_PLIIZ
}

export const enum AC3DolbyHeadphoneMode {
  AC3_DHEADPHONMOD_NOTINDICATED = 0,
  AC3_DHEADPHONMOD_OFF,
  AC3_DHEADPHONMOD_ON,
  AC3_DHEADPHONMOD_RESERVED
}

export const enum AC3PreferredStereoDownmixMode {
  AC3_DMIXMOD_NOTINDICATED = 0,
  AC3_DMIXMOD_LTRT,
  AC3_DMIXMOD_LORO,
  // reserved value in A/52, but used by encoders to indicate DPL2
  AC3_DMIXMOD_DPLII
}

export const enum EAC3FrameType {
  EAC3_FRAME_TYPE_INDEPENDENT = 0,
  EAC3_FRAME_TYPE_DEPENDENT,
  EAC3_FRAME_TYPE_AC3_CONVERT,
  EAC3_FRAME_TYPE_RESERVED
}

export const AC3ChannelLayout: uint32[] = [
  AVChannelLayout.AV_CHANNEL_LAYOUT_STEREO,
  AVChannelLayout.AV_CHANNEL_LAYOUT_MONO,
  AVChannelLayout.AV_CHANNEL_LAYOUT_STEREO,
  AVChannelLayout.AV_CHANNEL_LAYOUT_SURROUND,
  AVChannelLayout.AV_CHANNEL_LAYOUT_2_1,
  AVChannelLayout.AV_CHANNEL_LAYOUT_4POINT0,
  AVChannelLayout.AV_CHANNEL_LAYOUT_2_2,
  AVChannelLayout.AV_CHANNEL_LAYOUT_5POINT0
]

export interface AC3HeaderInfo {
  syncWord: uint16
  crc1: uint16
  srCode: uint8
  bitstreamId: uint8
  bitstreamMode: uint8
  channelMode: uint8
  lfeOn: uint8
  frameType: uint8
  substreamId: int32
  centerMixLevel: int32
  surroundMixLevel: int32
  channelMap: uint16
  numBlocks: int32
  dolbySurroundMode: int32
  srShift: uint8
  sampleRate: uint16
  bitrate: uint32
  channels: uint8
  frameSize: uint16
  channelLayout: uint64
  ac3BitrateCode: int8
}

const AC3FrameSizeTab = [
  [ 64,   69,   96   ],
  [ 64,   70,   96   ],
  [ 80,   87,   120  ],
  [ 80,   88,   120  ],
  [ 96,   104,  144  ],
  [ 96,   105,  144  ],
  [ 112,  121,  168  ],
  [ 112,  122,  168  ],
  [ 128,  139,  192  ],
  [ 128,  140,  192  ],
  [ 160,  174,  240  ],
  [ 160,  175,  240  ],
  [ 192,  208,  288  ],
  [ 192,  209,  288  ],
  [ 224,  243,  336  ],
  [ 224,  244,  336  ],
  [ 256,  278,  384  ],
  [ 256,  279,  384  ],
  [ 320,  348,  480  ],
  [ 320,  349,  480  ],
  [ 384,  417,  576  ],
  [ 384,  418,  576  ],
  [ 448,  487,  672  ],
  [ 448,  488,  672  ],
  [ 512,  557,  768  ],
  [ 512,  558,  768  ],
  [ 640,  696,  960  ],
  [ 640,  697,  960  ],
  [ 768,  835,  1152 ],
  [ 768,  836,  1152 ],
  [ 896,  975,  1344 ],
  [ 896,  976,  1344 ],
  [ 1024, 1114, 1536 ],
  [ 1024, 1115, 1536 ],
  [ 1152, 1253, 1728 ],
  [ 1152, 1254, 1728 ],
  [ 1280, 1393, 1920 ],
  [ 1280, 1394, 1920 ],
]

const CenterLevelsTab = [4, 5, 6, 5]
const SurroundLevelsTab = [4, 6, 7, 6]
const AC3SampleRateTab = [48000, 44100, 32000, 0]
const AC3BitrateTab = [
  32, 40, 48, 56, 64, 80, 96, 112, 128,
  160, 192, 224, 256, 320, 384, 448, 512, 576, 640
]
const AC3ChannelsTab = [
  2, 1, 2, 3, 3, 4, 4, 5
]

const EAC3Blocks = [
  1, 2, 3, 6
]

const AC3_HEADER_SIZE = 7

export function parseHeader(buf: Uint8ArrayInterface) {
  const bitReader = new BitReader(buf.length)
  bitReader.appendBuffer(buf)

  const info: AC3HeaderInfo = {
    syncWord: 0,
    crc1: 0,
    srCode: 0,
    bitstreamId: 0,
    bitstreamMode: 0,
    channelMode: 0,
    lfeOn: 0,
    frameType: 0,
    substreamId: 0,
    centerMixLevel: 0,
    surroundMixLevel: 0,
    channelMap: 0,
    numBlocks: 0,
    dolbySurroundMode: 0,
    srShift: 0,
    sampleRate: 0,
    bitrate: 0,
    channels: 0,
    frameSize: 0,
    channelLayout: 0n,
    ac3BitrateCode: 0
  }

  info.syncWord = bitReader.readU(16)

  if (info.syncWord !== 0x0B77) {
    return -1
  }

  info.bitstreamId = bitReader.peekU(29) & 0x1f

  if (info.bitstreamId > 16) {
    return -2
  }

  info.numBlocks = 6
  info.ac3BitrateCode = -1
  info.centerMixLevel = 5
  info.surroundMixLevel = 6

  info.dolbySurroundMode = AC3DolbySurroundMode.AC3_DSURMOD_NOTINDICATED

  if (info.bitstreamId <= 10) {
    info.crc1 = bitReader.readU(16)
    info.srCode = bitReader.readU(2)

    if (info.srCode === 3) {
      return -3
    }

    const frameSizeCode = bitReader.readU(6)
    if (frameSizeCode > 37) {
      return -4
    }

    info.ac3BitrateCode = (frameSizeCode >> 1)

    bitReader.readU(5)

    info.bitstreamMode = bitReader.readU(3)
    info.channelMode = bitReader.readU(3)

    if (info.channelMode == AC3ChannelMode.AC3_CHMODE_STEREO) {
      info.dolbySurroundMode = bitReader.readU(2)
    }
    else {
      if ((info.channelMode & 1) && info.channelMode != AC3ChannelMode.AC3_CHMODE_MONO) {
        info.centerMixLevel = CenterLevelsTab[bitReader.readU(2)]
      }
      if (info.channelMode & 4) {
        info.surroundMixLevel = SurroundLevelsTab[bitReader.readU(2)]
      }
    }
    info.lfeOn = bitReader.readU(1)

    info.srShift = Math.max(info.bitstreamId, 8) - 8
    info.sampleRate = AC3SampleRateTab[info.srCode] >> info.srShift
    info.bitrate = (AC3BitrateTab[info.ac3BitrateCode] * 1000) >> info.srShift
    info.channels = AC3ChannelsTab[info.channelMode] + info.lfeOn
    info.frameSize = AC3FrameSizeTab[frameSizeCode][info.srCode] * 2
    info.frameType = EAC3FrameType.EAC3_FRAME_TYPE_AC3_CONVERT
    info.substreamId = 0
  }
  else {
    /* Enhanced AC-3 */
    info.crc1 = 0
    info.frameType = bitReader.readU(2)
    if (info.frameType == EAC3FrameType.EAC3_FRAME_TYPE_RESERVED) {
      return -5
    }
    info.substreamId = bitReader.readU(3)

    info.frameSize = (bitReader.readU(11) + 1) << 1
    if (info.frameSize < AC3_HEADER_SIZE) {
      return -6
    }

    info.srCode = bitReader.readU(2)
    if (info.srCode == 3) {
      const srCode2 = bitReader.readU(2)
      if (srCode2 == 3) {
        return -7
      }
      info.sampleRate = AC3SampleRateTab[srCode2] / 2
      info.srShift = 1
    }
    else {
      info.numBlocks = EAC3Blocks[bitReader.readU(2)]
      info.sampleRate = AC3SampleRateTab[info.srCode]
      info.srShift = 0
    }

    info.channelMode = bitReader.readU(3)
    info.lfeOn = bitReader.readU(1)

    info.bitrate = 8 * info.frameSize * info.sampleRate / (info.numBlocks * 256)
    info.channels = AC3ChannelsTab[info.channelMode] + info.lfeOn
  }
  info.channelLayout = static_cast<uint64>(AC3ChannelLayout[info.channelMode])
  if (info.lfeOn) {
    info.channelLayout |= static_cast<uint64>(AVChannelLayout.AV_CHANNEL_LAYOUT_LOW_FREQUENCY as uint32)
  }

  return info
}
