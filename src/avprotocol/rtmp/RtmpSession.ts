/*
 * libmedia rtmp session
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

import IOReader from 'common/io/IOReader'
import IOWriter from 'common/io/IOWriter'
import { RtmpPacket } from './RtmpPacket'
import * as crypto from 'avutil/util/crypto'
import getTimestamp from 'common/function/getTimestamp'
import BufferWriter from 'common/io/BufferWriter'
import { APP_MAX_LENGTH, RtmpChannel, RtmpPacketType } from './rtmp'
import * as amf from 'avutil/util/amf'
import { Data } from 'common/types/type'
import { readRtmpPacket, sendRtmpPacket } from './util'
import BufferReader from 'common/io/BufferReader'
import * as logger from 'common/util/logger'
import * as array from 'common/util/array'
import * as is from 'common/util/is'
import Sleep from 'common/timer/Sleep'
import { Sync, lock, unlock } from 'cheap/thread/sync'

const enum ClientState {
  /**
   * client has not done anything yet
   */
  START,
  /**
   * client has performed handshake
   */
  HANDSHAKED,
  /**
   * client FCPublishing stream (for output)
   */
  FCPUBLISH,
  /**
   * client has started receiving multimedia data from server
   */
  PLAYING,
  /**
   * client has started the seek operation. Back on STATE_PLAYING when the time comes
   */
  SEEKING,
  /**
   * client has started sending multimedia data to server (for output)
   */
  PUBLISHING,
  /**
   * received a publish command (for input)
   */
  RECEIVING,
  /**
   * received a play command (for output)
   */
  SENDING,
  /**
   * the broadcast has been stopped
   */
  STOPPED,
}

export interface RtmpSessionOptions {
  isPull: boolean
  isLive: boolean
  clientBufferTime?: int32
}

export default class RtmpSession {
  private ioReader: IOReader
  private ioWriter: IOWriter

  private prevReadPacket: Map<int32, RtmpPacket>
  private prevWritePacket: Map<int32, RtmpPacket>
  private inChunkSize: int32
  private outChunkSize: int32
  private seq: int32
  private bufferWriter: BufferWriter
  private bufferReader: BufferReader

  private requestMap: Map<int32, { resolve: (result: Data) => void, reject: (error: Data) => void }>

  private state: ClientState
  private maxSentUnacked: uint32
  private receiveReportSize: uint32
  private duration: double
  private options: RtmpSessionOptions
  private streamIdMap: Map<uint32, string>
  private sendAsync: Sync

  public onMediaPacket: (packet: RtmpPacket, streamName: string) => Promise<void> | void
  public onError: () => void

  constructor(ioReader: IOReader, ioWriter: IOWriter, options: RtmpSessionOptions) {
    this.ioReader = ioReader
    this.ioWriter = ioWriter
    this.options = options

    this.prevReadPacket = new Map()
    this.prevWritePacket = new Map()
    this.requestMap = new Map()
    this.streamIdMap = new Map()

    this.inChunkSize = 128
    this.outChunkSize = 128
    this.seq = 0
    this.maxSentUnacked = 2500000
    this.receiveReportSize = 1048576
    this.sendAsync = new Sync()

    this.bufferWriter = new BufferWriter(new Uint8Array(1))
    this.bufferReader = new BufferReader(new Uint8Array(1))

    this.state = ClientState.START
  }

  public async handshake() {

    const startTime = getTimestamp()

    // c0
    await this.ioWriter.writeUint8(0x03)
    // c1
    // time
    await this.ioWriter.writeUint32(0)
    // zero
    await this.ioWriter.writeUint32(0)
    // random
    const random = new Uint8Array(1528)
    crypto.random(random)
    await this.ioWriter.writeBuffer(random)
    await this.ioWriter.flush()

    // s0
    await this.ioReader.readUint8()
    // s1
    const s1Time = await this.ioReader.readUint32()
    await this.ioReader.skip(4)
    const s1Random = await this.ioReader.readBuffer(1528)

    // c2
    await this.ioWriter.writeUint32(s1Time)
    await this.ioWriter.writeUint32(getTimestamp() - startTime)
    await this.ioWriter.writeBuffer(s1Random)
    await this.ioWriter.flush()

    // s2
    await this.ioReader.skip(1536)

    this.readRtmpPacket()
  }

