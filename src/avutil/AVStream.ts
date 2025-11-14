/*
 * libmedia AVStream defined
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import type { Data } from '@libmedia/common'
import AVCodecParameters from './struct/avcodecparameters'
import type { AVPacketSideDataType } from './codec'
import { NOPTS_VALUE, NOPTS_VALUE_BIGINT } from './constant'
import type { AVRational } from './struct/rational'
import type AVPacket from './struct/avpacket'
import { destroyAVPacket } from './util/avpacket'

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
   * 专辑表演者排序
   */
  ALBUM_ARTIST_SORT = 'albumArtistSort',
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
   * 作曲者排序
   */
  COMPOSER_SORT = 'composerSort',
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
  HANDLER_NAME = 'handlerName',
  /**
   * DRM 系统支持信息
   */
  ENCRYPTION = 'encryption'
}

export const enum AVDisposition {
  NONE = 0,
  /**
   * The stream should be chosen by default among other streams of the same type,
   * unless the user has explicitly specified otherwise.
   */
  DEFAULT = 1 << 0,
  /**
   * The stream is not in original language.
   *
   * @note AV_DISPOSITION_ORIGINAL is the inverse of this disposition. At most
   *       one of them should be set in properly tagged streams.
   * @note This disposition may apply to any stream type, not just audio.
   */
  DUB = 1 << 1,
  /**
   * The stream is in original language.
   *
   * @see the notes for AV_DISPOSITION_DUB
   */
  ORIGINAL = 1 << 2,
  /**
   * The stream is a commentary track.
   */
  COMMENT = 1 << 3,
  /**
   * The stream contains song lyrics.
   */
  LYRICS = 1 << 4,
  /**
   * The stream contains karaoke audio.
   */
  KARAOKE = 1 << 5,

  /**
   * Track should be used during playback by default.
   * Useful for subtitle track that should be displayed
   * even when user did not explicitly ask for subtitles.
   */
  FORCED = 1 << 6,
  /**
   * stream for hearing impaired audiences
   */
  HEARING_IMPAIRED = 1 << 7,
  /**
   * stream for visual impaired audiences
   */
  VISUAL_IMPAIRED = 1 << 8,
  /**
   * stream without voice
   */
  CLEAN_EFFECTS = 1 << 9,
  /**
   * The stream is stored in the file as an attached picture/"cover art" (e.g.
   * APIC frame in ID3v2). The first (usually only) packet associated with it
   * will be returned among the first few packets read from the file unless
   * seeking takes place. It can also be accessed at any time in
   * AVStream.attached_pic.
   */
  ATTACHED_PIC = 1 << 10,
  /**
   * The stream is sparse, and contains thumbnail images, often corresponding
   * to chapter markers. Only ever used with AV_DISPOSITION_ATTACHED_PIC.
   */
  TIMED_THUMBNAILS = 1 << 11,

  /**
   * The stream is intended to be mixed with a spatial audio track. For example,
   * it could be used for narration or stereo music, and may remain unchanged by
   * listener head rotation.
   */
  NON_DIEGETIC = 1 << 12,

  /**
   * The stream is sparse, thumbnail images for other stream in picture format like heif
   */
  THUMBNAIL = 1 << 13,

  /**
   * The subtitle stream contains captions, providing a transcription and possibly
   * a translation of audio. Typically intended for hearing-impaired audiences.
   */
  CAPTIONS = 1 << 16,
  /**
   * The subtitle stream contains a textual description of the video content.
   * Typically intended for visually-impaired audiences or for the cases where the
   * video cannot be seen.
   */
  DESCRIPTIONS = 1 << 17,
  /**
   * The subtitle stream contains time-aligned metadata that is not intended to be
   * directly presented to the user.
   */
  METADATA = 1 << 18,
  /**
   * The stream is intended to be mixed with another stream before presentation.
   * Used for example to signal the stream contains an image part of a HEIF grid,
   * or for mix_type=0 in mpegts.
   */
  DEPENDENT = 1 << 19,
  /**
   * still images in video stream (still_picture_flag=1 in mpegts
   */
  STILL_IMAGE = 1 << 20,
  /**
   * still images in video stream (still_picture_flag=1 in mpegts
   */
  MULTILAYER = 1 << 21
}

export const enum AVDiscard {
  /* We leave some space between them for extensions (drop some
    * keyframes for intra-only or drop just some bidir frames). */
  // /< discard nothing
  AVDISCARD_NONE = -16,
  // /< discard useless packets like 0 size packets in avi
  AVDISCARD_DEFAULT = 0,
  // /< discard all non reference
  AVDISCARD_NONREF = 8,
  // /< discard all bidirectional frames
  AVDISCARD_BIDIR = 16,
  // /< discard all non intra frames
  AVDISCARD_NONINTRA = 24,
  // /< discard all frames except keyframes
  AVDISCARD_NONKEY = 32,
  // /< discard all
  AVDISCARD_ALL = 48
}

