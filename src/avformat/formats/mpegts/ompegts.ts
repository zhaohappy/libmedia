/*
 * libmedia mpegts encode util
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

import IOWriter from 'common/io/IOWriterSync'
import { PAT, PES, PMT, SectionPacket, TSPacket } from './struct'
import { MpegtsContext, MpegtsStreamContext } from './type'
import * as mpegts from './mpegts'
import * as logger from 'common/util/logger'
import Stream from 'avutil/AVStream'
import mktag from '../../function/mktag'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import concatTypeArray from 'common/function/concatTypeArray'
import { NOPTS_VALUE_BIGINT, UINT16_MAX } from 'avutil/constant'
import { calculateCRC32 } from './function/crc32'

function getAdaptationFieldLength(tsPacket: TSPacket) {
  if (tsPacket.adaptationFieldControl !== 0x02 && tsPacket.adaptationFieldControl !== 0x03) {
    return 0
  }

  if (tsPacket.adaptationFieldControl === 0x02) {
    return mpegts.TS_PACKET_SIZE - 4
  }

  let len = 2

  if (tsPacket.adaptationFieldInfo.pcrFlag) {
    len += 6
  }
  if (tsPacket.adaptationFieldInfo.opcrFlag) {
    len += 6
  }
  if (tsPacket.adaptationFieldInfo.splicingPointFlag) {
    len += 1
  }
  if (tsPacket.adaptationFieldInfo.transportPrivateDataFlag) {
    len += tsPacket.adaptationFieldInfo.transportPrivateData
      ? tsPacket.adaptationFieldInfo.transportPrivateData.length
      : 0
  }
  if (tsPacket.adaptationFieldInfo.adaptationFieldExtensionFlag) {
    len += tsPacket.adaptationFieldInfo.extension ? tsPacket.adaptationFieldInfo.extension.length : 0
  }

  if (len > 256) {
    logger.warn('adaptationField size is too large')
  }

  return len
}

function getPESHeaderLength(pes: PES) {
  let len = 6

  const streamId = pes.streamId

  if (streamId !== mpegts.TSStreamId.PROGRAM_STREAM_MAP
    && streamId !== mpegts.TSStreamId.PADDING_STREAM
    && streamId !== mpegts.TSStreamId.PRIVATE_STREAM_2
    && streamId !== mpegts.TSStreamId.ECM_STREAM
    && streamId !== mpegts.TSStreamId.EMM_STREAM
    && streamId !== mpegts.TSStreamId.PROGRAM_STREAM_DIRECTORY
    && streamId !== mpegts.TSStreamId.DSMCC_STREAM
    && streamId !== mpegts.TSStreamId.TYPE_E_STREAM
  ) {
    len += 3

    if (pes.pts !== NOPTS_VALUE_BIGINT) {
      len += 5
    }
    if (pes.dts !== NOPTS_VALUE_BIGINT && pes.pts !== NOPTS_VALUE_BIGINT && pes.dts !== pes.pts) {
      len += 5
    }
  }

  return len
}

function writePESPayload(
  ioWriter: IOWriter,
  pes: PES,
  payload: Uint8Array,
  stream: Stream,
  mpegtsContext: MpegtsContext
) {

  const streamContext = stream.privData as MpegtsStreamContext
  const tsPacket = streamContext.tsPacket

  if (pes.pid === mpegtsContext.pmt.pcrPid) {
    tsPacket.adaptationFieldControl = 0x03
    tsPacket.adaptationFieldInfo.pcrFlag = 1
    tsPacket.adaptationFieldInfo.pcr = pes.dts * 300n
  }
  tsPacket.adaptationFieldInfo.randomAccessIndicator = pes.randomAccessIndicator

  if (pes.randomAccessIndicator) {
    tsPacket.adaptationFieldControl = 0x03
  }

  let adaptationFieldLength = getAdaptationFieldLength(tsPacket)

  let continuityCounter = streamContext.continuityCounter

  if (4 + adaptationFieldLength + payload.length <= mpegts.TS_PACKET_SIZE) {
    tsPacket.payloadUnitStartIndicator = 0x01
    tsPacket.payload = payload
    tsPacket.continuityCounter = (continuityCounter++) % 16

    writeTSPacket(ioWriter, tsPacket, mpegtsContext)

    streamContext.continuityCounter = continuityCounter % 16
    return
  }

  let len = mpegts.TS_PACKET_SIZE - (4 + adaptationFieldLength)
  let pos = 0

  while (pos < payload.length) {

    let next = Math.min(pos + len, payload.length)

    if (pos === 0) {
      tsPacket.payloadUnitStartIndicator = 0x01
    }
    else {
      tsPacket.payloadUnitStartIndicator = 0x00
    }

    if (tsPacket.adaptationFieldControl === 0x01 && (next - pos + 4 === mpegts.TS_PACKET_SIZE - 1)) {
      // padding 至少需要 2 字节
      next--
    }

    tsPacket.payload = payload.subarray(pos, next)
    tsPacket.continuityCounter = (continuityCounter++) % 16

    writeTSPacket(ioWriter, tsPacket, mpegtsContext)

    if (pos === 0) {
      tsPacket.adaptationFieldInfo.randomAccessIndicator = 0
      tsPacket.adaptationFieldControl = 0x01
      tsPacket.adaptationFieldInfo.pcrFlag = 0
      adaptationFieldLength = getAdaptationFieldLength(tsPacket)
      len = mpegts.TS_PACKET_SIZE - (4 + adaptationFieldLength)
    }

    pos = next
  }

  streamContext.continuityCounter = continuityCounter % 16
}

export function getStreamType(stream: Stream) {

  const context = stream.privData as MpegtsStreamContext || {} as any

  switch (stream.codecpar.codecId) {
    case AVCodecID.AV_CODEC_ID_MPEG1VIDEO:
    case AVCodecID.AV_CODEC_ID_MPEG2VIDEO:
      return mpegts.TSStreamType.VIDEO_MPEG2
    case AVCodecID.AV_CODEC_ID_MPEG4:
      return mpegts.TSStreamType.VIDEO_MPEG4
    case AVCodecID.AV_CODEC_ID_H264:
      return mpegts.TSStreamType.VIDEO_H264
    case AVCodecID.AV_CODEC_ID_CAVS:
      return mpegts.TSStreamType.VIDEO_CAVS
    case AVCodecID.AV_CODEC_ID_HEVC:
      return mpegts.TSStreamType.VIDEO_HEVC
    case AVCodecID.AV_CODEC_ID_VVC:
      return mpegts.TSStreamType.VIDEO_VVC
    case AVCodecID.AV_CODEC_ID_DIRAC:
      return mpegts.TSStreamType.VIDEO_DIRAC
    case AVCodecID.AV_CODEC_ID_VC1:
      return mpegts.TSStreamType.VIDEO_VC1

    case AVCodecID.AV_CODEC_ID_MP2:
    case AVCodecID.AV_CODEC_ID_MP3:
      return stream.codecpar.sampleRate < 32000
        ? mpegts.TSStreamType.AUDIO_MPEG2
        : mpegts.TSStreamType.AUDIO_MPEG1

    case AVCodecID.AV_CODEC_ID_AAC:
      return context.latm
        ? mpegts.TSStreamType.AUDIO_AAC_LATM
        : mpegts.TSStreamType.AUDIO_AAC
    case AVCodecID.AV_CODEC_ID_AAC_LATM:
      return mpegts.TSStreamType.AUDIO_AAC_LATM
    case AVCodecID.AV_CODEC_ID_AC3:
      return mpegts.TSStreamType.AUDIO_AC3
    case AVCodecID.AV_CODEC_ID_OPUS:
    case AVCodecID.AV_CODEC_ID_AV1:
      return mpegts.TSStreamType.PRIVATE_DATA
    case AVCodecID.AV_CODEC_ID_TRUEHD:
      return mpegts.TSStreamType.AUDIO_TRUEHD
    case AVCodecID.AV_CODEC_ID_EAC3:
      return mpegts.TSStreamType.AUDIO_EAC3
    case AVCodecID.AV_CODEC_ID_DTS:
      return mpegts.TSStreamType.AUDIO_DTS
    case AVCodecID.AV_CODEC_ID_DVB_SUBTITLE:
    case AVCodecID.AV_CODEC_ID_SMPTE_KLV:
      return mpegts.TSStreamType.PRIVATE_DATA

    default:
      return mpegts.TSStreamType.PRIVATE_DATA
  }
}

export function getStreamId(stream: Stream) {
  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DIRAC) {
      return mpegts.TSStreamId.EXTENDED_STREAM_ID
    }
    else {
      return mpegts.TSStreamId.VIDEO_STREAM_0
    }
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
    && (
      stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP2
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC
    )
  ) {
    return mpegts.TSStreamId.AUDIO_STREAM_0
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
    && stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
  ) {
    return mpegts.TSStreamId.EXTENDED_STREAM_ID
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_DATA) {
    return mpegts.TSStreamId.METADATA_STREAM
  }
  else {
    return mpegts.TSStreamId.PRIVATE_STREAM_1
  }
}

export function getPATPayload(pat: PAT) {

  const buffer = new Uint8Array(1024)

  buffer[1] = 0x00
  buffer[2] = 0xb0

  // transport_stream_id 1 
  buffer[5] = 1

  // current_next_indicator
  buffer[6] = (3 << 6) | 0x01

  let pos = 9

  if (pat.networkPid > -1) {
    pos += 2
    buffer[pos++] = (7 << 5) | ((pat.networkPid >> 8) & 0x1f)
    buffer[pos++] = (pat.networkPid & 0xff)
  }

  pat.program2PmtPid.forEach((pid, programNumber) => {
    buffer[pos++] = (programNumber >> 8) & 0xff
    buffer[pos++] = programNumber & 0xff
    buffer[pos++] = (7 << 5) | (pid >> 8) & 0x1f
    buffer[pos++] = pid & 0xff
  })

  const crcPos = pos
  pos += 4

  for (let i = pos; i < mpegts.TS_PACKET_SIZE - 4; i++) {
    buffer[i] = 0xff
  }

  const len = (pos - 1) - 3

  buffer[2] |= ((len >> 8) & 0x0f)
  buffer[3] = len & 0xff

  // CRC32
  const crc32 = calculateCRC32(buffer.subarray(1, crcPos))
  buffer[crcPos] = (crc32 >> 24) & 0xff
  buffer[crcPos + 1] = (crc32 >> 16) & 0xff
  buffer[crcPos + 2] = (crc32 >> 8) & 0xff
  buffer[crcPos + 3] = crc32 & 0xff

  return buffer.slice(0, mpegts.TS_PACKET_SIZE - 4)
}

export function getPMTPayload(pmt: PMT, streams: Stream[]) {
  const buffer = new Uint8Array(1024)

  buffer[1] = 0x02
  buffer[2] = 0xb0

  buffer[4] = ((pmt.programNumber >> 8) & 0x0f)
  buffer[5] = pmt.programNumber & 0xff

  // current_next_indicator
  buffer[6] = (3 << 6) | 0x01

  let pos = 9

  buffer[pos++] = (7 << 5) | (pmt.pcrPid >> 8) & 0x1f
  buffer[pos++] = pmt.pcrPid & 0xff

  const programInfoLengthPos = pos
  pos += 2

  function putRegistrationDescriptor(tag: number) {
    buffer[pos++] = mpegts.REGISTRATION_DESCRIPTOR
    buffer[pos++] = 4
    buffer[pos++] = tag >> 24
    buffer[pos++] = tag >> 16
    buffer[pos++] = tag >> 8
    buffer[pos++] = tag
  }

  let len = 0xf000 | (pos - programInfoLengthPos - 2)
  buffer[programInfoLengthPos] = len >> 8
  buffer[programInfoLengthPos + 1] = len

  for (let i = 0; i < streams.length; i++) {
    const streamType = getStreamType(streams[i])
    buffer[pos++] = streamType

    const streamContext = streams[i].privData as MpegtsStreamContext

    buffer[pos++] = (7 << 5) | (streamContext.pid >> 8) & 0x1f
    buffer[pos++] = streamContext.pid  & 0xff

    const descLengthPos = pos
    pos += 2

    const codecId = streams[i].codecpar.codecId

    switch (streams[i].codecpar.codecType) {
      case AVMediaType.AVMEDIA_TYPE_AUDIO: {
        if (codecId === AVCodecID.AV_CODEC_ID_AC3) {
          putRegistrationDescriptor(mktag('AC-3'))
        }
        if (codecId === AVCodecID.AV_CODEC_ID_EAC3) {
          putRegistrationDescriptor(mktag('EAC3'))
        }
        if (codecId === AVCodecID.AV_CODEC_ID_S302M) {
          putRegistrationDescriptor(mktag('BSSD'))
        }
        if (codecId === AVCodecID.AV_CODEC_ID_OPUS) {
          putRegistrationDescriptor(mktag('Opus'))
          buffer[pos++] = 0x7f
          buffer[pos++] = 2
          buffer[pos++] = 0x80
          buffer[pos++] = streams[i].codecpar.chLayout.nbChannels
        }
        // language und
        buffer[pos++] = mpegts.ISO_639_LANGUAGE_DESCRIPTOR
        buffer[pos++] = 4
        buffer[pos++] = 117
        buffer[pos++] = 110
        buffer[pos++] = 100
        buffer[pos++] = 0
        break
      }
      case AVMediaType.AVMEDIA_TYPE_VIDEO: {
        if (codecId === AVCodecID.AV_CODEC_ID_AV1) {
          putRegistrationDescriptor(mktag('AV01'))
          if (streams[i].codecpar.extradata) {
            buffer[pos++] = 0x80
            buffer[pos++] = streams[i].codecpar.extradataSize
            for (let j = 0; j < streams[i].codecpar.extradataSize; j++) {
              buffer[pos++] = accessof(reinterpret_cast<pointer<uint8>>(streams[i].codecpar.extradata + j))
            }
          }
        }
      }
    }

    let len = 0xf000 | (pos - descLengthPos - 2)
    buffer[descLengthPos] = len >> 8
    buffer[descLengthPos + 1] = len
  }

  const crcPos = pos
  pos += 4

  for (let i = pos; i < mpegts.TS_PACKET_SIZE - 4; i++) {
    buffer[i] = 0xff
  }

  len = (pos - 1) - 3
  buffer[2] |= ((len >> 8) & 0x0f)
  buffer[3] = len & 0xff

  // CRC32
  const crc32 = calculateCRC32(buffer.subarray(1, crcPos))
  buffer[crcPos] = (crc32 >> 24) & 0xff
  buffer[crcPos + 1] = (crc32 >> 16) & 0xff
  buffer[crcPos + 2] = (crc32 >> 8) & 0xff
  buffer[crcPos + 3] = crc32 & 0xff
  return buffer.slice(0, mpegts.TS_PACKET_SIZE - 4)
}

export function getSDTPayload() {
  const buffer = new Uint8Array(1024)

  buffer[1] = 0x42
  buffer[2] = 0xf0

  // transport_stream_id 1 
  buffer[5] = 1

  // current_next_indicator
  buffer[6] = (3 << 6) | 0x01

  let pos = 9

  // original_network_id
  buffer[pos++] = 0xff
  buffer[pos++] = 1

  buffer[pos++] = 0xff

  /*
   * put service
   * service id
   */
  buffer[pos++] = 0
  buffer[pos++] = 1

  /* currently no EIT info */
  buffer[pos++] =  0xfc | 0x00

  const descListLenPtr = pos
  pos += 2

  // write only one descriptor for the service name and provider */
  buffer[pos++] = 0x48

  const descLenPtr = pos++

  // service_type
  buffer[pos++] = 1

  const providerName = 'format-js'
  const serviceName = 'Service01'

  buffer[pos++] = providerName.length
  for (let i = 0; i < providerName.length; i++) {
    buffer[pos] = providerName.charCodeAt(i)
    pos++
  }

  buffer[pos++] = serviceName.length
  for (let i = 0; i < serviceName.length; i++) {
    buffer[pos] = serviceName.charCodeAt(i)
    pos++
  }

  buffer[descLenPtr] = pos - descLenPtr - 1

  // fill descriptor length 
  let value = (4 << 13) | (0 << 12) | (pos - descListLenPtr - 2)
  buffer[descListLenPtr] = (value >> 8) & 0xff
  buffer[descListLenPtr + 1] = value & 0xff

  const crcPos = pos
  pos += 4

  for (let i = pos; i < mpegts.TS_PACKET_SIZE - 4; i++) {
    buffer[i] = 0xff
  }

  const len = (pos - 1) - 3

  buffer[2] |= ((len >> 8) & 0x0f)
  buffer[3] = len & 0xff

  // CRC32
  const crc32 = calculateCRC32(buffer.subarray(1, crcPos))
  buffer[crcPos] = (crc32 >> 24) & 0xff
  buffer[crcPos + 1] = (crc32 >> 16) & 0xff
  buffer[crcPos + 2] = (crc32 >> 8) & 0xff
  buffer[crcPos + 3] = crc32 & 0xff

  return buffer.slice(0, mpegts.TS_PACKET_SIZE - 4)
}

