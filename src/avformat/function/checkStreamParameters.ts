/*
 * libmedia check stream parameters
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

import { AVIFormatContext, AVOFormatContext } from '../AVFormatContext'
import {  NOPTS_VALUE } from 'avutil/constant'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as array from 'common/util/array'
import { avQ2D } from 'avutil/util/rational'

export function checkStreamParameters(context: AVIFormatContext | AVOFormatContext) {
  let result = true
  array.each(context.streams, (stream) => {
    switch (stream.codecpar.codecType) {
      case AVMediaType.AVMEDIA_TYPE_AUDIO:
        if (stream.codecpar.chLayout.nbChannels === NOPTS_VALUE
          || stream.codecpar.sampleRate === NOPTS_VALUE
          || stream.codecpar.frameSize === NOPTS_VALUE
          || stream.codecpar.bitrate === 0n
        ) {
          result = false
        }
        break
      case AVMediaType.AVMEDIA_TYPE_VIDEO:
        if (avQ2D(stream.codecpar.framerate) === 0
          || stream.codecpar.width === NOPTS_VALUE
          || stream.codecpar.height === NOPTS_VALUE
          || stream.codecpar.bitrate === 0n
        ) {
          result = false
        }

        if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        )
          && (
            stream.codecpar.profile === NOPTS_VALUE
              || stream.codecpar.level === NOPTS_VALUE
          )
        ) {
          result = false
        }
        break
    }
  })

  return result
}
