/*
 * libmedia mp4 box parsers map
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

import { BoxType } from '../boxType'
import IOReader from 'common/io/IOReader'
import Stream from 'avutil/AVStream'
import { Atom, MOVContext } from '../type'

import stts from './stts'
import ctts from './ctts'
import stss from './stss'
import stsz from './stsz'
import stz2 from './stz2'
import stsc from './stsc'
import stco from './stco'
import co64 from './co64'
import mdhd from './mdhd'
import mvhd from './mvhd'
import tkhd from './tkhd'
import hdlr from './hdlr'
import stsd from './stsd'

import trex from './trex'
import mfhd from './mfhd'
import tfhd from './tfhd'
import tfdt from './tfdt'
import trun from './trun'
import elst from './elst'

import mktag from '../../../function/mktag'

const parsers: Partial<Record<
number,
(ioReader: IOReader, stream: Stream, atom: Atom, movContext: MOVContext) => Promise<void>>
> = {
  [mktag(BoxType.STTS)]: stts,
  [mktag(BoxType.CTTS)]: ctts,
  [mktag(BoxType.STSS)]: stss,
  [mktag(BoxType.STSZ)]: stsz,
  [mktag(BoxType.STZ2)]: stz2,
  [mktag(BoxType.STSC)]: stsc,
  [mktag(BoxType.STCO)]: stco,
  [mktag(BoxType.CO64)]: co64,
  [mktag(BoxType.MDHD)]: mdhd,
  [mktag(BoxType.MVHD)]: mvhd,
  [mktag(BoxType.TKHD)]: tkhd,
  [mktag(BoxType.HDLR)]: hdlr,
  [mktag(BoxType.STSD)]: stsd,
  [mktag(BoxType.ELST)]: elst,

  [mktag(BoxType.TREX)]: trex,
  [mktag(BoxType.MFHD)]: mfhd,
  [mktag(BoxType.TFHD)]: tfhd,
  [mktag(BoxType.TFDT)]: tfdt,
  [mktag(BoxType.TRUN)]: trun
}

export default parsers
