/*
 * libmedia iTunes defined
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

import { AVStreamMetadataKey } from '@libmedia/avutil'

export const iTunesKeyMap: Record<string, string> = {
  '@PRM': 'premiere_version',
  '@PRQ': 'quicktime_version',
  'XMP_': 'xmp',
  'aART': AVStreamMetadataKey.ALBUM_ARTIST,
  'akID': 'account_type',
  'apID': 'account_id',
  'catg': 'category',
  'cpil': AVStreamMetadataKey.COMPILATION,
  'cprt': AVStreamMetadataKey.COPYRIGHT,
  'desc': AVStreamMetadataKey.DESCRIPTION,
  'disk': AVStreamMetadataKey.DISC,
  'egid': 'episode_uid',
  'FIRM': 'firmware',
  'gnre': AVStreamMetadataKey.GENRE,
  'hdvd': 'hd_video',
  'HMMT': 'hmmt',
  'keyw': 'keywords',
  'ldes': 'synopsis',
  'loci': 'loci',
  'manu': 'make',
  'modl': 'model',
  'pcst': 'podcast',
  'pgap': 'gapless_playback',
  'purd': 'purchase_date',
  'rtng': 'rating',
  'soaa': AVStreamMetadataKey.ALBUM_ARTIST_SORT,
  'soal': AVStreamMetadataKey.ALBUM_SORT,
  'soar': AVStreamMetadataKey.ARTIST_SORT,
  'soco': AVStreamMetadataKey.COMPOSER_SORT,
  'sonm': 'nameSort',
  'sosn': 'showSort',
  'stik': 'media_type',
  'trkn': AVStreamMetadataKey.TRACK,
  'tven': 'episode_id',
  'tves': 'episode_sort',
  'tvnn': 'network',
  'tvsh': 'show',
  'tvsn': 'season_number',
  '©ART': AVStreamMetadataKey.ALBUM_ARTIST,
  '©PRD': 'producer',
  '©alb': AVStreamMetadataKey.ALBUM,
  '©aut': AVStreamMetadataKey.ARTIST,
  '©chp': 'chapter',
  '©cmt': AVStreamMetadataKey.COMMENT,
  '©com': AVStreamMetadataKey.COMPOSER,
  '©cpy': AVStreamMetadataKey.COPYRIGHT,
  '©day': AVStreamMetadataKey.DATE,
  '©dir': 'director',
  '©dis': 'disclaimer',
  '©ed1': 'edit_date',
  '©enc': AVStreamMetadataKey.ENCODER,
  '©fmt': 'original_format',
  '©gen': AVStreamMetadataKey.GENRE,
  '©grp': AVStreamMetadataKey.GROUPING,
  '©hst': 'host_computer',
  '©inf': AVStreamMetadataKey.COMMENT,
  '©lyr': AVStreamMetadataKey.LYRICS,
  '©mak': 'make',
  '©mod': 'mod',
  '©nam': AVStreamMetadataKey.TITLE,
  '©ope': 'original_artist',
  '©prd': 'producer',
  '©prf': AVStreamMetadataKey.PERFORMER,
  '©req': 'playback_requirements',
  '©src': 'original_source',
  '©st3': 'subtitle',
  '©swr': AVStreamMetadataKey.ENCODER,
  '©too': AVStreamMetadataKey.ENCODER,
  '©trk': AVStreamMetadataKey.TRACK,
  '©url': 'url',
  '©wrn': 'warning',
  '©wrt': AVStreamMetadataKey.COMPOSER,
  '©xyz': 'location'
}
