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

import { AVPixelFormat } from './pixfmt'

export const enum PixelFormatFlags {
  /**
   * Pixel format is big-endian.
   */
  BIG_ENDIAN = 1 << 0,
  /**
   * Pixel format has a palette in data[1], values are indexes in this palette.
   */
  PALETTE = 1 << 1,
  /**
   * All values of a component are bit-wise packed end to end.
   */
  BIT_STREAM = 1 << 2,
  /**
   * At least one pixel component is not in the first data plane.
   */
  PLANER = 1 << 4,
  /**
   * The pixel format contains RGB-like data (as opposed to YUV/grayscale).
   */
  RGB = 1 << 5,
  /**
   * The pixel format has an alpha channel. This is set on all formats that
   * support alpha in some way, including AV_PIX_FMT_PAL8. The alpha is always
   * straight, never pre-multiplied.
   *
   * If a codec or a filter does not support alpha, it should set all alpha to
   * opaque, or use the equivalent pixel formats without alpha component, e.g.
   * AV_PIX_FMT_RGB0 (or AV_PIX_FMT_RGB24 etc.) instead of AV_PIX_FMT_RGBA.
   */
  ALPHA = 1 << 7,
  /**
   * The pixel format is following a Bayer pattern
   */
  BAYER = 1 << 8,
  /**
   * The pixel format contains IEEE-754 floating point values. Precision (double,
   * single, or half) should be determined by the pixel size (64, 32, or 16 bits).
   */
  FLOAT = 1 << 9
}

export type PixelFormatDescriptor = {
  nbComponents: number
  /**
   * Amount to shift the luma width right to find the chroma width.
   * For YV12 this is 1 for example.
   * chroma_width = AV_CEIL_RSHIFT(luma_width, log2_chroma_w)
   * The note above is needed to ensure rounding up.
   * This value only refers to the chroma components.
   */
  log2ChromaW: number

  /**
   * Amount to shift the luma height right to find the chroma height.
   * For YV12 this is 1 for example.
   * chroma_height= AV_CEIL_RSHIFT(luma_height, log2_chroma_h)
   * The note above is needed to ensure rounding up.
   * This value only refers to the chroma components.
   */
  log2ChromaH: number

  /**
   * Combination of AV_PIX_FMT_FLAG_... flags.
   */
  flags: number

  /**
   * Parameters that describe how pixels are packed.
   * If the format has 1 or 2 components, then luma is 0.
   * If the format has 3 or 4 components:
   *   if the RGB flag is set then 0 is red, 1 is green and 2 is blue;
   *   otherwise 0 is luma, 1 is chroma-U and 2 is chroma-V.
   *
   * If present, the Alpha channel is always the last component.
   */
  comp: {
    /**
     * Which of the 4 planes contains the component.
     */
    plane: number
    /**
     * Number of elements between 2 horizontally consecutive pixels.
     * Elements are bits for bitstream formats, bytes otherwise.
     */
    step: number

    /**
     * Number of elements before the component of the first pixel.
     * Elements are bits for bitstream formats, bytes otherwise.
     */
    offset: number

    /**
     * Number of least significant bits that must be shifted away
     * to get the value.
     */
    shift: number

    /**
     * Number of bits in the component.
     */
    depth: number
  }[]
}

export const PixelFormatDescriptorsMap: Partial<Record<AVPixelFormat, PixelFormatDescriptor>> = {
  /**
   * 1 字节
   */
  [AVPixelFormat.AV_PIX_FMT_YUV420P]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ420P]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ422P]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUVJ444P]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_NV12]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 2,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 2,
        offset: 1,
        shift: 0,
        depth: 8
      }
    ]
  },

  /**
   * 2 字节 yuv420
   */
  [AVPixelFormat.AV_PIX_FMT_YUV420P9BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P9LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P10BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P10LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P12BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P12LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P14BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P14LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P16BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV420P16LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },

  /**
   * 2 字节 yuv422
   */
  [AVPixelFormat.AV_PIX_FMT_YUV422P9BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P9LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P10BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P10LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P12BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P12LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P14BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P14LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P16BE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV422P16LE]: {
    nbComponents: 3,
    log2ChromaW: 1,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },

  /**
   * 2 字节 yuv444
   */
  [AVPixelFormat.AV_PIX_FMT_YUV444P9BE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P9LE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 9
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P10BE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P10LE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 10
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P12BE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P12LE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 12
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P14BE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P14LE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 14
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P16BE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.BIG_ENDIAN | PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },
  [AVPixelFormat.AV_PIX_FMT_YUV444P16LE]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.PLANER,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 16
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_RGBA]: {
    nbComponents: 4,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.RGB | PixelFormatFlags.ALPHA,
    comp: [
      {
        plane: 0,
        step: 4,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 1,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 2,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 3,
        shift: 0,
        depth: 8
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_RGB0]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.RGB,
    comp: [
      {
        plane: 0,
        step: 4,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 1,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 2,
        shift: 0,
        depth: 8
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_BGRA]: {
    nbComponents: 4,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.RGB | PixelFormatFlags.ALPHA,
    comp: [
      {
        plane: 0,
        step: 4,
        offset: 2,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 1,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 3,
        shift: 0,
        depth: 8
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_BGR0]: {
    nbComponents: 3,
    log2ChromaW: 0,
    log2ChromaH: 0,
    flags: PixelFormatFlags.RGB,
    comp: [
      {
        plane: 0,
        step: 4,
        offset: 2,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 1,
        shift: 0,
        depth: 8
      },
      {
        plane: 0,
        step: 4,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  },

  [AVPixelFormat.AV_PIX_FMT_YUVA420P]: {
    nbComponents: 4,
    log2ChromaW: 1,
    log2ChromaH: 1,
    flags: PixelFormatFlags.PLANER | PixelFormatFlags.ALPHA,
    comp: [
      {
        plane: 0,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 1,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 2,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      },
      {
        plane: 3,
        step: 1,
        offset: 0,
        shift: 0,
        depth: 8
      }
    ]
  }
}

