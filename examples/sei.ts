
import AVStream from 'avutil/AVStream'
import { AVCodecID } from 'avutil/codec'
import BufferReader from 'common/io/BufferReader'
import AVPacket, { AVPacketFlags } from 'avutil/struct/avpacket'

import { avMalloc } from 'avutil/util/mem'
import { mapUint8Array } from 'cheap/std/memory'
import { addAVPacketData, getAVPacketData } from 'avutil/util/avpacket'

import * as hevc from 'avutil/codecs/hevc'
import * as h264 from 'avutil/codecs/h264'
import * as naluUtil from 'avutil/util/nalu'

export function readSEI(avpacket: pointer<AVPacket>, stream: AVStream) {

  function readSEINumber(bufferReader: BufferReader) {
    let value = 0
    let now = bufferReader.readUint8()
    while (now === 0xff) {
      value += 0xff
      now = bufferReader.readUint8()
    }
    value += now

    return value
  }

  if ((avpacket.flags & AVPacketFlags.AV_PKT_FLAG_KEY)
    && (
      stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264
        || stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC
    )
  ) {
    const nalus = avpacket.bitFormat === h264.BitFormat.ANNEXB
      ? naluUtil.splitNaluByStartCode(getAVPacketData(avpacket))
      : naluUtil.splitNaluByLength(getAVPacketData(avpacket), stream.metadata.naluLengthSizeMinusOne || 3)

    if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_H264) {
      nalus.forEach((nalu) => {
        const type = nalu[0] & 0x1f
        if (type === h264.H264NaluType.kSliceSEI) {
          const bufferReader = new BufferReader(nalu.subarray(1))
          const payloadType = readSEINumber(bufferReader)
          const payloadSize = readSEINumber(bufferReader)
          const payload = bufferReader.readBuffer(payloadSize)
          console.log(`receive sei, payloadType: ${payloadType}, payloadSize: ${payloadSize}`)
        }
      })
    }
    else if (stream.codecpar.codecId === AVCodecID.AV_CODEC_ID_HEVC) {
      nalus.forEach((nalu) => {
        const type = (nalu[0] >>> 1) & 0x3f
        if (type === hevc.HEVCNaluType.kSliceSEI_PREFIX || hevc.HEVCNaluType.kSliceSEI_SUFFIX) {
          const bufferReader = new BufferReader(nalu.subarray(2))
          const payloadType = readSEINumber(bufferReader)
          const payloadSize = readSEINumber(bufferReader)
          const payload = bufferReader.readBuffer(payloadSize)
          console.log(`receive sei, payloadType: ${payloadType}, payloadSize: ${payloadSize}`)
        }
      })
    }
  }
}

// h264 for example
export function writeSEI(avpacket: pointer<AVPacket>, stream: AVStream, payloadType: number, payload: Uint8Array) {
  const nalus = avpacket.bitFormat === h264.BitFormat.ANNEXB
    ? naluUtil.splitNaluByStartCode(getAVPacketData(avpacket))
    : naluUtil.splitNaluByLength(getAVPacketData(avpacket), stream.metadata.naluLengthSizeMinusOne || 3)

  function pushSEINumber(header: number[], value: number) {
    const count = (value / 255) | 0
    const end = value % 255
    for (let i = 0; i < count; i++) {
      header.push(255)
    }
    header.push(end)
  }

  const header: number[] = [h264.H264NaluType.kSliceSEI]
  pushSEINumber(header, payloadType)
  pushSEINumber(header, payload.length)
  const sei = new Uint8Array(header.length + payload.byteLength)
  sei.set(header, 0)
  sei.set(payload, header.length)

  const type = nalus[0][0] & 0x1f

  if (type === h264.H264NaluType.kSliceAUD) {
    nalus.splice(1, 0, sei)
  }
  else {
    nalus.unshift(sei)
  }

  let length = avpacket.bitFormat === h264.BitFormat.ANNEXB
    ? nalus.reduce((prev, nalu, index) => {
      return prev + (index ? 3 : 4) + nalu.length
    }, 0)
    : nalus.reduce((prev, nalu) => {
      return prev + (stream.metadata.naluLengthSizeMinusOne || 3) + 1 + nalu.length
    }, 0)
  
  const data: pointer<uint8> = avMalloc(length)

  avpacket.bitFormat === h264.BitFormat.ANNEXB
    ? naluUtil.joinNaluByStartCode(nalus, 2, mapUint8Array(data, length))
    : naluUtil.joinNaluByLength(nalus, stream.metadata.naluLengthSizeMinusOne || 3, mapUint8Array(data, length))

  addAVPacketData(avpacket, data, length)
}
