/*
 * libmedia pixel format descriptor
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

import { AVChromaLocation, AVPixelFormat } from './pixfmt'

export const enum PixelFormatFlags {
  BIG_ENDIAN = 1,
  PLANER = 2
}

export type PixelFormatDescriptor = {
  depth: number
  max: number
  nbComponents: number
  log2ChromaW: number
  log2ChromaH: number
  flags: number
}

export const PixelFormatDescriptorsMap: Partial<Record<AVPixelFormat, PixelFormatDescriptor>> = {
  /**
   * 1 字节
   */
  [AVPixelFormat.AV_PIX_FMT_YUV420P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ420P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ422P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ444P]: {
    depth: 8,
    max: 255,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },

  /**
   * 2 字节 yuv420
   */
  [AVPixelFormat.AV_PIX_FMT_YUV420P9BE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P9LE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P10BE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P10LE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P12BE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P12LE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P14BE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P14LE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P16BE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P16LE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER
  },

  /**
   * 2 字节 yuv422
   */
  [AVPixelFormat.AV_PIX_FMT_YUV422P9BE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P9LE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P10BE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P10LE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P12BE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P12LE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P14BE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P14LE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P16BE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P16LE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },

  /**
   * 2 字节 yuv444
   */
  [AVPixelFormat.AV_PIX_FMT_YUV444P9BE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P9LE]: {
    depth: 9,
    max: 511,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P10BE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P10LE]: {
    depth: 10,
    max: 1023,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P12BE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P12LE]: {
    depth: 12,
    max: 4095,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P14BE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P14LE]: {
    depth: 14,
    max: 16383,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P16BE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P16LE]: {
    depth: 16,
    max: 65535,
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER
  }
}

export function chromaLocation2Pos(pos: AVChromaLocation) {
  if (pos <= AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED || pos >= AVChromaLocation.AVCHROMA_LOC_NB) {
    return
  }
  return {
    x: (pos & 1) * 128,
    y: ((pos >>> 1) ^ (pos < 4 ? 1 : 0)) * 128
  }
}
