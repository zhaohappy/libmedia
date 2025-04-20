/*
 * libmedia av1 util
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

import AVStream from '../AVStream'
import { AVPacketSideDataType } from '../codec'
import BitReader from 'common/io/BitReader'
import * as av1syntax from '../util/av1syntax'
import { Uint8ArrayInterface } from 'common/io/interface'
import AVCodecParameters from '../struct/avcodecparameters'
import BitWriter from 'common/io/BitWriter'
import { getAVPixelFormatDescriptor } from '../pixelFormatDescriptor'
import { AVPixelFormat } from '../pixfmt'

export const enum AV1Profile {
  Main,
  High,
  Professional
}

export const enum OBUType {
  Reserved,
  SEQUENCE_HEADER,
  TEMPORAL_DELIMITER,
  FRAME_HEADER,
  TILE_GROUP,
  METADATA,
  FRAME,
  REDUNDANT_FRAME_HEADER,
  TILE_LIST,
  PADDING = 15
}

export const AV1Profile2Name: Record<AV1Profile, string> = {
  [AV1Profile.Main]: 'Main',
  [AV1Profile.High]: 'High',
  [AV1Profile.Professional]: 'Professional'
}

export const LevelCapabilities = [
  { level: 20, maxResolution: 2048 * 1152 },
  { level: 21, maxResolution: 2816 * 1584 },
  { level: 30, maxResolution: 4352 * 2448 },
  { level: 31, maxResolution: 5504 * 3096 },
  { level: 40, maxResolution: 6144 * 3456 },
  { level: 41, maxResolution: 6144 * 3456 },
  { level: 50, maxResolution: 8192 * 4352 },
  { level: 51, maxResolution: 8192 * 4352 },
  { level: 52, maxResolution: 8192 * 4352 },
  { level: 53, maxResolution: 8192 * 4352 },
  { level: 60, maxResolution: 16384 * 8704 },
  { level: 61, maxResolution: 16384 * 8704 },
  { level: 62, maxResolution: 16384 * 8704 },
  { level: 63, maxResolution: 16384 * 8704 }
]

export const AV1LevelIdx = [20, 21, 22, 23, 30, 31, 32, 33, 40, 41, 42, 43, 50, 51, 52, 53, 60, 61, 62, 63, 70, 71, 72, 73]

export function getLevelByResolution(width: number, height: number, fps: number) {
  const resolution = width * height
  for (const level of LevelCapabilities) {
    if (resolution <= level.maxResolution) {
      return level.level
    }
  }
}

export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length >= 4) {
    const params = parseExtraData(extradata)

    stream.codecpar.profile = params.profile
    stream.codecpar.level = params.level
  }
}

/**
 * - 1 bit marker
 * - 7 bit version
 * - 3 bit profile
 * - 5 bit level
 * - 1 bit tier
 * - 1 bit bitdepth > 8
 * - 1 bit bitdepth == 12
 * - 1 bit monochrome
 * - 1 bit chroma_subsampling_x
 * - 1 bit chroma_subsampling_y
 * - 2 bit chroma_sample_position
 * - 8 bit padding
 * 
 * @param header 
 */
export function parseExtraData(extradata: Uint8ArrayInterface) {
  const bitReader = new BitReader(extradata.length)
  bitReader.appendBuffer(extradata)
  // marker
  bitReader.readU1()
  // version
  bitReader.readU(7)

  const profile = bitReader.readU(3)
  const level = bitReader.readU(5)
  const tier = bitReader.readU1()
  let bitDepth = bitReader.readU1() ? 10 : 8
  if (bitReader.readU1()) {
    bitDepth = 12
  }
  const monochrome = bitReader.readU1()
  const chromaSubsamplingX = bitReader.readU1()
  const chromaSubsamplingY = bitReader.readU1()
  const chromaSamplePosition = bitReader.readU(2)

  return {
    profile,
    level,
    tier,
    bitDepth,
    monochrome,
    chromaSubsamplingX,
    chromaSubsamplingY,
    chromaSamplePosition
  }
}

