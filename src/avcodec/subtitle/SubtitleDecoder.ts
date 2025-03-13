/*
 * libmedia wasm subtitle decoder
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

import AVCodecParameters from 'avutil/struct/avcodecparameters'
import AVPacket from 'avutil/struct/avpacket'
import Decoder from './decoder/Decoder'
import { AVCodecID } from 'avutil/codec'
import * as errorType from 'avutil/error'
import WebVttDecoder from './decoder/WebVttDecoder'
import SubRipDecoder from './decoder/SubRipDecoder'
import AssDecoder from './decoder/AssDecoder'
import TtmlDecoder from './decoder/TtmlDecoder'
import TimedTextDecoder from './decoder/TimedTextDecoder'
import TextDecoder from './decoder/TextDecoder'
import { AVSubtitle } from 'avutil/struct/avsubtitle'

export type SubtitleDecoderOptions = {
  onReceiveSubtitle?: (subtitle: AVSubtitle) => void
  onError?: (error?: Error) => void
}

export default class SubtitleDecoder {

  private options: SubtitleDecoderOptions

  private frame: AVSubtitle | undefined

  private decoder: Decoder | undefined

  constructor(options: SubtitleDecoderOptions) {
    this.options = options
  }

  private getAVFrame() {
    if (this.frame) {
      return this.frame
    }
    return this.frame = {
      pts: 0n,
      duration: 0n,
      rects: [],
      timeBase: {
        den: 1,
        num: 1
      }
    }
  }

  private outputAVFrame() {
    if (this.frame) {
      if (this.options.onReceiveSubtitle) {
        this.options.onReceiveSubtitle(this.frame)
      }
      this.frame = undefined
    }
  }

  private receiveAVFrame() {
    return this.decoder!.receiveAVFrame(this.getAVFrame())
  }

  public async open(parameters: pointer<AVCodecParameters>) {
    switch (parameters.codecId) {
      case AVCodecID.AV_CODEC_ID_WEBVTT:
        this.decoder = new WebVttDecoder()
        break
      // case AVCodecID.AV_CODEC_ID_SUBRIP:
      //   this.decoder = new SubRipDecoder()
      //   break
      case AVCodecID.AV_CODEC_ID_TTML:
        this.decoder = new TtmlDecoder()
        break
      case AVCodecID.AV_CODEC_ID_TEXT:
      case AVCodecID.AV_CODEC_ID_SUBRIP:
        this.decoder = new TextDecoder()
        break
      case AVCodecID.AV_CODEC_ID_MOV_TEXT:
        this.decoder = new TimedTextDecoder()
        break
      case AVCodecID.AV_CODEC_ID_SSA:
      case AVCodecID.AV_CODEC_ID_ASS:
        this.decoder = new AssDecoder()
        break
      default:
        return errorType.CODEC_NOT_SUPPORT
    }
    return 0
  }

  public decode(avpacket: pointer<AVPacket>) {
    let ret = this.decoder!.sendAVPacket(avpacket)

    if (ret) {
      return ret
    }

    while (true) {
      ret = this.receiveAVFrame()
      if (ret === 1) {
        this.outputAVFrame()
      }
      else if (ret < 0) {
        return ret
      }
      else {
        break
      }
    }

    return 0
  }

  public async flush() {
    this.decoder!.flush()
    while (1) {
      const ret = this.receiveAVFrame()
      if (ret < 1) {
        return
      }
      this.outputAVFrame()
    }
  }

  public close() {
    if (this.frame) {
      this.frame = undefined
    }
  }
}
