/*
 * libmedia WebGLYUV8Render
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
import { mapUint8Array } from 'cheap/std/memory'
import { WebGLRenderOptions } from './WebGLRender'
import { PixelFormatDescriptor, PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import WebGLYUVRender from './WebGLYUVRender'
import YUV8Program from './webgl/program/YUV8Program'
import generateSteps from './colorTransform/generateSteps'
import { GLType } from './colorTransform/options'
import ColorSpace from './colorSpace/ColorSpace'
import isPointer from 'cheap/std/function/isPointer'

export default class WebGLYUV8Render extends WebGLYUVRender {

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)
  }

  private generateFragmentSource(format: AVPixelFormat, descriptor: PixelFormatDescriptor) {

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, {
      bitDepth: 8,
      type: GLType.kWebGL,
      outputRGB: true
    })

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
      uniform sampler2D a_Sampler;
      void main () {
        float y = ${y};
        float u = ${u};
        float v = ${v};
        float alpha = ${alpha};
        vec4 color = vec4(y, u, v, alpha);
        ${steps.reduce((pre, current) => pre + current, '')}
        gl_FragColor = color;
      }
    `
  }

  protected checkFrame(frame: pointer<AVFrame>): void {
    if (frame.linesize[0] !== this.textureWidth
      || frame.height !== this.videoHeight
      || frame.width !== this.videoWidth
    ) {
      const descriptor = PixelFormatDescriptorsMap[frame.format as AVPixelFormat]

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.generateFragmentSource(frame.format as AVPixelFormat, descriptor)
      this.program = new YUV8Program(this.fragmentSource)
      this.useProgram()

      this.yTexture.setSize(frame.linesize[0], frame.height)
      this.uTexture.setSize(frame.linesize[1], frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH)

      if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
        this.vTexture.setSize(frame.linesize[2], frame.height >>> PixelFormatDescriptorsMap[frame.format as AVPixelFormat].log2ChromaH)
      }

      if (descriptor.nbComponents === 4) {
        this.aTexture.setSize(frame.linesize[3], frame.height)
      }

      this.videoWidth = frame.width
      this.videoHeight = frame.height
      this.textureWidth = frame.linesize[0]
      this.format = frame.format

      this.layout()
    }
  }

  public render(frame: pointer<AVFrame>): void {

    if (this.lost) {
      return
    }

    const descriptor =  PixelFormatDescriptorsMap[frame.format as AVPixelFormat]
    if (!descriptor) {
      return
    }

    this.checkFrame(frame)

    this.yTexture.fill(mapUint8Array(frame.data[0], this.yTexture.width * this.yTexture.height))
    this.uTexture.fill(mapUint8Array(frame.data[1], this.uTexture.width * this.uTexture.height))

    if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
      this.vTexture.fill(mapUint8Array(frame.data[2], this.vTexture.width * this.vTexture.height))
    }
    if (descriptor.nbComponents === 4) {
      this.aTexture.fill(mapUint8Array(frame.data[3], this.aTexture.width * this.aTexture.height))
    }

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
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
