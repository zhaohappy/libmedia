/*
 * libmedia flv enhanced util
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

import * as flv from '../oflv'
import Stream from 'avutil/AVStream'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { FlvTag, PacketTypeExt } from '../flv'
import IOWriter from 'common/io/IOWriterSync'
import { FlvCodecHeaderLength } from '../flv'
import { AVCodecID } from 'avutil/codec'
import { writeVideoTagExtDataHeader } from '../oflv'
import * as naluUtil from 'avutil/util/nalu'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'

export function writeCodecTagHeader(ioWriter: IOWriter, codecId: AVCodecID) {
  switch (codecId) {
    case AVCodecID.AV_CODEC_ID_HEVC:
      ioWriter.writeString('hvc1')
      break
    case AVCodecID.AV_CODEC_ID_VVC:
      ioWriter.writeString('vvc1')
      break
    case AVCodecID.AV_CODEC_ID_VP9:
      ioWriter.writeString('vp09')
      break
    case AVCodecID.AV_CODEC_ID_AV1:
      ioWriter.writeString('av01')
      break
  }
}



/**
 * 写 extradata 数据
 * 
 * @param ioWriter 
 * @param stream 
 * @param data 
 * @param metadata 
 */
export function writeExtradata(
  ioWriter: IOWriter,
  stream: Stream,
  extradata: Uint8Array,
  flags: AVPacketFlags,
  timestamp: int64
) {

  const now = ioWriter.getPos()

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
  ) {
    if (naluUtil.isAnnexb(extradata)) {
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
        extradata = h264.annexbExtradata2AvccExtradata(extradata)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        extradata = hevc.annexbExtradata2AvccExtradata(extradata)
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
        extradata = vvc.annexbExtradata2AvccExtradata(extradata)
      }
    }
  }

  flv.writeTagHeader(
    ioWriter,
    FlvTag.VIDEO,
    extradata.length + 1 + FlvCodecHeaderLength[stream.codecpar.codecId],
    timestamp
  )
  writeVideoTagExtDataHeader(ioWriter, stream, PacketTypeExt.PacketTypeSequenceStart, flags)

  writeCodecTagHeader(ioWriter, stream.codecpar.codecId)

  ioWriter.writeBuffer(extradata)

  const length = Number(ioWriter.getPos() - now)
  ioWriter.writeUint32(length)

  return length
}
