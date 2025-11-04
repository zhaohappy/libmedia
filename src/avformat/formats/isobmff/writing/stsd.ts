/*
 * libmedia mp4 stsd box write
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
import type { IsobmffContext, IsobmffStreamContext } from '../type'
import { BoxType } from '../boxType'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import type IOWriter from 'common/io/IOWriterSync'
import type AVCodecParameters from 'avutil/struct/avcodecparameters'
import { AVPixelFormat } from 'avutil/pixfmt'

import avcc from './avcc'
import hvcc from './hvcc'
import vvcc from './vvcc'
import vpcc from './vpcc'
import av1c from './av1c'
import dlfa from './dfla'
import dops from './dops'
import esds from './esds'
import colr from './colr'
import pasp from './pasp'
import btrt from './btrt'
import wave from './wave'
import dac3 from './dac3'
import dec3 from './dec3'
import { mapUint8Array } from 'cheap/std/memory'
import digital2Tag from '../../../function/digital2Tag'
import mktag from '../../../function/mktag'

const AVCodecID2Tag = {
  [AVCodecID.AV_CODEC_ID_H264]: BoxType.AVC1,
  [AVCodecID.AV_CODEC_ID_HEVC]: BoxType.HVC1,
  [AVCodecID.AV_CODEC_ID_VVC]: BoxType.VVC1,
  [AVCodecID.AV_CODEC_ID_AV1]: BoxType.AV01,
  [AVCodecID.AV_CODEC_ID_VP9]: BoxType.VP09,
  [AVCodecID.AV_CODEC_ID_AC3]: BoxType.AC_3,
  [AVCodecID.AV_CODEC_ID_EAC3]: BoxType.EC_3,
  [AVCodecID.AV_CODEC_ID_WEBVTT]: BoxType.WVTT,
  [AVCodecID.AV_CODEC_ID_TTML]: BoxType.STPP,
  [AVCodecID.AV_CODEC_ID_MOV_TEXT]: BoxType.TX3G
}

function getTag(codecpar: AVCodecParameters): BoxType {
  if (codecpar.codecTag) {
    return digital2Tag(codecpar.codecTag) as BoxType
  }
  let tag = AVCodecID2Tag[codecpar.codecId]
  if (!tag) {
    if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      tag = BoxType.MP4V
    }
    else if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      if (codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
        tag = BoxType.OPUS
      }
      else if (codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC) {
        tag = BoxType.FLAC
      }
      else {
        tag = BoxType.MP4A
      }
    }
    else if (codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
      tag = BoxType.TEXT
    }
    else {
      tag = BoxType.NONE
    }
  }
  return tag
}

function writeSinf(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {

  const streamContext = stream.privData as IsobmffStreamContext
  const cenc = isobmffContext.cencs[streamContext.trackId]

  const pos = ioWriter.getPos()
  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(BoxType.SINF)

  ioWriter.writeUint32(12)
  ioWriter.writeString(BoxType.FRMA)
  ioWriter.writeString(getTag(stream.codecpar))

  ioWriter.writeUint32(20)
  ioWriter.writeString(BoxType.SCHM)
  ioWriter.writeUint32(0)
  ioWriter.writeUint32(cenc.schemeType || mktag('cenc'))
  ioWriter.writeUint32(cenc.schemeVersion || 0x10000)

  ioWriter.writeUint32(16 + cenc.defaultKeyId.length + 8 + (cenc.defaultConstantIV ? (1 + cenc.defaultConstantIV.length) : 0))
  ioWriter.writeString(BoxType.SCHI)
  ioWriter.writeUint32(16 + cenc.defaultKeyId.length + (cenc.defaultConstantIV ? (1 + cenc.defaultConstantIV.length) : 0))
  ioWriter.writeString(BoxType.TENC)
  if (cenc.cryptByteBlock || cenc.skipByteBlock || cenc.pattern) {
    ioWriter.writeUint8(1)
  }
  else {
    ioWriter.writeUint8(0)
  }
  ioWriter.writeUint24(0)

  ioWriter.writeUint8(0)
  ioWriter.writeUint8((((cenc.cryptByteBlock || 0) & 0x0f) << 4) | ((cenc.skipByteBlock || 0) & 0x0f))
  ioWriter.writeUint8(1)

  ioWriter.writeUint8(cenc.defaultPerSampleIVSize)
  ioWriter.writeBuffer(cenc.defaultKeyId)
  if (cenc.defaultConstantIV) {
    ioWriter.writeUint8(cenc.defaultConstantIV.length)
    ioWriter.writeBuffer(cenc.defaultConstantIV)
  }

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: BoxType.SINF,
    size: Number(ioWriter.getPos() - pos)
  })
}

function writeAudioTagHeader(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const version = isobmffContext.isom ? 1 : 0
  // Reserved
  ioWriter.writeUint32(0)
  // Reserved
  ioWriter.writeUint16(0)
  // Data-reference index
  ioWriter.writeUint16(1)

  // SoundDescription Version
  ioWriter.writeUint16(version)
  // SoundDescription Revision level
  ioWriter.writeUint16(0)
  // Reserved
  ioWriter.writeUint32(0)

  if (isobmffContext.isom) {
    ioWriter.writeUint16(stream.codecpar.chLayout.nbChannels)

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_U8
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S8
    ) {
      ioWriter.writeUint16(8)
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_G726) {
      ioWriter.writeUint16(stream.codecpar.bitsPerCodedSample)
    }
    else {
      ioWriter.writeUint16(16)
    }
    ioWriter.writeUint16(-2)
  }
  else {
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ALAC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS
    ) {
      ioWriter.writeUint16(stream.codecpar.chLayout.nbChannels)
    }
    else {
      ioWriter.writeUint16(2)
    }

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC
      || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ALAC
    ) {
      ioWriter.writeUint16(stream.codecpar.bitsPerRawSample)
    }
    else {
      ioWriter.writeUint16(16)
    }
    ioWriter.writeUint16(0)
  }

  // packet size (= 0) 
  ioWriter.writeUint16(0)

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
    ioWriter.writeUint16(48000)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_TRUEHD) {
    ioWriter.writeUint32(stream.codecpar.sampleRate)
  }
  else {
    ioWriter.writeUint16(stream.codecpar.sampleRate)
  }

  if (stream.codecpar.codecId !== AVCodecID.AV_CODEC_ID_TRUEHD) {
    // Reserved
    ioWriter.writeUint16(0)
  }

  // SoundDescription V1 extended info
  if (version === 1) {
    // Samples per packet
    ioWriter.writeUint32(stream.codecpar.frameSize)
    // Bytes per packet
    ioWriter.writeUint32(0)
    // Bytes per frame
    ioWriter.writeUint32(0)
    // Bytes per sample
    ioWriter.writeUint32(2)
  }
}

function writeAudioTagCodecpar(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const tag = getTag(stream.codecpar)

  if (isobmffContext.isom
    && (
      stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AMR_NB
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ALAC
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_MS
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_IMA_WAV
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_QDM2
    )
  ) {
    wave(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_FLAC) {
    dlfa(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_OPUS) {
    dops(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AC3) {
    dac3(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_EAC3) {
    dec3(ioWriter, stream, isobmffContext)
  }
  else if (tag == BoxType.MP4A) {
    esds(ioWriter, stream, isobmffContext)
  }
}

function writeAudioTag(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  const tag = getTag(stream.codecpar)

  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(tag)

  writeAudioTagHeader(ioWriter, stream, isobmffContext)
  writeAudioTagCodecpar(ioWriter, stream, isobmffContext)

  if (!isobmffContext.isom) {
    btrt(ioWriter, stream, isobmffContext)
  }

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: tag,
    size: Number(ioWriter.getPos() - pos)
  })
}

function writeEncaTag(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(BoxType.ENCA)

  writeAudioTagHeader(ioWriter, stream, isobmffContext)
  writeSinf(ioWriter, stream, isobmffContext)
  writeAudioTagCodecpar(ioWriter, stream, isobmffContext)

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: BoxType.ENCA,
    size: Number(ioWriter.getPos() - pos)
  })
}

function writeVideoTagHeader(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const uncompressedYcbcr = ((stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_RAWVIDEO
      && stream.codecpar.format == AVPixelFormat.AV_PIX_FMT_UYVY422
  )
    || (stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_RAWVIDEO
      && stream.codecpar.format == AVPixelFormat.AV_PIX_FMT_YUYV422
    )
    || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_V308
    || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_V408
    || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_V410
    || stream.codecpar.codecId == AVCodecID.AV_CODEC_ID_V210)
  // Reserved
  ioWriter.writeUint32(0)
  // Reserved
  ioWriter.writeUint16(0)
  // Data-reference index
  ioWriter.writeUint16(1)

  // Codec stream version
  ioWriter.writeUint16(uncompressedYcbcr ? 2 : 0)

  // Codec stream revision (=0)
  ioWriter.writeUint16(0)

  // Reserved
  if (isobmffContext.isom) {
    ioWriter.writeString('FFMP')
    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_RAWVIDEO || uncompressedYcbcr) {
      /* Temporal Quality */
      ioWriter.writeUint32(0)
      /* Spatial Quality = lossless*/
      ioWriter.writeUint32(0x400)
    }
    else {
      /* Temporal Quality = normal */
      ioWriter.writeUint32(0x200)
      /* Spatial Quality = normal */
      ioWriter.writeUint32(0x200)
    }
  }
  else {
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(0)
    ioWriter.writeUint32(0)
  }

  ioWriter.writeUint16(stream.codecpar.width)
  ioWriter.writeUint16(stream.codecpar.height)
  // Horizontal resolution 72dpi
  ioWriter.writeUint32(0x00480000)
  // Vertical resolution 72dpi
  ioWriter.writeUint32(0x00480000)
  // Data size (= 0)
  ioWriter.writeUint32(0)
  // Frame count (= 1)
  ioWriter.writeUint16(1)

  let compressorName: string = (stream.metadata['compressorName'] || '')
  compressorName = compressorName.slice(0, 31)
  ioWriter.writeUint8(compressorName.length)
  ioWriter.writeString(compressorName)
  if (compressorName.length < 31) {
    let len = 31 - compressorName.length
    while (len > 0) {
      ioWriter.writeUint8(0)
      len--
    }
  }

  // Reserved
  if (isobmffContext.isom && stream.codecpar.bitsPerCodedSample) {
    ioWriter.writeUint16(stream.codecpar.bitsPerCodedSample)
  }
  else {
    ioWriter.writeUint16(0x18)
  }

  ioWriter.writeUint16(0xffff)
}

