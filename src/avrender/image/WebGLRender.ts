/*
 * libmedia WebGLRender
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

import * as logger from 'common/util/logger'
import ImageRender, { ImageRenderOptions } from './ImageRender'

import AVFrame from 'avutil/struct/avframe'
import { RenderMode } from './ImageRender'
import VideoProgram from './webgl/program/VideoProgram'
import flipVertex from './function/flipVertex'
import { Timeout } from 'common/types/type'

export interface WebGLRenderOptions extends ImageRenderOptions {
}

export default abstract class WebGLRender extends ImageRender {

  declare protected options: WebGLRenderOptions

  protected gl: WebGLRenderingContext | WebGL2RenderingContext

  // 顶点缓冲区
  protected vbo: WebGLBuffer

  protected program: VideoProgram

  protected vertex: number[]

  protected webglContextLostTimer: Timeout

  protected onWebglContextLost: ((event: Event) => void) | void

  protected onWebglContextRestored: ((event: Event) => void) | void

  protected fragmentSource: string

  protected vertexSource: string

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)
  }

  public async init() {
    this.gl = this.canvas.getContext(
      'webgl2',
      {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: this.options.preserveDrawingBuffer
      }
    ) as WebGL2RenderingContext
    if (!this.gl) {
      this.gl = this.canvas.getContext(
        'webgl',
        {
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: this.options.preserveDrawingBuffer
        }
      ) as WebGL2RenderingContext
    }
    if (!this.gl) {
      this.gl = (this.canvas as HTMLCanvasElement).getContext(
        'experimental-webgl',
        {
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: this.options.preserveDrawingBuffer
        }
      ) as WebGL2RenderingContext
    }

    if (!this.gl) {
      logger.fatal('can not support webgl, got WebGLRenderingContext failed')
    }

    this.vbo = this.gl.createBuffer()
    if (!this.vbo) {
      logger.fatal('create vao buffer failed')
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo)

    this.gl.enable(this.gl.BLEND)
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0)
    this.gl.clearDepth(1.0)
    this.viewport(this.canvasWidth || this.canvas.width, this.canvasHeight || this.canvas.height)

    this.onWebglContextLost = (event: Event) => {
      if (this.destroyed) {
        return
      }
      this.webglContextLostTimer = setTimeout(() => {
        this.lost = true
        this.webglContextLostTimer = null
        logger.error('webgl context lost')
        if (this.options.onRenderContextLost) {
          this.options.onRenderContextLost()
        }
      }, 3 * 1000)
    }

    this.onWebglContextRestored = (event: Event) => {
      if (this.webglContextLostTimer) {
        clearTimeout(this.webglContextLostTimer)
        this.webglContextLostTimer = null
      }
    }

    this.canvas.addEventListener('webglcontextlost', this.onWebglContextLost)
    this.canvas.addEventListener('webglcontextrestored', this.onWebglContextRestored)
  }

  public viewport(width: number, height: number): void {
    this.gl.viewport(0, 0, width * this.options.devicePixelRatio, height * this.options.devicePixelRatio)
    super.viewport(width, height)
  }

  protected useProgram() {
    this.program.link(this.gl)
    this.program.bind()
    this.program.setRotateMatrix(this.getRotateMatrix(this.rotate))
  }

  protected abstract checkFrame(frame: pointer<AVFrame>): void

  public clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
  }

  protected layout(): void {
    let videoWidth = this.videoWidth
    let videoHeight = this.videoHeight
    let canvasWidth = this.canvasWidth
    let canvasHeight = this.canvasHeight


    if (this.rotate === 90 || this.rotate === 270) {
      /*
       * videoWidth = this.videoHeight
       * videoHeight = this.videoWidth
       */
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

    let texturePadding = 0
    if (this.textureWidth !== this.videoWidth) {
      texturePadding = (this.textureWidth - this.videoWidth) / this.textureWidth
    }

    if (isPaddingTop) {
      const paddingTop = (canvasHeight - videoHeight * canvasWidth / videoWidth) / canvasHeight
      this.vertex = [
        -1, 1 - paddingTop, 0, 0, 0, 0, 0,
        -1, -1 + paddingTop, 0, 0, 1, 0, 0,
        1, 1 - paddingTop, 0, 1 - texturePadding, 0, 0, 0,
        1, -1 + paddingTop, 0, 1 - texturePadding, 1, 0, 0
      ]
    }
    else {
      const paddingLeft = (canvasWidth - videoWidth * canvasHeight / videoHeight) / canvasWidth
      this.vertex = [
        -1 + paddingLeft, 1, 0, 0, 0, 0, 0,
        -1 + paddingLeft, -1, 0, 0, 1, 0, 0,
        1 - paddingLeft, 1, 0, 1 - texturePadding, 0, 0, 0,
        1 - paddingLeft, -1, 0, 1 - texturePadding, 1, 0, 0
      ]
    }

    flipVertex(this.vertex, this.flipHorizontal, this.flipVertical)

    if (this.gl) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertex), this.gl.STATIC_DRAW)
    }
  }

  public setRotate(angle: number, clear: boolean = true): void {
    angle = angle % 360

    if (angle === this.rotate) {
      return
    }

    this.rotate = angle
    if (this.gl) {
      this.program.setRotateMatrix(this.getRotateMatrix(this.rotate))
    }
    this.layout()
    if (clear) {
      this.clear()
    }
  }

  public destroy(): void {

    if (this.vbo) {
      this.gl.deleteBuffer(this.vbo)
      this.vbo = null
    }

    if (this.program) {
      this.program.stop()
    }

    this.gl = null
    this.vertex = null

    if (this.onWebglContextLost) {
      this.canvas.removeEventListener('webglcontextlost', this.onWebglContextLost)
      this.onWebglContextLost = null
    }
    if (this.onWebglContextRestored) {
      this.canvas.removeEventListener('webglcontextrestored', this.onWebglContextRestored)
      this.onWebglContextRestored = null
    }

    super.destroy()
  }
}
