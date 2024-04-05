
import IOggsFormat from './formats/IOggsFormat'
import IIvfFormat from './formats/IIvfFormat'
import IFlvFormat from './formats/IFlvFormat'
import IMovFormat from './formats/IMovFormat'
import IMpegtsFormat from './formats/IMpegtsFormat'
import IMp3Format from './formats/IMp3Format'

import OOggsFormat from './formats/OOggsFormat'
import OIvfFormat from './formats/OIvfFormat'
import OFlvFormat from './formats/OFlvFormat'
import OMovFormat from './formats/OMovFormat'
import OMpegtsFormat from './formats/OMpegtsFormat'
import OMp3Format from './formats/OMp3Format'

import * as mux_ from './mux'
import * as demux_ from './demux'
import Packet_ from 'avutil/struct/avpacket'
import { createAVIFormatContext as createAVIFormatContext_, createAVOFormatContext as createAVOFormatContext_ } from './AVformatContext'
import { OpusOggsIdPage, OpusOggsCommentPage } from './formats/oggs/opus'
import IOWriter_ from 'common/io/IOWriterSync'
import IOReader_ from 'common/io/IOReader'
import SafeFileIO_ from 'common/io/SafeFileIO'
import Stream_ from './AVStream'
import { createAVPacket, destroyAVPacket, getAVPacketData } from 'avutil/util/avpacket'
import { copyCodecParameters } from 'avutil/util/codecparameters'

import * as Error_ from 'avutil/error'

import { symbolStructAddress } from 'cheap/symbol'

export const Format = {
  IOggsFormat,
  IIvfFormat,
  IFlvFormat,
  IMovFormat,
  IMpegtsFormat,
  IMp3Format,

  OOggsFormat,
  OIvfFormat,
  OFlvFormat,
  OMovFormat,
  OMpegtsFormat,
  OMp3Format,

  OpusOggsIdPage,
  OpusOggsCommentPage
}

export const mux = mux_

export const demux = demux_

export const Packet = Packet_

export const createAVIFormatContext = createAVIFormatContext_

export const createAVOFormatContext = createAVOFormatContext_

export const IOWriter = IOWriter_

export const IOReader = IOReader_

export const SafeFileIO = SafeFileIO_

export const Stream = Stream_

export const Error = Error_

export function probeAVPacket(avpacket: pointer<Packet_>) {
  console.log(`demux packet, pos: ${avpacket.pos}, index: ${avpacket.streamIndex}, dts: ${avpacket.dts}, pts: ${avpacket.pts}, duration: ${avpacket.duration}, size: ${avpacket.size}, keyframe: ${avpacket.flags & 0x01}`)
}

export const util = {
  getAVPacketData,
  createAVPacket,
  copyCodecParameters,
  destroyAVPacket,
  symbolStructAddress
}

export const IOError = {
  END: -(1 << 20),
  INVALID_OPERATION: -1048575
}
