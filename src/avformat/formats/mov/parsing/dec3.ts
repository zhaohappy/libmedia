/*
 * libmedia mp4 dec3 box parser
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

import IOReader from 'common/io/IOReader'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import Stream from 'avutil/AVStream'
import { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'
import { newSideData } from 'avutil/util/avpacket'
import { AVChannelLayout, AVAudioServiceType } from 'avutil/audiosamplefmt'
import { AC3ChannelLayout } from 'avutil/codecs/ac3'
import * as avChannel from 'avutil/util/channel'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_EAC3

  if (atom.size <= 0) {
    return
  }

  const sd = newSideData(
    addressof(stream.codecpar.codedSideData),
    addressof(stream.codecpar.nbCodedSideData),
    AVPacketSideDataType.AV_PKT_DATA_AUDIO_SERVICE_TYPE,
    sizeof(int32)
  )

  const ast = reinterpret_cast<pointer<int32>>(sd.data)

  // data_rate and num_ind_sub
  await ioReader.skip(2)
  const eac3info = await ioReader.readUint24()
  const bsmod = (eac3info >> 12) & 0x1f
  const acmod = (eac3info >>  9) & 0x7
  const lfeon = (eac3info >>  8) & 0x1

  let mask = static_cast<uint64>(AC3ChannelLayout[acmod])
  if (lfeon) {
    mask |= static_cast<uint64>(AVChannelLayout.AV_CHANNEL_LAYOUT_LOW_FREQUENCY as uint32)
  }

  avChannel.unInitChannelLayout(addressof(stream.codecpar.chLayout))
  avChannel.setChannelLayoutFromMask(addressof(stream.codecpar.chLayout), mask)

  accessof(ast) <- reinterpret_cast<int32>(bsmod)
  if (stream.codecpar.chLayout.nbChannels > 1 && bsmod == 0x7) {
    accessof(ast) <- reinterpret_cast<int32>(AVAudioServiceType.AV_AUDIO_SERVICE_TYPE_KARAOKE)
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read avcc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
