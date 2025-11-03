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

import type AVStream from 'avutil/AVStream'
import type { AVIFormatContext } from '../AVFormatContext'
import type AVPacket from 'avutil/struct/avpacket'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import { AVCodecID, AVMediaType, AVPacketSideDataType } from 'avutil/codec'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import IFormat from './IFormat'
import { AVFormat, AVSeekFlags, IOFlags } from 'avutil/avformat'
import { mapSafeUint8Array, mapUint8Array, memcpyFromUint8Array, readCString } from 'cheap/std/memory'
import { avFree, avMalloc } from 'avutil/util/mem'
import { addAVPacketData, addAVPacketSideData } from 'avutil/util/avpacket'
import { IOError } from 'common/io/error'
import { readInfo, readBmpHeader, readWavHeader } from './riff/iriff'
import { AV_TIME_BASE_Q, INT32_MAX, INT64_MAX, NOPTS_VALUE, NOPTS_VALUE_BIGINT } from 'avutil/constant'
import concatTypeArray from 'common/function/concatTypeArray'
import * as is from 'common/util/is'
import mktagle from '../function/mktagle'
import type { AVIMainHeader, AVISample, AVIStreamContext } from './avi/type'
import { AVFIndexFlags, AVIFlags } from './avi/type'
import { avReduce, avRescaleQ } from 'avutil/util/rational'
import * as intread from 'avutil/util/intread'
import { codecBmpTags } from './riff/riff'
import * as naluUtil from 'avutil/util/nalu'
import * as bigint from 'common/util/bigint'
import * as array from 'common/util/array'
import * as object from 'common/util/object'

import * as h264 from 'avutil/codecs/h264'
import * as aac from 'avutil/codecs/aac'
import * as hevc from 'avutil/codecs/hevc'
import * as vvc from 'avutil/codecs/vvc'
import * as av1 from 'avutil/codecs/av1'
import * as vp9 from 'avutil/codecs/vp9'
import * as vp8 from 'avutil/codecs/vp8'
import * as flac from 'avutil/codecs/flac'
import * as opus from 'avutil/codecs/opus'
import { AVPALETTE_SIZE } from 'avutil/pixfmt'
import { MPEG4AudioObjectTypes } from 'avutil/codecs/aac'
import { AVCodecParameterFlags } from 'avutil/struct/avcodecparameters'

