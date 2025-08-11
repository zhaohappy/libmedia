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
import { getSideData } from 'avutil/util/avpacket'
import { AVPacketSideDataType } from 'avutil/codec'
import { encryptionSideData2InitInfo } from 'avutil/util/encryption'
import { mapUint8Array } from 'cheap/std/memory'
import { EncryptionInitInfo } from 'avutil/struct/encryption'

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

function writePssh(ioWriter: IOWriter, formatContext: AVOFormatContext, movContext: MOVContext) {
  const pssh: EncryptionInitInfo[] = []

  function has(info: EncryptionInitInfo) {
    if (!pssh.length) {
      return false
    }
    for (let i = 0; i < pssh.length; i++) {
      const item = pssh[i]
      if (!array.same(item.systemId, info.systemId)) {
        return false
      }
      if (!item.keyIds || !info.keyIds) {
        return false
      }
      if (item.keyIds.length !== info.keyIds.length) {
        return false
      }
      for (let i = 0; i < item.keyIds.length; i++) {
        if (!array.same(item.keyIds[i], info.keyIds[i])) {
          return false
        }
      }
      if (!array.same(item.data, info.data)) {
        return false
      }
    }
    return true
  }
  array.each(formatContext.streams, (stream) => {
    const sideData = getSideData(
      addressof(stream.codecpar.codedSideData),
      addressof(stream.codecpar.nbCodedSideData),
      AVPacketSideDataType.AV_PKT_DATA_ENCRYPTION_INIT_INFO
    )
    if (sideData) {
      const infos = encryptionSideData2InitInfo(mapUint8Array(sideData.data, sideData.size))
      infos.forEach((info) => {
        if (!has(info)) {
          pssh.push(info)
        }
      })
    }
  })

  if (pssh.length) {
    pssh.forEach((info) => {
      const pos = ioWriter.getPos()
      ioWriter.writeUint32(0)
      ioWriter.writeUint32(mktag(BoxType.PSSH))

      // version
      ioWriter.writeUint8(1)
      ioWriter.writeUint24(0)
      ioWriter.writeBuffer(info.systemId)
      ioWriter.writeUint32(info.keyIds.length)
      info.keyIds.forEach((keyId) => {
        ioWriter.writeBuffer(keyId)
      })
      ioWriter.writeUint32(info.data.length)
      ioWriter.writeBuffer(info.data)

      movContext.boxsPositionInfo.push({
        pos,
        type: BoxType.PSSH,
        size: Number(ioWriter.getPos() - pos)
      })
    })
  }
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
        : TrackBoxLayoutMap[stream.codecpar.codecType](movContext, stream),
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

    if (!movContext.ignoreEncryption) {
      writePssh(ioWriter, formatContext, movContext)
    }
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
      MoofTrafBoxLayout(track),
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

export function writeMfra(ioWriter: IOWriter, formatContext: AVOFormatContext, movContext: MOVContext) {
  let size = 8 + 16
  array.each(movContext.currentFragment.tracks, (track) => {
    const stream = formatContext.streams.find((stream) => {
      return stream.index === track.streamIndex
    })
    const streamContext = stream.privData as MOVStreamContext
    if (streamContext.fragIndexes.length) {
      size += 6 * 4 + streamContext.fragIndexes.length * 19
    }
  })
  ioWriter.writeUint32(size)
  ioWriter.writeString(BoxType.MFRA)
  array.each(movContext.currentFragment.tracks, (track) => {
    const stream = formatContext.streams.find((stream) => {
      return stream.index === track.streamIndex
    })
    const streamContext = stream.privData as MOVStreamContext
    if (streamContext.fragIndexes.length) {
      ioWriter.writeUint32(6 * 4 + streamContext.fragIndexes.length * 19)
      ioWriter.writeString(BoxType.TFRA)
      ioWriter.writeUint8(1)
      ioWriter.writeUint24(0)
      ioWriter.writeUint32(track.trackId)
      ioWriter.writeUint32(0)
      ioWriter.writeUint32(streamContext.fragIndexes.length)
      streamContext.fragIndexes.forEach((item) => {
        ioWriter.writeUint64(item.time)
        ioWriter.writeUint64(item.pos)
        ioWriter.writeUint8(1)
        ioWriter.writeUint8(1)
        ioWriter.writeUint8(1)
      })
    }
  })
  ioWriter.writeUint32(16)
  ioWriter.writeString(BoxType.MFRO)
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(size)
}
