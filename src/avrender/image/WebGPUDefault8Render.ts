/*
 * libmedia WebGPUDefault8Render
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
import { AVPixelFormat } from 'avutil/pixfmt'
import { WebGPURenderOptions } from './WebGPURender'
import WebGPUDefaultRender from './WebGPUDefaultRender'
import { AVPixelFormatDescriptor, AVPixelFormatFlags, getAVPixelFormatDescriptor } from 'avutil/pixelFormatDescriptor'
import ColorSpace from './colorSpace/ColorSpace'
import generateSteps from './colorTransform/generateSteps'
import { GLType } from './colorTransform/options'
import isPointer from 'cheap/std/function/isPointer'
import { getHeap } from 'cheap/heap'

export default class WebGPUDefault8Render extends WebGPUDefaultRender {

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
  }

  public async init(): Promise<void> {
    await super.init()
  }

  private generateFragmentSource(descriptor: AVPixelFormatDescriptor) {

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, {
      bitDepth: 8,
      type: GLType.kWebGPU,
      outputRGB: true
    })

    const textureMap = ['y', 'u', 'v', 'a']
    const channelMap = ['r', 'g', 'b', 'a']

    let y = `textureSample(${textureMap[descriptor.comp[0].plane]}Texture, s, in_texcoord.xy).${channelMap[descriptor.comp[0].offset]}`
    let u = descriptor.comp[1]
      ? `textureSample(${textureMap[descriptor.comp[1].plane]}Texture, s, in_texcoord.xy).${channelMap[descriptor.comp[1].offset]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )
    let v = descriptor.comp[2]
      ? `textureSample(${textureMap[descriptor.comp[2].plane]}Texture, s, in_texcoord.xy).${channelMap[descriptor.comp[2].offset]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )

    let alpha = '1.0'
    if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
      alpha = `textureSample(${textureMap[descriptor.comp[descriptor.comp.length - 1].plane]}Texture, s, in_texcoord.xy).${channelMap[descriptor.comp[descriptor.comp.length - 1].offset]}`
      if (descriptor.comp.length === 2) {
        u = ((descriptor.flags & AVPixelFormatFlags.RGB)
          ? '0.0'
          : '0.5'
        )
      }
    }

    this.fragmentSource = `
      @group(0) @binding(1) var s: sampler;
      @group(0) @binding(2) var yTexture: texture_2d<f32>;
      ${this.uTexture ? '@group(0) @binding(3) var uTexture: texture_2d<f32>;' : ''}
      ${this.vTexture ? '@group(0) @binding(4) var vTexture: texture_2d<f32>;' : ''}
      ${this.aTexture ? '@group(0) @binding(5) var aTexture: texture_2d<f32>;' : ''}
      
      @fragment
      fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {
        let y = ${y};
        let u = ${u};
        let v = ${v};
        let alpha = ${alpha};
        var color = vec4(y, u, v, alpha);
        ${steps.reduce((pre, current) => pre + current, '')}
        return color;
      }
    `
  }

  protected checkFrame(frame: pointer<AVFrame>): void {
    if (frame.linesize[0] !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
    ) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)

      if (this.yTexture) {
        this.yTexture.destroy()
        this.yTexture = null
      }
      if (this.uTexture) {
        this.uTexture.destroy()
        this.uTexture = null
      }
      if (this.vTexture) {
        this.vTexture.destroy()
        this.vTexture = null
      }
      if (this.aTexture) {
        this.aTexture.destroy()
        this.aTexture = null
      }

      if (descriptor.flags & AVPixelFormatFlags.PLANER) {
        let plane = 0
        this.yTexture = this.device.createTexture({
          size: [frame.linesize[plane++], frame.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          format: 'r8unorm'
        })
        if (descriptor.comp.length > 2) {
          const isUVPlane = descriptor.comp[1].plane === descriptor.comp[2].plane
          this.uTexture = this.device.createTexture({
            size: [frame.linesize[plane++] >>> (isUVPlane ? 1 : 0), frame.height >>> descriptor.log2ChromaH],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            format: isUVPlane ? 'rg8unorm' : 'r8unorm'
          })
          if (!isUVPlane) {
            this.vTexture = this.device.createTexture({
              size: [frame.linesize[plane++], frame.height >>> descriptor.log2ChromaH],
              usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
              format: 'r8unorm'
            })
          }
        }
        if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
          this.aTexture = this.device.createTexture({
            size: [frame.linesize[plane++], frame.height],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            format: 'r8unorm'
          })
        }
        this.textureWidth = frame.linesize[0]
      }
      else {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        let planeCount = descriptor.comp[0].step / bytes
        const formatMap = ['', 'r8unorm', 'rg8unorm', '', 'rgba8unorm']
        this.yTexture = this.device.createTexture({
          size: [frame.linesize[0] / planeCount, frame.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          format: formatMap[planeCount] as GPUTextureFormat
        })
        this.textureWidth = frame.linesize[0] / planeCount
      }

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.generateFragmentSource(descriptor)

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.format = frame.format

      this.layout()

      this.generatePipeline()
      this.generateRenderBundleEncoder()
    }
  }

  public render(frame: pointer<AVFrame>): void {

    if (this.lost) {
      return
    }

    let descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)
    if (!descriptor) {
      return
    }

    this.checkFrame(frame)

    let plane = 0
    this.device.queue.writeTexture(
      {
        texture: this.yTexture
      },
      getHeap(),
      {
        offset: frame.data[plane],
        bytesPerRow: frame.linesize[plane++],
        rowsPerImage: this.yTexture.height
      },
      {
        width: this.yTexture.width,
        height: this.yTexture.height,
        depthOrArrayLayers: 1
      }
    )

    if (descriptor.flags & AVPixelFormatFlags.PLANER) {
      this.device.queue.writeTexture(
        {
          texture: this.uTexture
        },
        getHeap(),
        {
          offset: frame.data[plane],
          bytesPerRow: frame.linesize[plane++],
          rowsPerImage: this.uTexture.height
        },
        {
          width: this.uTexture.width,
          height: this.uTexture.height,
          depthOrArrayLayers: 1
        }
      )
      if (this.vTexture) {
        this.device.queue.writeTexture(
          {
            texture: this.vTexture
          },
          getHeap(),
          {
            offset: frame.data[plane],
            bytesPerRow: frame.linesize[plane++],
            rowsPerImage: this.vTexture.height
          },
          {
            width: this.vTexture.width,
            height: this.vTexture.height,
            depthOrArrayLayers: 1
          }
        )
      }
      if (this.aTexture) {
        this.device.queue.writeTexture(
          {
            texture: this.aTexture
          },
          getHeap(),
          {
            offset: frame.data[plane],
            bytesPerRow: frame.linesize[plane],
            rowsPerImage: this.aTexture.height
          },
          {
            width: this.aTexture.width,
            height: this.aTexture.height,
            depthOrArrayLayers: 1
          }
        )
      }
    }

    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 1
        },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    })

    renderPass.executeBundles([this.renderBundle])

    renderPass.end()

    this.device.queue.submit([
      commandEncoder.finish()
    ])
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    if (isPointer(frame)) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)
      if (descriptor) {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        if (bytes !== 1) {
          return false
        }
        let planeCount = descriptor.comp[0].step / bytes
        // yuv packed 格式不支持 webgpu 没有 24 位纹理
        if (!(descriptor.flags & AVPixelFormatFlags.PLANER) && planeCount === 3) {
          return false
        }
        return true
      }
    }
    return false
  }
}
