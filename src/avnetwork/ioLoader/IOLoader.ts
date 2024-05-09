/*
 * libmedia abstract loader
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

import { Uint8ArrayInterface } from 'common/io/interface'
import { Data, Timeout } from 'common/types/type'
import * as object from 'common/util/object'

export interface Range {
  from: number,
  to: number
}

export const enum IOLoaderStatus {
  IDLE,
  CONNECTING,
  BUFFERING,
  ERROR,
  COMPLETE
}

export type IOLoaderOptions = {
  isLive?: boolean
  preload?: number
  retryCount?: number
  retryInterval?: number
}

const optionsDefault = {
  isLive: true,
  preload: 5 * 1024 * 1024,
  retryCount: 20,
  retryInterval: 1
}

export default abstract class IOLoader {

  public options: IOLoaderOptions

  protected status: IOLoaderStatus

  protected retryCount: number

  protected retryTimeout: Timeout

  constructor(options: IOLoaderOptions = {}) {
    this.options = options
    this.status = IOLoaderStatus.IDLE
    this.retryCount = 0

    this.options = object.extend({}, optionsDefault)
    object.extend(this.options, options)
  }

  public abstract open(info: Data, range: Range): Promise<any>

  public abstract read(buffer: Uint8ArrayInterface, options?: Data): Promise<int32>

  public abstract seek(pos: int64, options?: Data): Promise<any>

  public abstract size(): Promise<int64>

  public abstract abort(): Promise<any>

  public abstract stop(): Promise<any>
}
