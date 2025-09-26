/*
 * libmedia mp4 box layout
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
import { BoxType } from './boxType'
import type { FragmentTrack, MOVContext, MOVStreamContext } from './type'
import type AVStream from 'avutil/AVStream'
import { AVCodecParameterFlags } from 'avutil/struct/avcodecparameters'

export interface BoxLayout {
  type: BoxType,
  children?: BoxLayout[]
}

function getTrackBoxAudioLayout(context: MOVContext, stream: AVStream) {
  return [
    {
      type: BoxType.TKHD
    },
    {
      type: BoxType.EDTS
    },
    {
      type: BoxType.MDIA,
      children: [
        {
          type: BoxType.MDHD
        },
        {
          type: BoxType.HDLR
        },
        {
          type: BoxType.MINF,
          children: [
            {
              type: BoxType.SMHD
            },
            context.isom
              ? {
                type: BoxType.MINF_HDLR
              }
              : null,
            {
              type: BoxType.DINF,
              children: [
                {
                  type: BoxType.DREF,
                  children: [
                    {
                      type: BoxType.URL
                    }
                  ]
                }
              ]
            },
            {
              type: BoxType.STBL,
              children: [
                {
                  type: BoxType.STSD
                },
                {
                  type: BoxType.STTS
                },
                {
                  type: BoxType.STSC
                },
                {
                  type: BoxType.STSZ
                },
                {
                  type: context.use64Mdat ? BoxType.CO64 : BoxType.STCO
                }
              ]
            }
          ]
        }
      ]
    }
  ] as BoxLayout[]
}

function getTrackBoxVideoLayout(context: MOVContext, stream: AVStream) {

  let hasCtts = true
  if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
    || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_VVC
  ) {
    const streamContext = stream.privData as MOVStreamContext
    if (stream.codecpar.flags & AVCodecParameterFlags.AV_CODECPAR_FLAG_NO_PTS
      && (!streamContext.cttsSampleCounts
        || !streamContext.cttsSampleCounts.length
        || streamContext.cttsSampleCounts.length === 1
          && streamContext.cttsSampleOffsets[0] === 0
      )
    ) {
      hasCtts = false
    }
  }

  return [
    {
      type: BoxType.TKHD
    },
    {
      type: BoxType.EDTS
    },
    {
      type: BoxType.MDIA,
      children: [
        {
          type: BoxType.MDHD
        },
        {
          type: BoxType.HDLR
        },
        {
          type: BoxType.MINF,
          children: [
            {
              type: BoxType.VMHD
            },
            context.isom
              ? {
                type: BoxType.MINF_HDLR
              }
              : null,
            {
              type: BoxType.DINF,
              children: [
                {
                  type: BoxType.DREF,
                  children: [
                    {
                      type: BoxType.URL
                    }
                  ]
                }
              ]
            },
            {
              type: BoxType.STBL,
              children: [
                {
                  type: BoxType.STSD
                },
                {
                  type: BoxType.STTS
                },
                {
                  type: BoxType.STSS
                },
                hasCtts
                  ? {
                    type: BoxType.CTTS
                  }
                  : null,
                {
                  type: BoxType.STSC
                },
                {
                  type: BoxType.STSZ
                },
                {
                  type: context.use64Mdat ? BoxType.CO64 : BoxType.STCO
                }
              ]
            }
          ]
        }
      ]
    }
  ] as BoxLayout[]
}

function getFragmentTrackAudioBoxLayout(context: MOVContext) {
  return [
    {
      type: BoxType.TKHD
    },
    {
      type: BoxType.MDIA,
      children: [
        {
          type: BoxType.MDHD
        },
        {
          type: BoxType.HDLR
        },
        {
          type: BoxType.MINF,
          children: [
            {
              type: BoxType.SMHD
            },
            context.isom
              ? {
                type: BoxType.MINF_HDLR
              }
              : null,
            {
              type: BoxType.DINF,
              children: [
                {
                  type: BoxType.DREF,
                  children: [
                    {
                      type: BoxType.URL
                    }
                  ]
                }
              ]
            },
            {
              type: BoxType.STBL,
              children: [
                {
                  type: BoxType.STSD
                },
                {
                  type: BoxType.STTS
                },
                {
                  type: BoxType.STSC
                },
                {
                  type: BoxType.STSZ
                },
                {
                  type: BoxType.STCO
                }
              ]
            }
          ]
        }
      ]
    }
  ] as BoxLayout[]
}

function getFragmentTrackVideoBoxLayout(context: MOVContext) {
  return [
    {
      type: BoxType.TKHD
    },
    {
      type: BoxType.MDIA,
      children: [
        {
          type: BoxType.MDHD
        },
        {
          type: BoxType.HDLR
        },
        {
          type: BoxType.MINF,
          children: [
            {
              type: BoxType.VMHD
            },
            context.isom
              ? {
                type: BoxType.MINF_HDLR
              }
              : null,
            {
              type: BoxType.DINF,
              children: [
                {
                  type: BoxType.DREF,
                  children: [
                    {
                      type: BoxType.URL
                    }
                  ]
                }
              ]
            },
            {
              type: BoxType.STBL,
              children: [
                {
                  type: BoxType.STSD
                },
                {
                  type: BoxType.STTS
                },
                {
                  type: BoxType.STSC
                },
                {
                  type: BoxType.STSZ
                },
                {
                  type: BoxType.STCO
                }
              ]
            }
          ]
        }
      ]
    }
  ] as BoxLayout[]
}

export const FragmentTrackBoxLayoutMap: Record<number, (context: MOVContext) => BoxLayout[]> = {
  [AVMediaType.AVMEDIA_TYPE_AUDIO]: getFragmentTrackAudioBoxLayout,
  [AVMediaType.AVMEDIA_TYPE_VIDEO]: getFragmentTrackVideoBoxLayout
}

export const TrackBoxLayoutMap: Record<number, (context: MOVContext, stream: AVStream) => BoxLayout[]> = {
  [AVMediaType.AVMEDIA_TYPE_AUDIO]: getTrackBoxAudioLayout,
  [AVMediaType.AVMEDIA_TYPE_VIDEO]: getTrackBoxVideoLayout
}

export const MoofTrafBoxLayout = function (track: FragmentTrack) {
  return [
    {
      type: BoxType.TFHD
    },
    {
      type: BoxType.TFDT
    },
    {
      type: BoxType.TRUN
    },
    track.cenc && (track.cenc.defaultSampleInfoSize || track.cenc.sampleSizes.length)
      ?
      {
        type: BoxType.SAIZ
      }
      : null,
    track.cenc && (track.cenc.defaultSampleInfoSize || track.cenc.sampleSizes.length)
      ?
      {
        type: BoxType.SAIO
      }
      : null,
    track.cenc
      ?
      {
        type: BoxType.SENC
      }
      : null
  ]
}
