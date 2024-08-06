import AVFilterNode, { AVFilterNodeOptions } from '../AVFilterNode'
import AVFrame, { AVFrameRef } from 'avutil/struct/avframe'
import { createAVFrame, destroyAVFrame, refAVFrame } from 'avutil/util/avframe'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import VideoScaler, { ScaleParameters } from 'videoscale/VideoScaler'
import * as is from 'common/util/is'
import { mapFormat, videoFrame2AVFrame } from 'avutil/function/videoFrame2AVFrame'
import { NOPTS_VALUE } from 'avutil/constant'
import { AVPixelFormat } from 'avutil/pixfmt'
import * as errorType from 'avutil/error'
import * as logger from 'common/util/logger'
import isPointer from 'cheap/std/function/isPointer'

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

    if (avframe == null) {
      debugger
    }

    const width = isPointer(avframe) ? avframe.width : avframe.displayWidth
    const height = isPointer(avframe) ? avframe.height : avframe.displayHeight
    const format = isPointer(avframe) ? avframe.format : mapFormat(avframe.format)

    if (width !== this.options.output.width
      || height !== this.options.output.height
      || format !== this.options.output.format
        && this.options.output.format !== NOPTS_VALUE
        && format !== AVPixelFormat.AV_PIX_FMT_NONE
    ) {

      if (format === AVPixelFormat.AV_PIX_FMT_NONE) {
        logger.error(`src avframe format not support`)
        outputs[0] = reinterpret_cast<pointer<AVFrame>>(errorType.FORMAT_NOT_SUPPORT)
        return
      }

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

        try {
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
                : (format === AVPixelFormat.AV_PIX_FMT_NV12 && !isPointer(avframe)
                  ? AVPixelFormat.AV_PIX_FMT_YUV420P
                  : format
                )
            }
          )
        }
        catch (error) {
          logger.error(`open scaler failed, error ${error}`)
          outputs[0] = reinterpret_cast<pointer<AVFrame>>(errorType.FORMAT_NOT_SUPPORT)
          return
        }
      }

      if (!isPointer(avframe)) {
        avframe = videoFrame2AVFrame(inputs[0] as VideoFrame, this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame())
      }

      this.scaler.scale(avframe, out)

      out.width = this.options.output.width
      out.height = this.options.output.height
      out.pts = avframe.pts
      out.duration = avframe.duration
      out.format = this.options.output.format
      out.colorPrimaries = avframe.colorPrimaries
      out.colorRange = avframe.colorRange
      out.colorSpace = avframe.colorSpace
      out.colorTrc = avframe.colorTrc

      outputs[0] = out

      if (!isPointer(inputs[0])) {
        this.options.avframePool ? this.options.avframePool.release(reinterpret_cast<pointer<AVFrameRef>>(avframe)) : destroyAVFrame(avframe)
      }
    }
    else {
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