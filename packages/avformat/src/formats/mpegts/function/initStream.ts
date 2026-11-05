/*
 * libmedia init stream
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

import type { MpegtsContext, MpegtsStreamContext, PID } from '../type'
import createMpegtsStreamContext from './createMpegtsStreamContext'
import * as mpegts from '../mpegts'
import { opus } from '@libmedia/avutil/internal'
import { AVCodecID, AVMediaType, type AVStream, avMalloc, AVCodecParameterFlags } from '@libmedia/avutil'
import type AVBSFilter from '../../../bsf/AVBSFilter'
import AACADTS2RawFilter from '../../../bsf/aac/ADTS2RawFilter'
import AACLATM2RawFilter from '../../../bsf/aac/LATM2RawFilter'
import OpusMpegts2RawFilter from '../../../bsf/opus/Mpegts2RawFilter'
import { memcpyFromUint8Array } from '@libmedia/cheap'
import { TSDescriptor } from '../mpegts'

export default function initStream(pid: PID, stream: AVStream, mpegtsContext: MpegtsContext) {

  stream.timeBase.den = 90000
  stream.timeBase.num = 1

  const streamContext = createMpegtsStreamContext()

  streamContext.pid = pid
  stream.privData = streamContext

  const streamType = mpegtsContext.pmt.pid2StreamType.get(pid)

  let info: [AVMediaType, AVCodecID]
  if (mpegts.StreamType2AVCodecId[streamType]) {
    info = mpegts.StreamType2AVCodecId[streamType]
  }
  else if (mpegts.MISCType2AVCodecId[streamType]) {
    info = mpegts.MISCType2AVCodecId[streamType]
  }
  else if (mpegts.HLSSampleEncType2AVCodecId[streamType]) {
    info = mpegts.HLSSampleEncType2AVCodecId[streamType]
  }
  if (info) {
    stream.codecpar.codecType = info[0]
    stream.codecpar.codecId = info[1]
  }
  else {
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA
  }

  const descriptorList = mpegtsContext.pmt.pid2ESDescriptor.get(pid)
  if (descriptorList) {
    descriptorList.forEach((descriptor) => {
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_NONE) {
        const info = mpegts.DESCType2AVCodecId[descriptor.tag]
        if (info) {
          stream.codecpar.codecType = info[0]
          stream.codecpar.codecId = info[1]
        }
      }

      switch (descriptor.tag) {
        // REGISTRATION_DESCRIPTOR
        case TSDescriptor.REGISTRATION: {
          if (descriptor.buffer?.length >= 4) {
            const tag = String.fromCharCode(descriptor.buffer[0])
              + String.fromCharCode(descriptor.buffer[1])
              + String.fromCharCode(descriptor.buffer[2])
              + String.fromCharCode(descriptor.buffer[3])
            const info = mpegts.REGDType2AVCodecId[tag]
            if (info) {
              stream.codecpar.codecType = info[0]
              stream.codecpar.codecId = info[1]
              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
                stream.codecpar.sampleRate = 48000
              }
            }
            else if ((tag === 'HDMV' || tag === 'HDPR')
              && stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_NONE
            ) {
              const info = mpegts.HDMVType2AVCodecId[streamType]
              if (info) {
                stream.codecpar.codecType = info[0]
                stream.codecpar.codecId = info[1]
              }
            }
          }
          break
        }
        // DVB extension descriptor
        case 0x7f: {
          const extDescTag = descriptor.buffer[0]
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS
            && extDescTag === 0x80
          ) {
            stream.codecpar.chLayout.nbChannels = ((descriptor.buffer[1] & 0x0F) === 0 )
              ? 2
              : (descriptor.buffer[1] & 0x0F)

            const buffer = opus.avCodecParameters2Extradata(stream.codecpar)
            if (buffer) {
              stream.codecpar.extradata = avMalloc(buffer.length)
              memcpyFromUint8Array(stream.codecpar.extradata, buffer.length, buffer)
              stream.codecpar.extradataSize = buffer.length
            }
          }
          break
        }
        // extradata
        case 0x80: {
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
            stream.codecpar.extradata = avMalloc(descriptor.buffer.length)
            memcpyFromUint8Array(stream.codecpar.extradata, descriptor.buffer.length, descriptor.buffer)
            stream.codecpar.extradataSize = descriptor.buffer.length
          }
          break
        }
      }
    })
  }

  let filter: AVBSFilter

  switch (streamType) {
    case mpegts.TSStreamType.AUDIO_AAC:
      filter = new AACADTS2RawFilter()
      break
    case mpegts.TSStreamType.AUDIO_AAC_LATM:
      filter = new AACLATM2RawFilter()
      break
    case mpegts.TSStreamType.PRIVATE_DATA:
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
        filter = new OpusMpegts2RawFilter()
      }
      break
  }

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
  ) {
    stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB
  }

  if (filter) {
    (stream.privData as MpegtsStreamContext).filter = filter
    filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
  }

  return stream
}