export const enum AVStreamGroupParamsType {
  NONE,
  IAMF_AUDIO_ELEMENT,
  IAMF_MIX_PRESENTATION,
  TILE_GRID,
}

/**
 * from FFmpeg
 * 
 */
export default class AVStream {
  /**
   * stream index in AVFormatContext
   */
  index: int32 = NOPTS_VALUE

  /**
   * Format-specific stream ID.
   * decoding: set by libavformat
   * encoding: set by the user, replaced by libavformat if left unset
   */
  id: int32 = NOPTS_VALUE

  /**
   * format private data
   */
  privData: Data = null
  /**
   * demuxer or muxer's private data
   */
  privateData2: Data = null

  codecpar: AVCodecParameters = make<AVCodecParameters>(new AVCodecParameters())

  /**
   * An array of side data that applies to the whole stream (i.e. the
   * container does not allow it to change between packets).
   *
   * There may be no overlap between the side data in this array and side data
   * in the packets. I.e. a given side data is either exported by the muxer
   * (demuxing) / set by the caller (muxing) in this array, then it never
   * appears in the packets, or the side data is exported / sent through
   * the packets (always in the first packet where the value becomes known or
   * changes), then it does not appear in this array.
   *
   * - demuxing: Set by libavformat when the stream is created.
   * - muxing: May be set by the caller before write_header().
   *
   */
  sideData: Partial<Record<AVPacketSideDataType, Uint8Array>> = {}

  /**
   * number of frames in this stream if known or 0
   */
  nbFrames: int64 = 0n

  metadata: Data = {}

  /**
   * Decoding: duration of the stream, in stream time base.
   * If a source file does not specify a duration, but does specify
   * a bitrate, this value will be estimated from bitrate and file size.
   *
   * Encoding: May be set by the caller before avformat_write_header() to
   * provide a hint to the muxer about the estimated duration.
   */
  duration: int64 = NOPTS_VALUE_BIGINT

  /**
   * Decoding: pts of the first frame of the stream in presentation order, in stream time base.
   * Only set this if you are absolutely 100% sure that the value you set
   * it to really is the pts of the first frame.
   * This may be undefined (AV_NOPTS_VALUE).
   * @note The ASF header does NOT contain a correct start_time the ASF
   * demuxer must NOT set this.
   */
  startTime: int64 = NOPTS_VALUE_BIGINT

  /**
   * 第一个 packet 的 dts
   */
  firstDTS: int64 = NOPTS_VALUE_BIGINT

  /**
   * AV_DISPOSITION_* bit field
   */
  disposition: AVDisposition = AVDisposition.NONE

  /**
   * Selects which packets can be discarded at will and do not need to be demuxed.
   */
  discard: AVDiscard = AVDiscard.AVDISCARD_NONE

  /**
   *
   * 封装时间基
   * 
   * decoding: set by libavformat
   * encoding: May be set by the caller before avformat_write_header() to
   *           provide a hint to the muxer about the desired timebase. In
   *           avformat_write_header(), the muxer will overwrite this field
   *           with the timebase that will actually be used for the timestamps
   *           written into the file (which may or may not be related to the
   *           user-provided one, depending on the format).
   */
  timeBase: AVRational = make<AVRational>()

  /**
   * 帧索引，可用于 seek
   */
  sampleIndexes: {
    dts: int64
    pts: int64
    pos: int64
    size: int32
    duration: int64
    flags: int32
  }[] = []

  /**
   * pos 到 sample index 的映射
   */
  sampleIndexesPosMap: Map<int64, int32> = new Map()

  /**
   * For streams with AV_DISPOSITION_ATTACHED_PIC disposition, this packet
   * will contain the attached picture.
   *
   * decoding: set by libavformat, must not be modified by the caller.
   * encoding: unused
   */
  attachedPic: pointer<AVPacket> = nullptr

  public destroy() {
    if (this.codecpar) {
      this.codecpar.destroy()
      unmake(this.codecpar)
      this.codecpar = null
    }
    if (this.timeBase) {
      unmake(this.timeBase)
      this.timeBase = null
    }
    if (this.attachedPic) {
      destroyAVPacket(this.attachedPic)
      this.attachedPic = nullptr
    }
    this.sampleIndexes.length = 0
    this.sampleIndexesPosMap.clear()
  }
}

export class AVStreamGroupTileGrid {
  /**
   * Width of the canvas.
   *
   * Must be > 0.
   */
  codedWidth: int32 = 0
  /**
   * Width of the canvas.
   *
   * Must be > 0.
   */
  codedHeight: int32 = 0

