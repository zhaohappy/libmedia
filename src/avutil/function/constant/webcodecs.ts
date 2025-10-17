/*
 * libmedia webcodecs constant define
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

import { AVColorPrimaries, AVColorSpace, AVColorTransferCharacteristic, AVPixelFormat } from '../../pixfmt'

export const pixelFormatMap: Record<VideoPixelFormat, AVPixelFormat> = {
  'BGRA': AVPixelFormat.AV_PIX_FMT_BGRA,
  'BGRX': AVPixelFormat.AV_PIX_FMT_BGR0,
  'I420': AVPixelFormat.AV_PIX_FMT_YUV420P,
  // @ts-ignore
  'I420P10': AVPixelFormat.AV_PIX_FMT_YUV420P10LE,
  'I420P12': AVPixelFormat.AV_PIX_FMT_YUV420P12LE,
  'I420A': AVPixelFormat.AV_PIX_FMT_YUVA420P,
  'I420AP10': AVPixelFormat.AV_PIX_FMT_YUVA420P10LE,
  'I420AP12': AVPixelFormat.AV_PIX_FMT_YUVA420P12LE,
  'I422': AVPixelFormat.AV_PIX_FMT_YUV422P,
  'I422P10': AVPixelFormat.AV_PIX_FMT_YUV422P10LE,
  'I422P12': AVPixelFormat.AV_PIX_FMT_YUV422P12LE,
  'I422A': AVPixelFormat.AV_PIX_FMT_YUVA422P,
  'I422AP10': AVPixelFormat.AV_PIX_FMT_YUVA422P10LE,
  'I422AP12': AVPixelFormat.AV_PIX_FMT_YUVA422P12LE,
  'I444': AVPixelFormat.AV_PIX_FMT_YUV444P,
  'I444P10': AVPixelFormat.AV_PIX_FMT_YUV444P10LE,
  'I444P12': AVPixelFormat.AV_PIX_FMT_YUV444P12LE,
  'I444A': AVPixelFormat.AV_PIX_FMT_YUVA444P,
  'I444AP10': AVPixelFormat.AV_PIX_FMT_YUVA444P10LE,
  'I444AP12': AVPixelFormat.AV_PIX_FMT_YUVA444P12LE,
  'NV12': AVPixelFormat.AV_PIX_FMT_NV12,
  'RGBA': AVPixelFormat.AV_PIX_FMT_RGBA,
  'RGBX': AVPixelFormat.AV_PIX_FMT_RGB0
}

export const colorSpaceMap: Record<VideoMatrixCoefficients, AVColorSpace> = {
  'bt709': AVColorSpace.AVCOL_SPC_BT709,
  'smpte170m': AVColorSpace.AVCOL_SPC_SMPTE170M,
  'bt470bg': AVColorSpace.AVCOL_SPC_BT470BG,
  // @ts-ignore
  'bt2020-ncl': AVColorSpace.AVCOL_SPC_BT2020_NCL,
  'rgb': AVColorSpace.AVCOL_SPC_RGB,
}

export const colorPrimariesMap: Record<VideoColorPrimaries, AVColorPrimaries> = {
  'bt709': AVColorPrimaries.AVCOL_PRI_BT709,
  'bt470bg': AVColorPrimaries.AVCOL_PRI_BT470BG,
  'smpte170m': AVColorPrimaries.AVCOL_PRI_SMPTE170M,
  // @ts-ignore
  'bt2020': AVColorPrimaries.AVCOL_PRI_BT2020,
  'smpte432': AVColorPrimaries.AVCOL_PRI_SMPTE432
}

export const colorTrcMap: Record<VideoTransferCharacteristics, AVColorTransferCharacteristic> = {
  'bt709': AVColorTransferCharacteristic.AVCOL_TRC_BT709,
  'iec61966-2-1': AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_1,
  'smpte170m': AVColorTransferCharacteristic.AVCOL_TRC_SMPTE170M,
  // @ts-ignore
  'linear': AVColorTransferCharacteristic.AVCOL_TRC_LINEAR,
  'pq': AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084,
  'hlg': AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67
}
