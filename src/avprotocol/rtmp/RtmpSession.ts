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
import * as iamf from 'avformat/formats/flv/iamf'
import * as oamf from 'avformat/formats/flv/oamf'
import { Data } from 'common/types/type'
import { readRtmpPacket, sendRtmpPacket } from './util'
import BufferReader from 'common/io/BufferReader'
import * as logger from 'common/util/logger'
import * as array from 'common/util/array'

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

  public onMediaPacket: (packet: RtmpPacket) => void
  public onError: () => void

  constructor(ioReader: IOReader, ioWriter: IOWriter) {
    this.ioReader = ioReader
    this.ioWriter = ioWriter

    this.prevReadPacket = new Map()
    this.prevWritePacket = new Map()
    this.requestMap = new Map()

    this.inChunkSize = 128
    this.outChunkSize = 128
    this.seq = 0

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
    await sendRtmpPacket(this.ioWriter, this.outChunkSize, packet, this.prevWritePacket.get(packet.channelId))
    this.prevWritePacket.set(packet.channelId, packet)
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

  }
  private handleWindowSizeACK(packet: RtmpPacket) {

  }
  private async handleInvoke(packet: RtmpPacket) {
    this.bufferReader.resetBuffer(packet.payload)
    const endPos = BigInt(packet.payload.length)
    const key = await iamf.parseValue(this.bufferReader, endPos)
    const seq: number = await iamf.parseValue(this.bufferReader, endPos)

    if (key === '_result' || key === '_error') {
      if (this.requestMap.has(seq)) {
        const options = await iamf.parseValue(this.bufferReader, endPos)
        const info = await iamf.parseValue(this.bufferReader, endPos)
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
      const options = await iamf.parseValue(this.bufferReader, endPos)
      let info: Data = await iamf.parseValue(this.bufferReader, endPos)
      if (info.level === 'error') {
        logger.error(`Server error: ${info.description}`)
        if (this.onError) {
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
      }
    }
    else if (key === 'onBWDone') {

    }
  }
  private handleNotify(packet: RtmpPacket) {

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
            this.handleNotify(packet)
            break
          case RtmpPacketType.PT_METADATA:
          case RtmpPacketType.PT_AUDIO:
          case RtmpPacketType.PT_VIDEO:
            this.onMediaPacket(packet)
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

  private request(method: string, data: any[]) {
    const packet = new RtmpPacket(RtmpChannel.SYSTEM_CHANNEL, RtmpPacketType.PT_INVOKE, 0, 4096 + APP_MAX_LENGTH)
    this.bufferWriter.resetBuffer(packet.payload)

    oamf.writeValue(this.bufferWriter, method)
    oamf.writeValue(this.bufferWriter, ++this.seq)

    array.each(data, (value) => {
      oamf.writeValue(this.bufferWriter, value)
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
      tcUrl: 'rtmp://pulltc3-live.baijiayun.com/zgx/test001',
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
  }

  public async createStream() {
    const result = await this.request('createStream', [null])
    return result.info as uint32
  }

  public async play(streamName: string) {
    await this.request('play', [null, streamName, -1, -1, true])
  }

  public async publish(streamName: string) {
    await this.request('publish', [null, 'streamName', 'live'])
  }
}
