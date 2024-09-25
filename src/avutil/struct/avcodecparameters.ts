/*
 * libmedia AVCodecParameters defined
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

import { NOPTS_VALUE } from '../constant'
import { AVCodecID, AVMediaType } from '../codec'
import { AVChromaLocation, AVColorPrimaries, AVColorRange, AVColorSpace,
  AVColorTransferCharacteristic, AVFieldOrder, AVPixelFormat
} from '../pixfmt'
import { AVSampleFormat } from '../audiosamplefmt'
import { Rational } from './rational'
import { AVPacketSideData } from './avpacket'
import { AVChannelLayout } from './audiosample'
import { freeCodecParameters } from '../util/codecparameters'
import { symbolStructAddress } from 'cheap/symbol'

/**
 * FFmpeg AVCodecParameters 定义
 */
@struct
export default class AVCodecParameters {
  /**
   * General type of the encoded data.
   */
  codecType: AVMediaType = AVMediaType.AVMEDIA_TYPE_UNKNOWN
  /**
   * Specific type of the encoded data (the codec used).
   */
  codecId: AVCodecID = AVCodecID.AV_CODEC_ID_NONE
  /**
   * Additional information about the codec (corresponds to the AVI FOURCC).
   */
  codecTag: uint32 = 0

  /**
   * Extra binary data needed for initializing the decoder, codec-dependent.
   *
   * Must be allocated with av_malloc() and will be freed by
   * avcodec_parameters_free(). The allocated size of extradata must be at
   * least extradata_size + AV_INPUT_BUFFER_PADDING_SIZE, with the padding
   * bytes zeroed.
   */
  extradata: pointer<uint8> = nullptr
  extradataSize: int32 = 0

  /**
   * Additional data associated with the entire stream.
   *
   * Should be allocated with av_packet_side_data_new() or
   * av_packet_side_data_add(), and will be freed by avcodec_parameters_free().
   */
  codedSideData: pointer<AVPacketSideData> = nullptr

  /**
   * Amount of entries in @ref coded_side_data.
   */
  nbCodedSideData: int32 = 0

  /**
   * - video: the pixel format, the value corresponds to enum AVPixelFormat.
   * - audio: the sample format, the value corresponds to enum AVSampleFormat.
   */
  format: AVPixelFormat | AVSampleFormat = NOPTS_VALUE

  /**
   * The average bitrate of the encoded data (in bits per second).
   */
  bitrate: int64 = 0n

  /**
   * The number of bits per sample in the codedwords.
   *
   * This is basically the bitrate per sample. It is mandatory for a bunch of
   * formats to actually decode them. It's the number of bits for one sample in
   * the actual coded bitstream.
   *
   * This could be for example 4 for ADPCM
   * For PCM formats this matches bits_per_raw_sample
   * Can be 0
   */
  bitsPerCodedSample: int32 = 0
  /**
   * This is the number of valid bits in each output sample. If the
   * sample format has more bits, the least significant bits are additional
   * padding bits, which are always 0. Use right shifts to reduce the sample
   * to its actual size. For example, audio formats with 24 bit samples will
   * have bits_per_raw_sample set to 24, and format set to AV_SAMPLE_FMT_S32.
   * To get the original sample use "(int32_t)sample >> 8"."
   *
   * For ADPCM this might be 12 or 16 or similar
   * Can be 0
   */
  bitsPerRawSample: int32 = 0

  /**
   * Codec-specific bitstream restrictions that the stream conforms to.
   */
  profile: int32 = NOPTS_VALUE
  level: int32 = NOPTS_VALUE

  /**
   * Video only. The dimensions of the video frame in pixels.
   */
  width: int32 = 0
  height: int32 = 0

  /**
   * Video only. The aspect ratio (width / height) which a single pixel
   * should have when displayed.
   *
   * When the aspect ratio is unknown / undefined, the numerator should be
   * set to 0 (the denominator may have any value).
   */
  sampleAspectRatio: Rational = new Rational({den: 1, num: 1})

  /**
   * Video only. Number of frames per second, for streams with constant frame
   * durations. Should be set to { 0, 1 } when some frames have differing
   * durations or if the value is not known.
   *
   * @note This field correponds to values that are stored in codec-level
   * headers and is typically overridden by container/transport-layer
   * timestamps, when available. It should thus be used only as a last resort,
   * when no higher-level timing information is available.
   */
  framerate: Rational = new Rational({den: 1, num: 0})

  /**
   * Video only. The order of the fields in interlaced video.
   */
  fieldOrder: AVFieldOrder = AVFieldOrder.AV_FIELD_UNKNOWN

  /**
   * Video only. Additional colorspace characteristics.
   */
  colorRange: AVColorRange = AVColorRange.AVCOL_RANGE_UNSPECIFIED
  colorPrimaries: AVColorPrimaries = AVColorPrimaries.AVCOL_PRI_UNSPECIFIED
  colorTrc: AVColorTransferCharacteristic = AVColorTransferCharacteristic.AVCOL_TRC_UNSPECIFIED
  colorSpace: AVColorSpace = AVColorSpace.AVCOL_SPC_UNSPECIFIED
  chromaLocation: AVChromaLocation = AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED

  /**
   * Video only. Number of delayed frames.
   */
  videoDelay: int32 = 0

  /**
   * Audio only. The channel layout and number of channels.
   */
  chLayout: AVChannelLayout

  /**
   * Audio only. The number of audio samples per second.
   */
  sampleRate: int32 = NOPTS_VALUE
  /**
   * Audio only. The number of bytes per coded audio frame, required by some
   * formats.
   *
   * Corresponds to nBlockAlign in WAVEFORMATEX.
   */
  blockAlign: int32 = 0

  /**
   * Audio only. Audio frame size, if known. Required by some formats to be static.
   */
  frameSize: int32 = 0

  /**
   * Audio only. The amount of padding (in samples) inserted by the encoder at
   * the beginning of the audio. I.e. this number of leading decoded samples
   * must be discarded by the caller to get the original audio without leading
   * padding.
   */
  initialPadding: int32 = 0

  /**
   * Audio only. The amount of padding (in samples) appended by the encoder to
   * the end of the audio. I.e. this number of decoded samples must be
   * discarded by the caller from the end of the stream to get the original
   * audio without any trailing padding.
   */
  trailingPadding: int32 = 0
  /**
   * Audio only. Number of samples to skip after a discontinuity.
   */
  seekPreroll: int32 = 0

  /**
   * 码流格式
   * 对于 h264/h265/h266 标记是 annexb 还是 avcc 格式
   */
  bitFormat: int32 = 0

  destroy() {
    freeCodecParameters(addressof(this as AVCodecParameters))
    this[symbolStructAddress] = nullptr
  }
}
