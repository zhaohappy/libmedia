/*
 * libmedia rtsp session
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
import { TextMessageRequest, TextMessageSession } from 'common/network/textMessage/message'
import { RtspMethod, RtspStreamingMode } from './rtsp'
import { Range } from 'common/types/type'

export interface RtspTransport {
  trackId: number
  streamMode: RtspStreamingMode
  clientPort?: number
  serverPort?: number
  destination?: string
  interleaved?: number
  multcast?: boolean
}

export default class RtspSession extends TextMessageSession {

  private seq: number

  version: string = 'RTSP/1.0'
  uri: string
  authorization: string

  constructor(uri: string, ioReader: IOReader, ioWriter: IOWriter) {
    super(ioReader, ioWriter)
    this.seq = 1
    this.uri = uri
  }

  public async options() {
    const req = new TextMessageRequest(RtspMethod.OPTIONS, this.uri, this.version, {
      CSeq: '' + this.seq++
    })
    return super.request(req)
  }

  public async describe() {
    const req = new TextMessageRequest(RtspMethod.DESCRIBE, this.uri, this.version, {
      CSeq: '' + this.seq++,
      Accept: 'application/sdp',
      Authorization: this.authorization
    })
    return super.request(req)
  }

  public async setup(transport: RtspTransport, sessionId: string = '') {

    let type = ''
    if (transport.streamMode === RtspStreamingMode.TRANSPORT_TCP) {
      type = '/TCP'
    }
    let interleaved = ''
    let clientPort = ''
    if (transport.streamMode === RtspStreamingMode.TRANSPORT_UDP) {
      clientPort = `;${transport.clientPort}-${transport.clientPort + 1}`
    }
    else if (transport.streamMode === RtspStreamingMode.TRANSPORT_TCP) {
      interleaved = `;${transport.interleaved}-${transport.interleaved + 1}`
    }

    const req = new TextMessageRequest(RtspMethod.SETUP, this.uri + `/trackID=${transport.trackId}`, this.version, {
      CSeq: '' + this.seq++,
      Session: sessionId,
      Authorization: this.authorization,
      Transport: `RTP/AVP${type};${transport.multcast ? 'multcast' : 'unicast'}${interleaved}${clientPort}`
    })
    return super.request(req)
  }

  public async play(sessionId: string, range: Range = { from: 0, to: -1 }) {
    const req = new TextMessageRequest(RtspMethod.PLAY, this.uri, this.version, {
      CSeq: '' + this.seq++,
      Session: sessionId,
      Authorization: this.authorization,
      Range: `npt=${range.from >= 0 ? range.from : 0}-${range.to > 0 ? range.to : ''}`
    })
    return super.request(req)
  }

  public async pause(sessionId: string) {
    const req = new TextMessageRequest(RtspMethod.PAUSE, this.uri, this.version, {
      CSeq: '' + this.seq++,
      Session: sessionId,
      Authorization: this.authorization
    })
    return super.request(req)
  }

  public async teardown(sessionId: string) {
    const req = new TextMessageRequest(RtspMethod.TEARDOWN, this.uri, this.version, {
      CSeq: '' + this.seq++,
      Session: sessionId,
      Authorization: this.authorization
    })
    await super.notify(req)
  }

  public async readPacket() {
    while (true) {
      // $
      if (await (this.ioReader.peekUint8()) !== 0x24) {
        await this.readResponse()
      }
      await this.ioReader.skip(1)
      const interleaved = await this.ioReader.readUint8()
      const len = await this.ioReader.readUint16()
      const data = await this.ioReader.readBuffer(len)
      return {
        interleaved,
        data
      }
    }
  }
}
