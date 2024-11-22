/*
 * libmedia opus util
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

import { AVPacketSideDataType } from '../codec'
import AVStream from '../AVStream'
import AVCodecParameters from '../struct/avcodecparameters'
import BufferReader from 'common/io/BufferReader'
import BufferWriter from 'common/io/BufferWriter'
import { avRescaleQ } from '../util/rational'
import { Uint8ArrayInterface } from 'common/io/interface'

export const durations = [
  /* Silk NB */
  480, 960, 1920, 2880,
  /* Silk MB */
  480, 960, 1920, 2880,
  /* Silk WB */
  480, 960, 1920, 2880,
  /* Hybrid SWB */
  480, 960,
  /* Hybrid FB */
  480, 960,
  /* CELT NB */
  120, 240, 480, 960,
  /* CELT NB */
  120, 240, 480, 960,
  /* CELT NB */
  120, 240, 480, 960,
  /* CELT NB */
  120, 240, 480, 960
]


export function getBufferSamples(buffer: Uint8Array) {
  let toc = 0, frameDuration = 0, nframes = 0

  if (buffer.length < 1) {
    return 0
  }

  toc = buffer[0]

  frameDuration = durations[toc >> 3]

  switch (toc & 3) {
    case 0:
      nframes = 1
      break
    case 1:
      nframes = 2
      break
    case 2:
      nframes = 2
      break
    case 3:
      if (buffer.length < 2) {
        return 0
      }
      nframes = buffer[1] & 63
      break
  }
  return nframes * frameDuration
}

/**
 * opus extradata
 * 
 * - 8 bytes Magic Signature: OpusHead
 * - 1 bytes unsigned, 对应值 0x01 version
 * - 1 bytes unsigned, channels 它可能和编码声道数不一致， 它可能被修改成 packet-by-packet, 对应值 0x01
 * - 2 bytes unsigned, preSkip 这是要从开始播放时的解码器输出， 从页面的颗粒位置减去以计算其 PCM 样本位置。
 * - 4 bytes unsigned, sampleRate 原始输入采样率
 * - 2 bytes signed, outputGain 这是解码时要应用的增益， 20 * log10 缩放解码器输出以实现所需的播放音量
 * - 1 bytes unsigned, channelMappingFamily 指示输出渠道的顺序和语音含义。该八位位组的每个当前指定的值表示一个映射系列，它定义了一组允许的通道数，以及每个允许的通道数的通道名称的有序集合
 * - channelMappingTable 可选， 当 Channel Mapping Family 为 0 时被省略。
 *  - 1 bytes, streamCount, unsigned ogg packet 里面编码了多少路 stream
 *  - 1 bytes, coupledStreamCount, unsigned 标识有多少路流是双声声道，必须小于 streamCount
 *  - C bytes, C 为总输出声道数 coupledStreamCount + streamCount
 * 
 */
export function parseAVCodecParameters(stream: AVStream, extradata?: Uint8ArrayInterface) {
  if (!extradata && stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
    extradata = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
  }
  if (extradata && extradata.length >= 19) {
    const reader = new BufferReader(extradata, false)
    reader.skip(9)
    stream.codecpar.chLayout.nbChannels = reader.readUint8()
    stream.codecpar.initialPadding = reader.readUint16()
    stream.codecpar.sampleRate = reader.readUint32()

    stream.codecpar.seekPreroll = Number(avRescaleQ(
      80n,
      {
        den: 1000,
        num: 1
      },
      {
        den: 48000,
        num: 1
      }
    ))
  }
}

export function avCodecParameters2Extradata(codecpar: AVCodecParameters) {
  const extradata = new Uint8Array(19)

  const writer = new BufferWriter(extradata, false)

  writer.writeString('OpusHead')
  writer.writeUint8(0x01)
  writer.writeUint8(codecpar.chLayout.nbChannels)
  writer.writeUint16(codecpar.initialPadding)
  writer.writeUint32(codecpar.sampleRate)

  return extradata
}
