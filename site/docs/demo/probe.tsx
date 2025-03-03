import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import dump from '@libmedia/avformat/dump'
import { AVCodecID, AVMediaType } from '@libmedia/avutil/codec'
import compileResource from '@libmedia/avutil/function/compileResource'

import { formatUrl, getIOReader, getAVFormat, getAccept, getWasm } from './utils'
import { useEffect, useRef, useState } from 'react'

let file: File

async function probe(log: (v: string) => void) {

  const iformatContext = createAVIFormatContext()

  const ioReader = await getIOReader(file || formatUrl('video/test.mp4'))

  const iformat = await getAVFormat(ioReader, file || formatUrl('video/test.mp4'))

  iformatContext.getDecoderResource = async (mediaType: AVMediaType, codecId: AVCodecID) => {
    return compileResource(getWasm('decoder', codecId), mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO)
  }

  iformatContext.ioReader = ioReader
  iformatContext.iformat = iformat

  await demux.open(iformatContext, {
    maxAnalyzeDuration: 15000
  })
  await demux.analyzeStreams(iformatContext)

  log(dump([iformatContext], [{
    from: file ? file.name : formatUrl('video/test.mp4'),
    tag: 'Input'
  }]))
  
  iformatContext.destroy()
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

  function onChange(event: any) {
    file = event.target.files[0]
  }

  return (
    <div>
      <button
        onClick={async () => {
          setValue('Loading...')
          probe(setValue)
        }}
      >
        开始
      </button>
      &nbsp;
      <input accept={getAccept()} type="file" onChange={onChange}></input>
      <hr />
      <textarea readOnly ref={textareaRef} value={value} style={{width: '800px', height: '400px'}}></textarea>
    </div>
  )
}