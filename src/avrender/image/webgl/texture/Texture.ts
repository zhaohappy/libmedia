/*
 * libmedia Texture
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

export default abstract class Texture {

  protected readonly gl: WebGLRenderingContext | WebGL2RenderingContext

  public width: number

  public height: number

  protected texture: WebGLTexture

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, width?: number, height?: number) {
    this.gl = gl
    this.width = width
    this.height = height
    this.texture = this.gl.createTexture()
  }

  getTexture() {
    return this.texture
  }

  bind(unit?: number) {
    if (is.number(unit)) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
  }

  setSize(width: number, height: number) {
    this.width = width
    this.height = height
  }

  /**
   * 设置对齐字节数
   */
  setUnpackAlignment() {
    if (this.width % 8 === 0) {
      this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 8)
    }
    else if (this.width % 4 === 0) {
      this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 4)
    }
    else if (this.width % 2 === 0) {
      this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 2)
    }
    else {
      this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
    }
  }

  destroy() {
    if (this.texture) {
      this.gl.deleteTexture(this.texture)
      this.texture = null
    }
  }

  abstract init(): void
}
