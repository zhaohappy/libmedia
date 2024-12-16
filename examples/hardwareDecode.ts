import IOReader from 'common/io/IOReader'
import { IOError } from 'common/io/error'
import * as demux from 'avformat/demux'
import IFlvFormat from 'avformat/formats/IFlvFormat'
import { createAVIFormatContext } from 'avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from 'avutil/util/avpacket'
import { AVMediaType } from 'avutil/codec'
import WebVideoDecoder from 'avcodec/webcodec/VideoDecoder'

export async function demuxFile(readFile: File) {

  const iformatContext = createAVIFormatContext()

  const ioReader = new IOReader()

  // use flv for example
  const iformat = new IFlvFormat()

  iformatContext.ioReader = ioReader
  iformatContext.iformat = iformat

  const avpacket = createAVPacket()

  let readPos = 0
  const readFileLength = readFile.size

  ioReader.onFlush = async (buffer) => {
    if (readPos >= readFileLength) {
      return IOError.END
    }
    const len = Math.min(buffer.length, readFileLength - readPos)

    buffer.set(new Uint8Array(await (readFile.slice(readPos, readPos + len).arrayBuffer())), 0)

    readPos += len

    return len
  }
  ioReader.onSeek = (pos) => {
    readPos = Number(pos)
    return 0
  }

  ioReader.onSize = () => {
    return BigInt(readFile.size)
  }

  await demux.open(iformatContext)
  await demux.analyzeStreams(iformatContext)

  const stream = iformatContext.getStreamByMediaType(AVMediaType.AVMEDIA_TYPE_VIDEO)

  const decoder = new WebVideoDecoder({
    onError: (error) => {
      
    },
    onReceiveVideoFrame(frame) {
      // 这里拿到解码出的帧
      console.log('receive frame', frame.timestamp)
      frame.close()
    },
    enableHardwareAcceleration: true
  })

  await decoder.open(addressof(stream.codecpar))

  while (1) {
    let ret = await demux.readAVPacket(iformatContext, avpacket)
    if (ret !== 0) {
      if (ret === IOError.END) {
        await decoder.flush()
        decoder.close()
        iformatContext.destroy()
        destroyAVPacket(avpacket)
        console.log('decode end')
      }
      else {
        console.log('demux error')
      }
      break
    }
    if (avpacket.streamIndex === stream.index) {
      ret = decoder.decode(avpacket)
      if (ret != 0) {
        console.log('decode error')
        break
      }
    }
  }
}