/*
 * libmedia mp4 box writers
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
import IOWriter from 'common/io/IOWriterSync'
import Stream from 'avutil/AVStream'
import { MOVContext } from '../type'

import stts from './stts'
import ctts from './ctts'
import stss from './stss'
import stsz from './stsz'
import stsc from './stsc'
import stco from './stco'
import co64 from './co64'
import mdhd from './mdhd'
import mvhd from './mvhd'
import tkhd from './tkhd'
import hdlr from './hdlr'
import stsd from './stsd'
import vmhd from './vmhd'
import edts from './edts'
import smhd from './smhd'
import dref from './dref'

import trex from './trex'
import mfhd from './mfhd'
import tfhd from './tfhd'
import tfdt from './tfdt'
import trun from './trun'
import minfHdlr from './minfHdlr'


const writers: Partial<Record<BoxType, (ioWriter: IOWriter, stream: Stream, movContext: MOVContext) => void>> = {
  [BoxType.STTS]: stts,
  [BoxType.CTTS]: ctts,
  [BoxType.STSS]: stss,
  [BoxType.STSZ]: stsz,
  [BoxType.STSC]: stsc,
  [BoxType.STCO]: stco,
  [BoxType.CO64]: co64,
  [BoxType.MDHD]: mdhd,
  [BoxType.MVHD]: mvhd,
  [BoxType.TKHD]: tkhd,
  [BoxType.HDLR]: hdlr,
  [BoxType.STSD]: stsd,
  [BoxType.VMHD]: vmhd,
  [BoxType.EDTS]: edts,
  [BoxType.SMHD]: smhd,
  [BoxType.DREF]: dref,

  [BoxType.TREX]: trex,
  [BoxType.MFHD]: mfhd,
  [BoxType.TFHD]: tfhd,
  [BoxType.TFDT]: tfdt,
  [BoxType.TRUN]: trun,

  [BoxType.MINF_HDLR]: minfHdlr
}

export default writers
