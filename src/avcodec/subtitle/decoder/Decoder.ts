import AVFrame from 'avutil/struct/avframe'
import AVPacket from 'avutil/struct/avpacket'

export default abstract class Decoder {
  public abstract sendAVPacket(avpacket: pointer<AVPacket>): int32
  public abstract receiveAVFrame(avframe: pointer<AVFrame>): int32
  public abstract flush(): int32
}
