/*
 * libmedia rtp frame queue
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
import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { UINT16_MAX } from 'avutil/constant'
import * as h264 from 'avutil/codecs/h264'
import * as hevc from 'avutil/codecs/hevc'
import { Data } from 'common/types/type'
import { RTPPacket } from './RTPPacket'
import { RTP_HEVC_DOND_FIELD_SIZE, RTP_HEVC_DONL_FIELD_SIZE, RTP_HEVC_PAYLOAD_HEADER_SIZE } from './rtp'

const UINT16_MID = UINT16_MAX >>> 1

/**
 * TODO 支持 nack
 */
export default class RTPFrameQueue {

  private queue: RTPPacket[]

  private frameQueue: RTPPacket[][]

  private codecpar: pointer<AVCodecParameters>

  private currentSeqStart: number
  private readyPos: number
  private maskerQueue: number[]
  private payloadContext: Data

  constructor(codecpar: pointer<AVCodecParameters>, payloadContext: Data) {
    this.codecpar = codecpar
    this.queue = []
    this.frameQueue = []
    this.currentSeqStart = -1
    this.readyPos = 0
    this.maskerQueue = []
    this.payloadContext = payloadContext
  }

  /**
   * 判断 start 和 end 是否邻近
   * 
   * @param start 
   * @param end 
   * @returns 
   */
  private isSeqIncreaseOne(start: number, end: number) {
    return start + 1 === end
      || start === UINT16_MAX
      && end === 0
  }

  /**
   * 判断 seq a 大于 b
   * 需要考虑回环
   * 
   * @param a 
   * @param b 
   * @returns 
   */
  private seqAMoreThenB(a: number, b: number) {
    return (a > b && (a - b) < UINT16_MID) || (a < b && (b - a) > UINT16_MID)
  }

  private isFirstStart() {
    if (this.currentSeqStart > -1) {
      return this.isSeqIncreaseOne(this.currentSeqStart, this.queue[0].header.sequence)
    }
    else {
      if (this.queue.length > 5) {
        if (this.codecpar.codecType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
          return true
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
          const type = this.queue[0].payload[0] & 0x1f
          switch (type) {
            case 24:
              for (let i = 1; i < this.queue[0].payload.length - 2;) {
                const size = (this.queue[0].payload[i] << 8) | this.queue[0].payload[i + 1]
                const type = this.queue[0].payload[i + 2] & 0x1f
                if (type === h264.H264NaluType.kSliceSPS
                  || type === h264.H264NaluType.kSlicePPS
                  || type === h264.H264NaluType.kSliceIDR
                  || type === h264.H264NaluType.kSliceAUD
                ) {
                  return true
                }
                i += 2 + size
              }
              break
            case 28:
              const fuHeader = this.queue[0].payload[1]
              if ((fuHeader & 0x80)) {
                return true
              }
              break
            // case h264.H264NaluType.kSliceIDR:
            case h264.H264NaluType.kSliceSPS:
            // case h264.H264NaluType.kSlicePPS:
            case h264.H264NaluType.kSliceAUD:
              return true
          }
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
          const type = (this.queue[0].payload[0] >>> 1) & 0x3f
          switch (type) {
            case 48:
              let i = RTP_HEVC_PAYLOAD_HEADER_SIZE + (this.payloadContext.usingDonlField ? RTP_HEVC_DONL_FIELD_SIZE : 0)
              for (; i < this.queue[0].payload.length - RTP_HEVC_PAYLOAD_HEADER_SIZE;) {
                const size = (this.queue[0].payload[i] << 8) | this.queue[0].payload[i + 1]
                const type = (this.queue[0].payload[i + 2] >>> 1) & 0x3f
                if (type === hevc.HEVCNaluType.kSlicePPS
                  || type === hevc.HEVCNaluType.kSliceVPS
                  || type === hevc.HEVCNaluType.kSliceSPS
                  || type === hevc.HEVCNaluType.kSliceIDR_N_LP
                  || type === hevc.HEVCNaluType.kSliceIDR_W_RADL
                  || type === hevc.HEVCNaluType.kSliceAUD
                ) {
                  return true
                }
                i += 2 + size
                if (this.payloadContext.usingDonlField) {
                  i += RTP_HEVC_DOND_FIELD_SIZE
                }
              }
              break
            case 49:
              const fuHeader = this.queue[0].payload[2]
              if ((fuHeader & 0x80)) {
                return true
              }
              break
            // case hevc.HEVCNaluType.kSlicePPS:
            // case hevc.HEVCNaluType.kSliceSPS:
            case hevc.HEVCNaluType.kSliceVPS:
            // case hevc.HEVCNaluType.kSliceIDR_N_LP:
            // case hevc.HEVCNaluType.kSliceIDR_W_RADL:
            case hevc.HEVCNaluType.kSliceAUD:
              return true
          }
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP8) {
          if (this.queue[0].payload[0] & 0x10) {
            return true
          }
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_VP9) {
          if (this.queue[0].payload[0] & 0x08) {
            return true
          }
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_AV1) {
          if (this.queue[0].payload[0] & 0x01) {
            return true
          }
        }
        else if (this.codecpar.codecId === AVCodecID.AV_CODEC_ID_MPEG2VIDEO) {
          if (((this.queue[0].payload[2] >>> 5) & 0x01) === 1) {
            return true
          }
        }
        // 超过 200 个包开始输出，不用再等前面的包了，因为可能没有了
        if (this.readyPos > 200) {
          return true
        }
        return false
      }
      else {
        return false
      }
    }
  }

