import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVMediaType } from '@libmedia/avutil/codec'
import compileResource from '@libmedia/avutil/function/compileResource'
import WasmVideoDecoder from '@libmedia/avcodec/wasmcodec/VideoDecoder'
import Sleep from '@libmedia/common/timer/Sleep'
import { destroyAVFrame } from '@libmedia/avutil/util/avframe'

import { formatUrl, getIOReader, getAVFormat, getAccept, getWasm } from './utils'
import { useEffect, useRef, useState } from 'react'
import React from 'react'

let file: File
let stop = true

async function decode(set: (v: string) => void) {

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

  const decoder = new WasmVideoDecoder({
    resource: await compileResource(getWasm('decoder', stream.codecpar.codecId)),
    onError: (error) => {
      set(`decode error: ${error}\n`)
    },
    onReceiveAVFrame: (frame) => {
      set(`got video frame, pts: ${frame.pts}, duration: ${frame.duration}\n`)
      destroyAVFrame(frame)
    },
  })

  try {
    await decoder.open(addressof(stream.codecpar))
  }
  catch (error) {
    set(`open decode error: ${error}\n`)
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

    await new Sleep(0)
  }
  await decoder.flush()
  decoder.close()
  iformatContext.destroy()
  destroyAVPacket(avpacket)
  stop = true
  set('decode end\n')
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
          setValue('加载中...')
          decode((val) => {
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