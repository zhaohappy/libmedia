/*
 * libmedia rtp depacketizer
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

import * as logger from 'common/util/logger'
import { HEVCPayloadContext, Mpeg4PayloadContext, RTP_HEVC_DOND_FIELD_SIZE,
  RTP_HEVC_DONL_FIELD_SIZE, RTP_HEVC_PAYLOAD_HEADER_SIZE, RTP_MAX_PACKET_LENGTH } from './rtp'
import concatTypeArray from 'common/function/concatTypeArray'
import BitReader from 'common/io/BitReader'
import * as h264Util from 'avutil/codecs/h264'
import * as hevcUtil from 'avutil/codecs/hevc'
import * as av1Util from 'avutil/codecs/av1'
import * as vp9Util from 'avutil/codecs/vp9'
import { RTPPacket } from './RTPPacket'
import { AVMediaType } from 'avutil/codec'

export function h264(rtps: RTPPacket[]) {
  const nalus: Uint8Array[] = []
  let isKey = false

  for (let i = 0; i < rtps.length; i++) {
    const payload =  rtps[i].payload
    const type = payload[0] & 0x1f

    switch (type) {
      // STAP-A (one packet, multiple nalus)
      case 24:
        for (let j = 1; j < payload.length - 2;) {
          const len = (payload[j] << 8) | payload[j + 1]
          if (j + 2 + len > payload.length) {
            logger.error('pack h264 STAP-A failed')
            return {
              nalus: [],
              isKey
            }
          }
          nalus.push(payload.subarray(j + 2, j + 2 + len))

          if ((payload[j + 2] & 0x1f) === h264Util.H264NaluType.kSliceIDR) {
            isKey = true
          }

          j += 2 + len
        }
        break
      // STAP-B
      case 25:
      // MTAP-16            
      case 26:
      // MTAP-24           
      case 27:
      // FU-B              
      case 29:
        logger.error('not support nalu pack')
        return {
          nalus: [],
          isKey
        }
      // FU-A
      case 28:
        const fuHeader = payload[1]
        if (((fuHeader >>> 7) & 0x01) !== 1) {
          logger.error('not the first FU-A packet')
          return {
            nalus: [],
            isKey
          }
        }
        const nalType = fuHeader & 0x1f
        const nal = (payload[0] & 0xe0) | nalType
        if (nalType === h264Util.H264NaluType.kSliceIDR) {
          isKey = true
        }

        const buffers: Uint8Array[] = [new Uint8Array([nal])]
        buffers.push(payload.subarray(2))
        i++
        for (; i < rtps.length; i++) {
          buffers.push(rtps[i].payload.subarray(2))
          if ((rtps[i].payload[1] >>> 6) & 0x01) {
            break
          }
        }
        nalus.push(concatTypeArray(Uint8Array, buffers))
        break
      default:
        if (type === h264Util.H264NaluType.kSliceIDR) {
          isKey = true
        }
        nalus.push(payload)
        break
    }
  }
  return {
    nalus,
    isKey
  }
}

export function hevc(rtps: RTPPacket[], context: HEVCPayloadContext) {
  const nalus: Uint8Array[] = []

  let isKey = false

  for (let i = 0; i < rtps.length; i++) {
    const payload =  rtps[i].payload
    const type = (payload[0] >>> 1) & 0x3f

    if (type > 50) {
      logger.error('not support nalu pack')
    }

    switch (type) {
      // STAP-A (one packet, multiple nalus)
      case 48:
        for (let j = RTP_HEVC_PAYLOAD_HEADER_SIZE + (context.usingDonlField ? RTP_HEVC_DONL_FIELD_SIZE : 0); j < payload.length - 2;) {
          const len = (payload[j] << 8) | payload[j + 1]
          if (j + 2 + len > payload.length) {
            logger.error('pack hevc STAP-A failed')
            return {
              nalus: [],
              isKey
            }
          }
          nalus.push(payload.subarray(j + 2, j + 2 + len))

          const nalType = (payload[j + 2] >>> 1) & 0x3f
          if (nalType === hevcUtil.HEVCNaluType.kSliceIDR_N_LP
            || nalType === hevcUtil.HEVCNaluType.kSliceIDR_W_RADL
          ) {
            isKey = true
          }

          j += 2 + len

          if (context.usingDonlField) {
            j += RTP_HEVC_DOND_FIELD_SIZE
          }
        }
        break
      // FU-A
      case 49:
        const fuHeader = payload[2]
        const nalType = fuHeader & 0x3f
        if (nalType === hevcUtil.HEVCNaluType.kSliceIDR_N_LP
          || nalType === hevcUtil.HEVCNaluType.kSliceIDR_W_RADL
        ) {
          isKey = true
        }
        const buffers: Uint8Array[] = [new Uint8Array([(payload[0] & 0x81 | (nalType << 1)), payload[1]])]
        buffers.push(payload.subarray(3 + (context.usingDonlField ? RTP_HEVC_DONL_FIELD_SIZE : 0)))
        i++
        for (; i < rtps.length; i++) {
          buffers.push(rtps[i].payload.subarray(3 + (context.usingDonlField ? RTP_HEVC_DONL_FIELD_SIZE : 0)))
          if ((rtps[i].payload[2] >>> 6) & 0x01) {
            break
          }
        }
        nalus.push(concatTypeArray(Uint8Array, buffers))
        break
      // PACI
      case 50:
        logger.error('not support nalu pack')
        return {
          nalus: [],
          isKey
        }
      default:
        if (type === hevcUtil.HEVCNaluType.kSliceIDR_N_LP
          || type === hevcUtil.HEVCNaluType.kSliceIDR_W_RADL
        ) {
          isKey = true
        }
        nalus.push(payload)
        break
    }
  }
  return {
    nalus,
    isKey
  }
}

export function mpeg4(rtps: RTPPacket[], context: Mpeg4PayloadContext) {
  const frames: Uint8Array[] = []
  const buffers: Uint8Array[] = []
  const bitReader: BitReader = new BitReader(RTP_MAX_PACKET_LENGTH)
  for (let i = 0; i < rtps.length; i++) {
    const payload = rtps[i].payload
    if (context.latm) {
      let offset = 0
      while (offset < payload.length) {
        let length = 0
        while (true) {
          const tmp = payload[offset++]
          length += tmp
          if (tmp !== 0xff) {
            break
          }
        }
        frames.push(payload.subarray(offset, offset + length))
        offset += length
      }
    }
    else {
      if (payload.length < 2) {
        logger.error('invalid mpeg4 payload length')
        return
      }
      const auHeadersLength = (payload[0] << 8) | payload[1]
      if (auHeadersLength > RTP_MAX_PACKET_LENGTH) {
        logger.error('invalid mpeg4 payload au header length')
        return
      }
      const auHeadersLengthBytes = ((auHeadersLength + 7) / 8) >>> 0
      if (payload.length - 2 < auHeadersLengthBytes) {
        logger.error('invalid mpeg4 payload au length')
        return
      }
      const auHeaderSize = context.sizeLength + context.indexLength

      // Wrong if optional additional sections are present (cts, dts etc...)
      if ((auHeadersLength % auHeaderSize) !== 0) {
        logger.error('not support mpeg4 payload au format')
        return
      }

      const nbAuHeaders = auHeadersLength / auHeaderSize
      const sizes: number[] = []
      const indexes: number[] = []
      bitReader.reset()
      bitReader.appendBuffer(payload.subarray(2))
      for (let j = 0; j < nbAuHeaders; j++) {
        sizes.push(bitReader.readU(context.sizeLength))
        indexes.push(bitReader.readU(context.indexLength))
      }
      if (sizes.length === 1 && sizes[0] + auHeadersLengthBytes + 2 >= payload.length) {
        // 一个 rtp 一个 au
        if (sizes[0] + auHeadersLengthBytes + 2 === payload.length) {
          frames.push(payload.subarray(2 + auHeadersLengthBytes))
        }
        else {
          // push 下一帧的数据
          buffers.push(payload.subarray(2 + auHeadersLengthBytes))
        }
      }
      else if (sizes.length > 1) {
        let offset = auHeadersLengthBytes + 2
        for (let j = 0; j < sizes.length; j++) {
          if (!indexes[j] && buffers.length) {
            frames.push(buffers.length === 1 ? buffers[0] : concatTypeArray(Uint8Array, buffers))
            buffers.length = 0
          }
          frames.push(payload.subarray(offset, offset + sizes[j]))
          offset += sizes[j]
        }
      }
    }
  }
  if (buffers.length) {
    frames.push(buffers.length === 1 ? buffers[0] : concatTypeArray(Uint8Array, buffers))
  }
  return frames
}

export function vp8(rtps: RTPPacket[]) {
  const buffers: Uint8Array[] = []
  let isKey = false

  for (let i = 0; i < rtps.length; i++) {
    const X = rtps[i].payload[0] >>> 7
    const S = (rtps[i].payload[0] >>> 4) & 0x01
    const PID = rtps[i].payload[0] & 0x07

    let offset = 1

    if (X) {
      const I = rtps[i].payload[offset] >>> 7
      const L = (rtps[i].payload[offset] >>> 6) & 0x01
      const T = (rtps[i].payload[offset] >>> 5) & 0x01
      const K = (rtps[i].payload[offset] >>> 4) & 0x01
      offset++
      // PictureID
      if (I) {
        // 7bit
        const M = rtps[i].payload[offset++] >>> 7
        // 15 bit
        if (M) {
          offset++
        }
      }
      // TL0PICIDX
      if (L) {
        offset++
      }

      if (T || K) {
        offset++
      }
      if (S && PID === 0 && !(rtps[i].payload[offset] & 0x01)) {
        isKey = true
      }
      buffers.push(rtps[i].payload.subarray(offset))
    }
  }
  if (buffers.length === 1) {
    return {
      payload: buffers[0],
      isKey
    }
  }
  return {
    payload: concatTypeArray(Uint8Array, buffers),
    isKey
  }
}

// https://datatracker.ietf.org/doc/draft-uberti-payload-vp9/00/
export function vp9(rtps: RTPPacket[]) {
  const buffers: Uint8Array[] = []

  let isKey = false

  for (let i = 0; i < rtps.length; i++) {
    const I = rtps[i].payload[0] >>> 7
    const L = (rtps[i].payload[0] >>> 5) & 0x01
    const F = (rtps[i].payload[0] >>> 4) & 0x01
    const B = (rtps[i].payload[0] >>> 3) & 0x01
    const V = (rtps[i].payload[0] >>> 1) & 0x01

    let offset = 1

    // PictureID
    if (I) {
      // 7bit
      const M = rtps[i].payload[offset++] >>> 7
      // 15 bit
      if (M) {
        offset++
      }
    }

    let R = 0

    if (L) {
      if (F) {
        R = rtps[i].payload[offset] & 0x03
      }
      offset++
    }

    if (F) {
      for (let i = 0; i < R; i++) {
        if (rtps[i].payload[offset] & 0x10) {
          offset += 2
        }
        else {
          offset += 1
        }
      }
    }

    if (V) {
      const ns = rtps[i].payload[offset] >> 5
      const y = !!(rtps[i].payload[offset] & 0x10)
      const g = !!(rtps[i].payload[offset] & 0x08)
      offset++
      if (ns > 0) {
        logger.fatal('VP9 scalability structure with multiple layers')
      }
      if (y) {
        for (i = 0; i < ns + 1; i++) {
          offset += 4
        }
      }
      if (g) {
        const ng = rtps[i].payload[offset++]
        for (i = 0; i < ng; i++) {
          const r = (rtps[i].payload[offset] >> 2) & 0x03
          offset++
          for (let j = 0; j < r; j++) {
            offset++
          }
        }
      }
    }

    if (B) {
      const first = rtps[i].payload[offset]
      const version = (first >>> 5) & 0x01
      const high = (first >>> 4) & 0x01
      const profile = (high << 1) + version
      const showExistingFrame = (first >>> (profile === vp9Util.VP9Profile.Profile3 ? 2 : 3)) & 0x01
      if (showExistingFrame) {
        isKey = false
      }
      else {
        isKey = !((first >>> (profile === vp9Util.VP9Profile.Profile3 ? 1 : 2)) & 0x01)
      }
    }
    buffers.push(rtps[i].payload.subarray(offset))
  }
  if (buffers.length === 1) {
    return {
      isKey,
      payload: buffers[0]
    }
  }
  return {
    isKey,
    payload: concatTypeArray(Uint8Array, buffers)
  }
}

export function av1(rtps: RTPPacket[]) {
  const buffers: Uint8Array[] = []
  let isKey = false

  function leb128(buffer: Uint8Array, offset: number) {
    let value = 0
    for (let i = 0; i < 8; i++ ) {
      let next = buffer[offset++]
      value |= ((next & 0x7f) << (i * 7))
      if (!(next & 0x80)) {
        break
      }
    }
    return {
      value,
      offset
    }
  }

  for (let i = 0; i < rtps.length; i++) {
    const W = (rtps[i].payload[0] >>> 4) & 0x03
    let offset = 1
    if (W) {
      for (let i = 0; i < W - 1; i++) {
        const result = leb128(rtps[i].payload, offset)
        offset = result.offset
        const type = (rtps[i].payload[offset] >>> 3) & 0x0f
        if (type === av1Util.OBUType.SEQUENCE_HEADER) {
          isKey = true
        }
        buffers.push(rtps[i].payload.subarray(offset, offset + result.value))
        offset += result.value
      }
      const type = (rtps[i].payload[offset] >>> 3) & 0x0f
      if (type === av1Util.OBUType.SEQUENCE_HEADER) {
        isKey = true
      }
      buffers.push(rtps[i].payload.subarray(offset))
    }
    else {
      while (offset < rtps[i].payload.length - 1) {
        const result = leb128(rtps[i].payload, offset)
        offset = result.offset
        const type = (rtps[i].payload[offset] >>> 3) & 0x0f
        if (type === av1Util.OBUType.SEQUENCE_HEADER) {
          isKey = true
        }
        buffers.push(rtps[i].payload.subarray(offset, offset + result.value))
        offset += result.value
      }
    }
  }
  if (buffers.length === 1) {
    return {
      payload: buffers[0],
      isKey
    }
  }
  return {
    payload: concatTypeArray(Uint8Array, buffers),
    isKey
  }
}

export function mpeg12(rtps: RTPPacket[], mediaType: AVMediaType) {
  const buffers: Uint8Array[] = []

  for (let i = 0; i < rtps.length; i++) {
    let offset = 4
    if (mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO
      && ((rtps[i].payload[0] >>> 2) & 0x01) === 1
    ) {
      offset = 8
    }
    buffers.push(rtps[i].payload.subarray(offset))
  }
  if (buffers.length === 1) {
    return buffers[0]
  }
  return concatTypeArray(Uint8Array, buffers)
}

export function ac3(rtps: RTPPacket[]) {
  const frames: Uint8Array[] = []
  const buffers: Uint8Array[] = []
  for (let i = 0; i < rtps.length; i++) {
    const payload = rtps[i].payload
    const ft = payload[0] & 0x03
    switch (ft) {
      case 0:
        frames.push(payload.subarray(2))
        break
      case 1:
      case 2:
        buffers.push(payload.subarray(2))
        break
      case 3:
        buffers.push(payload.subarray(2))
        frames.push(concatTypeArray(Uint8Array, buffers))
        buffers.length = 0
        break
    }
  }
  if (frames.length === 1) {
    return frames[0]
  }
  return concatTypeArray(Uint8Array, frames)
}

export function concat(rtps: RTPPacket[]) {

  if (rtps.length === 1) {
    return rtps[0].payload
  }

  const buffers: Uint8Array[] = []

  for (let i = 0; i < rtps.length; i++) {
    buffers.push(rtps[i].payload)
  }
  return concatTypeArray(Uint8Array, buffers)
}
