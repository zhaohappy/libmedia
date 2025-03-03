import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVCodecID, AVMediaType } from '@libmedia/avutil/codec'
import compileResource from '@libmedia/avutil/function/compileResource'
import WasmAudioDecoder from '@libmedia/avcodec/wasmcodec/AudioDecoder'
import { destroyAVFrame } from '@libmedia/avutil/util/avframe'
import AVCodecParameters from '@libmedia/avutil/struct/avcodecparameters'
import { copyCodecParameters, resetCodecParameters } from '@libmedia/avutil/util/codecparameters'
import { AVSampleFormat } from '@libmedia/avutil/audiosamplefmt'
import Resampler from '@libmedia/audioresample/Resampler'
import AVPCMBuffer from '@libmedia/avutil/struct/avpcmbuffer'
import { avFreep } from '@libmedia/avutil/util/mem'
import { avPCMBuffer2AVFrame } from '@libmedia/avutil/function/avPCMBuffer2AVFrame'
import Sleep from '@libmedia/common/timer/Sleep'
import WebAudioEncoder from '@libmedia/avcodec/webcodec/AudioEncoder'

import { formatUrl, getIOReader, getAVFormat, getAccept, getWasm } from './utils'
import { useEffect, useRef, useState } from 'react'

let file: File
let stop = true

async function encode(log: (v: string) => void) {

  if (!stop) {
    return
  }

  const iformatContext = createAVIFormatContext()

  const ioReader = await getIOReader(file || formatUrl('video/test.mp4'))

  const iformat = await getAVFormat(ioReader, file || formatUrl('video/test.mp4'))

  iformatContext.ioReader = ioReader
  iformatContext.iformat = iformat
  iformatContext.getDecoderResource = async (mediaType: AVMediaType, codecId: AVCodecID) => {
    return compileResource(getWasm('decoder', codecId), mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO)
  }

  const avpacket = createAVPacket()

  await demux.open(iformatContext)
  await demux.analyzeStreams(iformatContext)

  const stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)

  const codecpar = make<AVCodecParameters>()
  copyCodecParameters(addressof(codecpar), addressof(stream.codecpar))
  codecpar.codecId = AVCodecID.AV_CODEC_ID_AAC
  codecpar.format = AVSampleFormat.AV_SAMPLE_FMT_FLTP
  codecpar.sampleRate = 48000
  codecpar.bitrate = 128000n

  const pcmBuffer = make<AVPCMBuffer>()

  let resampler: Resampler
  if (codecpar.sampleRate !== stream.codecpar.sampleRate) {
    resampler = new Resampler({
      resource: await compileResource(getWasm('resampler'))
    })
    await resampler.open(
      {
        sampleRate: stream.codecpar.sampleRate,
        channels: stream.codecpar.chLayout.nbChannels,
        format: stream.codecpar.format as AVSampleFormat
      },
      {
        sampleRate: codecpar.sampleRate,
        channels: codecpar.chLayout.nbChannels,
        format: codecpar.format as AVSampleFormat
      }
    )
  }

  const encoder = new WebAudioEncoder({
    onError: (error) => {
      log(`encode error: ${error}\n`)
    },
    onReceiveAVPacket(avpacket) {
      log(`got audio packet, pts: ${avpacket.pts}\n`)
      destroyAVPacket(avpacket)
    }
  })

  const decoder = new WasmAudioDecoder({
    resource: await compileResource(getWasm('decoder', stream.codecpar.codecId)),
    onReceiveAVFrame: (frame) => {
      let newFrame = frame
      if (resampler) {
        resampler.resample(frame.extendedData, addressof(pcmBuffer), frame.nbSamples)
        newFrame = avPCMBuffer2AVFrame(addressof(pcmBuffer), false, frame)
      }
      let ret = encoder.encode(newFrame)
      if (ret < 0) {
        log(`encode error: ${ret}\n`)
      }
      destroyAVFrame(frame)
    },
  })

  let ret = await decoder.open(addressof(stream.codecpar))
  if (ret) {
    log(`open decode error: ${ret}\n`)
    return
  }
  ret = await encoder.open(addressof(codecpar), { num: 1, den: 1000 })
  if (ret) {
    log(`open encode error: ${ret}\n`)
    return
  }

  stop = false

  while (1) {

    let ret = await demux.readAVPacket(iformatContext, avpacket)
    if (ret !== 0) {
      break
    }
    if (avpacket.streamIndex === stream.index) {
      ret = decoder.decode(avpacket)
      if (ret != 0) {
        break
      }
    }

    if (stop) {
      break
    }

    // 这里是为了防止卡死主线程加的 sleep
    // 你可以将逻辑放入 worker 或定时任务中去掉此处
    await new Sleep(0)
  }

  await decoder.flush()
  decoder.close()
  await encoder.flush()
  encoder.close()

  iformatContext.destroy()
  destroyAVPacket(avpacket)
  resetCodecParameters(addressof(codecpar))
  unmake(codecpar)

  if (pcmBuffer.data) {
    avFreep(addressof(pcmBuffer.data[0]))
  }
  unmake(pcmBuffer)

  stop = true
  log('encode end\n')
}

export default function () {

  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const scrollToBottom = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [value])

  useEffect(() => {
    stop = true
  }, [])

  function onChange(event: any) {
    file = event.target.files[0]
  }

  return (
    <div>
      <button
        onClick={() => {
          setValue('Loading...')
          encode((val) => {
            setValue((prev) => {
              return prev + val
            })
          })
        }}
      >
        开始
      </button>
      &nbsp;
      <button
        onClick={() => {
          stop = true
        }}
      >
        停止
      </button>
      &nbsp;
      <input accept={getAccept()} type="file" onChange={onChange}></input>
      <hr />
      <textarea readOnly ref={textareaRef} value={value} style={{width: '600px', height: '400px'}}></textarea>
    </div>
  )
}