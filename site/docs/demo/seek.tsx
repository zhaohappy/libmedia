import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVMediaType } from '@libmedia/avutil/codec'
import { RenderMode } from '@libmedia/avrender/image/ImageRender'
import Timer from '@libmedia/common/timer/Timer'
import WebGLDefault8Render from '@libmedia/avrender/image/WebGLDefault8Render'
import AVFrame from '@libmedia/avutil/struct/avframe'
import WasmVideoDecoder from '@libmedia/avcodec/wasmcodec/VideoDecoder'
import compileResource from '@libmedia/avutil/function/compileResource'
import { destroyAVFrame } from '@libmedia/avutil/util/avframe'
import { AV_MILLI_TIME_BASE_Q, NOPTS_VALUE_BIGINT } from '@libmedia/avutil/constant'
import { avRescaleQ } from '@libmedia/avutil/util/rational'
import { AVSeekFlags } from '@libmedia/avutil/avformat'

import { formatUrl, getIOReader, getAVFormat, getAccept, getWasm } from './utils'
import { useEffect, useRef } from 'react'


let file: File
let stop = true
let stopRender = () => {}

async function render(canvas: HTMLCanvasElement) {

  if (!stop) {
    return
  }

  const iformatContext = createAVIFormatContext()

  const ioReader = await getIOReader(file || formatUrl('video/test.mp4'))

  const iformat = await getAVFormat(ioReader, file || formatUrl('video/test.mp4'))

  iformatContext.ioReader = ioReader
  iformatContext.iformat = iformat

  const avpacket = createAVPacket()

  await demux.open(iformatContext)
  await demux.analyzeStreams(iformatContext)

  const stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

  let seekTime = stream.duration === NOPTS_VALUE_BIGINT
    ? 10000n
    : (avRescaleQ(stream.duration, stream.timeBase, AV_MILLI_TIME_BASE_Q) >> 1n)

  {
    // seek 到指定时间前最近的关键帧处
    const ret = await demux.seek(iformatContext, stream.index, seekTime, AVSeekFlags.TIMESTAMP)
    if (ret < 0) {
      seekTime = 0n
    }
  }

  const render = new WebGLDefault8Render(canvas, {
    renderMode: RenderMode.FIT,
    devicePixelRatio: window.devicePixelRatio
  })
  await render.init()
  render.viewport(canvas.offsetWidth, canvas.offsetHeight)

  const queue: pointer<AVFrame>[] = []
  let decodePause: () => void
  let decodeEnd = false

  const decoder = new WasmVideoDecoder({
    resource: await compileResource(getWasm('decoder', stream.codecpar.codecId), true),
    onReceiveAVFrame(frame) {
      if (seekTime > 0) {
        // 忽略 seek 时间点之前从关键帧到 seek 时间点之间的视频帧
        if (avRescaleQ(frame.pts, frame.timeBase, AV_MILLI_TIME_BASE_Q) < seekTime) {
          destroyAVFrame(frame)
          return
        }
        seekTime = 0n
      }
      queue.push(frame)
    },
  })

  const timer = new Timer(() => {
    if (queue.length) {
      const frame = queue.shift()
      render.render(frame)
      destroyAVFrame(frame)
    }
    else if (decodeEnd) {
      timer.stop()
      render.clear()
    }
    if (queue.length < 5 && decodePause) {
      decodePause()
      decodePause = null
    }
  }, 0, 1000 * stream.codecpar.framerate.den / stream.codecpar.framerate.num)

  timer.start()

  stopRender = () => {
    timer.stop()
    render.clear()
    stop = true
    if (decodePause) {
      decodePause()
      decodePause = null
    }
  }

  let ret = await decoder.open(addressof(stream.codecpar))
  if (ret) {
    console.error('open decoder error')
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
        console.error('decode error')
        break
      }
    }

    if (stop) {
      break
    }
  }

  await decoder.flush()
  decoder.close()
  iformatContext.destroy()
  destroyAVPacket(avpacket)

  decodeEnd = true
  
  stop = true

  console.log('render end')
}

export default function () {

  const canvasRef = useRef(null)

  useEffect(() => {
    return () => stopRender()
  }, [stopRender])

  useEffect(() => {
    stopRender()
  }, [])

  function onChange(event: any) {
    file = event.target.files[0]
  }

  return (
    <div>
      <button
        onClick={() => {
          render(canvasRef.current)
        }}
      >
        开始
      </button>
      &nbsp;
      <button
        onClick={() => {
          stop = true
          stopRender()
        }}
      >
        停止
      </button>
      &nbsp;
      <input accept={getAccept()} type="file" onChange={onChange}></input>
      <hr />
      <canvas ref={canvasRef} style={{width: '640px', height: '480px', background: '#000'}}></canvas>
    </div>
  )
}