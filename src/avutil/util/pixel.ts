/*
 * libmedia video pixel util
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

import { AVPixelFormatDescriptor, getAVPixelFormatDescriptor, AVPixelFormatFlags } from '../pixelFormatDescriptor'
import { AVChromaLocation, AVPixelFormat } from '../pixfmt'
import * as errorType from '../error'
import { INT32_MAX } from '../constant'
import { memset } from 'cheap/std/memory'
import * as stack from 'cheap/stack'
import { avFree, avMalloc } from './mem'
import alignFunc from 'common/math/align'

export function chromaLocation2Pos(pos: AVChromaLocation) {
  if (pos <= AVChromaLocation.AVCHROMA_LOC_UNSPECIFIED || pos >= AVChromaLocation.AVCHROMA_LOC_NB) {
    return
  }
  return {
    x: (pos & 1) * 128,
    y: ((pos >>> 1) ^ (pos < 4 ? 1 : 0)) * 128
  }
}

function getMaxPixSteps(desc: AVPixelFormatDescriptor) {
  const maxPixSteps: int32[] = [0, 0, 0, 0]
  const maxPixStepsComps: int32[] = [0, 0, 0, 0]

  for (let i = 0; i < 4; i++) {
    if (desc.comp[i] && desc.comp[i].step > maxPixSteps[desc.comp[i].plane]) {
      maxPixSteps[desc.comp[i].plane] = desc.comp[i].step
      maxPixStepsComps[desc.comp[i].plane] = i
    }
  }

  return {
    maxPixSteps,
    maxPixStepsComps
  }
}

function setSystematicPal(pal: pointer<uint32>, pixfmt: AVPixelFormat) {
  for (let i = 0; i < 256; i++) {
    let r: int32, g: int32, b: int32

    switch (pixfmt) {
      case AVPixelFormat.AV_PIX_FMT_RGB8:
        r = (i >> 5) * 36
        g = ((i >> 2) & 7) * 36
        b = (i & 3) * 85
        break
      case AVPixelFormat.AV_PIX_FMT_BGR8:
        b = (i >> 6) * 85
        g = ((i >> 3) & 7) * 36
        r = (i & 7) * 36
        break
      case AVPixelFormat.AV_PIX_FMT_RGB4_BYTE:
        r = (i >> 3) * 255
        g = ((i >> 1) & 3) * 85
        b = (i & 1) * 255
        break
      case AVPixelFormat.AV_PIX_FMT_BGR4_BYTE:
        b = (i >> 3) * 255
        g = ((i >> 1) & 3) * 85
        r = (i & 1) * 255
        break
      case AVPixelFormat.AV_PIX_FMT_GRAY8:
        r = b = g = i
        break
      default:
        return errorType.INVALID_ARGUMENT
    }
    pal[i] = b + (g << 8) + (r << 16) + (0xFF << 24)
  }

  return 0
}

function pixelGetLinesize_(width: int32, plane: int32, maxStep: int32, maxStepComp: int32, desc: AVPixelFormatDescriptor) {
  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  if (width < 0) {
    return errorType.INVALID_ARGUMENT
  }

  const s = (maxStepComp === 1 || maxStepComp === 2) ? desc.log2ChromaW : 0

  const shiftedW = ((width + (1 << s) - 1)) >>> s

  if (shiftedW && maxStep > INT32_MAX / shiftedW) {
    return errorType.INVALID_ARGUMENT
  }

  let linesize = maxStep * shiftedW

  if (desc.flags & AVPixelFormatFlags.BIT_STREAM) {
    linesize = (linesize + 7) >>> 3
  }

  return linesize
}

export function pixelGetLinesize(pixfmt: AVPixelFormat, width: int32, plane: int32) {
  const desc = getAVPixelFormatDescriptor(pixfmt)

  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  const { maxPixSteps, maxPixStepsComps } = getMaxPixSteps(desc)

  return pixelGetLinesize_(width, plane, maxPixSteps[plane], maxPixStepsComps[plane], desc)
}

export function pixelFillLinesizes(linesizes: pointer<int32>, pixfmt: AVPixelFormat, width: int32) {
  const desc = getAVPixelFormatDescriptor(pixfmt)

  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  const { maxPixSteps, maxPixStepsComps } = getMaxPixSteps(desc)

  memset(linesizes, 0, 4 * sizeof(linesizes[0]))

  let ret = 0

  for (let i = 0; i < 4; i++) {
    if ((ret = pixelGetLinesize_(width, i, maxPixSteps[i], maxPixStepsComps[i], desc)) < 0) {
      return ret
    }
    linesizes[i] = ret
  }
}

export function pixelFillPlaneSizes(sizes: pointer<size>, pixfmt: AVPixelFormat, height: int32, linesizes: pointer<int32>) {
  const hasPlane = [0, 0, 0, 0]

  const desc = getAVPixelFormatDescriptor(pixfmt)

  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  memset(sizes, 0, 4 * sizeof(sizes[0]))

  if (linesizes[0] > INT32_MAX / height) {
    return errorType.INVALID_ARGUMENT
  }

  sizes[0] = reinterpret_cast<size>(linesizes[0] * height)

  if (desc.flags & AVPixelFormatFlags.PALETTE) {
    sizes[1] = reinterpret_cast<size>(256 * 4)
    return 0
  }

  for (let i = 0; i < 4; i++) {
    if (desc.comp[i]) {
      hasPlane[desc.comp[i].plane] = 1
    }
  }

  for (let i = 0; i < 4 && hasPlane[i]; i++) {
    let s = (i === 1 || i === 2) ? desc.log2ChromaH : 0
    let h = (height + (1 << s) - 1) >> s

    if (linesizes[i] > INT32_MAX / h) {
      return errorType.INVALID_ARGUMENT
    }

    sizes[i] = reinterpret_cast<size>(h * linesizes[i])
  }
  return 0
}

export function pixelFillPointer(
  data: pointer<pointer<uint8>>,
  pixfmt: AVPixelFormat,
  height: int32,
  ptr: pointer<uint8>,
  linesizes: pointer<int32>
) {
  const linesizes1 = reinterpret_cast<pointer<int32>>(stack.malloc(sizeof(linesizes[0]) * 4))
  const sizes = reinterpret_cast<pointer<size>>(stack.malloc(sizeof(size) * 4))

  memset(data, 0, 4 * sizeof(data[0]))

  for (let i = 0; i < 4; i++) {
    linesizes1[i] = linesizes[i]
  }

  let ret = pixelFillPlaneSizes(sizes, pixfmt, height, linesizes1)

  if (ret < 0) {
    defer()
    return ret
  }

  ret = 0

  for (let i = 0; i < 4; i++) {
    if (sizes[i] > INT32_MAX - ret) {
      defer()
      return errorType.INVALID_ARGUMENT
    }
    ret += reinterpret_cast<double>(sizes[i])
  }

  if (!ptr) {
    defer()
    return ret
  }

  data[0] = ptr
  for (let i = 1; i < 4 && sizes[i]; i++) {
    data[i] = reinterpret_cast<pointer<uint8>>(data[i - 1] + sizes[i - 1])
  }

  defer()
  return ret

  function defer() {
    stack.free(sizeof(linesizes[0]) * 4)
    stack.free(sizeof(size) * 4)
  }
}

export function pixelAlloc(
  pointers: pointer<pointer<uint8>>,
  linesizes: pointer<int32>,
  w: int32,
  h: int32,
  pixfmt: AVPixelFormat,
  align: int32 = 1
) {

  const desc = getAVPixelFormatDescriptor(pixfmt)

  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  const linesizes1 = reinterpret_cast<pointer<int32>>(stack.malloc(sizeof(linesizes[0]) * 4))
  const sizes = reinterpret_cast<pointer<size>>(stack.malloc(sizeof(size) * 4))

  let ret = 0

  if ((ret = pixelFillLinesizes(linesizes, pixfmt, align > 7 ? alignFunc(w, 8) : w)) < 0) {
    defer()
    return ret
  }

  for (let i = 0; i < 4; i++) {
    linesizes[i] = alignFunc(linesizes[i], align)
    linesizes1[i] = linesizes[i]
  }

  if ((ret = pixelFillPlaneSizes(sizes, pixfmt, h, linesizes1)) < 0) {
    defer()
    return ret
  }

  let totalSize: size = static_cast<size>(align)

  for (let i = 0; i < 4; i++) {
    if (totalSize > static_cast<size>(INT32_MAX) - sizes[i]) {
      defer()
      return errorType.INVALID_ARGUMENT
    }
    totalSize += sizes[i]
  }

  const buf: pointer<uint8> = avMalloc(totalSize)

  if (!buf) {
    defer()
    return errorType.NO_MEMORY
  }

  if ((ret = pixelFillPointer(pointers, pixfmt, h, buf, linesizes)) < 0) {
    defer()
    return ret
  }

  if (desc.flags & AVPixelFormatFlags.PALETTE) {
    if (align < 4) {
      avFree(buf)
      defer()
      return ret
    }
    setSystematicPal(reinterpret_cast<pointer<uint32>>(pointers[1]), pixfmt)
  }

  if ((desc.flags & AVPixelFormatFlags.PALETTE)
    && pointers[1]
    && pointers[1] - pointers[0] > linesizes[0] * h
  ) {
    /* zero-initialize the padding before the palette */
    memset(pointers[0] + linesizes[0] * h, 0, pointers[1] - pointers[0] - linesizes[0] * h)
  }

  defer()
  return ret

  function defer() {
    stack.free(sizeof(linesizes[0]) * 4)
    stack.free(sizeof(size) * 4)
  }
}

