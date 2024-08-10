/*
 * libmedia mov indexes
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

import Stream from '../../../AVStream'
import { MOVStreamContext, Sample } from '../type'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVMediaType } from 'avutil/codec'


export function buildIndex(stream: Stream) {
  const context = stream.privData as MOVStreamContext

  const chunkOffsets = context.chunkOffsets
  const sampleSizes = context.sampleSizes

  const cttsSampleCounts = context.cttsSampleCounts
  const cttsSampleOffsets = context.cttsSampleOffsets

  const stscFirstChunk = context.stscFirstChunk
  const stscSamplesPerChunk = context.stscSamplesPerChunk

  const stssSampleNumbers = context.stssSampleNumbersMap

  const sttsSampleCounts = context.sttsSampleCounts
  const sttsSampleDeltas = context.sttsSampleDeltas

  if (!chunkOffsets.length) {
    return
  }

  let stscIndex = 0

  let sttsIndex = 0
  let sttsCurrentIndex = 0

  let cttsIndex = 0
  let cttsCurrentIndex = 0

  let chunkSamples = 0
  let currentOffset = 0n
  let currentSample = 0
  let currentDts = 0n

  const samplesIndex: Sample[] = []

  for (let i = 0; i < chunkOffsets.length; i++) {
    currentOffset = chunkOffsets[i]
    if (stscIndex < (stscFirstChunk.length - 1) && stscFirstChunk[stscIndex + 1] === i + 1) {
      stscIndex++
    }
    chunkSamples = stscSamplesPerChunk[stscIndex]

    while (chunkSamples > 0) {
      const sample: Sample = {
        dts: currentDts,
        pts: currentDts,
        pos: currentOffset,
        size: sampleSizes[currentSample],
        duration: 0,
        flags: 0
      }

      if (stssSampleNumbers && stssSampleNumbers.has(currentSample + 1)
                || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
      ) {
        sample.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
      }

      if (cttsSampleOffsets) {
        sample.pts = sample.dts + static_cast<int64>(cttsSampleOffsets[cttsIndex])
        cttsCurrentIndex++
        if (cttsCurrentIndex === cttsSampleCounts[cttsIndex]) {
          cttsIndex++
          cttsCurrentIndex = 0
        }
      }


      if (currentSample) {
        samplesIndex[currentSample - 1].duration = Number(sample.dts - samplesIndex[currentSample - 1].dts)
      }

      currentOffset += static_cast<int64>(sample.size)

      currentDts += static_cast<int64>(sttsSampleDeltas[sttsIndex])
      sttsCurrentIndex++
      if (sttsCurrentIndex === sttsSampleCounts[sttsIndex]) {
        sttsIndex++
        sttsCurrentIndex = 0
      }

      currentSample++

      samplesIndex.push(sample)

      chunkSamples--
    }
  }

  if (samplesIndex.length > 1) {
    // 最后一个 sample 使用前一个的 duration
    samplesIndex[currentSample - 1].duration = samplesIndex[currentSample - 2].duration
  }

  context.samplesIndex = samplesIndex
}
