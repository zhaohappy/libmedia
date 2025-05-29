import { base64ToUint8Array } from 'common/util/base64'
import { AVCodecID } from '../codec'

let supportAtomic = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBgFgAX8BfwISAQNlbnYGbWVtb3J5AgMBgIACAwIBAAcJAQVsb2FkOAAACgoBCAAgAP4SAAAL'))
let supportSimd = WebAssembly.validate(base64ToUint8Array('AGFzbQEAAAABBQFgAAF7AhIBA2VudgZtZW1vcnkCAwGAgAIDAgEACgoBCABBAP0ABAAL'))

export default function getWasmUrl(baseUrl: string, type: 'decoder' | 'encoder' | 'resampler' | 'scaler' | 'stretchpitcher', codecId?: AVCodecID): string {

  let tag = defined(WASM_64) ? '-64' : (supportSimd ? '-simd' : (supportAtomic ? '-atomic' : ''))

  switch (type) {
    case 'decoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${baseUrl}/decode/pcm${tag}.wasm`
      }

      switch (codecId) {
        // mpeg1/2
        case AVCodecID.AV_CODEC_ID_MPEG2VIDEO:
          return `${baseUrl}/decode/mpeg2video${tag}.wasm`
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${baseUrl}/decode/h264${tag}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${baseUrl}/decode/theora${tag}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${baseUrl}/decode/aac${tag}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${baseUrl}/decode/ac3${tag}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${baseUrl}/decode/eac3${tag}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${baseUrl}/decode/dca${tag}.wasm`
        // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${baseUrl}/decode/mp3${tag}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${baseUrl}/decode/hevc${tag}.wasm`
        // VVC
        case AVCodecID.AV_CODEC_ID_VVC:
          return `${baseUrl}/decode/vvc${tag}.wasm`
        // Mpeg4
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${baseUrl}/decode/mpeg4${tag}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${baseUrl}/decode/av1${tag}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${baseUrl}/decode/speex${tag}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${baseUrl}/decode/opus${tag}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${baseUrl}/decode/flac${tag}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${baseUrl}/decode/vorbis${tag}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${baseUrl}/decode/vp8${tag}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${baseUrl}/decode/vp9${tag}.wasm`
        default:
          return null
      }
    }
    case 'encoder': {

      if (codecId > AVCodecID.AV_CODEC_ID_FIRST_AUDIO && codecId <= AVCodecID.AV_CODEC_ID_PCM_SGA) {
        return `${baseUrl}/encode/pcm${tag}.wasm`
      }

      switch (codecId) {
        // H264
        case AVCodecID.AV_CODEC_ID_H264:
          return `${baseUrl}/encode/x264${tag}.wasm`
        // theora
        case AVCodecID.AV_CODEC_ID_THEORA:
          return `${baseUrl}/encode/theora${tag}.wasm`
        // AAC
        case AVCodecID.AV_CODEC_ID_AAC:
          return `${baseUrl}/encode/aac${tag}.wasm`
        // ac3
        case AVCodecID.AV_CODEC_ID_AC3:
          return `${baseUrl}/encode/ac3${tag}.wasm`
        // eac3
        case AVCodecID.AV_CODEC_ID_EAC3:
          return `${baseUrl}/encode/eac3${tag}.wasm`
        // dts
        case AVCodecID.AV_CODEC_ID_DTS:
          return `${baseUrl}/encode/dca${tag}.wasm`
          // MP3
        case AVCodecID.AV_CODEC_ID_MP3:
          return `${baseUrl}/encode/mp3lame${tag}.wasm`
        // HEVC
        case AVCodecID.AV_CODEC_ID_HEVC:
          return `${baseUrl}/encode/x265${tag}.wasm`
        case AVCodecID.AV_CODEC_ID_MPEG4:
          return `${baseUrl}/encode/mpeg4${tag}.wasm`
        // AV1
        case AVCodecID.AV_CODEC_ID_AV1:
          return `${baseUrl}/encode/av1${tag}.wasm`
        // Speex
        case AVCodecID.AV_CODEC_ID_SPEEX:
          return `${baseUrl}/encode/speex${tag}.wasm`
        // Opus
        case AVCodecID.AV_CODEC_ID_OPUS:
          return `${baseUrl}/encode/opus${tag}.wasm`
        // flac
        case AVCodecID.AV_CODEC_ID_FLAC:
          return `${baseUrl}/encode/flac${tag}.wasm`
        // vorbis
        case AVCodecID.AV_CODEC_ID_VORBIS:
          return `${baseUrl}/encode/vorbis${tag}.wasm`
        // vp8
        case AVCodecID.AV_CODEC_ID_VP8:
          return `${baseUrl}/encode/vp8${tag}.wasm`
        // vp9
        case AVCodecID.AV_CODEC_ID_VP9:
          return `${baseUrl}/encode/vp9${tag}.wasm`
        default:
          return null
      }
    }
    case 'resampler':
      return `${baseUrl}/resample/resample${tag}.wasm`
    case 'scaler':
      return `${baseUrl}/scale/scale${tag}.wasm`
    case 'stretchpitcher':
      return `${baseUrl}/stretchpitch/stretchpitch${tag}.wasm`
  }
}
