/*
 * libmedia generate video codec string
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

import { AVCodecID } from 'avutil/codec'
import { CodecId2String } from '../codec/codec'
import { H264Profile } from 'avformat/codecs/h264'
import * as av1 from 'avformat/codecs/av1'
import * as vp8 from 'avformat/codecs/vp8'
import * as vp9 from 'avformat/codecs/vp9'
import * as string from 'common/util/string'
import { NOPTS_VALUE } from 'avutil/constant'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { mapUint8Array } from 'cheap/std/memory'

export default function getVideoCodec(codecpar: pointer<AVCodecParameters>, extradata?: Uint8Array) {
  const codecId = codecpar.codecId
  let profile = codecpar.profile
  let level = codecpar.level
  if (!extradata && codecpar.extradata !== nullptr) {
    extradata = mapUint8Array(codecpar.extradata, codecpar.extradataSize)
  }
  
  let entry = CodecId2String[codecId]
  let code = ''

  if (codecId === AVCodecID.AV_CODEC_ID_H264) {
    /*
     * avc1.profile_idc.constraint_set.level_idc
     * 每个参数 1 个字节压缩成 16 进制
     * url: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter#iso_base_media_file_format_mp4_quicktime_and_3gp
     */

    // High 10 Profile 会提示不支持，但是能解码出来
    if (profile === H264Profile.kHigh10) {
      profile = H264Profile.kHigh
    }
    code = string.format(
      '%s.%02x%02x%02x',
      entry,
      profile & 0xff,
      extradata ? extradata[2] : 0,
      level & 0xff
    )
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_HEVC) {
    /**
     * 
     * hev1.[general_profile_space?general_profile_idc].[general_profile_compatibility_flags( 十六进制）][general_tier_flag general_level_idc][constraint_flags( 十六进制）]
     * general_profile_space:
     *  A -> 1
     *  B -> 2
     *  C -> 3
     * empty -> 0
     * 
     * general_tier_flag:
     *  L -> 0
     *  H -> 1
     * 
     */

    let generalProfileSpace = 0
    let generalProfileCompatibilityFlags = 0
    let generalTierFlag = 0
    let constraintFlags = 0

    if (extradata?.length > 13) {
      generalProfileSpace = (extradata[1] >>> 6) & 0x03
      generalTierFlag = (extradata[1] >>> 5) & 0x01
      generalProfileCompatibilityFlags = extradata[2] | (extradata[3] << 8) | (extradata[4] << 16) | (extradata[5] << 24)
      // constraintFlags 目前只能使用 4 个 bit
      constraintFlags = extradata[6] & 0xf0
    }

    const generalProfileSpaceMap = {
      0: '',
      1: 'A',
      2: 'B',
      3: 'C'
    }

    code = string.format(
      '%s.%s%d.%x.%s%d.%x',
      entry,
      generalProfileSpaceMap[generalProfileSpace],
      profile,
      generalProfileCompatibilityFlags,
      generalTierFlag === 0 ? 'L' : 'H',
      level,
      constraintFlags
    )
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_AV1) {
    /*
     * av01.profile.level+seqTier.bitDepth[.monochrome[.chromaSubsampling[.colorPrimaries[.colorPrimaries[.matrixCoefficients]]]]]
     * url: https://aomediacodec.github.io/av1-isobmff/#codecsparam
     * url: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter#av1
     */

    if (extradata) {
      const params = av1.parseExtraData(extradata)
      code = string.format(
        '%s.%d.%02d%s.%02d.%d.%d%d%d',
        entry,
        params.profile,
        params.level,
        params.tier ? 'H' : 'M',
        params.bitDepth,
        params.monochrome,
        params.chromaSubsamplingX,
        params.chromaSubsamplingY,
        params.chromaSamplePosition
      )
    }
    else {
      code = string.format('%s.%d.%02dM.08', entry, profile, level)
    }
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_VP8) {
    /*
     * url: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter#videowebmcodecsvp08.00.41.08vorbis
     */
    if (extradata) {
      const params = vp8.parseExtraData(extradata)
      code = string.format(
        '%s.%02d.%02d.%02d',
        entry,
        params.profile,
        params.level,
        params.bitDepth
      )
    }
    else if (profile !== NOPTS_VALUE && level !== NOPTS_VALUE) {
      code = string.format('%s.%02d.%02d.08', entry, profile, level)
    }
    else {
      code = entry
    }
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_VP9) {
    /*
     * vp09.profile.level.colorDepth.chromaSubsampling[.colorPrimaries[.transferCharacteristics[.matrixCoefficients[.blackLevel and color range]]]]
     * url: https://www.webmproject.org/vp9/mp4/#CodecsParameterString
     * url: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter#webm
     */
    if (extradata) {
      const params = vp9.parseExtraData(extradata)
      code = string.format(
        '%s.%02d.%02d.%02d.%02d.%02d.%02d.%02d.%02d',
        entry,
        params.profile,
        params.level,
        params.bitDepth,
        params.chromaSubsampling,
        params.colorPrimaries,
        params.colorTrc,
        params.colorSpace,
        params.fullRangeFlag
      )
    }
    else if (profile !== NOPTS_VALUE && level !== NOPTS_VALUE) {
      code = string.format('%s.%02d.%02d.08.00', entry, profile, level)
    }
    else {
      code = string.format('%s.%02d.%02d.08.00', entry, 0, 40)
    }
  }
  else {
    code = entry || 'unknown'
  }

  return code
}
