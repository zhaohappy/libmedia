import { is } from '@libmedia/common'
import {
  getWebAssemblyResourceMetadata,
  type WebAssemblySource,
  type WebAssemblyResourceMetadata,
  type WebAssemblyVariant
} from '@libmedia/cheap'

/** Libmedia filename conventions are provenance hints, not inspection of WASM bytes. */
export default function getWasmResourceMetadata(source: WebAssemblySource): WebAssemblyResourceMetadata {
  if (source.metadata) {
    return getWebAssemblyResourceMetadata(source)
  }
  if (is.string(source.source)) {
    const filename = source.source.split(/[?#]/)[0].split('/').pop()
    const suffix = /-(atomic|simd|64)\.wasm$/.exec(filename)
    if (suffix) {
      return { variant: suffix[1] as WebAssemblyVariant, variantSource: 'filename' }
    }
    if (/^(h264|hevc|vvc|av1|aac|ac3|eac3|dca|mp3|mp3lame|mpeg2video|mpeg4|msmpeg4|theora|speex|opus|flac|vorbis|vp8|vp9|dvaudio|dvvideo|h261|h263|rv|ra|wma|wmv|mjpeg|png|webp|gif|tiff|bmp|pcm|adpcm|x264|x265|resample|scale|stretchpitch)\.wasm$/.test(filename)) {
      return { variant: 'baseline', variantSource: 'filename' }
    }
  }
  return { variant: 'unknown', variantSource: 'unknown' }
}