function writeVideoTagCodecpar(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const tag = getTag(stream.codecpar)

  if (tag === BoxType.MP4V) {
    esds(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
    avcc(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
    hvcc(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC) {
    vvcc(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
    vpcc(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
    av1c(ioWriter, stream, isobmffContext)
  }
}

function writeEncvTag(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(BoxType.ENCV)

  writeVideoTagHeader(ioWriter, stream, isobmffContext)
  writeSinf(ioWriter, stream, isobmffContext)
  writeVideoTagCodecpar(ioWriter, stream, isobmffContext)

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: BoxType.ENCV,
    size: Number(ioWriter.getPos() - pos)
  })
}

function writeVideoTag(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  const tag = getTag(stream.codecpar)

  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(tag)

  writeVideoTagHeader(ioWriter, stream, isobmffContext)
  writeVideoTagCodecpar(ioWriter, stream, isobmffContext)

  colr(ioWriter, stream, isobmffContext)
  pasp(ioWriter, stream, isobmffContext)

  if (!isobmffContext.isom) {
    btrt(ioWriter, stream, isobmffContext)
  }

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: tag,
    size: Number(ioWriter.getPos() - pos)
  })
}

function writeSubtitleTag(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  const tag = getTag(stream.codecpar)

  // size
  ioWriter.writeUint32(0)
  ioWriter.writeString(tag)

  // Reserved
  ioWriter.writeUint32(0)
  // Reserved
  ioWriter.writeUint16(0)
  // Data-reference index
  ioWriter.writeUint16(1)

  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_DVD_SUBTITLE) {
    esds(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.extradata) {
    ioWriter.writeBuffer(mapUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(stream.codecpar.extradataSize)))
  }

  if (!isobmffContext.isom) {
    btrt(ioWriter, stream, isobmffContext)
  }

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: tag,
    size: Number(ioWriter.getPos() - pos)
  })
}


export default function write(ioWriter: IOWriter, stream: AVStream, isobmffContext: IsobmffContext) {
  const pos = ioWriter.getPos()
  // size
  ioWriter.writeUint32(0)
  // tag
  ioWriter.writeString(BoxType.STSD)

  const streamContext = stream.privData as IsobmffStreamContext

  const hasEncryption = isobmffContext.cencs && isobmffContext.cencs[streamContext.trackId]
    && (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO
      || stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO
    )
    && !isobmffContext.ignoreEncryption

  // version
  ioWriter.writeUint8(0)
  // flags
  ioWriter.writeUint24(0)
  // entry count
  ioWriter.writeUint32(hasEncryption ? 2 : 1)

  if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
    if (hasEncryption) {
      writeEncaTag(ioWriter, stream, isobmffContext)
    }
    writeAudioTag(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
    if (hasEncryption) {
      writeEncvTag(ioWriter, stream, isobmffContext)
    }
    writeVideoTag(ioWriter, stream, isobmffContext)
  }
  else if (stream.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
    writeSubtitleTag(ioWriter, stream, isobmffContext)
  }

  isobmffContext.boxsPositionInfo.push({
    pos,
    type: BoxType.ESDS,
    size: Number(ioWriter.getPos() - pos)
  })
}
