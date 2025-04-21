/*
 * libmedia generate fragment steps
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

/**
 * 参考 chromium 源码
 * 目前 canvas 还未支持 HDR，只能进行 Tone Mapping
 * 有一个新的提案让 canvas 支持 HDR，https://w3c.github.io/ColorWeb-CG/
 * 将来可以直接使用 webgl/webgpu 渲染 HDR 视频
 */

import { AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic } from 'avutil/pixfmt'
import ColorSpace from '../colorSpace/ColorSpace'
import { ColorTransformOptions, DefaultSDRWhiteLevel, HLGRefMaxLumNits, PQRefMaxLumNits } from './options'
import colorTransformMatrix from './colorTransformMatrix'
import hlgInvOETF from './transferFn/hlgInvOETF'
import pq2Linear from './transferFn/pq2Linear'
import transferFn from './transferFn/transferFn'
import toLinear from './transferFn/toLinear'
import colorTransformHLGOOTF, { computeHLGToneMapConstants } from './colorTransformHLGOOTF'
import colorTransformSrcNitsToSdrRelative, { computeNitsToSdrRelativeFactor } from './colorTransformSrcNitsToSdrRelative'
import colorTransformToneMapInRec2020Linear, { computeTonemapAB } from './colorTransformToneMapInRec2020Linear'
import colorTransformSdrToDstNitsRelative, { computeSdrRelativeToNitsFactor } from './colorTransformSdrToDstNitsRelative'
import hlgOETF from './transferFn/hlgOETF'
import pqFromLinear from './transferFn/pqFromLinear'
import fromLinear from './transferFn/fromLinear'

