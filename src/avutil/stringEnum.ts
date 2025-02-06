import { AVFormat, IOType } from './avformat'
import { AVCodecID, AVMediaType } from './codec'
import { AVColorPrimaries, AVColorRange, AVColorSpace, AVColorTransferCharacteristic, AVPixelFormat } from './pixfmt'
import { AVSampleFormat } from './audiosamplefmt'
import { AVDisposition } from './AVStream'

export const enum AVStreamMetadataKey {
  /**
   * 表演者（歌手、乐队等）
   */
  ARTIST = 'artist',
  /**
   * 自由文本评论
   */
  COMMENT = 'comment',
  /**
   * 版权声明
   */
  COPYRIGHT = 'copyright',
  /**
   * 发行年份（通常为 YYYY 格式）
   */
  DATE = 'date',
  /**
   * 音乐流派
   */
  GENRE = 'genre',
  /**
   * 语言
   */
  LANGUAGE = 'language',
  /**
   * 语言描述
   */
  LANGUAGE_STRING = 'languageString',
  /**
   * 歌曲或作品的标题
   */
  TITLE = 'title',
  /**
   * 专辑名称
   */
  ALBUM = 'album',
  /**
   * 曲目编号
   */
  TRACK = 'track',
  /**
   * 用于编码音频文件的软件信息
   */
  ENCODER = 'encoder',
  /**
   * 时间参数
   */
  TIME_CODE = 'timecode',
  /**
   * 发行商
   */
  VENDOR = 'vendor',
  /**
   * 发行商标识
   */
  VENDOR_ID = 'vendorId',
  /**
   * 海报
   */
  POSTER = 'poster',
  /**
   * 歌词
   */
  LYRICS = 'lyrics',
  /**
   * 专辑的主要艺术家（与 ARTIST 区分开，适用于合集专辑）
   */
  ALBUM_ARTIST = 'albumArtist',
  /**
   * 如果是多张 CD 的专辑，标识当前曲目所在的 CD
   */
  DISC = 'disc',
  /**
   * 具体的演奏者或表演者
   */
  PERFORMER = 'performer',
  /**
   * 发行者
   */
  PUBLISHER = 'publisher',
  /**
   * 作曲者
   */
  COMPOSER = 'composer',
  /**
   * 编曲者
   */
  COMPILATION = 'compilation',
  /**
   * 创建时间
   */
  CREATION_TIME = 'creationTime',
  /**
   * 最后更改时间
   */
  MODIFICATION_TIME = 'modificationTime',
  /**
   * 专辑排序
   */
  ALBUM_SORT = 'albumSort',
  /**
   * 表演者排序
   */
  ARTIST_SORT = 'artistSort',
  /**
   * 标题排序
   */
  TITLE_SORT = 'titleSort',
  /**
   * 分组
   */
  GROUPING = 'grouping',
  /**
   * 额外的描述信息
   */
  DESCRIPTION = 'description',
  /**
   * 许可信息
   */
  LICENSE = 'license',
  /**
   * 国际标准录音代码
   */
  ISRC = 'isrc',
  /**
   * 情绪标签，如 Happy、Sad
   */
  MOOD = 'mood',
  /**
   * mp4 的 elst box 内容
   */
  ELST = 'elst',
  /**
   * mp4 的旋转矩阵
   */
  MATRIX = 'matrix',
  /**
   * 某些媒体的样式（如 webvtt）
   */
  STYLES = 'styles',
  /**
   * 媒体的 mime
   */
  MIME = 'mime',
  /**
   * mp4 的 handlerName
   */
  HANDLER_NAME = 'handlerName'
}

export const CodecId2MimeType = {
  [AVCodecID.AV_CODEC_ID_MP3]: 'mp3',
  [AVCodecID.AV_CODEC_ID_AAC]: 'mp4a.40',
  [AVCodecID.AV_CODEC_ID_VORBIS]: 'vorbis',
  [AVCodecID.AV_CODEC_ID_FLAC]: 'flac',
  [AVCodecID.AV_CODEC_ID_OPUS]: 'opus',
  [AVCodecID.AV_CODEC_ID_PCM_MULAW]: 'ulaw',
  [AVCodecID.AV_CODEC_ID_PCM_ALAW]: 'alaw',

  [AVCodecID.AV_CODEC_ID_AV1]: 'av01',
  [AVCodecID.AV_CODEC_ID_H264]: 'avc1',
  [AVCodecID.AV_CODEC_ID_HEVC]: 'hev1',
  [AVCodecID.AV_CODEC_ID_VVC]: 'vvc1',
  [AVCodecID.AV_CODEC_ID_VP8]: 'vp8',
  [AVCodecID.AV_CODEC_ID_VP9]: 'vp09',
  [AVCodecID.AV_CODEC_ID_MPEG4]: 'mp4v'
}

