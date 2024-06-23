import AVCodecParameters from 'avutil/struct/avcodecparameters'
import { Rational } from 'avutil/struct/rational'
import { Data } from 'common/types/type'

export interface AVStreamInterface {
  index: number
  id: number,
  codecpar: pointer<AVCodecParameters>
  nbFrames: int64
  metadata: Data
  duration: int64
  startTime: int64
  disposition: int32
  timeBase: pointer<Rational>
}