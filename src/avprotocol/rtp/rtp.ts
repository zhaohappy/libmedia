/*
 * libmedia rtp
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

import { AVCodecID, AVMediaType } from 'avutil/codec'

export const RTP_MAX_PACKET_LENGTH = 8192
export const RTP_HEVC_PAYLOAD_HEADER_SIZE = 2
export const RTP_HEVC_DOND_FIELD_SIZE = 1
export const RTP_HEVC_DONL_FIELD_SIZE = 2

export const RTP_PAYLOAD_PRIVATE = 96

export interface H264PayloadContext {
  profile: number
  level: number
  packetizationMode: number
}

export interface HEVCPayloadContext {
  usingDonlField: number
  profile: number
}

export interface Mpeg4PayloadContext {
  sizeLength: number
  indexLength: number
  indexDeltaLength: number
  profileLevelId: number
  streamType: number
  objectType: number
  config: string
  mode: string
  cpresent: number
  latm: boolean
}

export interface RTPPayloadCodec {
  payload: uint8
  name: string
  codecType: AVMediaType
  codecId: AVCodecID
  rate: number
  encoding: number
}

export const RTPCodecName2AVCodeId = {
  'PCMU': AVCodecID.AV_CODEC_ID_PCM_MULAW,
  'PCMA': AVCodecID.AV_CODEC_ID_PCM_ALAW,
  'G723': AVCodecID.AV_CODEC_ID_G723_1,
  'G722': AVCodecID.AV_CODEC_ID_ADPCM_G722,
  'L16': AVCodecID.AV_CODEC_ID_PCM_S16BE,
  'MPA': AVCodecID.AV_CODEC_ID_MP3,
  'MPV': AVCodecID.AV_CODEC_ID_MPEG2VIDEO,
  'MP2T': AVCodecID.AV_CODEC_ID_MPEG2TS,
  'H264': AVCodecID.AV_CODEC_ID_H264,
  'H265': AVCodecID.AV_CODEC_ID_HEVC,
  'HEVC': AVCodecID.AV_CODEC_ID_HEVC,
  'VP8': AVCodecID.AV_CODEC_ID_VP8,
  'VP9': AVCodecID.AV_CODEC_ID_VP9,
  'AV1': AVCodecID.AV_CODEC_ID_AV1,
  'opus': AVCodecID.AV_CODEC_ID_OPUS,
  'speex': AVCodecID.AV_CODEC_ID_SPEEX,
  'vorbis': AVCodecID.AV_CODEC_ID_VORBIS,
  'theora': AVCodecID.AV_CODEC_ID_THEORA,
  'MP4A-LATM': AVCodecID.AV_CODEC_ID_AAC_LATM,
  'MP4V-ES': AVCodecID.AV_CODEC_ID_MPEG4,
  'mpeg4-generic': AVCodecID.AV_CODEC_ID_AAC,
  'ac3': AVCodecID.AV_CODEC_ID_AC3
}

export const StaticRTPPayloadCodec: RTPPayloadCodec[] = [
  {
    payload: 0,
    name: 'PCMU',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_PCM_MULAW,
    rate: 8000,
    encoding: 1
  },
  {
    payload: 4,
    name: 'G723',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_G723_1,
    rate: 8000,
    encoding: 1
  },
  {
    payload: 8,
    name: 'PCMA',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_PCM_ALAW,
    rate: 8000,
    encoding: 1
  },
  {
    payload: 9,
    name: 'G722',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_ADPCM_G722,
    rate: 8000,
    encoding: 1
  },
  {
    payload: 10,
    name: 'L16',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_PCM_S16BE,
    rate: 44100,
    encoding: 2
  },
  {
    payload: 11,
    name: 'L16',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_PCM_S16BE,
    rate: 44100,
    encoding: 1
  },
  {
    payload: 14,
    name: 'MPA',
    codecType: AVMediaType.AVMEDIA_TYPE_AUDIO,
    codecId: AVCodecID.AV_CODEC_ID_MP3,
    rate: -1,
    encoding: -1
  },
  {
    payload: 31,
    name: 'H261',
    codecType: AVMediaType.AVMEDIA_TYPE_VIDEO,
    codecId: AVCodecID.AV_CODEC_ID_H261,
    rate: 90000,
    encoding: -1
  },
  {
    payload: 32,
    name: 'MPV',
    codecType: AVMediaType.AVMEDIA_TYPE_VIDEO,
    codecId: AVCodecID.AV_CODEC_ID_MPEG2VIDEO,
    rate: 90000,
    encoding: -1
  },
  {
    payload: 33,
    name: 'MPV',
    codecType: AVMediaType.AVMEDIA_TYPE_DATA,
    codecId: AVCodecID.AV_CODEC_ID_MPEG2TS,
    rate: 90000,
    encoding: -1
  },
  {
    payload: 34,
    name: 'H263',
    codecType: AVMediaType.AVMEDIA_TYPE_VIDEO,
    codecId: AVCodecID.AV_CODEC_ID_H263,
    rate: 90000,
    encoding: -1
  }
]
