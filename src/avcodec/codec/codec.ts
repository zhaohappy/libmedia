/*
 * libmedia  codec string map
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

export const CodecId2String = {
  [AVCodecID.AV_CODEC_ID_MP3]: 'mp3',
  [AVCodecID.AV_CODEC_ID_AAC]: 'mp4a.40',
  [AVCodecID.AV_CODEC_ID_VORBIS]: 'vorbis',
  [AVCodecID.AV_CODEC_ID_FLAC]: 'flac',
  [AVCodecID.AV_CODEC_ID_OPUS]: 'opus',
  [AVCodecID.AV_CODEC_ID_PCM_MULAW]: 'ulaw',
  [AVCodecID.AV_CODEC_ID_PCM_ALAW]: 'alaw',

  [AVCodecID.AV_CODEC_ID_AV1]: 'av01',
  [AVCodecID.AV_CODEC_ID_H264]: 'avc1',
  [AVCodecID.AV_CODEC_ID_HEVC]: 'hev1',
  [AVCodecID.AV_CODEC_ID_VP8]: 'vp8',
  [AVCodecID.AV_CODEC_ID_VP9]: 'vp09',
  [AVCodecID.AV_CODEC_ID_MPEG4]: 'mp4v'
}
