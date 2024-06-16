/*
 * libmedia mp4 identify defined
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

import mktag from '../../function/mktag'
import { AVCodecID } from 'avutil/codec'
import { AVMediaType } from 'avutil/codec'
import { BoxType } from './boxType'

export const Mp4Tag2AVCodecID = {
  mp4v: AVCodecID.AV_CODEC_ID_MPEG4,
  avc1: AVCodecID.AV_CODEC_ID_H264,
  avc3: AVCodecID.AV_CODEC_ID_H264,
  hev1: AVCodecID.AV_CODEC_ID_HEVC,
  hvc1: AVCodecID.AV_CODEC_ID_HEVC,
  vvc1: AVCodecID.AV_CODEC_ID_VVC,
  vvi1: AVCodecID.AV_CODEC_ID_VVC,
  vp09: AVCodecID.AV_CODEC_ID_VP9,
  av01: AVCodecID.AV_CODEC_ID_AV1,
  mp4a: AVCodecID.AV_CODEC_ID_AAC,
  opus: AVCodecID.AV_CODEC_ID_OPUS
}

export const AVCodecID2Mp4a = {
  [AVCodecID.AV_CODEC_ID_AAC]: 0x40,
  [AVCodecID.AV_CODEC_ID_MP3]: 0x69,
  [AVCodecID.AV_CODEC_ID_OPUS]: 0xAD,
  [AVCodecID.AV_CODEC_ID_FLAC]: 0xC1,
  [AVCodecID.AV_CODEC_ID_VORBIS]: 0xDD,

  [AVCodecID.AV_CODEC_ID_MPEG4]: 0x20,
  [AVCodecID.AV_CODEC_ID_H264]: 0x21,
  [AVCodecID.AV_CODEC_ID_HEVC]: 0x23,
  [AVCodecID.AV_CODEC_ID_VVC]: 0x33,
  [AVCodecID.AV_CODEC_ID_VP9]: 0xB1,
  [AVCodecID.AV_CODEC_ID_NONE]: 0
}

export const Mp4aObj2AVCodecID = {
  0x20: AVCodecID.AV_CODEC_ID_MPEG4,
  0x21: AVCodecID.AV_CODEC_ID_H264,
  0x23: AVCodecID.AV_CODEC_ID_HEVC,
  0x33: AVCodecID.AV_CODEC_ID_VVC,
  0xB1: AVCodecID.AV_CODEC_ID_VP9,

  0x40: AVCodecID.AV_CODEC_ID_AAC,
  0x66: AVCodecID.AV_CODEC_ID_AAC,
  0x67: AVCodecID.AV_CODEC_ID_AAC,
  0x68: AVCodecID.AV_CODEC_ID_AAC,
  0x69: AVCodecID.AV_CODEC_ID_MP3,
  0x6B: AVCodecID.AV_CODEC_ID_MP3,
  0xAD: AVCodecID.AV_CODEC_ID_OPUS,
  0xC1: AVCodecID.AV_CODEC_ID_FLAC,
  0xDD: AVCodecID.AV_CODEC_ID_VORBIS,
  0: AVCodecID.AV_CODEC_ID_NONE
}

export const HandlerType2MediaType = {
  vide: AVMediaType.AVMEDIA_TYPE_VIDEO,
  soun: AVMediaType.AVMEDIA_TYPE_AUDIO,
  clcp: AVMediaType.AVMEDIA_TYPE_SUBTITLE,
  sbtl: AVMediaType.AVMEDIA_TYPE_SUBTITLE,
  subt: AVMediaType.AVMEDIA_TYPE_SUBTITLE,
  subp: AVMediaType.AVMEDIA_TYPE_SUBTITLE,
  text: AVMediaType.AVMEDIA_TYPE_SUBTITLE
}

export const tag2CodecId = {
  [mktag(BoxType.MP4A)]: AVCodecID.AV_CODEC_ID_AAC,
  [0x6D730055]: AVCodecID.AV_CODEC_ID_MP3,
  [mktag('Opus')]: AVCodecID.AV_CODEC_ID_OPUS,
  [mktag('fLaC')]: AVCodecID.AV_CODEC_ID_FLAC,
  [mktag('spex')]: AVCodecID.AV_CODEC_ID_SPEEX,
  [mktag('SPXN')]: AVCodecID.AV_CODEC_ID_SPEEX,
  [mktag('ac-3')]: AVCodecID.AV_CODEC_ID_AC3,
  [mktag('sac3')]: AVCodecID.AV_CODEC_ID_AC3,

  [mktag[BoxType.MP4V]]: AVCodecID.AV_CODEC_ID_MPEG4,
  [mktag('av01')]: AVCodecID.AV_CODEC_ID_AV1,
  [mktag('vp08')]: AVCodecID.AV_CODEC_ID_VP8,
  [mktag('vp09')]: AVCodecID.AV_CODEC_ID_VP9,
  [mktag('avc1')]: AVCodecID.AV_CODEC_ID_H264,
  [mktag('hev1')]: AVCodecID.AV_CODEC_ID_HEVC,
  [mktag('hvc1')]: AVCodecID.AV_CODEC_ID_HEVC,
  [mktag('vvc1')]: AVCodecID.AV_CODEC_ID_VVC,
  [mktag('vvi1')]: AVCodecID.AV_CODEC_ID_VVC,

  [mktag('text')]: AVCodecID.AV_CODEC_ID_MOV_TEXT,
  [mktag('tx3g')]: AVCodecID.AV_CODEC_ID_MOV_TEXT
}

export const enum FragmentMode {
  GOP,
  FRAME
}

export const enum MovMode {
  MP4,
  MOV
}
