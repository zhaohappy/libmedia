/* libmedia AVPCMBuffer to AVFrame utils
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

import { createAVFrame, unrefAVFrame } from '../util/avframe'
import AVFrame, { AV_NUM_DATA_POINTERS } from '../struct/avframe'
import { sampleFormatIsPlanar } from '../util/sample'
import AVPCMBuffer from '../struct/avpcmbuffer'
import { avFreep, avMalloc } from '../util/mem'
import * as errorType from '../error'
import { avbufferCreate } from '../util/avbuffer'
import { memcpy } from 'cheap/std/memory'

export function avPCMBuffer2AVFrame(pcmBuffer: pointer<AVPCMBuffer>, copy: boolean = false, avframe: pointer<AVFrame> = nullptr) {
  if (avframe === nullptr) {
    avframe = createAVFrame()
  }
  else {
    const pts = avframe.pts
    const duration = avframe.duration
    const den = avframe.timeBase.den
    const num = avframe.timeBase.num
    unrefAVFrame(avframe)
    avframe.pts = pts
    avframe.duration = duration
    avframe.timeBase.den = den
    avframe.timeBase.num = num
  }

  avframe.nbSamples = pcmBuffer.nbSamples
  avframe.sampleRate = pcmBuffer.sampleRate
  avframe.chLayout.nbChannels = pcmBuffer.channels
  avframe.linesize[0] = pcmBuffer.linesize
  avframe.format = pcmBuffer.format

  const planar = sampleFormatIsPlanar(avframe.format)
  const planes = planar ? pcmBuffer.channels : 1

  if (planes > AV_NUM_DATA_POINTERS) {
    avframe.extendedData = reinterpret_cast<pointer<pointer<uint8>>>(avMalloc(planes * reinterpret_cast<int32>(sizeof(accessof(avframe.extendedData)))))
    if (!avframe.extendedData) {
      avFreep(reinterpret_cast<pointer<pointer<uint8>>>(addressof(avframe.extendedData)))
      return reinterpret_cast<pointer<AVFrame>>(errorType.NO_MEMORY)
    }
  }
  else {
    avframe.extendedData = addressof(avframe.data)
  }

  for (let i = 0; i < Math.min(planes, AV_NUM_DATA_POINTERS); i++) {
    if (i === 0) {
      if (copy) {
        avframe.buf[0] = avbufferCreate(
          avMalloc(pcmBuffer.linesize * (planar ? pcmBuffer.channels : 1)),
          pcmBuffer.linesize * (planar ? pcmBuffer.channels : 1)
        )
        memcpy(avframe.buf[0].data, pcmBuffer.data[0], pcmBuffer.linesize * (planar ? pcmBuffer.channels : 1))
      }
      else {
        avframe.buf[0] = avbufferCreate(pcmBuffer.data[0], pcmBuffer.linesize * (planar ? pcmBuffer.channels : 1))
      }
      if (!avframe.buf[0]) {
        unrefAVFrame(avframe)
        return reinterpret_cast<pointer<AVFrame>>(errorType.NO_MEMORY)
      }
    }
    if (copy) {
      avframe.extendedData[i] = avframe.data[i] = reinterpret_cast<pointer<uint8>>(avframe.buf[0].data + i * pcmBuffer.linesize)
    }
    else {
      avframe.extendedData[i] = avframe.data[i] = pcmBuffer.data[i]
      pcmBuffer.data[i] = nullptr
    }
  }

  for (let i = 0; i < planes - AV_NUM_DATA_POINTERS; i++) {
    if (copy) {
      avframe.extendedData[i + AV_NUM_DATA_POINTERS] = reinterpret_cast<pointer<uint8>>(avframe.buf[0].data + i * pcmBuffer.linesize)
    }
    else {
      avframe.extendedData[i + AV_NUM_DATA_POINTERS] = pcmBuffer.data[i]
      pcmBuffer.data[i] = nullptr
    }
  }
  if (!copy) {
    pcmBuffer.maxnbSamples = 0
  }

  return avframe
}
