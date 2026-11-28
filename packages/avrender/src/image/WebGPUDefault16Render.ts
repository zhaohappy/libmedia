/*
 * libmedia WebGPUDefault16Render
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

import type { WebGPURenderOptions } from './WebGPURender'
import WebGPUDefaultRender from './WebGPUDefaultRender'
import ColorSpace from './colorSpace/ColorSpace'

import type { ColorTransformOptions } from './colorTransform/options'
import { DefaultSDRDiffuseWhiteLevel, DefaultSDRReferenceWhiteLevel, GLType } from './colorTransform/options'
import generateSteps from './colorTransform/generateSteps'
import HdrMetadata from './struct/HdrMetadata'

import {
  type AVFrame,
  type AVPixelFormat,
  type AVPixelFormatDescriptor,
  getAVPixelFormatDescriptor,
  AVPixelFormatFlags,
  type AVContentLightMetadata,
  AVFrameSideDataType,
  getAVFrameSideData,
  AVColorSpace,
  AVColorPrimaries,
  AVColorTransferCharacteristic,
  AVColorRange
} from '@libmedia/avutil'

import {
  isPointer,
  mapUint8Array
} from '@libmedia/cheap'

import { getHeap } from '@libmedia/cheap/internal'

export default class WebGPUDefault16Render extends WebGPUDefaultRender {

  private linesize: int32

  private hdrMetadata: HdrMetadata
  private hdrMetadataBuffer: GPUBuffer

  private currentColorTransformOptions: ColorTransformOptions
  private currentDescriptor: AVPixelFormatDescriptor

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGPURenderOptions) {
    super(canvas, options)

    this.hdrMetadata = make<HdrMetadata>()
    this.hdrMetadata.multiplier = 1.0
  }

  private generateFragmentSource(descriptor: AVPixelFormatDescriptor, colorTransformOptions: ColorTransformOptions) {

    function generateSampleFnCode(name: string, channel: string, shift: number, max: number) {
      let p00 = `textureLoad(tex, clamp(base, vec2<i32>(0), maxCoord), 0).${channel}`
      let p10 = `textureLoad(tex, clamp(base + vec2<i32>(1, 0), vec2<i32>(0), maxCoord), 0).${channel}`
      let p01 = `textureLoad(tex, clamp(base + vec2<i32>(0, 1), vec2<i32>(0), maxCoord), 0).${channel}`
      let p11 = `textureLoad(tex, clamp(base + vec2<i32>(1, 1), vec2<i32>(0), maxCoord), 0).${channel}`

      if (descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) {
        p00 = `swap(${p00})`
        p10 = `swap(${p10})`
        p01 = `swap(${p01})`
        p11 = `swap(${p11})`
      }

      p00 = `f32(${p00} >> ${shift}) / f32(${max})`
      p10 = `f32(${p10} >> ${shift}) / f32(${max})`
      p01 = `f32(${p01} >> ${shift}) / f32(${max})`
      p11 = `f32(${p11} >> ${shift}) / f32(${max})`

      return `
        fn sampleR16${name.toLocaleUpperCase()}(tex: texture_2d<u32>, uv: vec2<f32>) -> f32 {
          let size = vec2<f32>(textureDimensions(tex));
          let coord = uv * size - 0.5;

          let base = vec2<i32>(floor(coord));
          let f = fract(coord);

          let maxCoord = vec2<i32>(textureDimensions(tex)) - 1;

          let p00 = ${p00};
          let p10 = ${p10};
          let p01 = ${p01};
          let p11 = ${p11};

          let a = mix(p00, p10, f.x);
          let b = mix(p01, p11, f.x);

          return mix(a, b, f.y);
        }
      `
    }

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, colorTransformOptions)

    const textureMap = ['y', 'u', 'v', 'a']
    const channelMap = ['r', 'g', 'b', 'a']
    const bytes: number[] = []
    const shifts: number[] = []
    const maxes: number[] = []

    descriptor.comp.forEach((com, i) => {
      bytes[i] = (com.depth + 7) >>> 3
      shifts[i] = com.shift
      maxes[i] = (1 << com.depth) - 1
    })

    let ySampleFn = generateSampleFnCode('y', channelMap[descriptor.comp[0].offset / bytes[0]], shifts[0], maxes[0])
    let uSampleFn = descriptor.comp[1]
      ? generateSampleFnCode('u', channelMap[descriptor.comp[1].offset / bytes[1]], shifts[1], maxes[1])
      : ''
    let vSampleFn = descriptor.comp[2]
      ? generateSampleFnCode('v', channelMap[descriptor.comp[2].offset / bytes[2]], shifts[2], maxes[2])
      : ''
    let aSampleFn = (descriptor.flags & AVPixelFormatFlags.ALPHA)
      ? generateSampleFnCode('a', channelMap[descriptor.comp[descriptor.comp.length - 1].offset / bytes[descriptor.comp.length - 1]], shifts[descriptor.comp.length - 1], maxes[descriptor.comp.length - 1])
      : ''

    let swapFn = descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN
      ? `
        fn swap(x: u32) -> u32 {
          var low = x & 0xff;
          var high = (x >> 8) & 0xff;
          return (low << 8) | high;
        }
      `
      : ''

    let y = `sampleR16Y(${textureMap[descriptor.comp[0].plane]}Texture, coord.xy)`
    let u = descriptor.comp[1]
      ? `sampleR16U(${textureMap[descriptor.comp[1].plane]}Texture, coord.xy)`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )
    let v = descriptor.comp[2]
      ? `sampleR16V(${textureMap[descriptor.comp[2].plane]}Texture, coord.xy)`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )

    let a = '1.0'
    if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
      a = `sampleR16A(${textureMap[descriptor.comp[descriptor.comp.length - 1].plane]}Texture, coord.xy)`
      if (descriptor.comp.length === 2) {
        u = ((descriptor.flags & AVPixelFormatFlags.RGB)
          ? '0.0'
          : '0.5'
        )
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
      @group(0) @binding(1) var<uniform> hdrMetadata: HdrMetadata;
      @group(0) @binding(2) var yTexture: texture_2d<u32>;
      ${this.uTexture ? '@group(0) @binding(3) var uTexture: texture_2d<u32>;' : ''}
      ${this.vTexture ? '@group(0) @binding(4) var vTexture: texture_2d<u32>;' : ''}
      ${this.aTexture ? '@group(0) @binding(5) var aTexture: texture_2d<u32>;' : ''}

      ${swapFn}
      ${ySampleFn}
      ${uSampleFn}
      ${vSampleFn}
      ${aSampleFn}

      @fragment
      fn main(@location(0) coord: vec4<f32>) -> @location(0) vec4<f32> {
        let offset = hdrMetadata.offset;
        let multiplier = hdrMetadata.multiplier;
        let pq_tonemap_a = hdrMetadata.pqTonemapA;
        let pq_tonemap_b = hdrMetadata.pqTonemapB;
        let hlg_ootf_gamma_minus_one = hdrMetadata.hlgOOTFGammaMinusOne;
        let nits_to_sdr_relative_factor = hdrMetadata.nitsToSdrRelativeFactor;
        let sdr_relative_to_nits_factor = hdrMetadata.sdrRelativeToNitsFactor;
        let y = ${y};
        let u = ${u};
        let v = ${v};
        let a = ${a};
        var color = vec4(y, u, v, a);
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
    await super.init()
    this.hdrMetadataBuffer = this.device.createBuffer({
      size: (reinterpret_cast<int32>(sizeof(HdrMetadata)) + 15) & ~15,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
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
        buffer: {
          type: 'uniform'
        }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'uint'
        }
      }
    ]

    if (this.uTexture) {
      bindGroupLayoutEntry.push({
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'uint'
        }
      })
    }

    if (this.vTexture) {
      bindGroupLayoutEntry.push({
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'uint'
        }
      })
    }
    if (this.aTexture) {
      bindGroupLayoutEntry.push({
        binding: 5,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'uint'
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
        resource: {
          buffer: this.hdrMetadataBuffer,
          size: this.hdrMetadataBuffer.size
        }
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

  protected checkFrame(frame: pointer<AVFrame>): void {
    if (frame.linesize[0] !== this.linesize
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
      || frame.format !== this.format
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
          size: [frame.linesize[plane++] >>> 1, frame.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
          format: 'r16uint'
        })
        if (descriptor.comp.length > 2) {
          const isUVPlane = descriptor.comp[1].plane === descriptor.comp[2].plane
          this.uTexture = this.device.createTexture({
            size: [frame.linesize[plane++] >>> (isUVPlane ? 2 : 1), frame.height >>> descriptor.log2ChromaH],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
            format: isUVPlane ? 'rg16uint' : 'r16uint'
          })
          if (!isUVPlane) {
            this.vTexture = this.device.createTexture({
              size: [frame.linesize[plane++] >>> 1, frame.height >>> descriptor.log2ChromaH],
              usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
              format: 'r16uint'
            })
          }
        }
        if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
          this.aTexture = this.device.createTexture({
            size: [frame.linesize[plane++] >>> 1, frame.height],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
            format: 'r16uint'
          })
        }
        this.textureWidth = frame.linesize[0] >>> 1
      }
      else {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        let planeCount = descriptor.comp[0].step / bytes
        const formatMap = ['', 'r16uint', 'rg16uint', '', 'rgba16uint']
        this.yTexture = this.device.createTexture({
          size: [(frame.linesize[0] / planeCount) >>> 1, frame.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
          format: formatMap[planeCount] as GPUTextureFormat
        })
        this.textureWidth = (frame.linesize[0] / planeCount) >>> 1
      }
      this.linesize = frame.linesize[0]

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )
      if (this.options.outputHDRCanvasColorSpace === 'display-p3' && this.enableHDR) {
        this.dstColorSpace = new ColorSpace(
          AVColorSpace.AVCOL_SPC_RGB,
          AVColorPrimaries.AVCOL_PRI_SMPTE432,
          AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_1,
          AVColorRange.AVCOL_RANGE_JPEG
        )
      }

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.format = frame.format

      const colorTransformOptions: ColorTransformOptions = {
        type: GLType.kWebGPU,
        bitDepth: descriptor.comp[0].depth,
        toneMapPQAndHlgToDst: !(this.enableHDR && this.srcColorSpace.isHDR()),
        metadata: this.hdrMetadata,
        dstSdrMaxLuminanceNits: DefaultSDRDiffuseWhiteLevel,
        sdrWhiteLevel: DefaultSDRReferenceWhiteLevel,
        dstMaxLuminanceRelative: 1.0
      }

      const sideData = getAVFrameSideData(frame, AVFrameSideDataType.AV_FRAME_DATA_CONTENT_LIGHT_LEVEL)
      if (sideData) {
        const lightMetadata = reinterpret_cast<pointer<AVContentLightMetadata>>(sideData.data)
        if (lightMetadata.maxCLL > 0) {
          colorTransformOptions.maxContentLightLevel = static_cast<float>(lightMetadata.maxCLL)
        }
      }
      this.currentDescriptor = descriptor
      this.currentColorTransformOptions = colorTransformOptions

      this.generateFragmentSource(descriptor, colorTransformOptions)

      this.layout()

      this.generatePipeline()
      this.generateRenderBundleEncoder()

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

  protected onEnableHDRChange(): void {
    if (this.srcColorSpace.isHDR()) {
      this.currentColorTransformOptions.toneMapPQAndHlgToDst = !this.enableHDR
      if (this.enableHDR && this.options.outputHDRCanvasColorSpace === 'display-p3') {
        this.dstColorSpace = new ColorSpace(
          AVColorSpace.AVCOL_SPC_RGB,
          AVColorPrimaries.AVCOL_PRI_SMPTE432,
          AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_1,
          AVColorRange.AVCOL_RANGE_JPEG
        )
      }
      else {
        this.dstColorSpace = new ColorSpace(
          AVColorSpace.AVCOL_SPC_RGB,
          AVColorPrimaries.AVCOL_PRI_BT709,
          AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_1,
          AVColorRange.AVCOL_RANGE_JPEG
        )
      }
      this.generateFragmentSource(this.currentDescriptor, this.currentColorTransformOptions)
      const hdrBuffer = mapUint8Array(addressof(this.hdrMetadata), sizeof(HdrMetadata)).slice()
      this.device.queue.writeBuffer(
        this.hdrMetadataBuffer,
        0,
        hdrBuffer.buffer,
        hdrBuffer.byteOffset,
        hdrBuffer.byteLength
      )
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

    const commandEncoder = this.device.createCommandEncoder()
    let plane = 0
    this.device.queue.writeTexture(
      {
        texture: this.yTexture
      },
      getHeap(),
      {
        offset: static_cast<double>(reinterpret_cast<size>(frame.data[plane])),
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
      if (this.uTexture) {
        this.device.queue.writeTexture(
          {
            texture: this.uTexture
          },
          getHeap(),
          {
            offset: static_cast<double>(reinterpret_cast<size>(frame.data[plane])),
            bytesPerRow: frame.linesize[plane++],
            rowsPerImage: this.uTexture.height
          },
          {
            width: this.uTexture.width,
            height: this.uTexture.height,
            depthOrArrayLayers: 1
          }
        )
      }

      if (this.vTexture) {
        this.device.queue.writeTexture(
          {
            texture: this.vTexture
          },
          getHeap(),
          {
            offset: static_cast<double>(reinterpret_cast<size>(frame.data[plane])),
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
            offset: static_cast<double>(reinterpret_cast<size>(frame.data[plane])),
            bytesPerRow: frame.linesize[plane++],
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

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
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
    if (isPointer(frame)) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)
      if (descriptor) {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        if (bytes !== 2) {
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
