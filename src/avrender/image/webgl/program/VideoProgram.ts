/*
 * libmedia VideoProgram
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

import BaseProgram from './BaseProgram'
import VertexShader from '../shader/VertexShader'
import FragmentShader from '../shader/FragmentShader'

import vertexSourceDefault from '../glsl/vertex.vert'

export default abstract class VideoProgram extends BaseProgram {

  private rotateMatrixLocation: WebGLUniformLocation

  private ySamplerLocation: WebGLUniformLocation

  private uSamplerLocation: WebGLUniformLocation

  private vSamplerLocation: WebGLUniformLocation

  private aSamplerLocation: WebGLUniformLocation

  constructor(fragmentSource: string, vertexSource?: string) {
    super(new VertexShader(vertexSource || vertexSourceDefault), new FragmentShader(fragmentSource))
  }

  link(gl: WebGLRenderingContext) {
    super.link(gl)
    this.rotateMatrixLocation = this.gl.getUniformLocation(this.program, 'rotateMatrix')
    this.ySamplerLocation = this.gl.getUniformLocation(this.program, 'y_Sampler')
    this.uSamplerLocation = this.gl.getUniformLocation(this.program, 'u_Sampler')
    this.vSamplerLocation = this.gl.getUniformLocation(this.program, 'v_Sampler')
    this.aSamplerLocation = this.gl.getUniformLocation(this.program, 'a_Sampler')
  }

  setRotateMatrix(matrix: number[]) {
    this.gl.uniformMatrix4fv(this.rotateMatrixLocation, false, new Float32Array(matrix))
  }

  bindYTexture(unit: number = 0) {
    this.gl.uniform1i(this.ySamplerLocation, unit)
  }

  bindUTexture(unit: number = 0) {
    this.gl.uniform1i(this.uSamplerLocation, unit)
  }

  bindVTexture(unit: number = 0) {
    this.gl.uniform1i(this.vSamplerLocation, unit)
  }

  bindATexture(unit: number = 0) {
    this.gl.uniform1i(this.aSamplerLocation, unit)
  }
}
