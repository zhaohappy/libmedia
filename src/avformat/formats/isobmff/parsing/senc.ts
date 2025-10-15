/*
 * libmedia mp4 saio box parser
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
import type Stream from 'avutil/AVStream'
import type { Atom, IsobmffContext } from '../type'
import * as logger from 'common/util/logger'
import type { EncryptionInfo } from 'avutil/struct/encryption'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, isobmffContext: IsobmffContext) {
  const now = ioReader.getPos()

  const trackContext = isobmffContext.currentFragment.currentTrack
  const cenc = isobmffContext.cencs ? isobmffContext.cencs[trackContext.trackId] : null

  await ioReader.readUint8()
  const flags = await ioReader.readUint24()

  if (!trackContext.cenc) {
    trackContext.cenc = {
      defaultSampleInfoSize: 0,
      sampleCount: 0,
      offset: 0,
      useSubsamples: false,
      sampleEncryption: [],
      sampleSizes: [],
      sampleInfoOffset: []
    }
  }
  const count  = await ioReader.readUint32()
  const useSubsamples = flags & 0x02
  const ivSize = cenc.defaultPerSampleIVSize

  for (let i = 0; i < count; i++) {
    const item: Omit<EncryptionInfo, 'scheme' | 'keyId' | 'cryptByteBlock' | 'skipByteBlock'> = {
      iv: ivSize ? await ioReader.readBuffer(ivSize) : cenc.defaultConstantIV,
      subsamples: []
    }
    if (useSubsamples) {
      const subsampleCount = await ioReader.readUint16()
      for (let j = 0; j < subsampleCount; j++) {
        item.subsamples.push({
          bytesOfClearData: await ioReader.readUint16(),
          bytesOfProtectedData: await ioReader.readUint32()
        })
      }
    }
    trackContext.cenc.sampleEncryption.push(item)
  }
  if (useSubsamples) {
    trackContext.cenc.useSubsamples = true
  }
  const remainingLength = atom.size - Number(ioReader.getPos() - now)
  if (remainingLength > 0) {
    await ioReader.skip(remainingLength)
  }
  else if (remainingLength < 0) {
    logger.error(`read senc error, size: ${atom.size}, read: ${atom.size - remainingLength}`)
  }
}
