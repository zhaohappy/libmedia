/*
 * libmedia create mov stream context
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

import { MOVStreamContext } from '../type'
import { NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'

export default function createMovStreamContext(): MOVStreamContext {
  return {
    chunkOffsets: null,
    cttsSampleCounts: null,
    cttsSampleOffsets: null,
    stscFirstChunk: null,
    stscSamplesPerChunk: null,
    stscSampleDescriptionIndex: null,
    stssSampleNumbersMap: null,
    stssSampleNumbers: null,
    sampleSizes: null,
    sttsSampleCounts: null,
    sttsSampleDeltas: null,

    duration: 0n,
    trackId: NOPTS_VALUE,
    layer: 0,
    alternateGroup: 0,
    volume: 0,
    matrix: null,
    width: 0,
    height: 0,

    audioCid: 0,
    samplesPerFrame: 0,
    bytesPerFrame: 0,

    currentSample: 0,
    sampleEnd: false,
    samplesIndex: [],
    fragIndexes: [],

    lastPts: NOPTS_VALUE_BIGINT,
    lastDts: NOPTS_VALUE_BIGINT,
    startDts: NOPTS_VALUE_BIGINT,
    startCT: NOPTS_VALUE,
    startPts: NOPTS_VALUE_BIGINT,
    lastDuration: 0,
    chunkCount: 0,
    firstWrote: false,
    lastStscCount: 0,
    perStreamGrouping: false,
    index: 0,
    flags: 0
  }
}
