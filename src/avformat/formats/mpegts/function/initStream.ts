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

import { MpegtsContext, MpegtsStreamContext, PID } from '../type'
import createMpegtsStreamContext from './createMpegtsStreamContext'
import * as mpegts from '../mpegts'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import AVBSFilter from '../../../bsf/AVBSFilter'
import AACADTS2RawFilter from '../../../bsf/aac/ADTS2RawFilter'
import AACLATM2RawFilter from '../../../bsf/aac/LATM2RawFilter'
import OpusMpegts2RawFilter from '../../../bsf/opus/Mpegts2RawFilter'
import Stream from 'avutil/AVStream'
import * as opus from 'avutil/codecs/opus'
import { avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { BitFormat } from 'avutil/codecs/h264'

export default function initStream(pid: PID, stream: Stream, mpegtsContext: MpegtsContext) {

  stream.timeBase.den = 90000
  stream.timeBase.num = 1

  const streamContext = createMpegtsStreamContext()

  streamContext.pid = pid
  stream.privData = streamContext

  const streamType = mpegtsContext.pmt.pid2StreamType.get(pid)

  if (streamType === mpegts.TSStreamType.PRIVATE_DATA) {
    const descriptorList = mpegtsContext.pmt.pid2ESDescriptor.get(pid)
    stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA

    if (descriptorList) {
      const regDescriptor = descriptorList.find((descriptor) => {
        return descriptor.tag === 0x05
      })

      if (regDescriptor && regDescriptor.buffer?.length >= 4) {
        if (String.fromCharCode(regDescriptor.buffer[0]) === 'O'
          || String.fromCharCode(regDescriptor.buffer[1]) === 'p'
          || String.fromCharCode(regDescriptor.buffer[2]) === 'u'
          || String.fromCharCode(regDescriptor.buffer[3]) === 's'
        ) {
          stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
          stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_OPUS
          stream.codecpar.sampleRate = 48000

          const extDescriptor = descriptorList.find((descriptor) => {
            return descriptor.tag === 0x7f
          })

          if (extDescriptor) {
            const extDescTag = extDescriptor.buffer[0]

            if (extDescTag === 0x80) {
              stream.codecpar.chLayout.nbChannels = ((extDescriptor.buffer[1] & 0x0F) === 0 )
                ? 2
                : (extDescriptor.buffer[1] & 0x0F)


              const buffer = opus.avCodecParameters2Extradata(stream.codecpar)
              if (buffer) {
                stream.codecpar.extradata = avMalloc(buffer.length)
                memcpyFromUint8Array(stream.codecpar.extradata, buffer.length, buffer)
                stream.codecpar.extradataSize = buffer.length
              }
            }
          }
        }
        else if (String.fromCharCode(regDescriptor.buffer[0]) === 'A'
          || String.fromCharCode(regDescriptor.buffer[1]) === 'V'
          || String.fromCharCode(regDescriptor.buffer[2]) === '0'
          || String.fromCharCode(regDescriptor.buffer[3]) === '1'
        ) {
          stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
          stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AV1
          const extDescriptor = descriptorList.find((descriptor) => {
            return descriptor.tag === 0x80
          })
          if (extDescriptor) {
            stream.codecpar.extradata = avMalloc(extDescriptor.buffer.length)
            memcpyFromUint8Array(stream.codecpar.extradata, extDescriptor.buffer.length, extDescriptor.buffer)
            stream.codecpar.extradataSize = extDescriptor.buffer.length
          }
        }
      }
    }
  }
  else {
    const info = mpegts.StreamType2AVCodecId[streamType]
    if (info) {
      stream.codecpar.codecType = info[0]
      stream.codecpar.codecId = info[1]
    }
    else {
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA
    }
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
    stream.codecpar.bitFormat = BitFormat.ANNEXB
  }

  if (filter) {
    (stream.privData as MpegtsStreamContext).filter = filter
    filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
  }

  return stream
}
