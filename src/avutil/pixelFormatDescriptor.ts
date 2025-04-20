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

export const enum AVPixelFormatFlags {
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

export type AVPixelFormatDescriptor = {
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

const cache: Map<AVPixelFormat, AVPixelFormatDescriptor> = new Map()

export function getAVPixelFormatDescriptor(format: AVPixelFormat) {
  if (cache.has(format)) {
    return cache.get(format)
  }
  const data = AVPixelFormatDescriptorsData[format]
  if (!data) {
    return
  }
  const descriptor: AVPixelFormatDescriptor = {
    log2ChromaW: data[0],
    log2ChromaH: data[1],
    flags: data[2],
    comp: data[3].map((com) => {
      return {
        plane: com[0],
        step: com[1],
        offset: com[2],
        shift: com[3],
        depth: com[4]
      }
    })
  }
  cache.set(format, descriptor)
  return descriptor
}

type DescriptorsPlane = [
  plane: number,
  step: number,
  offset: number,
  shift: number,
  depth: number
]

type DescriptorsData = [
  log2ChromaW: number,
  log2ChromaH: number,
  flags: number,
  comp: DescriptorsPlane[]
]

const PlaneYUV8: DescriptorsPlane[] = [
  [0, 1, 0, 0, 8],
  [1, 1, 0, 0, 8],
  [2, 1, 0, 0, 8]
]
const PlaneYUVA8: DescriptorsPlane[] = [
  ...PlaneYUV8,
  [3, 1, 0, 0, 8]
]
const PlaneYUV9: DescriptorsPlane[] = [
  [0, 2, 0, 0, 9],
  [1, 2, 0, 0, 9],
  [2, 2, 0, 0, 9]
]
const PlaneYUVA9: DescriptorsPlane[] = [
  ...PlaneYUV9,
  [3, 2, 0, 0, 9]
]
const PlaneYUV10: DescriptorsPlane[] = [
  [0, 2, 0, 0, 10],
  [1, 2, 0, 0, 10],
  [2, 2, 0, 0, 10]
]
const PlaneYUVA10: DescriptorsPlane[] = [
  ...PlaneYUV10,
  [3, 2, 0, 0, 10]
]
const PlaneYUV12: DescriptorsPlane[] = [
  [0, 2, 0, 0, 12],
  [1, 2, 0, 0, 12],
  [2, 2, 0, 0, 12]
]
const PlaneYUVA12: DescriptorsPlane[] = [
  ...PlaneYUV12,
  [3, 2, 0, 0, 12]
]
const PlaneYUV14: DescriptorsPlane[] = [
  [0, 2, 0, 0, 14],
  [1, 2, 0, 0, 14],
  [2, 2, 0, 0, 14]
]
const PlaneYUV16: DescriptorsPlane[] = [
  [0, 2, 0, 0, 16],
  [1, 2, 0, 0, 16],
  [2, 2, 0, 0, 16]
]
const PlaneYUVA16: DescriptorsPlane[] = [
  ...PlaneYUV16,
  [3, 2, 0, 0, 16]
]
const PlaneNV12: DescriptorsPlane[] = [
  [0, 1, 0, 0, 8],
  [1, 2, 0, 0, 8],
  [1, 2, 1, 0, 8]
]
const PlaneNV21: DescriptorsPlane[] = [
  [0, 1, 0, 0, 8],
  [1, 2, 1, 0, 8],
  [1, 2, 0, 0, 8]
]
const PlaneAYUV16: DescriptorsPlane[] = [
  [0, 8, 2, 0, 16],
  [0, 8, 4, 0, 16],
  [0, 8, 6, 0, 16],
  [0, 8, 0, 0, 16]
]
const PlaneP010: DescriptorsPlane[] = [
  [0, 2, 0, 6, 10],
  [1, 4, 0, 6, 10 ],
  [1, 4, 2, 6, 10]
]
const PlaneP012: DescriptorsPlane[] = [
  [0, 2, 0, 4, 12],
  [1, 4, 0, 4, 12],
  [1, 4, 2, 4, 12]
]
const PlaneP016: DescriptorsPlane[] = [
  [0, 2, 0, 0, 16],
  [1, 4, 0, 0, 16],
  [1, 4, 2, 0, 16]
]
const PlaneRGBA8: DescriptorsPlane[] = [
  [0, 4, 0, 0, 8],
  [0, 4, 1, 0, 8],
  [0, 4, 2, 0, 8],
  [0, 4, 3, 0, 8]
]
const PlaneRGB8: DescriptorsPlane[] = [
  [0, 3, 0, 0, 8],
  [0, 3, 1, 0, 8],
  [0, 3, 2, 0, 8]
]
const PlaneRGB08: DescriptorsPlane[] = [
  [0, 4, 0, 0, 8],
  [0, 4, 1, 0, 8],
  [0, 4, 2, 0, 8]
]
const PlaneRGBA16: DescriptorsPlane[] = [
  [0, 8, 0, 0, 16],
  [0, 8, 2, 0, 16],
  [0, 8, 4, 0, 16],
  [0, 8, 6, 0, 16]
]
const PlaneARGB8: DescriptorsPlane[] = [
  [0, 4, 1, 0, 8],
  [0, 4, 2, 0, 8],
  [0, 4, 3, 0, 8],
  [0, 4, 0, 0, 8]
]
const PlaneBGRA8: DescriptorsPlane[] = [
  [0, 4, 2, 0, 8],
  [0, 4, 1, 0, 8],
  [0, 4, 0, 0, 8],
  [0, 4, 3, 0, 8]
]
const PlaneBGR8: DescriptorsPlane[] = [
  [0, 3, 2, 0, 8],
  [0, 3, 1, 0, 8],
  [0, 3, 0, 0, 8],
]
const PlaneBGR08: DescriptorsPlane[] = [
  [0, 4, 2, 0, 8],
  [0, 4, 1, 0, 8],
  [0, 4, 0, 0, 8],
]
const PlaneBGRA16: DescriptorsPlane[] = [
  [0, 8, 4, 0, 16],
  [0, 8, 2, 0, 16],
  [0, 8, 0, 0, 16],
  [0, 8, 6, 0, 16]
]
const PlaneABGR8: DescriptorsPlane[] = [
  [0, 4, 3, 0, 8],
  [0, 4, 2, 0, 8],
  [0, 4, 1, 0, 8],
  [0, 4, 0, 0, 8]
]
const PlaneBGRP8: DescriptorsPlane[] = [
  [2, 1, 0, 0, 8],
  [0, 1, 0, 0, 8],
  [1, 1, 0, 0, 8]
]
const PlaneBGRAP8: DescriptorsPlane[] = [
  [2, 1, 0, 0, 8],
  [0, 1, 0, 0, 8],
  [1, 1, 0, 0, 8],
  [3, 1, 0, 0, 8]
]
const PlaneBGRP9: DescriptorsPlane[] = [
  [2, 2, 0, 0, 9],
  [0, 2, 0, 0, 9],
  [1, 2, 0, 0, 9]
]
const PlaneBGRP10: DescriptorsPlane[] = [
  [2, 2, 0, 0, 10],
  [0, 2, 0, 0, 10],
  [1, 2, 0, 0, 10]
]
const PlaneBGRP12: DescriptorsPlane[] = [
  [2, 2, 0, 0, 12],
  [0, 2, 0, 0, 12],
  [1, 2, 0, 0, 12]
]
const PlaneBGRP14: DescriptorsPlane[] = [
  [2, 2, 0, 0, 14],
  [0, 2, 0, 0, 14],
  [1, 2, 0, 0, 14]
]
const PlaneBGRP16: DescriptorsPlane[] = [
  [2, 2, 0, 0, 16],
  [0, 2, 0, 0, 16],
  [1, 2, 0, 0, 16]
]
const PlaneBGRAP16: DescriptorsPlane[] = [
  [2, 2, 0, 0, 16],
  [0, 2, 0, 0, 16],
  [1, 2, 0, 0, 16],
  [3, 2, 0, 0, 16]
]

const AVPixelFormatDescriptorsData: Partial<Record<AVPixelFormat, DescriptorsData>> = {
  [AVPixelFormat.AV_PIX_FMT_YUV410P]: [
    2, 2, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVJ420P]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVJ422P]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVJ444P]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV8
  ],
  [AVPixelFormat.AV_PIX_FMT_NV12]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneNV12
  ],
  [AVPixelFormat.AV_PIX_FMT_NV21]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneNV21
  ],
  [AVPixelFormat.AV_PIX_FMT_NV24]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneNV12
  ],
  [AVPixelFormat.AV_PIX_FMT_NV42]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneNV21
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P9BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P9LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P9BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P9LE]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P9BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P9LE]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P10BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P10LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P10BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P10LE]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P10BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P10LE]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P12BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P12LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P12BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P12LE]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P12BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P12LE]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P14BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P14LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P14BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P14LE]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P14BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P14LE]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV14
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P16BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV420P16LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P16BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV422P16LE]: [
    1, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P16BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUV444P16LE]: [
    0, 0, AVPixelFormatFlags.PLANER,
    PlaneYUV16
  ],

  [AVPixelFormat.AV_PIX_FMT_YUVA420P]: [
    1, 1, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P]: [
    1, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA8
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P9BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P9LE]: [
    1, 1, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P9BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P9LE]: [
    1, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P9BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P9LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA9
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P10BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P10LE]: [
    1, 1, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P10BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P10LE]: [
    1, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P10BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P10LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA10
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P12BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P12LE]: [
    1, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P12BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P12LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA12
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P16BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA420P16LE]: [
    1, 1, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P16BE]: [
    1, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA422P16LE]: [
    1, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P16BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_YUVA444P16LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.ALPHA,
    PlaneYUVA16
  ],
  [AVPixelFormat.AV_PIX_FMT_AYUV64BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.ALPHA,
    PlaneAYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_AYUV64LE]: [
    0, 0, AVPixelFormatFlags.ALPHA,
    PlaneAYUV16
  ],
  [AVPixelFormat.AV_PIX_FMT_P010BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneP010
  ],
  [AVPixelFormat.AV_PIX_FMT_P010LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneP010
  ],
  [AVPixelFormat.AV_PIX_FMT_P012BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneP012
  ],
  [AVPixelFormat.AV_PIX_FMT_P012LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneP012
  ],
  [AVPixelFormat.AV_PIX_FMT_P016BE]: [
    1, 1, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.PLANER,
    PlaneP016
  ],
  [AVPixelFormat.AV_PIX_FMT_P016LE]: [
    1, 1, AVPixelFormatFlags.PLANER,
    PlaneP016
  ],
  [AVPixelFormat.AV_PIX_FMT_GRAY8]: [
    0, 0, 0,
    [
      [0, 1, 0, 0, 8]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_GRAY16BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN,
    [
      [0, 2, 0, 0, 16]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_GRAY16LE]: [
    0, 0, 0,
    [
      [0, 2, 0, 0, 16]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_YA8]: [
    0, 0, AVPixelFormatFlags.ALPHA,
    [
      [0, 2, 0, 0, 8],
      [0, 2, 1, 0, 8]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_YA16BE]: [
    0, 0, AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.ALPHA,
    [
      [0, 4, 0, 0, 16],
      [0, 4, 2, 0, 16]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_YA16LE]: [
    0, 0, AVPixelFormatFlags.ALPHA,
    [
      [0, 4, 0, 0, 16],
      [0, 4, 2, 0, 16]
    ]
  ],
  [AVPixelFormat.AV_PIX_FMT_RGBA]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneRGBA8
  ],
  [AVPixelFormat.AV_PIX_FMT_ARGB]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneARGB8
  ],
  [AVPixelFormat.AV_PIX_FMT_RGBA64BE]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneRGBA16
  ],
  [AVPixelFormat.AV_PIX_FMT_RGBA64LE]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneRGBA16
  ],
  [AVPixelFormat.AV_PIX_FMT_BGRA]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneBGRA8
  ],
  [AVPixelFormat.AV_PIX_FMT_ABGR]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneABGR8
  ],
  [AVPixelFormat.AV_PIX_FMT_BGRA64BE]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRA16
  ],
  [AVPixelFormat.AV_PIX_FMT_BGRA64LE]: [
    0, 0, AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneBGRA16
  ],
  [AVPixelFormat.AV_PIX_FMT_RGB24]: [
    0, 0, AVPixelFormatFlags.RGB,
    PlaneRGB8
  ],
  [AVPixelFormat.AV_PIX_FMT_BGR24]: [
    0, 0, AVPixelFormatFlags.RGB,
    PlaneBGR8
  ],
  [AVPixelFormat.AV_PIX_FMT_RGB0]: [
    0, 0, AVPixelFormatFlags.RGB,
    PlaneRGB08
  ],
  [AVPixelFormat.AV_PIX_FMT_BGR0]: [
    0, 0, AVPixelFormatFlags.RGB,
    PlaneBGR08
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP8
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRAP]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneBGRAP8
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP9BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRP9
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP9LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP9
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP10BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRP10
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP10LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP10
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP12BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRP12
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP12LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP12
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP14BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRP14
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP14LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP14
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP16BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN,
    PlaneBGRP16
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRP16LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB,
    PlaneBGRP16
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRAP16BE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.BIG_ENDIAN | AVPixelFormatFlags.ALPHA,
    PlaneBGRAP16
  ],
  [AVPixelFormat.AV_PIX_FMT_GBRAP16LE]: [
    0, 0, AVPixelFormatFlags.PLANER | AVPixelFormatFlags.RGB | AVPixelFormatFlags.ALPHA,
    PlaneBGRAP16
  ]
}
