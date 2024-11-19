/*
 * libmedia ImageRender
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

import AVFrame from 'avutil/struct/avframe'
import { AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic, AVPixelFormat } from 'avutil/pixfmt'
import ColorSpace from './colorSpace/ColorSpace'

export type ImageRenderOptions = {
  devicePixelRatio: number
  preserveDrawingBuffer?: boolean
  renderMode: RenderMode
  onRenderContextLost?: () => void
  dstColorSpace?: ColorSpace
}

export const enum RenderMode {
  /**
   * 自适应
   */
  FIT,
  /**
   * 填充
   */
  FILL
}

export default abstract class ImageRender {

  protected canvas: HTMLCanvasElement | OffscreenCanvas

  protected options: ImageRenderOptions

  protected textureWidth: number

  protected videoWidth: number

  protected videoHeight: number

  protected canvasWidth: number

  protected canvasHeight: number

  protected rotate: number

  protected renderMode: RenderMode

  protected format: AVPixelFormat

  protected lost: boolean

  protected destroyed: boolean

  protected srcColorSpace: ColorSpace

  protected dstColorSpace: ColorSpace

  protected flipHorizontal: boolean

  protected flipVertical: boolean

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: ImageRenderOptions) {
    this.canvas = canvas
    this.options = options
    this.canvasWidth = canvas.width
    this.canvasHeight = canvas.height
    this.videoWidth = 0
    this.videoHeight = 0
    this.textureWidth = 0
    this.rotate = 0
    this.renderMode = options.renderMode
    this.flipHorizontal = false
    this.flipVertical = false

    this.lost = false
    this.destroyed = false

    if (options.dstColorSpace) {
      this.dstColorSpace = options.dstColorSpace
    }
    else {
      this.dstColorSpace = new ColorSpace(
        AVColorSpace.AVCOL_SPC_BT709,
        AVColorPrimaries.AVCOL_PRI_BT709,
        AVColorTransferCharacteristic.AVCOL_TRC_BT709,
        AVColorRange.AVCOL_RANGE_MPEG
      )
    }
  }

  protected getRotateMatrix(angle: number) {
    angle = Math.PI * angle / 180
    const s = Math.sin(angle)
    const c = Math.cos(angle)

    return [
      c, -s, 0, 0,
      s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  }

  public abstract init(): Promise<void>
  public abstract render(frame: VideoFrame | pointer<AVFrame>): void
  public abstract clear(): void
  public abstract setRotate(angle: number, clear?: boolean): void
  protected abstract layout(): void

  public setRenderMode(mode: RenderMode) {
    if (this.renderMode !== mode) {
      this.renderMode = mode
      this.layout()
      this.clear()
    }
  }

  public enableHorizontalFlip(enable: boolean) {
    if (this.flipHorizontal !== enable) {
      this.flipHorizontal = enable
      this.layout()
      this.clear()
    }
  }

  public enableVerticalFlip(enable: boolean) {
    if (this.flipVertical !== enable) {
      this.flipVertical = enable
      this.layout()
      this.clear()
    }
  }

  public viewport(width: number, height: number): void {
    if (this.canvasWidth !== width || this.canvasHeight !== height) {
      const devicePixelRatio = this.options.devicePixelRatio
      this.canvasWidth = width
      this.canvasHeight = height
      this.canvas.width = width * devicePixelRatio
      this.canvas.height = height * devicePixelRatio

      if (this.videoWidth && this.videoHeight) {
        this.layout()
      }
    }
  }

  public getVideoWidth() {
    return this.videoWidth
  }

  public getVideoHeight() {
    return this.videoHeight
  }

  public destroy() {
    this.canvas = null
    this.destroyed = true
  }

  public setDstColorSpace(space: ColorSpace) {
    this.dstColorSpace = space
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    return false
  }
}
