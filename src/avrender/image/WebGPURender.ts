/*
 * libmedia WebGPURender
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
import { RenderMode } from './ImageRender'
import * as array from 'common/util/array'
import flipVertex from './function/flipVertex'

export interface WebGPURenderOptions extends ImageRenderOptions {
  powerPreference?: GPUPowerPreference
}

export default abstract class WebGPURender extends ImageRender {

  declare protected options: WebGPURenderOptions

  protected adapter: GPUAdapter

  protected device: GPUDevice

  protected context: GPUCanvasContext

  protected vsModule: GPUShaderModule

  protected fsModule: GPUShaderModule

  protected rotateMatrixBuffer: GPUBuffer

  protected renderPipeline: GPURenderPipeline

  protected rotateMatrix: number[]

  protected vbo: GPUBuffer

  protected sampler: GPUSampler

  protected vertex: number[]

  protected fragmentSource: string
  protected vertexSource: string

  protected renderBundleEncoder: GPURenderBundleEncoder

  protected renderBundle: GPURenderBundle

  protected bindGroupLayout: GPUBindGroupLayout

  protected bindGroup: GPUBindGroup

  protected pipelineLayout: GPUPipelineLayout

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
  }

  public async init(requiredFeatures?: GPUFeatureName[]) {

    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: this.options.powerPreference ?? 'high-performance'
    })

    if (!this.adapter) {
      logger.fatal('not support webgpu render')
    }

    const canRequiredFeatures: GPUFeatureName[] = []
    array.each(requiredFeatures, (feature) => {
      if (this.adapter.features.has(feature)) {
        canRequiredFeatures.push(feature)
      }
    })

    this.device = await this.adapter.requestDevice({
      requiredFeatures: canRequiredFeatures.length ? canRequiredFeatures : undefined
    })

    this.device.lost.then(() => {
      if (this.destroyed) {
        return
      }
      this.lost = true
      logger.error('gpu device lost')
      if (this.options?.onRenderContextLost) {
        this.options.onRenderContextLost()
      }
    })

    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext

    if (!this.context) {
      logger.fatal('can not support webgpu, got GPUCanvasContext failed')
    }

    this.context.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied'
    })

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear'
    })

    this.vbo = this.device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 28,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    })
    this.rotateMatrixBuffer = this.device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.setRotateMatrix(this.getRotateMatrix(0))
  }

  protected abstract generateBindGroup(): void

  protected generatePipeline() {

    this.generateBindGroup()
    this.pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout]
    })

    this.vsModule = this.device.createShaderModule({
      code: this.vertexSource
    })
    this.fsModule = this.device.createShaderModule({
      code: this.fragmentSource
    })

    this.renderPipeline = this.device.createRenderPipeline({
      layout: this.pipelineLayout,
      vertex: {
        module: this.vsModule,
        entryPoint: 'main',
        buffers: [
          {
            arrayStride: 4 * 7,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3'
              },
              {
                shaderLocation: 1,
                offset: 4 * 3,
                format: 'float32x4'
              }
            ]
          }
        ]
      },
      fragment: {
        module: this.fsModule,
        entryPoint: 'main',
        targets: [{
          format: navigator.gpu.getPreferredCanvasFormat()
        }]
      },
      primitive: {
        topology: 'triangle-strip'
      }
    })
  }

  protected generateRenderBundleEncoder() {

    if (!this.renderPipeline) {
      return
    }

    this.renderBundleEncoder = this.device.createRenderBundleEncoder({
      colorFormats: [navigator.gpu.getPreferredCanvasFormat()]
    })
    this.renderBundleEncoder.setPipeline(this.renderPipeline)
    this.renderBundleEncoder.setBindGroup(0, this.bindGroup)
    this.renderBundleEncoder.setVertexBuffer(0, this.vbo)
    this.renderBundleEncoder.draw(4, 4, 0, 0)
    this.renderBundle = this.renderBundleEncoder.finish()
  }

  public setRotateMatrix(rotateMatrix: number[]) {
    this.rotateMatrix = rotateMatrix
    const buffer = new Float32Array(this.rotateMatrix)
    this.device.queue.writeBuffer(
      this.rotateMatrixBuffer,
      0,
      // 传递 ArrayBuffer
      buffer.buffer,
      // 从哪里开始
      buffer.byteOffset,
      // 取多长
      buffer.byteLength
    )
  }

  private setVertices() {
    const buffer = new Float32Array(this.vertex)
    this.device.queue.writeBuffer(
      this.vbo,
      0,
      // 传递 ArrayBuffer
      buffer.buffer,
      // 从哪里开始
      buffer.byteOffset,
      // 取多长
      buffer.byteLength
    )
  }

  public clear(): void {
    this.context.getCurrentTexture().destroy()
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

    this.setVertices()
  }

  public viewport(width: number, height: number): void {
    super.viewport(width, height)
  }

  public setRotate(angle: number, clear: boolean = true): void {
    angle = angle % 360

    if (angle === this.rotate) {
      return
    }

    this.rotate = angle
    this.setRotateMatrix(this.getRotateMatrix(angle))

    this.layout()
    if (clear) {
      this.clear()
    }
  }

  public destroy(): void {

    this.sampler = null

    if (this.vbo) {
      this.vbo.destroy()
    }
    if (this.rotateMatrixBuffer) {
      this.rotateMatrixBuffer.destroy()
    }

    this.bindGroupLayout = null
    this.bindGroup = null

    this.pipelineLayout = null

    this.renderBundle = null
    this.renderBundleEncoder = null

    this.fsModule = null
    this.vsModule = null

    this.renderPipeline = null

    this.rotateMatrix = null
    this.vertex = null

    this.context = null
    this.options = null

    this.destroyed = true

    if (this.device) {
      this.device.destroy()
      this.device = null
    }
    if (this.adapter) {
      this.adapter = null
    }
    super.destroy()
  }
}
