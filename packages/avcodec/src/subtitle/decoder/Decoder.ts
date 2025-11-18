import {
  type AVPacket,
  type AVSubtitle
} from '@libmedia/avutil'

export default abstract class Decoder {
  public abstract sendAVPacket(avpacket: pointer<AVPacket>): int32
  public abstract receiveAVFrame(avframe: AVSubtitle): int32
  public abstract flush(): int32
}