export function writeTSPacket(ioWriter: IOWriter, tsPacket: TSPacket, mpegtsContext: MpegtsContext) {
  // TODO
  if (mpegtsContext.tsPacketSize === mpegts.TS_DVHS_PACKET_SIZE) {
    // skip ATS field (2-bits copy-control + 30-bits timestamp) for m2ts
    ioWriter.skip(4)
  }

  if (!tsPacket.payload || tsPacket.payload.length === 0) {
    tsPacket.adaptationFieldControl = 0x02
  }

  if (tsPacket.adaptationFieldControl === 0x01
        && (tsPacket.payload.length + 4) < mpegts.TS_PACKET_SIZE
  ) {
    tsPacket.adaptationFieldControl = 0x03
  }

  const pos = ioWriter.getPos()

  ioWriter.writeUint8(0x47)

  let byte = 0

  if (tsPacket.payloadUnitStartIndicator) {
    // Payload unit start indicator
    byte |= (1 << 6)
  }

  byte |= (tsPacket.transportPriority << 5)

  // pid 高 5 位
  byte |= (tsPacket.pid >> 8)

  ioWriter.writeUint8(byte)
  // pid 低 8 位
  ioWriter.writeUint8(tsPacket.pid & 0xff)

  byte = ((tsPacket.transportScramblingControl & 0x03) << 6)
  byte |= ((tsPacket.adaptationFieldControl & 0x03) << 4)
  byte |= (tsPacket.continuityCounter & 0x0f)
  ioWriter.writeUint8(byte)

  let adaptationFieldLength = getAdaptationFieldLength(tsPacket)

  let paddingLen = mpegts.TS_PACKET_SIZE - 4 - adaptationFieldLength
  if (tsPacket.payload?.length) {
    paddingLen -= tsPacket.payload.length
  }

  if (tsPacket.adaptationFieldControl === 0x02 || tsPacket.adaptationFieldControl === 0x03) {
    const now = ioWriter.getPos()

    ioWriter.writeUint8(adaptationFieldLength - 1 + paddingLen)

    byte = ((tsPacket.adaptationFieldInfo.discontinuityIndicator & 0x01) << 7)
    byte |= ((tsPacket.adaptationFieldInfo.randomAccessIndicator & 0x01) << 6)
    byte |= ((tsPacket.adaptationFieldInfo.elementaryStreamPriorityIndicator & 0x01) << 5)
    byte |= ((tsPacket.adaptationFieldInfo.pcrFlag & 0x01) << 4)
    byte |= ((tsPacket.adaptationFieldInfo.opcrFlag & 0x01) << 3)
    byte |= ((tsPacket.adaptationFieldInfo.splicingPointFlag & 0x01) << 2)
    byte |= ((tsPacket.adaptationFieldInfo.transportPrivateDataFlag & 0x01) << 1)
    byte |= (tsPacket.adaptationFieldInfo.adaptationFieldExtensionFlag & 0x01)

    ioWriter.writeUint8(byte)

    if (tsPacket.adaptationFieldInfo.pcrFlag) {
      const pcrLow = Number(tsPacket.adaptationFieldInfo.pcr % 300n)
      const pcrHigh = Number((tsPacket.adaptationFieldInfo.pcr - static_cast<int64>(pcrLow)) / 300n)
      ioWriter.writeUint8((pcrHigh >> 25) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 17) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 9) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 1) & 0xff)
      ioWriter.writeUint8((pcrHigh << 7) | (pcrLow >> 8) | 0x7e)
      ioWriter.writeUint8(pcrLow)
    }
    if (tsPacket.adaptationFieldInfo.opcrFlag) {
      const pcrLow = Number(tsPacket.adaptationFieldInfo.pcr % 300n)
      const pcrHigh = Number((tsPacket.adaptationFieldInfo.pcr - static_cast<int64>(pcrLow)) / 300n)
      ioWriter.writeUint8((pcrHigh >> 25) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 17) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 9) & 0xff)
      ioWriter.writeUint8((pcrHigh >> 1) & 0xff)
      ioWriter.writeUint8((pcrHigh << 7) | (pcrLow >> 8) | 0x7e)
      ioWriter.writeUint8(pcrLow)
    }

    if (tsPacket.adaptationFieldInfo.splicingPointFlag) {
      ioWriter.writeUint8(tsPacket.adaptationFieldInfo.spliceCountDown)
    }

    if (tsPacket.adaptationFieldInfo.transportPrivateDataFlag) {
      if (tsPacket.adaptationFieldInfo.transportPrivateData
        && tsPacket.adaptationFieldInfo.transportPrivateData.length
      ) {
        ioWriter.writeUint8(tsPacket.adaptationFieldInfo.transportPrivateData.length)
        ioWriter.writeBuffer(tsPacket.adaptationFieldInfo.transportPrivateData)
      }
      else {
        ioWriter.writeUint8(0)
      }
    }

    if (tsPacket.adaptationFieldInfo.adaptationFieldExtensionFlag) {
      if (tsPacket.adaptationFieldInfo.extension && tsPacket.adaptationFieldInfo.extension.length) {
        ioWriter.writeUint8(tsPacket.adaptationFieldInfo.extension.length)
        ioWriter.writeBuffer(tsPacket.adaptationFieldInfo.extension)
      }
      else {
        ioWriter.writeUint8(0)
      }
    }

    const wroteAdaptationFieldLength = Number(ioWriter.getPos() - now)

    if (wroteAdaptationFieldLength < adaptationFieldLength) {
      ioWriter.skip(adaptationFieldLength - wroteAdaptationFieldLength)
    }

    while (paddingLen > 0) {
      ioWriter.writeUint8(0xff)
      paddingLen--
    }
  }

  if ((tsPacket.adaptationFieldControl === 0x01 || tsPacket.adaptationFieldControl === 0x03)) {
    if (tsPacket.payload?.length) {
      ioWriter.writeBuffer(tsPacket.payload)
    }
  }

  if (Number(ioWriter.getPos() - pos) !== mpegts.TS_PACKET_SIZE) {
    logger.error(`write error data size to ts packet, need ${mpegts.TS_PACKET_SIZE}, wrote: ${Number(ioWriter.getPos() - pos)}`)
  }

  // TODO
  if (mpegtsContext.tsPacketSize === mpegts.TS_FEC_PACKET_SIZE) {
    // 16 crc
    ioWriter.skip(16)
  }
}

