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

import * as is from 'common/util/is'
import AVFrame from 'avutil/struct/avframe'
import { AVPixelFormat } from 'avutil/pixfmt'
import { mapUint8Array } from 'cheap/std/memory'
import { WebGLRenderOptions } from './WebGLRender'
import { PixelFormatDescriptor, PixelFormatDescriptorsMap, PixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import generateSteps from './colorTransform/generateSteps'
import { GLType } from './colorTransform/options'
import ColorSpace from './colorSpace/ColorSpace'
import WebGLRGBRender from './WebGLRGBRender'
import RGB8Program from './webgl/program/RGB8Program'

export default class WebGLRGB8Render extends WebGLRGBRender {

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)
  }

  private generateFragmentSource(format: AVPixelFormat, descriptor: PixelFormatDescriptor) {

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, {
      bitDepth: 8,
      type: GLType.kWebGL,
      outputRGB: true
    })

    const map = ['r', 'g', 'b', 'a']

    let r = `texture2D(rgb_Sampler, v_color.xy).${map[descriptor.comp[0].offset]}`
    let g = `texture2D(rgb_Sampler, v_color.xy).${map[descriptor.comp[1].offset]}`
    let b = `texture2D(rgb_Sampler, v_color.xy).${map[descriptor.comp[2].offset]}`
    let alpha = '1.0'

    if ((descriptor.flags & PixelFormatFlags.ALPHA) && descriptor.nbComponents === 4) {
      alpha = `texture2D(rgb_Sampler, v_color.xy).${map[descriptor.comp[3].offset]}`
    }

    this.fragmentSource = `
      precision highp float;
      varying vec4 v_color;
      uniform sampler2D rgb_Sampler;
      void main () {
        float r = ${r};
        float g = ${g};
        float b = ${b};
        float alpha = ${alpha};
        vec4 color = vec4(r, g, b, alpha);
        ${steps.reduce((pre, current) => pre + current, '')}
        gl_FragColor = color;
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

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.generateFragmentSource(frame.format as AVPixelFormat, descriptor)
      this.program = new RGB8Program(this.fragmentSource)
      this.useProgram()

      if (descriptor.nbComponents === 4) {
        this.rgbTexture.setFormat(this.gl.RGBA)
        this.rgbTexture.setInternalformat(this.gl.RGBA)
      }

      this.rgbTexture.setSize(frame.linesize[0], frame.height)

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

    this.checkFrame(frame)

    this.rgbTexture.fill(mapUint8Array(frame.data[0], this.rgbTexture.width * this.rgbTexture.height))

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    if (is.number(frame)) {
      const info = PixelFormatDescriptorsMap[frame.format as AVPixelFormat]
      if (info) {
        return (info.flags & PixelFormatFlags.RGB) && ((info.comp[0].depth + 7) >>> 3) === 1
      }
    }
    return false
  }
}
