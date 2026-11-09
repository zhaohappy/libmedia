// SPDX-License-Identifier: LGPL-3.0-or-later

import type { AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'
import RmDemuxer, { RmError } from './rm/RmDemuxer'
import { mapSafeUint8Array } from '@libmedia/cheap'
import {
  AVFormat, AVSeekFlags, IOFlags, AVMediaType, AVCodecID, AVCodecParameterFlags,
  AVPacketFlags, NOPTS_VALUE_BIGINT, errorType, addAVPacketData,
  type AVPacket, type AVStream
} from '@libmedia/avutil'
import { allocAVPacketData } from '@libmedia/avutil/internal'
import { IOError } from '@libmedia/common/io'
import { logger } from '@libmedia/common'

const codecs: Record<string, AVCodecID> = {
  RV10: AVCodecID.AV_CODEC_ID_RV10,
  RV20: AVCodecID.AV_CODEC_ID_RV20,
  RV30: AVCodecID.AV_CODEC_ID_RV30,
  RV40: AVCodecID.AV_CODEC_ID_RV40,
  cook: AVCodecID.AV_CODEC_ID_COOK,
  sipr: AVCodecID.AV_CODEC_ID_SIPR,
  raac: AVCodecID.AV_CODEC_ID_AAC,
  racp: AVCodecID.AV_CODEC_ID_AAC,
  dnet: AVCodecID.AV_CODEC_ID_AC3
}

export default class IRmFormat extends IFormat {
  public type = AVFormat.RM
  private demuxer: RmDemuxer

  public init(context: AVIFormatContext) {
    context.ioReader.setEndian(true)
    this.demuxer = new RmDemuxer(context.ioReader, !!(context.ioReader.flags & IOFlags.SEEKABLE))
  }

  public getAnalyzeStreamsCount() {
    return this.demuxer.streams.length
  }

  private error(context: AVIFormatContext, error: Error) {
    logger.error(error.message)
    if (error instanceof RmError) {
      return error.unsupported ? errorType.FORMAT_NOT_SUPPORT : errorType.DATA_INVALID
    }
    // EOF inside an object/frame is truncation, not a clean end of media.
    return context.ioReader.error === IOError.END ? errorType.DATA_INVALID
      : (context.ioReader.error || errorType.DATA_INVALID)
  }

  public async readHeader(context: AVIFormatContext): Promise<number> {
    try {
      await this.demuxer.open()
      Object.assign(context.metadata, this.demuxer.metadata)
      for (const info of this.demuxer.streams) {
        const stream = context.createStream()
        stream.id = info.id
        stream.timeBase.num = 1
        stream.timeBase.den = 1000
        stream.startTime = BigInt(info.start)
        stream.duration = info.duration ? BigInt(info.duration) : NOPTS_VALUE_BIGINT
        stream.metadata.title = info.name
        stream.codecpar.codecType = info.video ? AVMediaType.AVMEDIA_TYPE_VIDEO : AVMediaType.AVMEDIA_TYPE_AUDIO
        stream.codecpar.codecId = codecs[info.codec]
        stream.codecpar.bitrate = BigInt(info.bitrate)
        stream.codecpar.width = info.width
        stream.codecpar.height = info.height
        stream.codecpar.framerate.num = info.fps
        stream.codecpar.framerate.den = 65536
        stream.codecpar.sampleRate = info.sampleRate
        stream.codecpar.chLayout.nbChannels = info.channels
        stream.codecpar.frameSize = info.frameSamples
        stream.codecpar.blockAlign = info.blockAlign
        if (info.video) {
          stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_DTS
        }
        if (info.extra.length) {
          stream.codecpar.extradata = allocAVPacketData(reinterpret_cast<size>(info.extra.length))
          stream.codecpar.extradataSize = info.extra.length
          mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(info.extra.length)).set(info.extra)
        }
        this.onStreamAdd?.(stream)
      }
      return 0
    }
    catch (error) {
      return this.error(context, error)
    }
  }

  public async readAVPacket(context: AVIFormatContext, packet: pointer<AVPacket>): Promise<number> {
    try {
      const result = await this.demuxer.read()
      if (!result) {
        return IOError.END
      }
      const stream = context.streams.find((s) => s.id === result.streamId)
      const data = allocAVPacketData(reinterpret_cast<size>(result.data.length))
      mapSafeUint8Array(data, reinterpret_cast<size>(result.data.length)).set(result.data)
      addAVPacketData(packet, data, result.data.length)
      packet.streamIndex = stream.index
      packet.timeBase.num = 1
      packet.timeBase.den = 1000
      packet.pts = BigInt(result.pts)
      packet.dts = stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO ? NOPTS_VALUE_BIGINT : packet.pts
      packet.duration = BigInt(result.duration)
      packet.pos = result.pos
      packet.flags = result.key ? AVPacketFlags.AV_PKT_FLAG_KEY : 0
      return 0
    }
    catch (error) {
      return this.error(context, error)
    }
  }

  public async seek(context: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {
    if (!(context.ioReader.flags & IOFlags.SEEKABLE) || flags & AVSeekFlags.BYTE) {
      return BigInt(errorType.OPERATE_NOT_SUPPORT)
    }
    const pos = context.ioReader.getPos()
    try {
      await this.demuxer.seek(Math.max(0, Number(timestamp)), stream.id)
      return pos
    }
    catch (error) {
      return BigInt(this.error(context, error))
    }
  }

  public async destroy() {
    this.demuxer?.destroy()
  }
}
