/*
 * libmedia rtp codec
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

import { AVCodecID } from 'avutil/codec'
import { H264PayloadContext, HEVCPayloadContext, Mpeg4PayloadContext } from './rtp'
import { avMalloc } from 'avutil/util/mem'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import * as base64 from 'common/util/base64'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as aac from 'avutil/codecs/aac'
import * as naluUtil from 'avutil/util/nalu'
import { Data } from 'common/types/type'
import AVStream from 'avutil/AVStream'
import BitReader from 'common/io/BitReader'
import * as logger from 'common/util/logger'

function eachConfig(config: string, callback: (key: string, value: string) => void) {
  const list = config.split(';')
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const l2 = item.split('=')
    const key = l2[0].trim()
    l2.shift()
    const value = l2.join('=').trim()
    callback(key, value)
  }
}

export function parseH264Fmtp(stream: AVStream, config: string) {
  stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
  const context: Partial<H264PayloadContext> = {}
  eachConfig(config, (key, value) => {
    switch (key) {
      case 'profile-level-id':
        context.profile = +('0x' + value.substring(0, 2))
        context.level = +('0x' + value.substring(4, 6))
        break
      case 'packetization-mode':
        context.packetizationMode = +value
        break
      case 'sprop-parameter-sets':
        const nalus: Uint8Array[] = value.split(',').map((context) => {
          return base64.base64ToUint8Array(context)
        })
        const extradata = naluUtil.joinNaluByStartCode(nalus, 0)
        stream.codecpar.extradata = avMalloc(extradata.length)
        stream.codecpar.extradataSize = extradata.length
        memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
        h264.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
        break
    }
  })
  return context
}

export function parseHevcFmtp(stream: AVStream, config: string) {
  const context: Partial<HEVCPayloadContext> = {}

  const nalus: Uint8Array[] = []
  stream.codecpar.bitFormat = h264.BitFormat.ANNEXB

  eachConfig(config, (key, value) => {
    switch (key) {
      case 'profile-id':
        context.profile = +value
        break
      case 'sprop-vps':
      case 'sprop-sps':
      case 'sprop-pps':
      case 'sprop-sei':
        nalus.push(base64.base64ToUint8Array(value))
        break
    }
  })

  if (nalus.length) {
    const extradata = naluUtil.joinNaluByStartCode(nalus, 0)
    stream.codecpar.extradata = avMalloc(extradata.length)
    stream.codecpar.extradataSize = extradata.length
    memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
    hevc.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
  }
  return context
}

export function parseMpeg4Fmtp(stream: AVStream, config: string) {
  const context: Partial<Mpeg4PayloadContext> = {}

  eachConfig(config, (key, value) => {
    switch (key) {
      case 'streamtype':
        context.streamType = +value
        break
      case 'profile-level-id':
        context.profileLevelId = +value
        break
      case 'mode':
        context.mode = value
        break
      case 'sizelength':
        context.sizeLength = +value
        break
      case 'indexlength':
        context.indexLength = +value
        break
      case 'indexdeltalength':
        context.indexDeltaLength = +value
        break
      case 'config':
        context.config = value
        stream.codecpar.extradata = avMalloc(value.length / 2)
        stream.codecpar.extradataSize = value.length / 2
        const buffer = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
        let offset = 0
        for (let i = 0; i < value.length; i += 2) {
          buffer[offset++] = +('0x' + value.substring(i, i + 2))
        }
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          aac.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
        }
        break
    }
  })

  return context
}

export function parseAacLatmFmtp(stream: AVStream, config: string) {
  const context: Partial<Mpeg4PayloadContext> = {
    latm: true
  }

  // change codec from AV_CODEC_ID_AAC_LATM to AV_CODEC_ID_AAC
  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC

  eachConfig(config, (key, value) => {
    switch (key) {
      case 'profile-level-id':
        context.profileLevelId = +value
        break
      case 'cpresent':
        context.cpresent = +value
        break
      case 'config':
        context.config = value
        const config = new Uint8Array(value.length / 2)
        let offset = 0
        for (let i = 0; i < value.length; i += 2) {
          config[offset++] = +('0x' + value.substring(i, i + 2))
        }
        const bitReader = new BitReader(config.length)
        bitReader.appendBuffer(config)
        const audioMuxVersion = bitReader.readU1()
        const sameTimeFraming = bitReader.readU1()
        bitReader.skip(6)
        const numPrograms = bitReader.readU(4)
        const numLayers = bitReader.readU(3)
        if (audioMuxVersion != 0
          || sameTimeFraming != 1
          || numPrograms != 0
          || numLayers != 0
        ) {
          logger.fatal('LATM config not support')
        }

        stream.codecpar.extradata = avMalloc(2)
        stream.codecpar.extradataSize = 2
        const buffer = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
        buffer[0] = bitReader.readU(8)
        buffer[1] = bitReader.readU(8)
        aac.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
        break
    }
  })

  return context
}

export const CodecIdFmtpHandler: Partial<Record<AVCodecID, (stream: AVStream, config: string) => Data>> = {
  [AVCodecID.AV_CODEC_ID_H264]: parseH264Fmtp,
  [AVCodecID.AV_CODEC_ID_HEVC]: parseHevcFmtp,
  [AVCodecID.AV_CODEC_ID_AAC]: parseMpeg4Fmtp,
  [AVCodecID.AV_CODEC_ID_AAC_LATM]: parseAacLatmFmtp,
  [AVCodecID.AV_CODEC_ID_MPEG4]: parseMpeg4Fmtp
}
