/*
 * libmedia WebGPUDefaultRender
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
import vertexSource from './webgpu/wgsl/vertex.wgsl'
import WebGPURender, { WebGPURenderOptions } from './WebGPURender'

export default abstract class WebGPUDefaultRender extends WebGPURender {

  protected yTexture: GPUTexture

  protected uTexture: GPUTexture

  protected vTexture: GPUTexture

  protected aTexture: GPUTexture

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
    this.vertexSource = vertexSource
  }

  protected generateBindGroup(): void {
    if (!this.yTexture) {
      return
    }

    const bindGroupLayoutEntry: GPUBindGroupLayoutEntry[] = [
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
        sampler: {
          type: 'filtering'
        }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float'
        }
      }
    ]

    if (this.uTexture) {
      bindGroupLayoutEntry.push({
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float'
        }
      })
    }

    if (this.vTexture) {
      bindGroupLayoutEntry.push({
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float'
        }
      })
    }
    if (this.aTexture) {
      bindGroupLayoutEntry.push({
        binding: 5,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float'
        }
      })
    }

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: bindGroupLayoutEntry
    })

    const bindGroupEntry: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: {
          buffer: this.rotateMatrixBuffer,
          size: Float32Array.BYTES_PER_ELEMENT * 16
        }
      },
      {
        binding: 1,
        resource: this.sampler
      },
      {
        binding: 2,
        resource: this.yTexture.createView()
      }
    ]

    if (this.uTexture) {
      bindGroupEntry.push({
        binding: 3,
        resource: this.uTexture.createView()
      })
    }

    if (this.vTexture) {
      bindGroupEntry.push({
        binding: 4,
        resource: this.vTexture.createView()
      })
    }
    if (this.aTexture) {
      bindGroupEntry.push({
        binding: 5,
        resource: this.aTexture.createView()
      })
    }

    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: bindGroupEntry
    })
  }

  protected abstract checkFrame(frame: pointer<AVFrame>): void

  public destroy(): void {

    if (this.yTexture) {
      this.yTexture.destroy()
    }
    if (this.uTexture) {
      this.uTexture.destroy()
    }
    if (this.vTexture) {
      this.vTexture.destroy()
    }
    if (this.aTexture) {
      this.aTexture.destroy()
    }

    super.destroy()
  }
}
