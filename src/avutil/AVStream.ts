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

import { Data } from 'common/types/type'
import AVCodecParameters from './struct/avcodecparameters'
import { AVPacketSideDataType } from './codec'
import { NOPTS_VALUE, NOPTS_VALUE_BIGINT } from './constant'
import { Rational } from './struct/rational'

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

export const enum AVDisposition {
  NONE = 0,
  DEFAULT = 0x0001,
  DUB = 0x0002,
  ORIGINAL = 0x0004,
  COMMENT = 0x0008,
  LYRICS = 0x0010,
  KARAOKE = 0x0020,

  /**
   * Track should be used during playback by default.
   * Useful for subtitle track that should be displayed
   * even when user did not explicitly ask for subtitles.
   */
  FORCED = 0x0040,
  /**
   * stream for hearing impaired audiences
   */
  HEARING_IMPAIRED = 0x0080,
  /**
   * stream for visual impaired audiences
   */
  VISUAL_IMPAIRED = 0x0100,
  /**
   * stream without voice
   */
  CLEAN_EFFECTS = 0x0200,
  /**
   * The stream is stored in the file as an attached picture/"cover art" (e.g.
   * APIC frame in ID3v2). The first (usually only) packet associated with it
   * will be returned among the first few packets read from the file unless
   * seeking takes place. It can also be accessed at any time in
   * AVStream.attached_pic.
   */
  ATTACHED_PIC = 0x0400,
  /**
   * The stream is sparse, and contains thumbnail images, often corresponding
   * to chapter markers. Only ever used with AV_DISPOSITION_ATTACHED_PIC.
   */
  TIMED_THUMBNAILS = 0x0800,

  /**
   * To specify text track kind (different from subtitles default).
   */
  CAPTIONS = 0x10000,
  DESCRIPTIONS = 0x20000,
  METADATA = 0x40000,
  /**
   * dependent audio stream (mix_type=0 in mpegts)
   */
  DEPENDENT = 0x80000,
  /**
   * still images in video stream (still_picture_flag=1 in mpegts
   */
  STILL_IMAGE = 0x100000
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
  timeBase: Rational = make<Rational>()

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
    this.sampleIndexes.length = 0
    this.sampleIndexesPosMap.clear()
  }
}

export interface AVStreamInterface {
  index: number
  id: number
  codecpar: pointer<AVCodecParameters>
  nbFrames: int64
  metadata: Data
  duration: int64
  startTime: int64
  disposition: int32
  timeBase: Rational
}
