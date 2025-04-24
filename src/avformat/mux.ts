/*
 * libmedia mux util
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

import AVPacket from 'avutil/struct/avpacket'
import { AVOFormatContext } from './AVFormatContext'
import * as object from 'common/util/object'
import * as logger from 'common/util/logger'
import { OFormatSupportedCodecs } from './formats/OFormat'
import * as array from 'common/util/array'
import { AVFormat } from 'avutil/avformat'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import * as errorType from 'avutil/error'
import { dumpCodecName, dumpFormatName } from './dump'
import { NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as bigint from 'common/util/bigint'

export type MuxOptions = {
  zeroStart?: boolean
  nonnegative?: boolean
}

interface MuxPrivateData {
  firstPts: Map<number, int64>
  firstDts: Map<number, int64>
  dtsPtsDelta: Map<number, int64>
}

const defaultMuxOptions: MuxOptions = {
  zeroStart: false,
  nonnegative: false
}

export function open(formatContext: AVOFormatContext, options: MuxOptions = {}) {
  const opts = object.extend({}, defaultMuxOptions, options)
  if (!formatContext.ioWriter) {
    logger.fatal('need ioWriter')
  }
  if (!formatContext.oformat) {
    logger.fatal('need oformat')
  }
  formatContext.options = opts

  formatContext.privateData2 = {
    firstPts: new Map(),
    firstDts: new Map(),
    dtsPtsDelta: new Map()
  }

  let supportCodecs = OFormatSupportedCodecs[formatContext.oformat.type]
  if (supportCodecs) {
    for (let i = 0; i < formatContext.streams.length; i++) {
      const codecId = formatContext.streams[i].codecpar.codecId
      const codecType = formatContext.streams[i].codecpar.codecType
      if (formatContext.oformat.type === AVFormat.WAV) {
        if (codecId < AVCodecID.AV_CODEC_ID_PCM_S16LE
          || codecId > AVCodecID.AV_CODEC_ID_ADPCM_XMD
        ) {
          logger.error(`format ${dumpFormatName(formatContext.oformat.type)} not support codecId ${dumpCodecName(formatContext.streams[i].codecpar.codecType, codecId)}`)
          return errorType.CODEC_NOT_SUPPORT
        }
      }
      else if (codecType !== AVMediaType.AVMEDIA_TYPE_DATA
        && codecType !== AVMediaType.AVMEDIA_TYPE_ATTACHMENT
        && !array.has(supportCodecs, codecId)
      ) {
        logger.error(`format ${dumpFormatName(formatContext.oformat.type)} not support codecId ${dumpCodecName(formatContext.streams[i].codecpar.codecType, codecId)}`)
        return errorType.CODEC_NOT_SUPPORT
      }
    }
  }
  return formatContext.oformat.init(formatContext)
}

export function writeHeader(formatContext: AVOFormatContext): number {
  formatContext.oformat.writeHeader(formatContext)
  return 0
}

export function writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {
  const privateData = formatContext.privateData2 as MuxPrivateData
  if (!privateData.firstDts.has(avpacket.streamIndex)) {
    privateData.firstDts.set(avpacket.streamIndex, avpacket.dts === NOPTS_VALUE_BIGINT ? 0n : avpacket.dts)
  }
  if (!privateData.firstPts.has(avpacket.streamIndex)) {
    privateData.firstPts.set(avpacket.streamIndex, avpacket.pts === NOPTS_VALUE_BIGINT ? 0n : avpacket.pts)
    privateData.dtsPtsDelta.set(avpacket.streamIndex, bigint.min(privateData.firstDts.get(avpacket.streamIndex), privateData.firstPts.get(avpacket.streamIndex)))
  }
  if ((formatContext.options as MuxOptions).zeroStart) {
    avpacket.dts -= privateData.dtsPtsDelta.get(avpacket.streamIndex)
    avpacket.pts -= privateData.dtsPtsDelta.get(avpacket.streamIndex)
  }
  else if ((formatContext.options as MuxOptions).nonnegative) {
    if (privateData.firstDts.get(avpacket.streamIndex) < 0
      || privateData.firstPts.get(avpacket.streamIndex) < 0
    ) {
      avpacket.dts -= privateData.dtsPtsDelta.get(avpacket.streamIndex)
      avpacket.pts -= privateData.dtsPtsDelta.get(avpacket.streamIndex)
    }
  }

  return formatContext.oformat.writeAVPacket(formatContext, avpacket)
}

export function writeTrailer(formatContext: AVOFormatContext): number {
  formatContext.oformat.writeTrailer(formatContext)
  return 0
}

export function flush(formatContext: AVOFormatContext) {
  formatContext.oformat.flush(formatContext)
}
