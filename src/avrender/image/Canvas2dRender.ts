/*
 * libmedia Canvas2dRender
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

import { RenderMode } from './ImageRender'
import ImageRender, { ImageRenderOptions } from './ImageRender'
import AVFrame from 'avutil/struct/avframe'
import * as logger from 'common/util/logger'

export interface CanvasImageRenderOptions extends ImageRenderOptions {
  colorSpace?: 'rec2100-pq' | 'rec2100-hlg'
}

export default class CanvasImageRender extends ImageRender {

  declare options: CanvasImageRenderOptions

  private context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

  private paddingLeft: number

  private paddingTop: number

  private flipX: number
  private flipY: number

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: CanvasImageRenderOptions) {
    super(canvas, options)

    this.paddingLeft = 0
    this.paddingTop = 0
    this.flipX = 1
    this.flipY = 1
  }

  public async init() {
    if (this.options.colorSpace === 'rec2100-hlg' || this.options.colorSpace === 'rec2100-pq') {
      try {
        this.context = this.canvas.getContext('2d', { colorSpace: this.options.colorSpace, pixelFormat: 'float16' }) as OffscreenCanvasRenderingContext2D
      }
      catch (error) {
        logger.warn('cannot got hdr context, video rendering colors may not be correct, please use the latest version of chrome then in chrome://flags, set: Experimental Web Platform features: Enabled')
      }
    }
    if (!this.context) {
      this.context = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    }
  }

  public clear(): void {

    const w = this.canvas.width >> 1
    const h = this.canvas.height >> 1

    if (this.rotate) {
      this.context.translate(w, h)
      this.context.rotate(-this.rotate * Math.PI / 180)
      this.context.translate(-w, -h)
    }

    this.context.clearRect(0, 0, this.canvasWidth * this.options.devicePixelRatio, this.canvasHeight * this.options.devicePixelRatio)

    if (this.rotate) {
      this.context.translate(w, h)
      this.context.rotate(this.rotate * Math.PI / 180)
      this.context.translate(-w, -h)
    }
  }

  private checkFrame(frame: VideoFrame) {
    if (frame.codedWidth !== this.textureWidth
      || frame.codedHeight !== this.videoHeight
      || frame.codedWidth !== this.videoWidth
    ) {
      this.videoWidth = frame.codedWidth
      this.videoHeight = frame.codedHeight
      this.textureWidth = frame.codedWidth
      this.layout()
    }
  }

  public render(frame: VideoFrame): void {

    if (this.lost) {
      return
    }

    this.checkFrame(frame)

    this.context.drawImage(
      frame,
      this.paddingLeft,
      this.paddingTop,
      this.canvasWidth * this.options.devicePixelRatio - 2 * this.paddingLeft,
      this.canvasHeight * this.options.devicePixelRatio - 2 * this.paddingTop
    )
  }

  protected layout(): void {
    let videoWidth = this.videoWidth
    let videoHeight = this.videoHeight
    let canvasWidth = this.canvasWidth
    let canvasHeight = this.canvasHeight

    let basePaddingLeft = 0
    let basePaddingTop = 0

    if (this.rotate === 90 || this.rotate === 270) {
      basePaddingTop = Math.floor((canvasHeight - canvasWidth) / 2)
      basePaddingLeft = Math.floor((canvasWidth - canvasHeight) / 2)

      canvasWidth = this.canvasHeight
      canvasHeight = this.canvasWidth
    }

    const scaleX = videoWidth / canvasWidth
    const scaleY = videoHeight / canvasHeight

    let isPaddingTop: boolean
    if (scaleX > 1) {
      if (scaleX < scaleY) {
        isPaddingTop = false
      }
      else {
        isPaddingTop = true
      }
    }
    else {
      if (scaleX > scaleY) {
        isPaddingTop = true
      }
      else {
        isPaddingTop = false
      }
    }

    if (this.renderMode === RenderMode.FILL) {
      isPaddingTop = !isPaddingTop
    }

    if (isPaddingTop) {
      const paddingTop = (canvasHeight - videoHeight * canvasWidth / videoWidth) / canvasHeight
      this.paddingTop = (Math.floor(paddingTop / 2 * canvasHeight) + basePaddingTop) * this.options.devicePixelRatio
      this.paddingLeft = basePaddingLeft * this.options.devicePixelRatio
    }
    else {
      const paddingLeft = (canvasWidth - videoWidth * canvasHeight / videoHeight) / canvasWidth
      this.paddingLeft = (Math.floor(paddingLeft / 2 * canvasWidth) + basePaddingLeft) * this.options.devicePixelRatio
      this.paddingTop = basePaddingTop * this.options.devicePixelRatio
    }

    if (this.context) {
      let flipX = 1
      let flipY = 1
      if (this.flipHorizontal) {
        flipX = -1
      }
      if (this.flipVertical) {
        flipY = -1
      }

      const w = this.canvas.width >> 1
      const h = this.canvas.height >> 1

      this.context.translate(w, h)

      if (flipX !== this.flipX) {
        this.context.scale(-1, 1)
      }
      if (flipY !== this.flipY) {
        this.context.scale(1, -1)
      }

      this.context.translate(-w, -h)

      this.flipX = flipX
      this.flipY = flipY
    }
  }

  public setRotate(angle: number, clear: boolean = true): void {

    angle = angle % 360

    if (angle === this.rotate) {
      return
    }

    const w = this.canvas.width >> 1
    const h = this.canvas.height >> 1

    if (this.rotate) {
      this.context.translate(w, h)
      this.context.rotate(-this.rotate * Math.PI / 180)
      this.context.translate(-w, -h)
    }

    if (clear) {
      this.clear()
    }

    this.rotate = angle
    if (this.context) {
      this.context.translate(w, h)
      this.context.rotate(this.rotate * Math.PI / 180)
      this.context.translate(-w, -h)
    }

    this.layout()
  }

  public destroy(): void {
    this.context = null
    super.destroy()
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    // VideoFrame
    return frame instanceof VideoFrame || frame instanceof ImageBitmap
  }
}