function writePts(buffer: Uint8Array, pos: number, fourBits: number, pts: bigint) {
  let value = fourBits << 4 | ((Number(pts >> 30n) & 0x07) << 1) | 1
  buffer[pos++] = value
  value = ((Number(pts >> 15n) & 0x7fff) << 1) | 1
  buffer[pos++] = (value >> 8) & 0xff
  buffer[pos++] = value & 0xff
  value = (Number(pts & 0x7fffn) << 1) | 1
  buffer[pos++] = (value >> 8) & 0xff
  buffer[pos++] = value & 0xff
}

export function writePES(
  ioWriter: IOWriter,
  pes: PES,
  pesSlices: {
    total: number
    buffers: Uint8Array[]
  },
  stream: Stream,
  mpegtsContext: MpegtsContext
) {
  const streamId = pes.streamId
  const header = new Uint8Array(getPESHeaderLength(pes))

  header[2] = 0x01
  header[3] = streamId

  let len = pesSlices.total

  if (streamId !== mpegts.TSStreamId.PROGRAM_STREAM_MAP
    && streamId !== mpegts.TSStreamId.PADDING_STREAM
    && streamId !== mpegts.TSStreamId.PRIVATE_STREAM_2
    && streamId !== mpegts.TSStreamId.ECM_STREAM
    && streamId !== mpegts.TSStreamId.EMM_STREAM
    && streamId !== mpegts.TSStreamId.PROGRAM_STREAM_DIRECTORY
    && streamId !== mpegts.TSStreamId.DSMCC_STREAM
    && streamId !== mpegts.TSStreamId.TYPE_E_STREAM
  ) {
    let flags = 0
    let headerLen = 0
    if (pes.pts !== NOPTS_VALUE_BIGINT) {
      headerLen += 5
      flags |= 0x80
    }
    if (pes.dts !== NOPTS_VALUE_BIGINT && pes.pts !== NOPTS_VALUE_BIGINT && pes.dts !== pes.pts) {
      headerLen += 5
      flags |= 0x40
    }

    let value  = 0x80
    /* data alignment indicator is required for subtitle and data streams */
    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE
      || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_DATA
    ) {
      value |= 0x04
    }
    header[6] = value
    header[7] = flags
    header[8] = headerLen

    len += (headerLen + 3)

    if (pes.pts !== NOPTS_VALUE_BIGINT) {
      writePts(header, 9, flags >> 6, pes.pts)
    }
    if (pes.dts !== NOPTS_VALUE_BIGINT && pes.pts !== NOPTS_VALUE_BIGINT && pes.dts !== pes.pts) {
      writePts(header, 14, 1, pes.dts)
    }
  }

  if (len <= UINT16_MAX && stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
    header[4] = (len >> 8) & 0xff
    header[5] = len & 0xff
  }

  writePESPayload(ioWriter, pes, concatTypeArray(Uint8Array, [header, ...pesSlices.buffers]), stream, mpegtsContext)
}

