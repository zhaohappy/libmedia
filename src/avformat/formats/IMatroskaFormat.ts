/*
 * libmedia matroska decoder
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
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import { IOError } from 'common/io/error'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat } from 'avutil/avformat'
import { mapUint8Array, memcpyFromUint8Array } from 'cheap/std/memory'
import { avFree, avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData, createAVPacket } from 'avutil/util/avpacket'
import AVStream, { AVDisposition } from 'avutil/AVStream'
import { AV_TIME_BASE, AV_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import { EBMLId, MATROSKABlockAddIdType, MATROSKALacingMode, MATROSKATrackEncodingComp, MATROSKATrackType, MkvTag2CodecId, WebmTag2CodecId } from './matroska/matroska'
import { IOFlags } from 'avutil/avformat'
import { Additions, ClusterIndex, MatroskaContext, TrackEntry } from './matroska/type'
import { EbmlSyntaxAttachments, EbmlSyntaxBlockGroup, EbmlSyntaxChapters, EbmlSyntaxCluster, EbmlSyntaxCues, EbmlSyntaxHeadSeek,
  EbmlSyntaxHeader, EbmlSyntaxInfo, EbmlSyntaxTags, EbmlSyntaxTracks, parseEbmlSyntax, readEbmlId, readVInt, readVInt64,
  readVSint
} from './matroska/imatroska'

import * as array from 'common/util/array'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as vp8 from 'avutil/codecs/vp8'
import * as vp9 from 'avutil/codecs/vp9'
import * as av1 from 'avutil/codecs/av1'
import * as mp3 from 'avutil/codecs/mp3'
import * as opus from 'avutil/codecs/opus'
import * as aac from 'avutil/codecs/aac'
import * as flac from 'avutil/codecs/flac'
import { avRescaleQ } from 'avutil/util/rational'
import BufferReader from 'common/io/BufferReader'
import findStreamByTrackUid from './matroska/function/findStreamByTrackUid'
import findStreamByTrackNumber from './matroska/function/findStreamByTrackNumber'
import * as intwrite from 'avutil/util/intwrite'
import * as is from 'common/util/is'
import * as object from 'common/util/object'
import * as riff from './riff/riff'
import * as isomTags from './isom/tags'
import concatTypeArray from 'common/function/concatTypeArray'
import * as text from 'common/util/text'
import isDef from 'common/function/isDef'
import * as naluUtil from 'avutil/util/nalu'
import { AVStreamMetadataKey } from 'avutil/AVStream'

export default class IMatroskaFormat extends IFormat {

  public type: AVFormat = AVFormat.MATROSKA

  private context: MatroskaContext

  private blockReader: BufferReader

  constructor() {
    super()
  }

  public init(formatContext: AVIFormatContext): void {
    if (formatContext.ioReader) {
      formatContext.ioReader.setEndian(true)
    }
    const context: MatroskaContext = {
      isLive: true,
      firstCluster: -1n,
      segmentStart: -1n,
      header: {
        version: 0,
        readVersion: 0,
        maxIdLength: 4,
        maxSizeLength: 8,
        docType: '',
        docTypeVersion: 0,
        docTypeReadVersion: 0
      },
      seekHead: null,
      info: null,
      tracks: null,
      attachments: null,
      chapters: null,
      cues: null,
      tags: null,

      maxPts: NOPTS_VALUE_BIGINT,
      currentCluster: {
        timeCode: 0n,
        pos: -1n,
        block: {
          pos: -1n,
          size: -1n
        },
        blockGroup: {
          block: null
        }
      },
      clusterIndexes: [],
      clusterIndexesPosMap: new Map()
    }
    formatContext.privateData = this.context = context
  }

  private analyzeStreams(formatContext: AVIFormatContext) {

    const tag2CodecId = this.context.header.docType === 'webm' ? WebmTag2CodecId : MkvTag2CodecId

    if (this.context.tracks) {
      array.each(this.context.tracks.entry, (track) => {
        const stream = formatContext.createStream()
        stream.privData = track
        stream.codecpar.codecId = tag2CodecId[track.codecId] || AVCodecID.AV_CODEC_ID_NONE
        switch (track.type) {
          case MATROSKATrackType.AUDIO:
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
            break
          case MATROSKATrackType.VIDEO:
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
            break
          case MATROSKATrackType.SUBTITLE:
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
            break
          default:
            stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_UNKNOWN
        }

        if (track.language) {
          stream.metadata[AVStreamMetadataKey.LANGUAGE] = track.language
        }
        if (track.name) {
          stream.metadata[AVStreamMetadataKey.TITLE] = track.name
        }

        if (track.audio) {
          if (track.codecName === 'A_PCM/FLOAT/IEEE') {
            if (track.audio.bitDepth === 64) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_F64LE
            }
            else if (track.audio.bitDepth === 32) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_F32LE
            }
          }
          else if (track.codecName === 'A_PCM/INT/BIG') {
            if (track.audio.bitDepth === 16) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S16BE
            }
            else if (track.audio.bitDepth === 24) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S24BE
            }
            else if (track.audio.bitDepth === 32) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S32BE
            }
          }
          else if (track.codecName === 'A_PCM/INT/LIT') {
            if (track.audio.bitDepth === 8) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_U8
            }
            else if (track.audio.bitDepth === 16) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S16LE
            }
            else if (track.audio.bitDepth === 24) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S24LE
            }
            else if (track.audio.bitDepth === 32) {
              stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_PCM_S32LE
            }
          }

          stream.codecpar.chLayout.nbChannels = track.audio.channels
          stream.codecpar.sampleRate = static_cast<int32>(track.audio.sampleRate)
          stream.codecpar.bitsPerCodedSample = track.audio.bitDepth
        }
        else if (track.video) {
          stream.codecpar.width = track.video.pixelWidth
          stream.codecpar.height = track.video.pixelHeight
          if (track.video.color) {
            if (is.number(track.video.color.primaries)) {
              stream.codecpar.colorPrimaries = track.video.color.primaries
            }
            if (is.number(track.video.color.transferCharacteristics)) {
              stream.codecpar.colorTrc = track.video.color.transferCharacteristics
            }
            if (is.number(track.video.color.range)) {
              stream.codecpar.colorRange = track.video.color.range
            }
            if (is.number(track.video.color.matrixCoefficients)) {
              stream.codecpar.colorSpace = track.video.color.matrixCoefficients
            }
          }
        }

        let extradataOffset = 0

        if (track.codecId === 'V_MS/VFW/FOURCC' && track.codecPrivate?.size >= 40) {
          stream.codecpar.bitsPerCodedSample = (track.codecPrivate.data[15] << 8) | track.codecPrivate.data[14]
          stream.codecpar.codecTag = (track.codecPrivate.data[19] << 24) |  (track.codecPrivate.data[18] << 16)
            | (track.codecPrivate.data[17] << 8) | track.codecPrivate.data[16]

          stream.codecpar.codecId = riff.codecBmpTags[stream.codecpar.codecTag] || AVCodecID.AV_CODEC_ID_NONE

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_NONE) {
            stream.codecpar.codecId === isomTags.codecMovVideoTags[stream.codecpar.codecTag] || AVCodecID.AV_CODEC_ID_NONE
          }
          extradataOffset = 40
        }
        else if (track.codecId === 'V_QUICKTIME' && track.codecPrivate?.size >= 21) {
          const tags = stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO ? isomTags.codecMovAudioTags : isomTags.codecMovVideoTags
          stream.codecpar.codecTag = (track.codecPrivate.data[3] << 24) |  (track.codecPrivate.data[2] << 16)
          | (track.codecPrivate.data[1] << 8) | track.codecPrivate.data[0]

          const codecId = tags[stream.codecpar.codecTag]
          if (codecId) {
            const data = new Uint8Array(4)
            const size = static_cast<int32>(track.codecPrivate.size)
            data[0] = (size >>> 24) & 0xff
            data[1] = (size >>> 16) & 0xff
            data[2] = (size >>> 8) & 0xff
            data[3] = size & 0xff
            track.codecPrivate.size += 4n
            track.codecPrivate.data = concatTypeArray(Uint8Array, [data, track.codecPrivate.data])
          }
          stream.codecpar.codecId = codecId || AVCodecID.AV_CODEC_ID_NONE
        }

        if (track.codecPrivate?.data && (track.codecPrivate.size - static_cast<int64>(extradataOffset)) > 0) {
          let codecPrivateData = track.codecPrivate.data.subarray(extradataOffset)

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_SSA
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ASS
          ) {
            const header = text.decode(codecPrivateData)
            let lines = header.split(/\r?\n/)
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim() === '[Events]') {
                lines = lines.slice(0, i)
                break
              }
            }
            // add the default Events Format
            lines.push('[Events]')
            lines.push('Format: ReadOrder, Layer, Style, Name, MarginL, MarginR, MarginV, Effect, Text')
            codecPrivateData = text.encode(lines.join('\n'))
          }

          stream.codecpar.extradataSize = codecPrivateData.length
          stream.codecpar.extradata = avMalloc(codecPrivateData.length)
          memcpyFromUint8Array(stream.codecpar.extradata, codecPrivateData.length, codecPrivateData)

          if (stream.codecpar.extradata) {
            switch (stream.codecpar.codecId) {
              case AVCodecID.AV_CODEC_ID_H264: {
                const extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
                h264.parseAVCodecParameters(stream, extradata)
                if (naluUtil.isAnnexb(extradata)) {
                  stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
                }
                else {
                  stream.codecpar.bitFormat = h264.BitFormat.AVCC
                }
                break
              }
              case AVCodecID.AV_CODEC_ID_HEVC: {
                const extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
                hevc.parseAVCodecParameters(stream, extradata)
                if (naluUtil.isAnnexb(extradata)) {
                  stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
                }
                else {
                  stream.codecpar.bitFormat = h264.BitFormat.AVCC
                }
                break
              }
              case AVCodecID.AV_CODEC_ID_VVC: {
                const extradata = mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
                vvc.parseAVCodecParameters(stream, extradata)
                if (naluUtil.isAnnexb(extradata)) {
                  stream.codecpar.bitFormat = h264.BitFormat.ANNEXB
                }
                else {
                  stream.codecpar.bitFormat = h264.BitFormat.AVCC
                }
                break
              }
              case AVCodecID.AV_CODEC_ID_AV1:
                av1.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_VP8:
                vp8.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_VP9:
                vp9.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_AAC:
                aac.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_MP3:
                mp3.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_OPUS:
                opus.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                break
              case AVCodecID.AV_CODEC_ID_FLAC: {
                if (stream.codecpar.extradataSize > flac.FLAC_STREAMINFO_SIZE) {
                  const bufferReader = new BufferReader(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                  if (bufferReader.readString(4) === 'fLaC') {
                    while (bufferReader.remainingSize()) {
                      const blockHeader = bufferReader.readUint8()
                      const blockLen = bufferReader.readUint24()
                      const blockType = blockHeader & (~0x80)
                      if (blockType === flac.FlacMetadataType.FLAC_METADATA_TYPE_STREAMINFO) {
                        const extradata = bufferReader.readBuffer(blockLen)
                        avFree(stream.codecpar.extradata)
                        stream.codecpar.extradata = avMalloc(extradata.length)
                        stream.codecpar.extradataSize = extradata.length
                        memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
                        break
                      }
                      bufferReader.skip(blockType)
                    }
                  }
                }
                if (stream.codecpar.extradataSize === flac.FLAC_STREAMINFO_SIZE) {
                  flac.parseAVCodecParameters(stream, mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
                }
              }
            }
          }
          else {

            let extradata: Uint8Array

            switch (stream.codecpar.codecId) {
              case AVCodecID.AV_CODEC_ID_AAC:
                extradata = aac.avCodecParameters2Extradata(stream.codecpar)
                break
            }
            if (extradata) {
              stream.codecpar.extradataSize = extradata.length
              stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(stream.codecpar.extradataSize))
              memcpyFromUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize), extradata)
            }
          }
        }

        if (this.context.info) {
          stream.timeBase.num = 1
          if (this.context.info.timestampScale) {
            stream.timeBase.den = static_cast<int32>((AV_TIME_BASE * 1000) / this.context.info.timestampScale)
          }
          else {
            stream.timeBase.den = 1000
            this.context.info.timestampScale = AV_TIME_BASE
          }
          if (this.context.info.duration) {
            stream.duration = static_cast<int64>(this.context.info.duration)
          }
        }

        if (track.default == null || track.default) {
          stream.disposition |= AVDisposition.DEFAULT
        }

        if (track.encodings) {
          array.each(track.encodings.entry, (entry) => {
            if (entry.compression && isDef(entry.compression.algo)) {
              track.needDecompression = true
            }
            if (entry.encryption && isDef(entry.encryption.algo)) {
              track.needDecryption = true
            }
          })
        }
      })
    }

    if (this.context.attachments) {
      array.each(this.context.attachments.entry, (attachment) => {
        const stream = formatContext.createStream()
        stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_ATTACHMENT
        stream.privData = attachment
        if (attachment.data) {
          stream.codecpar.extradataSize = static_cast<int32>(attachment.data.size)
          stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(stream.codecpar.extradataSize))
          memcpyFromUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize), attachment.data.data)
        }
      })
    }

    if (this.context.tags) {
      array.each(this.context.tags.entry, (tag) => {
        if (tag.tag?.name === 'DURATION') {
          let time = tag.tag.string.replaceAll('\x00', '').split('.')
          let f = time[0].split(':')

          let duration = BigInt(+f[0]) * BigInt(1000000 * 60 * 60)
            + BigInt(+f[1]) * BigInt(1000000 * 60)
            + BigInt(+f[2]) * 1000000n
            + (BigInt(+time[1]) / 1000n)

          const stream = findStreamByTrackUid(formatContext.streams, tag.target.trackUid)

          if (stream) {
            stream.duration = avRescaleQ(duration, AV_TIME_BASE_Q, stream.timeBase)
          }
        }
      })
    }

    if (this.context.chapters) {
      array.each(this.context.chapters.entry, (chapter) => {
        const atom = chapter.atom
        if (atom) {
          array.each(atom, (item) => {
            formatContext.chapters.push({
              id: item.uid,
              start: item.start,
              end: item.end,
              timeBase: {
                num: 1,
                den: 1000000000
              },
              metadata: {
                title: item.display?.title || '',
                language: item.display?.language || ''
              }
            })
          })
        }
      })
    }
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    const magic = await readEbmlId(formatContext, this.context.header.maxIdLength)
    if (magic !== EBMLId.HEADER) {
      logger.error('not matroska format')
      return errorType.DATA_INVALID
    }

    const headerSize = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)
    this.context.header = object.extend(this.context.header, await parseEbmlSyntax(formatContext, headerSize, EbmlSyntaxHeader))

    const segmentId = await readEbmlId(formatContext, this.context.header.maxIdLength)
    if (segmentId !== EBMLId.SEGMENT) {
      logger.error('not matroska format')
      return errorType.DATA_INVALID
    }

    const segmentSize = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)

    this.context.segmentStart = formatContext.ioReader.getPos()
    const segmentEndPos = formatContext.ioReader.getPos() + segmentSize

    const readTopLevelEbml: Set<EBMLId> = new Set()

    let hasTracks = false
    let hasCluster = false

    while (formatContext.ioReader.getPos() < segmentEndPos || !hasTracks || !hasCluster) {
      const currentElementPos = formatContext.ioReader.getPos()
      const id = await readEbmlId(formatContext, this.context.header.maxIdLength)

      if (id === errorType.DATA_INVALID) {
        await this.syncTopLevelElement(formatContext, 2)
        continue
      }

      const length = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)

      if (length === static_cast<int64>(errorType.DATA_INVALID as int32)) {
        await this.syncTopLevelElement(formatContext, 2)
        continue
      }

      if (id === EBMLId.SEEK_HEAD) {
        this.context.isLive = false
        this.context.seekHead = await parseEbmlSyntax(formatContext, length, EbmlSyntaxHeadSeek)
      }
      else if (id === EBMLId.CUES) {
        this.context.isLive = false
        this.context.cues = await parseEbmlSyntax(formatContext, length, EbmlSyntaxCues)
      }
      else if (id === EBMLId.CHAPTERS) {
        this.context.isLive = false
        this.context.chapters = await parseEbmlSyntax(formatContext, length, EbmlSyntaxChapters)
      }
      else if (id === EBMLId.INFO) {
        this.context.info = await parseEbmlSyntax(formatContext, length, EbmlSyntaxInfo)
      }
      else if (id === EBMLId.TAGS) {
        this.context.tags = await parseEbmlSyntax(formatContext, length, EbmlSyntaxTags)
      }
      else if (id === EBMLId.ATTACHMENTS) {
        this.context.attachments = await parseEbmlSyntax(formatContext, length, EbmlSyntaxAttachments)
      }
      else if (id === EBMLId.TRACKS) {
        hasTracks = true
        this.context.tracks = await parseEbmlSyntax(formatContext, length, EbmlSyntaxTracks)
      }
      else if (id === EBMLId.CLUSTER) {
        hasCluster = true
        this.context.firstCluster = currentElementPos
        if (this.context.isLive || !this.context.seekHead || !(formatContext.ioReader.flags & IOFlags.SEEKABLE)) {
          break
        }
        const entry = this.context.seekHead.entry
        let i = 0
        for (; i < entry.length; i++) {
          if (!readTopLevelEbml.has(entry[i].id)) {
            await formatContext.ioReader.seek(entry[i].pos + this.context.segmentStart)
            break
          }
        }
        if (i === entry.length) {
          break
        }
      }
      else {
        await formatContext.ioReader.skip(static_cast<int32>(length))
      }
      readTopLevelEbml.add(id)
    }

    if (this.context.firstCluster > 0) {
      await formatContext.ioReader.seek(this.context.firstCluster)
    }

    this.analyzeStreams(formatContext)

    return 0
  }

  private parseAdditions(avpacket: pointer<AVPacket>, additions: Additions) {
    for (let i = 0; i < additions.entry.length; i++) {
      const addition = additions.entry[i]
      if (addition.additional?.size) {
        if (addition.additionalId === MATROSKABlockAddIdType.ITU_T_T35) {
          // TODO handle ITU_T_T35
          logger.warn('ITU_T_T35 not support now')
        }

        const data = avMalloc(addition.additional.data.length + 8)
        intwrite.wb64(data, static_cast<uint64>(addition.additionalId))
        memcpyFromUint8Array(data + 8, addition.additional.data.length, addition.additional.data)
        addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_MATROSKA_BLOCKADDITIONAL, data, addition.additional.data.length + 8)
      }
    }
  }

  private async parseBlock(formatContext: AVIFormatContext, packet: pointer<AVPacket>) {

    const buffer = this.context.currentCluster.block?.data || this.context.currentCluster.blockGroup.block.data
    let basePos = this.context.currentCluster.block?.pos
    if (basePos < 0) {
      basePos = this.context.currentCluster.blockGroup.block.pos
    }

    let isKey = -1
    let additions: Additions
    let duration = 0n

    if (this.context.currentCluster.blockGroup?.block) {
      additions = this.context.currentCluster.blockGroup.additions
      if (this.context.currentCluster.blockGroup.reference) {
        isKey = this.context.currentCluster.blockGroup.reference.length === 0 ? 1 : 0
      }
      else {
        isKey = 1
      }
      if (this.context.currentCluster.blockGroup.duration) {
        duration = this.context.currentCluster.blockGroup.duration
      }
    }

    if (!this.blockReader) {
      this.blockReader = new BufferReader(buffer)
    }
    else {
      this.blockReader.resetBuffer(buffer)
    }

    const now = this.blockReader.getPos()

    const trackNumber = static_cast<uint32>(await readVInt64(this.blockReader, 8))

    const stream = findStreamByTrackNumber(formatContext.streams, trackNumber)

    if (!stream) {
      logger.error(`invalid track number ${trackNumber}`)
      return errorType.EAGAIN
    }

    const timestamp = this.blockReader.readInt16()
    const flags = this.blockReader.readUint8()
    if (isKey === -1) {
      isKey = (flags & 0x80) ? 1 : 0
    }

    const lacing = (flags >>> 1) & 0x03

    let frameCount = 0
    let frameSize: number[] = []

    switch (lacing) {
      case MATROSKALacingMode.XIPH: {
        frameCount = this.blockReader.readUint8() + 1
        let sum = 0
        for (let i = 0; i < frameCount - 1; i++) {
          let size = 0
          while (true) {
            const next = this.blockReader.readUint8()
            if (next === 0) {
              break
            }
            if (next !== 0xff) {
              size += next
              break
            }
            size += 0xff
          }
          sum += size
          frameSize.push(size)
        }
        // the last frame
        frameSize.push(buffer.length - static_cast<int32>(this.blockReader.getPos() - now) - sum)
        break
      }
      case MATROSKALacingMode.EBML: {
        frameCount = this.blockReader.readUint8() + 1
        frameSize.push(await readVInt(this.blockReader, 4))
        let sum = frameSize[0]
        for (let i = 1; i < frameCount - 1; i++) {
          const next = await readVSint(this.blockReader, 4)
          let size = next + frameSize[i - 1]
          sum += size
          frameSize.push(size)
        }
        // the last frame
        frameSize.push(buffer.length - static_cast<int32>(this.blockReader.getPos() - now) - sum)

        break
      }

      case MATROSKALacingMode.FIXED_SIZE:
        frameCount = this.blockReader.readUint8() + 1
        const size = (buffer.length - static_cast<int32>(this.blockReader.getPos() - now)) / frameCount

        assert(size === (size >>> 0))

        for (let i = 0; i < frameCount; i++) {
          frameSize.push(size)
        }
        break
      case MATROSKALacingMode.NO_LACING:
        frameCount = 1
        frameSize.push(buffer.length - static_cast<int32>(this.blockReader.getPos() - now))
        break
    }

    const track = stream.privData as TrackEntry
    const trackTimestampScale = track.timeScale || 1

    if (track.needDecryption) {
      throw new Error('not support encryption stream')
    }

    // 纳秒时间戳
    let pts = (this.context.currentCluster.timeCode + static_cast<int64>((timestamp * trackTimestampScale) as float))
      * static_cast<int64>(this.context.info.timestampScale)
    if (track.codecDelay) {
      pts -= track.codecDelay
    }
    // 微秒时间戳
    pts /= 1000n
    pts = avRescaleQ(pts, AV_TIME_BASE_Q, stream.timeBase)

    duration = static_cast<int64>((static_cast<int32>(duration) * trackTimestampScale) as float) * static_cast<int64>(this.context.info.timestampScale)
    duration /= 1000n
    duration = avRescaleQ(duration, AV_TIME_BASE_Q, stream.timeBase)

    for (let i = 0; i < frameCount; i++) {
      const avpacket = i !== 0 ? createAVPacket() : packet

      let size = frameSize[i]
      let offset = 0
      let header: Uint8Array

      if (track.needDecompression) {
        const compression = track.encodings.entry.find((entry) => {
          return !!entry.compression
        })
        switch (compression.compression.algo) {
          case MATROSKATrackEncodingComp.HEADER_STRIP:
            header = compression.compression.settings.data
            size += header.length
            offset = header.length
            break
          default:
            logger.fatal(`not support compression stream, algo: ${compression.compression.algo}`)
        }

      }

      avpacket.pos = basePos + this.blockReader.getPos()
      avpacket.streamIndex = stream.index
      avpacket.timeBase = stream.timeBase
      avpacket.pts = pts
      avpacket.size = size
      avpacket.duration = duration
      const data: pointer<uint8> = avMalloc(size)
      if (header) {
        memcpyFromUint8Array(data, offset, header)
      }
      memcpyFromUint8Array(data + offset, frameSize[i], this.blockReader.readBuffer(frameSize[i]))

      addAVPacketData(avpacket, data, size)

      if (stream.codecpar.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        avpacket.dts = pts
      }
      else {
        if (isKey) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
        }
        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
        ) {
          avpacket.bitFormat = stream.codecpar.bitFormat
        }
      }

      if (additions) {
        this.parseAdditions(avpacket, additions)
      }

      if (i !== 0) {
        formatContext.interval.packetBuffer.push(avpacket)
      }

      if (this.context.maxPts < pts) {
        this.context.maxPts = pts
      }
    }

    this.context.currentCluster.block = {
      pos: -1n,
      size: -1n
    }
    this.context.currentCluster.blockGroup = {
      block: null
    }

    return 0
  }

  private addClusterIndex(clusterIndex: ClusterIndex) {

    if (this.context.clusterIndexesPosMap.has(clusterIndex.pos)) {
      return
    }

    const index = array.binarySearch(this.context.clusterIndexes, (sample) => {
      if (sample.time < clusterIndex.time) {
        return 1
      }
      else {
        return -1
      }
    })
    if (index > -1) {
      this.context.clusterIndexesPosMap.set(clusterIndex.pos, index)
      this.context.clusterIndexes.splice(index, 0, clusterIndex)
    }
    else {
      this.context.clusterIndexesPosMap.set(clusterIndex.pos, this.context.clusterIndexes.length)
      this.context.clusterIndexes.push(clusterIndex)
    }
  }

  private async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    const now = formatContext.ioReader.getPos()
    const id = await readEbmlId(formatContext, this.context.header.maxIdLength)

    if (id === errorType.DATA_INVALID) {
      await this.syncTopLevelElement(formatContext)
      return this.readAVPacket_(formatContext, avpacket)
    }

    const length = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)

    if (length === static_cast<int64>(errorType.DATA_INVALID)) {
      await this.syncTopLevelElement(formatContext)
      return this.readAVPacket_(formatContext, avpacket)
    }

    if (id === EBMLId.CLUSTER) {
      this.context.currentCluster.pos = now
      this.context.currentCluster.timeCode = 0n
      await parseEbmlSyntax(
        formatContext,
        length,
        EbmlSyntaxCluster,
        this.context.currentCluster,
        [EBMLId.SIMPLE_BLOCK, EBMLId.BLOCK_GROUP]
      )
      if (!this.context.isLive) {
        this.addClusterIndex({
          time: this.context.currentCluster.timeCode,
          pos: now
        })
      }
      let ret = await this.parseBlock(formatContext, avpacket)
      if (ret === errorType.EAGAIN) {
        return this.readAVPacket_(formatContext, avpacket)
      }
      else if (ret < 0) {
        return ret
      }
    }
    else if (id === EBMLId.SIMPLE_BLOCK) {
      this.context.currentCluster.block = {
        pos: formatContext.ioReader.getPos(),
        size: length,
        data: await formatContext.ioReader.readBuffer(static_cast<int32>(length))
      }
      let ret = await this.parseBlock(formatContext, avpacket)
      if (ret === errorType.EAGAIN) {
        return this.readAVPacket_(formatContext, avpacket)
      }
      else if (ret < 0) {
        return ret
      }
    }
    else if (id === EBMLId.BLOCK_GROUP) {
      await parseEbmlSyntax(
        formatContext,
        length,
        EbmlSyntaxBlockGroup,
        this.context.currentCluster.blockGroup
      )
      let ret = await this.parseBlock(formatContext, avpacket)
      if (ret === errorType.EAGAIN) {
        return this.readAVPacket_(formatContext, avpacket)
      }
      else if (ret < 0) {
        return ret
      }
    }
    else if (id === EBMLId.CUES
      || id === EBMLId.TAGS
      || id === EBMLId.ATTACHMENTS
      || id === EBMLId.CHAPTERS
      || id === EBMLId.INFO
      || id === EBMLId.TRACKS
      || id === EBMLId.SEEK_HEAD
    ) {
      await formatContext.ioReader.skip(static_cast<int32>(length))
      return this.readAVPacket_(formatContext, avpacket)
    }
    else {
      await this.syncTopLevelElement(formatContext)
      return this.readAVPacket_(formatContext, avpacket)
    }
    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  private async syncTopLevelElement(formatContext: AVIFormatContext, analyzeCount: int32 = 3) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    while (true) {
      try {

        if (formatContext.ioReader.flags & IOFlags.ABORT) {
          break
        }

        const now = formatContext.ioReader.getPos()

        const id = await formatContext.ioReader.peekUint32()

        if (id === EBMLId.CLUSTER
          || id === EBMLId.CUES
          || id === EBMLId.TAGS
          || id === EBMLId.ATTACHMENTS
          || id === EBMLId.CHAPTERS
          || id === EBMLId.INFO
          || id === EBMLId.TRACKS
          || id === EBMLId.SEEK_HEAD
        ) {
          pos = now
          let count = 0

          await formatContext.ioReader.skip(4)

          const length = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)

          if (length === static_cast<int64>(errorType.DATA_INVALID)) {
            await formatContext.ioReader.seek(now + 1n)
            continue
          }

          await formatContext.ioReader.skip(static_cast<int32>(length))
          while (count <= analyzeCount) {
            const id = await readEbmlId(formatContext, this.context.header.maxIdLength)
            const length = await readVInt64(formatContext.ioReader, this.context.header.maxSizeLength)
            if (id === EBMLId.CLUSTER
              || id === EBMLId.CUES
              || id === EBMLId.TAGS
              || id === EBMLId.ATTACHMENTS
              || id === EBMLId.CHAPTERS
              || id === EBMLId.INFO
              || id === EBMLId.TRACKS
              || id === EBMLId.SEEK_HEAD
            ) {
              count++
              await formatContext.ioReader.skip(static_cast<int32>(length))
            }
            else {
              break
            }
          }
          if (count < analyzeCount) {
            await formatContext.ioReader.seek(pos + 1n)
            pos = NOPTS_VALUE_BIGINT
          }
          else {
            break
          }
        }
        else {
          await formatContext.ioReader.skip(1)
          pos = NOPTS_VALUE_BIGINT
        }
      }
      catch (error) {
        break
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {

    const now = formatContext.ioReader.getPos()
    const pts = avRescaleQ(timestamp, stream.timeBase, AV_TIME_BASE_Q)

    let pos: int64 = NOPTS_VALUE_BIGINT

    if (this.context.cues?.entry.length) {
      const track = stream.privData as TrackEntry
      for (let i = 0; i < this.context.cues.entry.length; i++) {
        const cue =  this.context.cues.entry[i]
        const time = (cue.time || 0n) * static_cast<int64>(this.context.info.timestampScale) / 1000n
        if (time > pts) {
          const poses = this.context.cues.entry[Math.max(i - 1, 0)].pos
          if (poses.length) {
            const matchPos = poses.find((p) => p.track === track.number)
            if (matchPos) {
              pos = matchPos.pos + this.context.segmentStart
              break
            }
          }
        }
      }
    }

    if (pos === NOPTS_VALUE_BIGINT && this.context.clusterIndexes.length) {
      for (let i = 0; i < this.context.clusterIndexes.length; i++) {
        const time = this.context.clusterIndexes[i].time * static_cast<int64>(this.context.info.timestampScale) / 1000n
        if (time > pts) {
          pos = this.context.clusterIndexes[Math.max(i - 1, 0)].pos
          break
        }
      }
      if (pos === NOPTS_VALUE_BIGINT) {
        pos = this.context.clusterIndexes[this.context.clusterIndexes.length - 1].pos
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
      return now
    }

    return static_cast<int64>(errorType.FORMAT_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    // mkv 在 readheader 时分析了 track element，不需要在进行流分析
    return 0
  }
}