const AVI_HEADER = [
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', ' '],
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', 'X'],
  ['R', 'I', 'F', 'F', 'A', 'V', 'I', 0x19],
  ['O', 'N', '2', ' ', 'O', 'N', '2', 'f'],
  ['R', 'I', 'F', 'F', 'A', 'M', 'V', ' ']
]

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
              await readInfo(formatContext.ioReader,  static_cast<int64>(size as uint32), formatContext.metadata)
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
            stream.codecpar.profile = MPEG4AudioObjectTypes.AAC_LC
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

      if (!this.context.indexLoaded) {
        await this.loadIndex(formatContext)
      }

      if (this.context.dvDemux) {
        this.context.nonInterleaved = false
      }
      else if (!formatContext.streams.some((stream) => {
        const context = stream.privData as AVIStreamContext
        return !!context.samples
      })) {
        this.context.nonInterleaved = false
      }

      formatContext.streams.forEach((stream) => {
        const streamContext = stream.privData as AVIStreamContext
        if (streamContext.samples?.length) {
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

  private async readIdx1(formatContext: AVIFormatContext, size: int32): Promise<int32> {

    let firstPacket = true
    let lastPos = -1n
    let lastIdx = -1n
    let firstPacketPos = 0n
    let dataOffset = 0n
    let anyKey = false

    let nbIndexEntries = size / 16

    if (nbIndexEntries <= 0) {
      return errorType.DATA_INVALID
    }

    let idx1Pos = formatContext.ioReader.getPos()
    await formatContext.ioReader.seek(this.context.moviList + 4n)

    if ((await this.syncChunk(formatContext)) === 0) {
      firstPacketPos = formatContext.ioReader.getPos() - 8n
    }
    this.context.currentIndex = -1

    await formatContext.ioReader.seek(idx1Pos)

    if (formatContext.streams.length === 1
      && formatContext.streams[0].codecpar.codecTag === mktagle('MMES')
    ) {
      firstPacketPos = 0n
      dataOffset = this.context.moviList
    }

    for (let i = 0; i < nbIndexEntries; i++) {
      const tag = await formatContext.ioReader.readString(4)
      const flags = await formatContext.ioReader.readUint32()
      let pos = static_cast<int64>(await formatContext.ioReader.readUint32())
      const len = await formatContext.ioReader.readUint32()

      const index = this.getStreamIndex(tag)
      if (index >= formatContext.streams.length) {
        continue
      }
      const stream = formatContext.streams[index]
      const streamContext = stream.privData as AVIStreamContext
      if (!streamContext.samples) {
        streamContext.samples = []
      }

      if (tag[2] === 'p' && tag[3] === 'c') {
        continue
      }
      if (firstPacket && firstPacketPos) {
        if (this.context.moviList + 4n !== pos || pos + 500n > firstPacketPos) {
          dataOffset = firstPacketPos - pos
        }
        firstPacket = false
      }
      pos += dataOffset
      if (lastPos === pos) {
        this.context.nonInterleaved = true
      }
      if (lastIdx !== pos && len) {
        streamContext.samples.push({
          pos,
          size: len,
          key: (flags & AVFIndexFlags.AVIIF_INDEX) > 0,
          dts: streamContext.currentDts
        })
        lastIdx = pos
      }
      streamContext.currentDts += this.getDuration(streamContext, len)
      lastPos = pos
      if (flags & AVFIndexFlags.AVIIF_INDEX) {
        anyKey = true
      }
    }
    if (!anyKey) {
      formatContext.streams.forEach((stream) => {
        const streamContext = stream.privData as AVIStreamContext
        if (streamContext.samples?.length) {
          streamContext.samples[0].key = true
        }
      })
    }
    return 0
  }

  private async loadIndex(formatContext: AVIFormatContext) {
    let pos = formatContext.ioReader.getPos()

    const currentDts: Record<int32, int64> = {}
    formatContext.streams.forEach((stream) => {
      const streamContext = stream.privData as AVIStreamContext
      currentDts[stream.index] = streamContext.currentDts
    })

    if (this.context.moviEnd >= this.context.fileSize) {
      return
    }

    await formatContext.ioReader.seek(this.context.moviEnd)

    while (true) {
      const tag = await formatContext.ioReader.readString(4)
      const size = await formatContext.ioReader.readUint32()
      let next = formatContext.ioReader.getPos()
      if (next < 0 || next > INT64_MAX - static_cast<int64>(size + (size & 1))) {
        break
      }
      next += static_cast<int64>(size + (size & 1))
      if (tag === 'idx1') {
        await this.readIdx1(formatContext, size)
        break
      }
      await formatContext.ioReader.seek(next)
    }

    await formatContext.ioReader.seek(pos)

    this.context.indexLoaded = true
    formatContext.streams.forEach((stream) => {
      const streamContext = stream.privData as AVIStreamContext
      streamContext.currentDts = currentDts[stream.index]
    })
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
        let ret = await this.syncChunk(formatContext)
        if (ret < 0) {
          return ret
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

    avpacket.timeBase.den = stream.timeBase.den
    avpacket.timeBase.num = stream.timeBase.num
    avpacket.streamIndex = stream.index
    avpacket.dts = streamContext.currentDts
    avpacket.pos = formatContext.ioReader.getPos() - 8n
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

    const data: pointer<uint8> = avMalloc(reinterpret_cast<size>(size as uint32))
    await formatContext.ioReader.readBuffer(size, mapSafeUint8Array(data, reinterpret_cast<size>(size as uint32)))
    addAVPacketData(avpacket, data, size)

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
    }

    return 0
  }

  public async readAVPacket(formatContext: AVIFormatContext, avpacket: pointer<AVPacket>): Promise<number> {
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
          break
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

        if (type[0] === 'i' && type[1] === 'x' && this.getStreamIndex(type.slice(2)) < formatContext.streams.length
          || type === 'JUNK'
          || type === 'idx1'
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

  public async seek(formatContext: AVIFormatContext, stream: AVStream, timestamp: int64, flags: int32): Promise<int64> {

    const now = formatContext.ioReader.getPos()

    if (flags & AVSeekFlags.BYTE) {
      await formatContext.ioReader.seek(timestamp)
      if (!(flags & AVSeekFlags.ANY)) {
        await this.syncChunk(formatContext)
      }
      return now
    }

    if (!this.context.indexLoaded) {
      static_cast<int64>(errorType.OPERATE_NOT_SUPPORT)
    }

    const streamContext = stream.privData as AVIStreamContext

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

          let index = array.binarySearch(stContext.samples, (sample) => {
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
