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

import type AVStream from 'avutil/AVStream'
import { AVDisposition, AVStreamGroup, AVStreamGroupParamsType, AVStreamGroupTileGrid, AVStreamMetadataKey } from 'avutil/AVStream'
import type { Atom, FragmentTrack, HEIFGrid, HEIFItem, MOVContext, MOVStreamContext, Sample } from './type'
import IOReader from 'common/io/IOReader'
import mktag from '../../function/mktag'
import { BoxType, ContainerBoxs } from './boxType'
import type { AVIFormatContext } from '../../AVFormatContext'
import parsers from './parsing/parsers'
import * as logger from 'common/util/logger'
import { buildFragmentIndex } from './function/buildFragmentIndex'
import { buildIndex } from './function/buildIndex'
import createFragmentTrack from './function/createFragmentTrack'
import createMovStreamContext from './function/createMovStreamContext'
import { AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import { avFree, avMalloc } from 'avutil/util/mem'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { NOPTS_VALUE } from 'avutil/constant'
import { encryptionInitInfo2SideData } from 'avutil/util/encryption'
import { addSideData } from 'avutil/util/avpacket'
import digital2Tag from '../../function/digital2Tag'
import { iTunesKeyMap } from './iTunes'
import { readITunesTagValue } from './parsing/meta'
import { tag2CodecId } from './mov'
import { AVPacketFlags, IOFlags } from 'avutil/enum'
import * as object from 'common/util/object'
import * as errorType from 'avutil/error'


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
  stream: AVStream,
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
    else if (type === mktag('name') && atom.type === mktag(BoxType.UDTA) && (size - 8) > 0) {
      const title = await ioReader.readString(size - 8)
      if (stream) {
        stream.metadata[AVStreamMetadataKey.TITLE] = title
      }
      else {
        if (!movContext.metadata) {
          movContext.metadata = {}
        }
        movContext.metadata[AVStreamMetadataKey.TITLE] = title
      }
    }
    else if (atom.type === mktag(BoxType.UDTA)
      && iTunesKeyMap[digital2Tag(type)]
      && (size - 8) > 0
    ) {
      const data = await readITunesTagValue(ioReader, size - 8, {})
      if (data.length) {
        if (stream) {
          stream.metadata[iTunesKeyMap[digital2Tag(type)]] = data.length === 1 ? data[0] : data
        }
        else {
          if (!movContext.metadata) {
            movContext.metadata = {}
          }
          movContext.metadata[iTunesKeyMap[digital2Tag(type)]] = data.length === 1 ? data[0] : data
        }
      }
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
  movContext.parseOneBox = parseOneBox
  movContext.parsers = parsers
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
    else if (ContainerBoxs.some((boxType) => {
      return mktag(boxType) === type
    })) {
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
  formatContext.streams.forEach((stream) => {
    if (movContext.encryptionInitInfos) {
      const sideData = encryptionInitInfo2SideData(movContext.encryptionInitInfos)
      const data: pointer<uint8> = avMalloc(sideData.length)
      memcpyFromUint8Array(data, sideData.length, sideData)
      addSideData(
        addressof(stream.codecpar.codedSideData),
        addressof(stream.codecpar.nbCodedSideData),
        AVPacketSideDataType.AV_PKT_DATA_ENCRYPTION_INIT_INFO,
        data,
        sideData.length
      )
    }
    if (movContext.cencs) {
      const streamContext = stream.privData as MOVStreamContext
      const cenc = movContext.cencs[streamContext.trackId]
      if (cenc) {
        stream.metadata[AVStreamMetadataKey.ENCRYPTION] = {
          schemeType: cenc.schemeType,
          schemeVersion: cenc.schemeVersion,
          cryptByteBlock: cenc.cryptByteBlock,
          skipByteBlock: cenc.skipByteBlock,
          perSampleIVSize: cenc.defaultPerSampleIVSize,
          kid: cenc.defaultKeyId,
          constantIV: cenc.defaultConstantIV,
          pattern: cenc.pattern
        }
      }
    }
  })

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
        buildFragmentIndex(stream, track, movContext, formatContext.ioReader.getPos(), formatContext.ioReader.flags)
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
  const samplesIndexMap: Record<number, {
    samples: Sample[]
    currentSample: number
    sampleEnd: boolean
  }> = {}
  formatContext.streams.forEach((stream) => {
    const context = stream.privData as MOVStreamContext
    samplesIndexMap[stream.index] = {
      samples: context.samplesIndex,
      currentSample: context.currentSample,
      sampleEnd: context.sampleEnd
    }
    context.samplesIndex = []
  })
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
  formatContext.streams.forEach((stream) => {
    const context = stream.privData as MOVStreamContext
    context.samplesIndex = samplesIndexMap[stream.index]?.samples ?? []
    context.currentSample = samplesIndexMap[stream.index]?.currentSample ?? 0
    context.sampleEnd = samplesIndexMap[stream.index]?.sampleEnd ?? false
  })
}

async function readGrid(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  grid: HEIFGrid,
  tileGrid: AVStreamGroupTileGrid,
  movContext: MOVContext
) {
  let offset = 0n
  if (grid.item.isIdatRelative) {
    if (!movContext.heif.idatOffset) {
      logger.warn('missing idat box required by the image grid')
      return errorType.INVALID_PARAMETERS
    }
    offset = movContext.heif.idatOffset
  }
  if (!(ioReader.flags & IOFlags.SEEKABLE)) {
    logger.error('grid box with non seekable input')
    return errorType.INVALID_PARAMETERS
  }
  const now = ioReader.getPos()
  await ioReader.seek(BigInt(grid.item.extentOffset) + offset)

  await ioReader.readUint8()
  const flags = await ioReader.readUint8()
  const tileRows = (await ioReader.readUint8()) + 1
  const tileCols = (await ioReader.readUint8()) + 1
  tileGrid.width = (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16()
  tileGrid.height = (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16()
  await ioReader.seek(now)

  let size = tileRows * tileCols

  if (size !== grid.tileIdList.length) {
    return errorType.INVALID_PARAMETERS
  }
  tileGrid.codedWidth = 0
  tileGrid.codedHeight = 0
  for (let i = 0; i < tileCols; i++) {
    let stream = formatContext.streams.find((stream) => {
      const movStreamContext = stream.privData as MOVStreamContext
      return movStreamContext.trackId === grid.tileIdList[i]
    })
    if (!stream) {
      return errorType.INVALID_PARAMETERS
    }
    tileGrid.codedWidth += stream.codecpar.width
  }
  for (let i = 0; i < size; i += tileCols) {
    let stream = formatContext.streams.find((stream) => {
      const movStreamContext = stream.privData as MOVStreamContext
      return movStreamContext.trackId === grid.tileIdList[i]
    })
    if (!stream) {
      return errorType.INVALID_PARAMETERS
    }
    tileGrid.codedHeight += stream.codecpar.height
  }
  tileGrid.offsets = new Array(size)
  let x = 0, y = 0, i = 0
  while (y < tileGrid.codedHeight) {
    let leftCol = i
    while (x < tileGrid.codedWidth) {
      if (i === size) {
        return errorType.INVALID_PARAMETERS
      }

      let stream = formatContext.streams.find((stream) => {
        const movStreamContext = stream.privData as MOVStreamContext
        return movStreamContext.trackId === grid.tileIdList[i]
      })
      if (!stream) {
        return errorType.INVALID_PARAMETERS
      }

      tileGrid.offsets[i] = {
        idx: stream.id,
        horizontal: x,
        vertical: y
      }

      x += stream.codecpar.width

      i++
    }
    if (x > tileGrid.codedWidth) {
      logger.error('Non uniform HEIF tiles')
      return errorType.INVALID_PARAMETERS
    }
    x = 0
    let stream = formatContext.streams.find((stream) => {
      const movStreamContext = stream.privData as MOVStreamContext
      return movStreamContext.trackId === grid.tileIdList[leftCol]
    })
    if (!stream) {
      return errorType.INVALID_PARAMETERS
    }
    y += stream.codecpar.height
  }

  if (y > tileGrid.codedHeight || i !== size) {
    logger.error('Non uniform HEIF tiles')
    return errorType.INVALID_PARAMETERS
  }
  return 0
}
async function readIovl(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  grid: HEIFGrid,
  tileGrid: AVStreamGroupTileGrid,
  movContext: MOVContext
) {
  let offset = 0n
  if (grid.item.isIdatRelative) {
    if (!movContext.heif.idatOffset) {
      logger.warn('missing idat box required by the image grid')
      return errorType.INVALID_PARAMETERS
    }
    offset = movContext.heif.idatOffset
  }
  if (!(ioReader.flags & IOFlags.SEEKABLE)) {
    logger.error('grid box with non seekable input')
    return errorType.INVALID_PARAMETERS
  }

  const now = ioReader.getPos()
  await ioReader.seek(BigInt(grid.item.extentOffset) + offset)

  await ioReader.readUint8()
  const flags = await ioReader.readUint8()

  tileGrid.background = []
  for (let i = 0; i < 4; i++) {
    tileGrid.background.push(await ioReader.readUint16())
  }
  tileGrid.width = tileGrid.codedWidth = (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16()
  tileGrid.height = tileGrid.codedHeight = (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16()

  tileGrid.offsets = new Array(grid.tileIdList.length)

  for (let i = 0; i < grid.tileIdList.length; i++) {
    let stream = formatContext.streams.find((stream) => {
      const movStreamContext = stream.privData as MOVStreamContext
      return movStreamContext.trackId === grid.tileIdList[grid.tileIdList[i]]
    })
    if (!stream) {
      return errorType.INVALID_PARAMETERS
    }
    tileGrid.offsets[i] = {
      idx: stream.id,
      horizontal: (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16(),
      vertical: (flags & 1) ? await ioReader.readUint32() : await ioReader.readUint16()
    }
  }

  await ioReader.seek(now)
}

export async function readHEIF(
  ioReader: IOReader,
  formatContext: AVIFormatContext,
  movContext: MOVContext,
  atom: Atom
) {
  movContext.parseOneBox = parseOneBox
  movContext.parsers = parsers
  const endPos = ioReader.getPos() + static_cast<int64>(atom.size)

  movContext.heif = {}

  if (atom.size > 12) {
    if ((await ioReader.peekString(12)).substring(8) === 'hdlr') {
      // full box(flags version)
      await ioReader.skip(4)
    }
  }

  while (ioReader.getPos() < endPos) {
    const size = await ioReader.readUint32()
    const type = await ioReader.readUint32()

    if (size < 8) {
      logger.error(`invalid box, type: ${type}, size ${size}`)
      return
    }
    if (type === mktag(BoxType.HDLR)) {
      await ioReader.skip(size - 8)
    }
    else if (type === mktag(BoxType.IDAT)) {
      movContext.heif.idatOffset = ioReader.getPos()
      await ioReader.skip(size - 8)
    }
    else if (parsers[type]) {
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
    else if (ContainerBoxs.some((boxType) => {
      return mktag(boxType) === type
    })) {
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

  const now = ioReader.getPos()

  if (movContext.heif.foundIloc && movContext.heif.foundIinf && movContext.heif.items?.length) {
    movContext.foundHEIF = true

    const bufferReader = new IOReader()

    for (let i = 0; i < movContext.heif.items.length; i++) {
      const item = movContext.heif.items[i]
      if (item.type !== 'av01' && item.type !== 'hvc1') {
        continue
      }

      const stream = formatContext.createStream()
      const streamContext = createMovStreamContext()
      stream.privData = streamContext
      streamContext.trackId = item.id
      stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
      if (tag2CodecId[mktag(item.type)]) {
        stream.codecpar.codecId = tag2CodecId[mktag(item.type)]
      }
      stream.nbFrames = 1n
      stream.codecpar.framerate.den = 1
      stream.codecpar.framerate.num = 1
      stream.timeBase.den = 1
      stream.timeBase.num = 1
      if (movContext.heif.primaryId === item.id) {
        stream.disposition |= AVDisposition.DEFAULT
      }
      if (item.name) {
        stream.metadata[AVStreamMetadataKey.TITLE] = item.name
      }
      if (item.ipma && movContext.heif.ipcoItem) {
        for (let j = 0; j < item.ipma.length; j++) {
          const ipma = movContext.heif.ipcoItem[item.ipma[j]]
          if (ipma && parsers[ipma.tag]) {
            bufferReader.reset()
            bufferReader.appendBuffer(ipma.data)
            movContext.heif.currentItem = item
            await parsers[ipma.tag](bufferReader, stream, {
              type: ipma.tag,
              size: ipma.data.length
            }, movContext)
            movContext.heif.currentItem = null
          }
        }
      }
      let offset = 0n
      if (item.isIdatRelative) {
        if (!movContext.heif.idatOffset) {
          logger.warn(`Missing idat box for item ${item.id}`)
          formatContext.removeStream(stream)
          formatContext.streamIndex--
        }
        offset = movContext.heif.idatOffset
      }
      streamContext.samplesIndex = [{
        pos: BigInt(item.extentOffset) + offset,
        dts: 0n,
        pts: 0n,
        size: item.extentLength,
        flags: AVPacketFlags.AV_PKT_FLAG_KEY,
        duration: NOPTS_VALUE
      }]
    }
    if (movContext.heif.grid) {
      for (let i = 0; i < movContext.heif.grid.length; i++) {
        const grid = movContext.heif.grid[i]
        if (grid.item) {
          const stg = formatContext.createStreamGroup(AVStreamGroupParamsType.TILE_GRID)
          stg.privData = grid
          stg.params = new AVStreamGroupTileGrid()
          if (grid.tileIdList?.length) {
            grid.tileIdList.forEach((tile) => {
              const stream = formatContext.streams.find((stream) => {
                const movStreamContext = stream.privData as MOVStreamContext
                return movStreamContext.trackId === tile
              })
              if (stream) {
                formatContext.addStreamToStreamGroup(stg, stream)
              }
            })
          }
          if (grid.item.id === movContext.heif.primaryId) {
            stg.disposition |= AVDisposition.DEFAULT
          }

          if (grid.item.name) {
            stg.metadata[AVStreamMetadataKey.TITLE] = grid.item.name
          }
          if (grid.item.ipma && movContext.heif.ipcoItem) {
            for (let j = 0; j < grid.item.ipma.length; j++) {
              const ipma = movContext.heif.ipcoItem[grid.item.ipma[j]]
              if (ipma && parsers[ipma.tag]) {
                bufferReader.reset()
                bufferReader.appendBuffer(ipma.data)
                movContext.heif.currentItem = grid.item
                await parsers[ipma.tag](bufferReader, stg.params as any, {
                  type: ipma.tag,
                  size: ipma.data.length
                }, movContext)
                movContext.heif.currentItem = null
              }
            }
          }

          if (grid.item.type === 'grid') {
            let ret = await readGrid(ioReader, formatContext, grid, stg.params, movContext)
            if (ret < 0) {
              formatContext.removeStreamGroup(stg)
              formatContext.streamGroupIndex--
              continue
            }
          }
          else if (grid.item.type === 'iovl') {
            let ret = await readIovl(ioReader, formatContext, grid, stg.params, movContext)
            if (ret < 0) {
              formatContext.removeStreamGroup(stg)
              formatContext.streamGroupIndex--
              continue
            }
          }

          if (grid.item.rotation || grid.item.hflip || grid.item.vflip) {
            const matrix = new Float32Array(9)
            const radians = grid.item.rotation * Math.PI / 180
            const c = Math.cos(radians)
            const s = Math.sin(radians)
            matrix[0] = c
            matrix[1] = -s
            matrix[3] = s
            matrix[4] = c
            matrix[8] = 1 << 30
            const flip = [1 - 2 * (!!grid.item.hflip ? 1 : 0), 1 - 2 * (!!grid.item.vflip ? 1 : 0), 1]
            if (grid.item.hflip || grid.item.vflip) {
              for (let i = 0; i < 9; i++) {
                matrix[i] *= flip[i % 3]
              }
            }
            stg.params.sideData[AVPacketSideDataType.AV_PKT_DATA_DISPLAYMATRIX] = new Uint8Array(matrix.buffer)
          }
        }
      }
    }

    for (let i = 0; i < movContext.heif.items.length; i++) {
      const item = movContext.heif.items[i]
      if (item.refs) {
        const keys = object.keys(item.refs)
        for (let j = 0; j < keys.length; j++) {
          const type = keys[j]
          const id = item.refs[type]
          if (type === 'thmb') {
            const stream = formatContext.streams.find((stream) => {
              const movStreamContext = stream.privData as MOVStreamContext
              return movStreamContext.trackId === id
            })
            if (stream) {
              stream.disposition |= AVDisposition.THUMBNAIL
            }
          }
          else {
            let item = movContext.heif.items.find((item) => item.id === id)
            if (item && item.type === 'Exif' && (ioReader.flags & IOFlags.SEEKABLE)) {
              let offset = 0n
              if (item.isIdatRelative) {
                if (!movContext.heif.idatOffset) {
                  logger.warn(`Missing idat box for item ${item.id}`)
                  continue
                }
                offset = movContext.heif.idatOffset
              }
              const now = ioReader.getPos()
              await ioReader.seek(BigInt(item.extentOffset) + offset)
              const exif = await ioReader.readBuffer(item.extentLength)
              await ioReader.seek(now)

              let stream = formatContext.streams.find((stream) => {
                const movStreamContext = stream.privData as MOVStreamContext
                return movStreamContext.trackId === item.id
              })
              if (stream) {
                stream.sideData[AVPacketSideDataType.AV_PKT_DATA_EXIF] = exif
              }
              else {
                const group = formatContext.streamGroups.find((group) => {
                  const groupContext = group.privData as HEIFGrid
                  if (groupContext.item.refs) {
                    return object.has(object.reverse(groupContext.item.refs), item.id)
                  }
                })
                if (group) {
                  group.params.sideData[AVPacketSideDataType.AV_PKT_DATA_EXIF] = exif
                }
              }
            }
          }
        }
      }
    }
  }
  await ioReader.seek(now)
}
