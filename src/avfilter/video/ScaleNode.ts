import AVFilterNode, { AVFilterNodeOptions } from 'avfilter/AVFilterNode'
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import { createAVFrame, destroyAVFrame } from 'avutil/util/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import VideoScaler, { ScaleParameters } from 'videoscale/VideoScaler'
import * as is from 'common/util/is'
import { videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'

export interface ScaleNodeOptions extends AVFilterNodeOptions {
  resource: WebAssemblyResource
  input: ScaleParameters
  output: ScaleParameters
}

export default class ScaleNode extends AVFilterNode {
  declare options: ScaleNodeOptions

  private scaler: VideoScaler

  constructor(options: ScaleNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {
    this.scaler = new VideoScaler({
      resource: this.options.resource
    })
    await this.scaler.open(
      this.options.input,
      this.options.output
    )
  }

  public async destroy() {
    if (this.scaler) {
      this.scaler.close()
      this.scaler = null
    }
  }

  public async process(inputs: (pointer<AVFrame> | VideoFrame)[], outputs: (pointer<AVFrame> | VideoFrame)[]) {
    let avframe = inputs[0]
    const out = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()
    
    if (!is.number(avframe)) {
      avframe = videoFrame2AVFrame(inputs[0] as VideoFrame, this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame())
    }
    this.scaler.scale(avframe, out)
    outputs[0] = out

    if (!is.number(inputs[0])) {
      this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe)) : destroyAVFrame(avframe)
    }
  }
}