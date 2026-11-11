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

import { Sleep } from '@libmedia/common/timer'
import { errorType } from '@libmedia/avutil'
import { object, logger, getTimestamp } from '@libmedia/common'
import { IOError, type Uint8ArrayInterface } from '@libmedia/common/io'

import type { IOLoaderOptions } from './IOLoader'
import IOLoader, { IOLoaderStatus } from './IOLoader'
import HttpRangeReader from './HttpRangeReader'
import type { Data, HttpOptions, Range } from '@libmedia/common'

const READ_AT_TIMEOUT_MS = 10_000

export interface FetchInfo {
  url: string
  httpOptions?: HttpOptions
}

export interface FetchIOLoaderOptions extends IOLoaderOptions {
  disableSegment?: boolean
  enableBandwidthReader?: boolean
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

  private rangeController: AbortController
  private rangeReader: HttpRangeReader | undefined

  private reader: ReadableStreamDefaultReader<Uint8Array>

  private buffers: Uint8Array[]

  private supportRange: boolean

  private abortSleep_: Sleep

  private aborted: boolean

  private bandwidth: number

  private delay: number

  constructor(options: FetchIOLoaderOptions = {}) {
    super(options)
  }

  private async getTotalSize(method: string, headers: Data = {}) {
    const params: RequestInit = {
      method: method,
      headers: {},
      mode: 'cors',
      cache: 'default',
      referrerPolicy: 'no-referrer-when-downgrade'
    }
    if (this.info.httpOptions?.headers) {
      object.each(this.info.httpOptions.headers, (value, key) => {
        params.headers[key] = value
      })
    }

    object.each(headers, (value, key) => {
      params.headers[key] = value
    })

    if (this.info.httpOptions?.credentials) {
      params.credentials = this.info.httpOptions.credentials
    }

    if (this.info.httpOptions?.referrerPolicy) {
      params.referrerPolicy = this.info.httpOptions.referrerPolicy
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    if (controller) {
      this.abortController = controller
      params.signal = controller.signal
    }

    try {
      const res = await fetch(this.info.url, params)
      if (this.aborted || controller?.signal.aborted) {
        return IOError.ABORT
      }
      if (res.ok && (res.status >= 200 && res.status <= 299)) {
        const acceptRanges = res.headers.get('Accept-Ranges')
        if (acceptRanges) {
          if (acceptRanges.indexOf('bytes') === -1) {
            this.supportRange = false
          }
        }

        const contentRange = res.headers.get('Content-Range')
        if (contentRange) {
          const size = contentRange.split('/')[1]
          if (size) {
            return parseInt(size)
          }
        }
        const lengthHeader = res.headers.get('X-Content-Length') || res.headers.get('Content-Length')
        if (lengthHeader != null) {
          return parseInt(lengthHeader)
        }
      }
    }
    catch (error) {
      if (this.aborted || controller?.signal.aborted) {
        return IOError.ABORT
      }
    }
    finally {
      controller?.abort()
      if (this.abortController === controller) {
        this.abortController = null
      }
    }
    return 0
  }

  public async open(info: FetchInfo, range: Range = { from: 0, to: -1 }) {
    this.rangeReader?.clear()
    this.rangeReader = undefined

    this.abortReadAt()
    this.info = info
    this.range = range

    if (this.range.to == null) {
      this.range.to = -1
    }

    this.range.from = Math.max(this.range.from, 0)

    this.startBytes = 0
    this.endBytes = -1
    this.eofIndex = -1
    this.contentLength = undefined
    this.receivedLength = 0
    this.buffers = []
    this.supportRange = true
    this.aborted = false
    this.bandwidth = 0

    if (this.range.to >= 0) {
      this.eofIndex = range.to
    }

    if (this.range && !this.options.isLive) {
      this.startBytes = this.range.from ?? 0
    }

    this.status = IOLoaderStatus.CONNECTING

    if (!this.options.isLive && !this.options.disableSegment) {
      let totalSize = await this.getTotalSize('HEAD')
      if (!totalSize && !this.aborted) {
        totalSize = await this.getTotalSize('Get', {
          range: 'bytes=0-1'
        })
      }
      if (this.aborted || totalSize === IOError.ABORT) {
        return IOError.ABORT
      }
      if (totalSize <= 2) {
        totalSize = 0
      }
      if (totalSize) {
        this.contentLength = totalSize
        if (this.range.to < 0) {
          this.eofIndex = this.contentLength + this.range.to
        }
        if (this.supportRange) {
          this.endBytes = Math.min(this.startBytes + this.options.preload - 1, this.eofIndex)
        }
      }
      else {
        this.endBytes = -1
      }
    }

    this.status = IOLoaderStatus.BUFFERING

    return 0
  }

  private getBandwidthReader(reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>>, start: number) {
    const buffers: Uint8Array<ArrayBufferLike>[] = []
    let end = false
    let pending: () => void
    let totals = 0
    const me = this
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            end = true
            const duration = (getTimestamp() - start) / 1000
            me.bandwidth = totals * 8 / duration
            if (pending) {
              pending()
              pending = null
            }
            break
          }
          else {
            buffers.push(value)
            totals += value.length
            if (pending) {
              pending()
              pending = null
            }
          }
        }
      },
      async pull(controller) {
        while (true) {
          if (buffers.length) {
            controller.enqueue(buffers.shift())
            return
          }
          if (end && !buffers.length) {
            controller.close()
            return
          }
          await new Promise<void>((resolve) => {
            pending = resolve
          })
        }
      }
    })
    return stream.getReader()
  }

  private async openReader(): Promise<ReadableStreamDefaultReader<Uint8Array> | undefined> {
    if (this.aborted) {
      return
    }

    const params: RequestInit = {
      method: 'GET',
      headers: {},
      mode: 'cors',
      cache: 'default',
      referrerPolicy: 'no-referrer-when-downgrade'
    }
    if (this.info.httpOptions?.headers) {
      object.each(this.info.httpOptions.headers, (value, key) => {
        params.headers[key] = value
      })
    }
    const headers = new Headers(params.headers)
    headers.delete('Range')
    if (!this.options.isLive && !this.options.disableSegment && this.supportRange) {
      headers.set('Range', `bytes=${this.startBytes}-${this.endBytes >= 0 ? this.endBytes : ''}`)
    }
    params.headers = headers

    if (this.info.httpOptions?.credentials) {
      params.credentials = this.info.httpOptions.credentials
    }

    if (this.info.httpOptions?.referrerPolicy) {
      params.referrerPolicy = this.info.httpOptions.referrerPolicy
    }

    this.abortController?.abort()

    const controller = typeof AbortController === 'function' ? new AbortController() : null
    if (controller) {
      this.abortController = controller
      params.signal = controller.signal
    }

    try {
      const start = getTimestamp()
      const res = await fetch(this.info.url, params)
      if (this.aborted || controller?.signal.aborted) {
        return
      }
      const openStart = getTimestamp()
      this.delay = openStart - start
      if (res.ok && (res.status >= 200 && res.status <= 299)) {
        if (!res.body) {
          throw new Error('Empty media response')
        }
        if (res.status === 206) {
          const range = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(res.headers.get('Content-Range') || '')
          const start = range ? Number(range[1]) : -1
          const end = range ? Number(range[2]) : -1
          const total = range ? Number(range[3]) : 0
          const encoding = res.headers.get('Content-Encoding')
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(total)
            || start !== this.startBytes || end < start || end >= total
            || this.endBytes >= 0 && end !== Math.min(this.endBytes, total - 1)
            || this.contentLength !== undefined && total !== this.contentLength
            || encoding && encoding.toLowerCase() !== 'identity'
          ) {
            await res.body.cancel()
            throw new Error('Invalid media Content-Range')
          }
          this.contentLength = total
          this.eofIndex = this.range.to >= 0 ? Math.min(this.range.to, total - 1) : total + this.range.to
          this.endBytes = end
        }
        else if (!this.options.isLive && res.status === 200) {
          // Range is optional on the server. A 200 body always starts at byte 0,
          // so restart sequentially and discard the prefix rather than mislabel it.
          this.supportRange = false
          this.endBytes = this.eofIndex
        }
        this.reader = this.options.enableBandwidthReader ? this.getBandwidthReader(res.body.getReader(), openStart) : res.body.getReader()
        const reader = this.reader
        let skip = !this.options.isLive && res.status === 200 ? this.startBytes : 0
        while (skip > 0) {
          const { value, done } = await reader.read()
          if (this.aborted || controller?.signal.aborted || reader !== this.reader) {
            return
          }
          if (done) {
            throw new Error('Media response ended before the requested offset')
          }
          const consumed = Math.min(skip, value.length)
          skip -= consumed
          if (consumed < value.length) {
            const length = this.eofIndex >= 0
              ? Math.min(value.length - consumed, this.eofIndex + 1 - this.range.from - this.receivedLength)
              : value.length - consumed
            this.buffers.push(value.subarray(consumed, consumed + length))
            this.receivedLength += length
            if (this.eofIndex >= 0 && this.receivedLength + this.range.from >= this.eofIndex + 1) {
              this.status = IOLoaderStatus.COMPLETE
              await reader.cancel()
            }
          }
        }
        return this.reader
      }
      else {
        this.status = IOLoaderStatus.ERROR
        logger.fatal(`FetchStreamLoader: Http code invalid, ${res.status} ${res.statusText}`)
      }
    }
    catch (error) {
      if (this.aborted || controller?.signal.aborted) {
        return
      }
      if (this.retryCount < this.options.retryCount && (!this.options.isLive || !this.receivedLength)) {
        this.retryCount++
        this.status = IOLoaderStatus.CONNECTING

        const retry = new Sleep(this.options.retryInterval)
        this.abortSleep_ = retry
        await retry
        if (this.abortSleep_ !== retry) {
          return
        }
        this.abortSleep_ = null
        if (this.aborted) {
          return
        }
        return this.openReader()
      }
      else {
        logger.fatal(`FetchStreamLoader: exception ${error.message}`)
      }
    }
  }

  private async readInterval(buffer: Uint8ArrayInterface, preLen: int32 = 0): Promise<number> {
    if (this.aborted) {
      return IOError.END
    }

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

    const reader = this.reader ?? await this.openReader()
    if (!reader || this.aborted || reader !== this.reader) {
      return IOError.END
    }
    if (this.buffers.length) {
      return this.readInterval(buffer.subarray(pos, undefined, true), pos + preLen)
    }

    const result = await reader.read()
    let value = result.value
    const done = result.done
    if (this.aborted || reader !== this.reader) {
      return IOError.END
    }

    if (done) {
      if (this.contentLength !== undefined && (this.receivedLength + this.range.from) < this.endBytes + 1) {
        this.status = IOLoaderStatus.ERROR
        logger.fatal('Fetch stream meet Early-EOF')
      }
      else if (this.options.isLive || this.options.disableSegment || !this.supportRange
        || (this.receivedLength + this.range.from) >= this.eofIndex + 1) {
        this.status = IOLoaderStatus.COMPLETE
        this.startBytes = 0
        return pos > 0 ? (pos + preLen) : (preLen > 0 ? preLen : IOError.END)
      }
      else {

        await reader.cancel()
        if (this.aborted || reader !== this.reader) {
          return IOError.END
        }

        if (this.abortController) {
          this.abortController.abort()
          this.abortController = null
        }

        this.reader = null

        this.startBytes = this.endBytes + 1
        this.endBytes = Math.min(this.startBytes + this.options.preload - 1, this.eofIndex)

        return this.readInterval(buffer.subarray(pos, undefined, true), pos + preLen)
      }
    }
    else {

      if (!this.options.isLive && this.eofIndex >= 0) {
        value = value.subarray(0, Math.max(0, this.eofIndex + 1 - this.range.from - this.receivedLength))
      }
      this.receivedLength += value.length
      if (!this.options.isLive && this.eofIndex >= 0 && this.receivedLength + this.range.from >= this.eofIndex + 1) {
        this.status = IOLoaderStatus.COMPLETE
        await reader.cancel()
        if (this.aborted || reader !== this.reader) {
          return IOError.END
        }
      }

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

  public async readAt(pos: bigint, length: number, readAheadEnd?: bigint): Promise<Uint8Array | number> {
    if (this.status !== IOLoaderStatus.BUFFERING && this.status !== IOLoaderStatus.COMPLETE
      || this.options.isLive || this.options.disableSegment || !this.supportRange
      || typeof AbortController !== 'function'
    ) {
      return errorType.OPERATE_NOT_SUPPORT
    }
    if (this.rangeController) {
      return IOError.AGAIN
    }
    if (!this.isReadAtRangeValid(pos, length)) {
      return errorType.INVALID_PARAMETERS
    }

    const start = Number(pos)
    const end = start + length - 1
    const contentLength = this.contentLength
    if (start < this.range.from || this.eofIndex >= 0 && end > this.eofIndex) {
      return errorType.INVALID_PARAMETERS
    }

    if (readAheadEnd !== undefined) {
      if (typeof readAheadEnd !== 'bigint' || readAheadEnd < pos + BigInt(length)
        || !Number.isSafeInteger(contentLength) || contentLength <= 0
        || readAheadEnd > BigInt(contentLength) || readAheadEnd > BigInt(this.eofIndex) + 1n
      ) {
        return errorType.INVALID_PARAMETERS
      }
      this.rangeReader ??= new HttpRangeReader(contentLength, (from, to, signal) => {
        const headers = new Headers(this.info.httpOptions?.headers)
        headers.set('Range', `bytes=${from}-${to}`)
        return fetch(this.info.url, {
          method: 'GET', headers, mode: 'cors', cache: 'default', signal,
          credentials: this.info.httpOptions?.credentials,
          referrerPolicy: this.info.httpOptions?.referrerPolicy ?? 'no-referrer-when-downgrade'
        })
      })
      return this.rangeReader.read(start, length, Number(readAheadEnd))
    }

    const controller = new AbortController()
    this.rangeController = controller
    const timeout = setTimeout(() => controller.abort(), READ_AT_TIMEOUT_MS)
    try {
      const headers = new Headers(this.info.httpOptions?.headers)
      headers.set('Range', `bytes=${start}-${end}`)
      const response = await fetch(this.info.url, {
        method: 'GET',
        headers,
        mode: 'cors',
        cache: 'default',
        credentials: this.info.httpOptions?.credentials,
        referrerPolicy: this.info.httpOptions?.referrerPolicy ?? 'no-referrer-when-downgrade',
        signal: controller.signal
      })
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(response.headers.get('Content-Range') || '')
      const total = range ? Number(range[3]) : 0
      const encoding = response.headers.get('Content-Encoding')
      if (response.status !== 206 || !response.body || !range
        || Number(range[1]) !== start || Number(range[2]) !== end
        || !Number.isSafeInteger(total) || total <= end
        || contentLength && total !== contentLength
        || encoding && encoding.toLowerCase() !== 'identity'
      ) {
        return IOError.INVALID_OPERATION
      }

      const result = await this.readRangeBody(response.body.getReader(), length)
      return controller.signal.aborted ? IOError.ABORT : result
    }
    catch (error) {
      return controller.signal.aborted ? IOError.ABORT : IOError.NETWORK_ERROR
    }
    finally {
      clearTimeout(timeout)
      controller.abort()
      this.rangeController = null
    }
  }

  public abortReadAt() {
    this.rangeController?.abort()
    this.rangeReader?.abort()
  }

  public async seek(pos: int64) {

    if (this.options.isLive) {
      return errorType.OPERATE_NOT_SUPPORT
    }
    if (pos < BigInt(this.range.from) || this.eofIndex >= 0 && pos > BigInt(this.eofIndex) + 1n) {
      return errorType.INVALID_PARAMETERS
    }

    await this.abortReader()
    this.aborted = false
    this.receivedLength = Number(pos) - this.range.from
    this.startBytes = Number(pos)
    if (!this.options.disableSegment) {
      this.endBytes = this.eofIndex >= 0 ? Math.min(this.startBytes + this.options.preload - 1, this.eofIndex) : -1
    }
    this.buffers.length = 0
    this.status = this.eofIndex >= 0 && this.startBytes === this.eofIndex + 1
      ? IOLoaderStatus.COMPLETE : IOLoaderStatus.BUFFERING

    return 0
  }

  public async size() {
    if (this.options.isLive) {
      return 0n
    }
    return static_cast<int64>(this.contentLength || 0)
  }

  public abortSleep() {
    this.aborted = true
    if (this.abortSleep_) {
      this.abortSleep_.stop()
      this.abortSleep_ = null
    }
  }

  private async abortReader() {
    this.abortSleep()
    const reader = this.reader
    const controller = this.abortController
    this.reader = null
    this.abortController = null
    try {
      if (reader) {
        await reader.cancel()
      }
    }
    finally {
      controller?.abort()
    }
  }

  public async abort() {
    this.abortReadAt()
    await this.abortReader()
  }

  public async stop() {
    this.status = IOLoaderStatus.IDLE
    await this.abort()
    this.rangeReader?.clear()
    this.rangeReader = undefined
  }

  public getUrl() {
    return this.info?.url
  }
}
