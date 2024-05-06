/*
 * libmedia avframe util
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

import AVFrame, { AVFrameSideData, AVFrameSideDataType } from '../struct/avframe'
import { avFree, avFreep, avMalloc, avMallocz } from './mem'
import { memcpy, memset } from 'cheap/std/memory'
import { NOPTS_VALUE_BIGINT } from '../constant'
import { AVChromaLocation, AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic } from '../pixfmt'
import { avbufferRef, avbufferReplace, avbufferUnref } from './avbuffer'
import { freeAVDict } from './avdict'
import { INVALID_ARGUMENT, NO_MEMORY } from '../error'
import { getChannelLayoutNBChannels } from './channel'

export function createAVFrame(): pointer<AVFrame> {
  const frame: pointer<AVFrame> = avMallocz(sizeof(AVFrame))
  getAVFrameDefault(frame)
  return frame
}

export function destroyAVFrame(frame: pointer<AVFrame>) {
  unrefAVFrame(frame)
  avFree(frame)
}

export function freeSideData(ptr: pointer<pointer<AVFrameSideData>>) {
  const sideData = accessof(ptr)
  avbufferUnref(addressof(sideData.buf))
  freeAVDict(addressof(sideData.metadata))
  avFreep(ptr)
}

export function wipeSideData(frame: pointer<AVFrame>) {
  for (let i = 0; i < frame.nbSideData; i++) {
    freeSideData(addressof(frame.sideData[i]))
  }
  frame.nbSideData = 0
  avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(frame.sideData)))
}

export function getAVFrameSideData(frame: pointer<AVFrame>, type: AVFrameSideDataType): pointer<AVFrameSideData> {
  for (let i = 0; i < frame.nbSideData; i++) {
    if (frame.sideData[i].type === type) {
      return frame.sideData[i]
    }
  }
  return nullptr
}

export function getAVFrameDefault(frame: pointer<AVFrame>) {
  if (frame.extendedData !== addressof(frame.data)) {
    avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(frame.extendedData)))
  }

  memset(frame, 0, sizeof(AVFrame))

  frame.pts = NOPTS_VALUE_BIGINT
  frame.pktDts = NOPTS_VALUE_BIGINT
  frame.bestEffortTimestamp = NOPTS_VALUE_BIGINT
  frame.pktDuration = 0n
  frame.pktPos = NOPTS_VALUE_BIGINT
  frame.pktSize = -1
  frame.keyFrame = 1
  frame.sampleAspectRatio.num = 0
  frame.sampleAspectRatio.den = 1
  frame.format = -1
  frame.extendedData = addressof(frame.data)
  frame.colorPrimaries = AVColorPrimaries.AVCOL_PRI_UNSPECIFIED
  frame.colorTrc = AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED
  frame.colorSpace = AVColorSpace.AVCOL_SPC_UNSPECIFIED
  frame.colorRange = AVColorRange.AVCOL_RANGE_UNSPECIFIED
  frame.chromaLocation = AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED
  frame.flags = 0
}

export function getVideoBuffer(frame: pointer<AVFrame>, algin: boolean) {

}

export function getAudioBuffer(frame: pointer<AVFrame>, algin: boolean) {

}

export function getBuffer(frame: pointer<AVFrame>, algin: boolean) {
  if (frame.format < 0) {
    return INVALID_ARGUMENT
  }

  if (frame.width > 0 && frame.height > 0) {
    return getVideoBuffer(frame, algin)
  }
  else if (frame.nbSamples > 0 && (frame.chLayout.u.mask || frame.chLayout.nbChannels > 0)) {
    return getAudioBuffer(frame, algin)
  }

  return INVALID_ARGUMENT
}

export function refAVFrame(dst: pointer<AVFrame>, src: pointer<AVFrame>) {
  dst.format = src.format
  dst.width = src.width
  dst.height = src.height

  dst.chLayout = src.chLayout

  if (defined(API_OLD_CHANNEL_LAYOUT)) {
    dst.channels = src.channels
    dst.channelLayout = src.channelLayout
  }
  dst.nbSamples = src.nbSamples

  let ret = copyAVFrameProps(dst, src)
  if (ret < 0) {
    return ret
  }

  if (!src.buf[0]) {
    for (let i = 0; i < sizeof(src.data) / sizeof(src.data[0]); i++) {
      if (!src.data[i] || !src.linesize[i]) {
        continue
      }
      let size = src.linesize[i] * sizeof(accessof(src.data[0]))

      dst.data[i] = avMalloc(size)
      if (!dst.data[i]) {
        unrefAVFrame(dst)
        return NO_MEMORY
      }
      memcpy(dst.data[i], src.data[i], size)
    }
    return 0
  }

  for (let i = 0; i < sizeof(src.buf) / sizeof(src.buf[0]); i++) {
    if (!src.buf[i]) {
      continue
    }
    dst.buf[i] = avbufferRef(src.buf[i])
    if (!dst.buf[i]) {
      unrefAVFrame(dst)
      return NO_MEMORY
    }
  }

  if (src.extendedBuf) {
    dst.extendedBuf = reinterpret_cast<pointer<pointer<void>>>(avMallocz(sizeof(accessof(dst.extendedBuf)) * src.nbExtendedBuf))
    if (!dst.extendedBuf) {
      unrefAVFrame(dst)
      return NO_MEMORY
    }
    dst.nbExtendedBuf = src.nbExtendedBuf

    for (let i = 0; i < src.nbExtendedBuf; i++) {
      dst.extendedBuf[i] = avbufferRef(src.extendedBuf[i])
      if (!dst.extendedBuf[i]) {
        unrefAVFrame(dst)
        return NO_MEMORY
      }
    }
  }

  if (src.extendedData !== addressof(src.data)) {
    let ch = src.chLayout.nbChannels
    if (!ch) {
      unrefAVFrame(dst)
      return INVALID_ARGUMENT
    }

    assert(!src.chLayout.u.mask || src.chLayout.nbChannels == getChannelLayoutNBChannels(src.chLayout.u.mask))

    dst.extendedData = reinterpret_cast<pointer<pointer<void>>>(avMallocz(sizeof(accessof(dst.extendedData)) * ch))
    if (!dst.extendedData) {
      unrefAVFrame(dst)
      return NO_MEMORY
    }

    memcpy(dst.extendedData, src.extendedData, sizeof(accessof(dst.extendedData)) * ch)
  }
  else {
    dst.extendedData = addressof(dst.data)
  }

  memcpy(addressof(dst.data), addressof(src.data), sizeof(src.data))
  memcpy(addressof(dst.linesize), addressof(src.linesize), sizeof(src.linesize))

  return 0
}

export function unrefAVFrame(frame: pointer<AVFrame>) {
  wipeSideData(frame)

  for (let i = 0; i < (sizeof(frame.buf) / sizeof(frame.buf[0])); i++) {
    avbufferUnref(addressof(frame.buf[i]))
  }
  for (let i = 0; i < frame.nbExtendedBuf; i++) {
    avbufferUnref(addressof(frame.extendedBuf[i]))
  }

  avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(frame.extendedBuf)))
  freeAVDict(addressof(frame.metadata))
  avbufferUnref(addressof(frame.hwFramesCtx))
  avbufferUnref(addressof(frame.opaqueRef))
  avbufferUnref(addressof(frame.privateRef))

  getAVFrameDefault(frame)

}

export function copyAVFrameProps(dst: pointer<AVFrame>, src: pointer<AVFrame>) {
  dst.keyFrame = src.keyFrame
  dst.pictType = src.pictType
  dst.sampleAspectRatio = src.sampleAspectRatio
  dst.cropTop = src.cropTop
  dst.cropBottom = src.cropBottom
  dst.cropLeft = src.cropLeft
  dst.cropRight = src.cropRight
  dst.pts = src.pts
  dst.repeatPict = src.repeatPict
  dst.interlacedFrame = src.interlacedFrame
  dst.topFieldFirst = src.topFieldFirst
  dst.paletteHasChanged = src.paletteHasChanged
  dst.sampleRate = src.sampleRate
  dst.opaque = src.opaque
  dst.pktDts = src.pktDts
  dst.pktPos = src.pktPos
  dst.pktSize = src.pktSize
  dst.pktDuration = src.pktDuration
  dst.reorderedOpaque = src.reorderedOpaque
  dst.quality = src.quality
  dst.bestEffortTimestamp = src.bestEffortTimestamp
  dst.codedPictureNumber = src.codedPictureNumber
  dst.displayPictureNumber = src.displayPictureNumber
  dst.flags = src.flags
  dst.decodeErrorFlags = src.decodeErrorFlags
  dst.colorPrimaries = src.colorPrimaries
  dst.colorTrc = src.colorTrc
  dst.colorSpace = src.colorSpace
  dst.colorRange = src.colorRange
  dst.chromaLocation = src.chromaLocation

  let ret = avbufferReplace(addressof(dst.opaqueRef), src.opaqueRef)
  ret |= avbufferReplace(addressof(dst.privateRef), src.privateRef)

  return ret
}

export function cloneAVFrame(frame: pointer<AVFrame>) {
  const ret = createAVFrame()

  refAVFrame(ret, frame)

  return ret
}
