/*
 * libmedia AVSampleFormat
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

export const enum AVSampleFormat {
  AV_SAMPLE_FMT_NONE = -1,
  /**
   * unsigned 8 bits
   */
  AV_SAMPLE_FMT_U8,
  /**
   * signed 16 bits
   */
  AV_SAMPLE_FMT_S16,
  /**
   * signed 32 bits
   */
  AV_SAMPLE_FMT_S32,
  /**
   * float
   */
  AV_SAMPLE_FMT_FLT,
  /**
   * double
   */
  AV_SAMPLE_FMT_DBL,
  /**
   * unsigned 8 bits, planar
   */
  AV_SAMPLE_FMT_U8P,
  /**
   * signed 16 bits, planar
   */
  AV_SAMPLE_FMT_S16P,
  /**
   * signed 32 bits, planar
   */
  AV_SAMPLE_FMT_S32P,
  /**
   * float, planar
   */
  AV_SAMPLE_FMT_FLTP,
  /**
   * double, planar
   */
  AV_SAMPLE_FMT_DBLP,
  /**
   * signed 64 bits
   */
  AV_SAMPLE_FMT_S64,
  /**
   * signed 64 bits, planar
   */
  AV_SAMPLE_FMT_S64P,
  /**
   * Number of sample formats. DO NOT USE if linking dynamically
   */
  AV_SAMPLE_FMT_NB
}

export const enum AVChannelOrder {
  /**
   * Only the channel count is specified, without any further information
   * about the channel order.
   */
  AV_CHANNEL_ORDER_UNSPEC,
  /**
   * The native channel order, i.e. the channels are in the same order in
   * which they are defined in the AVChannel enum. This supports up to 63
   * different channels.
   */
  AV_CHANNEL_ORDER_NATIVE,
  /**
   * The channel order does not correspond to any other predefined order and
   * is stored as an explicit map. For example, this could be used to support
   * layouts with 64 or more channels, or with empty/skipped (AV_CHAN_UNUSED)
   * channels at arbitrary positions.
   */
  AV_CHANNEL_ORDER_CUSTOM,
  /**
   * The audio is represented as the decomposition of the sound field into
   * spherical harmonics. Each channel corresponds to a single expansion
   * component. Channels are ordered according to ACN (Ambisonic Channel
   * Number).
   *
   * The channel with the index n in the stream contains the spherical
   * harmonic of degree l and order m given by
   * @code{.unparsed}
   *   l   = floor(sqrt(n)),
   *   m   = n - l * (l + 1).
   * @endcode
   *
   * Conversely given a spherical harmonic of degree l and order m, the
   * corresponding channel index n is given by
   * @code{.unparsed}
   *   n = l * (l + 1) + m.
   * @endcode
   *
   * Normalization is assumed to be SN3D (Schmidt Semi-Normalization)
   * as defined in AmbiX format $ 2.1.
   */
  AV_CHANNEL_ORDER_AMBISONIC,
  /**
   * Number of channel orders, not part of ABI/API
   */
  FF_CHANNEL_ORDER_NB
}