export const Ext2Format: Record<string, AVFormat> = {
  'flv': AVFormat.FLV,
  'mp4': AVFormat.MOV,
  'mov': AVFormat.MOV,
  'ts': AVFormat.MPEGTS,
  'mts': AVFormat.MPEGTS,
  'm2ts': AVFormat.MPEGTS,
  'ivf': AVFormat.IVF,
  'opus': AVFormat.OGG,
  'oggs': AVFormat.OGG,
  'ogg': AVFormat.OGG,
  'm3u8': AVFormat.MPEGTS,
  'm3u': AVFormat.MPEGTS,
  'mpd': AVFormat.MOV,
  'mp3': AVFormat.MP3,
  'mkv': AVFormat.MATROSKA,
  'mka': AVFormat.MATROSKA,
  'webm': AVFormat.WEBM,
  'aac': AVFormat.AAC,
  'flac': AVFormat.FLAC,
  'wav': AVFormat.WAV,
  'srt': AVFormat.SUBRIP,
  'vtt': AVFormat.WEBVTT,
  'ssa': AVFormat.ASS,
  'ass': AVFormat.ASS,
  'xml': AVFormat.TTML,
  'ttml': AVFormat.TTML,
  'h264': AVFormat.H264,
  '264': AVFormat.H264,
  'avc': AVFormat.H264,
  'h265': AVFormat.HEVC,
  '265': AVFormat.HEVC,
  'hevc': AVFormat.HEVC,
  'h266': AVFormat.VVC,
  '266': AVFormat.VVC,
  'vvc': AVFormat.VVC,
  'mpeg': AVFormat.MPEGPS,
  'mpg': AVFormat.MPEGPS,
  'rtsp': AVFormat.RTSP,
  'rtmp': AVFormat.RTMP
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
  'mpeg4': AVCodecID.AV_CODEC_ID_MPEG4,
  'theora': AVCodecID.AV_CODEC_ID_THEORA,
  'mpeg2video': AVCodecID.AV_CODEC_ID_MPEG2VIDEO
}

export const AudioCodecString2CodecId = {
  'copy': AVCodecID.AV_CODEC_ID_NONE,
  'aac': AVCodecID.AV_CODEC_ID_AAC,
  'ac3': AVCodecID.AV_CODEC_ID_AC3,
  'eac3': AVCodecID.AV_CODEC_ID_EAC3,
  'dca': AVCodecID.AV_CODEC_ID_DTS,
  'mp3': AVCodecID.AV_CODEC_ID_MP3,
  'opus': AVCodecID.AV_CODEC_ID_OPUS,
  'flac': AVCodecID.AV_CODEC_ID_FLAC,
  'speex': AVCodecID.AV_CODEC_ID_SPEEX,
  'vorbis': AVCodecID.AV_CODEC_ID_VORBIS,
  'pcm_alaw': AVCodecID.AV_CODEC_ID_PCM_ALAW,
  'pcm_mulaw': AVCodecID.AV_CODEC_ID_PCM_MULAW
}

export const SubtitleCodecString2CodecId = {
  'webvtt': AVCodecID.AV_CODEC_ID_WEBVTT,
  'subrip': AVCodecID.AV_CODEC_ID_SUBRIP,
  'ass': AVCodecID.AV_CODEC_ID_ASS,
  'ttml': AVCodecID.AV_CODEC_ID_TTML,
  'mov_text': AVCodecID.AV_CODEC_ID_MOV_TEXT,
  'hdmv_pgs': AVCodecID.AV_CODEC_ID_HDMV_PGS_SUBTITLE,
  'hdmv_text': AVCodecID.AV_CODEC_ID_HDMV_TEXT_SUBTITLE,
  'dvd': AVCodecID.AV_CODEC_ID_DVD_SUBTITLE,
  'dvb': AVCodecID.AV_CODEC_ID_DVB_SUBTITLE,
  'eia_608': AVCodecID.AV_CODEC_ID_EIA_608
}

