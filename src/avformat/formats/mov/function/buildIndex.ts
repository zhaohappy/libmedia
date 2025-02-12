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

import Stream from 'avutil/AVStream'
import { MOVContext, MOVStreamContext, Sample } from '../type'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVMediaType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVStreamMetadataKey } from 'avutil/AVStream'


export function buildIndex(stream: Stream, movContext: MOVContext) {
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

  if (!movContext.ignoreEditlist && stream.metadata[AVStreamMetadataKey.ELST]?.length) {
    let timeOffset = 0n
    let editStartIndex = 0
    let unsupported = false
    let emptyDuration = 0n
    let startTime = 0n
    for (let i = 0; i < stream.metadata[AVStreamMetadataKey.ELST].length; i++) {
      const e = stream.metadata[AVStreamMetadataKey.ELST][i]
      if (i === 0 && e.mediaTime === -1n) {
        emptyDuration = e.segmentDuration
        editStartIndex = 1
      }
      else if (i === editStartIndex && e.mediaTime >= 0n) {
        startTime = e.mediaTime
      }
      else {
        unsupported = true
      }
    }

    if (unsupported) {
      logger.warn('multiple edit list entries, a/v desync might occur, patch welcome')
    }

    if ((emptyDuration || startTime) && movContext.timescale > 0) {
      if (emptyDuration) {
        emptyDuration = avRescaleQ(emptyDuration, { num: 1, den: movContext.timescale }, stream.timeBase)
        if (stream.duration !== NOPTS_VALUE_BIGINT) {
          stream.duration += emptyDuration
        }
      }
      timeOffset = startTime - emptyDuration
      currentDts = -timeOffset
    }
  }

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
        duration: sttsSampleDeltas[sttsIndex],
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

  if (samplesIndex.length) {
    if (stream.duration === NOPTS_VALUE_BIGINT) {
      stream.duration = samplesIndex[currentSample - 1].pts
        + static_cast<int64>(samplesIndex[currentSample - 1].duration)
    }
  }

  context.samplesIndex = samplesIndex
}