export const enum AVChannel {
  // /< Invalid channel index
  AV_CHAN_NONE = -1,
  AV_CHAN_FRONT_LEFT,
  AV_CHAN_FRONT_RIGHT,
  AV_CHAN_FRONT_CENTER,
  AV_CHAN_LOW_FREQUENCY,
  AV_CHAN_BACK_LEFT,
  AV_CHAN_BACK_RIGHT,
  AV_CHAN_FRONT_LEFT_OF_CENTER,
  AV_CHAN_FRONT_RIGHT_OF_CENTER,
  AV_CHAN_BACK_CENTER,
  AV_CHAN_SIDE_LEFT,
  AV_CHAN_SIDE_RIGHT,
  AV_CHAN_TOP_CENTER,
  AV_CHAN_TOP_FRONT_LEFT,
  AV_CHAN_TOP_FRONT_CENTER,
  AV_CHAN_TOP_FRONT_RIGHT,
  AV_CHAN_TOP_BACK_LEFT,
  AV_CHAN_TOP_BACK_CENTER,
  AV_CHAN_TOP_BACK_RIGHT,
  /** Stereo downmix. */
  AV_CHAN_STEREO_LEFT = 29,
  /** See above. */
  AV_CHAN_STEREO_RIGHT,
  AV_CHAN_WIDE_LEFT,
  AV_CHAN_WIDE_RIGHT,
  AV_CHAN_SURROUND_DIRECT_LEFT,
  AV_CHAN_SURROUND_DIRECT_RIGHT,
  AV_CHAN_LOW_FREQUENCY_2,
  AV_CHAN_TOP_SIDE_LEFT,
  AV_CHAN_TOP_SIDE_RIGHT,
  AV_CHAN_BOTTOM_FRONT_CENTER,
  AV_CHAN_BOTTOM_FRONT_LEFT,
  AV_CHAN_BOTTOM_FRONT_RIGHT,

  /** Channel is empty can be safely skipped. */
  AV_CHAN_UNUSED = 0x200,

  /** Channel contains data, but its position is unknown. */
  AV_CHAN_UNKNOWN = 0x300,

  /**
   * Range of channels between AV_CHAN_AMBISONIC_BASE and
   * AV_CHAN_AMBISONIC_END represent Ambisonic components using the ACN system.
   *
   * Given a channel id `<i>` between AV_CHAN_AMBISONIC_BASE and
   * AV_CHAN_AMBISONIC_END (inclusive), the ACN index of the channel `<n>` is
   * `<n> = <i> - AV_CHAN_AMBISONIC_BASE`.
   *
   * @note these values are only used for AV_CHANNEL_ORDER_CUSTOM channel
   * orderings, the AV_CHANNEL_ORDER_AMBISONIC ordering orders the channels
   * implicitly by their position in the stream.
   */
  AV_CHAN_AMBISONIC_BASE = 0x400,
  // leave space for 1024 ids, which correspond to maximum order-32 harmonics,
  // which should be enough for the foreseeable use cases
  AV_CHAN_AMBISONIC_END  = 0x7ff,
}

export const enum AVAudioServiceType {
  AV_AUDIO_SERVICE_TYPE_MAIN              = 0,
  AV_AUDIO_SERVICE_TYPE_EFFECTS           = 1,
  AV_AUDIO_SERVICE_TYPE_VISUALLY_IMPAIRED = 2,
  AV_AUDIO_SERVICE_TYPE_HEARING_IMPAIRED  = 3,
  AV_AUDIO_SERVICE_TYPE_DIALOGUE          = 4,
  AV_AUDIO_SERVICE_TYPE_COMMENTARY        = 5,
  AV_AUDIO_SERVICE_TYPE_EMERGENCY         = 6,
  AV_AUDIO_SERVICE_TYPE_VOICE_OVER        = 7,
  AV_AUDIO_SERVICE_TYPE_KARAOKE           = 8,
  AV_AUDIO_SERVICE_TYPE_NB
}

