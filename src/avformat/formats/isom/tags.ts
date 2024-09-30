/*
 * libmedia isom tag defined
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

import mktagle from '../../function/mktagle'
import { AVCodecID } from 'avutil/codec'

export const codecMovVideoTags: Record<int32, AVCodecID> = {
  [mktagle('mp4v')]: AVCodecID.AV_CODEC_ID_MPEG4,
  [mktagle('DIVX')]: AVCodecID.AV_CODEC_ID_MPEG4,
  [mktagle('XVID')]: AVCodecID.AV_CODEC_ID_MPEG4,
  [mktagle('3IV2')]: AVCodecID.AV_CODEC_ID_MPEG4,
  [mktagle('vvc1')]: AVCodecID.AV_CODEC_ID_VVC,
  [mktagle('vvi1')]: AVCodecID.AV_CODEC_ID_VVC,
  [mktagle('hev1')]: AVCodecID.AV_CODEC_ID_HEVC,
  [mktagle('hvc1')]: AVCodecID.AV_CODEC_ID_HEVC,
  [mktagle('dvhe')]: AVCodecID.AV_CODEC_ID_HEVC,
  [mktagle('hev1')]: AVCodecID.AV_CODEC_ID_HEVC,

  [mktagle('avc1')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('avc2')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('avc3')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('avc4')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai5p')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai5q')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai52')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai53')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai55')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai56')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai1p')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai1q')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai12')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai13')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai15')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('ai16')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('AVin')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('aivx')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('rv64')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('xalg')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('avlg')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('dva1')]: AVCodecID.AV_CODEC_ID_H264,
  [mktagle('dvav')]: AVCodecID.AV_CODEC_ID_H264,

  [mktagle('vp08')]: AVCodecID.AV_CODEC_ID_VP8,
  [mktagle('vp09')]: AVCodecID.AV_CODEC_ID_VP9,
  [mktagle('av01')]: AVCodecID.AV_CODEC_ID_AV1,
}

export const codecMovAudioTags: Record<int32, AVCodecID> = {
  [mktagle('mp4a')]: AVCodecID.AV_CODEC_ID_AAC,
  [mktagle('ac-3')]: AVCodecID.AV_CODEC_ID_AC3,
  [mktagle('sac3')]: AVCodecID.AV_CODEC_ID_AC3,
  [mktagle('ac-4')]: AVCodecID.AV_CODEC_ID_AC4,

  [mktagle('dtsc')]: AVCodecID.AV_CODEC_ID_DTS,
  [mktagle('dtsh')]: AVCodecID.AV_CODEC_ID_DTS,
  [mktagle('dtsl')]: AVCodecID.AV_CODEC_ID_DTS,
  [mktagle('dtse')]: AVCodecID.AV_CODEC_ID_DTS,
  [mktagle('DTS ')]: AVCodecID.AV_CODEC_ID_DTS,
  [mktagle('ec-3')]: AVCodecID.AV_CODEC_ID_EAC3,

  [mktagle('.mp3')]: AVCodecID.AV_CODEC_ID_MP3,
  [mktagle('mp3 ')]: AVCodecID.AV_CODEC_ID_MP3,
  [0x6D730055 as int32]: AVCodecID.AV_CODEC_ID_MP3,

  [mktagle('spex')]: AVCodecID.AV_CODEC_ID_SPEEX,
  [mktagle('SPXN')]: AVCodecID.AV_CODEC_ID_SPEEX,
  [mktagle('fLaC')]: AVCodecID.AV_CODEC_ID_FLAC,
  [mktagle('Opus')]: AVCodecID.AV_CODEC_ID_OPUS,

  [mktagle('alaw')]: AVCodecID.AV_CODEC_ID_PCM_ALAW,
  [mktagle('ulaw')]: AVCodecID.AV_CODEC_ID_PCM_MULAW,
  [mktagle('fl32')]: AVCodecID.AV_CODEC_ID_PCM_F32LE,
  [mktagle('fl64')]: AVCodecID.AV_CODEC_ID_PCM_F64LE,
  [mktagle('twos')]: AVCodecID.AV_CODEC_ID_PCM_S16BE,
  [mktagle('lpcm')]: AVCodecID.AV_CODEC_ID_PCM_S16LE,
  [mktagle('sowt')]: AVCodecID.AV_CODEC_ID_PCM_S16LE,
  [mktagle('in24')]: AVCodecID.AV_CODEC_ID_PCM_S24LE,
  [mktagle('in32')]: AVCodecID.AV_CODEC_ID_PCM_S32LE,
  [mktagle('sowt')]: AVCodecID.AV_CODEC_ID_PCM_S8,
  [mktagle('raw ')]: AVCodecID.AV_CODEC_ID_PCM_U8,
  [mktagle('NONE')]: AVCodecID.AV_CODEC_ID_PCM_U8
}
