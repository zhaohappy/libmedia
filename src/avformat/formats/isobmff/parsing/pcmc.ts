/*
 * libmedia mp4 pcm box parser
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

import type IOReader from 'common/io/IOReader'
import { AVCodecID } from 'avutil/codec'
import type Stream from 'avutil/AVStream'
import type { Atom, IsobmffContext, IsobmffStreamContext } from '../type'
import * as logger from 'common/util/logger'
import mktag from '../../../function/mktag'
import { getBitsPerSample } from 'avutil/util/pcm'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, isobmffContext: IsobmffContext) {

  const now = ioReader.getPos()

  await ioReader.readUint8()
  await ioReader.readUint24()

  const formatFlags = await ioReader.readUint8()
  const pcmSampleSize = await ioReader.readUint8()
  const isLittleEndian = formatFlags & 1

  const streamContext = stream.privData as IsobmffStreamContext

  if (streamContext.format === mktag('fpcm')) {
    switch (pcmSampleSize) {
      case 32:
        stream.codecpar.codecId = isLittleEndian ? AVCodecID.AV_CODEC_ID_PCM_F32LE : AVCodecID.AV_CODEC_ID_PCM_F32BE
        break
      case 64:
        stream.codecpar.codecId = isLittleEndian ? AVCodecID.AV_CODEC_ID_PCM_F64LE : AVCodecID.AV_CODEC_ID_PCM_F64BE
        break
      default:
        logger.error(`invalid pcmSampleSize: ${pcmSampleSize}`)
        break
    }
  }
  else if (streamContext.format === mktag('ipcm')) {
    switch (pcmSampleSize) {
      case 16:
        stream.codecpar.codecId = isLittleEndian ? AVCodecID.AV_CODEC_ID_PCM_S16LE : AVCodecID.AV_CODEC_ID_PCM_S16BE
        break
      case 24:
        stream.codecpar.codecId = isLittleEndian ? AVCodecID.AV_CODEC_ID_PCM_S24LE : AVCodecID.AV_CODEC_ID_PCM_S24BE
        break
      case 32:
        stream.codecpar.codecId = isLittleEndian ? AVCodecID.AV_CODEC_ID_PCM_S32LE : AVCodecID.AV_CODEC_ID_PCM_S32BE
        break
      default:
        logger.error(`invalid pcmSampleSize: ${pcmSampleSize}`)
        break
    }
  }

  streamContext.isPcm = true

  if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_NONE) {
    stream.codecpar.bitsPerCodedSample = getBitsPerSample(stream.codecpar.codecId)
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read pcmc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