export const PixfmtString2AVPixelFormat = {
  'yuv420p': AVPixelFormat.AV_PIX_FMT_YUV420P,
  'yuv422p': AVPixelFormat.AV_PIX_FMT_YUV422P,
  'yuv444p': AVPixelFormat.AV_PIX_FMT_YUV444P,
  'yuva420p': AVPixelFormat.AV_PIX_FMT_YUVA420P,
  'yuva422p': AVPixelFormat.AV_PIX_FMT_YUVA422P,
  'yuva444p': AVPixelFormat.AV_PIX_FMT_YUVA444P,

  'yuv420p10le': AVPixelFormat.AV_PIX_FMT_YUV420P10LE,
  'yuv422p10le': AVPixelFormat.AV_PIX_FMT_YUV422P10LE,
  'yuv444p10le': AVPixelFormat.AV_PIX_FMT_YUV444P10LE,
  'yuva420p10le': AVPixelFormat.AV_PIX_FMT_YUVA420P10LE,
  'yuva422p10le': AVPixelFormat.AV_PIX_FMT_YUVA422P10LE,
  'yuva444p10le': AVPixelFormat.AV_PIX_FMT_YUVA444P10LE,

  'yuv420p10be': AVPixelFormat.AV_PIX_FMT_YUV420P10BE,
  'yuv422p10be': AVPixelFormat.AV_PIX_FMT_YUV422P10BE,
  'yuv444p10be': AVPixelFormat.AV_PIX_FMT_YUV444P10BE,
  'yuva420p10be': AVPixelFormat.AV_PIX_FMT_YUVA420P10BE,
  'yuva422p10be': AVPixelFormat.AV_PIX_FMT_YUVA422P10BE,
  'yuva444p10be': AVPixelFormat.AV_PIX_FMT_YUVA444P10BE,
}

export const SampleFmtString2SampleFormat = {
  'u8': AVSampleFormat.AV_SAMPLE_FMT_U8,
  'u8-planar': AVSampleFormat.AV_SAMPLE_FMT_U8P,
  's16': AVSampleFormat.AV_SAMPLE_FMT_S16,
  's16-planar': AVSampleFormat.AV_SAMPLE_FMT_S16P,
  's32': AVSampleFormat.AV_SAMPLE_FMT_S32,
  's32-planar': AVSampleFormat.AV_SAMPLE_FMT_S32P,
  's64': AVSampleFormat.AV_SAMPLE_FMT_S64,
  's64-planar': AVSampleFormat.AV_SAMPLE_FMT_S64P,
  'float': AVSampleFormat.AV_SAMPLE_FMT_FLT,
  'float-planar': AVSampleFormat.AV_SAMPLE_FMT_FLTP,
  'double': AVSampleFormat.AV_SAMPLE_FMT_DBL,
  'double-planar': AVSampleFormat.AV_SAMPLE_FMT_DBLP,
}

export const Format2AVFormat: Record<string, AVFormat> = {
  'flv': AVFormat.FLV,
  'mp4': AVFormat.MOV,
  'mov': AVFormat.MOV,
  'ts': AVFormat.MPEGTS,
  'mpegts': AVFormat.MPEGTS,
  'mpeg': AVFormat.MPEGPS,
  'ivf': AVFormat.IVF,
  'ogg': AVFormat.OGG,
  'opus': AVFormat.OGG,
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
  'wav': AVFormat.WAV,
  'raw_h264': AVFormat.H264,
  'raw_h265': AVFormat.HEVC,
  'raw_vvc': AVFormat.VVC,
  'rtsp': AVFormat.RTSP,
  'rtmp': AVFormat.RTMP
}

export const colorRange2AVColorRange: Record<string, AVColorRange> = {
  'tv': AVColorRange.AVCOL_RANGE_MPEG,
  'pc': AVColorRange.AVCOL_RANGE_JPEG
}

