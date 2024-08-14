import { PixelFormatDescriptorsMap } from '../pixelFormatDescriptor'
import { AVMediaType } from '../codec'
import AVCodecParameters from '../struct/avcodecparameters'
import { AVColorTransferCharacteristic } from '../pixfmt'

export default function isHdr(parameters: pointer<AVCodecParameters>) {
  if (parameters.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
    return false
  }

  const descriptor = PixelFormatDescriptorsMap[parameters.format]
  if (!descriptor || descriptor.comp[0].depth <= 8) {
    return false
  }

  return parameters.colorTrc === AVColorTransferCharacteristic.AVCOL_TRC_ARIB_STD_B67
    || parameters.colorTrc === AVColorTransferCharacteristic.AVCOL_TRC_SMPTE2084
}