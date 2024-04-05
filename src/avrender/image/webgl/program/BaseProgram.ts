/*
 * libmedia BaseProgram
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

import Program from './Program'
import VertexShader from '../shader/VertexShader'
import FragmentShader from '../shader/FragmentShader'
export default class BaseProgram extends Program {

  protected enableColor: boolean

  protected aPoint: number

  protected aColor: number

  constructor(
    vertexShader: VertexShader,
    fragmentShader: FragmentShader,
    enableColor: boolean = true
  ) {
    super(vertexShader, fragmentShader)
    this.enableColor = enableColor
  }

  link(gl: WebGLRenderingContext) {
    super.link(gl)
    this.aPoint = this.gl.getAttribLocation(this.program, 'point')
    this.aColor = this.gl.getAttribLocation(this.program, 'color')
    if (this.enableColor) {
      this.gl.enableVertexAttribArray(this.aPoint)
      this.gl.enableVertexAttribArray(this.aColor)
    }
    else {
      this.gl.enableVertexAttribArray(this.aPoint)
    }
  }

  bind() {
    super.bind()
    if (this.enableColor) {
      this.gl.vertexAttribPointer(this.aPoint, 3, this.gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0)
      this.gl.vertexAttribPointer(
        this.aColor,
        4,
        this.gl.FLOAT,
        false,
        7 * Float32Array.BYTES_PER_ELEMENT,
        3 * Float32Array.BYTES_PER_ELEMENT
      )
    }
    else {
      this.gl.vertexAttribPointer(this.aPoint, 3, this.gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0)
    }
  }
}
