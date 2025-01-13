/*
 * libmedia mp4 decode util
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

import Stream from 'avutil/AVStream'
import { Atom, FragmentTrack, MOVContext, MOVStreamContext } from './type'
import IOReader from 'common/io/IOReader'
import mktag from '../../function/mktag'
import { BoxType, ContainerBoxs } from './boxType'
import { AVIFormatContext } from '../../AVFormatContext'
import parsers from './parsing/parsers'
import * as logger from 'common/util/logger'
import { buildFragmentIndex } from './function/buildFragmentIndex'
import { buildIndex } from './function/buildIndex'
import createFragmentTrack from './function/createFragmentTrack'
import createMovStreamContext from './function/createMovStreamContext'
import { AVPacketSideDataType } from 'avutil/codec'
import { avFree, avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { NOPTS_VALUE } from 'avutil/constant'


export async function readFtyp(ioReader: IOReader, context: MOVContext, atom: Atom) {

  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)

  context.majorBrand = await ioReader.readUint32()
  context.minorVersion = await ioReader.readUint32()

  if (context.majorBrand === mktag('qt  ')) {
    context.isom = true
  }

  while (ioReader.getPos() < endPos) {
    context.compatibleBrand.push(await ioReader.readUint32())
  }
}

async function parseOneBox(
  ioReader: IOReader,
  stream: Stream,
  atom: Atom,
  movContext: MOVContext
) {
  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)
  while (ioReader.getPos() < endPos) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (size < 8) {
      logger.error(`invalid box size ${size}`)
      return
    }

    if (parsers[type]) {
      await parsers[type](
        ioReader,
        stream,
        {
          type,
          size: size - 8
        },
        movContext
      )
    }
    // 兼容 hdlr 在 minf 后面，先解析 hdlr 得到 track 类型
    else if (type === mktag(BoxType.MDIA)) {
      let hdlr = false
      let minfPos = 0n

      const endPos = ioReader.getPos() + static_cast<int64>(size - 8)

      while (ioReader.getPos() < endPos) {
        const size = await ioReader.readUint32()
        const type = await ioReader.readUint32()

        if (type === mktag(BoxType.HDLR)) {
          await parsers[type](
            ioReader,
            stream,
            {
              type,
              size: size - 8
            },
            movContext
          )
          hdlr = true
        }
        else if (type === mktag(BoxType.MINF) && hdlr) {
          await parseOneBox(
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
          if (type === mktag(BoxType.MINF) && !hdlr) {
            minfPos = ioReader.getPos() - 8n
            await ioReader.skip(size - 8)
          }
          else if (parsers[type]) {
            await parsers[type](
              ioReader,
              stream,
              {
                type,
                size: size - 8
              },
              movContext
            )
          }
          else if (ContainerBoxs.some((boxType) => {
            return mktag(boxType) === type
          })) {
            await parseOneBox(
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
            await ioReader.skip(size - 8)
          }
        }
      }
      if (minfPos) {
        const now = ioReader.getPos()
        await ioReader.seek(minfPos)
        const size = await ioReader.readUint32()
        const type = await ioReader.readUint32()
        await parseOneBox(
          ioReader,
          stream,
          {
            type,
            size: size - 8
          },
          movContext
        )
        await ioReader.seek(now)
      }
    }
    else if (ContainerBoxs.some((boxType) => {
      return mktag(boxType) === type
    })) {
      await parseOneBox(
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
      await ioReader.skip(size - 8)
    }
  }
}

export async function readMoov(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  movContext: MOVContext,
  atom: Atom
) {
  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)
  while (ioReader.getPos() < endPos) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (size < 8) {
      logger.error(`invalid box, type: ${type}, size ${size}`)
      return
    }

    if (parsers[type]) {
      await parsers[type](
        ioReader,
        null,
        {
          type,
          size: size - 8
        },
        movContext
      )
    }
    else if (type === mktag(BoxType.TRAK)) {
      if (!movContext.foundMoov || movContext.fragment) {
        const stream = formatContext.createStream()
        stream.privData = createMovStreamContext()
        await parseOneBox(
          ioReader,
          stream,
          {
            type,
            size: size - 8
          },
          movContext
        )
        if (!movContext.fragment) {
          buildIndex(stream, movContext)
        }
        else {
          const streamContext = stream.privData as MOVStreamContext
          const old = formatContext.streams.find((st) => {
            const context = st.privData as MOVStreamContext
            if (st.index !== stream.index && context.trackId === streamContext.trackId) {
              return true
            }
          })
          if (old) {
            if (stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]) {
              old.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA]
              if (old.codecpar.extradata) {
                avFree(old.codecpar.extradata)
              }
              old.codecpar.extradataSize = old.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA].length
              old.codecpar.extradata = avMalloc(reinterpret_cast<size>(old.codecpar.extradataSize))
              memcpyFromUint8Array(old.codecpar.extradata, reinterpret_cast<size>(old.codecpar.extradataSize), old.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA])

              if (stream.codecpar.width !== NOPTS_VALUE && streamContext.width > 0) {
                old.codecpar.width = streamContext.width
              }
              if (stream.codecpar.width !== NOPTS_VALUE && streamContext.height > 0) {
                old.codecpar.height = streamContext.height
              }
            }
            formatContext.removeStream(stream)
            formatContext.streamIndex--
          }
          else {
            if (stream.codecpar.width === NOPTS_VALUE && streamContext.width > 0) {
              stream.codecpar.width = streamContext.width
            }
            if (stream.codecpar.width === NOPTS_VALUE && streamContext.height > 0) {
              stream.codecpar.height = streamContext.height
            }
          }
        }
      }
      else {
        await ioReader.skip(size - 8)
      }
    }
    else if (type === mktag(BoxType.MVEX)) {
      movContext.fragment = true
      await parseOneBox(
        ioReader,
        null,
        {
          type,
          size: size - 8
        },
        movContext
      )
    }
    else {
      await ioReader.skip(size - 8)
    }
  }
}

export async function readMoof(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  movContext: MOVContext,
  atom: Atom
) {
  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)
  while (ioReader.getPos() < endPos) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (size < 8) {
      logger.error(`invalid box, type: ${type}, size ${size}`)
      return
    }

    if (parsers[type]) {
      await parsers[type](
        ioReader,
        null,
        {
          type,
          size: size - 8
        },
        movContext
      )
    }
    else if (type === mktag(BoxType.TRAF)) {
      const track: FragmentTrack = createFragmentTrack()

      movContext.currentFragment.currentTrack = track

      await parseOneBox(
        ioReader,
        null,
        {
          type,
          size: size - 8
        },
        movContext
      )
      movContext.currentFragment.tracks.push(track)
      movContext.currentFragment.currentTrack = null

      const stream = formatContext.streams.find((stream) => {
        return (stream.privData as MOVStreamContext).trackId === track.trackId
      })

      if (stream) {
        const streamContext = stream.privData as MOVStreamContext
        track.streamIndex = stream.index
        buildFragmentIndex(stream, track, movContext, formatContext.ioReader.flags)
        streamContext.currentSample = 0
        streamContext.sampleEnd = false
      }
    }
    else {
      await ioReader.skip(size - 8)
    }
  }
}

export async function readMfra(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  movContext: MOVContext,
  atom: Atom
) {
  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)
  while (ioReader.getPos() < endPos) {
    const pos = ioReader.getPos()
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (type === mktag(BoxType.TFRA)) {
      const version = await ioReader.readUint8()
      await ioReader.skip(3)
      const trackId = await ioReader.readUint32()
      const fieldLength = await ioReader.readUint32()
      const itemCount = await ioReader.readUint32()

      const stream = formatContext.streams.find((stream) => {
        return (stream.privData as MOVStreamContext).trackId === trackId
      })

      if (stream) {

        const movStreamContext = stream.privData as MOVStreamContext

        let time: int64
        let offset: int64
        for (let i = 0; i < itemCount; i++) {
          if (version === 1) {
            time = await ioReader.readUint64()
            offset = await ioReader.readUint64()
          }
          else {
            time = static_cast<int64>(await ioReader.readUint32())
            offset = static_cast<int64>(await ioReader.readUint32())
          }

          movStreamContext.fragIndexes.push({
            pos: offset,
            time
          })

          for (let j = 0; j < ((fieldLength >> 4) & 3) + 1; j++) {
            await ioReader.skip(1)
          }
          for (let j = 0; j < ((fieldLength >> 2) & 3) + 1; j++) {
            await ioReader.skip(1)
          }
          for (let j = 0; j < ((fieldLength >> 0) & 3) + 1; j++) {
            await ioReader.skip(1)
          }
        }
        if (movStreamContext.fragIndexes.length) {
          await ioReader.seek(movStreamContext.fragIndexes[movStreamContext.fragIndexes.length - 1].pos)
          const size = await ioReader.readUint32()
          const type = await ioReader.readUint32()
          if (type === mktag(BoxType.MOOF)) {
            movContext.currentFragment = {
              pos: 0n,
              size,
              sequence: 0,
              tracks: [],
              currentTrack: null
            }
            await readMoof(ioReader, formatContext, movContext, {
              size,
              type
            })
            if (movStreamContext.samplesIndex.length) {
              const sample = movStreamContext.samplesIndex[movStreamContext.samplesIndex.length - 1]
              stream.duration = sample.pts + static_cast<int64>(sample.duration)
              movStreamContext.samplesIndex.length = 0
            }
          }
        }
      }
    }
    await ioReader.seek(pos + static_cast<int64>(size), false, false)
  }
  movContext.currentFragment = null
}
