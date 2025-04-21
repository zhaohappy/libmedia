/*
 * libmedia WebGLDefault16Render
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
import { mapUint16Array } from 'cheap/std/memory'
import { WebGLRenderOptions } from './WebGLRender'
import { AVPixelFormatDescriptor, getAVPixelFormatDescriptor, AVPixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import WebGLDefaultRender from './WebGLDefaultRender'
import generateSteps from './colorTransform/generateSteps'
import { ColorTransformOptions, DefaultSDRWhiteLevel, GLType } from './colorTransform/options'
import ColorSpace from './colorSpace/ColorSpace'
import HdrMetadata from './struct/HdrMetadata'
import { getAVFrameSideData } from 'avutil/util/avframe'
import VideoProgram16 from './webgl/program/VideoProgram16'
import isPointer from 'cheap/std/function/isPointer'

export default class WebGLDefault16Render extends WebGLDefaultRender {

  declare protected gl: WebGL2RenderingContext

  declare protected program: VideoProgram16

  private hdrMetadata: HdrMetadata

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)

    this.hdrMetadata = make<HdrMetadata>()
    this.hdrMetadata.multiplier = 1.0
  }

  public async init() {
    await super.init()
    if (!(this.gl instanceof WebGL2RenderingContext)) {
      throw new Error('not support webgl2')
    }
  }

  private generateVertexSource() {
    return `#version 300 es
      precision highp float;
      in vec3 point;
      in vec4 color;
      out vec4 v_color;
      uniform mat4 rotateMatrix;
      void main(void) {
        gl_Position = rotateMatrix * vec4(point, 1.0);
        v_color = color;
      }
    `
  }

  private generateFragmentSource(descriptor: AVPixelFormatDescriptor, colorTransformOptions: ColorTransformOptions) {

    colorTransformOptions.outputRGB = true

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
    let y = `texture(${textureMap[descriptor.comp[0].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[0].offset / bytes[0]]}`
    let u = descriptor.comp[1]
      ? `texture(${textureMap[descriptor.comp[1].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[1].offset / bytes[1]]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )
    let v = descriptor.comp[2]
      ? `texture(${textureMap[descriptor.comp[2].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[2].offset / bytes[2]]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )

    let a = '1.0'
    if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
      a = `texture(${textureMap[descriptor.comp[descriptor.comp.length - 1].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[descriptor.comp.length - 1].offset / bytes[descriptor.comp.length - 1]]}`
      if (descriptor.comp.length === 2) {
        u = ((descriptor.flags & AVPixelFormatFlags.RGB)
          ? '0.0'
          : '0.5'
        )
      }
    }

    function isTexture(s: string) {
      return /^texture/.test(s)
    }

    this.fragmentSource = `#version 300 es
      precision highp float;
      precision highp usampler2D;
      in vec4 v_color;
      out vec4 outColor;
      uniform usampler2D y_Sampler;
      uniform usampler2D u_Sampler;
      uniform usampler2D v_Sampler;
      uniform usampler2D a_Sampler;
      uniform float offset;
      uniform float multiplier;
      uniform float pq_tonemap_a;
      uniform float pq_tonemap_b;
      uniform float hlg_ootf_gamma_minus_one;
      uniform float nits_to_sdr_relative_factor;
      uniform float sdr_relative_to_nits_factor;
      ${(descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) ? `
        uint swap(uint x) {
          uint l = x & 0xFFu;
          uint h = (x >> 8u) & 0xFFu;
          return (l << 8u) | h;
        }
      ` : ''}
      void main () {
        float y = ${isTexture(y) ? `float(${(descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) ? `swap(${y})` : y} >> ${shifts[0]}) / float(${maxes[0]})` : y};
        float u = ${isTexture(u) ? `float(${(descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) ? `swap(${u})` : u} >> ${shifts[1]}) / float(${maxes[1]})` : u};
        float v = ${isTexture(v) ? `float(${(descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) ? `swap(${v})` : v} >> ${shifts[2]}) / float(${maxes[2]})` : v};
        float a = ${isTexture(a) ? `float(${(descriptor.flags & AVPixelFormatFlags.BIG_ENDIAN) ? `swap(${a})` : a} >> ${shifts[descriptor.comp.length - 1]}) / float(${maxes[descriptor.comp.length - 1]})` : a};
        vec4 color = vec4(y, u, v, a);
        if (color.a > 0.0) {
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
        outColor = color;
      }
    `
  }

  protected checkFrame(frame: pointer<AVFrame>): void {
    if ((frame.linesize[0] >>> 1) !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
      || frame.format !== this.format
    ) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      const colorTransformOptions: ColorTransformOptions = {
        type: GLType.kWebGL,
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

      this.generateFragmentSource(descriptor, colorTransformOptions)
      this.program = new VideoProgram16(this.fragmentSource, this.generateVertexSource())
      this.useProgram(true)
      this.program.setMetaData(this.hdrMetadata)

      this.yTexture.setFormat(this.gl.RED_INTEGER)
      this.yTexture.setInternalformat(this.gl.R16UI)
      this.yTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.uTexture.setFormat(this.gl.RED_INTEGER)
      this.uTexture.setInternalformat(this.gl.R16UI)
      this.uTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.vTexture.setFormat(this.gl.RED_INTEGER)
      this.vTexture.setInternalformat(this.gl.R16UI)
      this.vTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.aTexture.setFormat(this.gl.RED_INTEGER)
      this.aTexture.setInternalformat(this.gl.R16UI)
      this.aTexture.setDataType(this.gl.UNSIGNED_SHORT)

      if (descriptor.flags & AVPixelFormatFlags.PLANER) {
        let plane = 0
        this.yTexture.setSize(frame.linesize[plane++] >>> 1, frame.height)
        if (descriptor.comp.length > 2) {
          const isUVPlane = descriptor.comp[1].plane === descriptor.comp[2].plane
          this.uTexture.setSize(frame.linesize[plane++] >>> (isUVPlane ? 2 : 1), frame.height >>> descriptor.log2ChromaH)
          if (!isUVPlane) {
            this.vTexture.setSize(frame.linesize[plane++] >>> 1, frame.height >>> descriptor.log2ChromaH)
          }
          if (isUVPlane) {
            this.uTexture.setFormat(this.gl.RG_INTEGER)
            this.uTexture.setInternalformat(this.gl.RG16UI)
          }
        }
        if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
          this.aTexture.setSize(frame.linesize[plane++] >>> 1, frame.height)
        }
        this.textureWidth = frame.linesize[0] >>> 1
      }
      else {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        let planeCount = descriptor.comp[0].step / bytes
        const formatMap = [0, this.gl.RED_INTEGER, this.gl.RG_INTEGER, this.gl.RGB_INTEGER, this.gl.RGBA_INTEGER]
        const internalformatMap = [0, this.gl.R16UI, this.gl.RG16UI, this.gl.RGB16UI, this.gl.RGBA16UI]
        this.yTexture.setFormat(formatMap[planeCount])
        this.yTexture.setInternalformat(internalformatMap[planeCount])
        this.yTexture.setSize((frame.linesize[0] / planeCount) >>> 1, frame.height)
        this.textureWidth = (frame.linesize[0] / planeCount) >>> 1
      }

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.format = frame.format

      this.layout()
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
    this.yTexture.fill(mapUint16Array(
      reinterpret_cast<pointer<uint16>>(frame.data[plane]),
      (frame.linesize[plane++] >>> 1) * this.yTexture.height
    ))
    if (descriptor.flags & AVPixelFormatFlags.PLANER) {
      if (descriptor.comp.length > 2) {
        this.uTexture.fill(mapUint16Array(
          reinterpret_cast<pointer<uint16>>(frame.data[plane]),
          (frame.linesize[plane++] >>> 1) * this.uTexture.height
        ))
        if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
          this.vTexture.fill(mapUint16Array(
            reinterpret_cast<pointer<uint16>>(frame.data[plane]),
            (frame.linesize[plane++] >>> 1) * this.vTexture.height
          ))
        }
      }
      if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
        this.aTexture.fill(mapUint16Array(
          reinterpret_cast<pointer<uint16>>(frame.data[plane]),
          (frame.linesize[plane++] >>> 1) * this.aTexture.height
        ))
      }
    }

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  public destroy(): void {
    if (this.hdrMetadata) {
      unmake(this.hdrMetadata)
      this.hdrMetadata = null
    }
    super.destroy()
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    if (isPointer(frame)) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)
      if (descriptor) {
        return ((descriptor.comp[0].depth + 7) >>> 3) === 2
      }
    }
    return false
  }
}
