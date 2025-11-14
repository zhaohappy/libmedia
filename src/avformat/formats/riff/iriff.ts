import { AMBISONIC_BASE_GUID, BROKEN_BASE_GUID, codecBmpGuid, MEDIASUBTYPE_BASE_GUID, WavTag2CodecId } from './riff'
import { mapSafeUint8Array } from '@libmedia/cheap'
import { type Data, logger } from '@libmedia/common'
import { type IOReader } from '@libmedia/common/io'
import { pcm, channel } from '@libmedia/avutil/internal'
import {
  AVCodecID,
  AVMediaType,
  errorType,
  avFree,
  avMalloc,
  intread,
  AVChannelOrder,
  type AVStream,
  type AVCodecParameters
} from '@libmedia/avutil'

export function getWavCodecId(tag: int32, bitsPerCodedSample: int32) {
  let codecId: AVCodecID = WavTag2CodecId[tag]

  if (!codecId) {
    return AVCodecID.AV_CODEC_ID_NONE
  }

  if (codecId === AVCodecID.AV_CODEC_ID_PCM_U8) {
    codecId = pcm.getPcmCodecId(bitsPerCodedSample, false, false, ~1)
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_PCM_F32LE) {
    codecId = pcm.getPcmCodecId(bitsPerCodedSample, true, false, 0)
  }

  if (codecId === AVCodecID.AV_CODEC_ID_ADPCM_IMA_WAV && bitsPerCodedSample === 8) {
    codecId = AVCodecID.AV_CODEC_ID_ADPCM_ZORK
  }

  return codecId
}

export function getGuidCodecId(guid: string) {
  let codecId: AVCodecID = codecBmpGuid[guid.toLocaleUpperCase()]

  if (!codecId) {
    return AVCodecID.AV_CODEC_ID_NONE
  }

  return codecId
}

export async function readFormatTag(ioReader: IOReader, codecpar: pointer<AVCodecParameters>, size: int32) {
  if (size < 14) {
    logger.error('wav format size < 14')
    return errorType.DATA_INVALID
  }

  codecpar.codecType = AVMediaType.AVMEDIA_TYPE_AUDIO

  const audioFormat = await ioReader.readUint16()
  let channels = await ioReader.readUint16()
  const sampleRate = await ioReader.readUint32()
  let bitrate = await ioReader.readUint32() * 8
  const blockAlgin = await ioReader.readUint16()

  codecpar.sampleRate = sampleRate
  codecpar.blockAlign = blockAlgin

  if (size === 14) {
    codecpar.bitsPerCodedSample = 8
  }
  else {
    codecpar.bitsPerCodedSample = await ioReader.readUint16()
  }

  if (audioFormat === 0xfffe) {
    codecpar.codecTag = 0
  }
  else {
    codecpar.codecTag = audioFormat
    codecpar.codecId = getWavCodecId(audioFormat, codecpar.bitsPerCodedSample)
  }

  if (size >= 18 && audioFormat !== 0x0165) {
    let cbSize = await ioReader.readUint16()
    size -= 18

    cbSize = Math.min(size, cbSize)

    if (cbSize >= 22 && audioFormat === 0xfffe) {
      // TODO parse wave format ex
      await ioReader.skip(22)
      cbSize -= 22
      size -= 22
    }

    if (cbSize > 0) {
      codecpar.extradata = avMalloc(cbSize)
      codecpar.extradataSize = cbSize
      await ioReader.readBuffer(cbSize, mapSafeUint8Array(codecpar.extradata, cbSize))

      size -= cbSize
    }

    if (size > 0) {
      await ioReader.skip(size)
    }
  }
  else if (audioFormat === 0x0165 && size >= 32) {
    size -= 4

    codecpar.extradata = avMalloc(reinterpret_cast<size>(size))
    codecpar.extradataSize = size
    await ioReader.readBuffer(size, mapSafeUint8Array(codecpar.extradata, reinterpret_cast<size>(size)))

    const streams = intread.rl16(codecpar.extradata + 4)
    codecpar.sampleRate = intread.rl32(codecpar.extradata + 12)

    channels = 0
    bitrate = 0

    if (size < 8 + streams * 20) {
      return errorType.DATA_INVALID
    }

    for (let i = 0; i < streams; i++) {
      channels += codecpar.extradata[8 + i * 20 + 17]
    }
  }

  codecpar.bitrate = BigInt(bitrate)

  if (codecpar.sampleRate < 0) {
    logger.error(`Invalid sample rate: ${codecpar.sampleRate}`)
    return errorType.DATA_INVALID
  }

  if (codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC_LATM) {
    channels = 0
    codecpar.sampleRate = 0
  }

  if (codecpar.codecId == AVCodecID.AV_CODEC_ID_ADPCM_G726 && codecpar.sampleRate) {
    codecpar.bitsPerCodedSample = static_cast<int32>(codecpar.bitrate) / codecpar.sampleRate
  }
  if (channels != codecpar.chLayout.nbChannels) {
    codecpar.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_UNSPEC
    codecpar.chLayout.nbChannels = channels
  }
  return 0
}

export async function readInfo(ioReader: IOReader, size: int64, metadata: Data) {
  const end = ioReader.getPos() + size
  while (ioReader.getPos() < end) {
    const key = await ioReader.readString(4)
    const size = await ioReader.readUint32()
    const value = await ioReader.readString(size)
    metadata[key] = value
    if (size % 2) {
      await ioReader.skip(1)
    }
  }
}

