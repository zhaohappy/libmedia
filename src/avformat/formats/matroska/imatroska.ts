/*
 * libmedia matroska decoder util
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

import { AVIFormatContext } from '../../AVFormatContext'
import { EBMLId, EbmlType } from './matroska'
import { Addition, Additions, Attachment, Attachments, AudioTrack,
  BlockGroup, Chapter, ChapterAtom, ChapterDisplay, Chapters, Cluster,
  CuePoint, CuePointPos, Cues, Header, Info, MasteringMeta, MatroskaContext, SeekHead, SeekHeadEntry,
  SimpleTag, Tag, TagTargets, Tags, TrackCombinePlanes, TrackEncoding,
  TrackEncodingCompression, TrackEncodingEncryption, TrackEncodings, TrackEntry,
  TrackOperation, TrackPlane, Tracks, VideoColor, VideoProjection, VideoTrack
} from './type'

import * as logger from 'common/util/logger'
import * as errorType from 'avutil/error'
import * as is from 'common/util/is'
import * as array from 'common/util/array'
import { BytesReader, BytesReaderSync } from 'common/io/interface'

const MAX_ATTACHMENT_READ_SIZE = static_cast<int64>(20 * 1024 * 1024)

interface EbmlSyntax<T> {
  type: EbmlType
  isArray?: boolean
  filedName: keyof T
  child?: Partial<Record<EBMLId, EbmlSyntax<any>>>
}

export const EbmlSyntaxHeadSeekEntry: Partial<Record<EBMLId, EbmlSyntax<SeekHeadEntry>>> = {
  [EBMLId.SEEK_ID]: {
    type: EbmlType.UINT,
    filedName: 'id'
  },
  [EBMLId.SEEK_POSITION]: {
    type: EbmlType.UINT64,
    filedName: 'pos'
  }
}

export const EbmlSyntaxHeadSeek: Partial<Record<EBMLId, EbmlSyntax<SeekHead>>> = {
  [EBMLId.SEEK_ENTRY]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxHeadSeekEntry
  }
}

export const EbmlSyntaxInfo: Partial<Record<EBMLId, EbmlSyntax<Info>>> = {
  [EBMLId.SEGMENT_UID]: {
    type: EbmlType.UINT64,
    filedName: 'segmentUUID'
  },
  [EBMLId.TIME_CODE_SCALE]: {
    type: EbmlType.UINT,
    filedName: 'timestampScale'
  },
  [EBMLId.DURATION]: {
    type: EbmlType.FLOAT,
    filedName: 'duration'
  },
  [EBMLId.TITLE]: {
    type: EbmlType.STRING,
    filedName: 'title'
  },
  [EBMLId.MUXING_APP]: {
    type: EbmlType.STRING,
    filedName: 'muxingApp'
  },
  [EBMLId.WRITING_APP]: {
    type: EbmlType.STRING,
    filedName: 'writingApp'
  },
  [EBMLId.DATE_UTC]: {
    type: EbmlType.BUFFER,
    filedName: 'dateUTC'
  },
}

export const EbmlSyntaxTrackAudio: Partial<Record<EBMLId, EbmlSyntax<AudioTrack>>> = {
  [EBMLId.AUDIO_SAMPLING_FREQ]: {
    type: EbmlType.FLOAT,
    filedName: 'sampleRate'
  },
  [EBMLId.AUDIO_OUT_SAMPLING_FREQ]: {
    type: EbmlType.FLOAT,
    filedName: 'outSampleRate'
  },
  [EBMLId.AUDIO_BITDEPTH]: {
    type: EbmlType.UINT,
    filedName: 'bitDepth'
  },
  [EBMLId.AUDIO_CHANNELS]: {
    type: EbmlType.UINT,
    filedName: 'channels'
  },
}

export const EbmlSyntaxMasteringMeta: Partial<Record<EBMLId, EbmlSyntax<MasteringMeta>>> = {
  [EBMLId.VIDEO_COLOR_RX]: {
    type: EbmlType.FLOAT,
    filedName: 'rx'
  },
  [EBMLId.VIDEO_COLOR_RY]: {
    type: EbmlType.FLOAT,
    filedName: 'ry'
  },
  [EBMLId.VIDEO_COLOR_GX]: {
    type: EbmlType.FLOAT,
    filedName: 'gx'
  },
  [EBMLId.VIDEO_COLOR_GY]: {
    type: EbmlType.FLOAT,
    filedName: 'gy'
  },
  [EBMLId.VIDEO_COLOR_BX]: {
    type: EbmlType.FLOAT,
    filedName: 'bx'
  },
  [EBMLId.VIDEO_COLOR_BY]: {
    type: EbmlType.FLOAT,
    filedName: 'by'
  },
  [EBMLId.VIDEO_COLOR_WHITE_X]: {
    type: EbmlType.FLOAT,
    filedName: 'whiteX'
  },
  [EBMLId.VIDEO_COLOR_WHITE_Y]: {
    type: EbmlType.FLOAT,
    filedName: 'whiteY'
  },
  [EBMLId.VIDEO_COLOR_LUMINA_NCE_MIN]: {
    type: EbmlType.FLOAT,
    isArray: true,
    filedName: 'minLuminance'
  },
  [EBMLId.VIDEO_COLOR_LUMINA_NCE_MAX]: {
    type: EbmlType.FLOAT,
    filedName: 'maxLuminance'
  }
}

export const EbmlSyntaxVideoColor: Partial<Record<EBMLId, EbmlSyntax<VideoColor>>> = {
  [EBMLId.VIDEO_COLOR_MATRIX_COEFF]: {
    type: EbmlType.UINT,
    filedName: 'matrixCoefficients'
  },
  [EBMLId.VIDEO_COLOR_BITS_PER_CHANNEL]: {
    type: EbmlType.UINT,
    filedName: 'bitsPerChannel'
  },
  [EBMLId.VIDEO_COLOR_CB_SUB_HORZ]: {
    type: EbmlType.UINT,
    filedName: 'cbSubHorz'
  },
  [EBMLId.VIDEO_COLOR_CB_SUB_VERT]: {
    type: EbmlType.UINT,
    filedName: 'cbSubVert'
  },
  [EBMLId.VIDEO_COLOR_CHROMA_SUB_HORZ]: {
    type: EbmlType.UINT,
    filedName: 'chromaSubHorz'
  },
  [EBMLId.VIDEO_COLOR_CHROMA_SUB_VERT]: {
    type: EbmlType.UINT,
    filedName: 'chromaSubVert'
  },
  [EBMLId.VIDEO_COLOR_CHROMA_SITING_HORZ]: {
    type: EbmlType.UINT,
    filedName: 'chromaSitingHorz'
  },
  [EBMLId.VIDEO_COLOR_CHROMA_SITING_VERT]: {
    type: EbmlType.UINT,
    filedName: 'chromaSitingVert'
  },
  [EBMLId.VIDEO_COLOR_RANGE]: {
    type: EbmlType.UINT,
    filedName: 'range'
  },
  [EBMLId.VIDEO_COLOR_TRANSFER_CHARACTERISTICS]: {
    type: EbmlType.UINT,
    filedName: 'transferCharacteristics'
  },
  [EBMLId.VIDEO_COLOR_PRIMARIES]: {
    type: EbmlType.UINT,
    filedName: 'primaries'
  },
  [EBMLId.VIDEO_COLOR_MAX_CLL]: {
    type: EbmlType.UINT,
    filedName: 'maxCll'
  },
  [EBMLId.VIDEO_COLOR_MAX_FALL]: {
    type: EbmlType.UINT,
    filedName: 'maxFall'
  },
  [EBMLId.VIDEO_COLOR_MASTERING_META]: {
    type: EbmlType.OBJECT,
    filedName: 'masteringMeta',
    child: EbmlSyntaxMasteringMeta
  },
}

export const EbmlSyntaxVideoProjection: Partial<Record<EBMLId, EbmlSyntax<VideoProjection>>> = {
  [EBMLId.VIDEO_PROJECTION_TYPE]: {
    type: EbmlType.UINT,
    filedName: 'type'
  },
  [EBMLId.VIDEO_PROJECTION_PRIVATE]: {
    type: EbmlType.BUFFER,
    filedName: 'private'
  },
  [EBMLId.VIDEO_PROJECTION_POSE_YAW]: {
    type: EbmlType.FLOAT,
    filedName: 'yaw'
  },
  [EBMLId.VIDEO_PROJECTION_POSE_PITCH]: {
    type: EbmlType.FLOAT,
    filedName: 'pitch'
  },
  [EBMLId.VIDEO_PROJECTION_POSE_ROLL]: {
    type: EbmlType.FLOAT,
    filedName: 'roll'
  },
}

export const EbmlSyntaxTrackVideo: Partial<Record<EBMLId, EbmlSyntax<VideoTrack>>> = {
  [EBMLId.VIDEO_FRAMERATE]: {
    type: EbmlType.UINT,
    filedName: 'framerate'
  },
  [EBMLId.VIDEO_DISPLAY_WIDTH]: {
    type: EbmlType.UINT,
    filedName: 'displayWidth'
  },
  [EBMLId.VIDEO_DISPLAY_HEIGHT]: {
    type: EbmlType.UINT,
    filedName: 'displayHeight'
  },
  [EBMLId.VIDEO_PIXEL_WIDTH]: {
    type: EbmlType.UINT,
    filedName: 'pixelWidth'
  },
  [EBMLId.VIDEO_PIXEL_HEIGHT]: {
    type: EbmlType.UINT,
    filedName: 'pixelHeight'
  },
  [EBMLId.VIDEO_COLORSPACE]: {
    type: EbmlType.BUFFER,
    filedName: 'colorSpace'
  },
  [EBMLId.VIDEO_ALPHA_MODE]: {
    type: EbmlType.UINT,
    filedName: 'alphaMode'
  },
  [EBMLId.VIDEO_COLOR]: {
    type: EbmlType.OBJECT,
    filedName: 'color',
    child: EbmlSyntaxVideoColor
  },
  [EBMLId.VIDEO_PROJECTION]: {
    type: EbmlType.OBJECT,
    filedName: 'projection',
    child: EbmlSyntaxVideoProjection
  },
  [EBMLId.VIDEO_DISPLAY_UNIT]: {
    type: EbmlType.UINT,
    filedName: 'displayUnit'
  },
  [EBMLId.VIDEO_FLAG_INTERLACED]: {
    type: EbmlType.UINT,
    filedName: 'interlaced'
  },
  [EBMLId.VIDEO_FIELD_ORDER]: {
    type: EbmlType.UINT,
    filedName: 'fieldOrder'
  },
  [EBMLId.VIDEO_STEREO_MODE]: {
    type: EbmlType.UINT,
    filedName: 'stereoMode'
  },
  [EBMLId.VIDEO_ASPECT_RATIO]: {
    type: EbmlType.UINT,
    filedName: 'aspectRatio'
  }
}

export const EbmlSyntaxTrackPlane: Partial<Record<EBMLId, EbmlSyntax<TrackPlane>>> = {
  [EBMLId.TRACK_PLANE_TYPE]: {
    type: EbmlType.UINT,
    filedName: 'type'
  },
  [EBMLId.TRACK_PLANE_UID]: {
    type: EbmlType.UINT,
    filedName: 'uid'
  }
}

export const EbmlSyntaxTrackCombinePlanes: Partial<Record<EBMLId, EbmlSyntax<TrackCombinePlanes>>> = {
  [EBMLId.TRACK_PLANE]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'planes',
    child: EbmlSyntaxTrackPlane
  }
}

export const EbmlSyntaxTrackOperation: Partial<Record<EBMLId, EbmlSyntax<TrackOperation>>> = {
  [EBMLId.TRACK_COMBINE_PLANES]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxTrackCombinePlanes
  }
}

export const EbmlSyntaxTrackEncodingCompression: Partial<Record<EBMLId, EbmlSyntax<TrackEncodingCompression>>> = {
  [EBMLId.ENCODING_COMP_ALGO]: {
    type: EbmlType.UINT,
    filedName: 'algo'
  },
  [EBMLId.ENCODING_COMP_SETTINGS]: {
    type: EbmlType.BUFFER,
    filedName: 'settings'
  }
}

export const EbmlSyntaxTrackEncodingEncryption: Partial<Record<EBMLId, EbmlSyntax<TrackEncodingEncryption>>> = {
  [EBMLId.ENCODING_ENC_ALGO]: {
    type: EbmlType.UINT,
    filedName: 'algo'
  },
  [EBMLId.ENCODING_ENC_KEY_ID]: {
    type: EbmlType.BUFFER,
    filedName: 'keyId'
  }
}

export const EbmlSyntaxTrackEncoding: Partial<Record<EBMLId, EbmlSyntax<TrackEncoding>>> = {
  [EBMLId.ENCODING_SCOPE]: {
    type: EbmlType.UINT,
    filedName: 'scope'
  },
  [EBMLId.ENCODING_TYPE]: {
    type: EbmlType.UINT,
    filedName: 'type'
  },
  [EBMLId.ENCODING_COMPRESSION]: {
    type: EbmlType.OBJECT,
    filedName: 'compression',
    child: EbmlSyntaxTrackEncodingCompression
  },
  [EBMLId.ENCODING_ENCRYPTION]: {
    type: EbmlType.OBJECT,
    filedName: 'encryption',
    child: EbmlSyntaxTrackEncodingEncryption
  },
}

export const EbmlSyntaxTrackEncodings: Partial<Record<EBMLId, EbmlSyntax<TrackEncodings>>> = {
  [EBMLId.TRACK_CONTENT_ENCODING]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxTrackEncoding
  }
}

export const EbmlSyntaxTrackEntry: Partial<Record<EBMLId, EbmlSyntax<TrackEntry>>> = {
  [EBMLId.TRACK_NUMBER]: {
    type: EbmlType.UINT,
    filedName: 'number'
  },
  [EBMLId.TRACK_UID]: {
    type: EbmlType.UINT,
    filedName: 'uid'
  },
  [EBMLId.TRACK_TYPE]: {
    type: EbmlType.UINT,
    filedName: 'type'
  },
  [EBMLId.TRACK_NAME]: {
    type: EbmlType.STRING,
    filedName: 'name'
  },
  [EBMLId.TRACK_FLAG_DEFAULT]: {
    type: EbmlType.BOOL,
    filedName: 'default'
  },
  [EBMLId.TRACK_FLAG_ENABLED]: {
    type: EbmlType.BOOL,
    filedName: 'enabled'
  },
  [EBMLId.TRACK_LANGUAGE]: {
    type: EbmlType.STRING,
    filedName: 'language'
  },
  [EBMLId.TRACK_TIME_CODE_SCALE]: {
    type: EbmlType.DOUBLE,
    filedName: 'timeScale'
  },
  [EBMLId.CODEC_ID]: {
    type: EbmlType.STRING,
    filedName: 'codecId'
  },
  [EBMLId.CODEC_NAME]: {
    type: EbmlType.STRING,
    filedName: 'codecName'
  },
  [EBMLId.CODEC_PRIVATE]: {
    type: EbmlType.BUFFER,
    filedName: 'codecPrivate'
  },
  [EBMLId.TRACK_AUDIO]: {
    type: EbmlType.OBJECT,
    filedName: 'audio',
    child: EbmlSyntaxTrackAudio
  },
  [EBMLId.TRACK_VIDEO]: {
    type: EbmlType.OBJECT,
    filedName: 'video',
    child: EbmlSyntaxTrackVideo
  },
  [EBMLId.TRACK_OPERATION]: {
    type: EbmlType.OBJECT,
    filedName: 'operations',
    child: EbmlSyntaxTrackOperation
  },
  [EBMLId.TRACK_CONTENT_ENCODINGS]: {
    type: EbmlType.OBJECT,
    filedName: 'encodings',
    child: EbmlSyntaxTrackEncodings
  }
}

export const EbmlSyntaxTracks: Partial<Record<EBMLId, EbmlSyntax<Tracks>>> = {
  [EBMLId.TRACK_ENTRY]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxTrackEntry
  }
}

export const EbmlSyntaxAttachment: Partial<Record<EBMLId, EbmlSyntax<Attachment>>> = {
  [EBMLId.FILE_UID]: {
    type: EbmlType.UINT,
    filedName: 'uid'
  },
  [EBMLId.FILE_NAME]: {
    type: EbmlType.STRING,
    filedName: 'name'
  },
  [EBMLId.FILE_MIMETYPE]: {
    type: EbmlType.STRING,
    filedName: 'mime'
  },
  [EBMLId.FILE_DESC]: {
    type: EbmlType.STRING,
    filedName: 'description'
  },
  [EBMLId.FILE_DATA]: {
    type: EbmlType.BUFFER,
    filedName: 'data'
  }
}

export const EbmlSyntaxAttachments: Partial<Record<EBMLId, EbmlSyntax<Attachments>>> = {
  [EBMLId.ATTACHED_FILE]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxAttachment
  }
}

export const EbmlSyntaxChapterDisplay: Partial<Record<EBMLId, EbmlSyntax<ChapterDisplay>>> = {
  [EBMLId.CHAP_STRING]: {
    type: EbmlType.STRING,
    filedName: 'title'
  },
  [EBMLId.CHAP_LANG]: {
    type: EbmlType.STRING,
    filedName: 'language'
  }
}

export const EbmlSyntaxChapterAtom: Partial<Record<EBMLId, EbmlSyntax<ChapterAtom>>> = {
  [EBMLId.CHAPTER_TIME_START]: {
    type: EbmlType.UINT64,
    filedName: 'start'
  },
  [EBMLId.CHAPTER_TIME_END]: {
    type: EbmlType.UINT64,
    filedName: 'end'
  },
  [EBMLId.CHAPTER_UID]: {
    type: EbmlType.UINT,
    filedName: 'uid'
  },
  [EBMLId.CHAPTER_DISPLAY]: {
    type: EbmlType.OBJECT,
    filedName: 'display',
    child: EbmlSyntaxChapterDisplay
  }
}

export const EbmlSyntaxChapter: Partial<Record<EBMLId, EbmlSyntax<Chapter>>> = {
  [EBMLId.CHAPTER_ATOM]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'atom',
    child: EbmlSyntaxChapterAtom
  }
}

export const EbmlSyntaxChapters: Partial<Record<EBMLId, EbmlSyntax<Chapters>>> = {
  [EBMLId.EDITION_ENTRY]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxChapter
  }
}

export const EbmlSyntaxCuePointPos: Partial<Record<EBMLId, EbmlSyntax<CuePointPos>>> = {
  [EBMLId.CUE_TRACK]: {
    type: EbmlType.UINT,
    filedName: 'track'
  },
  [EBMLId.CUE_CLUSTER_POSITION]: {
    type: EbmlType.UINT64,
    filedName: 'pos'
  }
}

export const EbmlSyntaxCuePoint: Partial<Record<EBMLId, EbmlSyntax<CuePoint>>> = {
  [EBMLId.CUE_TIME]: {
    type: EbmlType.UINT64,
    filedName: 'time'
  },
  [EBMLId.CUE_TRACK_POSITION]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'pos',
    child: EbmlSyntaxCuePointPos
  }
}

export const EbmlSyntaxCues: Partial<Record<EBMLId, EbmlSyntax<Cues>>> = {
  [EBMLId.POINT_ENTRY]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxCuePoint
  }
}

export const EbmlSyntaxTagTargets: Partial<Record<EBMLId, EbmlSyntax<TagTargets>>> = {
  [EBMLId.TAG_TARGETS_TYPE]: {
    type: EbmlType.STRING,
    filedName: 'type'
  },
  [EBMLId.TAG_TARGETS_TYPE_VALUE]: {
    type: EbmlType.UINT,
    filedName: 'typeValue'
  },
  [EBMLId.TAG_TARGETS_TRACK_UID]: {
    type: EbmlType.UINT,
    filedName: 'trackUid'
  },
  [EBMLId.TAG_TARGETS_CHAPTER_UID]: {
    type: EbmlType.UINT,
    filedName: 'chapterUid'
  },
  [EBMLId.TAG_TARGETS_ATTACH_UID]: {
    type: EbmlType.UINT,
    filedName: 'attachUid'
  },
}

export const EbmlSyntaxSimpleTag: Partial<Record<EBMLId, EbmlSyntax<SimpleTag>>> = {
  [EBMLId.TAG_NAME]: {
    type: EbmlType.STRING,
    filedName: 'name'
  },
  [EBMLId.TAG_STRING]: {
    type: EbmlType.STRING,
    filedName: 'string'
  },
  [EBMLId.TAG_LANG]: {
    type: EbmlType.STRING,
    filedName: 'language'
  },
  [EBMLId.TAG_DEFAULT]: {
    type: EbmlType.UINT,
    filedName: 'default'
  },
  [EBMLId.TAG_DEFAULT_BUG]: {
    type: EbmlType.UINT,
    filedName: 'default'
  },
  [EBMLId.TAG_SIMPLE]: {
    type: EbmlType.OBJECT,
    filedName: 'sub'
  }
}
EbmlSyntaxSimpleTag[EBMLId.TAG_SIMPLE].child = EbmlSyntaxSimpleTag

export const EbmlSyntaxTag: Partial<Record<EBMLId, EbmlSyntax<Tag>>> = {
  [EBMLId.TAG_SIMPLE]: {
    type: EbmlType.OBJECT,
    filedName: 'tag',
    child: EbmlSyntaxSimpleTag
  },
  [EBMLId.TAG_TARGETS]: {
    type: EbmlType.OBJECT,
    filedName: 'target',
    child: EbmlSyntaxTagTargets
  }
}

export const EbmlSyntaxTags: Partial<Record<EBMLId, EbmlSyntax<Tags>>> = {
  [EBMLId.TAG]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxTag
  }
}

export const EbmlSyntaxAddition: Partial<Record<EBMLId, EbmlSyntax<Addition>>> = {
  [EBMLId.BLOCK_ADD_ID]: {
    type: EbmlType.UINT,
    filedName: 'additionalId'
  },
  [EBMLId.BLOCK_ADDITIONAL]: {
    type: EbmlType.BUFFER,
    filedName: 'additional'
  }
}

export const EbmlSyntaxAdditions: Partial<Record<EBMLId, EbmlSyntax<Additions>>> = {
  [EBMLId.BLOCK_MORE]: {
    type: EbmlType.OBJECT,
    isArray: true,
    filedName: 'entry',
    child: EbmlSyntaxAddition
  }
}

export const EbmlSyntaxBlockGroup: Partial<Record<EBMLId, EbmlSyntax<BlockGroup>>> = {
  [EBMLId.BLOCK]: {
    type: EbmlType.BUFFER,
    filedName: 'block'
  },
  [EBMLId.BLOCK_ADDITIONS]: {
    type: EbmlType.OBJECT,
    filedName: 'additions',
    child: EbmlSyntaxAdditions
  },
  [EBMLId.BLOCK_DURATION]: {
    type: EbmlType.UINT64,
    filedName: 'duration'
  },
  [EBMLId.DISCARD_PADDING]: {
    type: EbmlType.SINT64,
    filedName: 'discardPadding'
  },
  [EBMLId.BLOCK_REFERENCE]: {
    type: EbmlType.SINT64,
    isArray: true,
    filedName: 'reference'
  },
  [EBMLId.CODEC_STATE]: {
    type: EbmlType.BOOL,
    filedName: 'nonSimple'
  }
}

export const EbmlSyntaxCluster: Partial<Record<EBMLId, EbmlSyntax<Cluster>>> = {
  [EBMLId.SIMPLE_BLOCK]: {
    type: EbmlType.BUFFER,
    filedName: 'block'
  },
  [EBMLId.BLOCK_GROUP]: {
    type: EbmlType.OBJECT,
    filedName: 'blockGroup',
    child: EbmlSyntaxBlockGroup
  },
  [EBMLId.CLUSTER_TIME_CODE]: {
    type: EbmlType.UINT64,
    filedName: 'timeCode'
  },
  [EBMLId.CLUSTER_POSITION]: {
    type: EbmlType.UINT64,
    filedName: 'pos'
  },
  [EBMLId.CLUSTER_PREV_SIZE]: {
    type: EbmlType.UINT64,
    filedName: 'prevSize'
  }
}

export const EbmlSyntaxHeader: Partial<Record<EBMLId, EbmlSyntax<Header>>> = {
  [EBMLId.EBML_VERSION]: {
    type: EbmlType.UINT,
    filedName: 'version'
  },
  [EBMLId.EBML_READ_VERSION]: {
    type: EbmlType.UINT,
    filedName: 'readVersion'
  },
  [EBMLId.EBML_MAX_ID_LENGTH]: {
    type: EbmlType.UINT,
    filedName: 'maxIdLength'
  },
  [EBMLId.EBML_MAX_SIZE_LENGTH]: {
    type: EbmlType.UINT,
    filedName: 'maxSizeLength'
  },
  [EBMLId.DOCTYPE]: {
    type: EbmlType.STRING,
    filedName: 'docType'
  },
  [EBMLId.DOC_TYPE_VERSION]: {
    type: EbmlType.UINT,
    filedName: 'docTypeVersion'
  },
  [EBMLId.DOC_TYPE_READ_VERSION]: {
    type: EbmlType.UINT,
    filedName: 'docTypeReadVersion'
  }
}

export async function readVInt(reader: BytesReader | BytesReaderSync, maxLen: number) {

  assert(maxLen <= 4)

  const pos = reader.getPos()

  let mask = await reader.readUint8()

  if (!mask) {
    logger.error(`0x00 as pos ${pos} invalid as first byte of an EBML number`)
    return errorType.DATA_INVALID
  }

  let len = 1

  while (!(mask & 0x80)) {
    len++
    mask <<= 1
  }
  mask &= 0x7f

  if (len > maxLen) {
    logger.error(`Length ${len} indicated by an EBML number's first byte ${mask.toString(16)} at pos ${pos} exceeds max length ${maxLen}.`)
    return errorType.DATA_INVALID
  }

  let value = mask >>> (len - 1)

  while (--len) {
    value <<= 8
    const next = await reader.readUint8()
    value |= next
  }

  return value
}

export async function readVSint(reader: BytesReader | BytesReaderSync, maxLen: number) {

  assert(maxLen <= 4)

  const now = reader.getPos()
  const value = await readVInt(reader, maxLen)

  return value - ((1 << (7 * (static_cast<int32>(reader.getPos() - now)) - 1)) - 1)
}

export async function readVInt64(reader: BytesReader | BytesReaderSync, maxLen: number) {

  assert(maxLen <= 8)

  const pos = reader.getPos()
  let mask = await reader.readUint8()
  let len = 1

  if (!mask) {
    logger.error(`0x00 as pos ${pos} invalid as first byte of an EBML number`)
    return static_cast<int64>(errorType.DATA_INVALID)
  }

  while (!(mask & 0x80)) {
    len++
    mask <<= 1
  }
  mask &= 0x7f

  if (len > maxLen) {
    logger.error(`Length ${len} indicated by an EBML number's first byte ${mask.toString(16)} at pos ${pos} exceeds max length ${maxLen}.`)
    return static_cast<int64>(errorType.DATA_INVALID)
  }

  let value = static_cast<int64>(mask >>> (len - 1))

  while (--len) {
    value <<= 8n
    const next = await reader.readUint8()
    value |= static_cast<int64>(next)
  }

  return value
}

export async function readUint(formatContext: AVIFormatContext, len: int64) {
  switch (len) {
    case 0n:
      return 0
    case 1n:
      return formatContext.ioReader.readUint8()
    case 2n:
      return formatContext.ioReader.readUint16()
    case 3n:
      return formatContext.ioReader.readUint24()
    case 4n:
      return formatContext.ioReader.readUint32()
    case 8n:
      return formatContext.ioReader.readUint64()
  }

  let num = 0n
  let n = 0
  while (n++ < len) {
    const next = await formatContext.ioReader.readUint8()
    num = (num << 8n) | static_cast<uint64>(next)
  }
  return num
}

export async function readInt(formatContext: AVIFormatContext, len: int64) {
  switch (len) {
    case 0n:
      return 0
    case 1n:
      return formatContext.ioReader.readInt8()
    case 2n:
      return formatContext.ioReader.readInt16()
    case 4n:
      return formatContext.ioReader.readInt32()
    case 8n:
      return formatContext.ioReader.readInt64()
  }

  let num = 0n
  let n = 0
  while (n++ < len) {
    const next = await formatContext.ioReader.readUint8()
    num = (num << 8n) | static_cast<uint64>(next)
  }

  if (len === 3n) {
    return static_cast<int32>(BigInt.asIntN(24, num) as int64)
  }

  return BigInt.asIntN(64, num)
}

export async function readFloat(formatContext: AVIFormatContext, len: int64) {
  if (len === 4n) {
    return formatContext.ioReader.readFloat()
  }
  else if (len === 8n) {
    return formatContext.ioReader.readDouble()
  }
  else {
    await formatContext.ioReader.skip(static_cast<int32>(len))
    return 0.0
  }
}

export async function readEbmlId(formatContext: AVIFormatContext, maxLen: number) {
  const pos = formatContext.ioReader.getPos()
  let mask = await formatContext.ioReader.peekUint8()
  if (!mask) {
    logger.error(`0x00 as pos ${pos} invalid as first byte of an EBML number`)
    return errorType.DATA_INVALID
  }

  let len = 1

  while (!(mask & 0x80)) {
    len++
    mask <<= 1
  }

  if (len > maxLen) {
    logger.error(`Length ${len} indicated by an EBML number's first byte ${mask.toString(16)} at pos ${pos} exceeds max length ${maxLen}.`)
    return errorType.DATA_INVALID
  }

  let value = 0

  while (len--) {
    value <<= 8
    const next = await formatContext.ioReader.readUint8()
    value |= next
  }
  return value
}

export async function parseEbml(formatContext: AVIFormatContext, size: int64, callback: (id: EBMLId, length: int64) => Promise<void | boolean>) {
  const matroskaContext = formatContext.privateData as MatroskaContext
  const now = formatContext.ioReader.getPos()
  while (formatContext.ioReader.getPos() < now + size) {
    const id = await readEbmlId(formatContext, matroskaContext.header.maxIdLength)
    const length = await readVInt64(formatContext.ioReader, matroskaContext.header.maxSizeLength)
    const currentPos = formatContext.ioReader.getPos()
    if ((await callback(id, length)) === false) {
      return
    }
    assert(formatContext.ioReader.getPos() - currentPos === length)
  }
  assert(formatContext.ioReader.getPos() - now === size)
}

export async function parseEbmlSyntax<T extends Record<string, any>>(
  formatContext: AVIFormatContext,
  size: int64,
  syntax: Partial<Record<EBMLId, EbmlSyntax<T>>>,
  ebml:  Partial<T> = {},
  stopId: EBMLId[] = []
) {
  await parseEbml(formatContext, size, async (id, length) => {
    if (syntax[id]) {
      const item = syntax[id]
      let value: any
      switch (item.type) {
        case EbmlType.UINT:
          value = await readUint(formatContext, length)
          break
        case EbmlType.UINT64: {
          value = await readUint(formatContext, length)
          if (is.number(value)) {
            value = BigInt(value)
          }
          break
        }
        case EbmlType.SINT:
          value = await readInt(formatContext, length)
          break
        case EbmlType.SINT64: {
          value = await readInt(formatContext, length)
          if (is.number(value)) {
            value = BigInt(value)
          }
          break
        }
        case EbmlType.DOUBLE:
        case EbmlType.FLOAT:
          value = await readFloat(formatContext, length)
          break
        case EbmlType.STRING:
          value = await formatContext.ioReader.readString(static_cast<int32>(length))
          break
        case EbmlType.BOOL:
          value = !!(await readUint(formatContext, length))
          break
        case EbmlType.BUFFER:
          value = {
            pos: formatContext.ioReader.getPos(),
            size: length,
            data: (length < MAX_ATTACHMENT_READ_SIZE) ? await formatContext.ioReader.readBuffer(static_cast<int32>(length)) : null
          }
          break
        case EbmlType.OBJECT: {
          if (item.child) {
            value = await parseEbmlSyntax(formatContext, length, item.child) as any
          }
          else {
            value = {}
          }
          break
        }
        default:
          await formatContext.ioReader.skip(static_cast<int32>(length))
          break
      }
      if (value != null) {
        if (item.isArray) {
          const list: any[] = ebml[item.filedName] || []
          list.push(value)
          ebml[item.filedName] = list as any
        }
        else {
          ebml[item.filedName] = value
        }
      }
    }
    else {
      await formatContext.ioReader.skip(static_cast<int32>(length))
    }
    if (stopId.length && array.has(stopId, id)) {
      return false
    }
  })
  return ebml as T
}
