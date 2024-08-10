import AVPacket from 'avutil/struct/avpacket'
import { AVSubtitle } from 'avutil/struct/avsubtitle'

export default abstract class Decoder {
  public abstract sendAVPacket(avpacket: pointer<AVPacket>): int32
  public abstract receiveAVFrame(avframe: AVSubtitle): int32
  public abstract flush(): int32
}
