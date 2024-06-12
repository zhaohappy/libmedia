import { AVSampleFormat } from './audiosamplefmt'

export interface AVSampleFormatDescriptor {
  bits: number
  planar: boolean
}

export const AVSampleFormatDescriptors: Partial<Record<AVSampleFormat, AVSampleFormatDescriptor>> = {
  [AVSampleFormat.AV_SAMPLE_FMT_U8]: {
    bits: 8,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S16]: {
    bits: 16,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S32]: {
    bits: 32,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S64]: {
    bits: 64,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_FLT]: {
    bits: 32,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_DBL]: {
    bits: 64,
    planar: false
  },
  [AVSampleFormat.AV_SAMPLE_FMT_U8P]: {
    bits: 8,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S16P]: {
    bits: 16,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S32P]: {
    bits: 32,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_S64P]: {
    bits: 64,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_FLTP]: {
    bits: 32,
    planar: true
  },
  [AVSampleFormat.AV_SAMPLE_FMT_DBLP]: {
    bits: 64,
    planar: true
  },
}
