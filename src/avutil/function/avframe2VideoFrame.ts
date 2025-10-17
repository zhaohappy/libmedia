/*
 * libmedia AVFrame to VideoFrame utils
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

import type AVFrame from '../struct/avframe'
import { getAVPixelFormatDescriptor } from '../pixelFormatDescriptor'
import { AVColorRange, type AVPixelFormat } from '../pixfmt'
import { avRescaleQ2 } from '../util/rational'
import { AV_TIME_BASE_Q } from '../constant'
import { getHeap } from 'cheap/heap'
import * as object from 'common/util/object'
import { pixelFormatMap, colorPrimariesMap, colorSpaceMap, colorTrcMap } from './constant/webcodecs'

const pixelFormatMapReverse = object.reverse(pixelFormatMap)
const colorPrimariesMapReverse = object.reverse(colorPrimariesMap)
const colorSpaceMapReverse = object.reverse(colorSpaceMap)
const colorTrcMapReverse = object.reverse(colorTrcMap)

export function avPixelFormat2Format(pixfmt: AVPixelFormat) {
  return pixelFormatMapReverse[pixfmt] ?? null
}

export function getVideoColorSpaceInit(avframe: pointer<AVFrame>) {
  const init: VideoColorSpaceInit = {
    fullRange: false,
    matrix: colorSpaceMapReverse[avframe.colorSpace] ?? null,
    primaries: colorPrimariesMapReverse[avframe.colorPrimaries] ?? null,
    transfer: colorTrcMapReverse[avframe.colorTrc] ?? null
  }
  if (avframe.colorRange === AVColorRange.AVCOL_RANGE_JPEG) {
    init.fullRange = true
  }
  return init
}

export function avframe2VideoFrame(avframe: pointer<AVFrame>, pts?: int64, videoFrameInit: Partial<VideoFrameBufferInit> = {}) {

  let height = avframe.height

  const des = getAVPixelFormatDescriptor(avframe.format as AVPixelFormat)

  const layout: PlaneLayout[] = []

  for (let i = 0; i < des.comp.length; i++) {
    layout.push({
      offset: static_cast<double>(reinterpret_cast<size>(avframe.data[i])),
      stride: avframe.linesize[i]
    })
  }

  const init: VideoFrameBufferInit = object.extend({
    codedWidth: avframe.width,
    codedHeight: height,
    timestamp: pts ? static_cast<double>(pts) : static_cast<double>(avRescaleQ2(avframe.pts, addressof(avframe.timeBase), AV_TIME_BASE_Q)),
    format: avPixelFormat2Format(avframe.format),
    duration: static_cast<double>(avRescaleQ2(avframe.duration, addressof(avframe.timeBase), AV_TIME_BASE_Q)),
    layout,
    colorSpace: getVideoColorSpaceInit(avframe),
    visibleRect: {
      x: reinterpret_cast<double>(avframe.cropLeft),
      y: reinterpret_cast<double>(avframe.cropTop),
      width: avframe.width - reinterpret_cast<int32>((avframe.cropLeft + avframe.cropRight) as size),
      height: avframe.height - reinterpret_cast<int32>((avframe.cropTop + avframe.cropBottom) as size)
    }
  }, videoFrameInit)
  return new VideoFrame(getHeap(), init)
}
