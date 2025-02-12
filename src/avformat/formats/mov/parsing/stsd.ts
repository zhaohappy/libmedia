/*
 * libmedia mp4 stsd box parser
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
import Stream from 'avutil/AVStream'
import { Atom, MOVContext, MOVStreamContext } from '../type'
import * as logger from 'common/util/logger'
import mktag from '../../../function/mktag'
import { BoxType } from '../boxType'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { tag2CodecId } from '../mov'

import avcc from './avcc'
import hvcc from './hvcc'
import vvcc from './vvcc'
import vpcc from './vpcc'
import av1c from './av1c'
import esds from './esds'
import wave from './wave'
import dfla from './dfla'
import dops from './dops'
import colr from './colr'

import ac3 from './dac3'
import eac3 from './dec3'
import { AVStreamMetadataKey } from 'avutil/AVStream'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {
  const now = ioReader.getPos()

  // version
  const version = await ioReader.readUint8()
  // flags
  await ioReader.skip(3)

  const streamContext = stream.privData as MOVStreamContext

  const entryCount = await ioReader.readUint32()

  for (let i = 0; i < entryCount; i++) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()
    const endPos = ioReader.getPos() + static_cast<int64>(size - 8)

    if (tag2CodecId[type]) {
      stream.codecpar.codecId = tag2CodecId[type]
    }

    if (size === 0) {
      logger.warn('stsd entry invalid box size 0, skip')
      await ioReader.skip(Number(endPos - ioReader.getPos()))
      break
    }

    if (size >= 16) {
      // reserved
      await ioReader.skip(6)

      // referenceIndex uin16
      await ioReader.skip(2)
    }
    else if (size <= 7) {
      logger.fatal(`invalid size: ${size} in stsd`)
    }

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      // version
      await ioReader.skip(2)
      // revision level
      await ioReader.skip(2)
      // vendor
      stream.metadata[AVStreamMetadataKey.VENDOR_ID] = await ioReader.readString(4)
      // temporal quality
      await ioReader.skip(4)
      // spatial quality
      await ioReader.skip(4)

      stream.codecpar.width = await ioReader.readUint16()
      stream.codecpar.height = await ioReader.readUint16()

      // horizresolution uin32
      await ioReader.skip(4)
      // vertresolution uin32
      await ioReader.skip(4)

      // data size = 0 uin32
      await ioReader.skip(4)

      // frames per samples = 1 uin16
      await ioReader.skip(2)

      let len = await ioReader.readUint8()
      if (len > 31) {
        len = 31
      }
      stream.metadata[AVStreamMetadataKey.ENCODER] = await ioReader.readString(len)
      if (len < 31) {
        await ioReader.skip(31 - len)
      }

      // depth uin16
      await ioReader.skip(2)

      // Reserved
      await ioReader.skip(2)

      while (ioReader.getPos() < endPos) {
        const size = await ioReader.readUint32()
        const type = await ioReader.readUint32()

        if (size === 0) {
          logger.warn('stsd video invalid box size 0, skip')
          await ioReader.skip(Number(endPos - ioReader.getPos()))
          continue
        }

        if (type === mktag(BoxType.AVCC)) {
          await avcc(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.HVCC)) {
          await hvcc(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.VVCC)) {
          await vvcc(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.AV1C)) {
          await av1c(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.VPCC)) {
          await vpcc(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.ESDS)) {
          await esds(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.WAVE)) {
          await wave(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.COLR)) {
          await colr(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else {
          await ioReader.skip(Math.min(size - 8, Number(endPos - ioReader.getPos())))
        }
      }
    }
    else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      // SoundDescription Version
      const subVersion = await ioReader.readUint16()

      // Revision level
      await ioReader.skip(2)

      stream.metadata[AVStreamMetadataKey.VENDOR_ID] = await ioReader.readString(4)

      stream.codecpar.chLayout.nbChannels = await ioReader.readUint16()
      stream.codecpar.bitsPerCodedSample = await ioReader.readUint16()

      streamContext.audioCid = await ioReader.readUint16()

      // packet size = 0 
      await ioReader.skip(2)

      stream.codecpar.sampleRate = (await ioReader.readUint32()) >>> 16

      if (!movContext.isom || (version === 0 && subVersion > 0)) {
        if (subVersion === 1) {
          streamContext.samplesPerFrame = await ioReader.readUint32()
          // bytes per packet
          await ioReader.skip(4)

          streamContext.bytesPerFrame = await ioReader.readUint32()
          // bytes per sample
          await ioReader.skip(4)
        }
        else if (subVersion === 2) {
          // sizeof struct only
          await ioReader.skip(4)
          stream.codecpar.sampleRate = Number(await ioReader.readUint64())
          stream.codecpar.chLayout.nbChannels = await ioReader.readUint32()
          // always 0x7F000000
          await ioReader.skip(4)
          stream.codecpar.bitsPerCodedSample = await ioReader.readUint32()
          // lpcm format specific flag
          await ioReader.skip(4)
          streamContext.bytesPerFrame = await ioReader.readUint32()
          streamContext.samplesPerFrame = await ioReader.readUint32()
        }
      }

      while (ioReader.getPos() < endPos) {
        const size = await ioReader.readUint32()
        const type = await ioReader.readUint32()

        if (size === 0) {
          logger.warn('stsd audio invalid box size 0, skip')
          await ioReader.skip(Number(endPos - ioReader.getPos()))
          continue
        }

        if (type === mktag(BoxType.ESDS)) {
          await esds(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.DFLA)) {
          await dfla(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.DOPS)) {
          await dops(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.WAVE)) {
          await wave(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.DAC3)) {
          await ac3(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else if (type === mktag(BoxType.DEC3)) {
          await eac3(
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
        }
        else {
          await ioReader.skip(Math.min(size - 8, Number(endPos - ioReader.getPos())))
        }
      }
    }
    else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
      if (type === mktag(BoxType.STPP)) {
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_TTML
      }
      else if (type === mktag(BoxType.WVTT)) {
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_WEBVTT
      }
      else if (type === mktag(BoxType.TX3G) || type === mktag(BoxType.TEXT)) {
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_MOV_TEXT
      }
      else if (type === mktag(BoxType.C608)) {
        stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_EIA_608
      }
      await ioReader.skip(Math.min(size - 8, Number(endPos - ioReader.getPos())))
    }
    else {
      await ioReader.skip(Math.min(size - 8, Number(endPos - ioReader.getPos())))
    }
  }

  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read stsd error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
