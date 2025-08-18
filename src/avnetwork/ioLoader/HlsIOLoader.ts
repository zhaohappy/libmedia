/*
 * libmedia hls loader
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
import IOLoader, { IOLoaderAudioStreamInfo, IOLoaderOptions, IOLoaderStatus, IOLoaderSubtitleStreamInfo, IOLoaderVideoStreamInfo } from './IOLoader'
import * as object from 'common/util/object'
import { IOError } from 'common/io/error'
import { Uint8ArrayInterface } from 'common/io/interface'
import { buildAbsoluteURL } from 'common/util/url'

import hlsParser from 'avprotocol/m3u8/parser'
import { MasterPlaylist, MediaPlaylist, Playlist, Segment } from 'avprotocol/m3u8/types'
import FetchIOLoader, { FetchInfo } from './FetchIOLoader'
import getTimestamp from 'common/function/getTimestamp'
import * as logger from 'common/util/logger'
import * as urlUtil from 'common/util/url'
import AESDecryptPipe from '../bsp/aes/AESDecryptPipe'
import * as is from 'common/util/is'
import { Data } from 'common/types/type'
import * as errorType from 'avutil/error'
import { AVMediaType } from 'avutil/codec'
import AESWebDecryptor from 'common/crypto/aes/AESWebDecryptor'
import { AesMode } from 'common/crypto/aes/aes'
import { Ext2Format } from 'avutil/stringEnum'
import { AVFormat } from 'avutil/avformat'

const FETCHED_HISTORY_LIST_MAX = 10

function getFetchParams(info: FetchInfo, method: string = 'GET') {
  const params: Data = {
    method: 'GET',
    headers: {},
    mode: 'cors',
    cache: 'default',
    referrerPolicy: 'no-referrer-when-downgrade'
  }
  if (info.httpOptions?.headers) {
    object.each(info.httpOptions.headers, (value, key) => {
      params.headers[key] = value
    })
  }

  if (info.httpOptions?.credentials) {
    params.credentials = info.httpOptions.credentials
  }

  if (info.httpOptions?.referrerPolicy) {
    params.referrerPolicy = info.httpOptions.referrerPolicy
  }
  return params
}

async function fetchMediaPlayList(url: string, info: FetchInfo, options: IOLoaderOptions, signal?: AbortSignal) {
  return new Promise<MediaPlaylist>((resolve, reject) => {
    let retryCount = 0
    async function done() {
      try {
        const res = await fetch(url, {
          ...getFetchParams(info),
          signal
        })
        const text = await res.text()
        const mediaPlayList = hlsParser(text) as MediaPlaylist

        if (options.isLive && (!mediaPlayList.segments || mediaPlayList.segments.length < 2)) {
          let wait = 5
          if (mediaPlayList.segments?.length) {
            wait = mediaPlayList.segments[0].duration * (2 - mediaPlayList.segments.length)
          }
          logger.warn(`wait for min buffer time, now segments: ${mediaPlayList.segments.length}`)
          await new Sleep(wait)
          retryCount = 0
          done()
        }
        resolve(mediaPlayList)
      }
      catch (error) {
        if (error?.name === 'AbortError') {
          resolve(null)
          return
        }
        if (retryCount < options.retryCount) {
          retryCount++
          logger.error(`failed fetch m3u8 file, retry(${retryCount}/3)`)
          await new Sleep(options.retryInterval)
          return done()
        }
        else {
          logger.error('HLSLoader: exception, fetch slice error')
          reject()
        }
      }
    }
    done()
  })
}

class MediaLoader {

  private options: IOLoaderOptions
  private info: FetchInfo

  private mediaPlayList: MediaPlaylist

  private fetchedMap: Map<string, boolean>

  private fetchedHistoryList: string[]

  private mediaListUrl: string

  private segmentIndex: number
  private currentUri: string

  private loader: FetchIOLoader

  private keyMap: Map<string, ArrayBuffer>

  private currentIV: ArrayBuffer
  private currentKey: ArrayBuffer
  private aesDecryptPipe: AESDecryptPipe

  private initLoaded: boolean
  private isInitLoader: boolean

  private minBuffer: number
  private pendingBuffer: Uint8Array
  private magicAdded: boolean

  private sleep: Sleep
  private aborted: boolean

  private signal: AbortController

  constructor(options: IOLoaderOptions, info: FetchInfo, mediaListUrl?: string, mediaPlayList?: MediaPlaylist) {
    this.options = options
    this.info = info

    this.segmentIndex = 0
    this.fetchedMap = new Map()
    this.fetchedHistoryList = []
    this.keyMap = new Map()
    this.aborted = false

    if (mediaListUrl && mediaPlayList) {
      this.setMediaPlayList(mediaListUrl, mediaPlayList)
    }
  }

  public setMediaPlayList(mediaListUrl: string, mediaPlayList: MediaPlaylist) {

    if (this.options.isLive) {
      this.fetchedMap.clear()
      this.fetchedHistoryList.length = 0
      this.segmentIndex = 0
      const currentSegment = mediaPlayList.segments.find((segment) => {
        return segment.uri === this.currentUri
      })
      if (currentSegment) {
        mediaPlayList.segments.forEach((segment, index) => {
          if (segment.mediaSequenceNumber === currentSegment.mediaSequenceNumber + 1) {
            this.segmentIndex = index
          }
          else if (segment.mediaSequenceNumber <= currentSegment.mediaSequenceNumber) {
            this.fetchedMap.set(segment.uri, true)
            this.fetchedHistoryList.push(segment.uri)
          }
        })
        while (this.fetchedHistoryList.length >= FETCHED_HISTORY_LIST_MAX) {
          this.fetchedMap.delete(this.fetchedHistoryList.shift())
        }
      }
    }

    this.mediaListUrl = mediaListUrl
    this.mediaPlayList = mediaPlayList
    this.minBuffer = this.mediaPlayList.duration || 0
    if (this.mediaPlayList.endlist) {
      this.options.isLive = false
    }
    this.initLoaded = true
    if (this.mediaPlayList.segments.length && this.mediaPlayList.segments[0].map) {
      this.initLoaded = false
    }

    if (this.mediaPlayList.lowLatencyCompatibility) {
      const buffer = this.mediaPlayList.lowLatencyCompatibility.partHoldBack
        || this.mediaPlayList.lowLatencyCompatibility.holdBack
        || this.minBuffer

      let cache = 0
      let hasKeyframe = false
      let segIndex = 0
      for (let i = this.mediaPlayList.segments.length - 1; i >= 0; i--) {
        const segment = this.mediaPlayList.segments[i]
        if (segment.parts?.length) {
          if (!segment.uri) {
            continue
          }
          for (let j = segment.parts.length - 1; j >= 0; j--) {
            const part = segment.parts[j]
            if (!part.hint) {
              cache += part.duration
              if (part.independent) {
                hasKeyframe = true
              }
              if (cache >= buffer && hasKeyframe) {
                segIndex = i
                break
              }
            }
          }
          if (cache >= buffer && hasKeyframe) {
            break
          }
        }
        else {
          cache += segment.duration
          hasKeyframe = true
          if (cache >= buffer && hasKeyframe) {
            segIndex = i
            break
          }
        }
      }
      this.fetchedMap.clear()
      this.fetchedHistoryList.length = 0
      for (let i = 0; i < segIndex; i++) {
        const segment = this.mediaPlayList.segments[i]
        this.fetchedMap.set(segment.uri, true)
        this.fetchedHistoryList.push(segment.uri)
      }
      while (this.fetchedHistoryList.length >= FETCHED_HISTORY_LIST_MAX) {
        this.fetchedMap.delete(this.fetchedHistoryList.shift())
      }
      this.segmentIndex = segIndex
      this.minBuffer = cache
    }
  }

  public getMediaListUrl() {
    return this.mediaListUrl
  }

  private async checkNeedDecrypt(key: Segment['key'], uri: string, sequence: number) {

    if (!key) {
      this.aesDecryptPipe = null
      return
    }

    if (key.method.toLocaleLowerCase() !== 'aes-128'
      && key.method.toLocaleLowerCase() !== 'aes-128-ctr'
      && (key.method.toLocaleLowerCase() !== 'aes-256'
        && key.method.toLocaleLowerCase() !== 'aes-256-ctr'
        || !AESWebDecryptor.isSupport()
      )
    ) {
      if (uri.split('.').pop() === 'mp4') {
        this.aesDecryptPipe = null
        return
      }
      logger.fatal(`m3u8 ts not support EXT-X-KEY METHOD ${key.method}`)
    }

    const keyUrl = key.uri

    if (this.keyMap.has(keyUrl)) {
      this.currentKey = this.keyMap.get(keyUrl)
    }
    else {
      this.currentKey = await (await fetch(buildAbsoluteURL(this.mediaListUrl, keyUrl), getFetchParams(this.info))).arrayBuffer()
      this.keyMap.set(keyUrl, this.currentKey)
    }

    if (key.iv) {
      this.currentIV = key.iv.buffer
    }
    else {
      const iv = new Uint8Array(16)
      const dataView = new DataView(iv.buffer)
      dataView.setUint32(12, sequence, false)
      this.currentIV = iv.buffer
    }
    this.aesDecryptPipe = new AESDecryptPipe(key.method.toLocaleLowerCase().indexOf('ctr') > 0 ? AesMode.CTR : AesMode.CBC)
    this.aesDecryptPipe.onFlush = async (buffer) => {
      return this.loader.read(buffer)
    }
    await this.aesDecryptPipe.expandKey(this.currentKey, this.currentIV)
  }

  private handleSlice(len: number, buffer: Uint8ArrayInterface) {
    const ext = this.loader.getUrl().split('.').pop()
    if (ext !== 'mp3') {
      // ID3
      if (!this.magicAdded && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        const format = Ext2Format[ext] ?? AVFormat.UNKNOWN
        if (format === AVFormat.UNKNOWN) {
          return len
        }
        if (len + 6 > buffer.length) {
          this.pendingBuffer = buffer.slice(len - 6)
        }
        buffer.set(buffer.slice(0, len - 6), 6)
        // 拥有 ID3 标签的 aac 等格式添加一个私有的头 LIMA 
        buffer[0] = 0x4c
        buffer[1] = 0x49
        buffer[2] = 0x4d
        buffer[3] = 0x41
        buffer[4] = (format >>> 8) & 0xff
        buffer[5] = format & 0xff
        this.magicAdded = true
        return this.pendingBuffer ? len : len + 6
      }
    }
    return len
  }

  public async read(buffer: Uint8ArrayInterface): Promise<number> {

    if (this.pendingBuffer) {
      let len = this.pendingBuffer.length
      buffer.set(this.pendingBuffer)
      this.pendingBuffer = null
      return len
    }

    let ret = 0

    if (this.loader) {
      ret = this.aesDecryptPipe ? (await this.aesDecryptPipe.read(buffer)) : (await this.loader.read(buffer))
      if (ret !== IOError.END) {
        return ret
      }
      else {
        if (!this.isInitLoader) {
          if (this.options.isLive) {
            this.fetchedMap.set(this.currentUri, true)
            if (this.fetchedHistoryList.length === FETCHED_HISTORY_LIST_MAX) {
              this.fetchedMap.delete(this.fetchedHistoryList.shift())
            }
            this.fetchedHistoryList.push(this.currentUri)
            this.segmentIndex++
          }
          else {
            this.segmentIndex++
            if (this.segmentIndex >= this.mediaPlayList.segments.length) {
              return IOError.END
            }
          }
        }
        else {
          this.initLoaded = true
        }
        this.loader = null
      }
    }

    if (this.options.isLive) {
      const segments = this.mediaPlayList.segments.filter((segment) => {
        return segment.uri && !this.fetchedMap.get(segment.uri)
      })

      if (!segments.length) {
        if (this.mediaPlayList.endlist) {
          return IOError.END
        }

        const wait = (this.minBuffer - (getTimestamp() - this.mediaPlayList.timestamp) / 1000) / 2
        if (wait > 0) {
          this.sleep = new Sleep(wait)
          await this.sleep
          this.sleep = null
          if (this.aborted) {
            return IOError.END
          }
        }
        if (typeof AbortController === 'function') {
          this.signal = new AbortController()
        }
        this.mediaPlayList = await fetchMediaPlayList(this.mediaListUrl, this.info, this.options, this.signal?.signal)
        this.signal = null
        if (this.aborted) {
          return IOError.END
        }
        return this.read(buffer)
      }

      this.isInitLoader = !!(segments[0].map?.uri && !this.initLoaded)

      this.currentUri = segments[0].uri

      if (!this.isInitLoader) {
        await this.checkNeedDecrypt(segments[0].key, this.currentUri, this.segmentIndex + (this.mediaPlayList.mediaSequenceBase || 0))
      }
      else if (segments[0].map?.key) {
        await this.checkNeedDecrypt(segments[0].map.key, segments[0].map.uri, this.segmentIndex + (this.mediaPlayList.mediaSequenceBase || 0))
      }

      this.loader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      const url = buildAbsoluteURL(this.mediaListUrl, this.isInitLoader ? segments[0].map.uri : this.currentUri)
      const range = {
        from: 0,
        to: -1
      }
      const byteRange = this.isInitLoader ? segments[0].map.byterange : segments[0].byterange
      if (byteRange) {
        range.from = byteRange.offset
        range.to = byteRange.offset + byteRange.length
      }

      await this.loader.open(
        object.extend({}, this.info, {
          url,
        }),
        range
      )
      const ret = await (this.aesDecryptPipe ? this.aesDecryptPipe.read(buffer) : this.loader.read(buffer))
      if (ret > 10) {
        return this.handleSlice(ret, buffer)
      }
      return ret
    }
    else {
      this.loader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      let segment = this.mediaPlayList.segments[this.segmentIndex]
      while (segment && !segment.uri) {
        segment = this.mediaPlayList.segments[++this.segmentIndex]
      }

      this.isInitLoader = !!(segment.map?.uri && !this.initLoaded)

      if (!this.isInitLoader) {
        await this.checkNeedDecrypt(segment.key, segment.uri, this.segmentIndex + (this.mediaPlayList.mediaSequenceBase || 0))
      }
      else if (segment.map?.key) {
        await this.checkNeedDecrypt(segment.map.key, segment.map.uri, this.segmentIndex + (this.mediaPlayList.mediaSequenceBase || 0))
      }

      const url = buildAbsoluteURL(this.mediaListUrl, this.isInitLoader ? segment.map.uri : segment.uri)
      const range = {
        from: 0,
        to: -1
      }
      const byteRange = this.isInitLoader ? segment.map.byterange : segment.byterange
      if (byteRange) {
        range.from = byteRange.offset
        range.to = byteRange.offset + byteRange.length
      }

      await this.loader.open(
        object.extend({}, this.info, {
          url,
        }),
        range
      )
      const ret = await (this.aesDecryptPipe ? this.aesDecryptPipe.read(buffer) : this.loader.read(buffer))
      if (ret > 10) {
        return this.handleSlice(ret, buffer)
      }
      return ret
    }
  }

  public async seek(timestamp: int64) {
    if (this.loader) {
      await this.loader.abort()
      this.loader = null
    }

    let duration = 0
    let seekTime = Number(timestamp)
    let index = -1

    for (let i = 0; i < this.mediaPlayList.segments.length; i++) {
      if (is.number(this.mediaPlayList.segments[i].duration)) {
        duration += this.mediaPlayList.segments[i].duration
        if (duration * 1000 >= seekTime) {
          index = i
          break
        }
      }
    }
    if (index === -1) {
      index = this.mediaPlayList.segments.length - 1
    }
    this.segmentIndex = index
    this.aborted = false
    return 0
  }

  public abortSleep() {
    this.aborted = true
    if (this.loader) {
      this.loader.abortSleep()
    }
    if (this.sleep) {
      this.sleep.stop()
      this.sleep = null
    }
  }

  public async abort() {
    this.abortSleep()
    if (this.signal) {
      this.signal.abort()
      this.signal = null
    }
    if (this.loader) {
      await this.loader.abort()
      this.loader = null
    }
  }

  public getMinBuffer() {
    return this.minBuffer
  }

  public getDuration() {
    return this.mediaPlayList.duration
  }
}

export default class HlsIOLoader extends IOLoader {

  private info: FetchInfo

  private masterPlaylist: MasterPlaylist

  private mediaPlayListIndex: number

  private mainLoader: MediaLoader
  private loaders: Map<AVMediaType, MediaLoader>

  private audioSelectedIndex: number
  private subtitleSelectedIndex: number

  private sleep: Sleep
  private aborted: boolean

  private async fetchMasterPlayList() {
    try {
      const res = await fetch(this.info.url, getFetchParams(this.info))
      const text = await res.text()

      const playList: Playlist = hlsParser(text)

      if (playList.isMasterPlaylist) {
        this.masterPlaylist = playList as MasterPlaylist
      }
      else {
        const mediaPlayList = playList as MediaPlaylist

        if (this.options.isLive && (!mediaPlayList.segments || mediaPlayList.segments.length < 2)) {
          let wait = 5
          if (mediaPlayList.segments?.length) {
            wait = mediaPlayList.segments[0].duration * (2 - mediaPlayList.segments.length)
          }
          logger.warn(`wait for min buffer time, now segments: ${mediaPlayList.segments.length}`)
          await new Sleep(wait)
          return this.fetchMasterPlayList()
        }
        this.mainLoader = new MediaLoader(
          this.options,
          this.info,
          this.info.url,
          mediaPlayList
        )
        this.loaders.set(AVMediaType.AVMEDIA_TYPE_VIDEO, this.mainLoader)
      }
      return playList
    }
    catch (error) {
      if (this.retryCount < this.options.retryCount) {
        this.retryCount++
        logger.error(`failed fetch m3u8 file, retry(${this.retryCount}/3)`)
        this.sleep = new Sleep(3)
        await this.sleep
        this.sleep = null
        if (this.aborted) {
          logger.fatal('HLSLoader: exception, fetch abort')
        }
        return this.fetchMasterPlayList()
      }
      else {
        this.status = IOLoaderStatus.ERROR
        logger.fatal('HLSLoader: exception, fetch slice error')
      }
    }
  }

  private buildUrl(url: string) {
    if (!/^https?/.test(url)) {
      url = urlUtil.buildAbsoluteURL(this.info.url, url)
    }
    return url
  }

  private async createLoader() {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      if (!currentVariant) {
        logger.fatal('no media playlist')
      }
      if (currentVariant.audio.length) {
        const mediaUrl = this.buildUrl(currentVariant.audio[this.audioSelectedIndex].uri)
        this.loaders.set(AVMediaType.AVMEDIA_TYPE_AUDIO, new MediaLoader(
          this.options,
          this.info,
          mediaUrl,
          await fetchMediaPlayList(
            mediaUrl,
            this.info,
            this.options
          )
        ))
      }
      if (currentVariant.subtitles.length) {
        const mediaUrl = this.buildUrl(currentVariant.subtitles[this.subtitleSelectedIndex].uri)
        this.loaders.set(AVMediaType.AVMEDIA_TYPE_SUBTITLE, new MediaLoader(
          this.options,
          this.info,
          mediaUrl,
          await fetchMediaPlayList(
            mediaUrl,
            this.info,
            this.options
          )
        ))
      }

      const mediaUrl = this.buildUrl(currentVariant.uri)

      this.mainLoader = new MediaLoader(
        this.options,
        this.info,
        mediaUrl,
        await fetchMediaPlayList(
          mediaUrl,
          this.info,
          this.options
        )
      )
      this.loaders.set(AVMediaType.AVMEDIA_TYPE_VIDEO, this.mainLoader)
    }
  }

  public async open(info: FetchInfo) {

    if (this.status === IOLoaderStatus.BUFFERING) {
      return 0
    }

    if (this.status !== IOLoaderStatus.IDLE) {
      return errorType.INVALID_OPERATE
    }

    this.info = info

    this.mediaPlayListIndex = 0
    this.audioSelectedIndex = 0
    this.subtitleSelectedIndex = 0
    this.loaders = new Map()

    this.status = IOLoaderStatus.CONNECTING
    this.retryCount = 0
    this.aborted = false

    await this.fetchMasterPlayList()

    if (!this.loaders.size && this.masterPlaylist) {
      await this.createLoader()
    }

    this.status = IOLoaderStatus.BUFFERING

    return 0
  }

  public async read(buffer: Uint8ArrayInterface, options: {
    mediaType: AVMediaType
  }): Promise<number> {
    if (!options) {
      return errorType.INVALID_ARGUMENT
    }
    const ret = await this.loaders.get(options.mediaType).read(buffer)
    if (ret < 0 && ret !== IOError.AGAIN) {
      this.status = ret === IOError.END ? IOLoaderStatus.COMPLETE : IOLoaderStatus.ERROR
    }
    return ret
  }

  public async seek(timestamp: int64, options: {
    mediaType: AVMediaType
  }) {

    if (!options) {
      return errorType.INVALID_ARGUMENT
    }

    await this.loaders.get(options.mediaType).seek(timestamp)

    if (this.status === IOLoaderStatus.COMPLETE) {
      this.status = IOLoaderStatus.BUFFERING
    }
    return 0
  }

  public async size() {
    return 0n
  }

  public async abort() {
    for (let loader of this.loaders) {
      await loader[1].abort()
    }
    this.aborted = true
    if (this.sleep) {
      this.sleep.stop()
      this.sleep = null
    }
  }

  public async stop() {
    await this.abort()
    this.status = IOLoaderStatus.IDLE
  }

  public getDuration() {
    return this.mainLoader?.getDuration() ?? 0
  }

  public hasVideo() {
    if (this.masterPlaylist) {
      return this.masterPlaylist.variants.length > 0
    }
    return !!this.mainLoader
  }

  public hasAudio() {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      return currentVariant.audio.length > 0
    }
  }

  public hasSubtitle() {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      return currentVariant.subtitles.length > 0
    }
  }

  public getVideoList(): IOLoaderVideoStreamInfo {
    return {
      list: this.masterPlaylist?.variants.map((variant) => {
        return {
          width: variant.resolution?.width ?? 0,
          height: variant.resolution?.height ?? 0,
          frameRate: variant.frameRate ?? 0,
          codec: variant.codecs,
          bandwidth: variant.bandwidth
        }
      }) ?? [],
      selectedIndex: this.mediaPlayListIndex || 0
    }
  }

  public getAudioList(): IOLoaderAudioStreamInfo {
    if (this.masterPlaylist && this.hasAudio()) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      return {
        list: currentVariant.audio.map((item) => {
          return {
            lang: item.language,
            codec: item.name
          }
        }),
        selectedIndex: this.audioSelectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public getSubtitleList(): IOLoaderSubtitleStreamInfo {
    if (this.masterPlaylist && this.hasSubtitle()) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      return {
        list: currentVariant.subtitles.map((item) => {
          return {
            lang: item.language,
            codec: item.name
          }
        }),
        selectedIndex: this.subtitleSelectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public selectVideo(index: number) {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[index]
      if (currentVariant) {
        const mediaUrl = this.buildUrl(currentVariant.uri)
        fetchMediaPlayList(
          mediaUrl,
          this.info,
          this.options
        ).then((list) => {
          this.loaders.get(AVMediaType.AVMEDIA_TYPE_VIDEO).setMediaPlayList(mediaUrl, list)
          this.mediaPlayListIndex = index
        })

        if (currentVariant.audio.length === 1
          && this.loaders.has(AVMediaType.AVMEDIA_TYPE_AUDIO)
          && this.buildUrl(currentVariant.audio[0].uri) !== this.loaders.get(AVMediaType.AVMEDIA_TYPE_AUDIO).getMediaListUrl()
        ) {
          const mediaUrl = this.buildUrl(currentVariant.audio[0].uri)
          fetchMediaPlayList(
            mediaUrl,
            this.info,
            this.options
          ).then((list) => {
            this.loaders.get(AVMediaType.AVMEDIA_TYPE_AUDIO).setMediaPlayList(mediaUrl, list)
          })
        }

        if (currentVariant.subtitles.length === 1
          && this.loaders.has(AVMediaType.AVMEDIA_TYPE_SUBTITLE)
          && this.buildUrl(currentVariant.subtitles[0].uri) !== this.loaders.get(AVMediaType.AVMEDIA_TYPE_SUBTITLE).getMediaListUrl()
        ) {
          const mediaUrl = this.buildUrl(currentVariant.subtitles[0].uri)
          fetchMediaPlayList(
            mediaUrl,
            this.info,
            this.options
          ).then((list) => {
            this.loaders.get(AVMediaType.AVMEDIA_TYPE_SUBTITLE).setMediaPlayList(mediaUrl, list)
          })
        }
      }
    }
  }

  public selectAudio(index: number) {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      if (currentVariant?.audio[index]) {
        const mediaUrl = this.buildUrl(currentVariant.audio[index].uri)
        fetchMediaPlayList(
          mediaUrl,
          this.info,
          this.options
        ).then((list) => {
          this.loaders.get(AVMediaType.AVMEDIA_TYPE_AUDIO).setMediaPlayList(mediaUrl, list)
          this.audioSelectedIndex = index
        })
      }
    }
  }

  public selectSubtitle(index: number) {
    if (this.masterPlaylist) {
      const currentVariant = this.masterPlaylist.variants[this.mediaPlayListIndex]
      if (currentVariant?.subtitles[index]) {
        const mediaUrl = this.buildUrl(currentVariant.subtitles[index].uri)
        fetchMediaPlayList(
          mediaUrl,
          this.info,
          this.options
        ).then((list) => {
          this.loaders.get(AVMediaType.AVMEDIA_TYPE_SUBTITLE).setMediaPlayList(mediaUrl, list)
          this.subtitleSelectedIndex = index
        })
      }
    }
  }

  public getMinBuffer() {
    return this.mainLoader?.getMinBuffer() ?? 0
  }
}
