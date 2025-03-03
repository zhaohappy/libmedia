import * as demux from '@libmedia/avformat/demux'
import * as mux from '@libmedia/avformat/mux'
import { createAVIFormatContext, createAVOFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import IOWriterSync from '@libmedia/common/io/IOWriterSync'
import OMovFormat from '@libmedia/avformat/formats/OMovFormat'
import { copyCodecParameters } from '@libmedia/avutil/util/codecparameters'

import { formatUrl, getIOReader, getAVFormat, getAccept } from './utils'
import { useEffect, useRef, useState } from 'react'

let file: File
let stop = true

async function muxFile(log: (v: string) => void) {

  if (!stop) {
    return
  }

  const iformatContext = createAVIFormatContext()
  const ioReader = await getIOReader(file || formatUrl('video/test.mp4'))
  const iformat = await getAVFormat(ioReader, file || formatUrl('video/test.mp4'))
  iformatContext.ioReader = ioReader
  iformatContext.iformat = iformat

  const oformatContext = createAVOFormatContext()
  const ioWriter = new IOWriterSync()
  oformatContext.ioWriter = ioWriter
  oformatContext.oformat = new OMovFormat()

  ioWriter.onFlush = (buffer, pos) => {
    log(`got output data size: ${buffer.length}\n`)
    return 0
  }
  ioWriter.onSeek = (pos) => {
    return 0
  }

  await demux.open(iformatContext)
  await demux.analyzeStreams(iformatContext)

  iformatContext.streams.forEach((stream) => {
    const newStream = oformatContext.createStream()
    copyCodecParameters(addressof(newStream.codecpar), addressof(stream.codecpar))
    newStream.timeBase.den = stream.timeBase.den
    newStream.timeBase.num = stream.timeBase.num
  })

  mux.open(oformatContext)
  mux.writeHeader(oformatContext)

  const avpacket = createAVPacket()

  stop = false
  while (1) {
    let ret = await demux.readAVPacket(iformatContext, avpacket)
    if (ret !== 0) {
      break
    }

    mux.writeAVPacket(oformatContext, avpacket)

    if (stop) {
      break
    }
  }

  mux.writeTrailer(oformatContext)

  iformatContext.destroy()
  oformatContext.destroy()
  destroyAVPacket(avpacket)

  log('mux end\n')
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
          setValue('Loading...')
          muxFile((val) => {
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