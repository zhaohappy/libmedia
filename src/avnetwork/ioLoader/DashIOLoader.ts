/*
 * libmedia dash loader
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
import IOLoader, { IOLoaderStatus, Range } from './IOLoader'
import * as object from 'common/util/object'
import { IOError } from 'common/io/error'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as logger from 'common/util/logger'

import dashParser from 'avprotocol/dash/parser'
import FetchIOLoader from './FetchIOLoader'
import { MPDMediaList } from 'avprotocol/dash/type'
import getTimestamp from 'common/function/getTimestamp'

const FETCHED_HISTORY_LIST_MAX = 10

export interface FetchInfo {
  url: string
  headers?: Object
  withCredentials?: boolean
  referrerPolicy?: string
}

export default class DashIOLoader extends IOLoader {

  private info: FetchInfo

  private range: Range

  private mediaPlayList: MPDMediaList

  private fetchedMap: Map<string, boolean>

  private fetchedHistoryList: string[]

  private audioLoader: FetchIOLoader

  private videoLoader: FetchIOLoader

  private audioSegmentIndex: number
  private videoSegmentIndex: number
  private audioCurrentUri: string
  private videoCurrentUri: string

  private audioSelectedIndex: number
  private videoSelectedIndex: number

  private audioSegments: string[]
  private videoSegments: string[]

  private audioInitSegmentPadding: string
  private videoInitSegmentPadding: string
  private subtitleInitSegmentPadding: string

  private audioInitedSegment: string
  private videoInitedSegment: string

  private fetchMediaPlayListPromise: Promise<void>

  private minBuffer: number

  private async fetchMediaPlayList(resolve?: () => void) {
    if (!resolve) {
      if (this.fetchMediaPlayListPromise) {
        return
      }
      this.fetchMediaPlayListPromise = new Promise((r) => {
        resolve = r
      })
    }

    const params: Partial<any> = {
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

    if (this.info.withCredentials) {
      params.credentials = 'include'
    }

    if (this.info.referrerPolicy) {
      params.referrerPolicy = this.info.referrerPolicy
    }

    try {
      const res = await fetch(this.info.url, params)
      const text = await res.text()
      this.mediaPlayList = dashParser(text, this.info.url)
      this.minBuffer = this.mediaPlayList.minBufferTime

      if (this.options.isLive) {
        const needSegment = this.mediaPlayList.minBufferTime / this.mediaPlayList.maxSegmentDuration
        const segmentCount = Math.max(
          this.mediaPlayList.mediaList.audio && this.mediaPlayList.mediaList.audio[0]?.mediaSegments.length || 0,
          this.mediaPlayList.mediaList.video && this.mediaPlayList.mediaList.video[0]?.mediaSegments.length || 0
        )
        if (segmentCount < needSegment) {
          await new Sleep((needSegment - segmentCount) * this.mediaPlayList.maxSegmentDuration)

          logger.warn(`wait for min buffer time, buffer: ${segmentCount * this.mediaPlayList.maxSegmentDuration}, need: ${
            needSegment *  this.mediaPlayList.maxSegmentDuration
          }`)

          return this.fetchMediaPlayList(resolve)
        }
      }

      if (this.mediaPlayList.type === 'vod') {
        this.options.isLive = false
      }
      else {
        this.options.isLive = true
      }

      if (this.mediaPlayList.mediaList.audio.length) {
        const media = this.mediaPlayList.mediaList.audio[this.audioSelectedIndex]
        if (media.file) {
          this.audioSegments = [media.file]
        }
        else {
          if (this.options.isLive && this.audioInitedSegment === media.initSegment) {
            this.audioSegments = media.mediaSegments.map((s) => s.url)
          }
          else {
            this.audioSegments = [media.initSegment].concat(media.mediaSegments.map((s) => s.url))
            this.audioInitedSegment = media.initSegment
          }
        }
      }
      if (this.mediaPlayList.mediaList.video.length) {
        this.videoSelectedIndex = this.mediaPlayList.mediaList.video.length - 1
        const media = this.mediaPlayList.mediaList.video[this.videoSelectedIndex]
        if (media.file) {
          this.videoSegments = [media.file]
        }
        else {
          if (this.options.isLive && this.videoInitedSegment === media.initSegment) {
            this.videoSegments = media.mediaSegments.map((s) => s.url)
          }
          else {
            this.videoSegments = [media.initSegment].concat(media.mediaSegments.map((s) => s.url))
            this.videoInitedSegment = media.initSegment
          }
        }
      }

      resolve()
      this.fetchMediaPlayListPromise = null
      this.status = IOLoaderStatus.BUFFERING
      this.retryCount = 0

      return this.mediaPlayList
    }
    catch (error) {
      if (this.retryCount < this.options.retryCount) {
        this.retryCount++

        logger.error(`failed fetch mpd file, retry(${this.retryCount}/3)`)

        await new Sleep(this.status === IOLoaderStatus.BUFFERING ? this.options.retryInterval : 5)
        return this.fetchMediaPlayList(resolve)
      }
      else {
        this.status = IOLoaderStatus.ERROR
        resolve()
        logger.fatal(`DashLoader: exception, fetch slice error, error: ${error.message}`)
      }
    }
  }

  public async open(info: FetchInfo, range: Range) {

    if (this.status !== IOLoaderStatus.IDLE) {
      return
    }

    this.info = info
    this.range = range

    if (!this.range.to) {
      this.range.to = -1
    }

    this.range.from = Math.max(this.range.from, 0)

    this.audioSegmentIndex = 0
    this.videoSegmentIndex = 0

    this.audioSelectedIndex = 0
    this.videoSelectedIndex = 0

    this.fetchedMap = new Map()
    this.fetchedHistoryList = []

    this.status = IOLoaderStatus.CONNECTING
    this.retryCount = 0

    await this.fetchMediaPlayList()
  }

  private async readAudio(buffer: Uint8ArrayInterface) {
    let ret = 0

    if (this.audioLoader) {
      ret = await this.audioLoader.read(buffer)
      if (ret !== IOError.END) {
        return ret
      }
      else {
        if (this.options.isLive) {
          this.fetchedMap.set(this.audioCurrentUri, true)
          if (this.fetchedHistoryList.length === FETCHED_HISTORY_LIST_MAX) {
            this.fetchedMap.delete(this.fetchedHistoryList.shift())
          }
          this.fetchedHistoryList.push(this.audioCurrentUri)
        }
        else {
          this.audioSegmentIndex++
          if (this.audioSegmentIndex >= this.audioSegments.length) {
            return IOError.END
          }
        }
        this.audioLoader = null
      }
    }

    if (this.options.isLive) {
      const segments = this.audioSegments.filter((url) => {
        return !this.fetchedMap.get(url)
      })

      if (!segments.length) {
        if (this.mediaPlayList.isEnd) {
          return IOError.END
        }

        const wait = ((this.mediaPlayList.duration || this.mediaPlayList.minimumUpdatePeriod)
          - (getTimestamp() - this.mediaPlayList.timestamp) / 1000)
        if (wait > 0) {
          await new Sleep(wait)
        }
        if (this.fetchMediaPlayListPromise) {
          await this.fetchMediaPlayListPromise
          if (this.status === IOLoaderStatus.ERROR) {
            return IOError.END
          }
        }
        else {
          await this.fetchMediaPlayList()
        }
        return this.readAudio(buffer)
      }

      this.audioCurrentUri = segments[0]

      this.audioLoader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      await this.audioLoader.open(
        {
          url: this.audioCurrentUri
        },
        {
          from: 0,
          to: -1
        }
      )
      return this.audioLoader.read(buffer)
    }
    else {
      this.audioLoader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      if (this.audioInitSegmentPadding) {
        await this.audioLoader.open(
          {
            url: this.audioInitSegmentPadding
          },
          {
            from: 0,
            to: -1
          }
        )
        this.audioInitSegmentPadding = null
        this.audioSegmentIndex--
      }
      else {
        await this.audioLoader.open(
          {
            url: this.audioSegments[this.audioSegmentIndex]
          },
          {
            from: 0,
            to: -1
          }
        )
      }
      return this.audioLoader.read(buffer)
    }
  }

  private async readVideo(buffer: Uint8ArrayInterface) {
    let ret = 0

    if (this.videoLoader) {
      ret = await this.videoLoader.read(buffer)
      if (ret !== IOError.END) {
        return ret
      }
      else {
        if (this.options.isLive) {
          this.fetchedMap.set(this.videoCurrentUri, true)
          if (this.fetchedHistoryList.length === FETCHED_HISTORY_LIST_MAX) {
            this.fetchedMap.delete(this.fetchedHistoryList.shift())
          }
          this.fetchedHistoryList.push(this.videoCurrentUri)
        }
        else {
          this.videoSegmentIndex++
          if (this.videoSegmentIndex >= this.videoSegments.length) {
            return IOError.END
          }
        }
        this.videoLoader = null
      }
    }

    if (this.options.isLive) {
      const segments = this.videoSegments.filter((url) => {
        return !this.fetchedMap.get(url)
      })

      if (!segments.length) {
        if (this.mediaPlayList.isEnd) {
          return IOError.END
        }

        const wait = ((this.mediaPlayList.duration || this.mediaPlayList.minimumUpdatePeriod)
          - (getTimestamp() - this.mediaPlayList.timestamp) / 1000)
        if (wait > 0) {
          await new Sleep(Math.max(wait, 2))
        }
        if (this.fetchMediaPlayListPromise) {
          await this.fetchMediaPlayListPromise
          if (this.status === IOLoaderStatus.ERROR) {
            return IOError.END
          }
        }
        else {
          await this.fetchMediaPlayList()
        }
        return this.readVideo(buffer)
      }

      this.videoCurrentUri = segments[0]

      this.videoLoader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      await this.videoLoader.open(
        {
          url: this.videoCurrentUri
        },
        {
          from: 0,
          to: -1
        }
      )
      return this.videoLoader.read(buffer)
    }
    else {
      this.videoLoader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))
      if (this.videoInitSegmentPadding) {
        await this.videoLoader.open(
          {
            url: this.videoInitSegmentPadding
          },
          {
            from: 0,
            to: -1
          }
        )
        this.videoInitSegmentPadding = null
        this.videoSegmentIndex--
      }
      else {
        await this.videoLoader.open(
          {
            url: this.videoSegments[this.videoSegmentIndex]
          },
          {
            from: 0,
            to: -1
          }
        )
      }
      return this.videoLoader.read(buffer)
    }
  }

  public async read(buffer: Uint8ArrayInterface, options: {
    type: 'audio' | 'video'
  }): Promise<number> {
    if (options.type === 'audio') {
      return this.readAudio(buffer)
    }
    else {
      return this.readVideo(buffer)
    }
  }

  public async seek(timestamp: int64, options: {
    type: 'audio' | 'video'
  }) {

    if (this.audioLoader && options.type === 'audio') {
      await this.audioLoader.abort()
      this.audioLoader = null
    }
    if (this.videoLoader && options.type === 'video') {
      await this.videoLoader.abort()
      this.videoLoader = null
    }

    let seekTime = Number(timestamp)

    if (this.audioSegments && options.type === 'audio') {
      let index = 0
      const segmentList = this.mediaPlayList.mediaList.audio[this.audioSelectedIndex].mediaSegments
      if (segmentList?.length) {
        for (let i = 0; i < segmentList.length; i++) {
          if (seekTime >= segmentList[i].start * 1000 && seekTime < segmentList[i].end * 1000) {
            index = i
            break
          }
        }
      }
      this.audioSegmentIndex = index + (this.mediaPlayList.mediaList.audio[this.audioSelectedIndex].initSegment ? 1 : 0)
    }

    if (this.videoSegments && options.type === 'video') {
      let index = 0
      const segmentList = this.mediaPlayList.mediaList.video[this.videoSelectedIndex].mediaSegments
      if (segmentList?.length) {
        for (let i = 0; i < segmentList.length; i++) {
          if (seekTime >= segmentList[i].start * 1000 && seekTime < segmentList[i].end * 1000) {
            index = i
            break
          }
        }
      }
      this.videoSegmentIndex = index + (this.mediaPlayList.mediaList.video[this.videoSelectedIndex].initSegment ? 1 : 0)
    }
    if (this.status === IOLoaderStatus.COMPLETE) {
      this.status = IOLoaderStatus.BUFFERING
    }
  }

  public async size() {
    return 0n
  }

  public async abort() {
    if (this.videoLoader) {
      await this.videoLoader.abort()
      this.videoLoader = null
    }
    if (this.audioLoader) {
      await this.audioLoader.abort()
      this.audioLoader = null
    }
  }

  public async stop() {
    await this.abort()
    this.status = IOLoaderStatus.IDLE
  }

  public getDuration() {
    return this.mediaPlayList.duration
  }

  public hasVideo() {
    return this.mediaPlayList?.mediaList.video.length > 0
  }

  public hasAudio() {
    return this.mediaPlayList?.mediaList.audio.length > 0
  }

  public hasSubtitle() {
    return this.mediaPlayList?.mediaList.subtitle.length > 0
  }

  public getVideoList() {
    if (this.hasVideo()) {
      return {
        list: this.mediaPlayList.mediaList.video.map((media) => {
          return {
            width: media.width,
            height: media.height,
            frameRate: media.frameRate
          }
        }),
        selectedIndex: this.videoSelectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public getAudioList() {
    if (this.hasAudio()) {
      return {
        list: this.mediaPlayList.mediaList.audio.map((media) => {
          return {
            lang: media.lang
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

  public getSubtitleList() {
    if (this.hasSubtitle()) {
      return {
        list: this.mediaPlayList.mediaList.subtitle.map((media) => {
          return {
            lang: media.lang,
            codecs: media.codecs
          }
        }),
        selectedIndex: 0
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public selectVideo(index: number) {
    if (index !== this.videoSelectedIndex
      && this.hasVideo()
      && index >= 0
      && index < this.mediaPlayList.mediaList.video.length
    ) {
      this.videoSelectedIndex = index
      const media = this.mediaPlayList.mediaList.video[this.videoSelectedIndex]
      if (media.file) {
        this.videoSegments = [media.file]
      }
      else {
        this.videoSegments = [media.initSegment].concat(media.mediaSegments.map((s) => s.url))
        this.videoInitSegmentPadding = media.initSegment
      }
    }
  }

  public selectAudio(index: number) {
    if (index !== this.audioSelectedIndex
      && this.hasAudio()
      && index >= 0
      && index < this.mediaPlayList.mediaList.audio.length
    ) {
      this.audioSelectedIndex = index
      const media = this.mediaPlayList.mediaList.audio[this.audioSelectedIndex]
      if (media.file) {
        this.audioSegments = [media.file]
      }
      else {
        this.audioSegments = [media.initSegment].concat(media.mediaSegments.map((s) => s.url))
        this.audioInitSegmentPadding = media.initSegment
      }
    }
  }

  public selectSubtitle(index: number) {

  }

  public getMinBuffer() {
    return this.minBuffer
  }
}
