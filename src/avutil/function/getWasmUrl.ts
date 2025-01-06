import { base64ToUint8Array } from 'common/util/base64'
import { AVCodecID } from '../codec'

let supportAtomic = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBgFgAX8BfwISAQNlbnYGbWVtb3J5AgMBgIACAwIBAAcJAQVsb2FkOAAACgoBCAAgAP4SAAAL'))
let supportSimd = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBQFgAAF7AhIBA2VudgZtZW1vcnkCAwGAgAIDAgEACgoBCABBAP0ABAAL'))

export default function getWasmUrl(baseUrl: string, type: 'decoder' | 'encoder' | 'resampler' | 'scaler' | 'stretchpitcher', codecId?: AVCodecID): string {
  switch (type) {
    case 'decoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${baseUrl}/decode/pcm${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
      }

      switch (codecId) {
        // mpeg1/2
        case AVCodecID.AV_CODEC_ID_MPEG2VIDEO:
          return `${baseUrl}/decode/mpeg2video${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${baseUrl}/decode/h264${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${baseUrl}/decode/theora${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${baseUrl}/decode/aac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${baseUrl}/decode/ac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${baseUrl}/decode/eac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${baseUrl}/decode/dca${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${baseUrl}/decode/mp3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${baseUrl}/decode/hevc${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // VVC
        case AVCodecID.AV_CODEC_ID_VVC:
          return `${baseUrl}/decode/vvc${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Mpeg4
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${baseUrl}/decode/mpeg4${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${baseUrl}/decode/av1${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${baseUrl}/decode/speex${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${baseUrl}/decode/opus${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${baseUrl}/decode/flac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${baseUrl}/decode/vorbis${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${baseUrl}/decode/vp8${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${baseUrl}/decode/vp9${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        default:
          return null
      }
    }
    case 'encoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${baseUrl}/encode/pcm${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
      }

      switch (codecId) {
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${baseUrl}/encode/x264${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${baseUrl}/encode/theora${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${baseUrl}/encode/aac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${baseUrl}/encode/ac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${baseUrl}/encode/eac3${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${baseUrl}/encode/dca${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
          // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${baseUrl}/encode/mp3lame${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${baseUrl}/encode/x265${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${baseUrl}/encode/mpeg4${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${baseUrl}/encode/av1${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${baseUrl}/encode/speex${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${baseUrl}/encode/opus${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${baseUrl}/encode/flac${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${baseUrl}/encode/vorbis${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${baseUrl}/encode/vp8${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${baseUrl}/encode/vp9${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
        default:
          return null
      }
    }
    case 'resampler':
      return `${baseUrl}/resample/resample${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
    case 'scaler':
      return `${baseUrl}/scale/scale${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
    case 'stretchpitcher':
      return `${baseUrl}/stretchpitch/stretchpitch${supportSimd ? '-simd' : (supportAtomic ? '-atomic' : '')}.wasm`
  }
}
