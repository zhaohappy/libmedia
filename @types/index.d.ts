
declare interface LibraryManagerInterface {
  library: Object
}

declare const LibraryManager: LibraryManagerInterface

declare function mergeInto(library: LibraryManagerInterface['library'], lib: Object): void

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

declare module 'cheap-worker-loader!*' {
  const content: new (...args: any[]) => any
  export default content
}

declare module '*.asm' {
  const content: string
  export default content
}

declare const DEBUG: boolean

declare const ENABLE_LOG_TRACE: boolean

declare const ENABLE_PROTOCOL_HLS: boolean

declare const ENABLE_PROTOCOL_DASH: boolean

declare const ENABLE_DEMUXER_MPEGTS: boolean

declare const ENABLE_DEMUXER_MP4: boolean

declare const ENABLE_DEMUXER_FLV: boolean

declare const ENABLE_DEMUXER_MP3: boolean

declare const ENABLE_DEMUXER_OGGS: boolean

declare const ENABLE_DEMUXER_IVF: boolean

declare const ENABLE_MSE: boolean

declare const ENABLE_WEBGPU: boolean

declare const ENABLE_RENDER_16: boolean

declare const ENABLE_THREADS: boolean

declare const API_OLD_CHANNEL_LAYOUT: boolean

declare const API_FRAME_KEY: boolean

declare const API_FRAME_PICTURE_NUMBER: boolean

declare const API_INTERLACED_FRAME: boolean

declare const API_PALETTE_HAS_CHANGED: boolean

declare const API_REORDERED_OPAQUE: boolean

declare const API_FRAME_PKT: boolean

declare const API_PKT_DURATION: boolean

declare const CHEAP_HEAP_INITIAL: number

declare const VERSION: string