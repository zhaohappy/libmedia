import { createAVFrame } from '../util/avframe'
import AVFrame from '../struct/avframe'


export function videoFrame2AVFrame(videoFrame: VideoFrame, avframe: pointer<AVFrame> = nullptr) {
  if (avframe === nullptr) {
    avframe = createAVFrame()
  }

  return avframe
}