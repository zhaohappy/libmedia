export const enum MetaDataBlockType {
  STREAMINFO,
  PADDING,
  APPLICATION,
  SEEKTABLE,
  VORBIS_COMMENT,
  CUESHEET,
  PICTURE
}

export const enum FlacCHMode {
  INDEPENDENT = 0,
  LEFT_SIDE = 1,
  RIGHT_SIDE = 2,
  MID_SIDE = 3
}

export const FLAC_STREAMINFO_SIZE = 34
export const FLAC_MAX_CHANNELS = 8
export const FLAC_MIN_BLOCKSIZE = 16
export const FLAC_MAX_BLOCKSIZE = 65535
export const FLAC_MIN_FRAME_SIZE = 10

export const SampleSizeTable: number[] = [0, 8, 12, 0, 16, 20, 24, 32]

export const SampleRateTable: number[] = [
  0, 88200, 176400, 192000, 8000, 16000, 22050,
  24000, 32000, 44100, 48000, 96000,
  0, 0, 0, 0
]

export const BlockSizeTable: number[] = [
  0, 192, 576 << 0, 576 << 1, 576 << 2, 576 << 3, 0, 0,
  256 << 0, 256 << 1, 256 << 2, 256 << 3, 256 << 4, 256 << 5, 256 << 6, 256 << 7
]