/* eslint-disable camelcase */
export function parseSequenceHeader(header: Uint8ArrayInterface) {
  const bitReader = new BitReader(header.length)
  bitReader.appendBuffer(header)

  bitReader.readU1()
  bitReader.readU(4)
  const extensionFlag = bitReader.readU1()
  const hasSizeFlag = bitReader.readU1()
  // obu_reserved_1bit
  bitReader.readU1()
  if (extensionFlag) {
    bitReader.readU(8)
  }
  if (hasSizeFlag) {
    av1syntax.leb128(bitReader)
  }

  const seq_profile =	av1syntax.f(bitReader, 3)
  const still_picture =	av1syntax.f(bitReader, 1)
  const reduced_still_picture_header = av1syntax.f(bitReader, 1)

  let timing_info_present_flag = 0
  let decoder_model_info_present_flag = 0
  let initial_display_delay_present_flag = 0
  let operating_points_cnt_minus_1 = 0
  let operating_point_idc: number[] = [0]
  let seq_level_idx: number[] = [0]
  let seq_tier: number[] = [0]
  let decoder_model_present_for_this_op: number[] = [0]
  let initial_display_delay_present_for_this_op: number[] = [0]
  let initial_display_delay_minus_1: number[] = [0]
  let buffer_delay_length_minus_1 = 0
  let decoder_buffer_delay: number[] = [0]
  let encoder_buffer_delay: number[] = [0]
  let low_delay_mode_flag: number[] = [0]

  if (reduced_still_picture_header) {
    seq_level_idx[0] = av1syntax.f(bitReader, 5)
  }
  else {
    timing_info_present_flag = av1syntax.f(bitReader, 1)
    if (timing_info_present_flag) {

      let num_units_in_display_tick =	av1syntax.f(bitReader, 32)
      let time_scale = av1syntax.f(bitReader, 32)
      let equal_picture_interval = av1syntax.f(bitReader, 1)
      if (equal_picture_interval) {
        let num_ticks_per_picture_minus_1 = av1syntax.uvlc(bitReader)
      }

      let decoder_model_info_present_flag =	av1syntax.f(bitReader, 1)
      if (decoder_model_info_present_flag) {
        buffer_delay_length_minus_1 =	av1syntax.f(bitReader, 5)
        let num_units_in_decoding_tick = av1syntax.f(bitReader, 32)
        let buffer_removal_time_length_minus_1 = av1syntax.f(bitReader, 5)
        let frame_presentation_time_length_minus_1 = av1syntax.f(bitReader, 5)
      }
    }
    else {
      decoder_model_info_present_flag = 0
    }
    let initial_display_delay_present_flag = av1syntax.f(bitReader, 1)
    let operating_points_cnt_minus_1 = av1syntax.f(bitReader, 5)
    for (let i = 0; i <= operating_points_cnt_minus_1; i++ ) {
      operating_point_idc[i] = av1syntax.f(bitReader, 12)
      seq_level_idx[i] = av1syntax.f(bitReader, 5)
      if (seq_level_idx[i] > 7) {
        seq_tier[i] = av1syntax.f(bitReader, 1)
      }
      else {
        seq_tier[i] = 0
      }
      if (decoder_model_info_present_flag) {
        decoder_model_present_for_this_op[i] = av1syntax.f(bitReader, 1)
        if (decoder_model_present_for_this_op[i]) {
          let n = buffer_delay_length_minus_1 + 1
          decoder_buffer_delay[i] =	av1syntax.f(bitReader, n)
          encoder_buffer_delay[i] =	av1syntax.f(bitReader, n)
          low_delay_mode_flag[i] = av1syntax.f(bitReader, 1)
        }
      }
      else {
        decoder_model_present_for_this_op[i] = 0
      }
      if (initial_display_delay_present_flag) {
        initial_display_delay_present_for_this_op[i] = av1syntax.f(bitReader, 1)
        if ( initial_display_delay_present_for_this_op[i] ) {
          initial_display_delay_minus_1[i] = av1syntax.f(bitReader, 4)
        }
      }
    }
  }
  let frame_width_bits_minus_1 = av1syntax.f(bitReader, 4)
  let frame_height_bits_minus_1 =	av1syntax.f(bitReader, 4)
  let n = frame_width_bits_minus_1 + 1
  let max_frame_width_minus_1 =	av1syntax.f(bitReader, n)
  n = frame_height_bits_minus_1 + 1
  let max_frame_height_minus_1 = av1syntax.f(bitReader, n)
  let frame_id_numbers_present_flag = 0
  let delta_frame_id_length_minus_2 = 0
  let additional_frame_id_length_minus_1 = 0
  if (reduced_still_picture_header ) {
    frame_id_numbers_present_flag = 0
  }
  else {
    frame_id_numbers_present_flag =	av1syntax.f(bitReader, 1)
  }
  if ( frame_id_numbers_present_flag ) {
    delta_frame_id_length_minus_2 =	av1syntax.f(bitReader, 4)
    additional_frame_id_length_minus_1 = av1syntax.f(bitReader, 3)
  }
  let use_128x128_superblock = av1syntax.f(bitReader, 1)
  let enable_filter_intra =	av1syntax.f(bitReader, 1)
  let enable_intra_edge_filter = av1syntax.f(bitReader, 1)
  let enable_interintra_compound = 0
  let enable_masked_compound = 0
  let enable_warped_motion = 0
  let enable_dual_filter = 0
  let enable_order_hint = 0
  let enable_jnt_comp = 0
  let enable_ref_frame_mvs = 0
  let seq_force_screen_content_tools = 2
  let seq_force_integer_mv = 2
  let OrderHintBits = 0
  if (!reduced_still_picture_header) {
    let enable_interintra_compound = av1syntax.f(bitReader, 1)
    enable_masked_compound = av1syntax.f(bitReader, 1)
    enable_warped_motion = av1syntax.f(bitReader, 1)
    enable_dual_filter = av1syntax.f(bitReader, 1)
    enable_order_hint = av1syntax.f(bitReader, 1)
    if (enable_order_hint) {
      enable_jnt_comp = av1syntax.f(bitReader, 1)
      enable_ref_frame_mvs = av1syntax.f(bitReader, 1)
    }
    else {
      enable_jnt_comp = 0
      enable_ref_frame_mvs = 0
    }
    let seq_choose_screen_content_tools =	av1syntax.f(bitReader, 1)
    if (seq_choose_screen_content_tools) {
      seq_force_screen_content_tools = 2
    }
    else {
      seq_force_screen_content_tools = av1syntax.f(bitReader, 1)
    }

    if (seq_force_screen_content_tools > 0) {
      let seq_choose_integer_mv =	av1syntax.f(bitReader, 1)
      if (seq_choose_integer_mv) {
        seq_force_integer_mv = 2
      }
      else {
        seq_force_integer_mv = av1syntax.f(bitReader, 1)
      }
    }
    else {
      seq_force_integer_mv = 2
    }
    if (enable_order_hint) {
      const order_hint_bits_minus_1 =	av1syntax.f(bitReader, 3)
      OrderHintBits = order_hint_bits_minus_1 + 1
    }
    else {
      OrderHintBits = 0
    }
  }
  let enable_superres =	av1syntax.f(bitReader, 1)
  let enable_cdef =	av1syntax.f(bitReader, 1)
  let enable_restoration = av1syntax.f(bitReader, 1)

  let high_bitdepth =	av1syntax.f(bitReader, 1)
  let twelve_bit = 0
  let bit_depth = 0
  let mono_chrome = 0
  if (seq_profile == 2 && high_bitdepth ) {
    twelve_bit = av1syntax.f(bitReader, 1)
    bit_depth = twelve_bit ? 12 : 10
  }
  else if (seq_profile <= 2) {
    bit_depth = high_bitdepth ? 10 : 8
  }
  if ( seq_profile == 1 ) {
    mono_chrome = 0
  }
  else {
    mono_chrome = av1syntax.f(bitReader, 1)
  }
  const color_description_present_flag = av1syntax.f(bitReader, 1)
  let color_primaries = 0
  let transfer_characteristics = 0
  let matrix_coefficients = 0
  if (color_description_present_flag ) {
    color_primaries =	av1syntax.f(bitReader, 8)
    transfer_characteristics = av1syntax.f(bitReader, 8)
    matrix_coefficients = av1syntax.f(bitReader, 8)
  }
  else {
    color_primaries = 2
    transfer_characteristics = 2
    matrix_coefficients = 2
  }
  let color_range = 0
  let subsampling_x = 0
  let subsampling_y = 0
  let chroma_sample_position = 0
  let separate_uv_delta_q = 0
  if (mono_chrome) {
    color_range =	av1syntax.f(bitReader, 1)
    subsampling_x = 1
    subsampling_y = 1
    chroma_sample_position = 0
    separate_uv_delta_q = 0
  }
  else if (color_primaries == 1
    && transfer_characteristics == 13
    && matrix_coefficients == 0
  ) {
    color_range = 1
    subsampling_x = 0
    subsampling_y = 0
    separate_uv_delta_q = av1syntax.f(bitReader, 1)
  }
  else {
    color_range =	av1syntax.f(bitReader, 1)
    if (seq_profile == 0) {
      subsampling_x = 1
      subsampling_y = 1
    }
    else if ( seq_profile == 1 ) {
      subsampling_x = 0
      subsampling_y = 0
    }
    else {
      if (bit_depth == 12) {
        subsampling_x	= av1syntax.f(bitReader, 1)
        if (subsampling_x) {
          subsampling_y =	av1syntax.f(bitReader, 1)
        }
        else {
          subsampling_y = 0
        }
      }
      else {
        subsampling_x = 1
        subsampling_y = 0
      }
    }
    if (subsampling_x && subsampling_y) {
      chroma_sample_position = av1syntax.f(bitReader, 2)
    }
    separate_uv_delta_q = av1syntax.f(bitReader, 1)
  }

  let film_grain_params_present	= av1syntax.f(bitReader, 1)

  return {
    width: max_frame_width_minus_1 + 1,
    height: max_frame_height_minus_1 + 1,
    profile: seq_profile,
    level: AV1LevelIdx[seq_level_idx[0]],
    tier: seq_tier[0],
    bitDepth: bit_depth,
    monoChrome: mono_chrome,
    colorRange: color_range,
    colorPrimaries: color_primaries,
    transferCharacteristics: transfer_characteristics,
    matrixCoefficients: matrix_coefficients,
    subsamplingX: subsampling_x,
    subsamplingY: subsampling_y,
    chromaSamplePosition: chroma_sample_position
  }
}

