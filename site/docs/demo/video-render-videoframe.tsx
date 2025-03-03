import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVMediaType } from '@libmedia/avutil/codec'
import CanvasImageRender from '@libmedia/avrender/image/Canvas2dRender'
import { RenderMode } from '@libmedia/avrender/image/ImageRender'
import WebVideoDecoder from '@libmedia/avcodec/webcodec/VideoDecoder'
import Timer from '@libmedia/common/timer/Timer'
import Sleep from '@libmedia/common/timer/Sleep'

import { formatUrl, getIOReader, getAVFormat, getAccept } from './utils'
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

  const render = new CanvasImageRender(canvas, {
    renderMode: RenderMode.FIT,
    devicePixelRatio: window.devicePixelRatio
  })
  await render.init()
  render.viewport(canvas.offsetWidth, canvas.offsetHeight)

  const queue: VideoFrame[] = []
  let decodePause: () => void
  let decodeEnd = false

  const decoder = new WebVideoDecoder({
    onError: (error) => {
      console.error('decode error', error)
    },
    onReceiveVideoFrame(frame) {
      queue.push(frame)
    },
    enableHardwareAcceleration: true
  })

  const timer = new Timer(() => {
    if (queue.length) {
      const frame = queue.shift()
      render.render(frame)
      frame.close()
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

  const ret = await decoder.open(addressof(stream.codecpar))
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
      while (true) {
        if (decoder.getQueueLength() > 20) {
          await new Sleep(0)
        }
        else {
          break
        }
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