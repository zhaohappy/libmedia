/*
 * libmedia mpegps identify defined
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

export const MAX_SYNC_SIZE = 100000

export const enum MpegpsStreamId {
  AUDIO_ID = 0xc0,
  VIDEO_ID = 0xe0,
  H264_ID = 0xe2,
  AC3_ID = 0x80,
  DTS_ID = 0x88,
  LPCM_ID = 0xa0,
  SUB_ID = 0x20
}

export const enum MpegpsStartCode {
  PACK_START = 0x1ba,
  SYSTEM_HEADER_START = 0x1bb,
  PADDING_STREAM = 0x1be,
  PRIVATE_STREAM_1 = 0x1bd,
  PRIVATE_STREAM_2 = 0x1bf,
  PROGRAM_STREAM_MAP = 0x1bc
}
