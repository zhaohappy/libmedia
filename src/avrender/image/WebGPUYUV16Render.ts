/*
 * libmedia WebGPUYUV16Render
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

import AVFrame, { AVContentLightMetadata, AVFrameSideDataType } from 'avutil/struct/avframe'
import { AVPixelFormat } from 'avutil/pixfmt'
import * as is from 'common/util/is'

import { WebGPURenderOptions } from './WebGPURender'
import WebGPUYUVRender from './WebGPUYUVRender'
import { PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import { mapUint8Array } from 'cheap/std/memory'
import ColorSpace from './colorSpace/ColorSpace'

import uint2FloatLE from './webgpu/wgsl/compute/uint2FloatLE.wgsl'
import uint2FloatBE from './webgpu/wgsl/compute/uint2FloatBE.wgsl'
import { ColorTransformOptions, DefaultSDRWhiteLevel, GLType } from './colorTransform/options'
import generateSteps from './colorTransform/generateSteps'
import HdrMetadata from './struct/HdrMetadata'
import { getAVFrameSideData } from 'avutil/util/avframe'

export default class WebGPUYUV16Render extends WebGPUYUVRender {

  private metaYBuffer: GPUBuffer
  private metaUBuffer: GPUBuffer
  private metaVBuffer: GPUBuffer

  private computeBindGroupLayout: GPUBindGroupLayout

  private computeBindGroupY: GPUBindGroup
  private computeBindGroupU: GPUBindGroup
  private computeBindGroupV: GPUBindGroup

  private computePipelineLayout: GPUPipelineLayout

  private computePipeline: GPUComputePipeline

  private inputYTexture: GPUTexture
  private inputUTexture: GPUTexture
  private inputVTexture: GPUTexture

  private computeModule: GPUShaderModule

  protected uint2Float: string

  private hdrMetadata: HdrMetadata
  private hdrMetadataBuffer: GPUBuffer

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)

    this.hdrMetadata = make(HdrMetadata)
    this.hdrMetadata.multiplier = 1.0
  }

  private generateFragmentSource(colorTransformOptions: ColorTransformOptions) {

    colorTransformOptions.outputRGB = true

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, colorTransformOptions)

    this.fragmentSource = `
      struct HdrMetadata {
        offset: f32,
        multiplier: f32,
        pqTonemapA: f32,
        pqTonemapB: f32,
        hlgOOTFGammaMinusOne: f32,
        hlgDstMaxLuminanceRelative: f32,
        nitsToSdrRelativeFactor: f32,
        sdrRelativeToNitsFactor: f32
      };

      @group(0) @binding(1) var yTexture: texture_2d<f32>;
      @group(0) @binding(2) var uTexture: texture_2d<f32>;
      @group(0) @binding(3) var vTexture: texture_2d<f32>;
      @group(0) @binding(4) var s: sampler;
      @group(0) @binding(5) var<uniform> hdrMetadata: HdrMetadata;

      @fragment
      fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {

        let offset = hdrMetadata.offset;
        let multiplier = hdrMetadata.multiplier;
        let pq_tonemap_a = hdrMetadata.pqTonemapA;
        let pq_tonemap_b = hdrMetadata.pqTonemapB;
        let hlg_ootf_gamma_minus_one = hdrMetadata.hlgOOTFGammaMinusOne;
        let hlg_dst_max_luminance_relative = hdrMetadata.hlgDstMaxLuminanceRelative;
        let nits_to_sdr_relative_factor = hdrMetadata.nitsToSdrRelativeFactor;
        let sdr_relative_to_nits_factor = hdrMetadata.sdrRelativeToNitsFactor;

        var color = vec4(textureSample(yTexture, s, in_texcoord.xy).x, textureSample(uTexture, s, in_texcoord.xy).x, textureSample(vTexture, s, in_texcoord.xy).x, 1.0);

        if (color.a > 0) {
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
        color.b *= color.a;

        return color;
      }
    `
  }

  public async init() {
    await super.init(['float32-filterable'])
    this.metaYBuffer = this.device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.metaUBuffer = this.device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.metaVBuffer = this.device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.hdrMetadataBuffer = this.device.createBuffer({
      size: (sizeof(HdrMetadata) + 15) & ~15,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
  }

  private generateComputeBindGroup(): void {
    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            sampleType: 'uint'
          }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            format: 'r32float'
          }
        }
      ]
    })
    this.computeBindGroupY = this.device.createBindGroup({
      layout: this.computeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.metaYBuffer,
            size: Uint32Array.BYTES_PER_ELEMENT * 4
          }
        },
        {
          binding: 1,
          resource: this.inputYTexture.createView()
        },
        {
          binding: 2,
          resource: this.yTexture.createView()
        }
      ]
    })
    this.computeBindGroupU = this.device.createBindGroup({
      layout: this.computeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.metaUBuffer,
            size: Uint32Array.BYTES_PER_ELEMENT * 4
          }
        },
        {
          binding: 1,
          resource: this.inputUTexture.createView()
        },
        {
          binding: 2,
          resource: this.uTexture.createView()
        }
      ]
    })
    this.computeBindGroupV = this.device.createBindGroup({
      layout: this.computeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.metaVBuffer,
            size: Uint32Array.BYTES_PER_ELEMENT * 4
          }
        },
        {
          binding: 1,
          resource: this.inputVTexture.createView()
        },
        {
          binding: 2,
          resource: this.vTexture.createView()
        }
      ]
    })
  }

  private generateComputePipeline() {
    this.generateComputeBindGroup()

    this.computePipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.computeBindGroupLayout]
    })

    this.computeModule = this.device.createShaderModule({
      code: this.uint2Float
    })

    this.computePipeline = this.device.createComputePipeline({
      layout: this.computePipelineLayout,
      compute: {
        module: this.computeModule,
        entryPoint: 'main'
      }
    })
  }

  protected generateBindGroup(): void {
    if (!this.yTexture) {
      return
    }
    this.bindGroupLayout = this.device.createBindGroupLayout({
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
          texture: {
            sampleType: 'float'
          }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float'
          }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float'
          }
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: 'filtering'
          }
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    })
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.rotateMatrixBuffer,
            size: this.rotateMatrixBuffer.size
          }
        },
        {
          binding: 1,
          resource: this.yTexture.createView()
        },
        {
          binding: 2,
          resource: this.uTexture.createView()
        },
        {
          binding: 3,
          resource: this.vTexture.createView()
        },
        {
          binding: 4,
          resource: this.sampler
        },
        {
          binding: 5,
          resource: {
            buffer: this.hdrMetadataBuffer,
            size: this.hdrMetadataBuffer.size
          }
        }
      ]
    })
  }

  protected checkFrame(frame: pointer<AVFrame>): void {

    const descriptor =  PixelFormatDescriptorsMap[frame.format as AVPixelFormat]

    if (!descriptor) {
      return
    }

    if ((frame.linesize[0] >>> 1) !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
      || frame.format !== this.format
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
      if (this.inputYTexture) {
        this.inputYTexture.destroy()
      }
      if (this.inputUTexture) {
        this.inputUTexture.destroy()
      }
      if (this.inputVTexture) {
        this.inputVTexture.destroy()
      }

      this.yTexture = this.device.createTexture({
        size: [frame.linesize[0] >>> 1, frame.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
        format: 'r32float'
      })

      this.uTexture = this.device.createTexture({
        size: [frame.linesize[1] >>> 1, (frame.height >>> descriptor.log2ChromaH)],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
        format: 'r32float'
      })
      this.vTexture = this.device.createTexture({
        size: [frame.linesize[2] >>> 1, (frame.height >>> descriptor.log2ChromaH)],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
        format: 'r32float'
      })

      this.inputYTexture = this.device.createTexture({
        size: [this.yTexture.width, this.yTexture.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        format: 'r16uint'
      })
      this.inputUTexture = this.device.createTexture({
        size: [this.uTexture.width, this.uTexture.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        format: 'r16uint'
      })
      this.inputVTexture = this.device.createTexture({
        size: [this.vTexture.width, this.vTexture.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        format: 'r16uint'
      })

      const yBuffer = new Uint32Array([(1 << descriptor.comp[0].depth) - 1, this.inputYTexture.width, this.inputYTexture.height])
      this.device.queue.writeBuffer(
        this.metaYBuffer,
        0,
        yBuffer.buffer,
        yBuffer.byteOffset,
        yBuffer.byteLength
      )

      const uBuffer = new Uint32Array([(1 << descriptor.comp[1].depth) - 1, this.inputUTexture.width, this.inputUTexture.height])
      this.device.queue.writeBuffer(
        this.metaUBuffer,
        0,
        uBuffer.buffer,
        uBuffer.byteOffset,
        uBuffer.byteLength
      )
      const vBuffer = new Uint32Array([(1 << descriptor.comp[2].depth) - 1, this.inputVTexture.width, this.inputVTexture.height])
      this.device.queue.writeBuffer(
        this.metaVBuffer,
        0,
        vBuffer.buffer,
        vBuffer.byteOffset,
        vBuffer.byteLength
      )

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.textureWidth = frame.linesize[0] >>> 1
      this.format = frame.format

      const colorTransformOptions: ColorTransformOptions = {
        type: GLType.kWebGPU,
        bitDepth: descriptor.comp[0].depth,
        toneMapPQAndHlgToDst: true,
        metadata: this.hdrMetadata,
        dstSdrMaxLuminanceNits: DefaultSDRWhiteLevel,
        dstMaxLuminanceRelative: 1.0
      }

      const sideData = getAVFrameSideData(frame, AVFrameSideDataType.AV_FRAME_DATA_CONTENT_LIGHT_LEVEL)
      if (sideData) {
        const lightMetadata = reinterpret_cast<pointer<AVContentLightMetadata>>(sideData.data)
        if (lightMetadata.maxCLL > 0) {
          colorTransformOptions.maxContentLightLevel = static_cast<float>(lightMetadata.maxCLL)
        }
      }

      this.generateFragmentSource(colorTransformOptions)
      this.uint2Float = (descriptor.flags & PixelFormatFlags.BIG_ENDIAN) ? uint2FloatBE : uint2FloatLE

      this.layout()

      this.generatePipeline()
      this.generateRenderBundleEncoder()
      this.generateComputePipeline()

      const hdrBuffer = mapUint8Array(addressof(this.hdrMetadata), sizeof(HdrMetadata)).slice()
      this.device.queue.writeBuffer(
        this.hdrMetadataBuffer,
        0,
        hdrBuffer.buffer,
        hdrBuffer.byteOffset,
        hdrBuffer.byteLength
      )
    }
  }

  public render(frame: pointer<AVFrame>): void {

    if (this.lost) {
      return
    }

    this.checkFrame(frame)

    const commandEncoder = this.device.createCommandEncoder()
    const computePass = commandEncoder.beginComputePass({})

    computePass.setPipeline(this.computePipeline)

    computePass.setBindGroup(0, this.computeBindGroupY)
    this.device.queue.writeTexture(
      {
        texture: this.inputYTexture
      },
      mapUint8Array(frame.data[0], (this.inputYTexture.width * this.inputYTexture.height) << 1),
      {
        offset: 0,
        bytesPerRow: this.inputYTexture.width << 1,
        rowsPerImage: this.inputYTexture.height
      },
      {
        width: this.inputYTexture.width,
        height: this.inputYTexture.height,
        depthOrArrayLayers: 1
      }
    )
    computePass.dispatchWorkgroups((this.inputYTexture.width + 7) >>> 3, (this.inputYTexture.height + 7) >>> 3)

    computePass.setBindGroup(0, this.computeBindGroupU)
    this.device.queue.writeTexture(
      {
        texture: this.inputUTexture
      },
      mapUint8Array(frame.data[1], (this.inputUTexture.width * this.inputUTexture.height) << 1),
      {
        offset: 0,
        bytesPerRow: this.inputUTexture.width << 1,
        rowsPerImage: this.inputUTexture.height
      },
      {
        width: this.inputUTexture.width,
        height: this.inputUTexture.height,
        depthOrArrayLayers: 1
      }
    )
    computePass.dispatchWorkgroups((this.inputUTexture.width + 7) >>> 3, (this.inputUTexture.height + 7) >>> 3)

    computePass.setBindGroup(0, this.computeBindGroupV)
    this.device.queue.writeTexture(
      {
        texture: this.inputVTexture
      },
      mapUint8Array(frame.data[2], (this.inputVTexture.width * this.inputVTexture.height) << 1),
      {
        offset: 0,
        bytesPerRow: this.inputVTexture.width << 1,
        rowsPerImage: this.inputVTexture.height
      },
      {
        width: this.inputVTexture.width,
        height: this.inputVTexture.height,
        depthOrArrayLayers: 1
      }
    )
    computePass.dispatchWorkgroups((this.inputVTexture.width + 7) >>> 3, (this.inputVTexture.height + 7) >>> 3)

    computePass.end()

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

  public destroy(): void {

    if (this.inputYTexture) {
      this.inputYTexture.destroy()
      this.inputYTexture = null
    }
    if (this.inputUTexture) {
      this.inputUTexture.destroy()
      this.inputUTexture = null
    }
    if (this.inputVTexture) {
      this.inputVTexture.destroy()
      this.inputVTexture = null
    }

    if (this.metaYBuffer) {
      this.metaYBuffer.destroy()
      this.metaYBuffer = null
    }
    if (this.metaUBuffer) {
      this.metaUBuffer.destroy()
      this.metaUBuffer = null
    }
    if (this.metaVBuffer) {
      this.metaVBuffer.destroy()
      this.metaVBuffer = null
    }
    if (this.hdrMetadata) {
      unmake(this.hdrMetadata)
      this.hdrMetadata = null
    }

    this.computeModule = null
    this.computeBindGroupY = null
    this.computeBindGroupU = null
    this.computeBindGroupV = null
    this.computeBindGroupLayout = null
    this.computePipelineLayout = null
    this.computePipeline = null

    super.destroy()
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    if (is.number(frame)) {
      const info = PixelFormatDescriptorsMap[frame.format as AVPixelFormat]
      if (info) {
        return ((info.comp[0].depth + 7) >>> 3) === 2
      }
    }
    return false
  }
}
