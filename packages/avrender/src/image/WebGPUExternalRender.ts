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

import { mapUint8Array } from '@libmedia/cheap'
import { mapColorPrimaries, mapColorTrc } from '../../../avutil/src/function/videoFrame2AVFrame'
import ColorSpace from './colorSpace/ColorSpace'
import generateSteps from './colorTransform/generateSteps'
import type { ColorTransformOptions } from './colorTransform/options'
import { DefaultSDRWhiteLevel, GLType } from './colorTransform/options'
import HdrMetadata from './struct/HdrMetadata'
import vertexSource from './webgpu/wgsl/vertex.wgsl'
import type { WebGPURenderOptions } from './WebGPURender'
import WebGPURender from './WebGPURender'

import {
  AVColorPrimaries,
  AVColorRange,
  AVColorSpace,
  AVColorTransferCharacteristic,
  isHdrVideoFrame,
  type AVFrame
} from '@libmedia/avutil'
import transferFn from './colorTransform/transferFn/transferFn'
import { browser, os } from '@libmedia/common'
import colorTransformMatrix from './colorTransform/colorTransformMatrix'

export default class WebGPUExternalRender extends WebGPURender {

  private hasAlpha: boolean
  private primaries: VideoColorPrimaries
  private transfer: VideoTransferCharacteristics

