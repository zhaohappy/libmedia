/*
 * libmedia mpegts identify defined
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

import { AVCodecID, AVMediaType } from 'avutil/codec'

export const TS_FEC_PACKET_SIZE = 204

export const TS_DVHS_PACKET_SIZE = 192

export const TS_PACKET_SIZE = 188

export const TS_MAX_PACKET_SIZE = 204

export const NB_PID_MAX = 8192

export const USUAL_SECTION_SIZE = 1024

export const MAX_SECTION_SIZE = 4096

export const PROBE_PACKET_MAX_BUF = 8192

export const PROBE_PACKET_MARGIN = 5

/**
 * maximum size in which we look for synchronization if
 * synchronization is lost 
 */
export const MAX_RESYNC_SIZE = 65536

export const MAX_PES_PAYLOAD = 200 * 1024

export const MAX_MP4_DESCR_COUNT = 16

export const REGISTRATION_DESCRIPTOR = 0x05

export const ISO_639_LANGUAGE_DESCRIPTOR = 0x0a

export const enum TSPid {
  /**
   * Program Association Table
   */
  PAT = 0x0000,
  /**
   * Conditional Access Table
   */
  CAT = 0x0001,
  /**
   * Transport Stream Description Table
   */
  TSDT = 0x0002,
  IPMP = 0x0003,

  /**
   * PID from 0x0004 to 0x000F are reserved
   */

  /**
   * Network Information Table
   */
  NIT = 0x0010,
  /**
   * Service Description Table
   */
  SDT = 0x0011,
  /**
   * Bouquet Association Table
   */
  BAT = 0x0011,
  /**
   * Event Information Table
   */
  EIT = 0x0012,
  /**
   * Running Status Table
   */
  RST = 0x0013,
  /**
   * Time and Date Table 
   */
  TDT = 0x0014,
  TOT = 0x0014,
  NET_SYNC = 0x0015,
  /**
   * RAR Notification Table
   */
  RNT = 0x0016,

  /**
   * PID from 0x0017 to 0x001B are reserved for future use
   * 
   */

  /**
   * PID value 0x001C allocated to link-local inband signalling shall not be
   * used on any broadcast signals. It shall only be used between devices in a
   * controlled environment. 
   */
  LINK_LOCAL = 0x001C,
  MEASUREMENT = 0x001D,
  /**
   * Discontinuity Information Table
   */
  DIT = 0x001E,
  /**
   * Selection Information Table
   */
  SIT = 0x001F,
  /**
   * PID from 0x0020 to 0x1FFA may be assigned as needed to PMT, elementary
   * streams and other data tables
   */
  FIRST_OTHER = 0x0020,
  LAST_OTHER = 0x1FFA,
  /**
   * PID 0x1FFB is used by DigiCipher 2/ATSC MGT metadata
   * PID from 0x1FFC to 0x1FFE may be assigned as needed to PMT, elementary
   * streams and other data tables
   */

  /**
   * Null packet (used for fixed bandwidth padding)
   */
  NULL = 0x1FFF,
  /**
   * m2ts pids
   */
  M2TS_PMT = 0x0100,
  M2TS_PCR = 0x1001,
  M2TS_VIDEO = 0x1011,
  M2TS_AUDIO_START = 0x1100,
  M2TS_PGSSUB_START = 0x1200,
  M2TS_TEXTSUB = 0x1800,
  M2TS_SECONDARY_AUDIO_START = 0x1A00,
  M2TS_SECONDARY_VIDEO_START = 0x1B00
}

