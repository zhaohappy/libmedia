/*
 * libmedia avformat defined
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

export const enum AVSeekFlags {
  NONE = 0,
  BACKWARD = 1,
  BYTE = 2,
  ANY = 4,
  FRAME = 8,
  TIMESTAMP = 16
}

export const enum AVFormat {
  UNKNOWN = -1,
  FLV,
  MOV,
  MP4 = MOV,
  M4A = MOV,
  MPEGTS,
  MPEGPS,
  OGG,
  IVF,
  RTSP,
  RTMP,
  MATROSKA,
  WEBM,
  AVI,
  H264,
  HEVC,
  VVC,

  MP3,
  AAC,
  WAV,
  FLAC,

  WEBVTT,
  SUBRIP,
  ASS,
  TTML
}

export const enum IOType {
  Fetch,
  File,
  WEBSOCKET,
  WEBTRANSPORT,
  HLS,
  DASH,
  RTMP
}

export const enum IOFlags {
  NONE = 0,
  /**
   * 源可进行 seek 操作
   */
  SEEKABLE = 1,
  /**
   * 源是切片类型的，如 hls 和 dash
   */
  SLICE = 2,
  /**
   * 源来自于网络
   */
  NETWORK = 4,
  /**
   * 源正在被 abort 标志
   */
  ABORT = 8
}
