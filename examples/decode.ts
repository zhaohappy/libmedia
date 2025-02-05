import WasmVideoDecoder from 'avcodec/wasmcodec/VideoDecoder'
import AVStream from 'avutil/AVStream'
import AVPacket from 'avutil/struct/avpacket'
import compile from 'cheap/webassembly/compiler'

export async function decodeVideo(stream: AVStream) {
  // 根据 codecId 拿到解码器 wasm 路径
  const wasmUrl = ''

  const resource = await compile({
    source: wasmUrl
  })

  const decoder = new WasmVideoDecoder({
    resource,
    onReceiveAVFrame(frame) {
      // 这里拿到解码出的帧
    }
  })

  await decoder.open(addressof(stream.codecpar))

  while (true) {
    // 不停的拿到 avpacket 送入解码器解码
    let avpacket: pointer<AVPacket>
    // 注意送入的第一帧必须为 IDR 帧
    let ret = decoder.decode(avpacket)
    if (ret < 0) {
      break
    }
  }

  // 刷出缓存的帧，结束解码
  await decoder.flush()
}