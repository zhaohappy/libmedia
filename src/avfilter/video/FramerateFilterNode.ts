import AVFilterNode, { AVFilterNodeOptions } from '../AVFilterNode'
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import * as is from 'common/util/is'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { Rational } from 'avutil/struct/rational'
import { avRescaleQ } from 'avutil/util/rational'
import { AV_TIME_BASE_Q } from 'avutil/constant'
import isPointer from 'cheap/std/function/isPointer'

export interface FramerateFilterNodeOptions extends AVFilterNodeOptions {
  framerate: Rational
  timeBase: Rational
}

export default class FramerateFilterNode extends AVFilterNode {
  declare options: FramerateFilterNodeOptions

  private lastPts: int64

  private delta: int64

  private timeBase: Rational
  private step: int64

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

  public async process(inputs: (pointer<AVFrame> | VideoFrame)[], outputs: (pointer<AVFrame> | VideoFrame)[]) {
    let avframe = inputs[0]

    if (is.number(avframe) && avframe < 0) {
      outputs[0] = avframe
      return
    }

    let pts = avRescaleQ(
      isPointer(avframe) ? avframe.pts : static_cast<int64>(avframe.timestamp),
      this.options.timeBase,
      this.timeBase
    )
    let diff = pts - this.lastPts + this.delta

    if (diff < this.step && this.lastPts > -1n) {
      while (true) {
        const next = await this.inputInnerNodePort[0].request<pointer<AVFrame> | VideoFrame>('pull')
        if (is.number(next) && next < 0) {
          outputs[0] = next
          return
        }
        pts = avRescaleQ(
          isPointer(next) ? next.pts : static_cast<int64>(next.timestamp),
          this.options.timeBase,
          this.timeBase
        )
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
        outputs[0] = avframe.clone()
      }
    }
  }
}