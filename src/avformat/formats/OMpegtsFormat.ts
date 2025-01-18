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
import { AVFormat } from 'avutil/avformat'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { avRescaleQ2 } from 'avutil/util/rational'
import { addAVPacketData, addAVPacketSideData, createAVPacket, destroyAVPacket, getAVPacketData, hasAVPacketSideData } from 'avutil/util/avpacket'
import { avMalloc } from 'avutil/util/mem'
import * as logger from 'common/util/logger'
import * as naluUtil from 'avutil/util/nalu'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import { Uint8ArrayInterface } from 'common/io/interface'

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

  private avpacket: pointer<AVPacket>

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
    this.avpacket = createAVPacket()
    return 0
  }

  public async destroy(context: AVOFormatContext) {
    super.destroy(context)
    array.each(context.streams, (stream) => {
      const streamContext = stream.privData as MpegtsStreamContext
      if (streamContext.filter) {
        streamContext.filter.destroy()
        streamContext.filter = null
      }
    })
    if (this.avpacket) {
      destroyAVPacket(this.avpacket)
      this.avpacket = nullptr
    }
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
        case mpegts.TSStreamType.VIDEO_VVC:
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
      if (avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), stream.timeBase)
        < static_cast<int64>(this.options.delay * 90000)
      ) {
        this.context.delay = static_cast<int64>(this.options.delay * 90000)
        - avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), stream.timeBase)
      }
      this.firstDtsCheck = true
      this.lastPatDst = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_TIME_BASE_Q)
    }

    if (this.patPeriod > 0n
      && avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_TIME_BASE_Q) - this.lastPatDst > this.patPeriod
    ) {
      ompegts.writeSection(formatContext.ioWriter, this.sdtPacket, this.context)
      ompegts.writeSection(formatContext.ioWriter, this.patPacket, this.context)
      ompegts.writeSection(formatContext.ioWriter, this.pmtPacket, this.context)
      this.lastPatDst = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), AV_TIME_BASE_Q)
    }

    const streamContext = stream.privData as MpegtsStreamContext

    let buffer = getAVPacketData(avpacket)

    if (streamContext.filter) {
      if (!this.firstVideoCheck
        && (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
        )
        && avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY
      ) {
        let hasNewSps = hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
        if (!hasNewSps && avpacket.bitFormat === h264.BitFormat.ANNEXB) {
          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
            hasNewSps = !!h264.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
            hasNewSps = !!hevc.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
            hasNewSps = !!vvc.generateAnnexbExtradata(getAVPacketData(avpacket))
          }
        }
        this.firstVideoCheck = true
        if (!hasNewSps && stream.codecpar.extradata) {
          if (avpacket.bitFormat === h264.BitFormat.ANNEXB) {
            let extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)).slice()

            if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
              && !h264.generateAnnexbExtradata(getAVPacketData(avpacket))
            ) {
              let spss: Uint8ArrayInterface[] = []
              let ppss: Uint8ArrayInterface[] = []
              let spsExts: Uint8ArrayInterface[] = []
              const seis: Uint8ArrayInterface[] = []
              const others: Uint8ArrayInterface[] = []
              if (naluUtil.isAnnexb(extradata)) {
                naluUtil.splitNaluByStartCode(extradata).forEach((nalu) => {
                  const naluType = nalu[0] & 0x1f
                  if (naluType === h264.H264NaluType.kSliceSPS) {
                    spss.push(nalu)
                  }
                  else if (naluType === h264.H264NaluType.kSlicePPS) {
                    ppss.push(nalu)
                  }
                  else if (naluType === h264.H264NaluType.kSPSExt) {
                    spsExts.push(nalu)
                  }
                })
              }
              else {
                const result = h264.extradata2SpsPps(extradata)
                spss = result.spss
                ppss = result.ppss
                spsExts = result.spsExts
              }
              naluUtil.splitNaluByStartCode(getAVPacketData(avpacket, true)).forEach((nalu) => {
                const naluType = nalu[0] & 0x1f
                if (naluType === h264.H264NaluType.kSliceSEI) {
                  seis.push(nalu)
                }
                else if (naluType !== h264.H264NaluType.kSliceAUD) {
                  others.push(nalu)
                }
              })
              const result = h264.nalus2Annexb(spss, ppss, spsExts, seis, others)
              addAVPacketData(avpacket, result.bufferPointer, result.length)
            }
            else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              && !hevc.generateAnnexbExtradata(getAVPacketData(avpacket))
            ) {
              let spss: Uint8ArrayInterface[] = []
              let ppss: Uint8ArrayInterface[] = []
              let vpss: Uint8ArrayInterface[] = []
              const nalus: Uint8ArrayInterface[] = []
              if (naluUtil.isAnnexb(extradata)) {
                naluUtil.splitNaluByStartCode(extradata).forEach((nalu) => {
                  const type = (nalu[0] >>> 1) & 0x3f
                  if (type === hevc.HEVCNaluType.kSliceVPS) {
                    vpss.push(nalu)
                  }
                  else if (type === hevc.HEVCNaluType.kSliceSPS) {
                    spss.push(nalu)
                  }
                  else if (type === hevc.HEVCNaluType.kSlicePPS) {
                    ppss.push(nalu)
                  }
                })
              }
              else {
                const result = hevc.extradata2VpsSpsPps(extradata)
                spss = result.spss
                ppss = result.ppss
                vpss = result.vpss
              }
              naluUtil.splitNaluByStartCode(getAVPacketData(avpacket, true)).forEach((nalu) => {
                const type = (nalu[0] >>> 1) & 0x3f
                if (type !== hevc.HEVCNaluType.kSliceAUD) {
                  nalus.push(nalu)
                }
              })
              const result = hevc.nalus2Annexb(vpss, spss, ppss, nalus)
              addAVPacketData(avpacket, result.bufferPointer, result.length)
            }
            else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
              && !vvc.generateAnnexbExtradata(getAVPacketData(avpacket))
            ) {
              let spss: Uint8ArrayInterface[] = []
              let ppss: Uint8ArrayInterface[] = []
              let vpss: Uint8ArrayInterface[] = []
              const nalus: Uint8ArrayInterface[] = []
              if (naluUtil.isAnnexb(extradata)) {
                naluUtil.splitNaluByStartCode(extradata).forEach((nalu) => {
                  const type = (nalu[1] >>> 3) & 0x1f
                  if (type === vvc.VVCNaluType.kVPS_NUT) {
                    vpss.push(nalu)
                  }
                  else if (type === vvc.VVCNaluType.kSPS_NUT) {
                    spss.push(nalu)
                  }
                  else if (type === vvc.VVCNaluType.kPPS_NUT) {
                    ppss.push(nalu)
                  }
                })
              }
              else {
                const result = vvc.extradata2VpsSpsPps(extradata)
                spss = result.spss
                ppss = result.ppss
                vpss = result.vpss
              }
              naluUtil.splitNaluByStartCode(getAVPacketData(avpacket, true)).forEach((nalu) => {
                const type = (nalu[1] >>> 3) & 0x1f
                if (type !== vvc.VVCNaluType.kAUD_NUT) {
                  nalus.push(nalu)
                }
              })
              const result = vvc.nalus2Annexb(vpss, spss, ppss, nalus, !!(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY))
              addAVPacketData(avpacket, result.bufferPointer, result.length)
            }
          }
          else {
            let extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)).slice()
            if (naluUtil.isAnnexb(extradata)) {
              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
                extradata = h264.annexbExtradata2AvccExtradata(extradata)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
                extradata = hevc.annexbExtradata2AvccExtradata(extradata)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
                extradata = vvc.annexbExtradata2AvccExtradata(extradata)
              }
            }
            const extradataPointer = avMalloc(extradata.length)
            memcpyFromUint8Array(extradataPointer, extradata.length, extradata)
            addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA, extradataPointer, extradata.length)
          }
        }
      }
      streamContext.filter.sendAVPacket(avpacket)
      streamContext.filter.receiveAVPacket(this.avpacket)
      buffer = getAVPacketData(this.avpacket)
      avpacket = this.avpacket
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
          streamContext.pes.dts = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), stream.timeBase) + this.context.delay
        }
        if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.pts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), stream.timeBase) + this.context.delay
        }
        if (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO
          || avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY
        ) {
          streamContext.pes.randomAccessIndicator = 1
        }
        else {
          streamContext.pes.randomAccessIndicator = 0
        }
        currentWrote = true
      }

      ompegts.writePES(formatContext.ioWriter, streamContext.pes, streamContext.pesSlices, stream, this.context)

      streamContext.pesSlices.total = 0
      streamContext.pesSlices.buffers = []
    }

    if (!currentWrote) {
      if (streamContext.pesSlices.total === 0) {
        if (avpacket.dts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.dts = avRescaleQ2(avpacket.dts, addressof(avpacket.timeBase), stream.timeBase) + this.context.delay
        }
        if (avpacket.pts !== NOPTS_VALUE_BIGINT) {
          streamContext.pes.pts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), stream.timeBase) + this.context.delay
        }
        if (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO
          || avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY
        ) {
          streamContext.pes.randomAccessIndicator = 1
        }
        else {
          streamContext.pes.randomAccessIndicator = 0
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
