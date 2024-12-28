import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVCodecID, AVMediaType } from '@libmedia/avutil/codec'
import compileResource from '@libmedia/avutil/function/compileResource'
import WasmAudioDecoder from '@libmedia/avcodec/wasmcodec/AudioDecoder'
import Sleep from '@libmedia/common/timer/Sleep'
import Resampler from '@libmedia/audioresample/Resampler'
import { AVSampleFormat } from '@libmedia/avutil/audiosamplefmt'
import AVPCMBuffer from '@libmedia/avutil/struct/avpcmbuffer'
import { avFreep } from '@libmedia/avutil/util/mem'
import { mapFloat32Array } from '@libmedia/cheap/std/memory'
import { destroyAVFrame } from '@libmedia/avutil/util/avframe'
import * as cheapConfig from '@libmedia/cheap/config'

import { formatUrl, getIOReader, getAVFormat, getAccept, getWasm } from './utils'
import { useEffect } from 'react'
import React from 'react'

let file: File
let stop = true
let stopAudio = () => {}

async function render() {

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
  const channels = stream.codecpar.chLayout.nbChannels

  const audioContext = new AudioContext()
  stopAudio = () => audioContext.close()
  
  const resampler = new Resampler({
    resource: await compileResource(getWasm('resampler'))
  })

  await resampler.open(
    {
      sampleRate: stream.codecpar.sampleRate,
      channels: channels,
      format: stream.codecpar.format as AVSampleFormat
    },
    {
      sampleRate: audioContext.sampleRate,
      channels: channels,
      format: AVSampleFormat.AV_SAMPLE_FMT_FLTP
    }
  )

  const queue: AudioBufferSourceNode[] = []
  let decodePause: () => void

  let startTime = 0
  function play(data: pointer<pointer<float>>, nbSamples: int32, sampleRate: int32) {
    const audioBuffer = audioContext.createBuffer(channels, nbSamples, sampleRate)
    for (let i = 0; i < channels; i++) {
      if (audioBuffer.copyToChannel && !cheapConfig.USE_THREADS) {
        audioBuffer.copyToChannel(
          mapFloat32Array(data[i], nbSamples),
          i,
          0
        )
      }
      else {
        const audioData = audioBuffer.getChannelData(i)
        audioData.set(mapFloat32Array(data[i], nbSamples), 0)
      }
    }
    const bufferSource = audioContext.createBufferSource()
    bufferSource.buffer = audioBuffer
    bufferSource.connect(audioContext.destination)
    bufferSource.onended = () => {
      queue.shift()
      if (queue.length < 5 && decodePause) {
        decodePause()
        decodePause = null
      }
    }
    queue.push(bufferSource)

    if (startTime === 0) {
      startTime = audioContext.currentTime
    }
    bufferSource.start(startTime)
    startTime += bufferSource.buffer.duration
  }

  const pcmBuffer = make<AVPCMBuffer>()

  const decoder = new WasmAudioDecoder({
    resource: await compileResource(getWasm('decoder', stream.codecpar.codecId)),
    onError: (error) => {
      console.error(`decode error: ${error}`)
    },
    onReceiveAVFrame: (frame) => {
      if (frame.format !== AVSampleFormat.AV_SAMPLE_FMT_FLTP) {
        resampler.resample(frame.extendedData, addressof(pcmBuffer), frame.nbSamples)
        play(reinterpret_cast<pointer<pointer<float>>>(pcmBuffer.data), pcmBuffer.nbSamples, pcmBuffer.sampleRate)
      }
      else {
        play(reinterpret_cast<pointer<pointer<float>>>(frame.extendedData), frame.nbSamples, frame.sampleRate)
      }
      destroyAVFrame(frame)
    },
  })

  try {
    await decoder.open(addressof(stream.codecpar))
  }
  catch (error) {
    console.error(`open decode error: ${error}`)
    return
  }

  stop = false

  while (1) {

    if (queue.length > 5) {
      await new Promise<void>((resolve) => {
        decodePause = resolve
      })
    }

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

    await new Sleep(0)
  }
  await decoder.flush()
  decoder.close()
  iformatContext.destroy()
  destroyAVPacket(avpacket)
  resampler.close()
  if (pcmBuffer.data) {
    avFreep(addressof(pcmBuffer.data[0]))
  }
  unmake(pcmBuffer)
  stop = true

  console.log('render end')
}

export default function () {
  useEffect(() => {
    return () => stopAudio()
  }, [stopAudio])

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
          render()
        }}
      >
        开始
      </button>
      &nbsp;
      <button
        onClick={() => {
          stop = true
          stopAudio()
        }}
      >
        停止
      </button>
      &nbsp;
      <input accept={getAccept()} type="file" onChange={onChange}></input>
      <hr />
    </div>
  )
}