/*
 * libmedia WebGPUExternalRender
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

import vertexSource from './webgpu/wgsl/vertex.wgsl'
import WebGPURender, { WebGPURenderOptions } from './WebGPURender'
import type AVFrame from 'avutil/struct/avframe'

const HDRPrimaries = ['bt2020', 'bt2100', 'st2048', 'p3-dcl', 'hlg']
export default class WebGPUExternalRender extends WebGPURender {

  private hasAlpha: boolean

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
    this.vertexSource = vertexSource
  }

  private generateFragmentSource() {
    this.fragmentSource =  `
      @group(0) @binding(1) var eTexture: texture_external;
      @group(0) @binding(2) var s: sampler;
      ${this.hasAlpha ? '@group(0) @binding(3) var aTexture: texture_external;' : ''}

      @fragment
      fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {
        let rgb: vec4<f32> = textureSampleBaseClampToEdge(eTexture, s, in_texcoord.xy);
        let alpha: f32 = ${this.hasAlpha ? 'textureSampleBaseClampToEdge(aTexture, s, in_texcoord.xy).r' : 'rgb.a'};
        return vec4<f32>(rgb.rgb, alpha);
      }
    `
  }

  private checkFrame(frame: VideoFrame, alpha?: VideoFrame) {
    const hasAlpha = !!alpha
    if (frame.codedWidth !== this.textureWidth
      || frame.codedHeight !== this.videoHeight
      || frame.codedWidth !== this.videoWidth
      || this.hasAlpha !== hasAlpha
    ) {
      this.videoWidth = frame.codedWidth
      this.videoHeight = frame.codedHeight
      this.textureWidth = frame.codedWidth
      this.hasAlpha = hasAlpha
      this.layout()

      this.generateFragmentSource()

      this.generatePipeline()
    }
  }

  protected generateBindGroup(): void {

    const descriptor: GPUBindGroupLayoutDescriptor = {
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          externalTexture: {
          }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: 'filtering'
          }
        }
      ]
    }
    if (this.hasAlpha) {
      descriptor.entries.push({
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        externalTexture: {
        }
      })
    }
    this.bindGroupLayout = this.device.createBindGroupLayout(descriptor)
  }

  public render(frame: VideoFrame, alpha?: VideoFrame): void {

    if (this.lost) {
      return
    }

    this.checkFrame(frame, alpha)

    const descriptor: GPUBindGroupDescriptor = {
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.rotateMatrixBuffer,
            size: Float32Array.BYTES_PER_ELEMENT * 16
          }
        },
        {
          binding: 1,
          resource: this.device.importExternalTexture({
            source: frame
          })
        },
        {
          binding: 2,
          resource: this.sampler
        }
      ]
    }

    if (alpha) {
      descriptor.entries.push({
        binding: 3,
        resource: this.device.importExternalTexture({
          source: alpha
        })
      })
    }

    const bindGroup = this.device.createBindGroup(descriptor)

    const commandEncoder = this.device.createCommandEncoder()

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: {
            r: 0,
            g: 0,
            b: 0,
            a: 0
          },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)
    renderPass.setPipeline(this.renderPipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.setVertexBuffer(0, this.vbo)
    renderPass.draw(4, 4, 0, 0)
    renderPass.end()
    this.device.queue.submit([commandEncoder.finish()])
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    // VideoFrame
    return frame instanceof VideoFrame && !(HDRPrimaries.some((p) => p === frame.colorSpace.primaries))
  }
}
