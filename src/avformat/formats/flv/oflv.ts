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

import { AVCodecID } from 'avutil/codec'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import IOWriterSync from 'common/io/IOWriterSync'
import { AudioPacketModExType, AudioPacketType, AVCodecID2FlvCodecTag, AVCodecID2FlvCodecType, AVMultiTrackType, FlvTag, VideoFrameType, VideoPacketModExType, VideoPacketType } from './flv'
import { FlvContext, FlvStreamContext } from './type'
import { Rational } from 'avutil/struct/rational'
import { avRescaleQ2 } from 'avutil/util/rational'
import { AV_MILLI_TIME_BASE_Q, AV_NANO_TIME_BASE_Q } from 'avutil/constant'
import mktag from '../../function/mktag'
import * as is from 'common/util/is'
import AVStream from 'avutil/AVStream'

export function updateSize(ioWriter: IOWriterSync, pos: int64, size: int32) {
  const now = ioWriter.getPos()
  const pointer = ioWriter.getPointer()
  const minPos = now - static_cast<int64>(pointer)
  if (pos < now && pos >= minPos) {
    ioWriter.seekInline(pointer + Number(pos - now))
    ioWriter.writeUint24(size)
    ioWriter.seekInline(pointer)
  }
  else {
    ioWriter.seek(pos)
    ioWriter.writeUint24(size)
    ioWriter.seek(now)
  }
}

export function writeTag(
  ioWriter: IOWriterSync,
  type: FlvTag,
  timestamp: int64,
  dataHeader?: (ioWriter: IOWriterSync) => void,
  data?: Uint8Array | ((ioWriter: IOWriterSync) => void),
  previousTagSizeCallback?: (previousTagSize: int32) => void
) {
  ioWriter.flush()
  // tagType
  ioWriter.writeUint8(type)
  const sizePos = ioWriter.getPos()
  // size
  ioWriter.writeUint24(0)
  // timestamp
  ioWriter.writeUint24(Number(timestamp & 0xffffffn))
  // timestampExtended
  ioWriter.writeUint8(Number((timestamp >> 24n) & 0xffn))
  // streamId always 0
  ioWriter.writeUint24(0)

  const dataPos = ioWriter.getPos()
  if (dataHeader) {
    dataHeader(ioWriter)
  }
  if (is.func(data)) {
    data(ioWriter)
    updateSize(ioWriter, sizePos, Number(ioWriter.getPos() - dataPos))
  }
  else if (data) {
    updateSize(ioWriter, sizePos, data.length + Number(ioWriter.getPos() - dataPos))
    ioWriter.writeBuffer(data)
  }
  const previousTagSize = Number(ioWriter.getPos() - sizePos) + 1
  if (previousTagSizeCallback) {
    previousTagSizeCallback(previousTagSize)
  }
  ioWriter.writeUint32(previousTagSize)
}

export function isEnhancedCodecId(codecId: AVCodecID) {
  if (codecId === AVCodecID.AV_CODEC_ID_AAC
    || codecId === AVCodecID.AV_CODEC_ID_H264
    || codecId === AVCodecID.AV_CODEC_ID_MP3
    || codecId === AVCodecID.AV_CODEC_ID_MPEG4
  ) {
    return false
  }
  return !!AVCodecID2FlvCodecTag[codecId]
}

export function writeVideoHeader(
  ioWriter: IOWriterSync,
  stream: AVStream,
  context: FlvContext,
  enhanced: boolean,
  type: uint8,
  flags: AVPacketFlags,
  timestamp: int64,
  timeBase: pointer<Rational>,
  ct: int32 = 0
) {

  const streamContext = stream.privData as FlvStreamContext

  let header = enhanced ? 0x80 : 0
  header |= ((flags & AVPacketFlags.AV_PKT_FLAG_KEY) ? VideoFrameType.KeyFrame : VideoFrameType.InterFrame) << 4

  if (enhanced) {
    if (context.enableNanoTimestamp && timeBase) {
      const nano = avRescaleQ2(timestamp, timeBase, AV_NANO_TIME_BASE_Q)
      const mill = avRescaleQ2(timestamp, timeBase, AV_MILLI_TIME_BASE_Q)
      const offset = nano - mill * 1000000n
      if (offset) {
        header |= VideoPacketType.ModEx
        ioWriter.writeUint8(header)
        // modExSize - 1
        ioWriter.writeUint8(2)
        ioWriter.writeUint24(static_cast<int32>(offset))
        header = VideoPacketModExType.TimestampOffsetNano << 4
      }
    }
    if (context.multiVideoTracks) {
      header |= VideoPacketType.MultiTrack
      ioWriter.writeUint8(header)
      header = AVMultiTrackType.OneTrack << 4
    }
    header |= type
    ioWriter.writeUint8(header)
    ioWriter.writeUint32(mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId]))
    if (context.multiVideoTracks) {
      ioWriter.writeUint8(streamContext.trackId)
    }
    if (type === VideoPacketType.CodedFrames) {
      ioWriter.writeInt24(ct)
    }
  }
  else {
    header |= AVCodecID2FlvCodecType[stream.codecpar.codecId] & 0x0f
    ioWriter.writeUint8(header)
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
    ) {
      ioWriter.writeUint8(type)
      ioWriter.writeInt24(ct)
    }
  }
}

export function writeAudioHeader(
  ioWriter: IOWriterSync,
  stream: AVStream,
  context: FlvContext,
  enhanced: boolean,
  type: uint8,
  timestamp: int64,
  timeBase: pointer<Rational>
) {
  const streamContext = stream.privData as FlvStreamContext

  let header = (enhanced ? 9 : (AVCodecID2FlvCodecType[stream.codecpar.codecId] & 0x0f)) << 4

  if (enhanced) {
    if (context.enableNanoTimestamp) {
      const nano = avRescaleQ2(timestamp, timeBase, AV_NANO_TIME_BASE_Q)
      const mill = avRescaleQ2(timestamp, timeBase, AV_MILLI_TIME_BASE_Q)
      const offset = nano - mill * 1000000n
      if (offset) {
        header |= AudioPacketType.ModEx
        ioWriter.writeUint8(header)
        // modExSize - 1
        ioWriter.writeUint8(2)
        ioWriter.writeUint24(static_cast<int32>(offset))
        header = AudioPacketModExType.TimestampOffsetNano << 4
      }
    }
    if (context.multiVideoTracks) {
      header |= AudioPacketType.MultiTrack
      ioWriter.writeUint8(header)
      header = AVMultiTrackType.OneTrack << 4
    }
    header |= type
    ioWriter.writeUint8(header)
    ioWriter.writeUint32(mktag(AVCodecID2FlvCodecTag[stream.codecpar.codecId]))
    if (context.multiVideoTracks) {
      ioWriter.writeUint8(streamContext.trackId)
    }
  }
  else {
    /**
     * SoundType 声道类型，对 Nellymoser 来说，永远是单声道；对 AAC 来说，永远是双声道
     * - 0 sndMono 单声道
     * - 1 sndStereo 双声道
     */
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC || stream.codecpar.chLayout.nbChannels > 1) {
      header |= 0x01
    }
    /**
     * SoundSize 采样精度，对于压缩过的音频，永远是 16 位
     * - 0 snd8Bit
     * - 1 snd16Bit
     */
    if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_PCM_U8) {
      header |= 0x02
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
    ioWriter.writeUint8(header)
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
      ioWriter.writeUint8(type)
    }
  }
}
