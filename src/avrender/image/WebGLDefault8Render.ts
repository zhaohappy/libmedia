/*
 * libmedia WebGLDefault8Render
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
import { AVPixelFormatDescriptor, getAVPixelFormatDescriptor, AVPixelFormatFlags } from 'avutil/pixelFormatDescriptor'
import WebGLDefaultRender from './WebGLDefaultRender'
import VideoProgram8 from './webgl/program/VideoProgram8'
import generateSteps from './colorTransform/generateSteps'
import { GLType } from './colorTransform/options'
import ColorSpace from './colorSpace/ColorSpace'
import isPointer from 'cheap/std/function/isPointer'

export default class WebGLDefault8Render extends WebGLDefaultRender {
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: WebGLRenderOptions) {
    super(canvas, options)
  }

  public async init(): Promise<void> {
    await super.init()
  }

  private generateFragmentSource(descriptor: AVPixelFormatDescriptor) {

    const steps = generateSteps(this.srcColorSpace, this.dstColorSpace, {
      bitDepth: 8,
      type: GLType.kWebGL,
      outputRGB: true
    })

    const isUVPlane = (descriptor.flags & AVPixelFormatFlags.PLANER)
      && descriptor.comp.length > 2
      && descriptor.comp[1].plane === descriptor.comp[2].plane

    const textureMap = ['y', 'u', 'v', 'a']
    const channelMap = isUVPlane ? ['r', 'a'] : ['r', 'g', 'b', 'a']

    let y = `texture2D(${textureMap[descriptor.comp[0].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[0].offset]}`
    let u = descriptor.comp[1]
      ? `texture2D(${textureMap[descriptor.comp[1].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[1].offset]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )
    let v = descriptor.comp[2]
      ? `texture2D(${textureMap[descriptor.comp[2].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[2].offset]}`
      : ((descriptor.flags & AVPixelFormatFlags.RGB)
        ? '0.0'
        : '0.5'
      )

    let alpha = '1.0'
    if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
      alpha = `texture2D(${textureMap[descriptor.comp[descriptor.comp.length - 1].plane]}_Sampler, v_color.xy).${channelMap[descriptor.comp[descriptor.comp.length - 1].offset]}`
      if (descriptor.comp.length === 2) {
        u = ((descriptor.flags & AVPixelFormatFlags.RGB)
          ? '0.0'
          : '0.5'
        )
      }
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
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)

      this.srcColorSpace = new ColorSpace(
        frame.colorSpace,
        frame.colorPrimaries,
        frame.colorTrc,
        frame.colorRange
      )

      this.generateFragmentSource(descriptor)
      this.program = new VideoProgram8(this.fragmentSource)
      this.useProgram()

      if (descriptor.flags & AVPixelFormatFlags.PLANER) {
        let plane = 0
        this.yTexture.setSize(frame.linesize[plane++], frame.height)
        if (descriptor.comp.length > 2) {
          const isUVPlane = descriptor.comp[1].plane === descriptor.comp[2].plane
          this.uTexture.setSize(frame.linesize[plane++] >>> (isUVPlane ? 1 : 0), frame.height >>> descriptor.log2ChromaH)
          if (!isUVPlane) {
            this.vTexture.setSize(frame.linesize[plane++], frame.height >>> descriptor.log2ChromaH)
          }
          if (isUVPlane) {
            this.uTexture.setFormat(this.gl.LUMINANCE_ALPHA)
            this.uTexture.setInternalformat(this.gl.LUMINANCE_ALPHA)
          }
        }
        if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
          this.aTexture.setSize(frame.linesize[plane++], frame.height)
        }
        this.textureWidth = frame.linesize[0]
      }
      else {
        const bytes = (descriptor.comp[0].depth + 7) >>> 3
        let planeCount = descriptor.comp[0].step / bytes
        const formatMap = [0, this.gl.LUMINANCE, this.gl.LUMINANCE_ALPHA, this.gl.RGB, this.gl.RGBA]
        this.yTexture.setFormat(formatMap[planeCount])
        this.yTexture.setInternalformat(formatMap[planeCount])
        this.yTexture.setSize(frame.linesize[0] / planeCount, frame.height)
        this.textureWidth = frame.linesize[0] / planeCount
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
    this.yTexture.fill(mapUint8Array(frame.data[plane], frame.linesize[plane++] * this.yTexture.height))
    if (descriptor.flags & AVPixelFormatFlags.PLANER) {
      if (descriptor.comp.length > 2) {
        this.uTexture.fill(mapUint8Array(frame.data[plane], frame.linesize[plane++] * this.uTexture.height))
        if (descriptor.comp[1].plane !== descriptor.comp[2].plane) {
          this.vTexture.fill(mapUint8Array(frame.data[plane], frame.linesize[plane++] * this.vTexture.height))
        }
      }
      if (descriptor.flags & AVPixelFormatFlags.ALPHA) {
        this.aTexture.fill(mapUint8Array(frame.data[plane], frame.linesize[plane] * this.aTexture.height))
      }
    }

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  static isSupport(frame: pointer<AVFrame> | VideoFrame | ImageBitmap): boolean {
    if (isPointer(frame)) {
      const descriptor = getAVPixelFormatDescriptor(frame.format as AVPixelFormat)
      if (descriptor) {
        return ((descriptor.comp[0].depth + 7) >>> 3) === 1
      }
    }
    return false
  }
}
