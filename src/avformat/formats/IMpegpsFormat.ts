/*
 * libmedia mpegps decoder
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

import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVIFormatContext } from '../AVFormatContext'
import * as logger from 'common/util/logger'

import { IOError } from 'common/io/error'
import { MpegpsContext, MpegpsSlice, MpegpsStreamContext } from './mpegts/type'
import * as mpegts from './mpegts/mpegts'
import * as errorType from 'avutil/error'
import parsePES from './mpegts/function/parsePES'
import { PES } from './mpegts/struct'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags } from '../avformat'
import { addAVPacketData, createAVPacket, deleteAVPacketSideData,
  destroyAVPacket, getAVPacketData, getAVPacketSideData
} from 'avutil/util/avpacket'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import AVStream from '../AVStream'
import seekInBytes from '../function/seekInBytes'
import { avRescaleQ } from 'avutil/util/rational'
import * as array from 'common/util/array'
import * as mp3 from '../codecs/mp3'
import * as h264 from '../codecs/h264'
import * as hevc from '../codecs/hevc'
import * as vvc from '../codecs/vvc'
import * as aac from '../codecs/aac'
import * as opus from '../codecs/opus'
import * as mpegvideo from '../codecs/mpegvideo'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import { avMalloc } from 'avutil/util/mem'
import { memcpy, mapSafeUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import * as mpegps from './mpegts/mpegps'
import { AV_CH_LAYOUT, AVChannelOrder } from 'avutil/audiosamplefmt'
import concatTypeArray from 'common/function/concatTypeArray'
import * as nalu from 'avutil/util/nalu'
import Mp32RawFilter from '../bsf/mp3/Mp32RawFilter'
import { FrameHeader } from './mp3/frameHeader'
import * as mp3FrameHeader from '../formats/mp3/frameHeader'
import { IOFlags } from 'common/io/flags'
import * as ac3 from '../codecs/ac3'
import * as dts from '../codecs/dts'
import * as is from 'common/util/is'
import Ac32RawFilter from '../bsf/ac3/Ac32RawFilter'
import Dts2RawFilter from '../bsf/dts/Dts2RawFilter'

export default class IMpegpsFormat extends IFormat {

  public type: AVFormat = AVFormat.MPEGPS

  private context: MpegpsContext

  private cacheAVPacket: pointer<AVPacket>

  constructor() {
    super()
    this.context = {
      headerState: 0xff,
      psmType: new Map(),
      pes: new PES(),
      slices: new Map(),
      lastPtsMap: new Map(),
      imkhCctv: false,
      sofdec: false,
      ioEnded: false
    }
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
    this.cacheAVPacket = nullptr
  }

  public destroy(formatContext: AVIFormatContext): void {
    super.destroy(formatContext)
    if (this.cacheAVPacket) {
      destroyAVPacket(this.cacheAVPacket)
      this.cacheAVPacket = nullptr
    }
    array.each(formatContext.streams, (stream) => {
      const streamContext = stream.privData as MpegpsStreamContext
      if (streamContext.filter) {
        streamContext.filter.destroy()
        streamContext.filter = null
      }
    })
  }

  @deasync
  private async findNextStartCode(formatContext: AVIFormatContext) {
    let code = 0xff
    let n = 0
    while (n < mpegps.MAX_SYNC_SIZE) {
      const v = await formatContext.ioReader.readUint8()
      if (code === 0x000001) {
        code = ((code << 8) | v) & 0xffffff
        break
      }
      code = ((code << 8) | v) & 0xffffff
      n++
    }
    if (n === mpegps.MAX_SYNC_SIZE) {
      code = -1
    }
    this.context.headerState = code
    return code
  }

  @deasync
  private async parsePSM(formatContext: AVIFormatContext) {
    const psmLength = await formatContext.ioReader.readUint16()
    await formatContext.ioReader.skip(2)
    const psInfoLength = await formatContext.ioReader.readUint16()
    await formatContext.ioReader.skip(psInfoLength)
    // es_map_length
    await formatContext.ioReader.readUint16()
    let esMapLength = psmLength - psInfoLength - 10
    while (esMapLength >= 4) {
      const type = await formatContext.ioReader.readUint8()
      const id = await formatContext.ioReader.readUint8()
      const length = await formatContext.ioReader.readUint16()
      this.context.psmType.set(id, type)
      await formatContext.ioReader.skip(length)
      esMapLength -= (length + 4)
    }
    // crc32
    await formatContext.ioReader.readUint32()
  }

  @deasync
  private async readPES(formatContext: AVIFormatContext) {
    while (true) {
      const startCode = await this.findNextStartCode(formatContext)
      if (startCode < 0) {
        return errorType.DATA_INVALID
      }
      if (startCode === mpegps.MpegpsStartCode.PACK_START
        || startCode === mpegps.MpegpsStartCode.SYSTEM_HEADER_START
      ) {
        continue
      }
      if (startCode === mpegps.MpegpsStartCode.PADDING_STREAM
        || startCode === mpegps.MpegpsStartCode.PRIVATE_STREAM_2
      ) {
        const len = await formatContext.ioReader.readUint16()
        await formatContext.ioReader.skip(len)
        continue
      }
      if (startCode === mpegps.MpegpsStartCode.PROGRAM_STREAM_MAP) {
        await this.parsePSM(formatContext)
        continue
      }
      if (!((startCode >= 0x1c0 && startCode <= 0x1df)
        || (startCode >= 0x1e0 && startCode <= 0x1ef)
        || (startCode == 0x1bd)
        || (startCode == mpegps.MpegpsStartCode.PRIVATE_STREAM_2)
        || (startCode == 0x1fd))
      ) {
        continue
      }

      const len = await formatContext.ioReader.readUint16() 
      
      this.context.pes.pos = formatContext.ioReader.getPos() - 6n
      this.context.pes.streamId = startCode & 0xff
      this.context.pes.streamType = this.context.psmType[this.context.pes.streamId]

      const data = new Uint8Array(len + 6)

      data[0] = 0
      data[1] = 0
      data[2] = 1
      data[3] = this.context.pes.streamId
      data[4] = len >> 8
      data[5] = len & 0xff
      await formatContext.ioReader.readBuffer(len, data.subarray(6))

      this.context.pes.data = data

      return startCode
    }
  }

  private createStream(formatContext: AVIFormatContext, streamType: int32, streamId: int32, startCode: int32) {

    let codecId: AVCodecID = AVCodecID.AV_CODEC_ID_NONE
    let type: AVMediaType = AVMediaType.AVMEDIA_TYPE_UNKNOWN

    switch (streamId) {
      case mpegps.MpegpsStreamId.H264_ID:
        type = AVMediaType.AVMEDIA_TYPE_VIDEO
        codecId = AVCodecID.AV_CODEC_ID_H264
        break
      case mpegps.MpegpsStreamId.AC3_ID:
        type = AVMediaType.AVMEDIA_TYPE_AUDIO
        codecId = AVCodecID.AV_CODEC_ID_AC3
        break
      case mpegps.MpegpsStreamId.DTS_ID:
        type = AVMediaType.AVMEDIA_TYPE_AUDIO
        codecId = AVCodecID.AV_CODEC_ID_DTS
        break
      case mpegps.MpegpsStreamId.LPCM_ID:
        type = AVMediaType.AVMEDIA_TYPE_AUDIO
        codecId = AVCodecID.AV_CODEC_ID_PCM_S16BE
        break
      case mpegps.MpegpsStreamId.SUB_ID:
        type = AVMediaType.AVMEDIA_TYPE_SUBTITLE
        codecId = AVCodecID.AV_CODEC_ID_DVD_SUBTITLE
        break
      default: {
        switch (streamType) {
          case mpegts.TSStreamType.VIDEO_MPEG1:
          case mpegts.TSStreamType.VIDEO_MPEG2:
            type = AVMediaType.AVMEDIA_TYPE_VIDEO
            codecId = AVCodecID.AV_CODEC_ID_MPEG2VIDEO
            break
          case mpegts.TSStreamType.AUDIO_MPEG1:
          case mpegts.TSStreamType.AUDIO_MPEG2:
            type = AVMediaType.AVMEDIA_TYPE_AUDIO
            codecId = AVCodecID.AV_CODEC_ID_MP3
            break
          case mpegts.TSStreamType.AUDIO_AAC:
            type = AVMediaType.AVMEDIA_TYPE_AUDIO
            codecId = AVCodecID.AV_CODEC_ID_AAC
            break
          case mpegts.TSStreamType.VIDEO_MPEG4:
            type = AVMediaType.AVMEDIA_TYPE_VIDEO
            codecId = AVCodecID.AV_CODEC_ID_MPEG4
            break
          case mpegts.TSStreamType.VIDEO_H264:
            type = AVMediaType.AVMEDIA_TYPE_VIDEO
            codecId = AVCodecID.AV_CODEC_ID_H264
            break
          case mpegts.TSStreamType.VIDEO_HEVC:
            type = AVMediaType.AVMEDIA_TYPE_VIDEO
            codecId = AVCodecID.AV_CODEC_ID_HEVC
            break
          case mpegts.TSStreamType.VIDEO_VVC:
            type = AVMediaType.AVMEDIA_TYPE_VIDEO
            codecId = AVCodecID.AV_CODEC_ID_VVC
            break
          case mpegts.TSStreamType.AUDIO_AC3:
            type = AVMediaType.AVMEDIA_TYPE_AUDIO
            codecId = AVCodecID.AV_CODEC_ID_AC3
            break
          case 0x90:
            type = AVMediaType.AVMEDIA_TYPE_AUDIO
            codecId = AVCodecID.AV_CODEC_ID_PCM_ALAW
            break
          case 0x91:
            type = AVMediaType.AVMEDIA_TYPE_AUDIO
            codecId = AVCodecID.AV_CODEC_ID_PCM_MULAW
            break
          case mpegps.MpegpsStartCode.PRIVATE_STREAM_2:
            type = AVMediaType.AVMEDIA_TYPE_DATA
            codecId = AVCodecID.AV_CODEC_ID_DVD_NAV
            break
          default: {
            if (startCode >= 0x1e0 && startCode <= 0x1ef) {
              type = AVMediaType.AVMEDIA_TYPE_VIDEO
              codecId = AVCodecID.AV_CODEC_ID_CAVS
            }
            else if (startCode >= 0x1c0 && startCode <= 0x1df) {
              type = AVMediaType.AVMEDIA_TYPE_AUDIO
              codecId = AVCodecID.AV_CODEC_ID_MP3
            }
            else if (startCode >= 0x80 && startCode <= 0x87) {
              type = AVMediaType.AVMEDIA_TYPE_AUDIO
              codecId = AVCodecID.AV_CODEC_ID_AC3
            }
            else if ((startCode >= 0x88 && startCode <= 0x8f)
              || (startCode >= 0x98 && startCode <= 0x9f)
            ) {
              type = AVMediaType.AVMEDIA_TYPE_AUDIO
              codecId = AVCodecID.AV_CODEC_ID_DTS
            }
            else if (startCode >= 0xb0 && startCode <= 0xbf) {
              type = AVMediaType.AVMEDIA_TYPE_AUDIO
              codecId = AVCodecID.AV_CODEC_ID_TRUEHD
            }
            else if (startCode >= 0xc0 && startCode <= 0xcf) {
              type = AVMediaType.AVMEDIA_TYPE_AUDIO
              codecId = AVCodecID.AV_CODEC_ID_AC3
            }
            else if (startCode >= 0x20 && startCode <= 0x3f) {
              type = AVMediaType.AVMEDIA_TYPE_SUBTITLE
              codecId = AVCodecID.AV_CODEC_ID_DVD_SUBTITLE
            }
            else if (startCode >= 0xfd55 && startCode <= 0xfd5f) {
              type = AVMediaType.AVMEDIA_TYPE_VIDEO
              codecId = AVCodecID.AV_CODEC_ID_VC1
            }
            else {
              return
            }
          }
        }
        break
      }
    }
    
    const stream = formatContext.createStream()
    stream.codecpar.codecType = type
    stream.codecpar.codecId = codecId
    stream.timeBase.den = 90000
    stream.timeBase.num = 1

    const context: MpegpsStreamContext = stream.privData = {
      streamId,
      streamType,
      filter: null
    }

    if (codecId === AVCodecID.AV_CODEC_ID_PCM_ALAW
      || codecId === AVCodecID.AV_CODEC_ID_PCM_MULAW
    ) {
      stream.codecpar.chLayout.nbChannels = 1
      stream.codecpar.sampleRate = 8000
      stream.codecpar.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_NATIVE
      stream.codecpar.chLayout.u.mask = static_cast<uint64>(AV_CH_LAYOUT.AV_CH_LAYOUT_MONO)
    }

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
      context.filter = new Mp32RawFilter()
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3) {
      context.filter = new Ac32RawFilter()
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS) {
      context.filter = new Dts2RawFilter()
    }
    if (context.filter) {
      context.filter.init(addressof(stream.codecpar), addressof(stream.timeBase))
    }

    return stream
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {

    const str = await formatContext.ioReader.peekString(6)
    if (str.substring(0, 4) === 'IMKH') {
      this.context.imkhCctv = true
      await formatContext.ioReader.skip(4)
    }
    else if (str === 'Sofdec') {
      this.context.sofdec = true
      await formatContext.ioReader.skip(6)
    }

    const signature = await formatContext.ioReader.peekUint32()

    if (signature !== mpegps.MpegpsStartCode.PACK_START) {
      logger.error('the file format is not mpegps')
      return errorType.DATA_INVALID
    }

    if (formatContext.ioReader.flags & IOFlags.SEEKABLE) {
      const now = formatContext.ioReader.getPos()
      const MAX = 500n * 1000n

      const fileSize = await formatContext.ioReader.fileSize()

      let pos = fileSize - MAX
      if (pos < now) {
        pos = now
      }

      await formatContext.ioReader.seek(pos)

      try {
        this.context.pes.pts = NOPTS_VALUE_BIGINT
        while (true) {
          await this.readPES(formatContext)
          parsePES(this.context.pes)
          if (this.context.pes.pts !== NOPTS_VALUE_BIGINT) {
            this.context.lastPtsMap.set(this.context.pes.streamId, this.context.pes.pts)
          }
        }
      }
      catch (error) {
        await formatContext.ioReader.seek(now)
      }
    }

    this.context.ioEnded = false

    return 0
  }

  private checkExtradata(avpacket: pointer<AVPacket>, stream: AVStream) {
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
      && stream.codecpar.sampleRate === NOPTS_VALUE
    ) {
      const buffer = getAVPacketData(avpacket)

      const ver = (buffer[1] >>> 3) & 0x03
      const layer = (buffer[1] & 0x06) >> 1
      // const bitrateIndex = (buffer[2] & 0xF0) >>> 4
      const samplingFreqIndex = (buffer[2] & 0x0C) >>> 2

      const channelMode = (buffer[3] >>> 6) & 0x03

      const channelCount = channelMode !== 3 ? 2 : 1
      const profile = mp3.getProfileByLayer(layer)
      const sampleRate = mp3.getSampleRateByVersionIndex(ver, samplingFreqIndex)

      stream.codecpar.profile = profile
      stream.codecpar.sampleRate = sampleRate
      stream.codecpar.chLayout.nbChannels = channelCount
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
      && stream.codecpar.sampleRate === NOPTS_VALUE
    ) {
      const buffer = getAVPacketData(avpacket)
      const info = ac3.parseHeader(buffer)
      if (!is.number(info)) {
        stream.codecpar.sampleRate = reinterpret_cast<int32>(info.sampleRate)
        stream.codecpar.chLayout.nbChannels = reinterpret_cast<int32>(info.channels)
        stream.codecpar.bitrate = static_cast<int64>(info.bitrate)
      }
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS
      && stream.codecpar.sampleRate === NOPTS_VALUE
    ) {
      const buffer = getAVPacketData(avpacket)
      const info = dts.parseHeader(buffer)
      if (!is.number(info)) {
        stream.codecpar.sampleRate = info.sampleRate
        stream.codecpar.chLayout.nbChannels = info.channels
        stream.codecpar.bitrate = static_cast<int64>(info.bitrate)
      }
    }
    else if (!stream.codecpar.extradata) {
      let element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element) {
        stream.codecpar.extradata = avMalloc(element.size)
        memcpy(stream.codecpar.extradata, element.data, element.size)
        stream.codecpar.extradataSize = element.size
        deleteAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
          h264.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize))
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          hevc.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize))
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
          vvc.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize))
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          aac.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize))
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
          opus.parseAVCodecParameters(stream, mapSafeUint8Array(stream.codecpar.extradata, stream.codecpar.extradataSize))
        }
      }
    }
  }

  private parseSlice(slice: MpegpsSlice, formatContext: AVIFormatContext, avpacket: pointer<AVPacket>, stream: AVStream) {
    const data = concatTypeArray(Uint8Array, slice.buffers)

    const streamContext = stream.privData as MpegpsStreamContext

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    const codecId = stream.codecpar.codecId
    if (codecId === AVCodecID.AV_CODEC_ID_H264
      || codecId === AVCodecID.AV_CODEC_ID_H265
      || codecId === AVCodecID.AV_CODEC_ID_VVC
    ) {
      avpacket.bitFormat = h264.BitFormat.ANNEXB
    }

    avpacket.streamIndex = stream.index

    avpacket.dts = slice.dts
    avpacket.pts = slice.pts
    avpacket.pos = slice.pos
    avpacket.timeBase.den = 90000
    avpacket.timeBase.num = 1

    if (stream.startTime === NOPTS_VALUE_BIGINT) {
      stream.startTime = avpacket.pts || avpacket.dts
      if (this.context.lastPtsMap.has(streamContext.streamId)) {
        stream.duration = this.context.lastPtsMap.get(streamContext.streamId) - stream.startTime
      }
    }

    const payload = avMalloc(data.length)
    memcpyFromUint8Array(payload, data.length, data)
    addAVPacketData(avpacket, payload, data.length)
    
    if (streamContext.filter) {
      let ret = 0
      ret = streamContext.filter.sendAVPacket(avpacket)

      if (ret < 0) {
        logger.error('send avpacket to bsf failed')
        return errorType.DATA_INVALID
      }

      ret = streamContext.filter.receiveAVPacket(avpacket)

      if (ret < 0) {
        logger.error('receive avpacket from bsf failed')
        return errorType.DATA_INVALID
      }

      avpacket.timeBase.den = 90000
      avpacket.timeBase.num = 1
      avpacket.streamIndex = stream.index

      this.checkExtradata(avpacket, stream)

      while (true) {
        const avpacket = this.cacheAVPacket || createAVPacket()
        ret = streamContext.filter.receiveAVPacket(avpacket)
        if (ret === 0) {
          avpacket.timeBase.den = 90000
          avpacket.timeBase.num = 1
          avpacket.streamIndex = stream.index
          this.checkExtradata(avpacket, stream)
          formatContext.interval.packetBuffer.push(avpacket)
          this.cacheAVPacket = nullptr
        }
        else {
          this.cacheAVPacket = avpacket
          break
        }
      }
    }
    else {
      if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG2VIDEO) {
        if (mpegvideo.isIDR(avpacket)) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
        if (!stream.codecpar.extradata) {
          h264.parseAnnexbExtraData(avpacket, true)
          this.checkExtradata(avpacket, stream)
          stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
        }
        if (h264.isIDR(avpacket)) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
        if (!stream.codecpar.extradata) {
          hevc.parseAnnexbExtraData(avpacket, true)
          this.checkExtradata(avpacket, stream)
          stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
        }
        if (hevc.isIDR(avpacket)) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }
      else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
        if (!stream.codecpar.extradata) {
          vvc.parseAnnexbExtraData(avpacket, true)
          this.checkExtradata(avpacket, stream)
          stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
        }
        if (vvc.isIDR(avpacket)) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
      }
    }
  }

  @deasync
  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    while (true) {
      const startCode = await this.readPES(formatContext)

      let stream = formatContext.streams.find(((stream) => {
        const context = stream.privData as MpegpsStreamContext
        return context.streamId === this.context.pes.streamId
      }))

      if (!stream) {
        const id = startCode & 0xff
        stream = this.createStream(formatContext, this.context.psmType.get(id), id, startCode)
      }
      if (stream) {

        const context = stream.privData as MpegpsStreamContext

        parsePES(this.context.pes)

        if (!this.context.pes.payload) {
          continue
        }

        let slice = this.context.slices.get(context.streamId)
        if (!slice) {
          slice = {
            pts: -1n,
            dts: -1n,
            pos: -1n,
            buffers: []
          }
          this.context.slices.set(context.streamId, slice)
        }

        if (this.context.pes.dts === NOPTS_VALUE_BIGINT || !slice.buffers.length) {
          if (this.context.pes.dts !== NOPTS_VALUE_BIGINT) {
            slice.dts = this.context.pes.dts
            slice.pts = this.context.pes.pts
            slice.pos = this.context.pes.pos

            // 剔除前一个包的数据
            if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
              const next = nalu.getNextNaluStart(this.context.pes.payload, 0)
              if (next.offset > 3) {
                this.context.pes.payload = this.context.pes.payload.subarray(next.offset)
              }
            }
            else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
            ) {
              let first = 0
              let end = 2
              if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3) {
                first = 0x0b
              }
              else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3) {
                first = 0xff
              }
              else {
                first = 0x7f
                end = 4
              }
              for (let i = 0; i < this.context.pes.payload.length - end; i++) {
                if (this.context.pes.payload[i] === first ) {
                  const second = this.context.pes.payload[i + 1]

                  const max = 2

                  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3 && ((second & 0xe0) === 0xe0)) {
                    if (i !== 0) {

                      let count = 0
                      let offset = 0

                      while (true) {
                        const header = new FrameHeader()
                        mp3FrameHeader.parse(
                          header,
                          (this.context.pes.payload[i + offset] << 24)
                            | (this.context.pes.payload[i + offset + 1] << 16)
                            | (this.context.pes.payload[i + offset + 2] << 8)
                            | this.context.pes.payload[i + offset +3]
                        )
                        const ver = (this.context.pes.payload[i + offset + 1] >>> 3) & 0x03
                        const samplingFreqIndex = (this.context.pes.payload[i + offset + 2] & 0x0C) >>> 2
                        const sampleRate = mp3.getSampleRateByVersionIndex(ver, samplingFreqIndex)
                        let frameLength = mp3FrameHeader.getFrameLength(header, sampleRate)
                        
                        if (frameLength
                          && (i + offset + frameLength < this.context.pes.payload.length - 2)
                          && this.context.pes.payload[i + offset + frameLength] === 0xff
                          && (this.context.pes.payload[i + offset + frameLength + 1] & 0xe0) === 0xe0
                        ) {
                          count++
                          offset += frameLength
                          if (count === max) {
                            break
                          }
                        }
                        else {
                          break
                        }
                      }
                      if (count === max) {
                        this.context.pes.payload = this.context.pes.payload.subarray(i)
                      }
                      else {
                        continue
                      }
                    }
                    break
                  }
                  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3 && second === 0x77) {
                    if (i !== 0) {

                      let count = 0
                      let offset = 0

                      while (true) {

                        const info = ac3.parseHeader(this.context.pes.payload.subarray(i + offset))
                        
                        if (!is.number(info)
                          && (i + offset + info.frameSize < this.context.pes.payload.length - 2)
                          && this.context.pes.payload[i + offset + info.frameSize] === 0x0b
                          && this.context.pes.payload[i + offset + info.frameSize + 1] === 0x77
                        ) {
                          count++
                          offset += info.frameSize
                          if (count === max) {
                            break
                          }
                        }
                        else {
                          break
                        }
                      }
                      if (count === max) {
                        this.context.pes.payload = this.context.pes.payload.subarray(i)
                      }
                      else {
                        continue
                      }
                    }
                    break
                  }
                  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DTS
                    && second === 0xfe
                    && this.context.pes.payload[i + 2] === 0x80
                    && this.context.pes.payload[i + 3] === 0x81
                  ) {
                    if (i !== 0) {

                      let count = 0
                      let offset = 0

                      while (true) {

                        const info = dts.parseHeader(this.context.pes.payload.subarray(i + offset))
                        
                        if (!is.number(info)
                          && (i + offset + info.frameSize < this.context.pes.payload.length - 4)
                          && this.context.pes.payload[i + offset + info.frameSize] === 0x7f
                          && this.context.pes.payload[i + offset + info.frameSize + 1] === 0xfe
                          && this.context.pes.payload[i + offset + info.frameSize + 2] === 0x80
                          && this.context.pes.payload[i + offset + info.frameSize + 3] === 0x81
                        ) {
                          count++
                          offset += info.frameSize
                          if (count === max) {
                            break
                          }
                        }
                        else {
                          break
                        }
                      }
                      if (count === max) {
                        this.context.pes.payload = this.context.pes.payload.subarray(i)
                      }
                      else {
                        continue
                      }
                    }
                    break
                  }
                }
              }
            }
          }
          slice.buffers.push(this.context.pes.payload)
          continue
        }
        else {
          if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            const next = nalu.getNextNaluStart(this.context.pes.payload, 0)
            if (next.offset > 3) {
              slice.buffers.push(this.context.pes.payload.subarray(0, next.offset))
              this.context.pes.payload = this.context.pes.payload.subarray(next.offset)
            }
          }

          this.parseSlice(slice, formatContext, avpacket, stream)

          slice.buffers.length = 0
          slice.buffers.push(this.context.pes.payload)
          slice.dts = this.context.pes.dts
          slice.pts = this.context.pes.pts
          slice.pos = this.context.pes.pos

          return 0
        }
      }
    }
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      if (this.context.ioEnded) {
        if (this.context.slices.size) {
          let slice: MpegpsSlice
          let stream: AVStream
          this.context.slices.forEach((value, id) => {
            if (value.buffers.length) {
              stream = formatContext.streams.find(((stream) => {
                const context = stream.privData as MpegpsStreamContext
                return context.streamId === id
              }))
              if (stream) {
                slice = value
              }
            }
          })
          if (slice) {
            this.parseSlice(slice, formatContext, avpacket, stream)
            slice.buffers.length = 0
            slice.pts = slice.dts = slice.pos = -1n
            return 0
          }
        }
        return IOError.END
      }
      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      else {
        this.context.ioEnded = true
        return this.readAVPacket(formatContext, avpacket)
      }
    }
  }

  @deasync
  private async syncPSPacket(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT
    try {
      this.context.pes.pts = NOPTS_VALUE_BIGINT
      while (this.context.pes.pts === NOPTS_VALUE_BIGINT) {
        await this.readPES(formatContext)
        parsePES(this.context.pes)
        pos = this.context.pes.pos
      }
    }
    catch (error) {
      pos = NOPTS_VALUE_BIGINT
    }
    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
  }

  public async seek(
    formatContext: AVIFormatContext,
    stream: AVStream,
    timestamp: int64,
    flags: int32
  ): Promise<int64> {
    let now = formatContext.ioReader.getPos()

    this.context.slices.forEach((slice) => {
      if (slice.buffers.length && slice.pos < now) {
        now = slice.pos
      }
      slice.buffers.length = 0
      slice.pts = slice.dts = slice.pos = -1n
    })

    formatContext.streams.forEach((stream) => {
      const context = stream.privData as MpegpsStreamContext
      if (context.filter) {
        context.filter.reset()
      }
    })

    if (flags & AVSeekFlags.BYTE) {

      const size = await formatContext.ioReader.fileSize()

      if (size <= 0n) {
        return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
      }

      if (timestamp < 0n) {
        timestamp = 0n
      }
      else if (timestamp > size) {
        timestamp = size
      }
      await formatContext.ioReader.seek(timestamp)

      if (!(flags & AVSeekFlags.ANY)) {
        await this.syncPSPacket(formatContext)
      }

      this.context.ioEnded = false

      return now
    }
    else {
      if (stream && stream.sampleIndexes.length) {
        let index = array.binarySearch(stream.sampleIndexes, (item) => {
          if (item.pts > timestamp) {
            return -1
          }
          return 1
        })
        if (index > 0 && avRescaleQ(timestamp - stream.sampleIndexes[index - 1].pts, stream.timeBase, AV_MILLI_TIME_BASE_Q) < 10000n) {
          logger.debug(`seek in sampleIndexes, found index: ${index}, pts: ${stream.sampleIndexes[index - 1].pts}, pos: ${stream.sampleIndexes[index - 1].pos}`)
          await formatContext.ioReader.seek(stream.sampleIndexes[index - 1].pos)
          this.context.ioEnded = false
          return now
        }
      }

      logger.debug('not found any keyframe index, try to seek in bytes')

      let ret = await seekInBytes(
        formatContext,
        stream,
        timestamp,
        0n,
        this.readAVPacket.bind(this),
        this.syncPSPacket.bind(this)
      )
      if (ret >= 0) {
        this.context.ioEnded = false
      }
      return ret
    }
  }

  public getAnalyzeStreamsCount(): number {
    return 1
  }
}