export const enum AV_CH_LAYOUT {
  AV_CH_FRONT_LEFT = (1 << AVChannel.AV_CHAN_FRONT_LEFT),
  AV_CH_FRONT_RIGHT = (1 << AVChannel.AV_CHAN_FRONT_RIGHT),
  AV_CH_FRONT_CENTER = (1 << AVChannel.AV_CHAN_FRONT_CENTER),
  AV_CH_LOW_FREQUENCY = (1 << AVChannel.AV_CHAN_LOW_FREQUENCY),
  AV_CH_BACK_LEFT = (1 << AVChannel.AV_CHAN_BACK_LEFT),
  AV_CH_BACK_RIGHT = (1 << AVChannel.AV_CHAN_BACK_RIGHT),
  AV_CH_FRONT_LEFT_OF_CENTER = (1 << AVChannel.AV_CHAN_FRONT_LEFT_OF_CENTER),
  AV_CH_FRONT_RIGHT_OF_CENTER = (1 << AVChannel.AV_CHAN_FRONT_RIGHT_OF_CENTER),
  AV_CH_BACK_CENTER = (1 << AVChannel.AV_CHAN_BACK_CENTER),
  AV_CH_SIDE_LEFT = (1 << AVChannel.AV_CHAN_SIDE_LEFT),
  AV_CH_SIDE_RIGHT = (1 << AVChannel.AV_CHAN_SIDE_RIGHT),
  AV_CH_TOP_CENTER = (1 << AVChannel.AV_CHAN_TOP_CENTER),
  AV_CH_TOP_FRONT_LEFT = (1 << AVChannel.AV_CHAN_TOP_FRONT_LEFT),
  AV_CH_TOP_FRONT_CENTER = (1 << AVChannel.AV_CHAN_TOP_FRONT_CENTER),
  AV_CH_TOP_FRONT_RIGHT = (1 << AVChannel.AV_CHAN_TOP_FRONT_RIGHT),
  AV_CH_TOP_BACK_LEFT = (1 << AVChannel.AV_CHAN_TOP_BACK_LEFT),
  AV_CH_TOP_BACK_CENTER = (1 << AVChannel.AV_CHAN_TOP_BACK_CENTER),
  AV_CH_TOP_BACK_RIGHT = (1 << AVChannel.AV_CHAN_TOP_BACK_RIGHT),
  AV_CH_STEREO_LEFT = (1 << AVChannel.AV_CHAN_STEREO_LEFT),
  AV_CH_STEREO_RIGHT = (1 << AVChannel.AV_CHAN_STEREO_RIGHT),
  AV_CH_WIDE_LEFT = (1 << AVChannel.AV_CHAN_WIDE_LEFT),
  AV_CH_WIDE_RIGHT = (1 << AVChannel.AV_CHAN_WIDE_RIGHT),
  AV_CH_SURROUND_DIRECT_LEFT = (1 << AVChannel.AV_CHAN_SURROUND_DIRECT_LEFT),
  AV_CH_SURROUND_DIRECT_RIGHT = (1 << AVChannel.AV_CHAN_SURROUND_DIRECT_RIGHT),
  AV_CH_LOW_FREQUENCY_2 = (1 << AVChannel.AV_CHAN_LOW_FREQUENCY_2),
  AV_CH_TOP_SIDE_LEFT = (1 << AVChannel.AV_CHAN_TOP_SIDE_LEFT),
  AV_CH_TOP_SIDE_RIGHT = (1 << AVChannel.AV_CHAN_TOP_SIDE_RIGHT),
  AV_CH_BOTTOM_FRONT_CENTER = (1 << AVChannel.AV_CHAN_BOTTOM_FRONT_CENTER),
  AV_CH_BOTTOM_FRONT_LEFT = (1 << AVChannel.AV_CHAN_BOTTOM_FRONT_LEFT),
  AV_CH_BOTTOM_FRONT_RIGHT = (1 << AVChannel.AV_CHAN_BOTTOM_FRONT_RIGHT),

  AV_CH_LAYOUT_MONO = (AV_CH_FRONT_CENTER),
  AV_CH_LAYOUT_STEREO = (AV_CH_FRONT_LEFT|AV_CH_FRONT_RIGHT),
  AV_CH_LAYOUT_2POINT1 = (AV_CH_LAYOUT_STEREO|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_2_1 = (AV_CH_LAYOUT_STEREO|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_SURROUND = (AV_CH_LAYOUT_STEREO|AV_CH_FRONT_CENTER),
  AV_CH_LAYOUT_3POINT1 = (AV_CH_LAYOUT_SURROUND|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_4POINT0 = (AV_CH_LAYOUT_SURROUND|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_4POINT1 = (AV_CH_LAYOUT_4POINT0|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_2_2 = (AV_CH_LAYOUT_STEREO|AV_CH_SIDE_LEFT|AV_CH_SIDE_RIGHT),
  AV_CH_LAYOUT_QUAD = (AV_CH_LAYOUT_STEREO|AV_CH_BACK_LEFT|AV_CH_BACK_RIGHT),
  AV_CH_LAYOUT_5POINT0 = (AV_CH_LAYOUT_SURROUND|AV_CH_SIDE_LEFT|AV_CH_SIDE_RIGHT),
  AV_CH_LAYOUT_5POINT1 = (AV_CH_LAYOUT_5POINT0|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_5POINT0_BACK = (AV_CH_LAYOUT_SURROUND|AV_CH_BACK_LEFT|AV_CH_BACK_RIGHT),
  AV_CH_LAYOUT_5POINT1_BACK = (AV_CH_LAYOUT_5POINT0_BACK|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_6POINT0 = (AV_CH_LAYOUT_5POINT0|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_6POINT0_FRONT = (AV_CH_LAYOUT_2_2|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER),
  AV_CH_LAYOUT_HEXAGONAL = (AV_CH_LAYOUT_5POINT0_BACK|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_3POINT1POINT2 = (AV_CH_LAYOUT_3POINT1|AV_CH_TOP_FRONT_LEFT|AV_CH_TOP_FRONT_RIGHT),
  AV_CH_LAYOUT_6POINT1 = (AV_CH_LAYOUT_5POINT1|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_6POINT1_BACK = (AV_CH_LAYOUT_5POINT1_BACK|AV_CH_BACK_CENTER),
  AV_CH_LAYOUT_6POINT1_FRONT = (AV_CH_LAYOUT_6POINT0_FRONT|AV_CH_LOW_FREQUENCY),
  AV_CH_LAYOUT_7POINT0 = (AV_CH_LAYOUT_5POINT0|AV_CH_BACK_LEFT|AV_CH_BACK_RIGHT),
  AV_CH_LAYOUT_7POINT0_FRONT = (AV_CH_LAYOUT_5POINT0|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER),
  AV_CH_LAYOUT_7POINT1 = (AV_CH_LAYOUT_5POINT1|AV_CH_BACK_LEFT|AV_CH_BACK_RIGHT),
  AV_CH_LAYOUT_7POINT1_WIDE = (AV_CH_LAYOUT_5POINT1|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER),
  AV_CH_LAYOUT_7POINT1_WIDE_BACK = (AV_CH_LAYOUT_5POINT1_BACK|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER),
  AV_CH_LAYOUT_5POINT1POINT2_BACK = (AV_CH_LAYOUT_5POINT1_BACK|AV_CH_TOP_FRONT_LEFT|AV_CH_TOP_FRONT_RIGHT),
  AV_CH_LAYOUT_OCTAGONAL = (AV_CH_LAYOUT_5POINT0|AV_CH_BACK_LEFT|AV_CH_BACK_CENTER|AV_CH_BACK_RIGHT),
  AV_CH_LAYOUT_CUBE = (AV_CH_LAYOUT_QUAD|AV_CH_TOP_FRONT_LEFT|AV_CH_TOP_FRONT_RIGHT|AV_CH_TOP_BACK_LEFT|AV_CH_TOP_BACK_RIGHT),
  AV_CH_LAYOUT_5POINT1POINT4_BACK = (AV_CH_LAYOUT_5POINT1POINT2_BACK|AV_CH_TOP_BACK_LEFT|AV_CH_TOP_BACK_RIGHT),
  AV_CH_LAYOUT_7POINT1POINT2 = (AV_CH_LAYOUT_7POINT1|AV_CH_TOP_FRONT_LEFT|AV_CH_TOP_FRONT_RIGHT),
  AV_CH_LAYOUT_7POINT1POINT4_BACK = (AV_CH_LAYOUT_7POINT1POINT2|AV_CH_TOP_BACK_LEFT|AV_CH_TOP_BACK_RIGHT),
  AV_CH_LAYOUT_7POINT2POINT3 = (AV_CH_LAYOUT_7POINT1POINT2|AV_CH_TOP_BACK_CENTER|AV_CH_LOW_FREQUENCY_2),
  AV_CH_LAYOUT_9POINT1POINT4_BACK = (AV_CH_LAYOUT_7POINT1POINT4_BACK|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER),
  AV_CH_LAYOUT_HEXADECAGONAL = (AV_CH_LAYOUT_OCTAGONAL|AV_CH_WIDE_LEFT|AV_CH_WIDE_RIGHT|AV_CH_TOP_BACK_LEFT|AV_CH_TOP_BACK_RIGHT|AV_CH_TOP_BACK_CENTER|AV_CH_TOP_FRONT_CENTER|AV_CH_TOP_FRONT_LEFT|AV_CH_TOP_FRONT_RIGHT),
  AV_CH_LAYOUT_STEREO_DOWNMIX = (AV_CH_STEREO_LEFT|AV_CH_STEREO_RIGHT),
  AV_CH_LAYOUT_22POINT2 = (AV_CH_LAYOUT_7POINT1POINT4_BACK|AV_CH_FRONT_LEFT_OF_CENTER|AV_CH_FRONT_RIGHT_OF_CENTER|AV_CH_BACK_CENTER|AV_CH_LOW_FREQUENCY_2|AV_CH_TOP_FRONT_CENTER|AV_CH_TOP_CENTER|AV_CH_TOP_SIDE_LEFT|AV_CH_TOP_SIDE_RIGHT|AV_CH_TOP_BACK_CENTER|AV_CH_BOTTOM_FRONT_CENTER|AV_CH_BOTTOM_FRONT_LEFT|AV_CH_BOTTOM_FRONT_RIGHT),
  AV_CH_LAYOUT_7POINT1_TOP_BACK = AV_CH_LAYOUT_5POINT1POINT2_BACK
}