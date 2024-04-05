/*
 * libmedia Program
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


import VertexShader from '../shader/VertexShader'
import FragmentShader from '../shader/FragmentShader'
import * as logger from 'common/util/logger'

export default class Program {

  protected gl: WebGLRenderingContext

  private _program: WebGLProgram

  protected vertexShader: VertexShader

  protected fragmentShader: FragmentShader

  constructor( vertexShader: VertexShader, fragmentShader: FragmentShader) {
    this.vertexShader = vertexShader
    this.fragmentShader = fragmentShader
  }

  link(gl: WebGLRenderingContext) {
    this.gl = gl
    if (this.vertexShader) {
      this.vertexShader.compile(this.gl)
    }
    if (this.fragmentShader) {
      this.fragmentShader.compile(this.gl)
    }
    // 创建程序对象
    this._program = this.gl.createProgram()
    this.gl.attachShader(this._program, this.vertexShader.shader)
    this.gl.attachShader(this._program, this.fragmentShader.shader)
    this.gl.linkProgram(this._program)

    if (process.env.NODE_ENV === 'development') {
      if (!this.gl.getProgramParameter(this._program, this.gl.LINK_STATUS)) {
        logger.fatal(this.gl.getProgramInfoLog(this._program))
      }
    }
  }

  stop() {
    this.vertexShader.stop(this.gl)
    this.fragmentShader.stop(this.gl)
    this.gl.deleteProgram(this._program)
    this.vertexShader = null
    this.fragmentShader = null
    this._program = null
  }

  bind() {
    this.gl.useProgram(this._program)
  }

  get program(): WebGLProgram {
    return this._program
  }
}