export default function generateSteps(src: ColorSpace, dst: ColorSpace, options: ColorTransformOptions) {
  const steps: string[] = []

  const srcMatrixIsIdentityOrYcgco = src.getMatrixId() === AVColorSpace.AVCOL_SPC_YCOCG

  // 1. limited range 转 full range
  const srcRangeAdjustStep = colorTransformMatrix(src.getRangeAdjustMatrix(options.bitDepth), options)

  if (!srcMatrixIsIdentityOrYcgco) {
    steps.push(srcRangeAdjustStep)
  }

  // 2. 反变换 ColorSpace Matrix，YCbCr 转 RGB
  steps.push(colorTransformMatrix(src.getTransformMatrix(options.bitDepth).invert(), options))

  if (srcMatrixIsIdentityOrYcgco) {
    steps.push(srcRangeAdjustStep)
  }

  if (dst.isValid()) {
    if (defined(ENABLE_RENDER_16) && src.isHDR()) {
      switch (src.getTransferId()) {
        // 3. 如果是 HLG 视频，应用 HLG 反向 OETF
        case AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67:
          steps.push(hlgInvOETF(options))
          break
          // 3. 如果是 PQ 视频，将 PQ 曲线转线性曲线。
        case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084:
          steps.push(pq2Linear(options))
          break
        default:
          const fn = src.getTransferFunction()
          if (fn) {
            steps.push(transferFn(fn, src.hasExtendedSkTransferFn(), options))
          }
          else {
            steps.push(toLinear(src.getTransferId(), options))
          }
      }

      if (src.getMatrixId() === AVColorSpace.AVCOL_SPC_BT2020_CL) {
        steps.push(colorTransformMatrix(src.getTransformMatrix(options.bitDepth).invert(), options))
      }

      // 4. RGB 空间转 XYZ 空间
      steps.push(colorTransformMatrix(src.getPrimaryMatrix(), options))

      const rec2020Linear = new ColorSpace(
        AVColorSpace.AVCOL_SPC_RGB,
        AVColorPrimaries.AVCOL_PRI_BT2020,
        AVColorTransferCharacteristic.AVCOL_TRC_LINEAR,
        AVColorRange.AVCOL_RANGE_JPEG
      )

      switch (src.getTransferId()) {
        // HLG
        case AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67:
          // 5. XYZ 转 Rec2020。
          steps.push(colorTransformMatrix(rec2020Linear.getPrimaryMatrix().invert(), options))

          // Apply the reference HLG OOTF.
          computeHLGToneMapConstants(options)
          steps.push(colorTransformHLGOOTF(options))

          // Convert from linear nits-relative space (where 1.0 is 1,000 nits) to
          // SDR-relative space (where 1.0 is SDR white).
          computeNitsToSdrRelativeFactor(HLGRefMaxLumNits, true, options)
          steps.push(colorTransformSrcNitsToSdrRelative(options))

          if (options.toneMapPQAndHlgToDst) {
            // 6. 基于显示器最高亮度 + UI 白点亮度，进行 Tone Mapping
            computeTonemapAB(src, options)
            steps.push(colorTransformToneMapInRec2020Linear(options))
          }

          // 7. Rec2020 转为 XYZ
          steps.push(colorTransformMatrix(rec2020Linear.getPrimaryMatrix(), options))
          break
        case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084:
          computeNitsToSdrRelativeFactor(PQRefMaxLumNits, true, options)
          steps.push(colorTransformSrcNitsToSdrRelative(options))
          if (options.toneMapPQAndHlgToDst) {
            // 5. XYZ 转 Rec2020。
            steps.push(colorTransformMatrix(rec2020Linear.getPrimaryMatrix().invert(), options))

            // 6. 基于显示器最高亮度 + UI 白点亮度，进行 Tone Mapping
            computeTonemapAB(src, options)
            steps.push(colorTransformToneMapInRec2020Linear(options))

            // 7. Rec2020 转为 XYZ
            steps.push(colorTransformMatrix(rec2020Linear.getPrimaryMatrix(), options))
          }
          break
        default:
          break
      }

      // 8. XYZ 转 RGB
      steps.push(colorTransformMatrix(dst.getPrimaryMatrix().invert(), options))

      if (dst.getMatrixId() === AVColorSpace.AVCOL_SPC_BT2020_CL) {
        steps.push(colorTransformMatrix(dst.getTransformMatrix(options.bitDepth), options))
      }

      switch (dst.getTransferId()) {
        // 9. 如果是 HLG 视频，应用 HLG 转 OETF
        case AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67:
          computeSdrRelativeToNitsFactor(DefaultSDRWhiteLevel, options)
          steps.push(colorTransformSdrToDstNitsRelative(options))
          steps.push(hlgOETF(options))
          break
          // 9 如果是 PQ 视频，将线性曲线转 PQ 曲线。
        case AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084:
          computeSdrRelativeToNitsFactor(PQRefMaxLumNits, options)
          steps.push(colorTransformSdrToDstNitsRelative(options))
          steps.push(pqFromLinear(options))
        default:
          const fn = dst.getInverseTransferFunction()
          if (fn) {
            steps.push(transferFn(fn, src.hasExtendedSkTransferFn(), options))
          }
          else {
            steps.push(fromLinear(src.getTransferId(), options))
          }
          break
      }
    }

    /**
     * 下面的步骤是把 RGB 转到目标颜色空间，判断是否需要
     * 片段着色器输出的颜色应该是 RGB 非线性空间？（此处存疑，未找到相关资料，但找到的其他类似项目均未转换为线性空间，显示器会根据输出做相应的电光转换？） 全色域颜色
     * 但如果后续需要处理颜色（如混合、插值），需要将非线性空间转换为线性空间，在线性空间中处理
     */
    if (!options.outputRGB) {
      const dstMatrixIsIdentityOrYcgco = dst.getMatrixId() === AVColorSpace.AVCOL_SPC_YCOCG

      // 10. Range 反变换
      const dstRangeAdjustStep = colorTransformMatrix(dst.getRangeAdjustMatrix(options.bitDepth).invert(), options)

      if (dstMatrixIsIdentityOrYcgco) {
        steps.push(dstRangeAdjustStep)
      }

      steps.push(colorTransformMatrix(dst.getTransformMatrix(options.bitDepth), options))

      if (!dstMatrixIsIdentityOrYcgco) {
        steps.push(dstRangeAdjustStep)
      }
    }
  }
  return steps
}
