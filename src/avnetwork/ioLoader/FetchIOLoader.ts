/*
 * libmedia fetch loader
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

import Sleep from 'common/timer/Sleep'
import IOLoader, { IOLoaderOptions, IOLoaderStatus, Range } from './IOLoader'
import * as object from 'common/util/object'
import { IOError } from 'common/io/error'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as logger from 'common/util/logger'
import { Data } from 'common/types/type'

export interface FetchInfo {
  url: string
  headers?: Object
  withCredentials?: boolean
  referrerPolicy?: string
}

export interface FetchIOLoaderOptions extends IOLoaderOptions {
  disableSegment?: boolean
}

export default class FetchIOLoader extends IOLoader {

  declare public options: FetchIOLoaderOptions

  private contentLength: number

  private receivedLength: number

  private info: FetchInfo

  private range: Range

  private startBytes: number

  private endBytes: number

  private eofIndex: number

  private abortController: AbortController

  private reader: ReadableStreamDefaultReader<Uint8Array>

  private buffers: Uint8Array[]

  constructor(options: FetchIOLoaderOptions = {}) {
    super(options)
  }

  public async open(info: FetchInfo, range: Range) {

    this.info = info
    this.range = range

    if (!this.range.to) {
      this.range.to = -1
    }

    this.range.from = Math.max(this.range.from, 0)

    if (this.eofIndex < 0) {
      this.eofIndex = range.to
    }

    this.startBytes = 0
    this.endBytes = -1
    this.receivedLength = 0
    this.buffers = []

    if (this.range && !this.options.isLive) {
      this.startBytes = this.range.from ?? 0
    }

    this.status = IOLoaderStatus.CONNECTING

    if (!this.options.isLive && !this.options.disableSegment) {
      const params: Data = {
        method: 'HEAD',
        headers: {},
        mode: 'cors',
        cache: 'default',
        referrerPolicy: 'no-referrer-when-downgrade'
      }
      if (this.info.headers) {
        object.each(this.info.headers, (value, key) => {
          params.headers[key] = value
        })
      }

      if (this.info.withCredentials) {
        params.credentials = 'include'
      }

      if (this.info.referrerPolicy) {
        params.referrerPolicy = this.info.referrerPolicy
      }
      if (AbortController) {
        this.abortController = new AbortController()
        params.signal = this.abortController.signal
      }

      try {
        const res = await fetch(this.info.url, params)
        if (res.ok && (res.status >= 200 && res.status <= 299)) {
          const lengthHeader = res.headers.get('X-Content-Length') || res.headers.get('Content-Length')
          if (lengthHeader != null) {
            this.contentLength = parseInt(lengthHeader)
            if (this.range.to < 0) {
              this.eofIndex = this.contentLength + this.range.to
            }
          }
          this.endBytes = Math.min(this.startBytes + this.options.preload - 1, this.eofIndex)
          this.status = IOLoaderStatus.BUFFERING
        }
        else {
          this.endBytes = -1
        }
      }
      catch (error) {
        this.endBytes = -1
      }
    }
  }

  private async openReader() {
    const params: Data = {
      method: 'GET',
      headers: {},
      mode: 'cors',
      cache: 'default',
      referrerPolicy: 'no-referrer-when-downgrade'
    }
    if (this.info.headers) {
      object.each(this.info.headers, (value, key) => {
        params.headers[key] = value
      })
    }
    if (!this.options.isLive) {
      params.headers['range'] = `bytes=${this.startBytes}-${this.endBytes > 0 ? this.endBytes : ''}`
    }

    if (this.info.withCredentials) {
      params.credentials = 'include'
    }

    if (this.info.referrerPolicy) {
      params.referrerPolicy = this.info.referrerPolicy
    }

    if (this.abortController) {
      this.abortController.abort()
    }

    if (typeof AbortController === 'function') {
      this.abortController = new AbortController()
      params.signal = this.abortController.signal
    }

    try {
      const res = await fetch(this.info.url, params)
      if (res.ok && (res.status >= 200 && res.status <= 299)) {
        this.reader = res.body.getReader()
      }
      else {
        this.status = IOLoaderStatus.ERROR
        logger.fatal(`FetchStreamLoader: Http code invalid, ${res.status} ${res.statusText}`)
      }
    }
    catch (error) {
      if (this.retryCount < this.options.retryCount && (!this.options.isLive || !this.receivedLength)) {
        this.retryCount++
        this.status = IOLoaderStatus.CONNECTING

        await new Sleep(this.options.retryInterval)

        return this.openReader()
      }
      else {
        logger.fatal(`FetchStreamLoader: exception ${error.message}`)
      }
    }
  }

  private async readInterval(buffer: Uint8ArrayInterface, preLen: int32 = 0): Promise<number> {

    let pos = 0

    while (this.buffers.length && pos < buffer.length) {
      const cache = this.buffers.shift()
      if (cache.length > buffer.length - pos) {
        buffer.set(cache.subarray(0, buffer.length - pos), pos)
        this.buffers.unshift(cache.subarray(buffer.length - pos))
        pos = buffer.length
      }
      else {
        buffer.set(cache, pos)
        pos += cache.length
      }
    }

    if (pos >= buffer.length) {
      return buffer.length + preLen
    }

    if (this.status === IOLoaderStatus.COMPLETE) {
      return pos > 0 ? (pos + preLen) : (preLen > 0 ? preLen : IOError.END)
    }

    if (!this.reader) {
      await this.openReader()
    }

    const { value, done } = await this.reader.read()

    if (done) {
      if (this.contentLength !== null && (this.receivedLength + this.range.from) < this.endBytes + 1) {
        this.status = IOLoaderStatus.ERROR
        logger.fatal('Fetch stream meet Early-EOF')
      }
      else if (this.options.isLive || this.options.disableSegment || (this.receivedLength + this.range.from) >= this.eofIndex) {
        this.status = IOLoaderStatus.COMPLETE
        this.startBytes = 0
        return pos > 0 ? (pos + preLen) : (preLen > 0 ? preLen : IOError.END)
      }
      else {

        await this.reader.cancel()

        if (this.abortController) {
          this.abortController.abort()
        }

        this.reader = null

        this.startBytes = this.endBytes + 1
        this.endBytes = Math.min(this.startBytes + this.options.preload - 1, this.eofIndex)

        return this.readInterval(buffer.subarray(pos), pos)
      }
    }
    else {

      this.receivedLength += value.length

      if (value.length > buffer.length - pos) {
        buffer.set(value.subarray(0, buffer.length - pos), pos)
        this.buffers.push(value.subarray(buffer.length - pos))
        return buffer.length + preLen
      }
      else {
        buffer.set(value, pos)
        pos += value.length
        return pos + preLen
      }
    }
  }

  public async read(buffer: Uint8ArrayInterface): Promise<int32> {
    return this.readInterval(buffer)
  }

  public async seek(pos: int64) {
    await this.abort()
    this.receivedLength = Number(pos) - this.range.from
    this.startBytes = Number(pos)
    if (!this.options.disableSegment) {
      this.endBytes = Math.min(this.startBytes + this.options.preload, this.eofIndex)
    }
    this.buffers.length = 0
    if (this.status === IOLoaderStatus.COMPLETE) {
      this.status = IOLoaderStatus.BUFFERING
    }0
  }

  public async size() {
    if (this.options.isLive) {
      return 0n
    }
    return static_cast<int64>(this.contentLength)
  }

  public async abort() {
    if (!this.reader) {
      return
    }
    await this.reader.cancel()
    if (this.abortController) {
      this.abortController.abort()
    }
    this.reader = null
  }

  public async stop() {
    await this.abort()
    this.status = IOLoaderStatus.IDLE
  }
}
