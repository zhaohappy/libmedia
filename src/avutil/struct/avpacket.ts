/*
 * libmedia AVPacket defined
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

import { AVPacketSideDataType } from '../codec'
import { AV_TIME_BASE, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from '../constant'
import { AVBufferRef } from './avbuffer'
import { Rational } from './rational'

export const enum AVPacketType {
  AUDIO,
  VIDEO
}

export const enum AVPacketFlags {
  /**
   * The packet contains a keyframe
   */
  AV_PKT_FLAG_KEY = 1,
  /**
   * The packet content is corrupted
   */
  AV_PKT_FLAG_CORRUPT = 2,
  /**
   * Flag is used to discard packets which are required to maintain valid
   * decoder state but are not required for output and should be dropped
   * after decoding.
   */
  AV_PKT_FLAG_DISCARD = 4,
  /**
   * The packet comes from a trusted source.
   *
   * Otherwise-unsafe constructs such as arbitrary pointers to data
   * outside the packet may be followed.
   */
  AV_PKT_FLAG_TRUSTED = 8,
  /**
   * Flag is used to indicate packets that contain frames that can
   * be discarded by the decoder.  I.e. Non-reference frames.
   */
  AV_PKT_FLAG_DISPOSABLE = 16,

  /**
   * The stream is end
   */
  AV_PKT_FLAG_END = 32
}

@struct
export class AVPacketSideData {
  data: pointer<uint8> = nullptr

  size: size = 0

  type: AVPacketSideDataType = AVPacketSideDataType.AV_PKT_DATA_UNKNOWN
}

@struct
export class AVProducerReferenceTime {
  wallclock: int64
  flags: int32
}


/**
 * FFmpeg AVPacket 定义
 */
@struct
export default class AVPacket {
  /**
   * A reference to the reference-counted buffer where the packet data is
   * stored.
   * May be NULL, then the packet data is not reference-counted.
   */
  buf: pointer<AVBufferRef> = nullptr

  /**
   * Presentation timestamp in AVStream->time_base units; the time at which
   * the decompressed packet will be presented to the user.
   * Can be AV_NOPTS_VALUE if it is not stored in the file.
   * pts MUST be larger or equal to dts as presentation cannot happen before
   * decompression, unless one wants to view hex dumps. Some formats misuse
   * the terms dts and pts/cts to mean something different. Such timestamps
   * must be converted to true pts/dts before they are stored in AVPacket.
   */
  pts: int64 = NOPTS_VALUE_BIGINT

  /**
   * Decompression timestamp in AVStream->time_base units; the time at which
   * the packet is decompressed.
   * Can be AV_NOPTS_VALUE if it is not stored in the file.
   */
  dts: int64 = NOPTS_VALUE_BIGINT

  data: pointer<uint8> = nullptr

  size: int32 = 0

  streamIndex: int32 = NOPTS_VALUE

  /**
   * A combination of @AVPacketFlags values
   */
  flags: int32 = 0

  /**
   * Additional packet data that can be provided by the container.
   * Packet can contain several types of side information.
   */
  sideData: pointer<AVPacketSideData> = nullptr
  sideDataElems: int32 = 0

  /**
   * Duration of this packet in AVStream->time_base units, 0 if unknown.
   * Equals next_pts - this_pts in presentation order.
   */
  duration: int64 = NOPTS_VALUE_BIGINT

  pos: int64 = NOPTS_VALUE_BIGINT

  /**
   * for some private data of the user
   */
  opaque: pointer<void> = nullptr

  /**
   * AVBufferRef for free use by the API user. FFmpeg will never check the
   * contents of the buffer ref. FFmpeg calls av_buffer_unref() on it when
   * the packet is unreferenced. av_packet_copy_props() calls create a new
   * reference with av_buffer_ref() for the target packet's opaque_ref field.
   *
   * This is unrelated to the opaque field, although it serves a similar
   * purpose.
   */
  opaqueRef: pointer<AVBufferRef> = nullptr

  /**
   * Time base of the packet's timestamps.
   */
  timeBase: Rational = new Rational({ den: AV_TIME_BASE, num: 1 })

  /**
   * 码流格式
   * 对于 h264/h265/h266 标记是 annexb 还是 avcc 格式
   */
  bitFormat: int32 = 0
}

@struct
export class AVPacketRef extends AVPacket {
  refCount: atomic_int32
}

export interface AVPacketPool {
  alloc: () => pointer<AVPacketRef>
  release: (avpacket: pointer<AVPacketRef>) => void
}
