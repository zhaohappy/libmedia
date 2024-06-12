/*
 * libmedia RGBTexture
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

import Texture from './Texture'

export default class RGBTexture extends Texture {

  private filter: number

  private format: number

  private internalformat: number

  private dataType: number

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    width?: number, height?: number
  ) {
    super(gl, width, height)
    this.format = this.gl.RGB
    this.filter = this.gl.LINEAR
    this.internalformat = this.gl.RGB
    this.dataType = this.gl.UNSIGNED_BYTE
  }

  init() {
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.filter)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.filter)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
  }

  setFormat(format: number) {
    this.format = format
  }
  setInternalformat(format: number) {
    this.internalformat = format
  }
  setDataType(type: number) {
    this.dataType = type
  }

  setFilter(filter: number) {
    this.filter = filter
  }

  fill(data: Uint8Array | Uint16Array) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    this.setUnpackAlignment()
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.internalformat, this.width, this.height, 0,
      this.format, this.dataType, data
    )
  }

}
