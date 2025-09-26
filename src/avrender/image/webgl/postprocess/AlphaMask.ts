/*
 * libmedia alpha mask postprocess
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

export default class AlphaMask {

  private context: WebGLRenderingContext
  private canvas: OffscreenCanvas
  private rgbCanvas: OffscreenCanvas
  private rgbContext: OffscreenCanvasRenderingContext2D

  private vs: WebGLShader
  private fs: WebGLShader
  private program: WebGLProgram
  private posBuffer: WebGLBuffer
  private texBuffer: WebGLBuffer
  private texture: WebGLTexture

  constructor(width: number, height: number) {

    this.canvas = new OffscreenCanvas(width, height)
    this.context = this.canvas.getContext('webgl')

    this.rgbCanvas = new OffscreenCanvas(width, height)
    this.rgbContext = this.rgbCanvas.getContext('2d')

    this.vs = this.context.createShader(this.context.VERTEX_SHADER)
    this.context.shaderSource(this.vs, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `)
    this.context.compileShader(this.vs)

    this.fs = this.context.createShader(this.context.FRAGMENT_SHADER)
    this.context.shaderSource(this.fs, `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      void main() {
        vec4 rgb = texture2D(u_texture, v_texCoord);
        gl_FragColor = vec4(rgb.rgb, rgb.r);
      }
    `)
    this.context.compileShader(this.fs)

    const program = this.program = this.context.createProgram()
    this.context.attachShader(program, this.vs)
    this.context.attachShader(program, this.fs)
    this.context.linkProgram(program)
    this.context.useProgram(program)

    this.posBuffer = this.context.createBuffer()
    this.context.bindBuffer(this.context.ARRAY_BUFFER, this.posBuffer)
    this.context.bufferData(this.context.ARRAY_BUFFER, new Float32Array([
      -1, 1,
      -1, -1,
      1, 1,
      1, -1
    ]), this.context.STATIC_DRAW)
    const aPosition = this.context.getAttribLocation(program, 'a_position')
    this.context.enableVertexAttribArray(aPosition)
    this.context.vertexAttribPointer(aPosition, 2, this.context.FLOAT, false, 0, 0)

    this.texBuffer = this.context.createBuffer()
    this.context.bindBuffer(this.context.ARRAY_BUFFER, this.texBuffer)
    this.context.bufferData(this.context.ARRAY_BUFFER, new Float32Array([
      0, 0,
      0, 1,
      1, 0,
      1, 1
    ]), this.context.STATIC_DRAW)
    const aTexCoord = this.context.getAttribLocation(program, 'a_texCoord')
    this.context.enableVertexAttribArray(aTexCoord)
    this.context.vertexAttribPointer(aTexCoord, 2, this.context.FLOAT, false, 0, 0)

    this.texture = this.context.createTexture()
    this.context.bindTexture(this.context.TEXTURE_2D, this.texture)
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_S, this.context.CLAMP_TO_EDGE)
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_WRAP_T, this.context.CLAMP_TO_EDGE)
    this.context.texParameteri(this.context.TEXTURE_2D, this.context.TEXTURE_MIN_FILTER, this.context.LINEAR)

    this.context.clearColor(0.0, 0.0, 0.0, 0.0)
    this.context.clearDepth(1.0)
    this.setUnpackAlignment(width)
  }

  setUnpackAlignment(width: number) {
    if (width % 8 === 0) {
      this.context.pixelStorei(this.context.UNPACK_ALIGNMENT, 8)
    }
    else if (width % 4 === 0) {
      this.context.pixelStorei(this.context.UNPACK_ALIGNMENT, 4)
    }
    else if (width % 2 === 0) {
      this.context.pixelStorei(this.context.UNPACK_ALIGNMENT, 2)
    }
    else {
      this.context.pixelStorei(this.context.UNPACK_ALIGNMENT, 1)
    }
  }

  getTarget() {
    return this.canvas
  }

  process(alpha: VideoFrame) {
    this.rgbContext.drawImage(alpha, 0, 0, this.rgbCanvas.width, this.rgbCanvas.height)
    this.context.texImage2D(this.context.TEXTURE_2D, 0, this.context.RGBA, this.context.RGBA, this.context.UNSIGNED_BYTE, this.rgbCanvas)
    this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT)
    this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    this.context.deleteTexture(this.texture)
    this.context.deleteBuffer(this.texBuffer)
    this.context.deleteBuffer(this.posBuffer)
    this.context.deleteProgram(this.program)
    this.context.deleteShader(this.fs)
    this.context.deleteShader(this.vs)
  }
}
