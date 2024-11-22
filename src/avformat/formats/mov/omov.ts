/*
 * libmedia mp4 encode util
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

import { MOVContext, MOVStreamContext } from './type'
import IOWriter from 'common/io/IOWriterSync'
import mktag from '../../function/mktag'
import { BoxType, FullBoxs } from './boxType'
import * as array from 'common/util/array'
import { AVOFormatContext } from '../../AVFormatContext'
import Stream from 'avutil/AVStream'
import writers from './writing/writers'
import { BoxLayout, FragmentTrackBoxLayoutMap, MoofTrafBoxLayout, TrackBoxLayoutMap } from './layout'
import updatePositionSize from './function/updatePositionSize'

export function updateSize(ioWriter: IOWriter, pointer: number, size: number) {
  const current = ioWriter.getPointer()
  ioWriter.seekInline(pointer)
  ioWriter.writeUint32(size)
  ioWriter.seekInline(current)
}

export function writeFtyp(ioWriter: IOWriter, context: MOVContext) {
  ioWriter.flush()

  const pointer = ioWriter.getPointer()
  const now = ioWriter.getPos()

  ioWriter.writeUint32(0)
  ioWriter.writeUint32(mktag(BoxType.FTYP))

  ioWriter.writeUint32(context.majorBrand || mktag('isom'))
  ioWriter.writeUint32(context.minorVersion || 512)
  array.each(context.compatibleBrand, (value) => {
    ioWriter.writeUint32(value)
  })

  updateSize(ioWriter, pointer, Number(ioWriter.getPos() - now))

  if (context.isom) {
    ioWriter.writeUint32(8)
    ioWriter.writeUint32(mktag(BoxType.WIDE))
  }
  else if (!context.fragment) {
    ioWriter.writeUint32(8)
    ioWriter.writeUint32(mktag(BoxType.FREE))
  }
}

function writeEmptyBox(ioWriter: IOWriter, tag: BoxType) {
  const isFullBox = array.has(FullBoxs, tag)
  ioWriter.writeUint32(isFullBox ? 12 : 8)
  ioWriter.writeUint32(mktag(tag))

  if (isFullBox) {
    // version & flags
    ioWriter.writeUint32(0)
  }
}

function writeLayout(ioWriter: IOWriter, layouts: BoxLayout[], stream: Stream, movContext: MOVContext) {
  array.each(layouts, (layout) => {
    if (!layout) {
      return true
    }
    if (writers[layout.type]) {
      writers[layout.type](ioWriter, stream, movContext)
    }
    else if (layout.children) {
      const pos = ioWriter.getPos()
      ioWriter.writeUint32(0)
      ioWriter.writeUint32(mktag(layout.type))
      writeLayout(ioWriter, layout.children, stream, movContext)
      movContext.boxsPositionInfo.push({
        pos,
        type: layout.type,
        size: Number(ioWriter.getPos() - pos)
      })
    }
    else {
      writeEmptyBox(ioWriter, layout.type)
    }
  })
}

export function writeMoov(ioWriter: IOWriter, formatContext: AVOFormatContext, movContext: MOVContext) {
  const pos = ioWriter.getPos()

  ioWriter.writeUint32(0)
  ioWriter.writeUint32(mktag(BoxType.MOOV))

  writers[BoxType.MVHD](ioWriter, null, movContext)
  array.each(formatContext.streams, (stream) => {
    const pos = ioWriter.getPos()
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(mktag(BoxType.TRAK))

    writeLayout(
      ioWriter,
      movContext.fragment
        ? FragmentTrackBoxLayoutMap[stream.codecpar.codecType](movContext)
        : TrackBoxLayoutMap[stream.codecpar.codecType](movContext),
      stream,
      movContext
    )

    movContext.boxsPositionInfo.push({
      pos,
      type: BoxType.TRAK,
      size: Number(ioWriter.getPos() - pos)
    })
  })

  if (movContext.fragment) {
    const pos = ioWriter.getPos()
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(mktag(BoxType.MVEX))

    array.each(formatContext.streams, (stream) => {
      writers[BoxType.TREX](ioWriter, stream, movContext)
    })

    movContext.boxsPositionInfo.push({
      pos,
      type: BoxType.MVEX,
      size: Number(ioWriter.getPos() - pos)
    })
  }

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.MOOV,
    size: Number(ioWriter.getPos() - pos)
  })
  updatePositionSize(ioWriter, movContext)
}

export function writeMoof(ioWriter: IOWriter, formatContext: AVOFormatContext, movContext: MOVContext) {
  const pos = ioWriter.getPos()

  ioWriter.writeUint32(0)
  ioWriter.writeUint32(mktag(BoxType.MOOF))

  writers[BoxType.MFHD](ioWriter, null, movContext)

  array.each(movContext.currentFragment.tracks, (track) => {

    if (!track.sampleCount) {
      return true
    }

    const pos = ioWriter.getPos()
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(mktag(BoxType.TRAF))

    const stream = formatContext.streams.find((stream) => {
      return (stream.privData as MOVStreamContext).trackId === track.trackId
    })

    writeLayout(
      ioWriter,
      MoofTrafBoxLayout,
      stream,
      movContext
    )

    movContext.boxsPositionInfo.push({
      pos,
      type: BoxType.TRAF,
      size: Number(ioWriter.getPos() - pos)
    })
  })

  const size = Number(ioWriter.getPos() - pos)

  movContext.boxsPositionInfo.push({
    pos,
    type: BoxType.MOOF,
    size
  })

  movContext.currentFragment.size = size
}
