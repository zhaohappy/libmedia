import AVCodecParameters from 'avutil/struct/avcodecparameters'
import IOReader from 'common/io/IOReader'
import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import { AVCodecID, AVMediaType } from 'avutil/codec'
import { WavTag2CodecId } from './riff'
import { getPcmCodecId } from 'avutil/util/pcm'
import { avMalloc } from 'avutil/util/mem'
import { mapSafeUint8Array } from 'cheap/std/memory'
import * as intread from 'avutil/util/intread'
import { AVChannelOrder } from 'avutil/audiosamplefmt'

function getWavCodecId(tag: int32, bitsPerCodedSample: int32) {
  let codecId: AVCodecID = WavTag2CodecId[tag]

  if (!codecId) {
    return AVCodecID.AV_CODEC_ID_NONE
  }

  if (codecId === AVCodecID.AV_CODEC_ID_PCM_U8) {
    codecId = getPcmCodecId(bitsPerCodedSample, false, false, ~1)
  }
  else if (codecId === AVCodecID.AV_CODEC_ID_PCM_F32LE) {
    codecId = getPcmCodecId(bitsPerCodedSample, true, false, 0)
  }

  if (codecId === AVCodecID.AV_CODEC_ID_ADPCM_IMA_WAV && bitsPerCodedSample === 8) {
    codecId = AVCodecID.AV_CODEC_ID_ADPCM_ZORK
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
      size   -= 22
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
