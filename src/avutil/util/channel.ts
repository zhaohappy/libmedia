/*
 * libmedia channel util
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

import { AVChannelCustom, AVChannelLayout } from '../struct/audiosample'
import { popCount64 } from './common'
import { AVChannel, AVChannelOrder } from '../audiosamplefmt'
import { avFreep, avMallocz } from './mem'
import { memset } from 'cheap/std/memory'
import * as error from '../error'

export function getChannelLayoutNBChannels(layout: uint64) {
  return popCount64(layout)
}

export function unInitChannelLayout(channelLayout: pointer<AVChannelLayout>) {
  if (channelLayout.order == AVChannelOrder.AV_CHANNEL_ORDER_CUSTOM) {
    avFreep(addressof(channelLayout.u.map))
  }
  memset(channelLayout, 0, sizeof(accessof(channelLayout)))
}

export function setChannelLayoutFromMask(channelLayout: pointer<AVChannelLayout>, mask: uint64) {
  if (!mask) {
    return error.INVALID_ARGUMENT
  }
  channelLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_NATIVE
  channelLayout.nbChannels = popCount64(static_cast<uint64>(mask))
  channelLayout.u.mask = mask
  return 0
}

export function initCustomChannelLayout(channelLayout: pointer<AVChannelLayout>, channels: int32) {
  if (channels <= 0) {
    throw new Error('invalid channels')
  }
  const map: pointer<AVChannelCustom> = avMallocz(reinterpret_cast<size>(reinterpret_cast<size>(channels) * sizeof(accessof(channelLayout.u.map))))
  for (let i = 0; i < channels; i++) {
    map[i].id = AVChannel.AV_CHANNEL_UNKNOWN
  }
  channelLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_CUSTOM
  channelLayout.nbChannels = channels
  channelLayout.u.map = map
}
