/*
 * libmedia VideoProgram16
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

import HdrMetadata from '../../struct/HdrMetadata'
import VideoProgram from './VideoProgram'

export default class VideoProgram16 extends VideoProgram {

  private offsetLocation: WebGLUniformLocation
  private multiplierLocation: WebGLUniformLocation
  private pqTonemapALocation: WebGLUniformLocation
  private pqTonemapBLocation: WebGLUniformLocation
  private hlgOOTFGammaMinusOneLocation: WebGLUniformLocation
  private hlgDstMaxLuminanceRelativeLocation: WebGLUniformLocation
  private nitsToSdrRelativeFactorLocation: WebGLUniformLocation
  private sdrRelativeToNitsFactorLocation: WebGLUniformLocation

  constructor(fragmentSource: string, vertexSource?: string) {
    super(fragmentSource, vertexSource)
  }

  link(gl: WebGLRenderingContext) {
    super.link(gl)
    this.offsetLocation =  this.gl.getUniformLocation(this.program, 'offset')
    this.multiplierLocation =  this.gl.getUniformLocation(this.program, 'multiplier')
    this.pqTonemapALocation =  this.gl.getUniformLocation(this.program, 'pq_tonemap_a')
    this.pqTonemapBLocation =  this.gl.getUniformLocation(this.program, 'pq_tonemap_b')
    this.hlgOOTFGammaMinusOneLocation =  this.gl.getUniformLocation(this.program, 'hlg_ootf_gamma_minus_one')
    this.nitsToSdrRelativeFactorLocation =  this.gl.getUniformLocation(this.program, 'nits_to_sdr_relative_factor')
    this.sdrRelativeToNitsFactorLocation =  this.gl.getUniformLocation(this.program, 'sdr_relative_to_nits_factor')
  }

  setMetaData(data: HdrMetadata) {
    this.gl.uniform1f(this.offsetLocation, data.offset)
    this.gl.uniform1f(this.multiplierLocation, data.multiplier)
    this.gl.uniform1f(this.pqTonemapALocation, data.pqTonemapA)
    this.gl.uniform1f(this.pqTonemapBLocation, data.pqTonemapB)
    this.gl.uniform1f(this.hlgOOTFGammaMinusOneLocation, data.hlgOOTFGammaMinusOne)
    this.gl.uniform1f(this.nitsToSdrRelativeFactorLocation, data.nitsToSdrRelativeFactor)
    this.gl.uniform1f(this.sdrRelativeToNitsFactorLocation, data.sdrRelativeToNitsFactor)
  }
}