export function pixelGetSize(pixfmt: AVPixelFormat, width: int32, height: int32, align: int32) {
  const desc = getAVPixelFormatDescriptor(pixfmt)

  if (!desc) {
    return errorType.INVALID_ARGUMENT
  }

  const linesizes = reinterpret_cast<pointer<int32>>(stack.malloc(sizeof(int32) * 4))
  const alignedLinesizes = reinterpret_cast<pointer<int32>>(stack.malloc(sizeof(int32) * 4))
  const sizes = reinterpret_cast<pointer<size>>(stack.malloc(sizeof(size) * 4))

  let ret = 0

  if ((ret = pixelFillLinesizes(linesizes, pixfmt, width)) < 0) {
    defer()
    return ret
  }

  for (let i = 0; i < 4; i++) {
    alignedLinesizes[i] = alignFunc(linesizes[i], align)
  }

  if ((ret = pixelFillPlaneSizes(sizes, pixfmt, height, alignedLinesizes)) < 0) {
    defer()
    return ret
  }

  let totalSize: size = 0

  for (let i = 0; i < 4; i++) {
    if (totalSize > reinterpret_cast<size>(INT32_MAX) - sizes[i]) {
      defer()
      return errorType.INVALID_ARGUMENT
    }
    totalSize += sizes[i]
  }

  defer()

  return totalSize

  function defer() {
    stack.free(sizeof(int32) * 4)
    stack.free(sizeof(int32) * 4)
    stack.free(sizeof(size) * 4)
  }
}