  /**
   * An @ref nb_tiles sized array of offsets in pixels from the topleft edge
   * of the canvas, indicating where each stream should be placed.
   * It must be allocated with the av_malloc() family of functions.
   *
   * - demuxing: set by libavformat, must not be modified by the caller.
   * - muxing: set by the caller before avformat_write_header().
   *
   * Freed by libavformat in avformat_free_context().
   */
  offsets: {
    /**
     * Index of the stream in the group this tile references.
     *
     * Must be < @ref AVStreamGroup.nb_streams "nb_streams".
     */
    idx: int32
    /**
     * Offset in pixels from the left edge of the canvas where the tile
     * should be placed.
     */
    horizontal: int32
    /**
     * Offset in pixels from the top edge of the canvas where the tile
     * should be placed.
     */
    vertical: int32
  }[] = []

  /**
   * The pixel value per channel in RGBA format used if no pixel of any tile
   * is located at a particular pixel location.
   *
   * @see av_image_fill_color().
   * @see av_parse_color().
   */
  background: uint8[] = null

  /**
   * Offset in pixels from the left edge of the canvas where the actual image
   * meant for presentation starts.
   *
   * This field must be >= 0 and < @ref coded_width.
   */
  horizontalOffset: int32 = NOPTS_VALUE

  /**
   * Offset in pixels from the top edge of the canvas where the actual image
   * meant for presentation starts.
   *
   * This field must be >= 0 and < @ref coded_height.
   */
  verticalOffset: int32 = NOPTS_VALUE

  /**
   * Width of the final image for presentation.
   *
   * Must be > 0 and <= (@ref coded_width - @ref horizontal_offset).
   * When it's not equal to (@ref coded_width - @ref horizontal_offset), the
   * result of (@ref coded_width - width - @ref horizontal_offset) is the
   * amount amount of pixels to be cropped from the right edge of the
   * final image before presentation.
   */
  width: int32 = 0

  /**
   * Height of the final image for presentation.
   *
   * Must be > 0 and <= (@ref coded_height - @ref vertical_offset).
   * When it's not equal to (@ref coded_height - @ref vertical_offset), the
   * result of (@ref coded_height - height - @ref vertical_offset) is the
   * amount amount of pixels to be cropped from the bottom edge of the
   * final image before presentation.
   */
  height: int32 = 0

  /**
   * Additional data associated with the grid.
   *
   * Should be allocated with av_packet_side_data_new() or
   * av_packet_side_data_add(), and will be freed by avformat_free_context().
   */
  sideData: Partial<Record<AVPacketSideDataType, Uint8Array>> = {}
}

export class AVStreamGroup {
  /**
   * format private data
   */
  privData: Data = null

  /**
   * Group index in AVFormatContext.
   */
  index: int32 = NOPTS_VALUE

  /**
   * Group type-specific group ID.
   *
   * decoding: set by libavformat
   * encoding: may set by the user
   */
  id: int32 = NOPTS_VALUE

  /**
   * Group type
   *
   * decoding: set by libavformat on group creation
   * encoding: set by avformat_stream_group_create()
   */
  type: AVStreamGroupParamsType = AVStreamGroupParamsType.NONE

  /**
   * Group type-specific parameters
   */
  params: AVStreamGroupTileGrid = null

  /**
   * Metadata that applies to the whole group.
   *
   * - demuxing: set by libavformat on group creation
   * - muxing: may be set by the caller before avformat_write_header()
   *
   * Freed by libavformat in avformat_free_context().
   */
  metadata: Data = {}

  /**
   * A list of streams in the group. New entries are created with
   * avformat_stream_group_add_stream().
   *
   * - demuxing: entries are created by libavformat on group creation.
   *             If AVFMTCTX_NOHEADER is set in ctx_flags, then new entries may also
   *             appear in av_read_frame().
   * - muxing: entries are created by the user before avformat_write_header().
   *
   * Freed by libavformat in avformat_free_context().
   */
  streams: AVStream[] = []

  /**
   * Stream group disposition - a combination of AV_DISPOSITION_* flags.
   * This field currently applies to all defined AVStreamGroupParamsType.
   *
   * - demuxing: set by libavformat when creating the group or in
   *             avformat_find_stream_info().
   * - muxing: may be set by the caller before avformat_write_header().
   */
  disposition: int32 = 0

  destroy() {
    this.streams.length = 0
    this.params = null
  }
}

export interface AVStreamInterface {
  index: int32
  id: int32
  codecpar: pointer<AVCodecParameters>
  nbFrames: int64
  metadata: Data
  duration: int64
  startTime: int64
  disposition: int32
  timeBase: AVRational
  attachedPic: pointer<AVPacket>
}

export interface AVStreamGroupInterface {
  index: int32
  id: int32
  type: AVStreamGroupParamsType
  params: AVStreamGroupTileGrid
  metadata: Data
  streams: AVStreamInterface[]
  disposition: int32
}

export interface AVStreamMetadataEncryption {
  schemeType: number
  schemeVersion: number
  cryptByteBlock?: number
  skipByteBlock?: number
  perSampleIVSize: number
  kid: Uint8Array
  constantIV?: Uint8Array
  pattern?: boolean
}
