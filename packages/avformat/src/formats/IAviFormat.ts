/*
 * libmedia avi decoder
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

import type { AVIFormatContext } from '../AVFormatContext'
import IFormat from './IFormat'
import { readInfo, readBmpHeader, readWavHeader } from './riff/iriff'
import mktagle from '../function/mktagle'
import type { AVIMainHeader, AVISample, AVIStreamContext } from './avi/type'
import { AVFIndexFlags, AVIFlags } from './avi/type'
import { codecBmpTags } from './riff/riff'
import Mp3FrameReader, { type AviMp3Frame } from './avi/Mp3FrameReader'

import {
  memcpyFromUint8Array,
  mapSafeUint8Array,
  mapUint8Array,
  readCString
} from '@libmedia/cheap'

import {
  AVFormat,
  AVSeekFlags,
  IOFlags,
  AVMediaType,
  AVCodecID,
  type AVPacket,
  type AVStream,
  avMalloc,
  avFree,
  addAVPacketData,
  getAVPacketData,
  unrefAVPacket,
  addAVPacketSideData,
  AVPacketFlags,
  NOPTS_VALUE,
  NOPTS_VALUE_BIGINT,
  AVPacketSideDataType,
  avRescaleQ,
  errorType,
  avReduce,
  intread,
  AVCodecParameterFlags,
  nalu as naluUtil
} from '@libmedia/avutil'

import {
  INT32_MAX,
  INT64_MAX,
  AV_TIME_BASE_Q,
  AVPALETTE_SIZE,
  allocAVPacketData,
  h264,
  hevc,
  vvc,
  aac,
  av1,
  vp9,
  vp8,
  flac,
  opus
} from '@libmedia/avutil/internal'

import {
  array,
  object,
  bigint,
  concatTypeArray,
  logger,
  is,
  text
} from '@libmedia/common'

import {
  IOError
} from '@libmedia/common/io'

const AVI_HEADER = [
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', ' '],
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', 'X'],
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', 0x19],
  ['O', 'N', '2', ' ', 'O', 'N', '2', 'f'],
  ['R', 'I', 'F', 'F', 'A', 'M', 'V', ' ']
]

const IDX1_ENTRY_SIZE = 16
const IDX1_ENTRIES_PER_BLOCK = 4096
const IDX1_PREFIX_SIZE = IDX1_ENTRIES_PER_BLOCK * IDX1_ENTRY_SIZE
const IDX1_RANGE_SIZE = 1024 * 1024
const IDX1_SEEK_RANGE_MARGIN = 4096
const IDX1_SEEK_LOOKAHEAD = 1000000n
const MAX_IDX1_PREFETCH_SIZE = 64 * 1024 * 1024

const enum Idx1ChunkType {
  // db
  VIDEO_UNCOMPRESSED = 0x6264,
  // dc
  VIDEO_COMPRESSED = 0x6364,
  // pc
  PALETTE_CHANGE = 0x6370,
  // wb
  AUDIO = 0x6277
}

interface Idx1State {
  samples: AVISample[][]
  nextDts: int64[]
  firstPacketPos: int64
  dataOffset: int64
  lastPos: int64
  lastSamplePos: int64
  anyKey: boolean
  nonInterleaved: boolean
}

interface DeferredIdx1 {
  index: Idx1State
  rangeStart: int64
  rangeEnd: int64
  validatedEnd?: int64
  playbackEnd: int64
  prefixEndDts: int64[]
  seekTarget?: int64
  prefetch?: Promise<boolean>
  cancelPrefetch?: () => void
  failed?: boolean
}

interface AVIContext {
  riffEndPos: int64
  ioFileSize: int64
  fileSize: int64
  moviList: int64
  moviEnd: int64
  isOdml: boolean
  header: AVIMainHeader
  dvDemux: any
  lastPktPos: int64

  currentIndex: number
  remaining: number
  packetSize: number

  odmlRead: int64
  odmlMaxPos: int64
  nonInterleaved: boolean
  hasVideoKey: boolean
  indexLoaded: boolean
}

export interface IAviFormatOptions {
  useOdml?: boolean
}

const DefaultIAviFormatOptions: IAviFormatOptions = {
  useOdml: true
}
export default class IAviFormat extends IFormat {

  public type: AVFormat = AVFormat.AVI

  private context: AVIContext

  private options: IAviFormatOptions

  private mp3Readers = new Map<AVStream, Mp3FrameReader>()
  private pendingMp3Stream: AVStream
  private mp3Eof = false
  private deferredIdx1: DeferredIdx1

  constructor(options: IAviFormatOptions = {}) {
    super()
    this.options = object.extend(DefaultIAviFormatOptions, options)
  }

  public init(formatContext: AVIFormatContext): void {
    formatContext.ioReader.setEndian(false)
    this.context = {
      riffEndPos: NOPTS_VALUE_BIGINT,
      fileSize: NOPTS_VALUE_BIGINT,
      moviList: NOPTS_VALUE_BIGINT,
      moviEnd: NOPTS_VALUE_BIGINT,
      isOdml: false,
      header: {} as AVIMainHeader,
      dvDemux: false,
      lastPktPos: 0n,
      ioFileSize: 0n,

      currentIndex: -1,
      packetSize: 0,
      remaining: 0,

      odmlRead: 0n,
      odmlMaxPos: 0n,
      nonInterleaved: false,
      hasVideoKey: false,
      indexLoaded: false
    }
    formatContext.privateData = this.context
  }

  private getStreamIndex(s: string) {
    if (s[0] >= '0' && s[0] <= '9'
      && s[1] >= '0' && s[0] <= '9'
    ) {
      return +s[0] * 10 + (+s[1])
    }
    return 100
  }

  private getDuration(context: AVIStreamContext, len: int32) {
    if (context.dwSampleSize) {
      return static_cast<int64>(len)
    }
    else if (context.dshowBlockAlign) {
      return static_cast<int64>(Math.floor((len + context.dshowBlockAlign - 1) / context.dshowBlockAlign) as int32)
    }
    return 1n
  }

  public async readHeader(formatContext: AVIFormatContext): Promise<number> {
    let header = await formatContext.ioReader.readBuffer(4)
    this.context.riffEndPos = static_cast<int64>((await formatContext.ioReader.readUint32()) as uint32)
    this.context.riffEndPos += formatContext.ioReader.getPos()
    header = concatTypeArray(Uint8Array, [header, await formatContext.ioReader.readBuffer(4)])

    let signature: (string | number)[]

    for (let i = 0; i < AVI_HEADER.length; i++) {
      const s = AVI_HEADER[i]
      let j = 0
      for (; j < s.length; j++) {
        let code = s[j]
        if (is.string(code)) {
          code = code.charCodeAt(0)
        }
        if (code !== header[j]) {
          break
        }
      }
      if (j === s.length) {
        signature = s
        break
      }
    }

    if (!signature) {
      logger.error('the file format is not avi')
      return errorType.DATA_INVALID
    }
    if (signature[7] === 0x19) {
      logger.warn('This file has been generated by a totally broken muxer.')
    }

    this.context.ioFileSize = this.context.fileSize = await formatContext.ioReader.fileSize()
    if (this.context.fileSize <= 0 || this.context.fileSize < this.context.riffEndPos) {
      this.context.fileSize = this.context.riffEndPos === 8n ? INT64_MAX : this.context.riffEndPos
    }

    let moviGot = false
    let listEnd = 0n
    let subTag = ''
    let amvFileFormat = false

    try {
      while (formatContext.ioReader.getPos() < this.context.fileSize && !moviGot) {
        const tag = await formatContext.ioReader.readString(4)
        let size = await formatContext.ioReader.readUint32()

        switch (tag) {
          case 'LIST': {
            listEnd = formatContext.ioReader.getPos() + static_cast<int64>(size as uint32)
            subTag = await formatContext.ioReader.readString(4)
            if (subTag === 'movi') {
              this.context.moviList = formatContext.ioReader.getPos() - 4n
              if (size) {
                this.context.moviEnd = this.context.moviList + static_cast<int64>(size as uint32) + (static_cast<int64>(size as uint32) & 1n)
              }
              else {
                this.context.moviEnd = this.context.fileSize
              }
              moviGot = true
            }
            else if (subTag === 'INFO') {
              await readInfo(formatContext.ioReader, static_cast<int64>(size as uint32), formatContext.metadata)
            }
            else if (subTag === 'ncdt') {
              logger.warn('ignore tag ncdt')
            }
            break
          }
          case 'IDIT': {
            size += size & 1
            const len = Math.min(size, 63)
            formatContext.metadata['creation_time'] = await formatContext.ioReader.readString(len)
            if (len < size) {
              await formatContext.ioReader.skip(size - len)
            }
            break
          }
          case 'dmlh': {
            this.context.isOdml = true
            await formatContext.ioReader.skip(size + (size & 1))
            break
          }
          case 'amvh':
            amvFileFormat = true
          case 'avih': {
            this.context.header.dwMicroSecPerFrame = await formatContext.ioReader.readUint32()
            this.context.header.dwMaxBytesPerSec = await formatContext.ioReader.readUint32()
            this.context.header.dwPaddingGranularity = await formatContext.ioReader.readUint32()
            this.context.header.dwFlages = await formatContext.ioReader.readUint32()
            this.context.header.dwTotalFrame = await formatContext.ioReader.readUint32()
            this.context.header.dwInitialFrames = await formatContext.ioReader.readUint32()
            this.context.header.dwStreams = await formatContext.ioReader.readUint32()
            this.context.header.dwSuggestedBufferSize = await formatContext.ioReader.readUint32()

            this.context.header.dwWidth = await formatContext.ioReader.readUint32()
            this.context.header.dwHeight = await formatContext.ioReader.readUint32()

            if (this.context.header.dwFlages & AVIFlags.AVIF_MUSTUSEINDEX) {
              this.context.nonInterleaved = true
            }

            await formatContext.ioReader.skip(size - 40)
            break
          }
          case 'strh': {
            const streamContext: AVIStreamContext = {
              sampleEnd: false,
              currentSample: 0
            } as AVIStreamContext
            streamContext.fccType = await formatContext.ioReader.readString(4)
            streamContext.fccHandler = await formatContext.ioReader.readString(4)

            if (streamContext.fccType === 'pads') {
              await formatContext.ioReader.skip(size - 8)
              break
            }
            const stream = formatContext.createStream()
            stream.privData = streamContext
            if (amvFileFormat) {
              streamContext.fccType = stream.index ? 'auds' : 'vids'
            }

            if (streamContext.fccType === 'iavs' || streamContext.fccType === 'ivas') {
              logger.error('dv format in avi not support now')
              return errorType.FORMAT_NOT_SUPPORT
            }

            streamContext.dwFlags = await formatContext.ioReader.readUint32()
            streamContext.wPriority = await formatContext.ioReader.readUint16()
            streamContext.wLanguage = await formatContext.ioReader.readUint16()
            streamContext.dwInitalFrames = await formatContext.ioReader.readUint32()

            streamContext.dwScale = await formatContext.ioReader.readUint32()
            streamContext.dwRate = await formatContext.ioReader.readUint32()

            if (!(streamContext.dwScale && streamContext.dwRate)) {
              if (this.context.header.dwMicroSecPerFrame) {
                streamContext.dwRate = 1000000
                streamContext.dwScale = this.context.header.dwMicroSecPerFrame
              }
              else {
                streamContext.dwRate = 25
                streamContext.dwScale = 1
              }
            }
            stream.timeBase.num = streamContext.dwScale
            stream.timeBase.den = streamContext.dwRate
            avReduce(stream.timeBase)

            streamContext.dwStart = await formatContext.ioReader.readUint32()
            streamContext.dwLength = await formatContext.ioReader.readUint32()
            streamContext.dwSuggestedBufferSize = await formatContext.ioReader.readUint32()
            streamContext.dwQuality = await formatContext.ioReader.readUint32()
            streamContext.dwSampleSize = await formatContext.ioReader.readUint32()

            stream.startTime = 0n
            stream.duration = static_cast<int64>(streamContext.dwLength as uint32)
            if (streamContext.dwStart > 3600 * streamContext.dwRate / streamContext.dwScale) {
              logger.warn('crazy start time, iam scared, giving up')
              streamContext.dwStart = 0
            }
            if (streamContext.dwSampleSize < 0) {
              logger.error(`Invalid sample_size ${streamContext.dwSampleSize} at stream ${stream.index} setting it to 0`)
              streamContext.dwSampleSize = 0
            }
            streamContext.dwStart *= Math.max(1, streamContext.dwSampleSize)

            switch (streamContext.fccType) {
              case 'vids': {
                stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO
                streamContext.dwSampleSize = 0
                break
              }
              case 'auds': {
                stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO
                break
              }
              case 'txts': {
                stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
                break
              }
              case 'dats': {
                stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA
                break
              }
              default:
                logger.warn(`unknown stream type ${streamContext.fccType}`)
                break
            }
            streamContext.currentDts = static_cast<int64>(streamContext.dwStart as int32)
            await formatContext.ioReader.skip(size - 12 * 4)
            break
          }
          case 'strf': {
            const stream = formatContext.streams[formatContext.streams.length - 1]
            if (!stream || this.context.dvDemux) {
              await formatContext.ioReader.skip(size)
              break
            }
            const streamContext = stream.privData as AVIStreamContext
            if (!size && (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
              || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
            ) {
              break
            }
            if (formatContext.ioReader.getPos() < listEnd) {
              size = Math.min(size, static_cast<int32>(listEnd - formatContext.ioReader.getPos()))
            }
            switch (stream.codecpar.codecType) {
              case AVMediaType.AVMEDIA_TYPE_VIDEO: {
                if (amvFileFormat) {
                  stream.codecpar.width = this.context.header.dwWidth || 0
                  stream.codecpar.height = this.context.header.dwHeight || 0
                  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_AMV
                  await formatContext.ioReader.skip(size)
                  break
                }
                const esize = await readBmpHeader(formatContext.ioReader, stream)

                if (stream.codecpar.codecTag === mktagle('DXSB')
                  || stream.codecpar.codecTag === mktagle('DXSA')
                ) {
                  stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_SUBTITLE
                  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_XSUB
                  break
                }
                if (size > 10 * 4 && size < (1 << 30) && size < this.context.fileSize) {
                  if (esize === size - 1 && (esize & 1)) {
                    stream.codecpar.extradataSize = esize - 10 * 4
                  }
                  else {
                    stream.codecpar.extradataSize = size - 10 * 4
                  }
                  stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(stream.codecpar.extradataSize))
                  await formatContext.ioReader.readBuffer(
                    stream.codecpar.extradataSize,
                    mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize))
                  )
                }

                if (stream.codecpar.extradataSize & 1) {
                  await formatContext.ioReader.skip(1)
                }
                if (stream.codecpar.extradataSize && stream.codecpar.bitsPerCodedSample <= 8) {
                  let palSize = (1 << stream.codecpar.bitsPerCodedSample) << 2
                  let palSrc: pointer<uint8>
                  palSize = Math.min(palSize, stream.codecpar.extradataSize)
                  palSrc = reinterpret_cast<pointer<uint8>>(stream.codecpar.extradata + reinterpret_cast<size>(stream.codecpar.extradataSize - palSize))
                  if (static_cast<uint32>((palSrc - stream.codecpar.extradata) as size) >= 9
                    && readCString(
                      reinterpret_cast<pointer<char>>(stream.codecpar.extradata + reinterpret_cast<size>(stream.codecpar.extradataSize - 9)),
                      8
                    ) === 'BottomUp'
                  ) {
                    palSrc = reinterpret_cast<pointer<uint8>>(palSrc - reinterpret_cast<size>(9))
                  }
                  streamContext.pal = new Uint32Array(256)
                  for (let i = 0; i < palSize / 4; i++) {
                    streamContext.pal[i] = 0xFF << 24 | intread.rl32(palSrc + reinterpret_cast<size>(4 * i))
                  }
                  streamContext.hasPal = true
                }
                stream.codecpar.codecId = codecBmpTags[stream.codecpar.codecTag]
                break
              }
              case AVMediaType.AVMEDIA_TYPE_AUDIO: {
                let ret = await readWavHeader(formatContext.ioReader, stream, size)
                if (ret < 0) {
                  return ret
                }
                streamContext.dshowBlockAlign = stream.codecpar.blockAlign
                if (streamContext.dwSampleSize && stream.codecpar.blockAlign && streamContext.dwSampleSize !== stream.codecpar.blockAlign) {
                  logger.warn(`sample size (${streamContext.dwSampleSize}) != block align (${stream.codecpar.blockAlign})`)
                  streamContext.dwSampleSize = stream.codecpar.blockAlign
                }
                if (size & 1) {
                  await formatContext.ioReader.skip(1)
                }
                if (streamContext.fccHandler === 'Axan') {
                  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_XAN_DPCM
                  stream.codecpar.codecTag = 0
                  streamContext.dshowBlockAlign = 0
                }
                if (amvFileFormat) {
                  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_ADPCM_IMA_AMV
                  streamContext.dshowBlockAlign = 0
                }
                if ((stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_AAC
                  || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_FTR
                  || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_FLAC
                  || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_MP2 )
                  && streamContext.dshowBlockAlign <= 4 && streamContext.dshowBlockAlign
                ) {
                  logger.debug(`overriding invalid dshow_block_align of ${streamContext.dshowBlockAlign}`)
                  streamContext.dshowBlockAlign = 0
                }
                if (stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_AAC && streamContext.dshowBlockAlign == 1024 && streamContext.dwSampleSize == 1024
                  || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_AAC && streamContext.dshowBlockAlign == 4096 && streamContext.dwSampleSize == 4096
                  || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_MP3 && streamContext.dshowBlockAlign == 1152 && streamContext.dwSampleSize == 1152
                ) {
                  logger.debug('overriding sample_size')
                  streamContext.dwSampleSize = 0
                }
                break
              }
              case AVMediaType.AVMEDIA_TYPE_SUBTITLE: {
                await formatContext.ioReader.skip(size)
                break
              }
              default: {
                stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_DATA
                stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_NONE
                stream.codecpar.codecTag = 0
                await formatContext.ioReader.skip(size)
                break
              }
            }
            break
          }
          case 'strd': {
            const stream = formatContext.streams[formatContext.streams.length - 1]
            if (!stream || stream.codecpar.extradataSize || stream.codecpar.codecTag === mktagle('H264')) {
              await formatContext.ioReader.skip(size)
              break
            }
            if (formatContext.ioReader.getPos() < listEnd) {
              size = Math.min(size, static_cast<double>(listEnd - formatContext.ioReader.getPos()))
            }
            if (stream.codecpar.extradata) {
              avFree(stream.codecpar.extradata)
            }
            stream.codecpar.extradataSize = size
            stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(size as uint32))
            await formatContext.ioReader.readBuffer(size, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(size as uint32)))
            if (stream.codecpar.extradataSize & 1) {
              await formatContext.ioReader.skip(1)
            }
            break
          }
          case 'indx': {
            const pos = formatContext.ioReader.getPos()
            if (formatContext.ioReader.flags & IOFlags.SEEKABLE && this.options.useOdml) {
              const currentDts: Record<int32, int64> = {}
              formatContext.streams.forEach((stream) => {
                const streamContext = stream.privData as AVIStreamContext
                currentDts[stream.index] = streamContext.currentDts
              })
              const ret = await this.readOdmlIndex(formatContext)
              if (ret < 0) {
                return ret
              }
              formatContext.streams.forEach((stream) => {
                const streamContext = stream.privData as AVIStreamContext
                streamContext.currentDts = currentDts[stream.index]
              })
            }
            await formatContext.ioReader.seek(pos + static_cast<int64>(size as uint32))
            break
          }
          default: {
            if (size > 1000000) {
              this.context.moviList = formatContext.ioReader.getPos() - 4n
              this.context.moviEnd = this.context.fileSize
              moviGot = true
              break
            }
          }
          case 'idx1': {
            size += (size & 1)
            await formatContext.ioReader.seek(formatContext.ioReader.getPos() + static_cast<int64>(size as uint32))
            break
          }
        }
      }

      formatContext.streams.forEach((stream) => {
        if (stream.codecpar.extradataSize) {
          stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = mapUint8Array(
            stream.codecpar.extradata,
            reinterpret_cast<size>(stream.codecpar.extradataSize)
          ).slice()

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
            h264.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
            hevc.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
            vvc.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
            av1.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
            vp9.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP8) {
            vp8.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
            aac.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC) {
            flac.parseAVCodecParameters(stream)
          }
          else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
            opus.parseAVCodecParameters(stream)
          }

          if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
            || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          ) {
            if (naluUtil.isAnnexb(stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA])) {
              stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB
            }
          }
        }
        else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC) {
          const extradata = aac.avCodecParameters2Extradata(stream.codecpar)
          const data: pointer<uint8> = avMalloc(reinterpret_cast<size>(extradata.length))
          memcpyFromUint8Array(data, extradata.length, extradata)
          stream.codecpar.extradata = data
          stream.codecpar.extradataSize = extradata.length
          if (stream.codecpar.profile === NOPTS_VALUE) {
            stream.codecpar.profile = aac.MPEG4AudioObjectTypes.AAC_LC
          }
        }

        if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG2VIDEO
          || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG4
        ) {
          stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS
        }
      })

      await formatContext.ioReader.seek(this.context.moviList)

      if (!this.context.indexLoaded
        && !(signature === AVI_HEADER[0] && await this.deferIdx1(formatContext))
      ) {
        await this.loadIndex(formatContext)
      }

      if (this.context.dvDemux) {
        this.context.nonInterleaved = false
      }
      else if (!formatContext.streams.some((stream) => {
        const context = stream.privData as AVIStreamContext
        return !!context.samples?.length
      })) {
        this.context.nonInterleaved = false
      }

      formatContext.streams.forEach((stream) => {
        const streamContext = stream.privData as AVIStreamContext
        if (this.deferredIdx1 && stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
          stream.nbFrames = static_cast<int64>(streamContext.dwLength as uint32)
        }
        else if (streamContext.samples?.length && !this.deferredIdx1) {
          stream.nbFrames = static_cast<int64>(streamContext.samples.length as uint32)
        }
      })

    }
    catch (error) {
      return errorType.DATA_INVALID
    }

    return 0
  }

  private async readOdmlIndex(formatContext: AVIFormatContext): Promise<int32> {
    const longsPerEntry = await formatContext.ioReader.readUint16()
    const indexSubType = await formatContext.ioReader.readUint8()
    const indexType = await formatContext.ioReader.readUint8()
    const entriesInUse = await formatContext.ioReader.readInt32()
    const chunkId = await formatContext.ioReader.readString(4)
    let base = await formatContext.ioReader.readUint64()

    const index = this.getStreamIndex(chunkId)

    if (index >= formatContext.streams.length) {
      return errorType.DATA_INVALID
    }

    let lastPos = -1n
    let fileSize = this.context.fileSize

    const stream = formatContext.streams[index]
    const streamContext = stream.privData as AVIStreamContext

    if (!streamContext.samples) {
      streamContext.samples = []
    }

    if (indexSubType || entriesInUse < 0) {
      return errorType.DATA_INVALID
    }
    await formatContext.ioReader.skip(4)
    if (indexType && longsPerEntry !== 2) {
      return errorType.DATA_INVALID
    }
    if (indexType > 1) {
      return errorType.DATA_INVALID
    }
    if (fileSize > 0 && base >= fileSize) {
      if (base >> 32n == (base & 0xFFFFFFFFn)
        && (base & 0xFFFFFFFFn) < fileSize
        && fileSize <= 0xFFFFFFFF
      ) {
        base &= 0xFFFFFFFFn
      }
      else {
        return errorType.DATA_INVALID
      }
    }
    for (let i = 0; i < entriesInUse; i++) {
      this.context.odmlMaxPos = bigint.max(this.context.odmlMaxPos, formatContext.ioReader.getPos())
      // If we read more than there are bytes then we must have been reading something twice
      if (this.context.odmlRead > this.context.odmlMaxPos) {
        return errorType.DATA_INVALID
      }
      if (indexType) {
        const pos = static_cast<int64>((await formatContext.ioReader.readUint32()) as uint32) + base - 8n
        let len = await formatContext.ioReader.readInt32()
        const key = len >= 0
        len &= 0x7FFFFFFF
        this.context.odmlRead += 8n

        if (lastPos == pos || pos == base - 8n) {
          this.context.nonInterleaved = true
        }
        if (lastPos != pos && len) {
          streamContext.samples.push({
            pos,
            size: len,
            key,
            dts: streamContext.currentDts
          })
        }
        streamContext.currentDts += this.getDuration(streamContext, len)
        lastPos = pos
      }
      else {
        this.context.odmlRead += 16n
        let offset = await formatContext.ioReader.readUint64()
        await formatContext.ioReader.skip(8)
        let pos = formatContext.ioReader.getPos()
        await formatContext.ioReader.seek(offset + 8n)
        let ret = await this.readOdmlIndex(formatContext)
        if (ret < 0) {
          return ret
        }
        await formatContext.ioReader.seek(pos)
      }
    }
    this.context.indexLoaded = true
    return 0
  }

  private createIdx1State(formatContext: AVIFormatContext, firstPacketPos: int64): Idx1State {
    const mmes = formatContext.streams.length === 1
      && formatContext.streams[0].codecpar.codecTag === mktagle('MMES')

    return {
      samples: formatContext.streams.map(() => []),
      nextDts: formatContext.streams.map((stream) => {
        const streamContext = stream.privData as AVIStreamContext
        return static_cast<int64>(streamContext.dwStart as int32)
      }),
      firstPacketPos: mmes ? 0n : firstPacketPos,
      dataOffset: mmes ? this.context.moviList : 0n,
      lastPos: -1n,
      lastSamplePos: -1n,
      anyKey: false,
      nonInterleaved: false
    }
  }

  private parseIdx1Block(
    formatContext: AVIFormatContext,
    index: Idx1State,
    buffer: Uint8Array,
    length: number,
    playbackStart?: int64
  ) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, length)
    let playbackEnd = playbackStart

    for (let offset = 0; offset < length; offset += IDX1_ENTRY_SIZE) {
      const firstDigit = view.getUint8(offset) - 48
      const secondDigit = view.getUint8(offset + 1) - 48
      const streamIndex = firstDigit * 10 + secondDigit
      const chunkType = view.getUint16(offset + 2, true)

      if (firstDigit < 0 || firstDigit > 9 || secondDigit < 0 || secondDigit > 9
        || streamIndex >= formatContext.streams.length || chunkType === Idx1ChunkType.PALETTE_CHANGE
      ) {
        playbackEnd = undefined
        continue
      }

      const stream = formatContext.streams[streamIndex]
      const streamContext = stream.privData as AVIStreamContext
      const flags = view.getUint32(offset + 4, true)
      let pos = static_cast<int64>(view.getUint32(offset + 8, true) as uint32)
      const size = view.getUint32(offset + 12, true)
      const key = (flags & AVFIndexFlags.AVIIF_INDEX) > 0

      if (index.firstPacketPos) {
        if (this.context.moviList + 4n !== pos || pos + 500n > index.firstPacketPos) {
          index.dataOffset = index.firstPacketPos - pos
        }
        index.firstPacketPos = 0n
      }
      pos += index.dataOffset

      if (playbackEnd !== undefined) {
        const video = stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
        if (!size || pos !== playbackEnd || (flags & ~AVFIndexFlags.AVIIF_INDEX)
          || (video
            ? (chunkType !== Idx1ChunkType.VIDEO_UNCOMPRESSED && chunkType !== Idx1ChunkType.VIDEO_COMPRESSED)
            : chunkType !== Idx1ChunkType.AUDIO)
        ) {
          playbackEnd = undefined
        }
        else {
          playbackEnd += 8n + BigInt(size + (size & 1))
          if (playbackEnd > this.context.moviEnd) {
            playbackEnd = undefined
          }
        }
      }

      if (index.lastPos === pos) {
        index.nonInterleaved = true
      }
      if (index.lastSamplePos !== pos && size) {
        index.samples[streamIndex].push({
          pos,
          size,
          key,
          dts: index.nextDts[streamIndex]
        })
        index.lastSamplePos = pos
      }
      index.nextDts[streamIndex] += this.getDuration(streamContext, size)
      index.lastPos = pos
      index.anyKey ||= key
    }

    return playbackEnd
  }

  private applyIdx1(formatContext: AVIFormatContext, index: Idx1State) {
    this.context.nonInterleaved ||= index.nonInterleaved
    formatContext.streams.forEach((stream, i) => {
      const streamContext = stream.privData as AVIStreamContext
      const samples = index.samples[i]
      if (!index.anyKey && samples.length) {
        samples[0].key = true
      }
      streamContext.samples = samples
      streamContext.sampleEnd = streamContext.currentSample >= samples.length
      stream.nbFrames = static_cast<int64>(samples.length as uint32)
    })
  }

  private async readIdx1(formatContext: AVIFormatContext, size: int32, firstPacketPos?: int64): Promise<int32> {
    const nbIndexEntries = Math.floor(size / IDX1_ENTRY_SIZE)

    if (nbIndexEntries <= 0) {
      return errorType.DATA_INVALID
    }

    if (firstPacketPos === undefined) {
      firstPacketPos = 0n
      const idx1Pos = formatContext.ioReader.getPos()
      await formatContext.ioReader.seek(this.context.moviList + 4n)
      if ((await this.syncChunk(formatContext)) === 0) {
        firstPacketPos = formatContext.ioReader.getPos() - 8n
      }
      this.context.currentIndex = -1
      await formatContext.ioReader.seek(idx1Pos)
    }

    const index = this.createIdx1State(formatContext, firstPacketPos)
    const buffer = new Uint8Array(Math.min(nbIndexEntries, IDX1_ENTRIES_PER_BLOCK) * IDX1_ENTRY_SIZE)
    for (let i = 0; i < nbIndexEntries; i += IDX1_ENTRIES_PER_BLOCK) {
      const length = Math.min(nbIndexEntries - i, IDX1_ENTRIES_PER_BLOCK) * IDX1_ENTRY_SIZE
      await formatContext.ioReader.readBuffer(length, buffer)
      this.parseIdx1Block(formatContext, index, buffer, length)
    }
    this.applyIdx1(formatContext, index)
    return 0
  }

  private async deferIdx1(formatContext: AVIFormatContext) {
    const flags = this.context.header.dwFlages
    const length = this.context.riffEndPos - this.context.moviEnd
    if (!formatContext.readAt || this.context.nonInterleaved || this.context.isOdml || this.context.dvDemux
      || !(formatContext.ioReader.flags & IOFlags.SEEKABLE) || !(flags & AVIFlags.AVIF_HASINDEX)
      || !(flags & (AVIFlags.AVIF_ISINTERLEAVED | AVIFlags.AVIF_TRUSTCKTYPE))
      || formatContext.streams.length !== 2
      || !formatContext.streams.some((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO)
      || !formatContext.streams.some((stream) => stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO)
      || formatContext.streams.some((stream) => (stream.privData as AVIStreamContext).dwSampleSize > 1)
      || this.context.riffEndPos > this.context.ioFileSize
      || length <= IDX1_PREFIX_SIZE + 8 || length > MAX_IDX1_PREFETCH_SIZE
    ) {
      return false
    }

    const firstPacketPos = await this.peekFirstPacketPos(formatContext)
    if (!firstPacketPos) {
      return false
    }

    // Match the idx1 prefix against contiguous, interleaved packets before allowing sequential playback.
    try {
      const buffer = await formatContext.readAt(this.context.moviEnd, IDX1_PREFIX_SIZE + 8)
      if (typeof buffer === 'number' || buffer.length !== IDX1_PREFIX_SIZE + 8) {
        return false
      }
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const size = view.getUint32(4, true)
      if (view.getUint32(0, true) !== mktagle('idx1') || size % IDX1_ENTRY_SIZE || BigInt(size + 8) !== length) {
        return false
      }

      const index = this.createIdx1State(formatContext, firstPacketPos)
      const playbackEnd = this.parseIdx1Block(formatContext, index, buffer.subarray(8), IDX1_PREFIX_SIZE, firstPacketPos)
      if (!playbackEnd || !this.isInterleavedPrefix(formatContext, index)) {
        return false
      }

      // Keep the validated samples separate from the arrays filled by the background reader.
      formatContext.streams.forEach((stream, i) => {
        const streamContext = stream.privData as AVIStreamContext
        streamContext.samples = index.samples[i].slice()
      })
      this.deferredIdx1 = {
        index,
        rangeStart: this.context.moviEnd + BigInt(IDX1_PREFIX_SIZE + 8),
        rangeEnd: this.context.riffEndPos,
        validatedEnd: playbackEnd,
        playbackEnd,
        prefixEndDts: index.nextDts.slice()
      }
      return true
    }
    catch (error) {
      // The primary reader is still at movi and can load the legacy index normally.
      return false
    }
  }

  private isInterleavedPrefix(formatContext: AVIFormatContext, index: Idx1State) {
    const [a, b] = index.samples
    if (!a.length || !b.length
      || !formatContext.streams.every((stream, i) => (
        stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO || index.samples[i][0].key
      ))
    ) {
      return false
    }

    const [aStream, bStream] = formatContext.streams
    let aIndex = 0
    let bIndex = 0
    while (aIndex < a.length || bIndex < b.length) {
      const aDts = avRescaleQ(a[aIndex]?.dts ?? index.nextDts[0], aStream.timeBase, AV_TIME_BASE_Q)
      const bDts = avRescaleQ(b[bIndex]?.dts ?? index.nextDts[1], bStream.timeBase, AV_TIME_BASE_Q)
      // The indexed reader would reorder streams if their timestamps were too far apart.
      if (Math.abs(Number(aDts - bDts)) >= 5000000) {
        return false
      }
      if (aIndex < a.length && (bIndex >= b.length || a[aIndex].pos < b[bIndex].pos)) {
        aIndex++
      }
      else {
        bIndex++
      }
    }
    return true
  }

  private canReadIdx1(formatContext: AVIFormatContext, deferred: DeferredIdx1) {
    return this.deferredIdx1 === deferred && formatContext.readAt && !(formatContext.ioReader.flags & IOFlags.ABORT)
  }

  private idx1CoversSeek(formatContext: AVIFormatContext, deferred: DeferredIdx1) {
    if (deferred.seekTarget === undefined || deferred.validatedEnd === undefined) {
      return false
    }
    const target = deferred.seekTarget + IDX1_SEEK_LOOKAHEAD
    return formatContext.streams.every((stream) => {
      const samples = deferred.index.samples[stream.index]
      return target < avRescaleQ(samples[samples.length - 1].dts, stream.timeBase, AV_TIME_BASE_Q)
    })
  }

  private idx1RangeSize(formatContext: AVIFormatContext, deferred: DeferredIdx1) {
    const indexedBytes = Number(deferred.rangeStart - this.context.moviEnd - 8n)
    if (indexedBytes === IDX1_PREFIX_SIZE) {
      return IDX1_PREFIX_SIZE
    }
    if (deferred.seekTarget === undefined || deferred.validatedEnd === undefined) {
      return IDX1_RANGE_SIZE
    }

    const targetTime = deferred.seekTarget + IDX1_SEEK_LOOKAHEAD
    let length = 0
    for (const stream of formatContext.streams) {
      const samples = deferred.index.samples[stream.index]
      const first = samples[0].dts
      const last = samples[samples.length - 1].dts
      const target = avRescaleQ(targetTime, AV_TIME_BASE_Q, stream.timeBase)
      if (target >= last) {
        // The observed index density sizes the next request. DTS still comes from parsing every entry.
        const estimate = indexedBytes * Number(target - last) / Math.max(1, Number(last - first))
        length = Math.max(length, Math.ceil(estimate / IDX1_ENTRY_SIZE) * IDX1_ENTRY_SIZE + IDX1_SEEK_RANGE_MARGIN)
      }
    }
    return length ? Math.min(length, IDX1_RANGE_SIZE) : IDX1_RANGE_SIZE
  }

  private async readIdx1Range(formatContext: AVIFormatContext, deferred: DeferredIdx1) {
    try {
      const length = Math.min(this.idx1RangeSize(formatContext, deferred), Number(deferred.rangeEnd - deferred.rangeStart))
      const buffer = await formatContext.readAt(deferred.rangeStart, length)
      if (!this.canReadIdx1(formatContext, deferred) || typeof buffer === 'number' || buffer.length !== length) {
        return false
      }
      deferred.validatedEnd = this.parseIdx1Block(formatContext, deferred.index, buffer, length, deferred.validatedEnd)
      deferred.rangeStart += BigInt(length)
      return true
    }
    catch (error) {
      return false
    }
  }

  private startIdx1Prefetch(formatContext: AVIFormatContext) {
    const deferred = this.deferredIdx1
    if (!deferred.prefetch && !deferred.failed && deferred.rangeStart < deferred.rangeEnd
      && this.canReadIdx1(formatContext, deferred)
    ) {
      const cancelled = new Promise<boolean>((resolve) => {
        deferred.cancelPrefetch = () => resolve(false)
      })
      deferred.prefetch = Promise.race([this.readIdx1Range(formatContext, deferred), cancelled]).then((success) => {
        deferred.prefetch = undefined
        deferred.cancelPrefetch = undefined
        deferred.failed = !success
        // Let the media reader reach a pending seek before downloading more index data.
        if (success && this.canReadIdx1(formatContext, deferred) && !this.idx1CoversSeek(formatContext, deferred)) {
          this.startIdx1Prefetch(formatContext)
        }
        return success
      })
    }
    return deferred.prefetch
  }

  private applyIdx1Prefix(formatContext: AVIFormatContext, deferred: DeferredIdx1) {
    formatContext.streams.forEach((stream, i) => {
      const context = stream.privData as AVIStreamContext
      context.samples = deferred.index.samples[i].slice()
      context.sampleEnd = context.currentSample >= context.samples.length
    })
    deferred.playbackEnd = deferred.validatedEnd
    deferred.prefixEndDts = deferred.index.nextDts.slice()
  }

  private async updateDeferredIdx1(formatContext: AVIFormatContext, ready?: () => boolean, releaseReadAhead = false) {
    const deferred = this.deferredIdx1
    const reader = formatContext.ioReader
    const needsMore = () => !deferred.failed && deferred.rangeStart < deferred.rangeEnd
      && !(deferred.validatedEnd !== undefined && ready?.())
    if (releaseReadAhead && needsMore() && this.canReadIdx1(formatContext, deferred)) {
      // A pending seek can release the old media response while the independent index request finishes.
      await reader.seek(reader.getPos(), true, false)
    }
    while (needsMore() && this.canReadIdx1(formatContext, deferred)) {
      await this.startIdx1Prefetch(formatContext)
    }
    if (!this.canReadIdx1(formatContext, deferred)) {
      return false
    }

    if (deferred.rangeStart === deferred.rangeEnd) {
      this.deferredIdx1 = undefined
      this.applyIdx1(formatContext, deferred.index)
      this.context.indexLoaded = true
    }
    else if (deferred.failed) {
      this.deferredIdx1 = undefined
      const firstPacketPos = this.context.moviList + 4n
      try {
        await this.loadIndex(formatContext, firstPacketPos)
      }
      catch (error) {
        // Keep playing from the restored cursor if a later index read also fails.
        formatContext.streams.forEach((stream) => {
          const streamContext = stream.privData as AVIStreamContext
          streamContext.samples = undefined
        })
      }
    }
    else {
      this.applyIdx1Prefix(formatContext, deferred)
    }
    return true
  }

  public async destroy(formatContext: AVIFormatContext): Promise<void> {
    this.deferredIdx1?.cancelPrefetch?.()
    this.deferredIdx1 = undefined
  }

  private async peekFirstPacketPos(formatContext: AVIFormatContext) {
    const reader = formatContext.ioReader
    // Check only the buffered first chunk. Other layouts still use syncChunk when idx1 is found.
    if (this.context.dvDemux || reader.flags & IOFlags.ABORT || reader.remainingLength() < 12) {
      return
    }
    const header = await reader.peekBuffer(12)
    const tag = text.decode(header.subarray(4, 8))
    if (/^[0-9]{2}(dc|db|wb)$/.test(tag) && this.getStreamIndex(tag) < formatContext.streams.length) {
      const pos = reader.getPos() + 4n
      const size = new DataView(header.buffer).getUint32(8, true)
      if (pos + 8n + static_cast<int64>(size as uint32) <= this.context.moviEnd) {
        return pos
      }
    }
  }

  private async loadIndex(formatContext: AVIFormatContext, firstPacketPos?: int64) {
    if (this.context.moviEnd >= this.context.fileSize) {
      return
    }

    const reader = formatContext.ioReader
    const pos = reader.getPos()
    firstPacketPos ??= await this.peekFirstPacketPos(formatContext)

    try {
      await reader.seek(this.context.moviEnd)
      while (reader.getPos() + 8n <= this.context.fileSize) {
        const tag = await reader.readString(4)
        const size = await reader.readUint32()
        const next = reader.getPos() + BigInt(size + (size & 1))
        if (next > this.context.fileSize) {
          break
        }
        if (tag === 'idx1') {
          this.context.indexLoaded = (await this.readIdx1(formatContext, size, firstPacketPos)) === 0
          break
        }
        if (next + 8n <= this.context.fileSize) {
          await reader.seek(next, false, false)
        }
        else {
          break
        }
      }
    }
    finally {
      await reader.seek(pos)
    }
  }

  private getNextSample(formatContext: AVIFormatContext) {
    let sample: AVISample
    let stream: AVStream

    let bestDts = 0n

    let posSample: AVISample
    let posStream: AVStream

    let dtsSample: AVISample
    let dtsStream: AVStream

    formatContext.streams.forEach((s) => {
      const context = s.privData as AVIStreamContext

      if (!context.samples || !context.samples.length) {
        context.sampleEnd = true
        return true
      }

      if (!context.sampleEnd
        && (!posSample
          || (context.samples[context.currentSample].pos < posSample.pos)
        )
      ) {
        posSample = context.samples[context.currentSample]
        posStream = s
      }

      if (!context.sampleEnd
        && (!dtsSample
          || avRescaleQ(context.samples[context.currentSample].dts, s.timeBase, AV_TIME_BASE_Q)
            < bestDts
        )
      ) {
        dtsSample = context.samples[context.currentSample]
        bestDts = avRescaleQ(dtsSample.dts, s.timeBase, AV_TIME_BASE_Q)
        dtsStream = s
      }
    })

    if (posSample && dtsSample) {
      const posDts = avRescaleQ(posSample.dts, posStream.timeBase, AV_TIME_BASE_Q)
      const dtsDts = avRescaleQ(dtsSample.dts, dtsStream.timeBase, AV_TIME_BASE_Q)
      const diff = Math.abs(Number(posDts - dtsDts))

      if (!(formatContext.ioReader.flags & IOFlags.SEEKABLE)) {
        sample = posSample
        stream = posStream
      }
      else {
        // 两者时间差值在 5s 内优先 pos，避免来回 seek
        if (diff < 5000000) {
          const posDiff = Math.abs(Number(posSample.pos - formatContext.ioReader.getPos()))
          const dtsDiff = Math.abs(Number(dtsSample.pos - formatContext.ioReader.getPos()))
          if (posDiff > dtsDiff) {
            sample = dtsSample
            stream = dtsStream
          }
          else {
            sample = posSample
            stream = posStream
          }
        }
        else {
          sample = dtsSample
          stream = dtsStream
        }
      }
    }
    else if (posSample) {
      sample = posSample
      stream = posStream
    }
    else if (dtsSample) {
      sample = dtsSample
      stream = dtsStream
    }

    if (stream) {
      const streamContext = (stream.privData as AVIStreamContext)
      streamContext.currentSample++
      if (streamContext.currentSample
        >= streamContext.samples.length
      ) {
        streamContext.sampleEnd = true
      }
    }
    return {
      sample,
      stream
    }
  }

  public async readAVPacket_(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {

    if (this.context.currentIndex < 0) {
      if (this.deferredIdx1 && formatContext.ioReader.getPos() + 1n >= this.deferredIdx1.playbackEnd) {
        const deferred = this.deferredIdx1
        if (!await this.updateDeferredIdx1(formatContext, () => deferred.validatedEnd > deferred.playbackEnd)) {
          return IOError.ABORT
        }
      }
      if (this.context.nonInterleaved && formatContext.streams.length > 1) {
        const { sample, stream } = this.getNextSample(formatContext)
        if (sample) {
          await formatContext.ioReader.seek(sample.pos)
          const streamContext = stream.privData as AVIStreamContext
          streamContext.currentDts = sample.dts
        }
        else {
          return IOError.END
        }
      }
      while (true) {
        const reader = formatContext.ioReader
        const pos = reader.getPos()
        let ret = await this.syncChunk(formatContext)
        if (ret < 0) {
          return ret
        }
        if (this.deferredIdx1) {
          const stream = formatContext.streams[this.context.currentIndex]
          const context = stream.privData as AVIStreamContext
          const sample = context.samples[context.currentSample]
          if (!sample || sample.pos !== reader.getPos() - 8n || sample.size !== this.context.remaining) {
            // The media disagrees with the index prefix. Resume from the last verified packet.
            await reader.seek(pos, false, false)
            this.context.currentIndex = -1
            if (!await this.updateDeferredIdx1(formatContext)) {
              return IOError.ABORT
            }
            return this.readAVPacket_(formatContext, avpacket)
          }
        }
        // 可能存在一些空帧
        if (this.context.remaining) {
          break
        }
        const stream = formatContext.streams[this.context.currentIndex]
        if (!stream) {
          return errorType.DATA_INVALID
        }
        const streamContext = stream.privData as AVIStreamContext
        streamContext.currentDts += this.getDuration(streamContext, 0)
      }
    }

    const stream = formatContext.streams[this.context.currentIndex]

    if (!stream) {
      return errorType.DATA_INVALID
    }

    const streamContext = stream.privData as AVIStreamContext

    avpacket.pos = formatContext.ioReader.getPos() - 8n
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
      && !this.mp3Readers.has(stream) && !this.context.nonInterleaved && streamContext.samples?.length
    ) {
      // An indexed seek can land at an earlier chunk of a different stream.
      const index = array.binarySearch(streamContext.samples, (sample) => {
        return sample.pos < avpacket.pos ? 1 : sample.pos > avpacket.pos ? -1 : 0
      })
      if (index >= 0 && streamContext.samples[index].pos === avpacket.pos) {
        streamContext.currentDts = streamContext.samples[index].dts
      }
    }

    avpacket.timeBase.den = stream.timeBase.den
    avpacket.timeBase.num = stream.timeBase.num
    avpacket.streamIndex = stream.index
    avpacket.dts = streamContext.currentDts
    if (stream.codecpar.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB) {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB
    }

    if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      if (streamContext.samples?.length) {
        let index = array.binarySearch(streamContext.samples, (sample) => {
          if (sample.dts > streamContext.currentDts) {
            return -1
          }
          else if (sample.dts === streamContext.currentDts) {
            return 0
          }
          return 1
        })
        if (index > -1) {
          if (streamContext.samples[index].key) {
            avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
            this.context.hasVideoKey = true
          }
        }
      }
      else {
        if (!this.context.hasVideoKey) {
          avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
          this.context.hasVideoKey = true
        }
      }
    }
    else {
      avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
    }

    this.context.lastPktPos = formatContext.ioReader.getPos()

    let size: number
    if (streamContext.dwSampleSize <= 1) {
      size = INT32_MAX
    }
    else if (streamContext.dwSampleSize < 32) {
      size = 1024 * streamContext.dwSampleSize
    }
    else {
      size = streamContext.dwSampleSize
    }
    if (size > this.context.remaining) {
      size = this.context.remaining
    }

    const data = allocAVPacketData(reinterpret_cast<size>(size as uint32))
    await formatContext.ioReader.readBuffer(size, mapSafeUint8Array(data, reinterpret_cast<size>(size as uint32)))
    addAVPacketData(avpacket, data, size)

    // Some AVI writers keep H.264 parameter sets only in the first media packet.
    // Identify the framing before stream analysis and keyframe detection consume it.
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264 && !stream.codecpar.extradataSize) {
      const buffer = getAVPacketData(avpacket)
      if (naluUtil.isAnnexb(buffer)) {
        stream.codecpar.flags |= AVCodecParameterFlags.AV_CODECPAR_FLAG_H26X_ANNEXB
        avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_H26X_ANNEXB
        const extradata = h264.generateAnnexbExtradata(buffer)
        if (extradata) {
          stream.codecpar.extradata = allocAVPacketData(extradata.length)
          stream.codecpar.extradataSize = extradata.length
          memcpyFromUint8Array(stream.codecpar.extradata, extradata.length, extradata)
          stream.sideData[AVPacketSideDataType.AV_PKT_DATA_NEW_EXTRADATA] = extradata.slice()
          h264.parseAVCodecParameters(stream, extradata)
        }
      }
    }

    if (streamContext.hasPal && size < INT32_MAX / 2 && !this.context.dvDemux) {
      const pal: pointer<uint8> = avMalloc(reinterpret_cast<size>(AVPALETTE_SIZE))
      memcpyFromUint8Array(pal, AVPALETTE_SIZE, new Uint8Array(streamContext.pal.buffer))
      addAVPacketSideData(avpacket, AVPacketSideDataType.AV_PKT_DATA_PALETTE, pal, AVPALETTE_SIZE)
      streamContext.hasPal = false
    }

    if (streamContext.dwSampleSize) {
      avpacket.dts /= static_cast<int64>(streamContext.dwSampleSize as int32)
    }
    if (!(stream.codecpar.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS)) {
      avpacket.pts = avpacket.dts
    }
    streamContext.currentDts += this.getDuration(streamContext, size)
    this.context.remaining -= size
    if (!this.context.remaining) {
      this.context.currentIndex = -1
      this.context.packetSize = 0
      const deferred = this.deferredIdx1
      if (deferred) {
        streamContext.currentSample++
        const target = deferred.seekTarget
        if (target === undefined || formatContext.streams.every((st) => {
          const context = st.privData as AVIStreamContext
          return avRescaleQ(context.currentDts, st.timeBase, AV_TIME_BASE_Q) > target
        })) {
          deferred.seekTarget = undefined
          this.startIdx1Prefetch(formatContext)
        }
      }
    }

    return 0
  }

  private writeMp3Frame(avpacket: pointer<AVPacket>, stream: AVStream, frame: AviMp3Frame) {
    const length = frame.data.length
    const data = allocAVPacketData(length)
    memcpyFromUint8Array(data, length, frame.data)
    addAVPacketData(avpacket, data, length)
    avpacket.streamIndex = stream.index
    avpacket.timeBase.num = stream.timeBase.num
    avpacket.timeBase.den = stream.timeBase.den
    avpacket.dts = avpacket.pts = frame.dts
    avpacket.pos = frame.pos
    avpacket.duration = frame.duration
    avpacket.flags |= AVPacketFlags.AV_PKT_FLAG_KEY
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    while (true) {
      if (this.pendingMp3Stream) {
        const stream = this.pendingMp3Stream
        const frame = this.mp3Readers.get(stream).read()
        if (frame) {
          this.writeMp3Frame(avpacket, stream, frame)
          return 0
        }
        this.pendingMp3Stream = undefined
      }

      if (this.mp3Eof) {
        for (const [stream, reader] of this.mp3Readers) {
          const frame = reader.read(true)
          if (frame) {
            this.writeMp3Frame(avpacket, stream, frame)
            return 0
          }
          this.mp3Readers.delete(stream)
        }
        return IOError.END
      }

      const ret = await this.readChunk(formatContext, avpacket)
      if (ret === IOError.END && this.mp3Readers.size) {
        unrefAVPacket(avpacket)
        this.mp3Eof = true
        continue
      }
      if (ret !== 0) {
        return ret
      }

      const stream = formatContext.streams[avpacket.streamIndex]
      if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_MP3) {
        return ret
      }

      let reader = this.mp3Readers.get(stream)
      if (!reader) {
        const context = stream.privData as AVIStreamContext
        reader = new Mp3FrameReader(stream.timeBase, context.dwSampleSize)
        this.mp3Readers.set(stream, reader)
      }
      reader.append(getAVPacketData(avpacket), avpacket.dts, avpacket.pos)
      unrefAVPacket(avpacket)
      this.pendingMp3Stream = stream
    }
  }

  private async readChunk(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
    try {
      return await this.readAVPacket_(formatContext, avpacket)
    }
    catch (error) {
      if (formatContext.ioReader.error !== IOError.END
          && formatContext.ioReader.error !== IOError.ABORT
      ) {
        logger.error(`read packet error, ${error}`)
        return errorType.DATA_INVALID
      }
      return formatContext.ioReader.error
    }
  }

  private async syncChunk(formatContext: AVIFormatContext) {
    let pos: int64 = NOPTS_VALUE_BIGINT

    while (true) {
      try {
        if (formatContext.ioReader.flags & IOFlags.ABORT) {
          return IOError.ABORT
        }
        const now = formatContext.ioReader.getPos()
        const type = await formatContext.ioReader.readString(4)
        const size = await formatContext.ioReader.readUint32()

        if ((this.context.ioFileSize ? now : 0n) + static_cast<int64>(size as uint32) > this.context.fileSize
          || type.charCodeAt(0) > 127
        ) {
          await formatContext.ioReader.seek(now + 1n)
          continue
        }

        if (type === 'idx1') {
          const reader = formatContext.ioReader
          const length = size + (size & 1)
          const next = reader.getPos() + BigInt(length)
          if ((reader.flags & IOFlags.SEEKABLE) && next <= this.context.ioFileSize) {
            if (next === this.context.ioFileSize) {
              return IOError.END
            }
            if (length > reader.remainingLength()) {
              // Skip the index without downloading it again. Another RIFF segment may follow.
              await reader.seek(next, false, false)
              continue
            }
          }
          await reader.skip(length)
          continue
        }

        if (type[0] === 'i' && type[1] === 'x' && this.getStreamIndex(type.slice(2)) < formatContext.streams.length
          || type === 'JUNK'
          || type === 'indx'
        ) {
          await formatContext.ioReader.skip(size)
          continue
        }

        if (type === 'LIST') {
          await formatContext.ioReader.skip(4)
          continue
        }

        const index = this.getStreamIndex(type)

        if (!((now - this.context.lastPktPos) & 1n) && this.getStreamIndex(type.slice(1)) < formatContext.streams.length) {
          continue
        }

        if (type[2] == 'i' && type[3] == 'x' && index < formatContext.streams.length) {
          await formatContext.ioReader.skip(size)
          continue
        }

        if (type[2] == 'w' && type[3] == 'c' && index < formatContext.streams.length) {
          await formatContext.ioReader.skip(16 * 3 + 8)
          continue
        }

        if (this.context.dvDemux && index !== 0) {
          continue
        }

        if (index < formatContext.streams.length) {
          const stream = formatContext.streams[index]
          const streamContext = stream.privData as AVIStreamContext

          if (type[2] == 'p' && type[3] == 'c' && size <= 4 * 256 + 4) {
            let k = await formatContext.ioReader.readUint8()
            const last = (k + (await formatContext.ioReader.readUint8()) - 1) & 0xFF
            await formatContext.ioReader.skip(2)
            for (; k <= last; k++) {
              streamContext.pal[k] = 0xFF << 24 | (await formatContext.ioReader.readUint32()) >> 8
            }
            streamContext.hasPal = true
            continue
          }
          else {
            this.context.currentIndex = index
            this.context.remaining = size
            this.context.packetSize = size + 8
            // streamContext.currentDts += this.getDuration(streamContext, size)
            pos = formatContext.ioReader.getPos()
            break
          }
        }

        await formatContext.ioReader.seek(now + 1n)
      }
      catch (error) {
        if (formatContext.ioReader.error !== IOError.END
          && formatContext.ioReader.error !== IOError.ABORT
        ) {
          logger.error(`read packet error, ${error}`)
          return errorType.DATA_INVALID
        }
        return formatContext.ioReader.error
      }
    }

    if (pos !== NOPTS_VALUE_BIGINT) {
      await formatContext.ioReader.seek(pos)
    }
    return 0
  }

  private resetMp3Readers() {
    this.mp3Readers.clear()
    this.pendingMp3Stream = undefined
    this.mp3Eof = false
  }

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {

    const now = formatContext.ioReader.getPos()

    if (flags & AVSeekFlags.BYTE) {
      if (this.deferredIdx1 && !await this.updateDeferredIdx1(formatContext, undefined, true)) {
        return static_cast<int64>(IOError.ABORT)
      }
      await formatContext.ioReader.seek(timestamp)
      if (this.mp3Readers.size || this.mp3Eof) {
        this.context.currentIndex = -1
      }
      this.resetMp3Readers()
      if (!(flags & AVSeekFlags.ANY)) {
        await this.syncChunk(formatContext)
      }
      return now
    }

    const deferred = this.deferredIdx1
    if (deferred) {
      const withinPrefix = formatContext.streams.every((st) => {
        const target = avRescaleQ(timestamp, stream.timeBase, st.timeBase)
        const samples = (st.privData as AVIStreamContext).samples
        return target < samples[samples.length - 1].dts
      })
      if (withinPrefix) {
        deferred.seekTarget = undefined
        this.startIdx1Prefetch(formatContext)
      }
      else {
        deferred.seekTarget = avRescaleQ(timestamp, stream.timeBase, AV_TIME_BASE_Q)
        let ready = false
        try {
          ready = await this.updateDeferredIdx1(formatContext, () => this.idx1CoversSeek(formatContext, deferred), true)
        }
        finally {
          if (!ready) {
            deferred.seekTarget = undefined
          }
        }
        if (!ready) {
          return static_cast<int64>(IOError.ABORT)
        }
      }
    }

    const streamContext = stream.privData as AVIStreamContext
    if (!streamContext.samples?.length) {
      return static_cast<int64>(errorType.OPERATE_NOT_SUPPORT)
    }

    let pos = NOPTS_VALUE_BIGINT

    let index = array.binarySearch(streamContext.samples, (item) => {
      if (item.dts > timestamp) {
        return -1
      }
      else if (item.dts === timestamp) {
        return 0
      }
      return 1
    })

    // A target beyond the final packet (including a shorter, selected audio
    // stream's EOF) still needs to drain through the renderer's seek target.
    if (index < 0 && timestamp >= streamContext.samples[streamContext.samples.length - 1].dts
      && formatContext.streams.some((st) => st.duration > 0n
        && timestamp <= avRescaleQ(st.duration, st.timeBase, stream.timeBase))
    ) {
      index = streamContext.samples.length - 1
    }

    if (index > -1 && stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      let i = index
      for (; i >= 0; i--) {
        if (streamContext.samples[i].key) {
          index = i
          break
        }
      }
      if (i < 0) {
        index = -1
      }
    }

    if (index > -1) {
      streamContext.currentDts = streamContext.samples[index].dts
      streamContext.sampleEnd = false
      streamContext.currentSample = index
      pos = streamContext.samples[index].pos
      array.each(formatContext.streams, (st) => {
        if (st !== stream) {
          const stContext = st.privData as AVIStreamContext
          let timestamp = avRescaleQ(streamContext.currentDts, stream.timeBase, st.timeBase)

          let index = array.binarySearch(stContext.samples ?? [], (sample) => {
            if (sample.dts > timestamp) {
              return -1
            }
            else if (sample.dts === timestamp) {
              return 0
            }
            return 1
          })

          if (index > -1 && st.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
            let i = index
            for (; i >= 0; i--) {
              if (stContext.samples[i].key) {
                index = i
                break
              }
            }
            if (i < 0) {
              index = -1
            }
          }

          if (index >= 0) {
            pos = bigint.min(pos, stContext.samples[index].pos)
            stContext.currentDts = stContext.samples[index].dts
            stContext.currentSample = index
            stContext.sampleEnd = false
          }
        }
      })

      if (pos !== NOPTS_VALUE_BIGINT) {
        await formatContext.ioReader.seek(pos)
        if (this.deferredIdx1) {
          formatContext.streams.forEach((st) => {
            const context = st.privData as AVIStreamContext
            const index = array.binarySearch(context.samples, (sample) => {
              return sample.pos < pos ? 1 : sample.pos > pos ? -1 : 0
            })
            context.currentSample = index < 0 ? context.samples.length : index
            context.sampleEnd = index < 0
            context.currentDts = index < 0 ? this.deferredIdx1.prefixEndDts[st.index] : context.samples[index].dts
          })
        }
        this.resetMp3Readers()
        this.context.currentIndex = -1
      }
      return now
    }
    return static_cast<int64>(errorType.OPERATE_NOT_SUPPORT)
  }

  public getAnalyzeStreamsCount(): number {
    return this.context.header.dwStreams
  }
}
