/*
 * libmedia flv defined
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

import { AVCodecID } from 'avutil/codec'

export const enum FlvTag {
  AUDIO = 8,
  VIDEO = 9,
  SCRIPT = 18
}

export const enum PacketTypeExt {
  PacketTypeSequenceStart = 0,
  PacketTypeCodedFrames = 1,
  PacketTypeSequenceEnd = 2,
  PacketTypeCodedFramesX = 3,
  PacketTypeMetadata = 4,
  PacketTypeMPEG2TSSequenceStart = 5
}

export const AVCodecID2FlvCodecType = {
  [AVCodecID.AV_CODEC_ID_AAC]: 10,
  [AVCodecID.AV_CODEC_ID_MP3]: 2,
  [AVCodecID.AV_CODEC_ID_SPEEX]: 11,
  [AVCodecID.AV_CODEC_ID_H264]: 7,
  [AVCodecID.AV_CODEC_ID_HEVC]: 12,
  [AVCodecID.AV_CODEC_ID_MPEG4]: 9
}

export const FlvAudioCodecType2AVCodecID = {
  10: AVCodecID.AV_CODEC_ID_AAC,
  2: AVCodecID.AV_CODEC_ID_MP3,
  11: AVCodecID.AV_CODEC_ID_SPEEX
}

export const FlvVideoCodecType2AVCodecID = {
  7: AVCodecID.AV_CODEC_ID_H264,
  12: AVCodecID.AV_CODEC_ID_HEVC,
  9: AVCodecID.AV_CODEC_ID_MPEG4
}

export const FlvCodecHeaderLength = {
  [AVCodecID.AV_CODEC_ID_AAC]: 1,
  [AVCodecID.AV_CODEC_ID_MP3]: 1,
  [AVCodecID.AV_CODEC_ID_SPEEX]: 1,
  [AVCodecID.AV_CODEC_ID_H264]: 4,
  [AVCodecID.AV_CODEC_ID_HEVC]: 4,
  [AVCodecID.AV_CODEC_ID_MPEG4]: 4
}