  private check() {
    // 移动已就绪指针并且保存 masker 索引
    for (; this.readyPos < this.queue.length - 1;) {
      if (this.isSeqIncreaseOne(this.queue[this.readyPos].header.sequence, this.queue[this.readyPos + 1].header.sequence)) {
        this.readyPos++
        if (this.queue[this.readyPos].header.masker
          || this.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_ALAW
          || this.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_MULAW
          || this.codecpar.codecId === AVCodecID.AV_CODEC_ID_MP3
          || this.codecpar.codecId === AVCodecID.AV_CODEC_ID_ADPCM_G722
          || this.codecpar.codecId === AVCodecID.AV_CODEC_ID_PCM_S16BE
        ) {
          this.maskerQueue.push(this.readyPos)
        }
      }
      else {
        break
      }
    }
  }

  public push(packet: RTPPacket) {

    // 已经输出帧之前的包直接忽略
    if (this.currentSeqStart > -1 && this.seqAMoreThenB(this.currentSeqStart, packet.header.sequence)) {
      return
    }

    // 第一个直接 push 返回
    if (!this.queue.length) {
      this.queue.push(packet)
      if (packet.header.masker) {
        this.maskerQueue.push(0)
      }
      return
    }

    let added = false

    // seq 比队列中的第一个包小，插入到队首并重新处理 readyPos 和 maskerQueue
    if (this.seqAMoreThenB(this.queue[0].header.sequence, packet.header.sequence)) {
      this.queue.unshift(packet)
      this.readyPos = 0
      this.maskerQueue.length = 0
      added = true
      this.check()
    }
    else {
      // 从 readyPos 开始查找当前的包需要插入的位置
      for (let i = this.readyPos; i < this.queue.length; i++) {
        if (this.seqAMoreThenB(this.queue[i].header.sequence, packet.header.sequence) ) {
          this.queue.splice(i, 0, packet)
          added = true
          // 插入在当前的 readyPos 后一个位置，检查是否可以移动 readyPos 指针
          if (i === this.readyPos + 1) {
            this.check()
          }
          break
        }
      }
    }
    // 没找到插入点，插入到最后
    if (!added) {
      this.queue.push(packet)
      // 插入在当前的 readyPos 后一个位置，检查是否可以移动 readyPos 指针
      if (this.readyPos + 2 === this.queue.length) {
        this.check()
      }
    }
    let offset = 0
    // 将已经就绪的帧放进 frameQueue
    while (this.isFirstStart() && this.maskerQueue.length) {
      const makerPos = this.maskerQueue.shift() + 1
      const packets = this.queue.slice(offset, makerPos)
      this.frameQueue.push(packets)
      offset = makerPos
      this.currentSeqStart = packets[packets.length - 1].header.sequence
    }
    if (offset) {
      this.queue = this.queue.slice(offset)
      // 更新 readyPos 和 剩余 masker 指针
      this.readyPos = Math.max(0, this.readyPos - offset)
      for (let i = 0; i < this.maskerQueue.length; i++) {
        this.maskerQueue[i] -= offset
      }
    }
  }

  public hasFrame() {
    return this.frameQueue.length
  }

  public getFrame() {
    return this.frameQueue.shift()
  }
}
