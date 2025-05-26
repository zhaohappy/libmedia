/*
 * libmedia rtmp loader
 *
 * 版权所有 (C) 2024 赵高兴
 * Copyright (C) 2024 Gaoxing Zhao
 *
 * 此文件是 libmedia 的一部分
 * This file is part of libmedia.
 * 
 * libmedia 是自由软件；您可以根据 GNU Lesser General Public License（GNU LGPL）3.1
 * 或任何其更新的版本条款重新分发或修改它
 * libmedia is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.1 of the License, or (at your option) any later version.
 * 
 * libmedia 希望能够为您提供帮助，但不提供任何明示或暗示的担保，包括但不限于适销性或特定用途的保证
 * 您应自行承担使用 libmedia 的风险，并且需要遵守 GNU Lesser General Public License 中的条款和条件。
 * libmedia is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 */

import { Uint8ArrayInterface } from 'common/io/interface'
import { IOLoaderStatus } from './IOLoader'
import { IOError } from 'common/io/error'
import SocketIOLoader from './SocketIOLoader'
import WebSocketIOLoader from './WebSocketIOLoader'
import WebTransportIOLoader from './WebTransportIOLoader'
import RtmpSession from 'avprotocol/rtmp/RtmpSession'
import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriter'
import * as url from 'common/util/url'
import { RtmpPacket } from 'avprotocol/rtmp/RtmpPacket'
import IOWriterSync from 'common/io/IOWriterSync'
import FlvHeader from 'avformat/formats/flv/FlvHeader'
import { RtmpPacketType } from 'avprotocol/rtmp/rtmp'
import FlvScriptTag from 'avformat/formats/flv/FlvScriptTag'
import BufferReader from 'common/io/BufferReader'
import * as amf from 'avutil/util/amf'
import isDef from 'common/function/isDef'
import { IOType } from 'avutil/avformat'

export interface RtmpIOInfo {
  url: string
  uri: string
  subProtocol: IOType
  webtransportOptions?: WebTransportOptions
}

export default class RtmpIOLoader extends SocketIOLoader {

  private info: RtmpIOInfo

  private socket: WebSocketIOLoader | WebTransportIOLoader

  private session: RtmpSession
  private ioReader: IOReader
  private ioWriter: IOWriter
  private flvWriter: IOWriterSync

  private flvHeader: FlvHeader
  private packetQueue: RtmpPacket[]
  private flvHeaderWrote: boolean
  private hasMetadata: boolean
  private bufferReader: BufferReader

  private writeFlvData(packet: RtmpPacket) {
    this.flvWriter.writeUint8(packet.type)
    this.flvWriter.writeUint24(packet.payload.length)
    this.flvWriter.writeUint24(packet.timestamp)
    this.flvWriter.writeUint8(packet.timestamp >> 24)
    this.flvWriter.writeUint24(0)
    this.flvWriter.writeBuffer(packet.payload)
    this.flvWriter.writeUint32(packet.payload.length + 11)
    this.flvWriter.flush()
  }

  private async handleRtmpPacket(packet: RtmpPacket) {
    if (this.flvHeaderWrote) {
      this.writeFlvData(packet)
    }
    else {
      this.packetQueue.push(packet)
      if (packet.type === RtmpPacketType.PT_AUDIO) {
        this.flvHeader.hasAudio = true
      }
      else if (packet.type === RtmpPacketType.PT_VIDEO) {
        this.flvHeader.hasVideo = true
      }
      else if (packet.type === RtmpPacketType.PT_NOTIFY) {
        if (!this.bufferReader) {
          this.bufferReader = new BufferReader(packet.payload)
        }
        else {
          this.bufferReader.resetBuffer(packet.payload)
        }
        const command = await amf.parseValue(this.bufferReader, BigInt(packet.payload.length)) as string
        if (command === 'onMetaData') {
          this.hasMetadata = true
          const metadata = await amf.parseValue(this.bufferReader, BigInt(packet.payload.length))
          this.flvHeader.hasAudio = isDef(metadata.audiocodecid)
          this.flvHeader.hasVideo = isDef(metadata.videocodecid)
        }
      }
      if (this.packetQueue.length > 10 || this.hasMetadata) {
        this.flvHeader.write(this.flvWriter)
        this.flvWriter.writeUint32(0)

        if (!this.hasMetadata && this.session.getDuration()) {
          const script = new FlvScriptTag()
          script.onMetaData = {
            duration: this.session.getDuration()
          }
          script.write(this.flvWriter)
        }

        this.packetQueue.forEach((p) => {
          this.writeFlvData(p)
        })
        this.packetQueue.length = 0
        this.flvHeaderWrote = true
      }
    }
  }

  public async send(buffer: Uint8ArrayInterface): Promise<int32> {
    if (this.socket) {
      await this.socket.send(buffer)
      return 0
    }
    return IOError.INVALID_OPERATION
  }

  public async open(info: RtmpIOInfo): Promise<int32> {
    this.info = info
    this.status = IOLoaderStatus.CONNECTING
    if (info.subProtocol === IOType.WEBTRANSPORT) {
      this.socket = new WebTransportIOLoader(this.options)
      await this.socket.open({
        url: info.url,
        webtransportOptions: info.webtransportOptions
      })
    }
    else {
      this.socket = new WebSocketIOLoader(this.options)
      await this.socket.open({
        url: info.url
      })
    }

    this.ioReader = new IOReader()
    this.ioReader.onFlush = async (buffer) => {
      return this.socket.read(buffer)
    }
    this.ioReader.onSeek = async (pos) => {
      return this.socket.seek(pos)
    }
    this.ioReader.onSize = async () => {
      return this.socket.size()
    }

    this.ioWriter = new IOWriter()
    this.ioWriter.onFlush = async (buffer) => {
      return this.socket.write(buffer)
    }
    this.ioWriter.onSeek = async (pos) => {
      return this.socket.seek(pos)
    }

    this.flvWriter = new IOWriterSync()
    this.flvWriter.onFlush = (buffer) => {
      this.readQueue.push(buffer.slice())
      if (this.consume) {
        this.consume()
      }
      return 0
    }
    this.flvHeader = new FlvHeader()
    this.packetQueue = []
    this.flvHeaderWrote = false
    this.hasMetadata = false

    this.session = new RtmpSession(this.ioReader, this.ioWriter, {
      isLive: this.options.isLive,
      isPull: true
    })
    this.session.onMediaPacket = async (packet, streamName) => {
      return this.handleRtmpPacket(packet)
    }
    this.session.onError = () => {
      this.status = IOLoaderStatus.ERROR
      if (this.consume) {
        this.consume()
      }
    }

    await this.session.handshake()

    const result = url.parse(this.info.uri)
    const paths = result.pathname.split('/')
    await this.session.connect(paths[1], `rtmp://${result.host}${result.port ? (':' + result.port) : ''}/${paths[1]}`)
    const streamName = paths.slice(2)
    this.session.play((streamName.length > 1 ? streamName.join('/') : streamName[0]) || '')
    return 0
  }
  public async seek(pos: int64): Promise<int32> {
    await this.session.seek(Number(pos))
    return 0
  }
  public async size(): Promise<int64> {
    return 0n
  }
  public async stop() {
    if (this.socket) {
      await this.socket.stop()
      this.socket = null
    }
    this.status = IOLoaderStatus.COMPLETE
  }
}
