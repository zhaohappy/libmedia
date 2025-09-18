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
import { Data, Timeout, Range } from 'common/types/type'
import * as object from 'common/util/object'

export const enum IOLoaderStatus {
  IDLE,
  CONNECTING,
  BUFFERING,
  ERROR,
  COMPLETE
}

export interface IOLoaderVideoStreamInfo {
  list: {
    width: number
    height: number
    frameRate: number
    codec: string
    bandwidth?: number
  }[]
  selectedIndex: number
}

export interface IOLoaderAudioStreamInfo {
  list: {
    lang: string
    codec: string
    bandwidth?: number
  }[]
  selectedIndex: number
}

export interface IOLoaderSubtitleStreamInfo {
  list: {
    lang: string
    codec: string
  }[]
  selectedIndex: number
}

export type IOLoaderOptions = {
  /**
   * 是否是直播
   */
  isLive?: boolean
  /**
   * 预加载 chunk 大小
   */
  preload?: number
  /**
   * 最大重试次数
   */
  retryCount?: number
  /**
   * 重试间隔
   */
  retryInterval?: number
  /**
   * 音频优先 codec（dash 或 hls 选择优先 codec）
   */
  preferAudioCodec?: string
  /**
   * 视频优先 codec（dash 或 hls 选择优先 codec）
   */
  preferVideoCodec?: string
  /**
   * 字幕优先 codec（dash 或 hls 选择优先 codec）
   */
  preferSubtitleCodec?: string
  /**
   * 优先分辨率（dash 或 hls 选择优先分辨率）
   * 
   * 设置宽度和高度 1920*720
   * 
   * 设置宽度 1920
   * 
   * 设置高度 *720
   */
  preferResolution?: string
  /**
   * 音频优先 lang（dash 或 hls 选择优先 lang）
   */
  preferAudioLang?: string
  /**
   * 字幕优先 lang（dash 或 hls 选择优先 lang）
   */
  preferSubtitleLang?: string
}

const optionsDefault = {
  isLive: false,
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

  /**
   * 打开 ioloader
   * 
   * @param info 
   * @param range 
   * 
   * @returns 成功返回 0, 失败返回错误码（负值）
   */
  public abstract open(info: Data, range?: Range): Promise<int32>

  /**
   * 读取数据到缓冲区
   * 
   * @param buffer 可以放置数据的缓冲区，类 Uint8Array 结构
   * @param options 一些配置（比如 hls 和 dash 有相关配置项）
   * 
   * @returns 返回写入的数据长度，失败返回错误码（负值）
   */
  public abstract read(buffer: Uint8ArrayInterface, options?: Data): Promise<int32>

  /**
   * 写出数据，一些协议如 rtmp、rtsp 需要与服务器交互数据
   * 
   * @param buffer 要写出的数据，类 Uint8Array 结构
   * 
   * @returns 成功返回 0，失败返回错误码（负值）
   */
  public write(buffer: Uint8ArrayInterface): Promise<int32> {
    throw new Error('need implemented write function')
  }

  /**
   * seek 到指定位置
   * 
   * @param pos 位置
   * @param options 一些配置（比如 hls 和 dash 有相关配置项）
   * 
   * @returns 成功返回 0, 否则失败，可以返回错误码（负值）
   */
  public abstract seek(pos: int64, options?: Data): Promise<int32>

  /**
   * 数据总字节大小
   * 
   * 没有返回 0n
   */
  public abstract size(): Promise<int64>

  /**
   * 停止 ioloader
   */
  public abstract stop(): Promise<void>
}
