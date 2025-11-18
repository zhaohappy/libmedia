/*
 * libmedia rtcp
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

export const enum RTCPPayloadType {
  SR = 200,
  RR = 201,
  SDES = 202,
  BYE = 203,
  APP = 204,
  RTPFB = 205,
  PSFB = 206,
  XR = 207,
}

export const enum RTPFBFmt {
  NACK = 1,
  TMMBR = 3,
  TMMBN = 4,
  TFB = 15
}

export const enum PSFBFmt {
  PLI = 1,
  SLI = 2,
  RPSI = 3,
  FIR = 4,
  TSTR = 5,
  TSTN = 6
}

export const enum XRBlockType {
  LRLE = 1,
  DRLE,
  PRT,
  RRT,
  DLRR,
  SS,
  VM
}