  private async sendPacket(packet: RtmpPacket) {
    await lock(this.sendAsync)
    await sendRtmpPacket(this.ioWriter, this.outChunkSize, packet, this.prevWritePacket.get(packet.channelId))
    this.prevWritePacket.set(packet.channelId, packet)
    unlock(this.sendAsync)
  }

  private async readPacket() {
    const packet = await readRtmpPacket(this.ioReader, this.inChunkSize, this.prevReadPacket)
    this.prevReadPacket.set(packet.channelId, packet)
    return packet
  }

  private handleChunkSize(packet: RtmpPacket) {
    if (packet.payload.length >= 4) {
      this.bufferReader.resetBuffer(packet.payload)
      this.inChunkSize = this.bufferReader.readUint32()
    }
  }
  private handleUserControl(packet: RtmpPacket) {
    if (packet.payload.length >= 2) {
      this.bufferReader.resetBuffer(packet.payload)
      const type = this.bufferReader.readUint16()
      // PingRequest
      if (type === 6) {
        this.sendPong(packet, this.bufferReader.readUint32())
      }
    }
  }
  private handleSetPeerBW(packet: RtmpPacket) {
    if (packet.payload.length >= 4) {
      this.bufferReader.resetBuffer(packet.payload)
      this.maxSentUnacked = this.bufferReader.readUint32()
      logger.debug(`Max sent, unacked = ${this.maxSentUnacked}`)
    }
  }
  private handleWindowSizeACK(packet: RtmpPacket) {
    if (packet.payload.length >= 4) {
      this.bufferReader.resetBuffer(packet.payload)
      this.receiveReportSize = this.bufferReader.readUint32()
      logger.debug(`Window acknowledgement size = ${this.receiveReportSize}`)
      // Send an Acknowledgement packet after receiving half the maximum
      // size, to make sure the peer can keep on sending without waiting
      // for acknowledgements.
      this.receiveReportSize >>= 1
    }
  }
  private async handleInvoke(packet: RtmpPacket) {
    this.bufferReader.resetBuffer(packet.payload)
    const endPos = BigInt(packet.payload.length)
    const key = await amf.parseValue(this.bufferReader, endPos)
    const seq: number = await amf.parseValue(this.bufferReader, endPos)

    if (key === '_result' || key === '_error') {
      if (this.requestMap.has(seq)) {
        const options = await amf.parseValue(this.bufferReader, endPos)
        const info = await amf.parseValue(this.bufferReader, endPos)
        if (key === '_result') {
          this.requestMap.get(seq).resolve({
            options,
            info
          })
        }
        else {
          this.requestMap.get(seq).reject({
            options,
            info
          })
        }
        this.requestMap.delete(seq)
      }
    }
    else if (key === 'onStatus') {
      const options = await amf.parseValue(this.bufferReader, endPos)
      let info: Data = await amf.parseValue(this.bufferReader, endPos)
      if (info.level === 'error') {
        logger.error(`Server error: ${info.description}, ${info.code}`)
        if (this.requestMap.has(seq)) {
          this.requestMap.get(seq).reject({
            options,
            info
          })
          this.requestMap.delete(seq)
        }
        else if (this.onError) {
          this.onError()
        }
      }
      else {
        switch (info.code) {
          case 'NetStream.Play.Start':
            this.state = ClientState.PLAYING
            break
          case 'NetStream.Play.Stop':
            this.state = ClientState.STOPPED
            break
          case 'NetStream.Play.UnpublishNotify':
            this.state = ClientState.STOPPED
            break
          case 'NetStream.Publish.Start':
            this.state = ClientState.PUBLISHING
            break
          case 'NetStream.Seek.Notify':
            this.state = ClientState.PLAYING
            break
        }
        if (this.requestMap.has(seq)) {
          this.requestMap.get(seq).resolve({
            options,
            info
          })
          this.requestMap.delete(seq)
        }
      }
    }
    else if (key === 'onBWDone') {
      await this.sendCheckBW()
    }
  }
  private async handleNotify(packet: RtmpPacket) {
    this.bufferReader.resetBuffer(packet.payload)
    const command = await amf.parseValue(this.bufferReader, BigInt(packet.payload.length))

    if (command === '@setDataFrame') {
      packet.payload = packet.payload.subarray(Number(this.bufferReader.getPos()))
    }

    if (packet.payload.length && this.onMediaPacket) {
      await this.onMediaPacket(packet, this.streamIdMap.get(packet.extra))
    }
  }

