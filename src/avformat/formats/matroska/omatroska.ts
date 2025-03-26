/*
 * libmedia matroska encoder util
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

import { BytesWriterSync, Uint8ArrayInterface } from 'common/io/interface'
import { EBMLId } from './matroska'
import * as is from 'common/util/is'
import IOWriterSync from 'common/io/IOWriterSync'
import * as text from 'common/util/text'
import { Attachment, Attachments, AudioTrack, Chapter, ChapterAtom, ChapterDisplay,
  Chapters, CuePoint, CuePointPos, Cues, ElePositionInfo, Header, Info, OMatroskaContext,
  SeekHead, SeekHeadEntry, SimpleTag, Tag, TagTargets, Tags, TrackEntry, Tracks, VideoColor, VideoTrack
} from './type'
import concatTypeArray from 'common/function/concatTypeArray'
import * as array from 'common/util/array'
import * as object from 'common/util/object'

export function ebmlIdSize(id: EBMLId) {
  return Math.floor((Math.log2(id) + 7) / 8)
}

export function ebmlNumSize(value: number | bigint) {
  let bytes = 0
  do {
    bytes++
    // @ts-ignore
  } while (value >>= (is.bigint(value) ? 7n : 7))

  return bytes
}

export function ebmlLengthSize(value: number | bigint) {
  return is.bigint(value) ? ebmlNumSize(value + 1n) : ebmlNumSize(value + 1)
}

export function writeEbmlNum(writer: BytesWriterSync, value: number | bigint, bytes: int32) {
  if (is.bigint(value)) {
    value |= (1n << BigInt(bytes * 7))
    for (let i = bytes - 1; i >= 0; i--) {
      writer.writeUint8(Number((value >> BigInt(i * 8)) & 0xffn))
    }
  }
  else {
    value |= (1 << bytes * 7)
    for (let i = bytes - 1; i >= 0; i--) {
      writer.writeUint8((value >> (i * 8)) & 0xff)
    }
  }
}

export function writeEbmlId(writer: BytesWriterSync, id: EBMLId) {
  let len = ebmlIdSize(id)
  while (len--) {
    writer.writeUint8(id >> (len * 8))
  }
}

export function writeEbmlLength(writer: BytesWriterSync, length:  number | bigint, bytes: int32 = 0) {
  let need = ebmlLengthSize(length)

  if (bytes === 0) {
    bytes = need
  }

  writeEbmlNum(writer, length, bytes)
}

export function writeEbmlLengthUnknown(writer: BytesWriterSync, bytes: int32) {
  writer.writeUint8(0x1ff >> bytes)
  for (let i = 0; i < bytes - 1; i++) {
    writer.writeUint8(0xff)
  }
}

export function writeEbmlUid(writer: IOWriterSync, id: EBMLId, uid: uint64) {
  writeEbmlId(writer, id)
  writeEbmlLength(writer, 8)
  writer.writeUint64(uid)
}

export function writeEbmlUint(writer: IOWriterSync, id: EBMLId, value: number | bigint) {
  let bytes = 1
  let tmp = value

  if (is.bigint(tmp)) {
    while (tmp >>= 8n) {
      bytes++
    }
  }
  else {
    while (tmp >>= 8) {
      bytes++
    }
  }

  writeEbmlId(writer, id)
  writeEbmlLength(writer, bytes)
  for (let i = bytes - 1; i >= 0; i--) {
    writer.writeUint8(is.bigint(value) ? Number(value >> BigInt(i * 8)) : (value >> i * 8))
  }
}

export function writeEbmlSint(writer: IOWriterSync, id: EBMLId, value: number | bigint) {
  let bytes = 0
  if (value) {
    let bitLength = value < 0 ? (~value).toString(2).length : value.toString(2).length
    bytes = Math.ceil((bitLength + 1) / 8)
  }
  writeEbmlId(writer, id)
  writeEbmlLength(writer, bytes)
  switch (bytes) {
    case 0:
      return
    case 1:
      writer.writeInt8(Number(value))
      return
    case 2:
      writer.writeInt16(Number(value))
      return
    case 3:
      writer.writeInt24(Number(value))
      return
    case 4:
      writer.writeInt32(Number(value))
      return
  }
  value = BigInt.asUintN(bytes * 8, BigInt(value))
  for (let i = bytes - 1; i >= 0; i--) {
    writer.writeUint8(Number(value >> BigInt(i * 8)))
  }
}

export function writeEbmlFloat(writer: IOWriterSync, id: EBMLId, value: float) {
  writeEbmlId(writer, id)
  writeEbmlLength(writer, 4)
  writer.writeFloat(value)
}

export function writeEbmlDouble(writer: IOWriterSync, id: EBMLId, value: double) {
  writeEbmlId(writer, id)
  writeEbmlLength(writer, 8)
  writer.writeDouble(value)
}

export function writeEbmlBuffer(writer: IOWriterSync, id: EBMLId, value: Uint8ArrayInterface) {
  writeEbmlId(writer, id)
  writeEbmlLength(writer, value.length)
  writer.writeBuffer(value)
}

export function writeEbmlString(writer: IOWriterSync, id: EBMLId, value: string) {
  const buffer = text.encode(value)
  writeEbmlBuffer(writer, id, buffer)
}

export function writeEbmlVoid(writer: IOWriterSync, size: int32) {
  writeEbmlId(writer, EBMLId.VOID)
  if (size < 10) {
    size -= 2
    writeEbmlLength(writer, size)
  }
  else {
    size -= 9
    writeEbmlLength(writer, size, 8)
  }
  writer.writeBuffer(new Uint8Array(size).fill(0))
}

export function updatePositionSize(ioWriter: IOWriterSync, context: OMatroskaContext) {
  const pos = ioWriter.getPos()
  const pointer = ioWriter.getPointer()
  const minPos = pos - static_cast<int64>(pointer)

  const seeks: ElePositionInfo[] = []

  array.each(context.elePositionInfos, (item) => {
    if (item.pos < pos && item.pos >= minPos) {
      ioWriter.seekInline(pointer + Number(item.pos - pos))
      writeEbmlLength(ioWriter, item.length, item.bytes)
    }
    else {
      seeks.push(item)
    }
  })

  array.each(seeks, (item) => {
    ioWriter.seek(item.pos)
    writeEbmlLength(ioWriter, item.length, item.bytes)
  })

  if (seeks.length) {
    ioWriter.seek(pos)
  }
  else {
    ioWriter.seekInline(pointer)
  }
  ioWriter.flush()
  context.elePositionInfos = []
}

export function writeEleData(writer: IOWriterSync, context: OMatroskaContext, id: EBMLId, data: (eleWriter: IOWriterSync) => void) {
  context.eleWriter.flush()
  const oldCache = context.eleCaches

  context.eleCaches = []
  data(context.eleWriter)
  context.eleWriter.flush()
  const buffer = concatTypeArray(Uint8Array, context.eleCaches)

  context.eleCaches = oldCache
  writeEbmlBuffer(writer, id, buffer)
}

export function writeHeader(writer: IOWriterSync, context: OMatroskaContext, header: Header) {
  writeEleData(writer, context, EBMLId.HEADER, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.EBML_VERSION, header.version)
    writeEbmlUint(eleWriter, EBMLId.EBML_READ_VERSION, header.readVersion)
    writeEbmlUint(eleWriter, EBMLId.EBML_MAX_ID_LENGTH, header.maxIdLength)
    writeEbmlUint(eleWriter, EBMLId.EBML_MAX_SIZE_LENGTH, header.maxSizeLength)
    writeEbmlString(eleWriter, EBMLId.DOCTYPE, header.docType)
    writeEbmlUint(eleWriter, EBMLId.DOC_TYPE_VERSION, header.docTypeVersion)
    writeEbmlUint(eleWriter, EBMLId.DOC_TYPE_READ_VERSION, header.docTypeReadVersion)
  })
}

export function writeSeekHeaderEntry(writer: IOWriterSync, context: OMatroskaContext, entry: SeekHeadEntry) {
  writeEleData(writer, context, EBMLId.SEEK_ENTRY, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.SEEK_ID, entry.id)
    writeEbmlUint(eleWriter, EBMLId.SEEK_POSITION, entry.pos)
  })
}

export function writeSeekHeader(writer: IOWriterSync, context: OMatroskaContext, header: SeekHead) {
  writeEleData(writer, context, EBMLId.SEEK_HEAD, (eleWriter) => {
    header.entry.forEach((entry) => {
      writeSeekHeaderEntry(eleWriter, context, entry)
    })
  })
}

export function writeInfo(writer: IOWriterSync, context: OMatroskaContext, info: Info) {
  writeEleData(writer, context, EBMLId.INFO, (eleWriter) => {
    writeEbmlUid(eleWriter, EBMLId.SEGMENT_UID, info.segmentUUID)
    writeEbmlUint(eleWriter, EBMLId.TIME_CODE_SCALE, info.timestampScale)
    writeEbmlDouble(eleWriter, EBMLId.DURATION, static_cast<double>(info.duration))
    writeEbmlString(eleWriter, EBMLId.MUXING_APP, info.muxingApp)
    writeEbmlString(eleWriter, EBMLId.WRITING_APP, info.writingApp)
  })
}

export function writeVideoColor(writer: IOWriterSync, context: OMatroskaContext, color: VideoColor) {
  writeEleData(writer, context, EBMLId.VIDEO_COLOR, (eleWriter) => {
    if (object.has(color, 'matrixCoefficients')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_MATRIX_COEFF, color.matrixCoefficients)
    }
    if (object.has(color, 'primaries')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_PRIMARIES, color.primaries)
    }
    if (object.has(color, 'transferCharacteristics')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_TRANSFER_CHARACTERISTICS, color.transferCharacteristics)
    }
    if (object.has(color, 'range')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_RANGE, color.range)
    }
    if (object.has(color, 'chromaSitingVert')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_CHROMA_SITING_VERT, color.chromaSitingVert)
    }
    if (object.has(color, 'chromaSitingHorz')) {
      writeEbmlUint(eleWriter, EBMLId.VIDEO_COLOR_CHROMA_SITING_HORZ, color.chromaSitingHorz)
    }
  })
}

export function writeVideoTrack(writer: IOWriterSync, context: OMatroskaContext, video: VideoTrack) {
  writeEleData(writer, context, EBMLId.TRACK_VIDEO, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.VIDEO_PIXEL_WIDTH, video.pixelWidth)
    writeEbmlUint(eleWriter, EBMLId.VIDEO_PIXEL_HEIGHT, video.pixelHeight)
    if (video.color) {
      writeVideoColor(eleWriter, context, video.color)
    }
  })
}

export function writeAudioTrack(writer: IOWriterSync, context: OMatroskaContext, audio: AudioTrack) {
  writeEleData(writer, context, EBMLId.TRACK_AUDIO, (eleWriter) => {
    writeEbmlDouble(eleWriter, EBMLId.AUDIO_SAMPLING_FREQ, reinterpret_cast<double>(audio.sampleRate))
    if (audio.outSampleRate) {
      writeEbmlDouble(eleWriter, EBMLId.AUDIO_SAMPLING_FREQ, reinterpret_cast<double>(audio.outSampleRate))
    }
    writeEbmlUint(eleWriter, EBMLId.AUDIO_BITDEPTH, audio.bitDepth)
    writeEbmlUint(eleWriter, EBMLId.AUDIO_CHANNELS, audio.channels)
  })
}

export function writeTrack(writer: IOWriterSync, context: OMatroskaContext, track: TrackEntry) {
  writeEleData(writer, context, EBMLId.TRACK_ENTRY, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.TRACK_NUMBER, track.number)
    writeEbmlUid(eleWriter, EBMLId.TRACK_UID, track.uid)
    writeEbmlUint(eleWriter, EBMLId.TRACK_TYPE, track.type)
    if (track.language) {
      writeEbmlString(eleWriter, EBMLId.TRACK_NAME, track.language)
    }
    if (track.name) {
      writeEbmlString(eleWriter, EBMLId.TRACK_NAME, track.name)
    }
    writeEbmlString(eleWriter, EBMLId.CODEC_ID, track.codecId)

    if (track.codecPrivate) {
      writeEbmlBuffer(eleWriter, EBMLId.CODEC_PRIVATE, track.codecPrivate.data)
    }

    if (track.audio) {
      writeAudioTrack(eleWriter, context, track.audio)
    }
    else if (track.video) {
      writeVideoTrack(eleWriter, context, track.video)
    }
  })
}

export function writeTracks(writer: IOWriterSync, context: OMatroskaContext, tracks: Tracks) {
  writeEleData(writer, context, EBMLId.TRACKS, (eleWriter) => {
    tracks.entry.forEach((track) => {
      writeTrack(eleWriter, context, track)
    })
  })
}

export function writeTagTag(writer: IOWriterSync, context: OMatroskaContext, tag: SimpleTag) {
  writeEleData(writer, context, EBMLId.TAG_SIMPLE, (eleWriter) => {
    if (tag.name) {
      writeEbmlString(eleWriter, EBMLId.TAG_NAME, tag.name)
    }
    if (tag.string) {
      writeEbmlString(eleWriter, EBMLId.TAG_STRING, tag.string)
    }
    if (tag.language) {
      writeEbmlString(eleWriter, EBMLId.TAG_LANG, tag.language)
    }
    if (object.has(tag, 'default')) {
      writeEbmlUint(eleWriter, EBMLId.TAG_DEFAULT, tag.default)
    }
    if (tag.sub) {
      writeTagTag(eleWriter, context, tag.sub)
    }
  })
}

export function writeTagTarget(writer: IOWriterSync, context: OMatroskaContext, target: TagTargets) {
  writeEleData(writer, context, EBMLId.TAG_TARGETS, (eleWriter) => {
    if (target.type) {
      writeEbmlString(eleWriter, EBMLId.TAG_TARGETS_TYPE, target.type)
    }
    if (object.has(target, 'typeValue')) {
      writeEbmlUint(eleWriter, EBMLId.TAG_TARGETS_TYPE_VALUE, target.typeValue)
    }
    if (object.has(target, 'trackUid')) {
      writeEbmlUid(eleWriter, EBMLId.TAG_TARGETS_TRACK_UID, target.trackUid)
    }
    if (object.has(target, 'chapterUid')) {
      writeEbmlUid(eleWriter, EBMLId.TAG_TARGETS_CHAPTER_UID, target.chapterUid)
    }
    if (object.has(target, 'attachUid')) {
      writeEbmlUid(eleWriter, EBMLId.TAG_TARGETS_CHAPTER_UID, target.attachUid)
    }
  })
}

export function writeTag(writer: IOWriterSync, context: OMatroskaContext, tag: Tag) {
  writeEleData(writer, context, EBMLId.TAG, (eleWriter) => {
    if (tag.tag) {
      writeTagTag(eleWriter, context, tag.tag)
    }
    if (tag.target) {
      writeTagTarget(eleWriter, context, tag.target)
    }
  })
}

export function writeTags(writer: IOWriterSync, context: OMatroskaContext, tags: Tags) {
  writeEleData(writer, context, EBMLId.TAGS, (eleWriter) => {
    tags.entry.forEach((tag) => {
      writeTag(eleWriter, context, tag)
    })
  })
}

export function writeCuePosition(writer: IOWriterSync, context: OMatroskaContext, pos: CuePointPos) {
  writeEleData(writer, context, EBMLId.CUE_TRACK_POSITION, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.CUE_TRACK, pos.track)
    writeEbmlUint(eleWriter, EBMLId.CUE_CLUSTER_POSITION, pos.pos)
  })
}

export function writeCue(writer: IOWriterSync, context: OMatroskaContext, cue: CuePoint) {
  writeEleData(writer, context, EBMLId.POINT_ENTRY, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.CUE_TIME, cue.time)
    cue.pos.forEach((p) => {
      writeCuePosition(eleWriter, context, p)
    })
  })
}

export function writeCues(writer: IOWriterSync, context: OMatroskaContext, cues: Cues) {
  writeEleData(writer, context, EBMLId.CUES, (eleWriter) => {
    cues.entry.forEach((cue) => {
      writeCue(eleWriter, context, cue)
    })
  })
}

export function writeChapterAtomDisplay(writer: IOWriterSync, context: OMatroskaContext, display: ChapterDisplay) {
  writeEleData(writer, context, EBMLId.CHAPTER_DISPLAY, (eleWriter) => {
    writeEbmlString(eleWriter, EBMLId.CHAP_STRING, display.title)
    writeEbmlString(eleWriter, EBMLId.CHAP_LANG, display.language)
  })
}

export function writeChapterAtom(writer: IOWriterSync, context: OMatroskaContext, atom: ChapterAtom) {
  writeEleData(writer, context, EBMLId.CHAPTER_ATOM, (eleWriter) => {
    writeEbmlUint(eleWriter, EBMLId.CHAPTER_TIME_START, atom.start)
    writeEbmlUint(eleWriter, EBMLId.CHAPTER_TIME_END, atom.end)
    writeEbmlUid(eleWriter, EBMLId.CHAPTER_UID, atom.uid)
    if (atom.display) {
      writeChapterAtomDisplay(eleWriter, context, atom.display)
    }
  })
}

export function writeChapter(writer: IOWriterSync, context: OMatroskaContext, chapter: Chapter) {
  writeEleData(writer, context, EBMLId.EDITION_ENTRY, (eleWriter) => {
    array.each(chapter.atom, (item) => {
      writeChapterAtom(eleWriter, context, item)
    })
  })
}

export function writeChapters(writer: IOWriterSync, context: OMatroskaContext, chapters: Chapters) {
  writeEleData(writer, context, EBMLId.CHAPTERS, (eleWriter) => {
    chapters.entry.forEach((chapter) => {
      writeChapter(eleWriter, context, chapter)
    })
  })
}

export function writeAttachment(writer: IOWriterSync, context: OMatroskaContext, attachment: Attachment) {

  writeEbmlId(writer, EBMLId.ATTACHED_FILE)

  const info: ElePositionInfo = {
    pos: writer.getPos(),
    length: 0,
    bytes: 8
  }
  writeEbmlLength(writer, 0, 8)

  const now = writer.getPos()
  writeEbmlUid(writer, EBMLId.FILE_UID, attachment.uid)
  writeEbmlString(writer, EBMLId.FILE_NAME, attachment.name)
  writeEbmlString(writer, EBMLId.FILE_MIMETYPE, attachment.mime)
  if (attachment.description) {
    writeEbmlString(writer, EBMLId.FILE_DESC, attachment.description)
  }
  if (attachment.data) {
    writeEbmlBuffer(writer, EBMLId.FILE_DATA, attachment.data.data)
  }
  info.length = writer.getPos() - now
  context.elePositionInfos.push(info)
}

export function writeAttachments(writer: IOWriterSync, context: OMatroskaContext, attachments: Attachments) {
  const old = context.elePositionInfos
  context.elePositionInfos = []

  writeEbmlId(writer, EBMLId.ATTACHMENTS)

  const info: ElePositionInfo = {
    pos: writer.getPos(),
    length: 0,
    bytes: 8
  }
  writeEbmlLength(writer, 0, 8)

  const now = writer.getPos()
  attachments.entry.forEach((attachment) => {
    writeAttachment(writer, context, attachment)
  })

  info.length = writer.getPos() - now
  context.elePositionInfos.push(info)

  updatePositionSize(writer, context)

  context.elePositionInfos = old
}