export async function readBmpHeader(ioReader: IOReader, stream: AVStream) {
  const esize = await ioReader.readUint32()
  stream.codecpar.width = await ioReader.readUint32()
  stream.codecpar.height = await ioReader.readUint32()
  await ioReader.skip(2)
  stream.codecpar.bitsPerCodedSample = await ioReader.readUint16()
  stream.codecpar.codecTag = await ioReader.readUint32()
  await ioReader.skip(20)
  return esize
}

export async function readWaveformatex(ioReader: IOReader, stream: AVStream) {
  const bsp = await ioReader.readUint16()
  if (bsp) {
    stream.codecpar.bitsPerCodedSample = bsp
  }
  const mask: uint32 = await ioReader.readUint32()
  channel.setChannelLayoutFromMask(addressof(stream.codecpar.chLayout), static_cast<uint64>(mask))
  const subFormat = (await ioReader.readHex(16)).toLocaleUpperCase()
  if (subFormat.slice(4) === AMBISONIC_BASE_GUID
    || subFormat.slice(4) === BROKEN_BASE_GUID
    || subFormat.slice(4) === MEDIASUBTYPE_BASE_GUID
  ) {
    stream.codecpar.codecTag = await ioReader.readUint32()
    stream.codecpar.codecId = getWavCodecId(reinterpret_cast<int32>(stream.codecpar.codecTag), stream.codecpar.bitsPerCodedSample)
  }
  else {
    stream.codecpar.codecId = getGuidCodecId(subFormat)
    if (!stream.codecpar.codecId) {
      logger.warn(`unknown subformat: ${subFormat}`)
    }
  }
}

export async function readWavHeader(ioReader: IOReader, stream: AVStream, size: int32) {
  if (size < 14) {
    logger.error('wav header size < 14')
    return errorType.DATA_INVALID
  }
  channel.unInitChannelLayout(addressof(stream.codecpar.chLayout))
  let id: number
  let channels: number
  let bitrate: number

  id = await ioReader.readUint16()
  if (id !== 0x0165 || ioReader.isBigEndian()) {
    channels = await ioReader.readUint16()
    stream.codecpar.sampleRate = await ioReader.readUint32()
    bitrate = (await ioReader.readUint32()) * 8
    stream.codecpar.blockAlign = await ioReader.readUint16()
  }

  if (size === 14) {
    stream.codecpar.bitsPerCodedSample = 8
  }
  else {
    stream.codecpar.bitsPerCodedSample = await ioReader.readUint16()
  }
  if (id === 0xFFFE) {
    stream.codecpar.codecTag = 0
  }
  else {
    stream.codecpar.codecTag = id
    stream.codecpar.codecId = getWavCodecId(id, stream.codecpar.bitsPerCodedSample)
  }
  if (size >= 18 && id != 0x0165) {
    let cbSize = await ioReader.readUint16()
    if (ioReader.isBigEndian()) {
      logger.error('WAVEFORMATEX support for RIFX files')
      return errorType.DATA_INVALID
    }
    size -= 18
    cbSize = Math.min(cbSize, size)
    if (cbSize >= 22 && id == 0xfffe) {
      await readWaveformatex(ioReader, stream)
      cbSize -= 22
      size -= 22
    }
    if (cbSize > 0) {
      if (stream.codecpar.extradata) {
        avFree(stream.codecpar.extradata)
      }
      stream.codecpar.extradataSize = cbSize
      stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(cbSize as uint32))
      await ioReader.readBuffer(cbSize, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(cbSize as uint32)))
      size -= cbSize
    }
    if (size > 0) {
      await ioReader.skip(size)
    }
  }
  else if (id == 0x0165 && size >= 32) {
    size -= 4
    if (stream.codecpar.extradata) {
      avFree(stream.codecpar.extradata)
    }
    stream.codecpar.extradataSize = size
    stream.codecpar.extradata = avMalloc(reinterpret_cast<size>(size))
    await ioReader.readBuffer(size, mapSafeUint8Array(stream.codecpar.extradata, reinterpret_cast<size>(size)))
    const nbStreams = intread.rl16(stream.codecpar.extradata + 4)
    stream.codecpar.sampleRate = intread.rl32(stream.codecpar.extradata + 12)
    if (size < 8 + nbStreams * 20) {
      return errorType.DATA_INVALID
    }
    for (let i = 0; i < nbStreams; i++) {
      channels += stream.codecpar.extradata[8 + i * 20 + 17]
    }
  }

  stream.codecpar.bitrate = static_cast<int64>(bitrate as int32)
  if (stream.codecpar.sampleRate < 0) {
    logger.error(`Invalid sample rate ${stream.codecpar.sampleRate}`)
    return errorType.DATA_INVALID
  }
  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_AAC_LATM) {
    channels = 0
    stream.codecpar.sampleRate = 0
  }
  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_G726 && stream.codecpar.sampleRate) {
    stream.codecpar.bitsPerCodedSample = static_cast<double>(stream.codecpar.bitrate) / stream.codecpar.sampleRate
  }
  if (channels !== stream.codecpar.chLayout.nbChannels) {
    channel.unInitChannelLayout(addressof(stream.codecpar.chLayout))
    stream.codecpar.chLayout.order = AVChannelOrder.AV_CHANNEL_ORDER_UNSPEC
    stream.codecpar.chLayout.nbChannels = channels
  }
  return 0
}
