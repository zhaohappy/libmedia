import { AV_TIME_BASE_Q } from 'avutil/constant'
import AVFilterNode, { AVFilterNodeOptions } from './AVFilterNode'
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { avRescaleQ2 } from 'avutil/util/rational'
import isPointer from 'cheap/std/function/isPointer'
import { IOError } from 'common/io/error'
import * as is from 'common/util/is'

export interface RangeFilterNodeOptions extends AVFilterNodeOptions {
  /**
   * 微秒时间戳
   */
  start: int64
  /**
   * 微秒时间戳
   */
  end: int64
}

export default class RangeFilterNode extends AVFilterNode {
  declare options: RangeFilterNodeOptions

  constructor(options: RangeFilterNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {

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
        AV_TIME_BASE_Q
      )
      : static_cast<int64>((avframe as VideoFrame).timestamp as uint32)

    if (pts < this.options.start) {
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
            AV_TIME_BASE_Q
          )
          : static_cast<int64>(next.timestamp as uint32)
        if (pts >= this.options.start) {
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
    else if (pts > this.options.end && this.options.end >= this.options.start) {
      outputs[0] = IOError.END
      return
    }
    else {
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