export function writeSection(ioWriter: IOWriter, packet: SectionPacket, mpegtsContext: MpegtsContext) {
  const adaptationFieldLength = getAdaptationFieldLength(packet)

  let continuityCounter = packet.continuityCounter

  if (4 + adaptationFieldLength + packet.payload.length <= mpegts.TS_PACKET_SIZE) {
    packet.payloadUnitStartIndicator = 0x01
    packet.continuityCounter = (continuityCounter++) % 16
    writeTSPacket(ioWriter, packet, mpegtsContext)

    packet.continuityCounter = continuityCounter % 16

    return
  }

  const len = mpegts.TS_PACKET_SIZE - (4 + adaptationFieldLength)

  let pos = 0

  const payload = packet.payload
  while (pos < payload.length) {
    let next = Math.min(pos + len, payload.length)
    if (pos === 0) {
      packet.payloadUnitStartIndicator = 0x01
    }
    else {
      packet.payloadUnitStartIndicator = 0x00
    }

    const currentLen = next - pos

    if (currentLen + 4 === mpegts.TS_PACKET_SIZE) {
      packet.adaptationFieldControl = 0x01
    }
    else if (adaptationFieldLength === 0 && currentLen + 4 + 1 === mpegts.TS_PACKET_SIZE) {
      // adaptationFieldLength 需要至少 2 byte
      next--
    }

    packet.payload = payload.subarray(pos, next)
    packet.continuityCounter = (continuityCounter++) % 16

    writeTSPacket(ioWriter, packet, mpegtsContext)
    pos = next
  }

  packet.continuityCounter = continuityCounter % 16
}
