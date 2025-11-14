/*
 * libmedia get next sample
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

import type { AVIFormatContext } from '../../../AVFormatContext'
import type { IsobmffContext, IsobmffStreamContext, Sample } from '../type'

import {
  type AVStream,
  AVPacketFlags,
  IOFlags,
  AVDiscard,
  type EncryptionInfo,
  avRescaleQ
} from '@libmedia/avutil'

import {
  AV_TIME_BASE_Q
} from '@libmedia/avutil/internal'

export function getNextSample(context: AVIFormatContext, isobmffContext: IsobmffContext, ioFlags: int32) {
  let sample: Sample
  let stream: AVStream
  let encryption: EncryptionInfo

  let bestDts = 0n

  let posSample: Sample
  let posStream: AVStream

  let dtsSample: Sample
  let dtsStream: AVStream

  context.streams.forEach((s) => {
    const context = s.privData as IsobmffStreamContext

    if (!context.samplesIndex || !context.samplesIndex.length || s.discard === AVDiscard.AVDISCARD_ALL) {
      context.sampleEnd = true
      return true
    }

    if (s.discard === AVDiscard.AVDISCARD_NONKEY) {
      while (context.currentSample < context.samplesIndex.length
        && !(context.samplesIndex[context.currentSample].flags & AVPacketFlags.AV_PKT_FLAG_KEY)
      ) {
        context.currentSample++
      }
      if (context.currentSample >= context.samplesIndex.length) {
        context.sampleEnd = true
        return true
      }
    }

    if (!context.sampleEnd
      && (!posSample
        || (context.samplesIndex[context.currentSample].pos < posSample.pos)
      )
    ) {
      posSample = context.samplesIndex[context.currentSample]
      posStream = s
    }

    if (!context.sampleEnd
      && (!dtsSample
        || avRescaleQ(context.samplesIndex[context.currentSample].dts, s.timeBase, AV_TIME_BASE_Q)
          < bestDts
      )
    ) {
      dtsSample = context.samplesIndex[context.currentSample]
      bestDts = avRescaleQ(dtsSample.dts, s.timeBase, AV_TIME_BASE_Q)
      dtsStream = s
    }
  })

  if (posSample && dtsSample) {
    const posDts = avRescaleQ(posSample.dts, posStream.timeBase, AV_TIME_BASE_Q)
    const dtsDts = avRescaleQ(dtsSample.dts, dtsStream.timeBase, AV_TIME_BASE_Q)
    const diff = Math.abs(Number(posDts - dtsDts))
    // 两者时间差值在 1s 内优先 pos，避免来回 seek
    // 切片和网络资源优先 pos
    if ((diff < 1000000)
      || (context.ioReader.flags & IOFlags.SLICE)
      || (context.ioReader.flags & IOFlags.NETWORK)
      || !(ioFlags & IOFlags.SEEKABLE)
    ) {
      sample = posSample
      stream = posStream
    }
    else {
      sample = dtsSample
      stream = dtsStream
    }
  }
  else if (posSample) {
    sample = posSample
    stream = posStream
  }
  else if (dtsSample) {
    sample = dtsSample
    stream = dtsStream
  }

  if (stream) {
    const streamContext = (stream.privData as IsobmffStreamContext)
    encryption = streamContext.samplesEncryption[streamContext.currentSample]
    streamContext.currentSample++
    if (streamContext.currentSample
      >= streamContext.samplesIndex.length
    ) {
      streamContext.sampleEnd = true
    }
  }

  if (isobmffContext.fragment) {
    const hasSample = !!context.streams.find((stream) => {
      return (stream.privData as IsobmffStreamContext).sampleEnd === false
    })

    if (!hasSample) {
      isobmffContext.currentFragment = null
    }
  }

  return {
    sample,
    stream,
    encryption
  }
}
