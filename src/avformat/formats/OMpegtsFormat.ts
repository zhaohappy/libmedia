/*
 * libmedia mpegts encoder
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

import { AVOFormatContext } from '../AVFormatContext'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import createMpegtsContext from './mpegts/function/createMpegtsContext'
import { PAT, PES, PMT, SectionPacket, TSPacket } from './mpegts/struct'
import { MpegtsContext, MpegtsStreamContext } from './mpegts/type'
import OFormat from './OFormat'
import * as mpegts from './mpegts/mpegts'
import * as ompegts from './mpegts/ompegts'
import * as array from 'common/util/array'
import * as object from 'common/util/object'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import createMpegtsStreamContext from './mpegts/function/createMpegtsStreamContext'
import AVBSFilter from '../bsf/AVBSFilter'
import AACRaw2ADTSFilter from '../bsf/aac/Raw2ADTSFilter'
import AACRaw2LATMFilter from '../bsf/aac/Raw2LATMFilter'
import OpusRaw2MpegtsFilter from '../bsf/opus/Raw2MpegtsFilter'
import Avcc2AnnexbFilter from '../bsf/h2645/Avcc2AnnexbFilter'
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { AVFormat } from '../avformat'
import { memcpy } from 'cheap/std/memory'
import { avRescaleQ } from 'avutil/util/rational'
import { addAVPacketSideData, getAVPacketData, hasAVPacketSideData } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as logger from 'common/util/logger'

export interface OMpegtsFormatOptions {
  pesMaxSize?: number
  delay?: number
  latm?: boolean
  patPeriod?: number
}

const defaultOMpegtsFormatOptions = {
  pesMaxSize: (16 - 1) * 184 + 170,
  delay: 1.4,
  latm: false,
  patPeriod: 0.1
}

export default class OMpegtsFormat extends OFormat {

  public type: AVFormat = AVFormat.MPEGTS

  private context: MpegtsContext

  private sdtPacket: SectionPacket

  private patPacket: SectionPacket

  private pmtPacket: SectionPacket

  private options: OMpegtsFormatOptions

  private firstDtsCheck: boolean

  private firstVideoCheck: boolean

  private lastPatDst: bigint

  private patPeriod: bigint

  constructor(options: OMpegtsFormatOptions = {}) {
    super()
    this.context = createMpegtsContext()
    this.options = object.extend({}, defaultOMpegtsFormatOptions, options)

    this.options.pesMaxSize = this.options.pesMaxSize ? (this.options.pesMaxSize + 14 + 183) / 184 * 184 - 14 : 0
    this.firstDtsCheck = false
    this.firstVideoCheck = false

    this.patPeriod = static_cast<int64>(this.options.patPeriod * AV_TIME_BASE)
  }

  public init(context: AVOFormatContext): number {
    context.ioWriter.setEndian(true)
    return 0
  }

  public destroy(context: AVOFormatContext): void {
    super.destroy(context)
    array.each(context.streams, (stream) => {
      const streamContext = stream.privData as MpegtsStreamContext
      if (streamContext.filter) {
        streamContext.filter.destroy()
        streamContext.filter = null
      }
    })
  }

  public writeHeader(context: AVOFormatContext): number {

    this.context.pat = new PAT()
    this.context.pat.program2PmtPid.set(1, 4096)

    this.context.pmt = new PMT()
    this.context.pmt.programNumber = 1

    array.each(context.streams, (stream) => {

      stream.timeBase.den = 90000
      stream.timeBase.num = 1

      const pid = this.context.startPid++

      if (this.context.pmt.pcrPid <= 0) {
        this.context.pmt.pcrPid = pid
      }

      let streamType = ompegts.getStreamType(stream)

      const streamContext = createMpegtsStreamContext()

      stream.privData = streamContext

      const tsPacket = new TSPacket()
      tsPacket.pid = pid
      tsPacket.adaptationFieldControl = 0x01

      streamContext.tsPacket = tsPacket
      streamContext.pid = pid

      let filter: AVBSFilter = null

      switch (streamType) {
        case mpegts.TSStreamType.AUDIO_AAC:
          if (this.options.latm) {
            streamContext.latm = true
            streamType = mpegts.TSStreamType.AUDIO_AAC_LATM
            filter = new AACRaw2LATMFilter()
          }
          else {
            filter = new AACRaw2ADTSFilter()
          }

          break
        case mpegts.TSStreamType.VIDEO_H264:
        case mpegts.TSStreamType.VIDEO_HEVC:
          filter = new Avcc2AnnexbFilter()
          break
        case mpegts.TSStreamType.PRIVATE_DATA:
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
            filter = new OpusRaw2MpegtsFilter()
          }
          break
      }

      if (filter) {
        filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
      }

      streamContext.filter = filter
      this.context.pmt.pid2StreamType.set(pid, streamType)

      const pes = new PES()
      pes.pid = pid
      pes.streamType = streamType
      pes.streamId = ompegts.getStreamId(stream)
      streamContext.pes = pes
    })

    this.patPacket = new SectionPacket()
    this.pmtPacket = new SectionPacket()
    this.sdtPacket = new SectionPacket()

    this.sdtPacket.pid = mpegts.TSPid.SDT
    this.sdtPacket.adaptationFieldControl = 0x01
    this.patPacket.pid = mpegts.TSPid.PAT
    this.patPacket.adaptationFieldControl = 0x01
    this.pmtPacket.pid = 4096
    this.pmtPacket.adaptationFieldControl = 0x01

    this.sdtPacket.payload = ompegts.getSDTPayload()
    this.patPacket.payload = ompegts.getPATPayload(this.context.pat)
    this.pmtPacket.payload = ompegts.getPMTPayload(this.context.pmt, context.streams)

    ompegts.writeSection(context.ioWriter, this.sdtPacket, this.context)
    ompegts.writeSection(context.ioWriter, this.patPacket, this.context)
    ompegts.writeSection(context.ioWriter, this.pmtPacket, this.context)

    return 0
  }

  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    if (!avpacket.size) {
      logger.warn(`packet\'s size is 0: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the packet\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    if (!this.firstDtsCheck) {
      if (avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase)
        < static_cast<int64>(this.options.delay * 90000)
      ) {
        this.context.delay = static_cast<int64>(this.options.delay * 90000)
        - avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase)
      }
      this.firstDtsCheck = true
      this.lastPatDst = avRescaleQ(avpacket.dts, avpacket.timeBase, AV_TIME_BASE_Q)
    }

    if (this.patPeriod > 0n
      && avRescaleQ(avpacket.dts, avpacket.timeBase, AV_TIME_BASE_Q) - this.lastPatDst > this.patPeriod
    ) {
      ompegts.writeSection(formatContext.ioWriter, this.sdtPacket, this.context)
      ompegts.writeSection(formatContext.ioWriter, this.patPacket, this.context)
      ompegts.writeSection(formatContext.ioWriter, this.pmtPacket, this.context)
      this.lastPatDst = avRescaleQ(avpacket.dts, avpacket.timeBase, AV_TIME_BASE_Q)
    }

    const streamContext = stream.privData as MpegtsStreamContext

    let buffer = getAVPacketData(avpacket)

    if (streamContext.filter) {
      if (!this.firstVideoCheck
        && !hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        && stream.codecpar.extradata
        && (
          stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        )
      ) {
        this.firstVideoCheck = true
        const extradata = avMalloc(stream.codecpar.extradataSize)
        memcpy(extradata, stream.codecpar.extradata, stream.codecpar.extradataSize)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradata, stream.codecpar.extradataSize)
      }
      streamContext.filter.sendAVPacket(avpacket)
      streamContext.filter.receiveAVPacket(avpacket)
      buffer = getAVPacketData(avpacket)
    }

    if (!buffer.length) {
      return 0
    }

    buffer = buffer.slice()

    let currentWrote = false

    if (streamContext.pesSlices.total + buffer.length > this.options.pesMaxSize
      || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
    ) {
      if (streamContext.pesSlices.total === 0) {
        streamContext.pesSlices.total = buffer.length
        streamContext.pesSlices.buffers.push(buffer)
        if (avpacket.dts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.dts = avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase) + this.context.delay
        }
        if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.pts = avRescaleQ(avpacket.pts, avpacket.timeBase, stream.timeBase) + this.context.delay
        }
        currentWrote = true
      }

      if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
        streamContext.pes.randomAccessIndicator = 1
      }

      ompegts.writePES(formatContext.ioWriter, streamContext.pes, streamContext.pesSlices, stream, this.context)

      streamContext.pesSlices.total = 0
      streamContext.pesSlices.buffers = []
    }

    if (!currentWrote) {
      if (streamContext.pesSlices.total === 0) {
        if (avpacket.dts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.dts = avRescaleQ(avpacket.dts, avpacket.timeBase, stream.timeBase) + this.context.delay
        }
        if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.pts = avRescaleQ(avpacket.pts, avpacket.timeBase, stream.timeBase) + this.context.delay
        }
        if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY) {
          streamContext.pes.randomAccessIndicator = 1
        }
      }
      streamContext.pesSlices.total += buffer.length
      streamContext.pesSlices.buffers.push(buffer)
    }

    return 0
  }

  public writeTrailer(context: AVOFormatContext): number {

    array.each(context.streams, (stream) => {
      const streamContext = stream.privData as MpegtsStreamContext
      if (streamContext.pesSlices.total) {
        ompegts.writePES(context.ioWriter, streamContext.pes, streamContext.pesSlices, stream, this.context)
      }
      streamContext.pesSlices.total = 0
      streamContext.pesSlices.buffers = []
    })

    context.ioWriter.flush()

    return 0
  }

  public flush(context: AVOFormatContext): number {
    context.ioWriter.flush()
    return 0
  }

}
