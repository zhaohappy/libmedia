/*
 * libmedia custom loader
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

import IOLoader from './IOLoader'

export default abstract class CustomIOLoader extends IOLoader {

  constructor() {
    super()
  }

  /**
   * 源扩展名， 若无法自动分析出源的格式需要使用此数据获取默认的格式
   */
  get ext(): string {
    throw new Error('need implemented ext getter')
  }

  /**
   * 源的名字， 主要用于日志打印， 可不传
   */
  get name(): string {
    return 'CustomIOLoader.' + Math.random()
  }

  /**
   * 最小缓冲时长（秒）
   * 
   * 开启 jitter buffer 需要
   */
  get minBuffer(): number {
    throw new Error('need implemented minBuffer getter')
  }

  /**
   * 打开自定义 ioloader
   * 
   * @returns 成功返回 0, 失败返回错误码（负值）
   */
  public abstract open(): Promise<int32>
}
