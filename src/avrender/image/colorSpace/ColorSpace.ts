/*
 * libmedia ColorSpace
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

import { AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic } from 'avutil/pixfmt'
import Matrix4 from 'common/math/Matrix4'
import { Vector3 } from 'common/math/Vector3'

import * as transferFns from './transferFns'
import * as primaries from './primaries'

export default class ColorSpace {

  private matrixId: AVColorSpace

  private primaryId: AVColorPrimaries

  private transferId: AVColorTransferCharacteristic

  private rangeId: AVColorRange

  constructor(matrixId: AVColorSpace, primaryId: AVColorPrimaries, transferId: AVColorTransferCharacteristic, rangeId: AVColorRange) {
    this.matrixId = matrixId
    this.primaryId = primaryId
    this.transferId = transferId
    this.rangeId = rangeId
  }

  public getMatrixId() {
    return this.matrixId
  }

  public getPrimaryId() {
    return this.primaryId
  }

  public getTransferId() {
    return this.transferId
  }

  public getRangeId() {
    return this.rangeId
  }

  public isWide() {
    if (this.primaryId === AVColorPrimaries.AVCOL_PRI_BT2020
      || this.primaryId === AVColorPrimaries.AVCOL_PRI_SMPTE431
      || this.primaryId === AVColorPrimaries.AVCOL_PRI_SMPTE432
    ) {
      return true
    }
    return false
  }

  public isHDR() {
    return this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67
      || this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084
  }

  public isToneMappedByDefault() {
    if (
      // HLG
      this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67
      // PQ
      || this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084
    ) {
      return true
    }
    return false
  }

  public isAffectedBySDRWhiteLevel() {
    if (
      // HLG
      this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67
      // PQ
      || this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084
    ) {
      return true
    }
    return false
  }

  public fullRangeEncodedValues() {
    return this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_BT1361_ECG
      || this.transferId === AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_4
  }

  /**
   * yuv -> rgb 转换矩阵
   * 
   * @param bitDepth 
   * @returns 
   */
  public getTransformMatrix(bitDepth: number) {
    const chroma05 = (1 << (bitDepth - 1)) / ((1 << bitDepth) - 1)
    let Kr = 0
    let Kb = 0
    switch (this.matrixId) {
      case AVColorSpace.AVCOL_SPC_RGB:
        return new Matrix4()

      case AVColorSpace.AVCOL_SPC_BT709:
      case AVColorSpace.AVCOL_SPC_UNSPECIFIED:
        Kr = 0.2126
        Kb = 0.0722
        break

      case AVColorSpace.AVCOL_SPC_FCC:
        Kr = 0.30
        Kb = 0.11
        break
      case AVColorSpace.AVCOL_SPC_BT470BG:
      case AVColorSpace.AVCOL_SPC_SMPTE170M:
        Kr = 0.299
        Kb = 0.114
        break

      case AVColorSpace.AVCOL_SPC_SMPTE240M:
        Kr = 0.212
        Kb = 0.087
        break

      case AVColorSpace.AVCOL_SPC_YCOCG: {
        return Matrix4.RowMajor([
          // Y
          0.25,  0.5, 0.25,  0.0,
          // Cg
          -0.25, 0.5, -0.25, chroma05,
          // Co
          0.5,   0.0, -0.5,  chroma05,
          0.0,   0.0, 0.0,   1.0
        ])
      }

      // BT2020_CL is a special case.
      // Basically we return a matrix that transforms RYB values
      // to YUV values. (Note that the green component have been replaced
      // with the luminance.)
      case AVColorSpace.AVCOL_SPC_BT2020_CL: {
        Kr = 0.2627
        Kb = 0.0593
        return Matrix4.RowMajor([
          // R
          1.0, 0.0,           0.0, 0.0,
          // Y
          Kr,  1.0 - Kr - Kb, Kb, 0.0,
          // B
          0.0, 0.0,           1.0, 0.0,
          0.0, 0.0,           0.0, 1.0
        ])
      }

      case AVColorSpace.AVCOL_SPC_BT2020_NCL:
        Kr = 0.2627
        Kb = 0.0593
        break

      case AVColorSpace.AVCOL_SPC_SMPTE2085:
        return Matrix4.RowMajor([
          // Y
          0.0,              1.0,             0.0, 0.0,
          // DX or DZ
          0.0,             -0.5, 0.986566 / 2.0, 0.5,
          // DZ or DX
          0.5, -0.991902 / 2.0,             0.0, 0.5,
          0.0,              0.0,             0.0, 1.0,
        ])
    }

    let Kg = 1.0 - Kr - Kb
    let um = 0.5 / (1.0 - Kb)
    let vm = 0.5 / (1.0 - Kr)

    return Matrix4.RowMajor([
      // Y
      Kr,        Kg,                Kb, 0.0,
      // U
      um * -Kr, um * -Kg, um * (1.0 - Kb), 0.5,
      // V
      vm * (1.0 - Kr), vm * -Kg,         vm * -Kb, 0.5,
      0.0,      0.0,              0.0, 1.0,
    ])
  }

  public getRangeAdjustMatrix(bitDepth: number) {
    switch (this.rangeId) {
      case AVColorRange.AVCOL_RANGE_JPEG:
        return new Matrix4()
      case AVColorRange.AVCOL_RANGE_MPEG:
        break
    }

    // See ITU-T H.273 (2016), Section 8.3. The following is derived from
    // Equations 20-31.
    const shift = bitDepth - 8
    const ay = 219 << shift
    const c = (1 << bitDepth) - 1
    const scaleY = c / ay
    switch (this.matrixId) {
      case AVColorSpace.AVCOL_SPC_RGB:
      case AVColorSpace.AVCOL_SPC_YCOCG:
        return new Matrix4().setScale(new Vector3([scaleY, scaleY, scaleY]))
          .postTranslate(new Vector3([-16.0 / 219.0, -16.0 / 219.0, -16.0 / 219.0]))

      case AVColorSpace.AVCOL_SPC_BT709:
      case AVColorSpace.AVCOL_SPC_FCC:
      case AVColorSpace.AVCOL_SPC_BT470BG:
      case AVColorSpace.AVCOL_SPC_SMPTE170M:
      case AVColorSpace.AVCOL_SPC_SMPTE240M:
      case AVColorSpace.AVCOL_SPC_BT2020_NCL:
      case AVColorSpace.AVCOL_SPC_BT2020_CL:
      case AVColorSpace.AVCOL_SPC_SMPTE2085:
      case AVColorSpace.AVCOL_SPC_UNSPECIFIED: {
        const aUV = 224 << shift
        const scaleUV = c / aUV
        const translateUV = (aUV - c) / (2.0 * aUV)
        return new Matrix4().setScale(new Vector3([scaleY, scaleUV, scaleUV]))
          .postTranslate(new Vector3([-16.0 / 219.0, translateUV, translateUV]))
      }
    }
    return new Matrix4()
  }

  private getTransferFunction_() {
    switch (this.transferId) {
      case AVColorTransferCharacteristic.AVCOL_TRC_LINEAR:
        return transferFns.TransferFnLinear
      case AVColorTransferCharacteristic.AVCOL_TRC_GAMMA22:
        return transferFns.TransferFn470SystemM
      case AVColorTransferCharacteristic.AVCOL_TRC_GAMMA28:
        return transferFns.TransferFn470SystemBG
      case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE240M:
        return transferFns.TransferFnSMPTEST240
      case AVColorTransferCharacteristic.AVCOL_TRC_BT709:
      case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE170M:
      case AVColorTransferCharacteristic.AVCOL_TRC_BT2020_10:
      case AVColorTransferCharacteristic.AVCOL_TRC_BT2020_12:
        return transferFns.TransferFnSRGB
      case AVColorTransferCharacteristic.AVCOL_TRC_SMPTEST428_1:
        return transferFns.TransferFnSMPETST428_1
      case AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67:
      case AVColorTransferCharacteristic.AVCOL_TRC_BT1361_ECG:
      case AVColorTransferCharacteristic.AVCOL_TRC_LOG:
      case AVColorTransferCharacteristic.AVCOL_TRC_LOG_SQRT:
      case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084:
      case AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED:
        return null
    }
  }

  public getTransferFunction(sdrWhiteLevel?: float) {
    switch (this.transferId) {
      default:
        return this.getTransferFunction_()
    }
  }

  public getInverseTransferFunction(sdrWhiteLevel?: float) {
    const fn = this.getTransferFunction(sdrWhiteLevel)
    if (fn) {
      const fnInv = {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        e: 0,
        f: 0,
        g: 0
      }
      if (fn.a > 0 && fn.g > 0) {
        const aToG = Math.pow(fn.a, fn.g)
        fnInv.a = 1.0 / aToG
        fnInv.b = -fn.e / aToG
        fnInv.g = 1.0 / fn.g
      }
      fnInv.d = fn.c * fn.d + fn.f
      fnInv.e = -fn.b / fn.a
      if (fn.c != 0) {
        fnInv.c = 1.0 / fn.c
        fnInv.f = -fn.f / fn.c
      }
      return fnInv
    }
  }

  public hasExtendedSkTransferFn() {
    return this.matrixId === AVColorSpace.AVCOL_SPC_RGB
  }

  public isValid() {
    return this.matrixId !== AVColorSpace.AVCOL_SPC_UNSPECIFIED
      && this.primaryId !== AVColorPrimaries.AVCOL_PRI_UNSPECIFIED
      && this.transferId !== AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED
      && this.rangeId !== AVColorRange.AVCOL_RANGE_UNSPECIFIED
  }

  private getColorSpacePrimaries() {
    const pri = primaries.Invalid
    switch (this.primaryId) {
      case AVColorPrimaries.AVCOL_PRI_BT709:
        return primaries.Rec709
      case AVColorPrimaries.AVCOL_PRI_BT470M:
        return primaries.Rec470SystemM
      case AVColorPrimaries.AVCOL_PRI_BT470BG:
        return primaries.Rec470SystemBG
      case AVColorPrimaries.AVCOL_PRI_SMPTE240M:
        return primaries.SMPTE_ST_240
      case AVColorPrimaries.AVCOL_PRI_FILM:
        return primaries.GenericFilm
      case AVColorPrimaries.AVCOL_PRI_BT2020:
        return primaries.Rec2020
      case AVColorPrimaries.AVCOL_PRI_SMPTEST428_1:
        return primaries.SMPTE_ST_428_1
      case AVColorPrimaries.AVCOL_PRI_SMPTE431:
        return primaries.SMPTE_RP_431_2
      case AVColorPrimaries.AVCOL_PRI_SMPTE432:
        return primaries.SMPTE_EG_432_1
    }

    return pri
  }
  /**
   * rgb -> xyz 转换矩阵
   * 
   * @returns 
   */
  public getPrimaryMatrix() {
    const pri = this.getColorSpacePrimaries()
    const toXYZD50 = primaries.primariesToXYZD50(pri)
    return Matrix4.RowMajor([
      toXYZD50.rc(0, 0), toXYZD50.rc(0, 1), toXYZD50.rc(0, 2), 0,
      toXYZD50.rc(1, 0), toXYZD50.rc(1, 1), toXYZD50.rc(1, 2), 0,
      toXYZD50.rc(2, 0), toXYZD50.rc(2, 1), toXYZD50.rc(2, 2), 0,
      0, 0, 0, 1
    ])
  }
}
