import * as demux from '@libmedia/avformat/demux'
import { createAVIFormatContext } from '@libmedia/avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from '@libmedia/avutil/util/avpacket'
import { AVMediaType } from '@libmedia/avutil/codec'
import support from '@libmedia/common/util/support'
import WebAudioDecoder from '@libmedia/avcodec/webcodec/AudioDecoder'
import Sleep from '@libmedia/common/timer/Sleep'

import { formatUrl, getIOReader, getAVFormat, getAccept } from './utils'
import { useEffect, useRef, useState } from 'react'

let file: File
let stop = true

async function decode(log: (v: string) => void) {

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

  const stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_AUDIO)

  const decoder = new WebAudioDecoder({
    onError: (error) => {
      log(`decode error: ${error}\n`)
    },
    onReceiveAudioData: (audioData) => {
      log(`got audio audioData, pts: ${audioData.timestamp}, duration: ${audioData.duration}\n`)
    },
  })

  const ret = await decoder.open(addressof(stream.codecpar))
  if (ret) {
    log(`open decode error: ${ret}\n`)
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

    while (true) {
      if (decoder.getQueueLength() > 20) {
        await new Sleep(0)
      }
      else {
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
  stop = true
  log('decode end\n')
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

  if (!support.audioDecoder) {
    return (
      <strong>当前浏览器不支持 WebCodecs，请使用 Chrome、Edge（并升级到新版本）体验</strong>
    )
  }

  return (
    <div>
      <button
        onClick={() => {
          setValue('Loading...')
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