export const colorSpace2AVColorSpace: Record<string, AVColorSpace> = {
  'bt709': AVColorSpace.AVCOL_SPC_BT709,
  'fcc': AVColorSpace.AVCOL_SPC_FCC,
  'bt470bg': AVColorSpace.AVCOL_SPC_BT470BG,
  'smpte170m': AVColorSpace.AVCOL_SPC_SMPTE170M,
  'smpte240m': AVColorSpace.AVCOL_SPC_SMPTE240M,
  'ycgco': AVColorSpace.AVCOL_SPC_YCGCO,
  'gbr': AVColorSpace.AVCOL_SPC_RGB,
  'bt2020ncl': AVColorSpace.AVCOL_SPC_BT2020_NCL
}

export const colorPrimaries2AVColorPrimaries: Record<string, AVColorPrimaries> = {
  'bt709': AVColorPrimaries.AVCOL_PRI_BT709,
  'bt470m': AVColorPrimaries.AVCOL_PRI_BT470M,
  'bt470bg': AVColorPrimaries.AVCOL_PRI_BT470BG,
  'smpte170m': AVColorPrimaries.AVCOL_PRI_SMPTE170M,
  'smpte240m': AVColorPrimaries.AVCOL_PRI_SMPTE240M,
  'smpte428': AVColorPrimaries.AVCOL_PRI_SMPTE428,
  'film': AVColorPrimaries.AVCOL_PRI_FILM,
  'smpte431': AVColorPrimaries.AVCOL_PRI_SMPTE431,
  'smpte432': AVColorPrimaries.AVCOL_PRI_SMPTE432,
  'bt2020': AVColorPrimaries.AVCOL_PRI_BT2020,
  'jedec-p22': AVColorPrimaries.AVCOL_PRI_JEDEC_P22,
  'ebu3213': AVColorPrimaries.AVCOL_PRI_EBU3213
}

export const colorTrc2AVColorTransferCharacteristic: Record<string, AVColorTransferCharacteristic> = {
  'bt709': AVColorTransferCharacteristic.AVCOL_TRC_BT709,
  'gamma22': AVColorTransferCharacteristic.AVCOL_TRC_GAMMA22,
  'gamma28': AVColorTransferCharacteristic.AVCOL_TRC_GAMMA28,
  'smpte170m': AVColorTransferCharacteristic.AVCOL_TRC_SMPTE170M,
  'smpte240m': AVColorTransferCharacteristic.AVCOL_TRC_SMPTE240M,
  'srgb': AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_1,
  'xvycc': AVColorTransferCharacteristic.AVCOL_TRC_IEC61966_2_4,
  'bt2020-10': AVColorTransferCharacteristic.AVCOL_TRC_BT2020_10,
  'bt2020-12': AVColorTransferCharacteristic.AVCOL_TRC_BT2020_12
}

export const mediaType2AVMediaType: Record<string, AVMediaType> = {
  'Audio': AVMediaType.AVMEDIA_TYPE_AUDIO,
  'Video': AVMediaType.AVMEDIA_TYPE_VIDEO,
  'Subtitle': AVMediaType.AVMEDIA_TYPE_SUBTITLE,
  'Attachment': AVMediaType.AVMEDIA_TYPE_ATTACHMENT,
  'Data': AVMediaType.AVMEDIA_TYPE_DATA
}

export const disposition2AVDisposition: Record<string, AVDisposition> = {
  'default': AVDisposition.DEFAULT,
  'dub': AVDisposition.DUB,
  'original': AVDisposition.ORIGINAL,
  'comment': AVDisposition.COMMENT,
  'lyrics': AVDisposition.LYRICS,
  'karaoke': AVDisposition.KARAOKE,
  'forced': AVDisposition.FORCED,
  'hearing impaired': AVDisposition.HEARING_IMPAIRED,
  'visual impaired': AVDisposition.VISUAL_IMPAIRED,
  'clean effects': AVDisposition.CLEAN_EFFECTS,
  'attached pic': AVDisposition.ATTACHED_PIC,
  'timed thumbnails': AVDisposition.TIMED_THUMBNAILS,
  'captions': AVDisposition.CAPTIONS,
  'descriptions': AVDisposition.DESCRIPTIONS,
  'metadata': AVDisposition.METADATA,
  'dependent': AVDisposition.DEPENDENT,
  'still image': AVDisposition.STILL_IMAGE
}
