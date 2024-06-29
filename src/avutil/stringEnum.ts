import { AVFormat } from 'avformat/avformat'
import { AVCodecID } from './codec'
import { AVPixelFormat } from './pixfmt'
import { IOType } from 'avpipeline/IOPipeline'
import { AVSampleFormat } from './audiosamplefmt'

export const Ext2Format: Record<string, AVFormat> = {
  'flv': AVFormat.FLV,
  'mp4': AVFormat.MOV,
  'mov': AVFormat.MOV,
  'ts': AVFormat.MPEGTS,
  'ivf': AVFormat.IVF,
  'opus': AVFormat.OGGS,
  'ogg': AVFormat.OGGS,
  'm3u8': AVFormat.MPEGTS,
  'm3u': AVFormat.MPEGTS,
  'mpd': AVFormat.MOV,
  'mp3': AVFormat.MP3,
  'mkv': AVFormat.MATROSKA,
  'mka': AVFormat.MATROSKA,
  'webm': AVFormat.WEBM,
  'aac': AVFormat.AAC,
  'flac': AVFormat.FLAC,
  'wav': AVFormat.WAV
}

export const Ext2IOLoader: Record<string, IOType> = {
  'm3u8': IOType.HLS,
  'm3u': IOType.HLS,
  'mpd': IOType.DASH
}

export const VideoCodecString2CodecId = {
  'copy': AVCodecID.AV_CODEC_ID_NONE,
  'h264': AVCodecID.AV_CODEC_ID_H264,
  'avc': AVCodecID.AV_CODEC_ID_H264,
  'hevc': AVCodecID.AV_CODEC_ID_HEVC,
  'h265': AVCodecID.AV_CODEC_ID_HEVC,
  'vvc': AVCodecID.AV_CODEC_ID_VVC,
  'h266': AVCodecID.AV_CODEC_ID_VVC,
  'av1': AVCodecID.AV_CODEC_ID_AV1,
  'vp9': AVCodecID.AV_CODEC_ID_VP9,
  'vp8': AVCodecID.AV_CODEC_ID_VP8,
  'mpeg4': AVCodecID.AV_CODEC_ID_MPEG4
}

export const AudioCodecString2CodecId = {
  'copy': AVCodecID.AV_CODEC_ID_NONE,
  'aac': AVCodecID.AV_CODEC_ID_AAC,
  'mp3': AVCodecID.AV_CODEC_ID_MP3,
  'opus': AVCodecID.AV_CODEC_ID_OPUS,
  'flac': AVCodecID.AV_CODEC_ID_FLAC,
  'speex': AVCodecID.AV_CODEC_ID_SPEEX,
  'vorbis': AVCodecID.AV_CODEC_ID_VORBIS
}

export const PixfmtString2AVPixelFormat = {
  'yuv420p': AVPixelFormat.AV_PIX_FMT_YUV420P,
  'yuv422p': AVPixelFormat.AV_PIX_FMT_YUV422P,
  'yuv444p': AVPixelFormat.AV_PIX_FMT_YUV444P,

  'yuv420p10le': AVPixelFormat.AV_PIX_FMT_YUV420P10LE,
  'yuv422p10le': AVPixelFormat.AV_PIX_FMT_YUV422P10LE,
  'yuv444p10le': AVPixelFormat.AV_PIX_FMT_YUV444P10LE,

  'yuv420p10be': AVPixelFormat.AV_PIX_FMT_YUV420P10BE,
  'yuv422p10be': AVPixelFormat.AV_PIX_FMT_YUV422P10BE,
  'yuv444p10be': AVPixelFormat.AV_PIX_FMT_YUV444P10BE,
}

export const SampleFmtString2SampleFormat = {
  'u8': AVSampleFormat.AV_SAMPLE_FMT_U8,
  'u8p': AVSampleFormat.AV_SAMPLE_FMT_U8P,
  's16': AVSampleFormat.AV_SAMPLE_FMT_S16,
  's16p': AVSampleFormat.AV_SAMPLE_FMT_S16P,
  's32': AVSampleFormat.AV_SAMPLE_FMT_S32,
  's32p': AVSampleFormat.AV_SAMPLE_FMT_S32P,
  's64': AVSampleFormat.AV_SAMPLE_FMT_S64,
  's64p': AVSampleFormat.AV_SAMPLE_FMT_S64P,
  'float': AVSampleFormat.AV_SAMPLE_FMT_FLT,
  'floatp': AVSampleFormat.AV_SAMPLE_FMT_FLTP,
  'double': AVSampleFormat.AV_SAMPLE_FMT_DBL,
  'doublep': AVSampleFormat.AV_SAMPLE_FMT_DBLP,
}

export const Format2AVFormat: Record<string, AVFormat> = {
  'flv': AVFormat.FLV,
  'mp4': AVFormat.MOV,
  'mov': AVFormat.MOV,
  'ts': AVFormat.MPEGTS,
  'mpegts': AVFormat.MPEGTS,
  'ivf': AVFormat.IVF,
  'opus': AVFormat.OGGS,
  'ogg': AVFormat.OGGS,
  'm3u8': AVFormat.MPEGTS,
  'm3u': AVFormat.MPEGTS,
  'mpd': AVFormat.MOV,
  'mp3': AVFormat.MP3,
  'mkv': AVFormat.MATROSKA,
  'matroska': AVFormat.MATROSKA,
  'mka': AVFormat.MATROSKA,
  'webm': AVFormat.WEBM,
  'aac': AVFormat.AAC,
  'flac': AVFormat.FLAC,
  'wav': AVFormat.WAV
}