import {
  type AVFrame,
  type AVFrameRef,
  createAVFrame,
  refAVFrame,
  destroyAVFrame,
  avRescaleQ,
  avRescaleQ2,
  type AVRational
} from '@libmedia/avutil'

import {
  AV_TIME_BASE_Q
} from '@libmedia/avutil/internal'

import { isPointer } from '@libmedia/cheap'

import { is } from '@libmedia/common'

import type { AVFilterNodeOptions } from '../AVFilterNode'
import AVFilterNode from '../AVFilterNode'

export interface FramerateFilterNodeOptions extends AVFilterNodeOptions {
  framerate: AVRational
}

export default class FramerateFilterNode extends AVFilterNode {
  declare options: FramerateFilterNodeOptions

  private lastPts: int64 = -1n

  private delta: int64 = 0n

  private timeBase: AVRational = AV_TIME_BASE_Q
  private step: int64 = 0n

  constructor(options: FramerateFilterNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {
    this.lastPts = -1n
    this.delta = 0n
    this.timeBase = AV_TIME_BASE_Q
    this.step = avRescaleQ(
      1n,
      {
        den: this.options.framerate.num,
        num: this.options.framerate.den
      },
      this.timeBase
    )
  }

  public async destroy() {

  }

  public async process(inputs: (pointer<AVFrame> | VideoFrame | int32)[], outputs: (pointer<AVFrame> | VideoFrame | int32)[]) {
    let avframe = inputs[0]

    if (is.number(avframe) && avframe < 0) {
      outputs[0] = avframe
      return
    }

    let pts = isPointer(avframe)
      ? avRescaleQ2(
        avframe.pts,
        addressof(avframe.timeBase),
        this.timeBase
      )
      : static_cast<int64>((avframe as VideoFrame).timestamp)
    let diff = pts - this.lastPts + this.delta

    if (diff < this.step && this.lastPts > -1n) {
      while (true) {
        const next = await this.inputInnerNodePort[0].request<pointer<AVFrame> | VideoFrame>('pull')
        if (is.number(next) && next < 0) {
          outputs[0] = next
          return
        }
        pts = isPointer(next)
          ? avRescaleQ2(
            next.pts,
            addressof(next.timeBase),
            this.timeBase
          )
          : static_cast<int64>(next.timestamp)
        diff = pts - this.lastPts
        if (diff >= this.step) {
          this.delta += diff - this.step
          this.lastPts = pts
          outputs[0] = next
          return
        }
        else {
          if (isPointer(next)) {
            this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(next)) : destroyAVFrame(next)
          }
          else {
            next.close()
          }
        }
      }
    }
    else {
      if (this.lastPts > -1n) {
        this.delta = diff - this.step
      }
      this.lastPts = pts

      if (isPointer(avframe)) {
        const out = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
        refAVFrame(out, avframe)
        outputs[0] = out
      }
      else {
        outputs[0] = (avframe as VideoFrame).clone()
      }
    }
  }
}
