/*
 * libmedia mp4 esds box parser
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
import { Atom, MOVContext } from '../type'
import * as logger from 'common/util/logger'
import { MP4Tag } from '../boxType'
import { AVCodecID, AVPacketSideDataType } from 'avutil/codec'
import { Mp4aObj2AVCodecID } from '../mov'
import { avFree, avMalloc } from 'avutil/util/mem'
import { mapSafeUint8Array } from 'cheap/std/memory'
import * as aac from 'avutil/codecs/aac'
import * as opus from 'avutil/codecs/opus'

async function readDescriptorLength(ioReader: IOReader) {
  let len = 0
  for (let i = 0; i < 4; i++) {
    const c = await ioReader.readUint8()
    len = (len << 7) | (c & 0x7f)
    if (!(c & 0x80)) {
      break
    }
  }
  return len
}

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  // version = 0
  await ioReader.skip(4)

  let endPos = ioReader.getPos() + static_cast<int64>(atom.size - 4)

  while (ioReader.getPos() < endPos) {
    let tag = await ioReader.readUint8()
    let size = await readDescriptorLength(ioReader)

    if (size === 0) {
      logger.warn('esds invalid descriptor size 0, skip')
      await ioReader.skip(Number(endPos - ioReader.getPos()))
      continue
    }

    // ES descriptor
    if (tag === MP4Tag.MP4_ES_DESCR_TAG) {
      let subEndPos = ioReader.getPos() + static_cast<int64>(size)
      // track_id
      await ioReader.skip(2)
      // flags = 0
      await ioReader.skip(1)

      tag = await ioReader.readUint8()
      size = await readDescriptorLength(ioReader)

      if (size === 0) {
        logger.warn('esds invalid ES descriptor size 0, skip')
        await ioReader.skip(Number(subEndPos - ioReader.getPos()))
        continue
      }

      // DecoderConfig descriptor
      if (tag === MP4Tag.MP4_DEC_CONFIG_DESCR_TAG) {
        stream.codecpar.codecId = Mp4aObj2AVCodecID[await ioReader.readUint8()]

        /*
         * the following fields is made of 6 bits to identify the streamtype (4 for video, 5 for audio)
         * plus 1 bit to indicate upstream and 1 bit set to 1 (reserved)
         */
        await ioReader.skip(1)

        // Buffersize DB
        await ioReader.skip(3)
        // maxbitrate
        await ioReader.skip(4)
        // avgbitrate
        await ioReader.skip(4)

        if (ioReader.getPos() < (subEndPos - 5n)) {
          tag = await ioReader.readUint8()
          size = await readDescriptorLength(ioReader)

          // DecoderSpecific info descriptor
          if (tag === MP4Tag.MP4_DEC_SPECIFIC_DESCR_TAG) {
            const data: pointer<uint8> = avMalloc(size)
            const extradata = await ioReader.readBuffer(size, mapSafeUint8Array(data, size))
            if (movContext.foundMoov) {
              stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = extradata.slice()
              avFree(data)
            }
            else {
              stream.codecpar.extradata = data
              stream.codecpar.extradataSize = size
              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
                aac.parseAVCodecParameters(stream, extradata.slice())
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
                opus.parseAVCodecParameters(stream, extradata.slice())
              }
            }
          }
          else {
            await ioReader.skip(Number(subEndPos - ioReader.getPos()))
          }
        }
        else {
          await ioReader.skip(Number(subEndPos - ioReader.getPos()))
        }
      }
      else {
        await ioReader.skip(Math.min(size, Number(subEndPos - ioReader.getPos())))
      }
    }
    else {
      await ioReader.skip(Math.min(size, Number(endPos - ioReader.getPos())))
    }
  }


  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read vpcc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