export const enum TSTid {
  /**
   * Program Association section
   */
  PAT = 0x00,
  /**
   * Conditional Access section 
   */
  CAT = 0x01,
  /**
   * Program Map section
   */
  PMT = 0x02,
  /**
   * Transport Stream Description section 
   */
  TSDT = 0x03,

  /**
   * TID from 0x04 to 0x3F are reserved
   */

  M4OD = 0x05,
  /**
   * Network Information section - actual network
   */
  NIT = 0x40,
  /**
   * Network Information section - actual network
   */
  ONIT = 0x41,
  /**
   * Service Description section - actual TS
   */
  SDT = 0x42,

  /**
   * TID from 0x43 to 0x45 are reserved for future use
   */

  /**
   * Service Descrition section - other TS 
   */
  OSDT = 0x46,

  /**
   * TID from 0x47 to 0x49 are reserved for future use
   */

  /**
   * Bouquet Association section
   */
  BAT = 0x4A,
  /**
   * Update Notification Table section
   */
  UNT = 0x4B,
  /**
   * Downloadable Font Info section
   */
  DFI = 0x4C,

  /**
   * TID 0x4D is reserved for future use 
   */

  /**
   * Event Information section - actual TS
   */
  EIT = 0x4E,
  /**
   * Event Information section - other TS
   */
  OEIT = 0x4F,
  /**
   * Event Information section schedule - actual TS 
   */
  EITS_START = 0x50,
  /**
   * Event Information section schedule - actual TS 
   */
  EITS_END = 0x5F,
  /**
   *  Event Information section schedule - other TS
   */
  OEITS_START = 0x60,
  /**
   * Event Information section schedule - other TS
   */
  OEITS_END = 0x6F,
  /**
   * Time Date section
   */
  TDT = 0x70,
  /**
   * Running Status section
   */
  RST = 0x71,
  /**
   * Stuffing section
   */
  ST = 0x72,
  /**
   * Time Offset section
   */
  TOT = 0x73,
  /**
   * Application Inforamtion section
   */
  AIT = 0x74,
  /**
   * Container section
   */
  CT = 0x75,
  /**
   * Related Content section
   */
  RCT = 0x76,
  /**
   * Related Content section
   */
  CIT = 0x77,
  /**
   * MPE-FEC section
   */
  MPE_FEC = 0x78,
  /**
   * Resolution Provider Notification section
   */
  RPNT = 0x79,
  /**
   * MPE-IFEC section
   */
  MPE_IFEC = 0x7A,
  /**
   * Protection Message section
   */
  PROTMT = 0x7B,

  /**
   * TID from 0x7C to 0x7D are reserved for future use
   */

  /**
   * Discontinuity Information section
   */
  DIT = 0x7E,
  /**
   * Selection Information section
   */
  SIT = 0x7F

  /**
   * TID from 0x80 to 0xFE are user defined
   * TID 0xFF is reserved
   */
}

export const enum TSStreamType {
  NONE = 0x00,
  VIDEO_MPEG1 = 0x01,
  VIDEO_MPEG2 = 0x02,
  AUDIO_MPEG1 = 0x03,
  AUDIO_MPEG2 = 0x04,
  PRIVATE_SECTION = 0x05,
  PRIVATE_DATA = 0x06,
  AUDIO_AAC = 0x0f,
  AUDIO_AAC_LATM = 0x11,
  VIDEO_MPEG4 = 0x10,
  METADATA = 0x15,
  VIDEO_H264 = 0x1b,
  VIDEO_HEVC = 0x24,
  VIDEO_VVC = 0x33,
  VIDEO_CAVS = 0x42,
  VIDEO_VC1 = 0xea,
  VIDEO_DIRAC = 0xd1,

  AUDIO_AC3 = 0x81,
  AUDIO_DTS = 0x82,
  AUDIO_TRUEHD = 0x83,
  kSCTE35 = 0x86,
  AUDIO_EAC3 = 0x87
}

/**
 * ISO/IEC 13818-1 Table 2-22
 */
export const enum TSStreamId {
  PROGRAM_STREAM_MAP = 0xbc,
  PRIVATE_STREAM_1 = 0xbd,
  PADDING_STREAM = 0xbe,
  PRIVATE_STREAM_2 = 0xbf,
  AUDIO_STREAM_0 = 0xc0,
  VIDEO_STREAM_0 = 0xe0,
  ECM_STREAM = 0xf0,
  EMM_STREAM = 0xf1,
  DSMCC_STREAM = 0xf2,
  TYPE_E_STREAM = 0xf8,
  METADATA_STREAM = 0xfc,
  EXTENDED_STREAM_ID = 0xfd,
  PROGRAM_STREAM_DIRECTORY = 0xff
}

/**
 * ISO/IEC 13818-1 Table 2-45
 */
export const enum TSDescriptor {
  VIDEO_STREAM = 0x02,
  REGISTRATION = 0x05,
  ISO_639_LANGUAGE = 0x0a,
  IOD = 0x1d,
  SL = 0x1e,
  FMC = 0x1f,
  METADATA = 0x26,
  METADATA_STD = 0x27
}

export const StreamType2AVCodecId: Partial<Record<TSStreamType, [AVMediaType, AVCodecID]>> = {
  [TSStreamType.AUDIO_AAC]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_AAC],
  [TSStreamType.AUDIO_AAC_LATM]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_AAC],
  [TSStreamType.AUDIO_MPEG1]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_MP3],
  [TSStreamType.AUDIO_MPEG2]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_MP3],
  [TSStreamType.VIDEO_MPEG1]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_MPEG2VIDEO],
  [TSStreamType.VIDEO_MPEG2]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_MPEG2VIDEO],
  [TSStreamType.VIDEO_H264]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_H264],
  [TSStreamType.VIDEO_MPEG4]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_MPEG4],
  [TSStreamType.VIDEO_HEVC]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_HEVC],
  [TSStreamType.VIDEO_VVC]: [AVMediaType.AVMEDIA_TYPE_VIDEO, AVCodecID.AV_CODEC_ID_VVC],
  [TSStreamType.AUDIO_AC3]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_AC3],
  [TSStreamType.AUDIO_EAC3]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_EAC3],
  [TSStreamType.AUDIO_DTS]: [AVMediaType.AVMEDIA_TYPE_AUDIO, AVCodecID.AV_CODEC_ID_DTS]
}
