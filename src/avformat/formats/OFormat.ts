/*
 * libmedia abstract format encoder
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
import { AVFormat } from 'avutil/avformat'
import { AVOFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'

export default abstract class OFormat {

  public type: AVFormat = AVFormat.UNKNOWN

  public abstract init(formatContext: AVOFormatContext): number

  public async destroy(formatContext: AVOFormatContext) {}

  public abstract writeHeader(formatContext: AVOFormatContext): number

  public abstract writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number

  public abstract flush(formatContext: AVOFormatContext): number

  public abstract writeTrailer(formatContext: AVOFormatContext): number

}

export const OFormatSupportedCodecs: Record<Exclude<AVFormat, AVFormat.UNKNOWN>, AVCodecID[]> = {
  [AVFormat.AAC]: [AVCodecID.AV_CODEC_ID_AAC],
  [AVFormat.AVI]: [
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_AC3,
    AVCodecID.AV_CODEC_ID_AAC,

    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_H264
  ],
  [AVFormat.FLAC]: [AVCodecID.AV_CODEC_ID_FLAC],
  [AVFormat.FLV]: [
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_SPEEX,
    AVCodecID.AV_CODEC_ID_ADPCM_SWF,
    AVCodecID.AV_CODEC_ID_NELLYMOSER,
    AVCodecID.AV_CODEC_ID_PCM_ALAW,
    AVCodecID.AV_CODEC_ID_PCM_MULAW,
    AVCodecID.AV_CODEC_ID_AC3,
    AVCodecID.AV_CODEC_ID_EAC3,
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_FLAC,

    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_AV1,
    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_VP8,
    AVCodecID.AV_CODEC_ID_VVC
  ],
  [AVFormat.IVF]: [AVCodecID.AV_CODEC_ID_VP8, AVCodecID.AV_CODEC_ID_VP9],
  [AVFormat.MATROSKA]: [
    AVCodecID.AV_CODEC_ID_VORBIS,
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_FLAC,
    AVCodecID.AV_CODEC_ID_ALAC,
    AVCodecID.AV_CODEC_ID_DTS,
    AVCodecID.AV_CODEC_ID_EAC3,
    AVCodecID.AV_CODEC_ID_AC3,
    AVCodecID.AV_CODEC_ID_PCM_F32LE,
    AVCodecID.AV_CODEC_ID_PCM_S16BE,
    AVCodecID.AV_CODEC_ID_PCM_S16LE,

    AVCodecID.AV_CODEC_ID_VP8,
    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_AV1,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VVC,
    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_THEORA,

    AVCodecID.AV_CODEC_ID_WEBVTT,
    AVCodecID.AV_CODEC_ID_SSA,
    AVCodecID.AV_CODEC_ID_ASS,
    AVCodecID.AV_CODEC_ID_TEXT,
    AVCodecID.AV_CODEC_ID_SUBRIP
  ],
  [AVFormat.WEBM]: [
    AVCodecID.AV_CODEC_ID_VORBIS,
    AVCodecID.AV_CODEC_ID_OPUS,

    AVCodecID.AV_CODEC_ID_VP8,
    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_AV1,

    AVCodecID.AV_CODEC_ID_WEBVTT
  ],
  [AVFormat.MOV]: [
    AVCodecID.AV_CODEC_ID_VORBIS,
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_FLAC,
    AVCodecID.AV_CODEC_ID_SPEEX,
    AVCodecID.AV_CODEC_ID_AC3,
    AVCodecID.AV_CODEC_ID_EAC3,

    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_AV1,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VVC,
    AVCodecID.AV_CODEC_ID_MPEG4,

    AVCodecID.AV_CODEC_ID_WEBVTT,
    AVCodecID.AV_CODEC_ID_MOV_TEXT
  ],
  [AVFormat.MP3]: [AVCodecID.AV_CODEC_ID_MP3],
  [AVFormat.MPEGTS]: [
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_AC3,,
    AVCodecID.AV_CODEC_ID_DTS,
    AVCodecID.AV_CODEC_ID_AAC_LATM,
    AVCodecID.AV_CODEC_ID_EAC3,

    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_AV1,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VVC
  ],
  [AVFormat.MPEGPS]: [
    AVCodecID.AV_CODEC_ID_MP1,
    AVCodecID.AV_CODEC_ID_MP2,
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_AC3,,
    AVCodecID.AV_CODEC_ID_DTS,

    AVCodecID.AV_CODEC_ID_MPEG2VIDEO,
    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VVC
  ],
  [AVFormat.OGG]: [
    AVCodecID.AV_CODEC_ID_VORBIS,
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_FLAC,
    AVCodecID.AV_CODEC_ID_SPEEX
  ],
  [AVFormat.WAV]: [],
  [AVFormat.WEBVTT]: [AVCodecID.AV_CODEC_ID_WEBVTT],
  [AVFormat.ASS]: [AVCodecID.AV_CODEC_ID_ASS, AVCodecID.AV_CODEC_ID_SSA],
  [AVFormat.SUBRIP]: [AVCodecID.AV_CODEC_ID_SUBRIP],
  [AVFormat.TTML]: [AVCodecID.AV_CODEC_ID_TTML],
  [AVFormat.H264]: [AVCodecID.AV_CODEC_ID_H264],
  [AVFormat.HEVC]: [AVCodecID.AV_CODEC_ID_HEVC],
  [AVFormat.VVC]: [AVCodecID.AV_CODEC_ID_VVC],
  [AVFormat.RTSP]: [
    AVCodecID.AV_CODEC_ID_OPUS,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_PCM_ALAW,
    AVCodecID.AV_CODEC_ID_PCM_MULAW,
    AVCodecID.AV_CODEC_ID_MPEG2VIDEO,
    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_VP8,
    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_AV1
  ],
  [AVFormat.RTMP]: [
    AVCodecID.AV_CODEC_ID_MP3,
    AVCodecID.AV_CODEC_ID_AAC,
    AVCodecID.AV_CODEC_ID_SPEEX,
    AVCodecID.AV_CODEC_ID_ADPCM_SWF,
    AVCodecID.AV_CODEC_ID_NELLYMOSER,
    AVCodecID.AV_CODEC_ID_PCM_ALAW,
    AVCodecID.AV_CODEC_ID_PCM_MULAW,

    AVCodecID.AV_CODEC_ID_MPEG4,
    AVCodecID.AV_CODEC_ID_H264,
    AVCodecID.AV_CODEC_ID_HEVC,
    AVCodecID.AV_CODEC_ID_AV1,
    AVCodecID.AV_CODEC_ID_VP9,
    AVCodecID.AV_CODEC_ID_VVC
  ]
}