export function splitOBU(buffer: Uint8ArrayInterface) {
  const bitReader = new BitReader()

  bitReader.appendBuffer(buffer)

  const list: Uint8ArrayInterface[] = []

  while (bitReader.remainingLength()) {
    const now = bitReader.getPointer()
    // obu_forbidden_bit
    bitReader.readU1()
    const type = bitReader.readU(4)
    const extensionFlag = bitReader.readU1()
    const hasSizeFlag = bitReader.readU1()
    // obu_reserved_1bit
    bitReader.readU1()

    if (extensionFlag) {
      bitReader.readU(8)
    }

    const size = hasSizeFlag ? av1syntax.leb128(bitReader) : buffer.length - 1 - extensionFlag

    const headerSize = bitReader.getPointer() - now

    list.push(buffer.subarray(now, now + headerSize + size))

    bitReader.skip(size * 8)
  }

  return list
}

export function generateExtradata(codecpar: pointer<AVCodecParameters>, buffer: Uint8ArrayInterface) {
  const bitWriter = new BitWriter(4)
  // marker
  bitWriter.writeU1(1)
  // version
  bitWriter.writeU(7, 1)

  const header = splitOBU(buffer).find((buffer) => {
    return ((buffer[0] >>> 3) & 0x0f) === OBUType.SEQUENCE_HEADER
  })

  if (header) {
    const params = parseSequenceHeader(header)
    bitWriter.writeU(3, params.profile)
    bitWriter.writeU(5, params.level)
    bitWriter.writeU(1, params.tier)
    bitWriter.writeU(1, params.bitDepth > 8 ? 1 : 0)
    bitWriter.writeU(1, params.bitDepth === 12 ? 1 : 0)
    bitWriter.writeU(1, params.monoChrome)
    bitWriter.writeU(1, params.subsamplingX)
    bitWriter.writeU(1, params.subsamplingY)
    bitWriter.writeU(1, params.chromaSamplePosition)
  }
  else {
    const desc = getAVPixelFormatDescriptor(codecpar.format as AVPixelFormat)
    bitWriter.writeU(3, codecpar.profile)
    bitWriter.writeU(5, codecpar.level)
    bitWriter.writeU(1, 0)
    bitWriter.writeU(1, desc.comp[0].depth > 8 ? 1 : 0)
    bitWriter.writeU(1, desc.comp[0].depth === 12 ? 1 : 0)
    bitWriter.writeU(1, 0)
    bitWriter.writeU(1, 1)
    bitWriter.writeU(1, 1)
    bitWriter.writeU(1, 0)
  }
  // padding
  bitWriter.writeU(8, 0)
  bitWriter.padding()
  return bitWriter.getBuffer()
}