  private async readRtmpPacket() {
    while (true) {
      try {
        const packet = await this.readPacket()
        switch (packet.type) {
          case RtmpPacketType.PT_BYTES_READ:
            break
          case RtmpPacketType.PT_CHUNK_SIZE:
            this.handleChunkSize(packet)
            break
          case RtmpPacketType.PT_USER_CONTROL:
            this.handleUserControl(packet)
            break
          case RtmpPacketType.PT_SET_PEER_BW:
            this.handleSetPeerBW(packet)
            break
          case RtmpPacketType.PT_WINDOW_ACK_SIZE:
            this.handleWindowSizeACK(packet)
            break
          case RtmpPacketType.PT_INVOKE:
            await this.handleInvoke(packet)
            break
          case RtmpPacketType.PT_NOTIFY:
            await this.handleNotify(packet)
            break
          case RtmpPacketType.PT_METADATA:
          case RtmpPacketType.PT_AUDIO:
          case RtmpPacketType.PT_VIDEO:
            if (this.onMediaPacket) {
              await this.onMediaPacket(packet, this.streamIdMap.get(packet.extra))
            }
            break
          default:
            break
        }
      }
      catch (error) {
        break
      }
    }
  }

  private async sendPong(packet: RtmpPacket, value: uint32) {
    if (packet.payload.length < 6) {
      logger.warn(`Too short ping packet (${packet.payload.length})`)
      return
    }
    const p = new RtmpPacket(RtmpChannel.NETWORK_CHANNEL, RtmpPacketType.PT_USER_CONTROL, packet.timestamp + 1, 6)
    this.bufferWriter.resetBuffer(p.payload)
    this.bufferWriter.writeUint16(7)
    this.bufferWriter.writeUint32(value)
    this.sendPacket(p)
  }

  private async sendWindowAckSize() {
    const p = new RtmpPacket(RtmpChannel.NETWORK_CHANNEL, RtmpPacketType.PT_WINDOW_ACK_SIZE, 0, 4)
    this.bufferWriter.resetBuffer(p.payload)
    this.bufferWriter.writeUint32(this.maxSentUnacked)
    await this.sendPacket(p)
  }

  private async sendBufferTime(streamId: uint32) {
    const p = new RtmpPacket(RtmpChannel.NETWORK_CHANNEL, RtmpPacketType.PT_USER_CONTROL, 1, 10)
    this.bufferWriter.resetBuffer(p.payload)
    // SetBuffer Length
    this.bufferWriter.writeUint16(3)
    this.bufferWriter.writeUint32(streamId)
    this.bufferWriter.writeUint32(this.options.clientBufferTime || 3000)
    await this.sendPacket(p)
  }

