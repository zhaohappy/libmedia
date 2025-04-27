/*
 * libmedia flv defined
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

import { AVCodecID } from 'avutil/codec'

export const enum FlvTag {
  AUDIO = 8,
  VIDEO = 9,
  SCRIPT = 18,
  SCRIPT_AMF3 = 15
}

export const enum VideoFrameType {
  // a seekable frame
  KeyFrame = 1,
  // a non - seekable frame
  InterFrame = 2,
  // H.263 only
  DisposableInterFrame = 3,
  // reserved for server use only
  GeneratedKeyFrame = 4,
  // If videoFrameType is not ignored and is set to VideoFrameType.Command,
  // the payload will not contain video data. Instead, (Ex)VideoTagHeader
  // will be followed by a UI8, representing the following meanings:
  //
  // 0 = Start of client-side seeking video frame sequence
  // 1 = End of client-side seeking video frame sequence
  //
  // frameType is ignored if videoPacketType is VideoPacketType.MetaData
  Command = 5
}

export const enum VideoCommand {
  StartSeek = 0,
  EndSeek = 1
}

export const enum VideoPacketType {
  SequenceStart = 0,
  CodedFrames = 1,
  SequenceEnd = 2,
  // CompositionTime Offset is implicitly set to zero. This optimization
  // avoids transmitting an SI24 composition time value of zero over the wire.
  // See the ExVideoTagBody section below for corresponding pseudocode.
  CodedFramesX = 3,
  // ExVideoTagBody does not contain video data. Instead, it contains
  // an AMF-encoded metadata. Refer to the Metadata Frame section for
  // an illustration of its usage. For example, the metadata might include
  // HDR information. This also enables future possibilities for expressing
  // additional metadata meant for subsequent video sequences.
  //
  // If VideoPacketType.Metadata is present, the FrameType flags
  // at the top of this table should be ignored.
  Metadata = 4,
  // Carriage of bitstream in MPEG-2 TS format
  //
  // PacketTypeSequenceStart and PacketTypeMPEG2TSSequenceStart
  // are mutually exclusive
  MPEG2TSSequenceStart = 5,
  // Turns on video multiTrack mode
  MultiTrack = 6,
  // ModEx is a special signal within the VideoPacketType enum that
  // serves to both modify and extend the behavior of the current packet.
  // When this signal is encountered, it indicates the presence of
  // additional modifiers or extensions, requiring further processing to
  // adjust or augment the packet's functionality. ModEx can be used to
  // introduce new capabilities or modify existing ones, such as
  // enabling support for high-precision timestamps or other advanced
  // features that enhance the base packet structure.
  ModEx = 7
}

export const enum AudioPacketType {
  SequenceStart = 0,
  CodedFrames = 1,
  SequenceEnd = 2,
  MultichannelConfig = 4,
  MultiTrack = 5,
  ModEx = 7
}

export const enum VideoPacketModExType {
  TimestampOffsetNano = 0
}

export const enum AudioPacketModExType {
  TimestampOffsetNano = 0
}

export const enum AVMultiTrackType {
  OneTrack = 0,
  ManyTracks,
  ManyTracksManyCodecs
}

export const enum AVCPacketType {
  AVC_SEQUENCE_HEADER,
  AVC_NALU,
  AVC_END_OF_ENQUENCE
}

export const enum AACPacketType {
  AAC_SEQUENCE_HEADER,
  AAC_RAW
}

export const enum AudioChannelOrder {
  Unspecified = 0,
  Native = 1,
  Custom = 2
}

export const AVCodecID2FlvCodecType = {
  [AVCodecID.AV_CODEC_ID_PCM_U8]: 0,
  [AVCodecID.AV_CODEC_ID_PCM_S16LE]: 3,
  [AVCodecID.AV_CODEC_ID_AAC]: 10,
  [AVCodecID.AV_CODEC_ID_MP3]: 2,
  [AVCodecID.AV_CODEC_ID_SPEEX]: 11,
  [AVCodecID.AV_CODEC_ID_ADPCM_SWF]: 1,
  [AVCodecID.AV_CODEC_ID_NELLYMOSER]: 6,
  [AVCodecID.AV_CODEC_ID_PCM_ALAW]: 7,
  [AVCodecID.AV_CODEC_ID_PCM_MULAW]: 8,

  [AVCodecID.AV_CODEC_ID_H264]: 7,
  [AVCodecID.AV_CODEC_ID_HEVC]: 12,
  // [AVCodecID.AV_CODEC_ID_VVC]: 13,
  [AVCodecID.AV_CODEC_ID_MPEG4]: 9,
  [AVCodecID.AV_CODEC_ID_H263]: 2,
  [AVCodecID.AV_CODEC_ID_FLASHSV]: 3,
  [AVCodecID.AV_CODEC_ID_VP6F]: 4,
  [AVCodecID.AV_CODEC_ID_VP6A]: 5,
  [AVCodecID.AV_CODEC_ID_FLASHSV2]: 6
}

export const FlvAudioCodecType2AVCodecID = {
  10: AVCodecID.AV_CODEC_ID_AAC,
  2: AVCodecID.AV_CODEC_ID_MP3,
  11: AVCodecID.AV_CODEC_ID_SPEEX,

  1: AVCodecID.AV_CODEC_ID_ADPCM_SWF,
  4: AVCodecID.AV_CODEC_ID_NELLYMOSER,
  5: AVCodecID.AV_CODEC_ID_NELLYMOSER,
  6: AVCodecID.AV_CODEC_ID_NELLYMOSER,
  7: AVCodecID.AV_CODEC_ID_PCM_ALAW,
  8: AVCodecID.AV_CODEC_ID_PCM_MULAW
}

export const FlvVideoCodecType2AVCodecID = {
  7: AVCodecID.AV_CODEC_ID_H264,
  12: AVCodecID.AV_CODEC_ID_HEVC,
  // 13: AVCodecID.AV_CODEC_ID_VVC,
  9: AVCodecID.AV_CODEC_ID_MPEG4,

  2: AVCodecID.AV_CODEC_ID_H263,
  3: AVCodecID.AV_CODEC_ID_FLASHSV,
  4: AVCodecID.AV_CODEC_ID_VP6F,
  5: AVCodecID.AV_CODEC_ID_VP6A,
  6: AVCodecID.AV_CODEC_ID_FLASHSV2
}

export const AVCodecID2FlvCodecTag = {
  [AVCodecID.AV_CODEC_ID_H264]: 'avc1',
  [AVCodecID.AV_CODEC_ID_HEVC]: 'hvc1',
  [AVCodecID.AV_CODEC_ID_VVC]: 'vvc1',
  [AVCodecID.AV_CODEC_ID_VP8]: 'vp08',
  [AVCodecID.AV_CODEC_ID_VP9]: 'vp09',
  [AVCodecID.AV_CODEC_ID_AV1]: 'av01',

  [AVCodecID.AV_CODEC_ID_AC3]: 'ac-3',
  [AVCodecID.AV_CODEC_ID_EAC3]: 'ec-3',
  [AVCodecID.AV_CODEC_ID_OPUS]: 'Opus',
  [AVCodecID.AV_CODEC_ID_FLAC]: 'fLaC',
  [AVCodecID.AV_CODEC_ID_MP3]: '.mp3',
  [AVCodecID.AV_CODEC_ID_AAC]: 'mp4a'
}
