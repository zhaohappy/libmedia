/* libmedia check is ioloader protocol
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

import { IOType } from '../avformat'
import { Ext2IOLoader } from '../stringEnum'
import concatTypeArray from 'common/function/concatTypeArray'
import { Data, HttpOptions } from 'common/types/type'
import * as object from 'common/util/object'
import * as text from 'common/util/text'
import * as urlUtils from 'common/util/url'

async function analyzeUrlFileExt(url: string, httpOptions: HttpOptions = {}) {
  const params: RequestInit = {
    method: 'GET',
    headers: {},
    mode: 'cors',
    cache: 'default',
    referrerPolicy: 'no-referrer-when-downgrade'
  }
  if (httpOptions.headers) {
    object.each(httpOptions.headers, (value, key) => {
      params.headers[key] = value
    })
  }
  if (httpOptions.credentials) {
    params.credentials = httpOptions.credentials
  }
  if (httpOptions.referrerPolicy) {
    params.referrerPolicy = httpOptions.referrerPolicy
  }
  let abortController: AbortController
  if (typeof AbortController === 'function') {
    abortController = new AbortController()
    params.signal = abortController.signal
  }
  const res = await fetch(url, params)
  if (res.ok && (res.status >= 200 && res.status <= 299)) {
    const reader = res.body.getReader()
    const buffers: Uint8Array[] = []
    let len = 0
    while (true) {
      let result = await reader.read()
      if (result.done) {
        break
      }
      len += result.value.length
      buffers.push(result.value)
      if (len >= 100) {
        break
      }
    }
    if (abortController) {
      abortController.abort()
    }
    if (buffers.length) {
      const buffer = buffers.length > 1 ? concatTypeArray(Uint8Array, buffers) : buffers[0]
      if (buffer.length) {
        const context = text.decode(buffer.subarray(0, 100))
        if (/<\?xml/.test(context)) {
          if (context.indexOf('<MPD') > -1) {
            return 'mpd'
          }
        }
        else if (/#EXTM3U/.test(context)) {
          return 'm3u8'
        }
      }
    }
  }
  return ''
}

export default async function analyzeUrlIOLoader(source: string, defaultExt: string = '', httpOptions: HttpOptions = {}) {
  let type: IOType
  let ext: string = ''
  let info: Data = {
    url: source
  }

  if (defined(ENABLE_PROTOCOL_RTSP) && /^rtsp/.test(source)
    || defined(ENABLE_PROTOCOL_RTMP) && /^rtmp/.test(source)
  ) {
    if (defined(ENABLE_PROTOCOL_RTSP) && /^rtsp/.test(source)) {
      ext = 'rtsp'
    }
    else if (defined(ENABLE_PROTOCOL_RTMP) && /^rtmp/.test(source)) {
      ext = 'rtmp'
    }
    type = IOType.WEBSOCKET
    const protocol = urlUtils.parse(source).protocol
    const subProtocol = protocol.split('+')[1] || 'wss'
    if (subProtocol === 'wss' || subProtocol === 'ws') {
      type = IOType.WEBSOCKET
    }
    else if (subProtocol === 'webtransport') {
      type = IOType.WEBTRANSPORT
    }
    info.url = info.url.replace(/^\S+:\/\//, subProtocol + '://')
    if (ext === 'rtmp') {
      info.subProtocol = type
      type = IOType.RTMP
    }
  }
  else {

    const protocol = urlUtils.parse(source).protocol

    ext = defaultExt || urlUtils.parse(source).file.split('.').pop()
    // 没有文件后缀，我们需要分析是不是 m3u8 和 mpd 文件
    // 这两种格式需要提前知道来创建指定的 ioloader
    if (!ext && /^https?/.test(protocol)) {
      ext = await analyzeUrlFileExt(source, httpOptions)
    }

    let defaultType: IOType = IOType.Fetch
    if (protocol === 'wss' || protocol === 'ws') {
      defaultType = IOType.WEBSOCKET
    }
    else if (protocol === 'webtransport') {
      defaultType = IOType.WEBTRANSPORT
    }
    type = Ext2IOLoader[ext] ?? defaultType
  }

  return {
    type,
    ext,
    info
  }
}
