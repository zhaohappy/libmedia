import BitReader from 'common/io/BitReader'

export interface StreamInfo {
  minimumBlockSize: int16
  maximumBlockSize: int16
  minimumFrameSize: int32
  maximumFrameSize: int32
  sampleRate: int32
  channels: int32
  bitPerSample: int32
  samples: int64
  md5: string
}

export interface FrameInfo {
  sampleRate: int32
  channels: int32
  bps: int32
  blocksize: int32
  chMode: int32
  frameOrSampleNum: int64
  isVarSize: int32
}

export interface SeekPoint {
  pts: int64
  pos: int64
  samples: int32
}

export interface Track {
  offset: int64
  number: int32
  isrc: Uint8Array
  type: int32
  preEmphasisFlag: int32
  points: {
    offset: int64
    point: int32
  }[]
}

export interface CueSheet {
  catalogNumber: string
  leadInSamples: int64
  compactDisc: boolean
  tracks: Track[]
}

export interface Picture {
  type: int32
  mimeType: string
  description: string
  width: int32
  height: int32
  colorDepth: int32
  indexedColor: int32
  data: Uint8Array
}

export interface FlacContext {
  streamInfo: StreamInfo
  frameInfo: FrameInfo
  seekPoints: SeekPoint[]
  cueSheet: CueSheet
  picture: Picture

  firstFramePos: int64
  fileSize: int64
  cachePos: int64
  cacheBuffer: Uint8Array
  bitReader: BitReader
}