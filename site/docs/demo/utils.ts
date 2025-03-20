import { AVCodecID } from '@libmedia/avutil/codec'
import IOReader from '@libmedia/common/io/IOReader'
import { base64ToUint8Array } from '@libmedia/common/util/base64'
import FetchIOloader from '@libmedia/avnetwork/ioLoader/FetchIOLoader'
import FileIOLoader from '@libmedia/avnetwork/ioLoader/FileIOLoader'
import HlsIOLoader from '@libmedia/avnetwork/ioLoader/HlsIOLoader'
import DashIOLoader from '@libmedia/avnetwork/ioLoader/DashIOLoader'
import IOLoader from '@libmedia/avnetwork/ioLoader/IOLoader'
import * as is from '@libmedia/common/util/is'
import * as url from '@libmedia/common/util/url'

import IMovFormat from '@libmedia/avformat/formats/IMovFormat'
import IFlvFormat from '@libmedia/avformat/formats/IFlvFormat'
import IAacFormat from '@libmedia/avformat/formats/IAacFormat'
import IFlacFormat from '@libmedia/avformat/formats/IFlacFormat'
import IMatroskaFormat from '@libmedia/avformat/formats/IMatroskaFormat'
import IMp3Format from '@libmedia/avformat/formats/IMp3Format'
import IMpegpsFormat from '@libmedia/avformat/formats/IMpegpsFormat'
import IMpegtsFormat from '@libmedia/avformat/formats/IMpegtsFormat'
import IOggFormat from '@libmedia/avformat/formats/IOggFormat'
import IIvfFormat from '@libmedia/avformat/formats/IIvfFormat'
import IWavFormat from '@libmedia/avformat/formats/IWavFormat'
import IH264Format from '@libmedia/avformat/formats/IH264Format'
import IHevcFormat from '@libmedia/avformat/formats/IVvcFormat'
import IVvcFormat from '@libmedia/avformat/formats/IVvcFormat'
import analyzeAVFormat from '@libmedia/avutil/function/analyzeAVFormat'
import IFormat from '@libmedia/avformat/formats/IFormat'
import { AVFormat, IOFlags } from '@libmedia/avutil/avformat'
import { Ext2Format } from '@libmedia/avutil/stringEnum'

const BASE_URL = 'https://zhaohappy.github.io/libmedia'
const BASE_CDN = 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist'

export function formatUrl(
  url: string,
): string {
  const base =
    window.location.hostname.includes('webcontainer.io') ||
    window.location.hostname.includes('stackblitz.io') ||
    window.location.hostname.includes('csb.app')
      ? (BASE_URL + '/docs')
      : '';
  const prefix = process.env.NODE_ENV === 'development' ? '/' : '/libmedia/docs/'
  return `${base}${prefix}${url}`
}

let supportAtomic = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBgFgAX8BfwISAQNlbnYGbWVtb3J5AgMBgIACAwIBAAcJAQVsb2FkOAAACgoBCAAgAP4SAAAL'))
let supportSimd = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBQFgAAF7AhIBA2VudgZtZW1vcnkCAwGAgAIDAgEACgoBCABBAP0ABAAL'))

