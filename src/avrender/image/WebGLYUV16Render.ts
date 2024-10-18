/*
 * libmedia WebGLYUV16Render
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
import { PixelFormatDescriptor, PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import WebGLYUVRender from './WebGLYUVRender'
import generateSteps from './colorTransform/generateSteps'
import { ColorTransformOptions, DefaultSDRWhiteLevel, GLType } from './colorTransform/options'
import ColorSpace from './colorSpace/ColorSpace'
import HdrMetadata from './struct/HdrMetadata'
import { getAVFrameSideData } from 'avutil/util/avframe'
import YUV16Program from './webgl/program/YUV16Program'
import isPointer from 'cheap/std/function/isPointer'

export default class WebGLYUV16Render extends WebGLYUVRender {

  declare protected gl: WebGL2RenderingContext

  declare protected program: YUV16Program

  private hdrMetadata: HdrMetadata

  private ext: any

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)

    this.hdrMetadata = make<HdrMetadata>()
    this.hdrMetadata.multiplier = 1.0
  }

  public async init() {
    await super.init()
    this.ext = this.gl.getExtension('EXT_texture_norm16')
    if (!this.ext) {
      throw Error('not support')
    }
  }

  private generateFragmentSource(format: AVPixelFormat, descriptor: PixelFormatDescriptor, colorTransformOptions: ColorTransformOptions) {

    colorTransformOptions.outputRGB = true

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, colorTransformOptions)

    let y = 'texture2D(y_Sampler, v_color.xy).x'
    let u = 'texture2D(u_Sampler, v_color.xy).x'
    let v = 'texture2D(v_Sampler, v_color.xy).x'
    let alpha = '1.0'

    if (format === AVPixelFormat.AV_PIX_FMT_NV12
      || format === AVPixelFormat.AV_PIX_FMT_NV24
    ) {
      u = 'texture2D(u_Sampler, v_color.xy).x'
      v = 'texture2D(u_Sampler, v_color.xy).y'
    }
    else if (format === AVPixelFormat.AV_PIX_FMT_NV21
      || format === AVPixelFormat.AV_PIX_FMT_NV42
    ) {
      u = 'texture2D(u_Sampler, v_color.xy).y'
      v = 'texture2D(u_Sampler, v_color.xy).x'
    }

    if ((descriptor.flags & PixelFormatFlags.ALPHA) && descriptor.nbComponents === 4) {
      alpha = 'texture2D(a_Sampler, v_color.xy).x'
    }

    this.fragmentSource = `
      precision highp float;

      varying vec4 v_color;
      uniform sampler2D y_Sampler;
      uniform sampler2D u_Sampler;
      uniform sampler2D v_Sampler;
      
      uniform float v_max;

      uniform float offset;
      uniform float multiplier;
      uniform float pq_tonemap_a;
      uniform float pq_tonemap_b;
      uniform float hlg_ootf_gamma_minus_one;
      uniform float hlg_dst_max_luminance_relative;
      uniform float nits_to_sdr_relative_factor;
      uniform float sdr_relative_to_nits_factor;

      ${(descriptor.flags & PixelFormatFlags.BIG_ENDIAN) ? `
        float swap(float x) {
          int value = int(x * 65535.0);
          int low = value & 0xff;
          int high = (value >> 8) & 0xff;
          value = (low << 8) | high;
          return float(value) / v_max;
        }
      ` : ''}
      
      void main () {
      
        float y = ${y};
        float u = ${u};
        float v = ${v};
        float alpha = ${alpha};
        
        ${(descriptor.flags & PixelFormatFlags.BIG_ENDIAN) ? `
          y = swap(y);
          u = swap(u);
          v = swap(v);
        ` : `
          y = y * 65535.0 / v_max;
          u = u * 65535.0 / v_max;
          v = v * 65535.0 / v_max;
        `}
        
        vec4 color = vec4(y, u, v, alpha);

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

        gl_FragColor = color;
      }
    `
  }

  protected checkFrame(frame: pointer<AVFrame>): void {

    const descriptor =  PixelFormatDescriptorsMap[frame.format as AVPixelFormat]

    if (!descriptor) {
      return
    }

    const bytesPerPixel = (descriptor.comp[0].depth + 7) >>> 3

    if ((frame.linesize[0] / bytesPerPixel) !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
      || frame.format !== this.format
    ) {

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

      this.generateFragmentSource(frame.format as AVPixelFormat, descriptor, colorTransformOptions)
      this.program = new YUV16Program(this.fragmentSource)
      this.useProgram()
      this.program.setMetaData(this.hdrMetadata)

      this.yTexture.setFormat(this.gl.RED)
      this.yTexture.setInternalformat(this.ext.R16_EXT)
      this.yTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.uTexture.setFormat(this.gl.RED)
      this.uTexture.setInternalformat(this.ext.R16_EXT)
      this.uTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.vTexture.setFormat(this.gl.RED)
      this.vTexture.setInternalformat(this.ext.R16_EXT)
      this.vTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.aTexture.setFormat(this.gl.RED)
      this.aTexture.setInternalformat(this.ext.R16_EXT)
      this.aTexture.setDataType(this.gl.UNSIGNED_SHORT)

      this.yTexture.setSize(frame.linesize[0] >>> 1, frame.height)
      this.uTexture.setSize(frame.linesize[1] >>> 1, frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH)
      if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
        this.vTexture.setSize(frame.linesize[2] >>> 1, frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH)
      }
      if (descriptor.nbComponents === 4) {
        this.aTexture.setSize(frame.linesize[3] >>> 1, frame.height)
      }

      this.program.setMax((1 << descriptor.comp[0].depth) - 1)

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.textureWidth = frame.linesize[0] >>> 1
      this.format = frame.format

      this.layout()
    }
  }

  public render(frame: pointer<AVFrame>): void {

    if (this.lost) {
      return
    }

    this.checkFrame(frame)

    const descriptor =  PixelFormatDescriptorsMap[frame.format as AVPixelFormat]

    if (!descriptor) {
      return
    }

    this.yTexture.fill(mapUint16Array(
      reinterpret_cast<pointer<uint16>>(frame.data[0]),
      this.yTexture.width * this.yTexture.height
    ))
    this.uTexture.fill(mapUint16Array(
      reinterpret_cast<pointer<uint16>>(frame.data[1]),
      this.uTexture.width * this.uTexture.height
    ))

    if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
      this.vTexture.fill(mapUint16Array(
        reinterpret_cast<pointer<uint16>>(frame.data[2]),
        this.vTexture.width * this.vTexture.height
      ))
    }
    if (descriptor.nbComponents === 4) {
      this.aTexture.fill(mapUint16Array(
        reinterpret_cast<pointer<uint16>>(frame.data[3]),
        this.aTexture.width * this.aTexture.height
      ))
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
      const info = PixelFormatDescriptorsMap[frame.format as AVPixelFormat]
      if (info) {
        if (info.flags & PixelFormatFlags.RGB) {
          return false
        }
        return (info.flags & PixelFormatFlags.PLANER) && ((info.comp[0].depth + 7) >>> 3) === 2
      }
    }
    return false
  }
}
