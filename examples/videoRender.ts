import { WebVideoDecoder } from '@libmedia/avcodec'
import { IOReader, IOError } from '@libmedia/common/io'
import { AVMediaType, destroyAVPacket, createAVPacket } from '@libmedia/avutil'
import { createAVIFormatContext, demux } from '@libmedia/avformat'
import { Sleep, Timer } from '@libmedia/common/timer'
import { RenderMode, CanvasImageRender } from '@libmedia/avrender'
import IFlvFormat from '@libmedia/avformat/IFlvFormat'

export async function run(readFile: File, canvas: HTMLCanvasElement) {

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

  await demux.open(iformatContext, {
    maxAnalyzeDuration: 3000
  })
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
  }, 0, 1000 / stream.codecpar.framerate.num)

  timer.start()

  await decoder.open(addressof(stream.codecpar))

  while (1) {

    if (queue.length > 5) {
      await new Promise<void>((resolve) => {
        decodePause = resolve
      })
    }

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
      while (true) {
        if (decoder.getQueueLength() > 20) {
          await new Sleep(0)
        }
        else {
          break
        }
      }
    }
  }

  decodeEnd = true
}
