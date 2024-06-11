import { createAVFrame, getAudioBuffer } from '../util/avframe'
import { AVSampleFormat } from '../audiosamplefmt'
import AVFrame from '../struct/avframe'
import { sampleFormatIsPlanar } from '../util/sample'
import { mapUint8Array } from 'cheap/std/memory'

function mapFormat(format: AudioDataFormat) {
  switch (format) {
    case 'u8':
      return AVSampleFormat.AV_SAMPLE_FMT_U8
    case 's16':
      return AVSampleFormat.AV_SAMPLE_FMT_S16
    case 's32':
      return AVSampleFormat.AV_SAMPLE_FMT_S32
    case 'f32':
      return AVSampleFormat.AV_SAMPLE_FMT_FLT
    case 'u8-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_U8P
    case 's16-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_S16P
    case 's32-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_S32P
    case 'f32-planar':
      return AVSampleFormat.AV_SAMPLE_FMT_FLTP
    default:
      throw new Error('not support')
  }
}

export function audioData2AVFrame(audioData: AudioData, avframe: pointer<AVFrame> = nullptr) {
  if (avframe === nullptr) {
    avframe = createAVFrame()
  }

  avframe.sampleRate = audioData.sampleRate
  avframe.nbSamples = audioData.numberOfFrames
  avframe.chLayout.nbChannels = audioData.numberOfChannels
  avframe.format = mapFormat(audioData.format)
  avframe.pts = static_cast<int64>(audioData.timestamp)

  getAudioBuffer(avframe)

  const planar = sampleFormatIsPlanar(avframe.format)
  const planes = planar ? avframe.chLayout.nbChannels : 1

  for (let i = 0; i < planes; i++) {
    audioData.copyTo(mapUint8Array(avframe.extendedData[i], avframe.linesize[0]), {
      planeIndex: i
    })
  }

  return avframe
}