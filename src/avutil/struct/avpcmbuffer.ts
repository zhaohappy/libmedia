/*
 * libmedia AVPCMBuffer defined
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

import { AVSampleFormat } from '../audiosamplefmt'

@struct
export default class AVPCMBuffer {
  /**
   * pcm 数据
   * 可同时存放多个 channel 数据
   */
  data: pointer<pointer<uint8>>
  /**
   * data 每一个 channel 的缓冲区大小
   */
  linesize: int32
  /**
   * 当前存放了多少个采样点
   */
  nbSamples: int32
  /**
   * 当前 data 每个 channel 能存放的最大采样点数
   */
  maxnbSamples: int32
  /**
   * 声道数
   */
  channels: int32
  /**
   * 采样率
   */
  sampleRate: int32
  /**
   * pcm 格式
   */
  format: AVSampleFormat
  /**
   * pts
   */
  timestamp: int64
  /**
   * 时长
   */
  duration: double
}

@struct
export class AVPCMBufferRef extends AVPCMBuffer {
  refCount: atomic_int32
}

export interface AVPCMBufferPool {
  alloc: () => pointer<AVPCMBufferRef>
  release: (buffer: pointer<AVPCMBufferRef>) => void
}
