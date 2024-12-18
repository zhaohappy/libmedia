/*
 * libmedia wave av1c box parser
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
import mktag from '../../../function/mktag'
import { BoxType } from '../boxType'
import esds from './esds'

export default async function read(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) {

  const now = ioReader.getPos()

  const endPos = now + static_cast<int64>(atom.size)

  while (ioReader.getPos() < endPos) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (size === 0) {
      logger.warn('wave invalid box size 0, skip')
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
    else {
      await ioReader.skip(Math.min(size - 8, Number(endPos - ioReader.getPos())))
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