  private async sendFCSubscribe(subscribe: string) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 27 + subscribe.length)
    this.bufferWriter.resetBuffer(packet.payload)

    amf.writeValue(this.bufferWriter, 'FCSubscribe')
    amf.writeValue(this.bufferWriter, ++this.seq)
    amf.writeValue(this.bufferWriter, null)
    amf.writeValue(this.bufferWriter, subscribe)
    await this.sendPacket(packet)
  }

  private async sendFCPublish(publish: string) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 25 + publish.length)
    this.bufferWriter.resetBuffer(packet.payload)

    amf.writeValue(this.bufferWriter, 'FCPublish')
    amf.writeValue(this.bufferWriter, ++this.seq)
    amf.writeValue(this.bufferWriter, null)
    amf.writeValue(this.bufferWriter, publish)
    await this.sendPacket(packet)
  }

  private async sendReleaseStream(streamName: string) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 29 + streamName.length)
    this.bufferWriter.resetBuffer(packet.payload)

    amf.writeValue(this.bufferWriter, 'releaseStream')
    amf.writeValue(this.bufferWriter, ++this.seq)
    amf.writeValue(this.bufferWriter, null)
    amf.writeValue(this.bufferWriter, streamName)
    await this.sendPacket(packet)
  }

  private async sendCheckBW() {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 21)
    this.bufferWriter.resetBuffer(packet.payload)

    amf.writeValue(this.bufferWriter, '_checkbw')
    amf.writeValue(this.bufferWriter, ++this.seq)
    amf.writeValue(this.bufferWriter, null)
    await this.sendPacket(packet)
  }

  private async request(method: string, data: any[]) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 4096 + APP_MAX_LENGTH)
    this.bufferWriter.resetBuffer(packet.payload)

    amf.writeValue(this.bufferWriter, method)
    amf.writeValue(this.bufferWriter, ++this.seq)

    array.each(data, (value) => {
      amf.writeValue(this.bufferWriter, value)
    })
    packet.payload = packet.payload.subarray(0, this.bufferWriter.getPos())

    return new Promise<Data>((resolve, reject) => {
      this.requestMap.set(this.seq, {
        resolve,
        reject
      })
      this.sendPacket(packet)
    })
  }

  public async connect(appName: string, url: string) {
    await this.request('connect', [{
      app: appName,
      fourCcList: ['hvc1', 'av01', 'vp09'],
      flashVer: 'LNX 9,0,124,2',
      tcUrl: url,
      fpad: 0,
      capabilities: 15.0,
      /* Tell the server we support all the audio codecs except
       * SUPPORT_SND_INTEL (0x0008) and SUPPORT_SND_UNUSED (0x0010)
       * which are unused in the RTMP protocol implementation.
       */
      audioCodecs: 4071.0,
      videoCodecs: 252.0,
      videoFunction: 1.0
    }])
    if (this.options.isPull) {
      await this.sendWindowAckSize()
    }
  }

  private async createStream() {
    const result = await this.request('createStream', [null])
    return result.info as uint32
  }

  public async play(streamName: string) {

    const streamId = await this.createStream()

    this.streamIdMap.set(streamId, streamName)

    if (!this.options.isLive) {
      const result = await Promise.race([
        this.request('getStreamLength', [null, streamName]),
        new Sleep(1)
      ])
      if (!is.number(result)) {
        this.duration = result.info as double
      }
    }
    await this.sendFCSubscribe(streamName)

    this.request('play', [null, streamName, -1, -1, true])
    await this.sendBufferTime(streamId)
  }

  public async publish(streamName: string) {
    await this.sendReleaseStream(streamName)
    await this.sendFCPublish(streamName)
    const streamId = await this.createStream()
    this.streamIdMap.set(streamId, streamName)
    await this.request('publish', [null, streamName, 'live'])
  }

  public async sendStreamPacket(packet: RtmpPacket, streamName: string) {
    let streamId = 0
    this.streamIdMap.forEach((v, k) => {
      if (v === streamName) {
        streamId = k
      }
    })
    packet.extra = streamId
    await this.sendPacket(packet)
  }

  public async seek(timestamp: number) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 26)
    this.bufferWriter.resetBuffer(packet.payload)
    amf.writeValue(this.bufferWriter, 'seek')
    amf.writeValue(this.bufferWriter, 0)
    amf.writeValue(this.bufferWriter, null)
    amf.writeValue(this.bufferWriter, timestamp)
    await this.sendPacket(packet)
  }

  public async pause(paused: boolean, timestamp: number) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 29)
    this.bufferWriter.resetBuffer(packet.payload)
    amf.writeValue(this.bufferWriter, 'pause')
    amf.writeValue(this.bufferWriter, 0)
    amf.writeValue(this.bufferWriter, null)
    amf.writeValue(this.bufferWriter, paused)
    amf.writeValue(this.bufferWriter, timestamp)
    await this.sendPacket(packet)
  }

  public getDuration() {
    return this.duration
  }
}
