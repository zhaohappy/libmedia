import AVFilterNode, { AVFilterNodeOptions } from 'avfilter/AVFilterNode'
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import VideoScaler, { ScaleParameters } from 'videoscale/VideoScaler'
import * as is from 'common/util/is'
import { mapFormat, videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'
import { NOPTS_VALUE } from 'avutil/constant'
import { AVPixelFormat } from 'avutil/pixfmt'

export interface ScaleFilterNodeOptions extends AVFilterNodeOptions {
  resource: WebAssemblyResource
  output: ScaleParameters
}

export default class ScaleFilterNode extends AVFilterNode {
  declare options: ScaleFilterNodeOptions

  private scaler: VideoScaler

  constructor(options: ScaleFilterNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {
    
  }

  public async destroy() {
    if (this.scaler) {
      this.scaler.close()
      this.scaler = null
    }
  }

  public async process(inputs: (pointer<AVFrame> | VideoFrame)[], outputs: (pointer<AVFrame> | VideoFrame)[]) {
    let avframe = inputs[0]

    if (is.number(avframe) && avframe < 0) {
      outputs[0] = avframe
      return
    }

    const width = is.number(avframe) ? avframe.width : avframe.displayWidth
    const height = is.number(avframe) ? avframe.height : avframe.displayHeight
    const format = is.number(avframe) ? avframe.format : mapFormat(avframe.format)

    if (width !== this.options.output.width
      || height !== this.options.output.height
      || format !== this.options.output.format && this.options.output.format !== NOPTS_VALUE
    ) {
      const out = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()

      if (this.scaler) {
        const currentInput = this.scaler.getInputScaleParameters()
        if (currentInput.width !== width
          || currentInput.height !== height
          || currentInput.format !== format
        ) {
          this.scaler.close()
          this.scaler = null
        }
      }
      if (!this.scaler) {
        this.scaler = new VideoScaler({
          resource: this.options.resource
        })
        await this.scaler.open(
          {
            width,
            height,
            format
          },
          {
            width: this.options.output.width,
            height: this.options.output.height,
            format: this.options.output.format !== NOPTS_VALUE
              ? this.options.output.format
              : (format === AVPixelFormat.AV_PIX_FMT_NV12 && !is.number(avframe)
                ? AVPixelFormat.AV_PIX_FMT_YUV420P
                : format
              )
          }
        )
      }

      if (!is.number(avframe)) {
        avframe = videoFrame2AVFrame(inputs[0] as VideoFrame, this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame())
      }

      this.scaler.scale(avframe, out)
      outputs[0] = out

      if (!is.number(inputs[0])) {
        this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe)) : destroyAVFrame(avframe)
      }
    }
    else {
      if (is.number(avframe)) {
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