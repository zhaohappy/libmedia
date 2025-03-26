/*
 * libmedia matroska encoder
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
import OFormat from './OFormat'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import { AVFormat } from 'avutil/avformat'
import * as logger from 'common/util/logger'
import { avRescaleQ2 } from 'avutil/util/rational'
import { createAVPacket, destroyAVPacket, getAVPacketData, getAVPacketSideData, hasAVPacketSideData } from 'avutil/util/avpacket'
import * as object from 'common/util/object'
import { OMatroskaContext, TrackEntry } from './matroska/type'
import IOWriterSync from 'common/io/IOWriterSync'
import * as omatroska from './matroska/omatroska'
import { EBMLId, MATROSKATrackType, MkvTag2CodecId, WebmTag2CodecId } from './matroska/matroska'
import * as crypto from 'avutil/util/crypto'
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { mapUint8Array } from 'cheap/std/memory'
import { chromaLocation2Pos } from 'avutil/util/pixel'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import * as string from 'common/util/string'
import AVStream from 'avutil/AVStream'
import concatTypeArray from 'common/function/concatTypeArray'
import Annexb2AvccFilter from '../bsf/h2645/Annexb2AvccFilter'
import * as naluUtil from 'avutil/util/nalu'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as intread from 'avutil/util/intread'
import { Uint8ArrayInterface } from 'common/io/interface'
import { AVStreamMetadataKey } from 'avutil/AVStream'

export interface OMatroskaFormatOptions {
  isLive?: boolean
  docType?: string
}

const defaultOMatroskaFormatOptions: OMatroskaFormatOptions = {
  isLive: false,
  docType: 'matroska'
}

function formatTimestamp(milliseconds: int64) {
  const hours = milliseconds / BigInt(1000 * 60 * 60)
  const remainingMilliseconds = milliseconds % BigInt(1000 * 60 * 60)

  const minutes = remainingMilliseconds / BigInt(1000 * 60)
  const remainingMillisecondsAfterMinutes = remainingMilliseconds % BigInt(1000 * 60)

  const seconds = remainingMillisecondsAfterMinutes / 1000n

  const ms = remainingMillisecondsAfterMinutes % 1000n

  return string.format(
    '%02d:%02d:%02d.%03d000000\x00\x00',
    static_cast<int32>(hours),
    static_cast<int32>(minutes),
    static_cast<int32>(seconds),
    static_cast<int32>(ms)
  )
}

export default class OMatroskaFormat extends OFormat {

  public type: AVFormat = AVFormat.MATROSKA

  private options: OMatroskaFormatOptions

  private context: OMatroskaContext

  private random: Uint8Array
  private randomView: DataView

  private avpacket: pointer<AVPacket>
  private annexb2AvccFilter: Annexb2AvccFilter

  constructor(options: OMatroskaFormatOptions = {}) {
    super()
    this.options = object.extend({}, defaultOMatroskaFormatOptions, options)

    this.random = new Uint8Array(8)
    this.randomView = new DataView(this.random.buffer)
  }

  public init(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.setEndian(false)
    this.avpacket = createAVPacket()

    const context: OMatroskaContext = {
      isLive: this.options.isLive,
      segmentStart: -1n,
      seekHeadEnd: -1n,
      header: {
        version: 1,
        readVersion: 1,
        maxIdLength: 4,
        maxSizeLength: 8,
        docType: this.options.docType,
        docTypeVersion: 4,
        docTypeReadVersion: 2
      },
      seekHead: {
        entry: []
      },
      info: {
        muxingApp: defined(VERSION),
        writingApp: defined(VERSION),
        timestampScale: 1000000,
        duration: 0,
        segmentUUID: -1n
      },
      tracks: {
        entry: []
      },
      attachments: {
        entry: []
      },
      chapters: {
        entry: []
      },
      cues: {
        entry: []
      },
      tags: {
        entry: [
          {
            tag: {
              name: 'ENCODER',
              string: defined(VERSION)
            }
          }
        ]
      },

      elePositionInfos: [],
      eleCaches: [],
      eleWriter: new IOWriterSync(),
      currentCluster: {
        timeCode: -1n,
        pos: -1n
      },
      hasVideo: false
    }

    if (context.header.docType === 'webm') {
      context.header.docTypeVersion = 2
      context.header.docTypeReadVersion = 2
    }

    context.eleWriter.onFlush = (data) => {
      context.eleCaches.push(data.slice())
      return 0
    }

    crypto.random(this.random)
    context.info.segmentUUID = this.randomView.getBigUint64(0)

    formatContext.privateData = this.context = context

    const tag2CodecId = this.context.header.docType === 'webm' ? WebmTag2CodecId : MkvTag2CodecId

    function codecId2Tag(codecpar: AVCodecParameters) {
      let tag = ''
      object.each(tag2CodecId, (id, t) => {
        if (id === codecpar.codecId) {
          tag = t
        }
      })
      if (codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F64LE
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_F32LE
      ) {
        tag = 'A_PCM/FLOAT/IEEE'
      }
      if (codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16BE
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S24BE
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S32BE
      ) {
        tag = 'A_PCM/INT/BIG'
      }
      if (codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_U8
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16LE
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S24LE
        || codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S32LE
      ) {
        tag = 'A_PCM/INT/LIT'
      }
      return tag
    }

    formatContext.streams.forEach((stream) => {
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_ATTACHMENT) {
        crypto.random(this.random)
        context.attachments.entry.push({
          uid: this.randomView.getBigUint64(0),
          name: stream.metadata[AVStreamMetadataKey.TITLE] || 'unknown',
          mime: stream.metadata[AVStreamMetadataKey.MIME] || 'unknown',
          data: {
            data: mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)),
            size: static_cast<int64>(stream.codecpar.extradataSize),
            pos: -1n
          },
          description: stream.metadata[AVStreamMetadataKey.DESCRIPTION] || 'unknown'
        })
      }
      else {
        const track: TrackEntry = {}
        crypto.random(this.random)
        track.uid = this.randomView.getBigUint64(0)
        track.codecId = codecId2Tag(stream.codecpar)
        track.number = stream.index + 1
        if (stream.codecpar.extradata) {
          track.codecPrivate = {
            data: mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)).slice(),
            pos: -1n,
            size: static_cast<int64>(stream.codecpar.extradataSize)
          }
        }
        if (stream.metadata[AVStreamMetadataKey.LANGUAGE]) {
          track.language = stream.metadata[AVStreamMetadataKey.LANGUAGE]
        }
        if (stream.metadata[AVStreamMetadataKey.TITLE]) {
          track.name = stream.metadata[AVStreamMetadataKey.TITLE]
        }

        switch (stream.codecpar.codecType) {
          case AVMediaType.AVMEDIA_TYPE_AUDIO: {
            track.type = MATROSKATrackType.AUDIO
            track.audio = {
              channels: stream.codecpar.chLayout.nbChannels,
              sampleRate: reinterpret_cast<float>(stream.codecpar.sampleRate),
              bitDepth: stream.codecpar.bitsPerRawSample
            }
            break
          }
          case AVMediaType.AVMEDIA_TYPE_VIDEO: {
            context.hasVideo = true
            track.type = MATROSKATrackType.VIDEO
            track.video = {
              pixelWidth: stream.codecpar.width,
              pixelHeight: stream.codecpar.height,
              color: {
                matrixCoefficients: stream.codecpar.colorSpace,
                primaries: stream.codecpar.colorPrimaries,
                transferCharacteristics: stream.codecpar.colorTrc,
                range: stream.codecpar.colorRange
              }
            }
            const result = chromaLocation2Pos(stream.codecpar.chromaLocation)
            if (result) {
              track.video.color.chromaSitingVert = (result.x >>> 7) + 1
              track.video.color.chromaSitingHorz = (result.y >>> 7) + 1
            }
            if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
              || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
            ) {
              if (track.codecPrivate) {
                if (naluUtil.isAnnexb(track.codecPrivate.data)) {
                  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
                    track.codecPrivate.data = h264.annexbExtradata2AvccExtradata(track.codecPrivate.data)
                  }
                  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
                    track.codecPrivate.data = hevc.annexbExtradata2AvccExtradata(track.codecPrivate.data)
                  }
                  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
                    track.codecPrivate.data = vvc.annexbExtradata2AvccExtradata(track.codecPrivate.data)
                  }
                  track.codecPrivate.size = static_cast<int64>(track.codecPrivate.data.length)
                }
              }
              this.annexb2AvccFilter = new Annexb2AvccFilter()
              this.annexb2AvccFilter.init(addressof(stream.codecpar), addressof(stream.timeBase))
            }
            break
          }
          case AVMediaType.AVMEDIA_TYPE_SUBTITLE: {
            track.type = MATROSKATrackType.SUBTITLE
            break
          }
        }
        track.lastPts = 0n
        stream.privData = track

        context.tracks.entry.push(track)
      }
    })

    return 0
  }

  public async destroy(formatContext: AVOFormatContext) {
    if (this.annexb2AvccFilter) {
      this.annexb2AvccFilter.destroy()
      this.annexb2AvccFilter = null
    }
    if (this.avpacket) {
      destroyAVPacket(this.avpacket)
      this.avpacket = nullptr
    }
  }

  public writeHeader(formatContext: AVOFormatContext): number {
    omatroska.writeHeader(formatContext.ioWriter, this.context, this.context.header)

    omatroska.writeEbmlId(formatContext.ioWriter, EBMLId.SEGMENT)

    const now = formatContext.ioWriter.getPos()
    omatroska.writeEbmlLengthUnknown(formatContext.ioWriter, 8)
    this.context.elePositionInfos.push({
      pos: now,
      length: 0,
      bytes: 8
    })

    this.context.segmentStart = formatContext.ioWriter.getPos()
    // SeekHead 占位
    formatContext.ioWriter.skip(96)
    this.context.seekHeadEnd = formatContext.ioWriter.getPos()

    return 0
  }

  private writeBlock(stream: AVStream, avpacket: pointer<AVPacket>, id: EBMLId.SIMPLE_BLOCK | EBMLId.BLOCK = EBMLId.SIMPLE_BLOCK) {
    const track = stream.privData as TrackEntry
    omatroska.writeEbmlId(this.context.eleWriter, id)
    if ((stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
    ) && avpacket.bitFormat !== h264.BitFormat.AVCC
    ) {
      this.annexb2AvccFilter.sendAVPacket(avpacket)
      this.annexb2AvccFilter.receiveAVPacket(this.avpacket)
      avpacket = this.avpacket
    }
    omatroska.writeEbmlLength(this.context.eleWriter, omatroska.ebmlLengthSize(track.number) + 2 + 1 + avpacket.size)
    omatroska.writeEbmlNum(this.context.eleWriter, track.number, omatroska.ebmlLengthSize(track.number))
    const pts = avRescaleQ2(avpacket.pts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)

    this.context.eleWriter.writeInt16(static_cast<int32>(pts - this.context.currentCluster.timeCode))

    if (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY || stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
      this.context.eleWriter.writeUint8(0x80)
    }
    else {
      this.context.eleWriter.writeUint8(0x00)
    }
    if (!track.codecPrivate) {
      let element = getAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA)
      if (element) {
        track.codecPrivate = {
          data: mapUint8Array(element.data, element.size).slice(),
          pos: -1n,
          size: static_cast<int64>(element.size)
        }
      }
    }
    this.context.eleWriter.writeBuffer(getAVPacketData(avpacket))
  }

  private writeBlockGroup(stream: AVStream, avpacket: pointer<AVPacket>) {
    omatroska.writeEleData(this.context.eleWriter, this.context, EBMLId.BLOCK_GROUP, (eleWriter) => {
      if (avpacket.duration > 0) {
        omatroska.writeEbmlUint(eleWriter, EBMLId.BLOCK_DURATION, avRescaleQ2(avpacket.duration, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q))
      }
      const additions: {
        additionalId: int64
        buffer: Uint8ArrayInterface
      }[] = []
      for (let i = 0; i < avpacket.sideDataElems; i++) {
        if (avpacket.sideData[i].type === AVPacketSideDataType.AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL) {
          additions.push({
            additionalId: intread.rb64(avpacket.sideData[i].data),
            buffer: mapUint8Array(avpacket.sideData[i].data + 8, avpacket.sideData[i].size - 8)
          })
        }
      }
      if (additions.length) {
        omatroska.writeEleData(this.context.eleWriter, this.context, EBMLId.BLOCK_ADDITIONS, (eleWriter) => {
          omatroska.writeEleData(eleWriter, this.context, EBMLId.BLOCK_MORE, (eleWriter) => {
            additions.forEach((addition) => {
              omatroska.writeEbmlUint(eleWriter, EBMLId.BLOCK_ADD_ID, addition.additionalId)
              omatroska.writeEbmlBuffer(eleWriter, EBMLId.BLOCK_ADDITIONS, addition.buffer)
            })
          })
        })
      }
      if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
        && !(avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
      ) {
        const track = stream.privData as TrackEntry
        omatroska.writeEbmlSint(eleWriter, EBMLId.BLOCK_REFERENCE, track.lastPts - avpacket.pts)
      }
      this.writeBlock(stream, avpacket, EBMLId.BLOCK)
    })
  }

  private writeCluster(formatContext: AVOFormatContext) {
    if (this.context.currentCluster.pos === -1n) {
      return
    }

    formatContext.ioWriter.flush()
    this.context.eleWriter.flush()

    let block = concatTypeArray(Uint8Array, this.context.eleCaches)

    if (!block.length) {
      return
    }

    this.context.eleCaches.length = 0
    omatroska.writeEbmlUint(this.context.eleWriter, EBMLId.CLUSTER_TIME_CODE, this.context.currentCluster.timeCode)
    this.context.eleWriter.flush()
    block = concatTypeArray(Uint8Array, [...this.context.eleCaches, block])


    omatroska.writeEbmlId(formatContext.ioWriter, EBMLId.CLUSTER)
    omatroska.writeEbmlLength(formatContext.ioWriter, block.length)
    formatContext.ioWriter.writeBuffer(block)

    formatContext.ioWriter.flush()
    this.context.eleCaches.length = 0
  }

  public writeAVPacket(formatContext: AVOFormatContext, avpacket: pointer<AVPacket>): number {

    if (!avpacket.size) {
      logger.warn(`packet\'s size is 0: ${avpacket.streamIndex}, ignore it`)
      return 0
    }

    const stream = formatContext.getStreamByIndex(avpacket.streamIndex)

    if (!stream) {
      logger.warn(`can not found the stream width the avpacket\'s streamIndex: ${avpacket.streamIndex}, ignore it`)
      return
    }

    const track = stream.privData as TrackEntry

    const pts = avRescaleQ2(avpacket.pts !== NOPTS_VALUE_BIGINT ? avpacket.pts : avpacket.dts, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)

    if (!track.maxPts || track.maxPts < pts) {
      track.maxPts = pts
      track.duration = pts
      if (avpacket.duration !== NOPTS_VALUE_BIGINT) {
        track.duration += avRescaleQ2(avpacket.duration, addressof(avpacket.timeBase), AV_MILLI_TIME_BASE_Q)
      }
    }

    if (this.options.isLive
      || (avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
        && (
          stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
          || !this.context.hasVideo
            && (pts - this.context.currentCluster.timeCode > 5000n)
        )
    ) {
      this.writeCluster(formatContext)
      this.context.currentCluster.timeCode = pts
      this.context.currentCluster.pos = formatContext.ioWriter.getPos() - this.context.segmentStart
      this.context.cues.entry.push({
        time: this.context.currentCluster.timeCode,
        pos: [{
          pos: this.context.currentCluster.pos,
          track: track.number
        }]
      })
    }

    if (avpacket.duration > 0
      || hasAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL)
    ) {
      this.writeBlockGroup(stream, avpacket)
    }
    else {
      this.writeBlock(stream, avpacket)
    }

    track.lastPts = avpacket.pts

    return 0
  }

  public writeTrailer(formatContext: AVOFormatContext): number {

    this.writeCluster(formatContext)

    formatContext.streams.forEach((stream) => {
      const track = stream.privData as TrackEntry

      if (!this.options.isLive && track?.duration) {
        const duration = track.duration
        this.context.info.duration = reinterpret_cast<float>(static_cast<int32>(duration))
        this.context.tags.entry.push({
          tag: {
            name: 'DURATION',
            string: formatTimestamp(duration)
          },
          target: {
            trackUid: track.uid
          }
        })
      }
    })

    formatContext.ioWriter.flush()
    this.context.eleWriter.flush()
    this.context.eleCaches.length = 0

    this.context.eleWriter.reset()

    const now = formatContext.ioWriter.getPos()
    let segmentLength = now - this.context.segmentStart

    this.context.seekHead.entry.push({
      id: EBMLId.INFO,
      pos: this.context.eleWriter.getPos() + this.context.seekHeadEnd - this.context.segmentStart
    })
    omatroska.writeInfo(this.context.eleWriter, this.context, this.context.info)
    this.context.seekHead.entry.push({
      id: EBMLId.TRACKS,
      pos: this.context.eleWriter.getPos() + this.context.seekHeadEnd - this.context.segmentStart
    })
    omatroska.writeTracks(this.context.eleWriter, this.context, this.context.tracks)
    this.context.seekHead.entry.push({
      id: EBMLId.TAGS,
      pos: this.context.eleWriter.getPos() + this.context.seekHeadEnd - this.context.segmentStart
    })
    omatroska.writeTags(this.context.eleWriter, this.context, this.context.tags)
    this.context.eleWriter.flush()

    const buffer = concatTypeArray(Uint8Array, this.context.eleCaches)
    formatContext.ioWriter.onFlush(buffer, this.context.seekHeadEnd)

    segmentLength += static_cast<int64>(buffer.length)

    this.context.cues.entry.forEach((cue) => {
      cue.pos.forEach((item) => {
        item.pos += static_cast<int64>(buffer.length)
      })
    })

    if (this.context.cues.entry.length) {
      this.context.seekHead.entry.push({
        id: EBMLId.CUES,
        pos: formatContext.ioWriter.getPos() - this.context.segmentStart + static_cast<int64>(buffer.length)
      })
      omatroska.writeCues(formatContext.ioWriter, this.context, this.context.cues)
    }
    if (this.context.attachments.entry.length) {
      this.context.seekHead.entry.push({
        id: EBMLId.ATTACHMENTS,
        pos: formatContext.ioWriter.getPos() - this.context.segmentStart + static_cast<int64>(buffer.length)
      })
      omatroska.writeAttachments(formatContext.ioWriter, this.context, this.context.attachments)
    }

    formatContext.ioWriter.flush()
    segmentLength += formatContext.ioWriter.getPos() - now

    formatContext.ioWriter.seek(this.context.segmentStart)
    omatroska.writeSeekHeader(formatContext.ioWriter, this.context, this.context.seekHead)
    const seekHeadLen = formatContext.ioWriter.getPos() - this.context.segmentStart
    omatroska.writeEbmlId(formatContext.ioWriter, EBMLId.VOID)
    omatroska.writeEbmlLength(formatContext.ioWriter, this.context.seekHeadEnd - this.context.segmentStart - seekHeadLen - 2n, 1)
    formatContext.ioWriter.flush()

    this.context.elePositionInfos[0].length = segmentLength
    omatroska.updatePositionSize(formatContext.ioWriter, this.context)

    this.context.eleCaches.length = 0

    return 0
  }

  public flush(formatContext: AVOFormatContext): number {
    formatContext.ioWriter.flush()
    this.context.currentCluster.timeCode = -1n
    this.context.currentCluster.pos = -1n
    return 0
  }

}