export function getWasm(type: 'decoder' | 'encoder' | 'resampler' | 'scaler' | 'stretchpitcher', codecId?: AVCodecID): string {
  switch (type) {
    case 'decoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${BASE_CDN}/decode/pcm${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
      }

      switch (codecId) {
        // mpeg1/2
        case AVCodecID.AV_CODEC_ID_MPEG2VIDEO:
          return `${BASE_CDN}/decode/mpeg2video${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${BASE_CDN}/decode/h264${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${BASE_CDN}/decode/theora${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${BASE_CDN}/decode/aac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${BASE_CDN}/decode/ac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${BASE_CDN}/decode/eac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${BASE_CDN}/decode/dca${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${BASE_CDN}/decode/mp3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${BASE_CDN}/decode/hevc${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // VVC
        case AVCodecID.AV_CODEC_ID_VVC:
          return `${BASE_CDN}/decode/vvc${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Mpeg4
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${BASE_CDN}/decode/mpeg4${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${BASE_CDN}/decode/av1${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${BASE_CDN}/decode/speex${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${BASE_CDN}/decode/opus${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${BASE_CDN}/decode/flac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${BASE_CDN}/decode/vorbis${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${BASE_CDN}/decode/vp8${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${BASE_CDN}/decode/vp9${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        default:
          return null
      }
    }
    case 'encoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${BASE_CDN}/encode/pcm${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
      }

      switch (codecId) {
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${BASE_CDN}/encode/x264${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${BASE_CDN}/encode/theora${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${BASE_CDN}/encode/aac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${BASE_CDN}/encode/ac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${BASE_CDN}/encode/eac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${BASE_CDN}/encode/dca${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
          // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${BASE_CDN}/encode/mp3lame${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${BASE_CDN}/encode/x265${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${BASE_CDN}/encode/mpeg4${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${BASE_CDN}/encode/av1${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${BASE_CDN}/encode/speex${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${BASE_CDN}/encode/opus${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${BASE_CDN}/encode/flac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${BASE_CDN}/encode/vorbis${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${BASE_CDN}/encode/vp8${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${BASE_CDN}/encode/vp9${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        default:
          return null
      }
    }
    case 'resampler':
      return `${BASE_CDN}/resample/resample${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
    case 'scaler':
      return `${BASE_CDN}/scale/scale${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
    case 'stretchpitcher':
      return `${BASE_CDN}/stretchpitch/stretchpitch${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
    }
}

export async function getIOReader(source: string | File) {
  const ioReader = new IOReader()
  let ioloader: IOLoader
  if (is.string(source)) {
    const ext = url.parse(source).file.split('.').pop()
    if (ext === 'm3u8') {
      ioloader = new HlsIOLoader()
    }
    else if (ext === 'mpd') {
      ioloader = new DashIOLoader()
    }
    else {
      ioloader = new FetchIOloader()
    }
    await ioloader.open(
      {
        url: source
      },
      {
        from: 0,
        to: -1
      }
    )
  }
  else {
    ioloader = new FileIOLoader()
    await ioloader.open(
      {
        file: source
      },
      {
        from: 0,
        to: -1
      }
    )
  }

  ioReader.onFlush = async (buffer) => {
    return ioloader.read(buffer)
  }
  ioReader.onSeek = (pos) => {
    return ioloader.seek(pos)
  }

  ioReader.onSize = () => {
    return ioloader.size()
  }
  ioReader.flags |= IOFlags.SEEKABLE
  
  return ioReader
}

export async function getAVFormat(ioReader: IOReader, source: string | File) {

  const ext = (is.string(source) ? url.parse(source).file : source.name).split('.').pop()

  const format = await analyzeAVFormat(ioReader, Ext2Format[ext] || AVFormat.UNKNOWN)

  let iformat: IFormat

  switch (format) {
    case AVFormat.FLV:
      iformat = new IFlvFormat()
      break
    case AVFormat.MP4:
      iformat = new IMovFormat()
      break
    case AVFormat.MPEGTS:
      iformat = new IMpegtsFormat()
      break
    case AVFormat.MPEGPS:
      iformat = new IMpegpsFormat()
      break
    case AVFormat.IVF:
      iformat = new IIvfFormat()
      break
    case AVFormat.OGG:
      iformat = new IOggFormat()
      break
    case AVFormat.MP3:
      iformat = new IMp3Format()
      break
    case AVFormat.MATROSKA:
    case AVFormat.WEBM:
      iformat = new IMatroskaFormat()
      break
    case AVFormat.AAC:
      iformat = new IAacFormat()
      break
    case AVFormat.FLAC:
      iformat = new IFlacFormat()
      break
    case AVFormat.WAV:
      iformat = new IWavFormat()
      break
    case AVFormat.H264:
      iformat = new IH264Format()
      break
    case AVFormat.HEVC:
      iformat = new IHevcFormat()
      break
    case AVFormat.VVC:
      iformat = new IVvcFormat()
      break
    default:
  }

  return iformat
}

const musicExt: string[] = ['mp3', 'aac', 'flac', 'ogg', 'wav', 'm4a', 'mka', 'opus']
const movExt: string[] = ['mp4', 'webm', 'mkv', 'flv', 'ts', 'mov', 'm4s', 'h264', '264', 'avc',
  'h265', '265', 'hevc', 'h266', '266', 'vvc', 'ivf', 'mpeg'
]
const subtitleExt: string[] = ['ass', 'ssa', 'vvt', 'srt', 'xml', 'ttml']

export function getAccept() {
  return musicExt.concat(movExt).concat(subtitleExt).map((i) => '.' + i).join(', ')
}