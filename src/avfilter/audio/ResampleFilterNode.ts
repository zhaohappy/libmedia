import Resampler, { PCMParameters } from 'audioresample/Resampler'
import AVFilterNode, { AVFilterNodeOptions } from '../AVFilterNode'
import AVFrame, { AV_NUM_DATA_POINTERS } from 'avutil/struct/avframe'
import AVPCMBuffer from 'avutil/struct/avpcmbuffer'
import { createAVFrame, refAVFrame, unrefAVFrame } from 'avutil/util/avframe'
import { avFree, avFreep, avMalloc, avMallocz } from 'avutil/util/mem'
import { sampleFormatIsPlanar } from 'avutil/util/sample'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as errorType from 'avutil/error'
import { avbufferCreate } from 'avutil/util/avbuffer'
import { NOPTS_VALUE } from 'avutil/constant'
import * as logger from 'common/util/logger'
import * as is from 'common/util/is'
import compileResource from 'avutil/function/compileResource'

export interface ResampleFilterNodeOptions extends AVFilterNodeOptions {
  resource: WebAssemblyResource | ArrayBuffer
  output: PCMParameters
}

export default class ResampleFilterNode extends AVFilterNode {
  declare options: ResampleFilterNodeOptions

  private resampler: Resampler | undefined

  private pcm: pointer<AVPCMBuffer> = nullptr

  constructor(options: ResampleFilterNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {
    this.pcm = reinterpret_cast<pointer<AVPCMBuffer>>(avMallocz(sizeof(AVPCMBuffer)))
  }

  public async destroy() {
    if (this.pcm) {
      if (this.pcm.data) {
        avFreep(addressof(this.pcm.data[0]))
        avFreep(reinterpret_cast<pointer<pointer<void>>>(addressof(this.pcm.data)))
      }
      avFree(this.pcm)
    }
    if (this.resampler) {
      this.resampler.close()
      this.resampler = undefined
    }
  }

  public async process(inputs: (pointer<AVFrame> | int32)[], outputs: (pointer<AVFrame> | int32)[]) {
    const avframe = inputs[0] as pointer<AVFrame>

    if (avframe < 0) {
      outputs[0] = avframe
      return
    }

    const out = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()

    if (avframe.sampleRate !== this.options.output.sampleRate
      || avframe.chLayout.nbChannels !== this.options.output.channels
      || avframe.format !== this.options.output.format && this.options.output.format !== NOPTS_VALUE
    ) {
      if (this.resampler) {
        const currentInput = this.resampler.getInputPCMParameters()!
        if (currentInput.channels !== avframe.chLayout.nbChannels
          || currentInput.sampleRate !== avframe.sampleRate
          || currentInput.format !== avframe.format
        ) {
          this.resampler.close()
          this.resampler = undefined
        }
      }
      if (!this.resampler) {
        let resource = this.options.resource
        if (is.arrayBuffer(resource)) {
          resource = await compileResource(resource)
        }
        this.resampler = new Resampler({
          resource
        })
        const ret = await this.resampler.open(
          {
            channels: avframe.chLayout.nbChannels,
            sampleRate: avframe.sampleRate,
            format: avframe.format
          },
          {
            channels: this.options.output.channels,
            sampleRate: this.options.output.sampleRate,
            format: this.options.output.format === NOPTS_VALUE ? avframe.format : this.options.output.format
          }
        )
        if (ret) {
          logger.error(`open resampler failed, error ${ret}`)
          outputs[0] = errorType.FORMAT_NOT_SUPPORT
          return
        }
      }

      this.resampler.resample(avframe.extendedData, this.pcm, avframe.nbSamples)

      out.format = this.options.output.format === NOPTS_VALUE ? avframe.format : this.options.output.format
      out.nbSamples = this.pcm.nbSamples
      out.sampleRate = this.pcm.sampleRate
      out.chLayout.nbChannels = this.pcm.channels
      out.linesize[0] = this.pcm.linesize

      out.pts = avframe.pts
      out.duration = avframe.duration
      out.pktDts = avframe.pktDts
      out.timeBase = avframe.timeBase

      const planar = sampleFormatIsPlanar(out.format)
      const planes = planar ? out.chLayout.nbChannels : 1

      if (planes > AV_NUM_DATA_POINTERS) {
        out.extendedData = reinterpret_cast<pointer<pointer<uint8>>>(avMalloc(planes * reinterpret_cast<int32>(sizeof(accessof(out.extendedData)))))
        if (!out.extendedData) {
          avFreep(reinterpret_cast<pointer<pointer<uint8>>>(addressof(out.extendedData)))
          outputs[0] = errorType.NO_MEMORY
          return
        }
      }
      else {
        out.extendedData = addressof(out.data)
      }

      for (let i = 0; i < Math.min(planes, AV_NUM_DATA_POINTERS); i++) {
        if (i === 0) {
          out.buf[i] = avbufferCreate(this.pcm.data[i], this.pcm.linesize * (planar ? this.pcm.channels : 1))
          if (!out.buf[i]) {
            unrefAVFrame(out)
            outputs[0] = errorType.NO_MEMORY
            return
          }
        }
        out.extendedData[i] = out.data[i] = this.pcm.data[i]
        this.pcm.data[i] = nullptr
      }

      for (let i = 0; i < planes - AV_NUM_DATA_POINTERS; i++) {
        out.extendedData[i + AV_NUM_DATA_POINTERS] = this.pcm.data[i]
        this.pcm.data[i] = nullptr
      }
      this.pcm.maxnbSamples = 0
      outputs[0] = out
    }
    else {
      refAVFrame(out, avframe)
      outputs[0] = out
    }
  }
}
