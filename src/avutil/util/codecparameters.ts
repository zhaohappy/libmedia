/*
 * libmedia codecparameters util
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

import AVCodecParameters from '../struct/avcodecparameters'
import { memcpy, memset } from 'cheap/std/memory'
import { avFree, avFreep, avMalloc, avMallocz } from './mem'
import { unInitChannelLayout } from './channel'
import { freeAVPacketSideData } from './avpacket'
import { AVCodecID, AVMediaType } from '../codec'
import { AVChannelOrder } from '../audiosamplefmt'
import { AVChromaLocation, AVColorPrimaries, AVColorRange,
  AVColorSpace, AVColorTransferCharacteristic, AVFieldOrder
} from '../pixfmt'
import { NOPTS_VALUE } from '../constant'
import { AVPacketSideData } from '../struct/avpacket'

function copyCodecParametersSideData(
  pDst: pointer<pointer<AVPacketSideData>>,
  pnbDst: pointer<int32>,
  src: pointer<AVPacketSideData>,
  nbSrc: int32
) {

  if (!src) {
    return
  }

  const dst = reinterpret_cast<pointer<AVPacketSideData>>(avMallocz(nbSrc * reinterpret_cast<int32>(sizeof(AVPacketSideData))))

  for (let i = 0; i < nbSrc; i++) {
    dst[i].type = src[i].type
    dst[i].size = src[i].size
    dst[i].data = avMalloc(src[i].size)
    memcpy(addressof(dst[i].data), addressof(src[i].data), src[i].size)
  }

  accessof(pnbDst) <- nbSrc
  accessof(pDst) <- dst

  return 0
}

export function copyCodecParameters(dst: pointer<AVCodecParameters>, src: pointer<AVCodecParameters>) {
  dst.codecType = src.codecType
  dst.codecId = src.codecId
  dst.codecTag = src.codecTag
  dst.format = src.format
  dst.bitrate = src.bitrate
  dst.bitsPerCodedSample = src.bitsPerCodedSample
  dst.bitsPerRawSample = src.bitsPerRawSample
  dst.profile = src.profile
  dst.level = src.level
  dst.width = src.width
  dst.height = src.height
  dst.sampleAspectRatio.den = src.sampleAspectRatio.den
  dst.sampleAspectRatio.num = src.sampleAspectRatio.num
  dst.fieldOrder = src.fieldOrder
  dst.colorRange = src.colorRange
  dst.colorPrimaries = src.colorPrimaries
  dst.colorTrc = src.colorTrc
  dst.colorSpace = src.colorSpace
  dst.chromaLocation = src.chromaLocation
  dst.videoDelay = src.videoDelay
  dst.chLayout = src.chLayout
  dst.sampleRate = src.sampleRate
  dst.blockAlign = src.blockAlign
  dst.frameSize = src.frameSize
  dst.initialPadding = src.initialPadding
  dst.trailingPadding = src.trailingPadding
  dst.seekPreroll = src.seekPreroll

  dst.framerate = src.framerate

  if (src.extradata) {
    if (dst.extradata) {
      avFree(dst.extradata)
    }
    dst.extradata = avMalloc(reinterpret_cast<size>(src.extradataSize))
    dst.extradataSize = src.extradataSize
    memcpy(dst.extradata, src.extradata, reinterpret_cast<size>(src.extradataSize))
  }

  if (src.codedSideData) {
    copyCodecParametersSideData(addressof(dst.codedSideData), addressof(dst.nbCodedSideData), src.codedSideData, src.nbCodedSideData)
  }
}

export function resetCodecParameters(par: pointer<AVCodecParameters>) {
  if (par.extradata) {
    avFreep(addressof(par.extradata))
  }
  unInitChannelLayout(addressof(par.chLayout))
  freeAVPacketSideData(addressof(par.codedSideData), addressof(par.nbCodedSideData))
  memset(par, 0, sizeof(accessof(par)))

  par.codecType = AVMediaType.AVMEDIA_TYPE_UNKNOWN
  par.codecId = AVCodecID.AV_CODEC_ID_NONE
  par.format = -1
  par.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_UNSPEC
  par.fieldOrder = AVFieldOrder.AV_FIELD_UNKNOWN
  par.colorRange = AVColorRange.AVCOL_RANGE_UNSPECIFIED
  par.colorPrimaries = AVColorPrimaries.AVCOL_PRI_UNSPECIFIED
  par.colorTrc = AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED
  par.colorSpace = AVColorSpace.AVCOL_SPC_UNSPECIFIED
  par.chromaLocation = AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED
  par.sampleAspectRatio.num = 0
  par.sampleAspectRatio.den = 1
  par.framerate.num = 0
  par.framerate.num = 1
  par.profile = NOPTS_VALUE
  par.level = NOPTS_VALUE
}

export function freeCodecParameters(par: pointer<AVCodecParameters>) {
  if (!par) {
    return
  }
  resetCodecParameters(par)
  avFree(par)
}
