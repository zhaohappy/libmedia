/*
 * libmedia rtsp decoder
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

import { AVIFormatContext } from '../AVFormatContext'
import AVPacket, { AVPacketFlags, AVProducerReferenceTime } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat } from 'avutil/avformat'
import { memcpyFromUint8Array } from 'cheap/std/memory'
import { avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData, createAVPacket, destroyAVPacket } from 'avutil/util/avpacket'
import AVStream from 'avutil/AVStream'
import RtspSession from 'avprotocol/rtsp/RtspSession'
import * as sdp from 'avprotocol/sdp/sdp'
import * as ntpUtil from 'avutil/util/ntp'
import * as array from 'common/util/array'
import * as mpeg4 from 'avutil/codecs/mpeg4'
import * as mpegvideo from 'avutil/codecs/mpegvideo'

import * as mp3 from 'avutil/codecs/mp3'
import { RtspStreamingMode } from 'avprotocol/rtsp/rtsp'
import { HEVCPayloadContext, Mpeg4PayloadContext, RTPCodecName2AVCodeId, StaticRTPPayloadCodec } from 'avprotocol/rtp/rtp'
import { Data } from 'common/types/type'
import RTPFrameQueue from 'avprotocol/rtp/RTPFrameQueue'
import * as depacketizer from 'avprotocol/rtp/depacketizer'
import * as naluUtil from 'avutil/util/nalu'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT, NTP_OFFSET_US } from 'avutil/constant'
import isRtcp from 'avprotocol/rtcp/isRtcp'
import isRtp from 'avprotocol/rtp/isRtp'
import { parseRTPPacket } from 'avprotocol/rtp/parser'
import { RTCPPayloadType } from 'avprotocol/rtcp/rtcp'
import { parseRTCPSendReport } from 'avprotocol/rtcp/parser'
import AVBSFilter from '../bsf/AVBSFilter'
import Mp32RawFilter from '../bsf/mp3/Mp32RawFilter'
import { CodecIdFmtpHandler } from 'avprotocol/rtp/fmtp'
import Ac32RawFilter from '../bsf/ac3/Ac32RawFilter'

export interface IRtspFormatOptions {
  uri: string
}

interface RtspFormatContext {
  sessionId: string
  canOutputPacket: boolean
}

interface RtspStreamContext {
  ssrc: uint32
  trackId: uint32
  interleaved: uint32
  payloadType: uint8
  payloadContext: Data
  queue: RTPFrameQueue

  rangeStartOffset: int64
  lastRtcpNtpTime: int64
  firstRtcpNtpTime: int64
  lastRtcpTimestamp: uint32
  rtcpTsOffset: int64
  baseTimestamp: uint32
  timestamp: uint32
  unwrappedTimestamp: int64

  filter: AVBSFilter
}

export default class IRtspFormat extends IFormat {

  public type: AVFormat = AVFormat.RTSP

  private rtspSession: RtspSession

  private options: IRtspFormatOptions

  private context: RtspFormatContext

  private cacheAVPacket: pointer<AVPacket>

  constructor(options: IRtspFormatOptions) {
    super()
    this.options = options
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
    this.rtspSession = new RtspSession(this.options.uri, formatContext.ioReader, formatContext.ioWriter)
    this.context = {
      sessionId: '',
      canOutputPacket: true
    }
    this.cacheAVPacket = nullptr
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    try {

      let response = await this.rtspSession.options()

      if (response.statusCode !== 200) {
        return errorType.DATA_INVALID
      }

      response = await this.rtspSession.describe()

      if (response.statusCode !== 200) {
        logger.error(`describe failed, ${JSON.stringify(response)}`)
        return errorType.DATA_INVALID
      }

      const sdpDes = sdp.parse(response.content)

      let trackId = 1
      let interleaved = 0

      for (let i = 0; i < sdpDes.media.length; i++) {

        if (!sdpDes.media[i].rtp.length) {
          continue
        }

        const stream = formatContext.createStream()

        const staticPayloadCodec = StaticRTPPayloadCodec.find((codec) => {
          return codec.payload === sdpDes.media[i].rtp[0].payload
        })

        if (staticPayloadCodec) {
          stream.codecpar.codecType = staticPayloadCodec.codecType
          stream.codecpar.codecId = staticPayloadCodec.codecId
          if (staticPayloadCodec.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
            stream.codecpar.sampleRate = sdpDes.media[i].rtp[0].rate || staticPayloadCodec.rate
            stream.codecpar.chLayout.nbChannels = sdpDes.media[i].rtp[0].encoding || staticPayloadCodec.encoding
            stream.timeBase.num = 1
            stream.timeBase.den = stream.codecpar.sampleRate
          }
          else {
            stream.timeBase.num = 1
            stream.timeBase.den = sdpDes.media[i].rtp[0].rate || staticPayloadCodec.rate
          }
        }
        else {
          if (sdpDes.media[i].type === 'audio') {
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
          }
          else if (sdpDes.media[i].type === 'video') {
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
          }

          const codecName = sdpDes.media[i].rtp[0].codec

          let codecId = RTPCodecName2AVCodeId[codecName] || AVCodecID.AV_CODEC_ID_NONE

          stream.codecpar.codecId = codecId

          if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
            stream.codecpar.sampleRate = sdpDes.media[i].rtp[0].rate
            stream.codecpar.chLayout.nbChannels = sdpDes.media[i].rtp[0].encoding
            stream.timeBase.num = 1
            stream.timeBase.den = stream.codecpar.sampleRate
          }
          else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            stream.timeBase.num = 1
            stream.timeBase.den = sdpDes.media[i].rtp[0].rate
          }
        }

        const context: RtspStreamContext = {
          ssrc: 0,
          trackId: trackId++,
          interleaved: interleaved,
          payloadContext: null,
          queue: null,
          payloadType: sdpDes.media[i].rtp[0].payload,

          rangeStartOffset: 0n,
          lastRtcpNtpTime: NOPTS_VALUE_BIGINT,
          firstRtcpNtpTime: NOPTS_VALUE_BIGINT,
          lastRtcpTimestamp: 0,
          rtcpTsOffset: 0n,
          baseTimestamp: 0,
          timestamp: 0,
          unwrappedTimestamp: 0n,

          filter: null
        }
        if (sdpDes.media[i].control) {
          let l1 = sdpDes.media[i].control.split(';')
          let trackID = l1.find((l) => l.indexOf('trackID') > -1)
          if (trackID) {
            let l2 = trackID.split('=')
            context.trackId = +l2[1].trim()
          }
        }

        if (sdpDes.media[i].fmtp.length && CodecIdFmtpHandler[stream.codecpar.codecId]) {
          context.payloadContext = CodecIdFmtpHandler[stream.codecpar.codecId](stream, sdpDes.media[i].fmtp[0].config)
        }

        context.queue = new RTPFrameQueue(addressof(stream.codecpar), context.payloadContext)

        interleaved += 2
        stream.privData = context

        response = await this.rtspSession.setup({
          trackId: context.trackId,
          streamMode: RtspStreamingMode.TRANSPORT_TCP,
          interleaved: context.interleaved,
          multcast: false
        }, this.context.sessionId)

        if (response.statusCode !== 200) {
          logger.error(`setup track ${context.trackId} failed, ${JSON.stringify(response)}`)
          return errorType.DATA_INVALID
        }

        const ssrc = response.headers['Transport'].split(';').find((t) => t.indexOf('ssrc') > -1)
        if (ssrc) {
          context.ssrc = +('0x' + ssrc.split('=')[1].trim())
        }
        this.context.sessionId = response.headers['Session']
        if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          this.context.canOutputPacket = false
        }

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
          context.filter = new Mp32RawFilter()
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3) {
          context.filter = new Ac32RawFilter()
        }

        if (context.filter) {
          context.filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
        }
      }

      if (!formatContext.streams.length) {
        logger.error('not found stream')
        return errorType.DATA_INVALID
      }

      response = await this.rtspSession.play(this.context.sessionId)

      if (response.statusCode !== 200) {
        logger.error(`play failed, ${JSON.stringify(response)}`)
        return errorType.DATA_INVALID
      }

      return 0
    }
    catch (error) {
      logger.error(error.message)
      return formatContext.ioReader.error
    }
  }

  private addPrft(stream: AVStream, avpacket: pointer<AVPacket>, timestamp: uint32) {
    const context = stream.privData as RtspStreamContext
    if (context.lastRtcpNtpTime !== NOPTS_VALUE_BIGINT) {
      const prft = reinterpret_cast<pointer<AVProducerReferenceTime>>(avMalloc(sizeof(AVProducerReferenceTime)))
      const rtcpTime = ntpUtil.parse(reinterpret_cast<uint64>(context.lastRtcpNtpTime)) - NTP_OFFSET_US
      const deltaTimestamp = static_cast<uint64>(timestamp) - context.lastRtcpNtpTime
      const deltaTime = avRescaleQ(deltaTimestamp, stream.timeBase, AV_TIME_BASE_Q)

      prft.wallclock = rtcpTime + deltaTime
      prft.flags = 24
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_PRFT, prft, sizeof(AVProducerReferenceTime))
    }
  }

  private getPacketPts(formatContext: AVIFormatContext, stream: AVStream, timestamp: uint32) {
    if (timestamp === -1) {
      return -1n
    }

    const context = stream.privData as RtspStreamContext

    if (context.lastRtcpNtpTime !== NOPTS_VALUE_BIGINT && formatContext.streams.length > 1) {
      const deltaTimestamp = static_cast<int64>((timestamp - context.lastRtcpTimestamp) as int32)
      const addend = (context.lastRtcpNtpTime - context.firstRtcpNtpTime) * static_cast<int64>(stream.timeBase.den)
        / (static_cast<int64>(stream.timeBase.num) << 32n)

      return context.rangeStartOffset + context.rtcpTsOffset + addend + deltaTimestamp
    }

    if (!context.baseTimestamp) {
      context.baseTimestamp = timestamp
    }
    if (!context.timestamp) {
      context.unwrappedTimestamp += static_cast<int64>(timestamp)
    }
    else {
      context.unwrappedTimestamp += static_cast<int64>(timestamp - context.timestamp)
    }

    context.timestamp = timestamp

    return context.unwrappedTimestamp + context.rangeStartOffset - static_cast<int64>(context.baseTimestamp)
  }

  private handleRtcpPacket(formatContext: AVIFormatContext, data: Uint8Array, interleaved: number = -1) {
    const payloadType = data[1]
    switch (payloadType) {
      case RTCPPayloadType.SR:
        const sr = parseRTCPSendReport(data)

        let stream = formatContext.streams.find((stream) => {
          const context = stream.privData as RtspStreamContext
          return context.ssrc === sr.ssrc
            || context.interleaved === interleaved
        })

        if (stream) {
          const context = stream.privData as RtspStreamContext
          context.lastRtcpNtpTime = reinterpret_cast<int64>(sr.ntp)
          context.lastRtcpTimestamp = sr.timestamp
          if (context.firstRtcpNtpTime === NOPTS_VALUE_BIGINT) {
            context.firstRtcpNtpTime = reinterpret_cast<int64>(sr.ntp)
            if (!context.baseTimestamp) {
              context.baseTimestamp = sr.timestamp
            }
            context.rtcpTsOffset = static_cast<int64>(context.lastRtcpTimestamp - context.baseTimestamp)
          }
        }
        break
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      while (true) {
        const { data, interleaved } = await this.rtspSession.readPacket()
        // rtcp
        if (isRtcp(data)) {
          this.handleRtcpPacket(formatContext, data, interleaved)
        }
        // rtp
        else if (isRtp(data)) {

          const packet = parseRTPPacket(data)

          const stream = formatContext.streams.find((stream) => {
            const context = stream.privData as RtspStreamContext
            return context.ssrc === packet.header.ssrc
              || context.interleaved === interleaved
              || context.payloadType === packet.header.payloadType
          })
          if (stream) {
            const context = stream.privData as RtspStreamContext
            context.queue.push(packet)
            if (!context.ssrc) {
              context.ssrc = packet.header.ssrc
            }
            let firstGot = false

            const handleVideoFrame = (frame: Uint8Array, isKey: boolean, pts: int64) => {
              let p = !firstGot ? avpacket : createAVPacket()

              p.streamIndex = stream.index
              p.timeBase = stream.timeBase

              const data: pointer<uint8> = avMalloc(frame.length)
              memcpyFromUint8Array(data, frame.length, frame)
              addAVPacketData(p, data, frame.length)
              p.dts = p.pts = pts

              if (isKey) {
                p.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
                this.context.canOutputPacket = true
              }

              if (firstGot) {
                formatContext.interval.packetBuffer.push(p)
                p = nullptr
              }
              else {
                firstGot = true
              }

              return p
            }

            const handleMultiAudioFrames = (frames: Uint8Array[], pts: int64, delta: int64 = 0n) => {
              if (!frames.length) {
                return
              }

              let p = !firstGot ? avpacket : createAVPacket()
              p.streamIndex = stream.index
              p.timeBase = stream.timeBase

              const data: pointer<uint8> = avMalloc(frames[0].length)
              memcpyFromUint8Array(data, frames[0].length, frames[0])
              addAVPacketData(p, data, frames[0].length)
              p.dts = p.pts = pts
              p.flags |= AVPacketFlags.AV_PKT_FLAG_KEY

              if (firstGot) {
                formatContext.interval.packetBuffer.push(p)
                p = nullptr
              }
              else {
                firstGot = true
              }
              for (let i = 1; i < frames.length; i++) {
                const p = createAVPacket()
                p.streamIndex = stream.index
                p.timeBase = stream.timeBase
                p.dts = p.pts = pts + BigInt(i) * delta
                p.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
                const data: pointer<uint8> = avMalloc(frames[i].length)
                memcpyFromUint8Array(data, frames[i].length, frames[i])
                addAVPacketData(p, data, frames[i].length)
                formatContext.interval.packetBuffer.push(p)
              }
            }

            const handleSingleAudioFrameWithFilter = (frame: Uint8Array, pts: int64) => {
              let p = !firstGot ? avpacket : createAVPacket()
              p.streamIndex = stream.index
              p.timeBase = stream.timeBase

              const data: pointer<uint8> = avMalloc(frame.length)
              memcpyFromUint8Array(data, frame.length, frame)
              addAVPacketData(p, data, frame.length)
              p.dts = p.pts = pts

              let ret = context.filter.sendAVPacket(p)

              if (ret < 0) {
                logger.fatal('send avpacket to bsf failed')
                return errorType.DATA_INVALID
              }

              ret = context.filter.receiveAVPacket(p)
              if (ret === errorType.EOF) {
                return
              }

              p.timeBase = stream.timeBase
              p.streamIndex = stream.index
              p.flags |= AVPacketFlags.AV_PKT_FLAG_KEY

              if (firstGot) {
                formatContext.interval.packetBuffer.push(p)
                p = nullptr
              }
              else {
                firstGot = true
              }
              while (true) {
                const p = this.cacheAVPacket || createAVPacket()
                ret = context.filter.receiveAVPacket(p)
                if (ret === 0) {
                  p.timeBase = stream.timeBase
                  p.streamIndex = stream.index
                  formatContext.interval.packetBuffer.push(p)
                  this.cacheAVPacket = nullptr
                }
                else {
                  this.cacheAVPacket = p
                  break
                }
              }
            }

            while (context.queue.hasFrame()) {
              const packets = context.queue.getFrame()

              if (!packets.length) {
                continue
              }

              const pts = this.getPacketPts(formatContext, stream, packets[0].header.timestamp)

              if (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO
                && !this.context.canOutputPacket
              ) {
                continue
              }

              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              ) {
                const { nalus, isKey } = stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
                  ? depacketizer.h264(packets)
                  : depacketizer.hevc(packets, context.payloadContext as HEVCPayloadContext)

                if (!nalus.length) {
                  continue
                }

                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }

                const frame = naluUtil.joinNaluByStartCode(nalus, 2)

                const p = handleVideoFrame(frame, isKey, pts)
                p.bitFormat = stream.codecpar.bitFormat
                // 让 demuxer 去生成 dts
                p.dts = NOPTS_VALUE_BIGINT
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
                const frames = depacketizer.mpeg4(packets, (stream.privData as RtspStreamContext).payloadContext as Mpeg4PayloadContext)
                handleMultiAudioFrames(frames, pts, 1024n)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4) {
                const frame = depacketizer.concat(packets)
                const byte = frame[4]
                const isKey = (byte >>> 6) === mpeg4.Mpeg4PictureType.I
                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }
                handleVideoFrame(frame, isKey, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_ALAW
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_MULAW
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_G722
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16BE
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS
                || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SPEEX
              ) {
                const frame = depacketizer.concat(packets)
                handleMultiAudioFrames([frame], pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
                const frame = depacketizer.mpeg12(packets, stream.codecpar.codecType)
                if (stream.codecpar.profile === NOPTS_VALUE) {
                  const layer = (frame[1] & 0x06) >> 1
                  stream.codecpar.profile = mp3.getProfileByLayer(layer)
                }
                handleSingleAudioFrameWithFilter(frame, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3) {
                const frame = depacketizer.ac3(packets)
                handleSingleAudioFrameWithFilter(frame, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG2VIDEO) {
                const frame = depacketizer.mpeg12(packets, stream.codecpar.codecType)
                const isKey = ((frame[5] >> 3) & 7) === mpegvideo.MpegVideoPictureType.I
                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }
                handleVideoFrame(frame, isKey, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP8) {
                const { payload, isKey } = depacketizer.vp8(packets)
                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }
                handleVideoFrame(payload, isKey, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
                const { payload, isKey } = depacketizer.vp9(packets)
                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }
                handleVideoFrame(payload, isKey, pts)
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
                const { payload, isKey } = depacketizer.av1(packets)
                if (!isKey && !this.context.canOutputPacket) {
                  continue
                }
                handleVideoFrame(payload, isKey, pts)
              }
            }
            if (firstGot) {
              return 0
            }
          }
        }
        else {
          logger.warn('received invalid data')
        }
      }
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return 0
  }

  public async destroy(formatContext: AVIFormatContext) {
    await this.rtspSession.teardown(this.context.sessionId)

    if (this.cacheAVPacket) {
      destroyAVPacket(this.cacheAVPacket)
      this.cacheAVPacket = nullptr
    }

    array.each(formatContext.streams, (stream) => {
      const streamContext = stream.privData as RtspStreamContext
      if (streamContext.filter) {
        streamContext.filter.destroy()
        streamContext.filter = null
      }
    })
  }
}
