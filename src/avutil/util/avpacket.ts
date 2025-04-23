/*
 * libmedia avpacket util
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

import AVPacket, { AVPacketSideData } from '../struct/avpacket'
import { memcpy, memset, mapUint8Array, mapSafeUint8Array } from 'cheap/std/memory'
import { AVPacketSideDataType } from '../codec'
import { avFree, avFreep, avMalloc, avMallocz } from './mem'
import { AV_TIME_BASE, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from '../constant'
import { avbufferCreate, avbufferRealloc, avbufferRef, avbufferReplace, avbufferUnref } from './avbuffer'
import { AVBufferRef } from '../struct/avbuffer'
import SafeUint8Array from 'cheap/std/buffer/SafeUint8Array'

const AV_INPUT_BUFFER_PADDING_SIZE = 64

export function getAVPacketData(avpacket: pointer<AVPacket>): Uint8Array<ArrayBufferLike>
export function getAVPacketData(avpacket: pointer<AVPacket>, safe: boolean): SafeUint8Array
export function getAVPacketData(avpacket: pointer<AVPacket>, safe?: boolean) {
  return safe ? mapSafeUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size)) : mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))
}

export function initAVPacketData(avpacket: pointer<AVPacket>, length: size) {
  avpacket.data = avMalloc(length)
  avpacket.size = static_cast<int32>(length)
  return mapUint8Array(avpacket.data, reinterpret_cast<size>(avpacket.size))
}

export function getSideData(psd: pointer<pointer<AVPacketSideData>>, pnbSd: pointer<int32>, type: AVPacketSideDataType): pointer<AVPacketSideData> {
  const sideDataElems = accessof(pnbSd)
  const sideData = accessof(psd)
  for (let i = 0; i < sideDataElems; i++) {
    if (sideData[i].type === type) {
      return addressof(sideData[i])
    }
  }
  return nullptr
}

export function getAVPacketSideData(avpacket: pointer<AVPacket>, type: AVPacketSideDataType): pointer<AVPacketSideData> {
  return getSideData(addressof(avpacket.sideData), addressof(avpacket.sideDataElems), type)
}

export function hasSideData(psd: pointer<pointer<AVPacketSideData>>, pnbSd: pointer<int32>, type: AVPacketSideDataType) {
  const sideDataElems = accessof(pnbSd)
  const sideData = accessof(psd)
  for (let i = 0; i < sideDataElems; i++) {
    if (sideData[i].type === type) {
      return true
    }
  }
  return false
}

export function hasAVPacketSideData(avpacket: pointer<AVPacket>, type: AVPacketSideDataType) {
  return hasSideData(addressof(avpacket.sideData), addressof(avpacket.sideDataElems), type)
}

export function addSideData(psd: pointer<pointer<AVPacketSideData>>, pnbSd: pointer<int32>, type: AVPacketSideDataType, data: pointer<void>, length: size) {
  const sideDataElems = accessof(pnbSd)
  const sideData = accessof(psd)
  for (let i = 0; i < sideDataElems; i++) {
    if (sideData[i].type === type) {
      avFree(sideData[i].data)
      sideData[i].data = reinterpret_cast<pointer<uint8>>(data)
      sideData[i].size = length
      return
    }
  }
  const len = (sideDataElems + 1) * reinterpret_cast<int32>(sizeof(AVPacketSideData))
  const newSideData = avMallocz(len) as pointer<AVPacketSideData>

  if (sideDataElems) {
    for (let i = 0; i < sideDataElems; i++) {
      newSideData[i] = sideData[i]
    }
  }

  const ele = addressof(newSideData[sideDataElems])
  ele.data = reinterpret_cast<pointer<uint8>>(data)
  ele.type = type
  ele.size = length

  if (sideData) {
    avFree(sideData)
  }

  accessof(psd) <- newSideData
  accessof(pnbSd) <- reinterpret_cast<int32>(sideDataElems + 1)

  return ele
}

export function newSideData(psd: pointer<pointer<AVPacketSideData>>, pnbSd: pointer<int32>, type: AVPacketSideDataType, size: size) {
  const data = avMalloc(size + static_cast<size>(AV_INPUT_BUFFER_PADDING_SIZE as uint32))
  memset(reinterpret_cast<pointer<uint8>>(data + size), 0, AV_INPUT_BUFFER_PADDING_SIZE)
  return addSideData(psd, pnbSd, type, data, size)
}

export function addAVPacketSideData(avpacket: pointer<AVPacket>, type: AVPacketSideDataType, data: pointer<void>, length: size) {
  addSideData(addressof(avpacket.sideData), addressof(avpacket.sideDataElems), type, data, length)
}

export function deleteAVPacketSideData(avpacket: pointer<AVPacket>, type: AVPacketSideDataType) {
  let index = -1
  for (let i = 0; i < avpacket.sideDataElems; i++) {
    if (avpacket.sideData[i].type === type) {
      index = i
      break
    }
  }
  if (index > -1) {
    if (avpacket.sideDataElems === 1) {
      avFree(avpacket.sideData[0].data)
      avFree(avpacket.sideData)
      avpacket.sideData = nullptr
      avpacket.sideDataElems = 0
    }
    else {
      const len = (avpacket.sideDataElems - 1) * reinterpret_cast<int32>(sizeof(AVPacketSideData))
      const sideData = avMallocz(len) as pointer<AVPacketSideData>
      for (let i = 0; i < avpacket.sideDataElems; i++) {
        if (i !== index) {
          sideData[i] = avpacket.sideData[i]
        }
        else {
          avFree(avpacket.sideData[i].data)
        }
      }
      avFree(avpacket.sideData)
      avpacket.sideData = sideData
      avpacket.sideDataElems--
    }
  }
}

export function createAVPacket(): pointer<AVPacket> {
  const avpacket = reinterpret_cast<pointer<AVPacket>>(avMallocz(sizeof(AVPacket)))
  getAVPacketDefault(avpacket)
  return avpacket
}

export function destroyAVPacket(avpacket: pointer<AVPacket>) {
  unrefAVPacket(avpacket)
  avFree(avpacket)
}

export function freeAVPacketSideData(pSideData: pointer<pointer<AVPacketSideData>>, pnbSideData: pointer<int32>) {

  const sideData = accessof(pSideData)
  const nbSideData = accessof(pnbSideData)

  if (sideData) {
    for (let i = 0; i < nbSideData; i++) {
      avFree(sideData[i].data)
    }
    avFreep(pSideData)
    accessof(pnbSideData) <- static_cast<int32>(0)
  }
}

export function getAVPacketDefault(avpacket: pointer<AVPacket>) {
  avpacket.data = nullptr
  avpacket.size = 0
  avpacket.sideData = nullptr
  avpacket.sideDataElems = 0
  avpacket.streamIndex = NOPTS_VALUE
  avpacket.pos = NOPTS_VALUE_BIGINT
  avpacket.duration = NOPTS_VALUE_BIGINT
  avpacket.flags = 0
  avpacket.dts = NOPTS_VALUE_BIGINT
  avpacket.pts = NOPTS_VALUE_BIGINT
  avpacket.timeBase.den = AV_TIME_BASE
  avpacket.timeBase.num = 1
  avpacket.bitFormat = 0

  avpacket.buf = nullptr
}

export function copyAVPacketSideData(dst: pointer<AVPacket>, src: pointer<AVPacket>) {
  freeAVPacketSideData(addressof(dst.sideData), addressof(dst.sideDataElems))
  if (src.sideDataElems) {
    let size = reinterpret_cast<int32>(sizeof(AVPacketSideData))
    dst.sideData = reinterpret_cast<pointer<AVPacketSideData>>(avMallocz(size * src.sideDataElems))
    for (let i = 0; i < src.sideDataElems; i++) {
      dst.sideData[i].size = src.sideData[i].size
      dst.sideData[i].type = src.sideData[i].type
      dst.sideData[i].data = avMalloc(src.sideData[i].size)
      memcpy(dst.sideData[i].data, src.sideData[i].data, src.sideData[i].size)
    }
    dst.sideDataElems = src.sideDataElems
  }
}

export function copyAVPacketProps(dst: pointer<AVPacket>, src: pointer<AVPacket>) {
  dst.streamIndex = src.streamIndex
  dst.pos = src.pos
  dst.duration = src.duration
  dst.flags = src.flags
  dst.dts = src.dts
  dst.pts = src.pts
  dst.opaque = src.opaque
  dst.timeBase.den = src.timeBase.den
  dst.timeBase.num = src.timeBase.num
  dst.bitFormat = src.bitFormat

  dst.opaqueRef = nullptr

  avbufferReplace(addressof(dst.opaqueRef), src.opaqueRef)

  copyAVPacketSideData(dst, src)

  return 0
}

function allocAVPacket(buf: pointer<pointer<AVBufferRef>>, size: size) {
  avbufferRealloc(buf, size + static_cast<size>(AV_INPUT_BUFFER_PADDING_SIZE as uint32))
  memset(accessof(buf).data + size, 0, AV_INPUT_BUFFER_PADDING_SIZE)
  return 0
}

export function refAVPacket(dst: pointer<AVPacket>, src: pointer<AVPacket>) {
  if (dst.buf) {
    avbufferUnref(addressof(dst.buf))
  }
  dst.buf = nullptr
  copyAVPacketProps(dst, src)

  if (!src.buf && src.size) {
    allocAVPacket(addressof(dst.buf), reinterpret_cast<size>(src.size))
    if (src.size) {
      memcpy(dst.buf.data, src.data, reinterpret_cast<size>(src.size))
    }
    dst.data = dst.buf.data
  }
  else if (src.buf) {
    dst.buf = avbufferRef(src.buf)
    dst.data = src.data
  }
  dst.size = src.size

  return 0
}

export function unrefAVPacket(avpacket: pointer<AVPacket>) {
  freeAVPacketSideData(addressof(avpacket.sideData), addressof(avpacket.sideDataElems))
  avbufferUnref(addressof(avpacket.opaqueRef))

  if (avpacket.buf) {
    avbufferUnref(addressof(avpacket.buf))
  }
  else if (avpacket.data) {
    avFree(avpacket.data)
  }
  getAVPacketDefault(avpacket)
}

export function copyAVPacketData(dst: pointer<AVPacket>, src: pointer<AVPacket>) {
  if (dst.buf) {
    avbufferUnref(addressof(dst.buf))
  }
  dst.buf = nullptr
  if (!src.buf && src.size) {
    allocAVPacket(addressof(dst.buf), reinterpret_cast<size>(src.size))
    if (src.size) {
      memcpy(dst.buf.data, src.data, reinterpret_cast<size>(src.size))
    }
    dst.data = dst.buf.data
  }
  else if (src.buf) {
    dst.buf = avbufferRef(src.buf)
    dst.data = src.data
  }
  dst.size = src.size
}

export function addAVPacketData(avpacket: pointer<AVPacket>, data: pointer<uint8>, size: int32) {

  if (avpacket.buf) {
    avbufferUnref(addressof(avpacket.buf))
  }
  else if (avpacket.data) {
    avFree(avpacket.data)
  }

  avpacket.buf = avbufferCreate(data, size + AV_INPUT_BUFFER_PADDING_SIZE)
  avpacket.data = data
  avpacket.size = size
}
