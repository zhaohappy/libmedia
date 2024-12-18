/*
 * libmedia abstract format decoder
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
import { AVIFormatContext } from '../AVFormatContext'
import AVPacket from 'avutil/struct/avpacket'
import { AVFormat } from 'avutil/avformat'

export default abstract class IFormat {

  public type: AVFormat = AVFormat.UNKNOWN

  public onStreamAdd: (stream: Stream) => void

  public abstract init(formatContext: AVIFormatContext): void

  public async destroy(formatContext: AVIFormatContext): Promise<void> {}

  public abstract getAnalyzeStreamsCount(): number
  public abstract readHeader(formatContext: AVIFormatContext): Promise<number>
  public abstract readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number>

  /**
   * seek
   * 
   * @param context 
   * @param stream 
   * @param timestamp 毫秒时间戳
   * @param flags 
   * 
   * @returns 返回 seek 之前的下一个 avpacket pos（若不知道返回 0n 方便之后可以再 seek 回来）返回负数表示 seek 失败
   */
  public abstract seek(
    formatContext: AVIFormatContext,
    stream: Stream,
    timestamp: int64,
    flags: int32
  ): Promise<int64>
}
