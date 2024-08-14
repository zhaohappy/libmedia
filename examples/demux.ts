import IOReader from 'common/io/IOReader'
import { IOError } from 'common/io/error'
import * as demux from 'avformat/demux'
import { AVPacketFlags } from 'avutil/struct/avpacket'
import IFlvFormat from 'avformat/formats/IFlvFormat'
import { createAVIFormatContext } from 'avformat/AVFormatContext'
import { createAVPacket, destroyAVPacket } from 'avutil/util/avpacket'

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

  // got stream info from iformatContext.streams 

  while (1) {
    let ret = await demux.readAVPacket(iformatContext, avpacket)
    if (ret !== 0) {
      if (ret === IOError.END) {
        iformatContext.destroy()
        destroyAVPacket(avpacket)
      }
      break
    }
    console.log(`demux packet, pos: ${avpacket.pos}, index: ${avpacket.streamIndex}, dts: ${avpacket.dts}, pts: ${avpacket.pts}, duration: ${avpacket.duration}, size: ${avpacket.size}, keyframe: ${avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY}`)
  }
}