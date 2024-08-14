import { PixelFormatDescriptorsMap, PixelFormatFlags } from '../pixelFormatDescriptor'
import { AVMediaType } from '../codec'
import AVCodecParameters from '../struct/avcodecparameters'

export default function hasAlphaChannel(parameters: pointer<AVCodecParameters>) {
  if (parameters.codecType !== AVMediaType.AVMEDIA_TYPE_VIDEO) {
    return false
  }
  const descriptor = PixelFormatDescriptorsMap[parameters.format]
  return descriptor.flags & PixelFormatFlags.ALPHA
}