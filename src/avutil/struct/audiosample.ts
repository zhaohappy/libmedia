/*
 * libmedia AVChannelLayout
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

import { AVChannel, AVChannelOrder } from '../audiosamplefmt'

@struct
export class AVChannelCustom {
  id: AVChannel
  name: array<char, 16>
  opaque: pointer<void>
}

@struct
export class AVChannelLayout {
  /**
   * Channel order used in this layout.
   * This is a mandatory field.
   */
  order: AVChannelOrder

  /**
   * Number of channels in this layout. Mandatory field.
   */
  nbChannels: int32

  /**
   * Details about which channels are present in this layout.
   * For AV_CHANNEL_ORDER_UNSPEC, this field is undefined and must not be
   * used.
   */
  u: union<{
    /**
     * This member must be used for AV_CHANNEL_ORDER_NATIVE, and may be used
     * for AV_CHANNEL_ORDER_AMBISONIC to signal non-diegetic channels.
     * It is a bitmask, where the position of each set bit means that the
     * AVChannel with the corresponding value is present.
     *
     * I.e. when (mask & (1 << AV_CHAN_FOO)) is non-zero, then AV_CHAN_FOO
     * is present in the layout. Otherwise it is not present.
     *
     * @note when a channel layout using a bitmask is constructed or
     * modified manually (i.e.  not using any of the av_channel_layout_*
     * functions), the code doing it must ensure that the number of set bits
     * is equal to nb_channels.
     */
    mask: uint64

    /**
     * This member must be used when the channel order is
     * AV_CHANNEL_ORDER_CUSTOM. It is a nb_channels-sized array, with each
     * element signalling the presence of the AVChannel with the
     * corresponding value in map[i].id.
     *
     * I.e. when map[i].id is equal to AV_CHAN_FOO, then AV_CH_FOO is the
     * i-th channel in the audio data.
     *
     * When map[i].id is in the range between AV_CHAN_AMBISONIC_BASE and
     * AV_CHAN_AMBISONIC_END (inclusive), the channel contains an ambisonic
     * component with ACN index (as defined above)
     * n = map[i].id - AV_CHAN_AMBISONIC_BASE.
     *
     * map[i].name may be filled with a 0-terminated string, in which case
     * it will be used for the purpose of identifying the channel with the
     * convenience functions below. Otherwise it must be zeroed.
     */
    map: pointer<AVChannelCustom>
  }>

  /**
   * For some private data of the user.
   */
  opaque: pointer<void>
}
