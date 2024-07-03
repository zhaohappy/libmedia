import Resampler, { PCMParameters } from 'audioresample/Resampler'
import AVFilterNode, { AVFilterNodeOptions } from 'avfilter/AVFilterNode'
import { AVBufferRef } from 'avutil/struct/avbuffer'
import AVFrame, { AV_NUM_DATA_POINTERS } from 'avutil/struct/avframe'
import AVPCMBuffer from 'avutil/struct/avpcmbuffer'
import { createAVFrame, unrefAVFrame } from 'avutil/util/avframe'
import { avFree, avFreep, avMalloc, avMallocz } from 'avutil/util/mem'
import { sampleFormatIsPlanar } from 'avutil/util/sample'
import { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as errorType from 'avutil/error'
import { avbufferCreate } from 'avutil/util/avbuffer'

export interface ResampleNodeOptions extends AVFilterNodeOptions {
  resource: WebAssemblyResource
  input: PCMParameters
  output: PCMParameters
}

export default class ResampleNode extends AVFilterNode {
  declare options: ResampleNodeOptions

  private resampler: Resampler

  private pcm: pointer<AVPCMBuffer>

  constructor(options: ResampleNodeOptions) {
    super(options, 1, 1)
  }

  public async ready() {
    this.resampler = new Resampler({
      resource: this.options.resource
    })
    await this.resampler.open(
      this.options.input,
      this.options.output
    )
    this.pcm = avMallocz(sizeof(AVPCMBuffer))
  }

  public async destroy() {
    if (this.pcm) {
      avFree(this.pcm)
    }
    if (this.resampler) {
      this.resampler.close()
      this.resampler = null
    }
  }

  public async process(inputs: (pointer<AVFrame> | VideoFrame)[], outputs: (pointer<AVFrame> | VideoFrame)[]) {
    const avframe = inputs[0] as pointer<AVFrame>

    const out = this.options.avframePool ? this.options.avframePool.alloc() : createAVFrame()

    this.resampler.resample(avframe.extendedData, this.pcm, avframe.nbSamples)

    out.format = this.options.output.format
    out.nbSamples = this.pcm.nbSamples
    out.sampleRate = this.pcm.sampleRate
    out.chLayout.nbChannels = this.pcm.channels

    out.pts = avframe.pts
    out.duration = avframe.duration
    out.pktDts = avframe.pktDts
    out.timeBase = avframe.timeBase

    const planar = sampleFormatIsPlanar(out.format)
    const planes = planar ? out.chLayout.nbChannels : 1

    if (planes > AV_NUM_DATA_POINTERS) {
      out.extendedData = reinterpret_cast<pointer<pointer<uint8>>>(avMalloc(planes * sizeof(accessof(out.extendedData))))
      out.extendedBuf = reinterpret_cast<pointer<pointer<AVBufferRef>>>(avMalloc(planes * sizeof(accessof(out.extendedBuf))))
  
      if (!out.extendedBuf || !out.extendedData) {
        avFreep(reinterpret_cast<pointer<pointer<uint8>>>(addressof(out.extendedData)))
        avFreep(reinterpret_cast<pointer<pointer<uint8>>>(addressof(out.extendedBuf)))
        outputs[0] = reinterpret_cast<pointer<AVFrame>>(errorType.NO_MEMORY)
        return
      }
      out.nbExtendedBuf = planes - AV_NUM_DATA_POINTERS
    }
    else {
      out.extendedData = addressof(out.data)
    }
  
    for (let i = 0; i < Math.min(planes, AV_NUM_DATA_POINTERS); i++) {
      if (i === 0) {
        out.buf[i] = avbufferCreate(this.pcm.data[i], this.pcm.linesize * this.pcm.channels)
        if (!out.buf[i]) {
          unrefAVFrame(out)
          outputs[0] = reinterpret_cast<pointer<AVFrame>>(errorType.NO_MEMORY)
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
    outputs[0] = out
  }
}