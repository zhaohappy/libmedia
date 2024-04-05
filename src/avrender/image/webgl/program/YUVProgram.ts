/*
 * libmedia YUVProgram
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

import VideoProgram from './VideoProgram'

export default abstract class YUVProgram extends VideoProgram {

  private ySamplerLocation: WebGLUniformLocation

  private uSamplerLocation: WebGLUniformLocation

  private vSamplerLocation: WebGLUniformLocation

  constructor(yuvFragmentSource: string) {
    super(yuvFragmentSource)
  }

  link(gl: WebGLRenderingContext) {
    super.link(gl)
    this.ySamplerLocation = this.gl.getUniformLocation(this.program, 'y_Sampler')
    this.uSamplerLocation = this.gl.getUniformLocation(this.program, 'u_Sampler')
    this.vSamplerLocation = this.gl.getUniformLocation(this.program, 'v_Sampler')
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
}
