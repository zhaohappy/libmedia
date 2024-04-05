/*
 * libmedia flv encode
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

import Stream from '../../AVStream'
import { AVCodecID } from 'avutil/codec'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import IOWriter from 'common/io/IOWriterSync'
import { AVCodecID2FlvCodecType, FlvTag } from './flv'

export function writeTagHeader(
  ioWriter: IOWriter,
  type: FlvTag,
  size: number,
  timestamp: bigint
) {
  // tagType
  ioWriter.writeUint8(type)
  // size
  ioWriter.writeUint24(size)
  // timestamp
  ioWriter.writeUint24(Number(timestamp & 0xffffffn))
  // timestampExtended
  ioWriter.writeUint8(Number((timestamp >> 24n) & 0xffn))
  // streamId always 0
  ioWriter.writeUint24(0)
}

/**
 * 
 *   0  1  2  3    4    5      6         7   
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |SoundFormat|SoundRate|SoundSize| SoundType| SoundData
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * 
 * @param ioWriter 
 * @param stream 
 */
export function writeAudioTagDataHeader(ioWriter: IOWriter, stream: Stream) {
  /**
   * SoundSize 采样精度，对于压缩过的音频，永远是 16 位
   * - 0 snd8Bit
   * - 1 snd16Bit
   */
  let header = 0x02
  /**
   * SoundType 声道类型，对 Nellymoser 来说，永远是单声道；对 AAC 来说，永远是双声道
   * - 0 sndMono 单声道
   * - 1 sndStereo 双声道
   */
  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC || stream.codecpar.chLayout.nbChannels > 1) {
    header |= 0x01
  }
  /**
   * SoundRate 采样率，对 AAC 来说，永远等于 3
   * - 0 5.5-kHz
   * - 1 1-kHz
   * - 2 22-kHz
   * - 3 44-kHz
   */
  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC || stream.codecpar.sampleRate >= 44000) {
    header |= 0x0c
  }
  else if (stream.codecpar.sampleRate >= 22000) {
    header |= 0x08
  }
  else if (stream.codecpar.sampleRate >= 11000) {
    header |= 0x04
  }

  header |= ((AVCodecID2FlvCodecType[stream.codecpar.codecId]) << 4)

  ioWriter.writeUint8(header)
}

/**
 * 
 *   0 1  2  3  4 5 6 7   
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-
 *  |FrameType|CodecID| VideoData
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * @param ioWriter 
 * @param stream 
 */
export function writeVideoTagDataHeader(ioWriter: IOWriter, stream: Stream, flags: AVPacketFlags) {
  let header = AVCodecID2FlvCodecType[stream.codecpar.codecId] & 0x0f

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
  ) {
    if (flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
      header |= (1 << 4)
    }
    else {
      header |= (1 << 5)
    }
  }
  ioWriter.writeUint8(header)
}


