/*
 * libmedia serialize struct
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

import { AVCodecID, AVMediaType, AVPacketSideDataType } from '../codec'
import AVPacket from '../struct/avpacket'
import { Rational } from '../struct/rational'
import { mapUint8Array, memcpyFromUint8Array, memset } from 'cheap/std/memory'
import { addAVPacketData, addAVPacketSideData, addSideData, createAVPacket, freeAVPacketSideData, getAVPacketData } from './avpacket'
import { avFree, avMalloc } from './mem'
import { AVChromaLocation, AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic, AVFieldOrder, AVPixelFormat } from '../pixfmt'
import { AVChannelOrder, AVSampleFormat } from '../audiosamplefmt'
import AVCodecParameters from '../struct/avcodecparameters'

export interface AVPacketSerialize {
  pts: int64
  dts: int64
  data: Uint8Array
  streamIndex: int32
  flags: int32
  sideData: {
    type: AVPacketSideDataType
    data: Uint8Array
  }[]
  duration: int64
  pos: int64
  timeBase: Rational
  bitFormat: int32
}

export interface AVCodecParametersSerialize {
  codecType: AVMediaType
  codecId: AVCodecID
  codecTag: uint32
  extradata: Uint8Array
  codedSideData: {
    type: AVPacketSideDataType
    data: Uint8Array
  }[]
  format: AVPixelFormat | AVSampleFormat
  bitrate: int64
  bitsPerCodedSample: int32
  bitsPerRawSample: int32
  profile: int32
  level: int32
  width: int32
  height: int32
  sampleAspectRatio: Rational
  framerate: Rational
  fieldOrder: AVFieldOrder
  colorRange: AVColorRange
  colorPrimaries: AVColorPrimaries
  colorTrc: AVColorTransferCharacteristic
  colorSpace: AVColorSpace
  chromaLocation: AVChromaLocation
  videoDelay: int32
  chLayout: {
    order: AVChannelOrder
    nbChannels: int32
    u: uint64
  }
  sampleRate: int32
  blockAlign: int32
  frameSize: int32
  initialPadding: int32
  trailingPadding: int32
  seekPreroll: int32
  bitFormat: int32
}

export function serializeAVPacket(avpacket: pointer<AVPacket>) {
  const serialize: AVPacketSerialize = {
    pts: avpacket.pts,
    dts: avpacket.dts,
    data: getAVPacketData(avpacket).slice(),
    streamIndex: avpacket.streamIndex,
    flags: avpacket.flags,
    sideData: [],
    duration: avpacket.duration,
    pos: avpacket.pos,
    timeBase: {
      den: avpacket.timeBase.den,
      num: avpacket.timeBase.num
    },
    bitFormat: avpacket.bitFormat
  }

  for (let i = 0; i < avpacket.sideDataElems; i++) {
    const ele = {
      type: avpacket.sideData[i].type,
      data: mapUint8Array(avpacket.sideData[i].data, avpacket.sideData[i].size).slice()
    }
    serialize.sideData.push(ele)
  }
  return serialize
}

export function unserializeAVPacket(serialize: AVPacketSerialize, avpacket: pointer<AVPacket> = nullptr) {
  if (!avpacket) {
    avpacket = createAVPacket()
  }

  avpacket.pts = serialize.pts
  avpacket.dts = serialize.dts

  const data: pointer<uint8> = avMalloc(serialize.data.length)
  memcpyFromUint8Array(data, serialize.data.length, serialize.data)
  addAVPacketData(avpacket, data, serialize.data.length)

  avpacket.streamIndex = serialize.streamIndex
  avpacket.flags = serialize.flags
  avpacket.duration = serialize.duration
  avpacket.pos = serialize.pos
  avpacket.timeBase.den = serialize.timeBase.den
  avpacket.timeBase.num = serialize.timeBase.num
  avpacket.bitFormat = serialize.bitFormat

  if (serialize.sideData.length) {
    for (let i = 0; i < serialize.sideData.length; i++) {
      const data = avMalloc(serialize.sideData[i].data.length)
      memcpyFromUint8Array(data, serialize.sideData[i].data.length, serialize.sideData[i].data)
      addAVPacketSideData(avpacket, serialize.sideData[i].type, data, serialize.sideData[i].data.length)
    }
  }
  else {
    freeAVPacketSideData(addressof(avpacket.sideData), addressof(avpacket.sideDataElems))
  }

  return avpacket
}

export function serializeAVCodecParameters(codecpar: pointer<AVCodecParameters>) {
  const serialize: AVCodecParametersSerialize = {
    codecType: codecpar.codecType,
    codecId: codecpar.codecId,
    codecTag: codecpar.codecTag,
    extradata: null,
    codedSideData: [],
    format: codecpar.format,
    bitrate: codecpar.bitrate,
    bitsPerCodedSample: codecpar.bitsPerCodedSample,
    bitsPerRawSample: codecpar.bitsPerRawSample,
    profile: codecpar.profile,
    level: codecpar.level,
    width: codecpar.width,
    height: codecpar.height,
    sampleAspectRatio: {
      den: codecpar.sampleAspectRatio.den,
      num: codecpar.sampleAspectRatio.num
    },
    framerate: {
      den: codecpar.framerate.den,
      num: codecpar.framerate.num
    },
    fieldOrder: codecpar.fieldOrder,
    colorRange: codecpar.colorRange,
    colorPrimaries: codecpar.colorPrimaries,
    colorTrc: codecpar.colorTrc,
    colorSpace: codecpar.colorSpace,
    chromaLocation: codecpar.chromaLocation,
    videoDelay: codecpar.videoDelay,
    chLayout: {
      order: codecpar.chLayout.order,
      nbChannels: codecpar.chLayout.nbChannels,
      u: codecpar.chLayout.u.mask
    },
    sampleRate: codecpar.sampleRate,
    blockAlign: codecpar.blockAlign,
    frameSize: codecpar.frameSize,
    initialPadding: codecpar.initialPadding,
    trailingPadding: codecpar.trailingPadding,
    seekPreroll: codecpar.seekPreroll,
    bitFormat: codecpar.bitFormat
  }

  if (codecpar.extradataSize) {
    serialize.extradata = mapUint8Array(codecpar.extradata, reinterpret_cast<size>(codecpar.extradataSize)).slice()
  }

  for (let i = 0; i < codecpar.nbCodedSideData; i++) {
    const ele = {
      type: codecpar.codedSideData[i].type,
      data: mapUint8Array(codecpar.codedSideData[i].data, codecpar.codedSideData[i].size).slice()
    }
    serialize.codedSideData.push(ele)
  }

  return serialize
}

export function unserializeAVCodecParameters(serialize: AVCodecParametersSerialize, codecpar: pointer<AVCodecParameters> = nullptr) {
  if (!codecpar) {
    codecpar = reinterpret_cast<pointer<AVCodecParameters>>(avMalloc(sizeof(AVCodecParameters)))
    memset(codecpar, 0, sizeof(AVCodecParameters))
  }

  codecpar.codecType = serialize.codecType
  codecpar.codecId = serialize.codecId
  codecpar.codecTag = serialize.codecTag

  if (serialize.extradata) {
    if (codecpar.extradata) {
      avFree(codecpar.extradata)
    }
    codecpar.extradata = avMalloc(serialize.extradata.length)
    memcpyFromUint8Array(codecpar.extradata, serialize.extradata.length, serialize.extradata)
    codecpar.extradataSize = serialize.extradata.length
  }
  if (serialize.codedSideData.length) {
    for (let i = 0; i < serialize.codedSideData.length; i++) {
      const data = avMalloc(serialize.codedSideData[i].data.length)
      memcpyFromUint8Array(data, serialize.codedSideData[i].data.length, serialize.codedSideData[i].data)
      addSideData(addressof(codecpar.codedSideData), addressof(codecpar.nbCodedSideData), serialize.codedSideData[i].type, data, serialize.codedSideData[i].data.length)
    }
  }
  else {
    freeAVPacketSideData(addressof(codecpar.codedSideData), addressof(codecpar.nbCodedSideData))
  }
  codecpar.format = serialize.format
  codecpar.bitrate = serialize.bitrate
  codecpar.bitsPerCodedSample = serialize.bitsPerCodedSample
  codecpar.bitsPerRawSample = serialize.bitsPerRawSample
  codecpar.profile = serialize.profile
  codecpar.level = serialize.level
  codecpar.width = serialize.width
  codecpar.height = serialize.height
  codecpar.sampleAspectRatio.den = serialize.sampleAspectRatio.den
  codecpar.sampleAspectRatio.num = serialize.sampleAspectRatio.num
  codecpar.framerate.den = serialize.framerate.den
  codecpar.framerate.num = serialize.framerate.num
  codecpar.fieldOrder = serialize.fieldOrder
  codecpar.colorRange = serialize.colorRange
  codecpar.colorPrimaries = serialize.colorPrimaries
  codecpar.colorTrc = serialize.colorTrc
  codecpar.colorSpace = serialize.colorSpace
  codecpar.chromaLocation = serialize.chromaLocation
  codecpar.videoDelay = serialize.videoDelay
  codecpar.chLayout.order = serialize.chLayout.order
  codecpar.chLayout.nbChannels = serialize.chLayout.nbChannels
  codecpar.chLayout.u.mask = serialize.chLayout.u
  codecpar.sampleRate = serialize.sampleRate
  codecpar.blockAlign = serialize.blockAlign
  codecpar.frameSize = serialize.frameSize
  codecpar.initialPadding = serialize.initialPadding
  codecpar.trailingPadding = serialize.trailingPadding
  codecpar.seekPreroll = serialize.seekPreroll
  codecpar.bitFormat = serialize.bitFormat

  return codecpar
}
