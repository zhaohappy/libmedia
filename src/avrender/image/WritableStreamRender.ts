/*
 * libmedia WritableStreamRender
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

import isPointer from 'cheap/std/function/isPointer'
import { RenderMode } from './ImageRender'
import ImageRender from './ImageRender'
import AVFrame from 'avutil/struct/avframe'
import getTimestamp from 'common/function/getTimestamp'
import { avframe2VideoFrame } from 'avutil/function/avframe2VideoFrame'

export default class WritableStreamRender extends ImageRender {

  private writableStream: WritableStream<VideoFrame>

  private writer: WritableStreamDefaultWriter<VideoFrame>

  constructor(writableStream: WritableStream<VideoFrame>) {
    super({ width: 0, height: 0 } as unknown as OffscreenCanvas, { devicePixelRatio: 1, renderMode: RenderMode.FIT })
    this.writableStream = writableStream
  }

  public async init() {
    this.writer = this.writableStream.getWriter()
  }

  public clear(): void {
  }

  public render(frame: VideoFrame | pointer<AVFrame>): void {
    if (frame instanceof VideoFrame) {
      frame = new VideoFrame(frame, {
        timestamp: getTimestamp() * 1000,
        // 垂直翻转等价于 旋转 180 度 + 水平翻转
        rotation: (this.rotate + (this.flipVertical ? 180 : 0)) % 360,
        flip: (this.flipHorizontal || this.flipVertical) && !(this.flipHorizontal && this.flipVertical),
      })
    }
    else {
      frame = avframe2VideoFrame(frame, static_cast<int64>((getTimestamp() * 1000) as uint32), {
        rotation: (this.rotate + (this.flipVertical ? 180 : 0)) % 360,
        flip: (this.flipHorizontal || this.flipVertical) && !(this.flipHorizontal && this.flipVertical),
      })
    }
    this.writer.write(frame)
  }

  protected layout(): void {

  }

  public setRotate(angle: number, clear: boolean = true): void {
    angle = angle % 360

    if (angle === this.rotate) {
      return
    }

    this.rotate = angle

    if (clear) {
      this.clear()
    }
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    // VideoFrame 和 pointer<AVFrame>
    return frame instanceof VideoFrame || isPointer(frame)
  }
}
