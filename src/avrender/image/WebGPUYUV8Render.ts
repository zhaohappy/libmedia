/*
 * libmedia WebGPUYUV8Render
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
import WebGPUYUVRender from './WebGPUYUVRender'
import { PixelFormatDescriptor, PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import { mapUint8Array } from 'cheap/std/memory'
import ColorSpace from './colorSpace/ColorSpace'
import generateSteps from './colorTransform/generateSteps'
import { GLType } from './colorTransform/options'
import isPointer from 'cheap/std/function/isPointer'

export default class WebGPUYUV8Render extends WebGPUYUVRender {

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
  }

  private generateFragmentSource(format: AVPixelFormat, descriptor: PixelFormatDescriptor) {

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, {
      bitDepth: 8,
      type: GLType.kWebGPU,
      outputRGB: true
    })

    let u = 'textureSample(uTexture, s, in_texcoord.xy).x'
    let v = 'textureSample(vTexture, s, in_texcoord.xy).x'
    let alpha = '1.0'

    if (format === AVPixelFormat.AV_PIX_FMT_NV12) {
      u = 'textureSample(uTexture, s, in_texcoord.xy).x'
      v = 'textureSample(uTexture, s, in_texcoord.xy).y'
    }

    if ((descriptor.flags & PixelFormatFlags.ALPHA) && descriptor.nbComponents === 4) {
      alpha = 'textureSample(aTexture, s, in_texcoord.xy).x'
    }

    this.fragmentSource = `
      @group(0) @binding(1) var s: sampler;
      @group(0) @binding(2) var yTexture: texture_2d<f32>;
      @group(0) @binding(3) var uTexture: texture_2d<f32>;
      ${this.vTexture ? '@group(0) @binding(4) var vTexture: texture_2d<f32>;' : ''}
      ${this.aTexture ? '@group(0) @binding(5) var aTexture: texture_2d<f32>;' : ''}
      
      @fragment
      fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {
        let y = textureSample(yTexture, s, in_texcoord.xy).x;
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

    const descriptor =  PixelFormatDescriptorsMap[frame.format as AVPixelFormat]

    if (!descriptor) {
      return
    }

    if (frame.linesize[0] !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
    ) {
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

      this.yTexture = this.device.createTexture({
        size: [frame.linesize[0], frame.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'r8unorm'
      })

      this.uTexture = this.device.createTexture({
        size: [frame.linesize[1], frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'r8unorm'
      })
      if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
        this.vTexture = this.device.createTexture({
          size: [frame.linesize[2], frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          format: 'r8unorm'
        })
      }

      if (descriptor.nbComponents === 4) {
        this.aTexture = this.device.createTexture({
          size: [frame.linesize[3], frame.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
          format: 'r8unorm'
        })
      }

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.generateFragmentSource(frame.format as AVPixelFormat, descriptor)

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.textureWidth = frame.linesize[0]
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

    this.checkFrame(frame)

    this.device.queue.writeTexture(
      {
        texture: this.yTexture
      },
      mapUint8Array(frame.data[0], this.yTexture.width * this.yTexture.height),
      {
        offset: 0,
        bytesPerRow: this.yTexture.width,
        rowsPerImage: this.yTexture.height
      },
      {
        width: this.yTexture.width,
        height: this.yTexture.height,
        depthOrArrayLayers: 1
      }
    )
    this.device.queue.writeTexture(
      {
        texture: this.uTexture
      },
      mapUint8Array(frame.data[1], this.uTexture.width * this.uTexture.height),
      {
        offset: 0,
        bytesPerRow: this.uTexture.width,
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
        mapUint8Array(frame.data[2], this.vTexture.width * this.vTexture.height),
        {
          offset: 0,
          bytesPerRow: this.vTexture.width,
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
        mapUint8Array(frame.data[3], this.aTexture.width * this.aTexture.height),
        {
          offset: 0,
          bytesPerRow: this.aTexture.width,
          rowsPerImage: this.aTexture.height
        },
        {
          width: this.aTexture.width,
          height: this.aTexture.height,
          depthOrArrayLayers: 1
        }
      )
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
      const info = PixelFormatDescriptorsMap[frame.format as AVPixelFormat]
      if (info) {
        if (info.flags & PixelFormatFlags.RGB) {
          return false
        }
        return (info.flags & PixelFormatFlags.PLANER) && ((info.comp[0].depth + 7) >>> 3) === 1
      }
    }
    return false
  }
}
