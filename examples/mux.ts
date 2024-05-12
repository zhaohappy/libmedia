import IOWriterSync from 'common/io/IOWriterSync'
import * as mux from 'avformat/mux'
import AVPacket from 'avutil/struct/avpacket'
import { createAVOFormatContext } from 'avformat/AVFormatContext'
import OMovFormat from 'avformat/formats/OMovFormat'
import { AVCodecID, AVMediaType } from 'avutil/codec'

/**
 * 将 avpacket 封装进文件，avpacket 可以来自于解封装模块，可以来自于编码模块
 * 
 * @param avpacket 
 */
export async function muxFile() {

  const ioWriter = new IOWriterSync()
  // 封装为 mp4 为例
  const oformat = new OMovFormat()

  const oformatContext = createAVOFormatContext()

  oformatContext.ioWriter = ioWriter
  oformatContext.oformat = oformat

  ioWriter.onFlush = (buffer, pos) => {
    if (pos != null) {
      // 在写文件 pos 处追加 buffer，不要覆盖后面的内容
    }
    else {
      // 在写文件当前位置写入 buffer，会覆盖后面的内容
    }
    return 0
  }
  ioWriter.onSeek = (pos) => {
    // seek 到写文件 pos 处
    return 0
  }

  // 添加 stream
  const stream = oformatContext.createStream()
  // 配置 stream 参数，具体查看 codecpar 需要添加哪些参数
  stream.codecpar.codecId = AVCodecID.AV_CODEC_ID_H264
  stream.codecpar.codecType = AVMediaType.AVMEDIA_TYPE_VIDEO

  mux.open(oformatContext)
  mux.writeHeader(oformatContext)

  // 不停的调用 writeAVPacket 写入 avpacket
  // 这里只是一个例子讲解怎么使用 api，需要根据自己的业务场景编写
  while (true) {
    // avpacket 从其他模块来，或者自己组装
    let avpacket: pointer<AVPacket>
    mux.writeAVPacket(oformatContext, avpacket)
    break
  }

  // 写完所有 avpacket 之后结束封装
  mux.writeTrailer(oformatContext)
}