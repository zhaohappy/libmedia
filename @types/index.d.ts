declare module '*.wgsl' {
  const content: string
  export default content
}

declare module '*.vert' {
  const content: string
  export default content
}

declare module '*.frag' {
  const content: string
  export default content
}

declare const ENABLE_LOG_TRACE: boolean

declare const ENABLE_PROTOCOL_HLS: boolean

declare const ENABLE_PROTOCOL_DASH: boolean

declare const ENABLE_DEMUXER_MPEGTS: boolean

declare const ENABLE_DEMUXER_MP4: boolean

declare const ENABLE_DEMUXER_FLV: boolean

declare const ENABLE_DEMUXER_MP3: boolean

declare const ENABLE_DEMUXER_OGGS: boolean

declare const ENABLE_DEMUXER_IVF: boolean

declare const ENABLE_DEMUXER_MATROSKA: boolean

declare const ENABLE_DEMUXER_AAC: boolean

declare const ENABLE_DEMUXER_FLAC: boolean

declare const ENABLE_DEMUXER_WAV: boolean

declare const ENABLE_MSE: boolean

declare const ENABLE_WEBGPU: boolean

declare const ENABLE_RENDER_16: boolean

declare const API_FRAME_KEY: boolean

declare const API_INTERLACED_FRAME: boolean

declare const API_PALETTE_HAS_CHANGED: boolean

declare const API_FRAME_PKT: boolean

declare const VERSION: string