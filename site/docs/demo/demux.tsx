import * as demux from '@libmedia/avformat/demux'
import { AVPacketFlags } from '@libmedia/avutil/struct/avpacket'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import Sleep from '@libmedia/common/timer/Sleep'

import { formatUrl, getIOReader, getAVFormat, getAccept } from './utils'
import { useEffect, useRef, useState } from 'react'
import React from 'react'

let file: File
let stop = true

async function demuxFile(set: (v: string) => void) {

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

  stop = false

  while (1) {
    let ret = await demux.readAVPacket(iformatContext, avpacket)
    if (ret !== 0) {
      break
    }
    set(`packet pos: ${avpacket.pos}, index: ${avpacket.streamIndex}, dts: ${avpacket.dts}, pts: ${avpacket.pts}, duration: ${avpacket.duration}, size: ${avpacket.size}, keyframe: ${avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY}\n`)

    if (stop) {
      break
    }

    await new Sleep(0)
  }
  iformatContext.destroy()
  destroyAVPacket(avpacket)
  set('demux end\n')
  stop = true
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
          demuxFile((val) => {
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