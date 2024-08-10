/*
 * libmedia mp4 box defined
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

export const enum BoxType {
  MDAT = 'mdat',
  IDAT = 'idat',
  FREE = 'free',
  WIDE = 'wide',
  SKIP = 'skip',
  MECO = 'meco',
  STRK = 'strk',
  HMHD = 'hmhd',
  NMHD = 'nmhd',
  IODS = 'iods',
  XML = 'xml ',
  BXML = 'bxml',
  IPRO = 'ipro',
  MERE = 'mere',
  MOOV = 'moov',
  TRAK = 'trak',
  EDTS = 'edts',
  MDIA = 'mdia',
  MINF = 'minf',
  SMHD = 'smhd',
  DINF = 'dinf',
  DREF = 'dref',
  STBL = 'stbl',
  MVEX = 'mvex',
  MOOF = 'moof',
  TRAF = 'traf',
  VTTE = 'vtte',
  VTTC = 'vttc',
  PAYL = 'payl',
  TREF = 'tref',
  IREF = 'iref',
  MFRA = 'mfra',
  HNTI = 'hnti',
  HINF = 'hinf',
  STRD = 'strd',
  SINF = 'sinf',
  RINF = 'rinf',
  SCHI = 'schi',
  TRGR = 'trgr',
  UDTA = 'udta',
  IPRP = 'iprp',
  IPCO = 'ipco',
  UUID = 'uuid',
  STTS = 'stts',
  CTTS = 'ctts',
  STSS = 'stss',
  STSZ = 'stsz',
  STZ2 = 'stz2',
  STSC = 'stsc',
  STCO = 'stco',
  CO64 = 'co64',
  MVHD = 'mvhd',
  TKHD = 'tkhd',
  MDHD = 'mdhd',
  HDLR = 'hdlr',
  FTYP = 'ftyp',
  STSD = 'stsd',
  AVC1 = 'avc1',
  AVC3 = 'avc3',
  AVCC = 'avcC',
  HEV1 = 'hev1',
  HVC1 = 'hvc1',
  HVCC = 'hvcC',
  VVC1 = 'vvc1',
  VVI1 = 'vvi1',
  VVCC = 'vvcC',
  MP4A = 'mp4a',
  MP4V = 'mp4v',
  VP09 = 'vp09',
  VPCC = 'vpcC',
  AV01 = 'av01',
  AV1C = 'av1C',
  OPUS = 'Opus',
  FLAC = 'fLaC',
  ESDS = 'esds',
  WAVE = 'wave',
  DFLA = 'dfLa',
  DOPS = 'dOps',
  TREX = 'trex',
  MFHD = 'mfhd',
  TFHD = 'tfhd',
  TFDT = 'tfdt',
  TRUN = 'trun',
  COLR = 'colr',
  PASP = 'pasp',
  BTRT = 'btrt',
  TEXT = 'text',
  VMHD = 'vmhd',
  ELST = 'elst',
  URL = 'url ',
  NONE = 'none',
  STPP = 'stpp',
  WVTT = 'wvtt',
  TX3G = 'tx3g',
  C608 = 'c608',
  MFRO = 'mfro',
  TFRA = 'tfra',
  MINF_HDLR = 'minf_hdlr',
  FRMA = 'frma',
  DAC3 = 'dac3',
  DEC3 = 'dec3',
  EC_3 = 'ec-3',
  AC_3 = 'ac-3'
}

export const BasicBoxs = [
  BoxType.FTYP,
  BoxType.MDAT,
  BoxType.IDAT,
  BoxType.FREE,
  BoxType.SKIP,
  BoxType.MECO,
  BoxType.STRK,
]

export const FullBoxs = [
  BoxType.HMHD,
  BoxType.NMHD,
  BoxType.IODS,
  BoxType.XML,
  BoxType.URL,
  BoxType.BXML,
  BoxType.IPRO,
  BoxType.MERE,
  BoxType.STTS,
  BoxType.CTTS,
  BoxType.STSS,
  BoxType.STSZ,
  BoxType.STZ2,
  BoxType.STSC,
  BoxType.STCO,
  BoxType.CO64,
  BoxType.STSD,
  BoxType.DREF,

  BoxType.MVHD,
  BoxType.TKHD,
  BoxType.MDHD,
  BoxType.HDLR
]

export const ContainerBoxs = [
  BoxType.MOOV,
  BoxType.TRAK,
  BoxType.EDTS,
  BoxType.MDIA,
  BoxType.MINF,
  BoxType.DINF,
  BoxType.STBL,
  BoxType.MVEX,
  BoxType.MOOF,
  BoxType.TRAF,
  BoxType.VTTC,
  BoxType.TREF,
  BoxType.IREF,
  BoxType.MFRA,
  BoxType.HNTI,
  BoxType.HINF,
  BoxType.STRD,
  BoxType.SINF,
  BoxType.RINF,
  BoxType.SCHI,
  BoxType.TRGR,
  BoxType.UDTA,
  BoxType.IPRP,
  BoxType.IPCO,
  BoxType.STRK,
  BoxType.MECO
]

export const enum TFHDFlags {
  BASE_DATA_OFFSET = 0x01,
  SAMPLE_DESCRIPTION	= 0x02,
  SAMPLE_DURATION = 0x08,
  SAMPLE_SIZE	= 0x10,
  SAMPLE_FLAGS = 0x20,
  DURATION_EMPTY = 0x10000,
  DEFAULT_BASE_IS_MOOF = 0x20000
}

export const enum TRUNFlags {
  DATA_OFFSET = 0x01,
  FIRST_FLAG = 0x04,
  DURATION = 0x100,
  SIZE = 0x200,
  FLAGS = 0x400,
  CTS_OFFSET = 0x800
}

export const enum SampleFlags {
  DEGRADATION_PRIORITY_MASK = 0x0000ffff,
  IS_NON_SYN = 0x00010000,
  PADDING_MASK = 0x000e0000,
  REDUNDANCY_MASK = 0x00300000,
  DEPENDED_MASK = 0x00c00000,
  DEPENDS_MASK = 0x03000000,
  DEPENDS_NO = 0x02000000,
  DEPENDS_YES = 0x01000000
}

export const enum MP4Tag {
  MP4_O_DESCR_TAG = 0x01,
  MP4_IO_DESCR_TAG = 0x02,
  MP4_ES_DESCR_TAG = 0x03,
  MP4_DEC_CONFIG_DESCR_TAG = 0x04,
  MP4_DEC_SPECIFIC_DESCR_TAG = 0x05,
  MP4_SL_DESCR_TAG = 0x06
}

export const enum TKHDFlags {
  ENABLED = 0x0001,
  IN_MOVIE = 0x0002,
  IN_PREVIEW = 0x0004,
  POSTER = 0x0008
}