  private hdrMetadata: HdrMetadata
  private hdrMetadataBuffer: GPUBuffer

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)
    this.vertexSource = vertexSource
    this.hdrMetadata = make<HdrMetadata>()
    this.hdrMetadata.multiplier = 1.0
  }

  private generateFragmentSource(colorTransformOptions?: ColorTransformOptions) {

    let steps: string[] = []

    if (colorTransformOptions) {
      colorTransformOptions.outputRGB = true
      steps = generateSteps(this.srcColorSpace, this.dstColorSpace, colorTransformOptions)

      // ExternalTexture 采样的数据应该是 sRGB，但 Safari 由于 VIdeoFrame 带有错误的 spaceColor 导致采样出来的却不是
      // 有 bug，这里无法将转换之后的 sRGB 变成 PQ RGB，整体颜色偏绿
      if (!(browser.safari || os.ios)) {
        const patchSrcColor = new ColorSpace(
          AVColorSpace.AVCOL_SPC_RGB,
          AVColorPrimaries.AVCOL_PRI_BT709,
          AVColorTransferCharacteristic.AVCOL_TRC_BT709,
          AVColorRange.AVCOL_RANGE_JPEG
        )
        // XYZ 转 pq linear RGB
        steps.push(colorTransformMatrix(this.srcColorSpace.getPrimaryMatrix().invert(), colorTransformOptions))
        // srgb linear RGB 空间转 XYZ 空间
        steps.unshift(colorTransformMatrix(patchSrcColor.getPrimaryMatrix(), colorTransformOptions))
        // 转成线性 rgb
        steps.unshift(transferFn(patchSrcColor.getTransferFunction(), patchSrcColor.hasExtendedSkTransferFn(), colorTransformOptions))
      }
    }

    this.fragmentSource = `
      struct HdrMetadata {
        offset: f32,
        multiplier: f32,
        pqTonemapA: f32,
        pqTonemapB: f32,
        hlgOOTFGammaMinusOne: f32,
        nitsToSdrRelativeFactor: f32,
        sdrRelativeToNitsFactor: f32
      };
      @group(0) @binding(1) var eTexture: texture_external;
      @group(0) @binding(2) var s: sampler;
      @group(0) @binding(3) var<uniform> hdrMetadata: HdrMetadata;
      ${this.hasAlpha ? '@group(0) @binding(4) var aTexture: texture_external;' : ''}

      @fragment
      fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {

        ${steps.length ? `let offset = hdrMetadata.offset;
        let multiplier = hdrMetadata.multiplier;
        let pq_tonemap_a = hdrMetadata.pqTonemapA;
        let pq_tonemap_b = hdrMetadata.pqTonemapB;
        let hlg_ootf_gamma_minus_one = hdrMetadata.hlgOOTFGammaMinusOne;
        let nits_to_sdr_relative_factor = hdrMetadata.nitsToSdrRelativeFactor;
        let sdr_relative_to_nits_factor = hdrMetadata.sdrRelativeToNitsFactor;` : ''}

        let rgb: vec4<f32> = textureSampleBaseClampToEdge(eTexture, s, in_texcoord.xy);
        let alpha: f32 = ${this.hasAlpha ? 'textureSampleBaseClampToEdge(aTexture, s, in_texcoord.xy).r' : 'rgb.a'};
        var color = vec4<f32>(rgb.rgb, alpha);
        ${steps.length ? `if (color.a > 0) {
          color.r /= color.a;
          color.g /= color.a;
          color.b /= color.a;
        }
        color.r -= offset;
        color.g -= offset;
        color.b -= offset;
        color.r *= multiplier;
        color.g *= multiplier;
        color.b *= multiplier;
        ${steps.reduce((pre, current) => pre + current, '')}
        color.r *= color.a;
        color.g *= color.a;
        color.b *= color.a;` : ''}
        return color;
      }
    `
  }

  public async init() {
    await super.init()
    this.hdrMetadataBuffer = this.device.createBuffer({
      size: (reinterpret_cast<int32>(sizeof(HdrMetadata)) + 15) & ~15,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
  }

  private checkFrame(frame: VideoFrame, alpha?: VideoFrame) {
    const hasAlpha = !!alpha
    const primaries = (frame.realColorSpace || frame.colorSpace).primaries
    const transfer = (frame.realColorSpace || frame.colorSpace).transfer
    if (frame.codedWidth !== this.textureWidth
      || frame.codedHeight !== this.videoHeight
      || frame.codedWidth !== this.videoWidth
      || this.hasAlpha !== hasAlpha
      || this.primaries !== primaries
      || this.transfer !== transfer
    ) {
      this.videoWidth = frame.codedWidth
      this.videoHeight = frame.codedHeight
      this.textureWidth = frame.codedWidth
      this.hasAlpha = hasAlpha
      this.primaries = primaries
      this.transfer = transfer
      this.layout()

      if (isHdrVideoFrame(frame)) {
        this.srcColorSpace = new ColorSpace(
          AVColorSpace.AVCOL_SPC_RGB,
          mapColorPrimaries(primaries),
          mapColorTrc(transfer),
          (frame.realColorSpace || frame.colorSpace).fullRange ? AVColorRange.AVCOL_RANGE_JPEG : AVColorRange.AVCOL_RANGE_MPEG
        )
        const colorTransformOptions: ColorTransformOptions = {
          type: GLType.kWebGPU,
          bitDepth: 8,
          toneMapPQAndHlgToDst: true,
          metadata: this.hdrMetadata,
          dstSdrMaxLuminanceNits: DefaultSDRWhiteLevel,
          dstMaxLuminanceRelative: 1.0
        }
        this.generateFragmentSource(colorTransformOptions)
        const hdrBuffer = mapUint8Array(addressof(this.hdrMetadata), sizeof(HdrMetadata)).slice()
        this.device.queue.writeBuffer(
          this.hdrMetadataBuffer,
          0,
          hdrBuffer.buffer,
          hdrBuffer.byteOffset,
          hdrBuffer.byteLength
        )
      }
      else {
        this.generateFragmentSource()
      }
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
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    }
    if (this.hasAlpha) {
      descriptor.entries.push({
        binding: 4,
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
        },
        {
          binding: 3,
          resource: {
            buffer: this.hdrMetadataBuffer,
            size: this.hdrMetadataBuffer.size
          }
        }
      ]
    }

    if (alpha) {
      descriptor.entries.push({
        binding: 4,
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
      ]
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)
    renderPass.setPipeline(this.renderPipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.setVertexBuffer(0, this.vbo)
    renderPass.draw(4, 4, 0, 0)
    renderPass.end()
    this.device.queue.submit([commandEncoder.finish()])
  }

  public destroy(): void {
    if (this.hdrMetadata) {
      unmake(this.hdrMetadata)
      this.hdrMetadata = null
    }
    if (this.hdrMetadataBuffer) {
      this.hdrMetadataBuffer.destroy()
      this.hdrMetadataBuffer = null
    }
    super.destroy()
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    // VideoFrame
    return frame instanceof VideoFrame
  }
}
