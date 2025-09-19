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
import IOLoader, { IOLoaderAudioStreamInfo, IOLoaderStatus,
  IOLoaderSubtitleStreamInfo, IOLoaderVideoStreamInfo
} from './IOLoader'
import * as object from 'common/util/object'
import { IOError } from 'common/io/error'
import { Uint8ArrayInterface } from 'common/io/interface'
import * as logger from 'common/util/logger'

import dashParser from 'avprotocol/dash/parser'
import FetchIOLoader, { FetchInfo } from './FetchIOLoader'
import { MPDMediaList, Segment } from 'avprotocol/dash/type'
import getTimestamp from 'common/function/getTimestamp'
import * as errorType from 'avutil/error'
import { Data } from 'common/types/type'
import { AVMediaType } from 'avutil/codec'

const FETCHED_HISTORY_LIST_MAX = 100

interface Resource {
  type: AVMediaType
  fetchedMap: Map<string, boolean>
  fetchedHistoryListMax: number
  fetchedHistoryList: string[]
  loader: FetchIOLoader
  segmentIndex: number
  currentUri: string
  selectedIndex: number
  segments: { url: string, pending?: boolean, duration?: number}[]
  initSegmentPadding: string
  initedSegment: string
  sleep: Sleep

  lastPendingSegmentFetchTs: number
  lastPendingSegmentDuration: number
}

export default class DashIOLoader extends IOLoader {

  private info: FetchInfo

  private mediaPlayList: MPDMediaList

  private fetchMediaPlayListPromise: Promise<void>

  private minBuffer: number

  private audioResource: Resource
  private videoResource: Resource
  private subtitleResource: Resource

  private aborted: boolean
  private signal: AbortController

  private createResource(type: AVMediaType): Resource {
    return {
      type,
      fetchedMap: new Map(),
      fetchedHistoryListMax: FETCHED_HISTORY_LIST_MAX,
      fetchedHistoryList: [],
      loader: null,
      segmentIndex: 0,
      currentUri: '',
      selectedIndex: 0,
      segments: [],
      initSegmentPadding: '',
      initedSegment: '',
      sleep: null,

      lastPendingSegmentFetchTs: 0,
      lastPendingSegmentDuration: 0
    }
  }

  private addHistory(resource: Resource, segments: Segment[], index: number) {
    resource.fetchedMap.clear()
    resource.fetchedHistoryList.length = 0
    for (let i = 0; i < index; i++) {
      resource.fetchedMap.set(segments[i].url, true)
      resource.fetchedHistoryList.push(segments[i].url)
    }
    while (resource.fetchedHistoryList.length >= resource.fetchedHistoryListMax) {
      resource.fetchedMap.delete(resource.fetchedHistoryList.shift())
    }
  }

  private async fetchMediaPlayList(resolve?: () => void) {
    if (!resolve) {
      if (this.fetchMediaPlayListPromise) {
        return
      }
      this.fetchMediaPlayListPromise = new Promise((r) => {
        resolve = r
      })
    }

    const params: Data = {
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

    if (this.info.httpOptions?.credentials) {
      params.credentials = this.info.httpOptions.credentials
    }

    if (this.info.httpOptions?.referrerPolicy) {
      params.referrerPolicy = this.info.httpOptions.referrerPolicy
    }

    try {
      if (typeof AbortController === 'function') {
        this.signal = new AbortController()
      }
      const res = await fetch(this.info.url, {
        ...params,
        signal: this.signal?.signal
      })
      this.signal = null
      const text = await res.text()
      this.mediaPlayList = dashParser(text, this.info.url)
      this.minBuffer = this.mediaPlayList.minBufferTime

      if (this.mediaPlayList.type === 'vod') {
        this.options.isLive = false
      }
      else {
        this.options.isLive = true
      }

      const addIgnoreSegment = (resource: Resource, segments: Segment[], minBuffer: number) => {
        let index = 0
        let cache = 0
        for (let i = segments.length - 2; i >= 0; i--) {
          if (segments[i].pending !== true) {
            cache += segments[i].segmentDuration
            if (cache >= minBuffer) {
              index = i
              break
            }
          }
        }
        resource.lastPendingSegmentFetchTs = this.mediaPlayList.maxSegmentDuration
        resource.lastPendingSegmentDuration = this.mediaPlayList.maxSegmentDuration
        resource.fetchedHistoryListMax = Math.max(resource.fetchedHistoryListMax, segments.length + 1)
        this.addHistory(resource, segments, index)
      }

      if (this.mediaPlayList.mediaList.audio.length) {
        if (this.options.preferAudioCodec || this.options.preferAudioLang) {
          let codecGot = false
          let langPrefer = false
          let hasPreferCodec = this.mediaPlayList.mediaList.audio.some((v) => {
            return v.codecs && v.codecs.indexOf(this.options.preferAudioCodec) >= 0
          })
          this.mediaPlayList.mediaList.audio.forEach((v, i) => {
            if (this.options.preferAudioCodec
              && hasPreferCodec
              && v.codecs
              && v.codecs.indexOf(this.options.preferAudioCodec) === -1
            ) {
              return
            }
            if (!codecGot) {
              this.audioResource.selectedIndex = i
              codecGot = true
            }
            if (v.lang
              && this.options.preferAudioLang
              && v.lang.indexOf(this.options.preferAudioLang) >= 0
              && !langPrefer
            ) {
              this.audioResource.selectedIndex = i
              if (v.lang === this.options.preferAudioLang) {
                langPrefer = true
              }
            }
          })
        }

        const media = this.mediaPlayList.mediaList.audio[this.audioResource.selectedIndex]
        if (media.file) {
          this.audioResource.segments = [{
            url: media.file
          }]
        }
        else {
          if (this.options.isLive && this.audioResource.initedSegment === media.initSegment) {
            this.audioResource.segments = media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            })
            this.audioResource.lastPendingSegmentFetchTs = this.mediaPlayList.timestamp
            this.audioResource.lastPendingSegmentDuration = this.mediaPlayList.maxSegmentDuration
          }
          else {
            if (this.options.isLive) {
              addIgnoreSegment(this.audioResource, media.mediaSegments, this.minBuffer)
            }
            this.audioResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            }))
            this.audioResource.initedSegment = media.initSegment
          }
        }
      }
      if (this.mediaPlayList.mediaList.video.length) {
        if (this.options.preferResolution || this.options.preferVideoCodec) {
          let width = 1
          let height = 1
          if (this.options.preferResolution) {
            const res = this.options.preferResolution.split('*')
            width = +res[0] || 1
            height = +res[1] || 1
          }
          let codecGot = false
          let resolutionDiff = Infinity
          let hasPreferCodec = this.mediaPlayList.mediaList.video.some((v) => {
            return v.codecs && v.codecs.indexOf(this.options.preferVideoCodec) >= 0
          })
          this.mediaPlayList.mediaList.video.forEach((v, i) => {
            if (this.options.preferVideoCodec
              && hasPreferCodec
              && v.codecs
              && v.codecs.indexOf(this.options.preferVideoCodec) === -1
            ) {
              return
            }
            if (!codecGot) {
              this.videoResource.selectedIndex = i
              codecGot = true
            }

            if (v.width && v.height && this.options.preferResolution) {
              const vWidth = width === 1 ? 1 : v.width
              const vHeight = height === 1 ? 1 : v.height
              if (Math.abs(vWidth * vHeight - width * height) < resolutionDiff) {
                resolutionDiff = Math.abs(vWidth * vHeight - width * height)
                this.videoResource.selectedIndex = i
              }
            }
          })
        }
        const media = this.mediaPlayList.mediaList.video[this.videoResource.selectedIndex]
        if (media.file) {
          this.videoResource.segments = [{
            url: media.file
          }]
        }
        else {
          if (this.options.isLive && this.videoResource.initedSegment === media.initSegment) {
            this.videoResource.segments = media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            })
            this.videoResource.lastPendingSegmentFetchTs = this.mediaPlayList.maxSegmentDuration
            this.videoResource.lastPendingSegmentDuration = this.mediaPlayList.maxSegmentDuration
          }
          else {
            if (this.options.isLive) {
              addIgnoreSegment(this.videoResource, media.mediaSegments, this.minBuffer)
            }
            this.videoResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            }))
            this.videoResource.initedSegment = media.initSegment
          }
        }
      }
      if (this.mediaPlayList.mediaList.subtitle.length) {
        if (this.options.preferSubtitleCodec || this.options.preferSubtitleLang) {
          let codecGot = false
          let langPrefer = false
          let hasPreferCodec = this.mediaPlayList.mediaList.subtitle.some((v) => {
            return v.codecs && v.codecs.indexOf(this.options.preferSubtitleCodec) >= 0
          })
          this.mediaPlayList.mediaList.subtitle.forEach((v, i) => {
            if (this.options.preferSubtitleCodec
              && hasPreferCodec
              && v.codecs
              && v.codecs.indexOf(this.options.preferSubtitleCodec) === -1
            ) {
              return
            }
            if (!codecGot) {
              this.subtitleResource.selectedIndex = i
              codecGot = true
            }
            if (v.lang
              && this.options.preferSubtitleLang
              && v.lang.indexOf(this.options.preferSubtitleLang) >= 0
              && !langPrefer
            ) {
              this.subtitleResource.selectedIndex = i
              if (v.lang === this.options.preferSubtitleLang) {
                langPrefer = true
              }
            }
          })
        }
        const media = this.mediaPlayList.mediaList.subtitle[this.subtitleResource.selectedIndex]
        if (media.file) {
          this.subtitleResource.segments = [{
            url: media.file
          }]
        }
        else {
          if (this.options.isLive && this.subtitleResource.initedSegment === media.initSegment) {
            this.subtitleResource.segments = media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            })
            this.subtitleResource.lastPendingSegmentFetchTs = this.mediaPlayList.maxSegmentDuration
            this.subtitleResource.lastPendingSegmentDuration = this.mediaPlayList.maxSegmentDuration
          }
          else {
            if (this.options.isLive) {
              addIgnoreSegment(this.subtitleResource, media.mediaSegments, this.minBuffer)
            }
            this.subtitleResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
              return {
                url: s.url,
                pending: s.pending,
                duration: s.segmentDuration
              }
            }))
            this.subtitleResource.initedSegment = media.initSegment
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
      if (this.aborted) {
        this.status = IOLoaderStatus.ERROR
        resolve()
        return
      }
      if (this.retryCount < this.options.retryCount) {
        this.retryCount++

        logger.error(`failed fetch mpd file ${error}, retry(${this.retryCount}/3)`)

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

  public async open(info: FetchInfo) {

    if (this.status === IOLoaderStatus.BUFFERING) {
      return 0
    }

    if (this.status !== IOLoaderStatus.IDLE) {
      return errorType.INVALID_OPERATE
    }

    this.info = info

    this.videoResource = this.createResource(AVMediaType.AVMEDIA_TYPE_VIDEO)
    this.audioResource = this.createResource(AVMediaType.AVMEDIA_TYPE_AUDIO)
    this.subtitleResource = this.createResource(AVMediaType.AVMEDIA_TYPE_SUBTITLE)

    this.status = IOLoaderStatus.CONNECTING
    this.retryCount = 0
    this.aborted = false

    await this.fetchMediaPlayList()

    return 0
  }

  private async readResource(buffer: Uint8ArrayInterface, resource: Resource) {
    let ret = 0

    if (resource.loader) {
      ret = await resource.loader.read(buffer)
      if (ret !== IOError.END || this.aborted) {
        return ret
      }
      else {
        if (this.options.isLive) {
          resource.fetchedMap.set(resource.currentUri, true)
          if (resource.fetchedHistoryList.length === resource.fetchedHistoryListMax) {
            resource.fetchedMap.delete(resource.fetchedHistoryList.shift())
          }
          resource.fetchedHistoryList.push(resource.currentUri)
        }
        else {
          resource.segmentIndex++
          if (resource.segmentIndex >= resource.segments.length) {
            return IOError.END
          }
        }
        resource.loader = null
      }
    }

    if (this.options.isLive) {
      const segments = resource.segments.filter((s) => {
        return !resource.fetchedMap.get(s.url)
      })

      if (!segments.length) {
        if (this.mediaPlayList.isEnd) {
          return IOError.END
        }

        const wait = ((this.mediaPlayList.duration || this.mediaPlayList.minimumUpdatePeriod)
          - (getTimestamp() - this.mediaPlayList.timestamp) / 1000)
        if (wait > 0) {
          resource.sleep = new Sleep(wait)
          await resource.sleep
          resource.sleep = null
          if (this.aborted) {
            return IOError.END
          }
        }
        if (this.fetchMediaPlayListPromise) {
          await this.fetchMediaPlayListPromise
          if (this.status === IOLoaderStatus.ERROR || this.aborted) {
            return IOError.END
          }
        }
        else {
          await this.fetchMediaPlayList()
          if (this.aborted) {
            return IOError.END
          }
        }
        return this.readResource(buffer, resource)
      }

      resource.currentUri = segments[0].url
      if (this.options.isLive && segments[0].pending) {
        if (resource.lastPendingSegmentFetchTs) {
          const wait = resource.lastPendingSegmentDuration
            - ((getTimestamp() - resource.lastPendingSegmentFetchTs) / 1000)
          if (wait > 0) {
            resource.sleep = new Sleep(wait)
            await resource.sleep
            resource.sleep = null
            if (this.aborted) {
              return IOError.END
            }
          }
        }
        resource.lastPendingSegmentFetchTs = getTimestamp()
        resource.lastPendingSegmentDuration = segments[0].duration || this.mediaPlayList.maxSegmentDuration
      }

      resource.loader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))

      await resource.loader.open(
        object.extend({}, this.info, {
          url: resource.currentUri
        }),
        {
          from: 0,
          to: -1
        }
      )
      return resource.loader.read(buffer)
    }
    else {
      resource.loader = new FetchIOLoader(object.extend({}, this.options, { disableSegment: true, loop: false }))
      if (resource.initSegmentPadding) {
        await resource.loader.open(
          object.extend({}, this.info, {
            url: resource.initSegmentPadding
          }),
          {
            from: 0,
            to: -1
          }
        )
        resource.initSegmentPadding = null
        resource.segmentIndex--
      }
      else {
        await resource.loader.open(
          object.extend({}, this.info, {
            url: resource.segments[resource.segmentIndex].url
          }),
          {
            from: 0,
            to: -1
          }
        )
      }
      return resource.loader.read(buffer)
    }
  }

  public async read(buffer: Uint8ArrayInterface, options: {
    mediaType: AVMediaType
  }): Promise<number> {
    if (options.mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      return this.readResource(buffer, this.audioResource)
    }
    else if (options.mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      return this.readResource(buffer, this.videoResource)
    }
    else if (options.mediaType === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
      return this.readResource(buffer, this.subtitleResource)
    }
    return errorType.INVALID_ARGUMENT
  }

  private async seekResource(timestamp: int64, resource: Resource) {

    let currentSegment = ''

    if (resource.loader) {
      currentSegment = resource.loader.getUrl()
      await resource.loader.abort()
      resource.loader = null
    }

    let seekTime = static_cast<int32>(timestamp)

    if (resource.segments) {
      let index = 0
      const mediaList = resource.type === AVMediaType.AVMEDIA_TYPE_AUDIO
        ? this.mediaPlayList.mediaList.audio
        : (resource.type === AVMediaType.AVMEDIA_TYPE_VIDEO
          ? this.mediaPlayList.mediaList.video
          : this.mediaPlayList.mediaList.subtitle
        )
      const segmentList = mediaList[resource.selectedIndex].mediaSegments
      if (segmentList?.length) {
        index = -1
        for (let i = 0; i < segmentList.length; i++) {
          if (seekTime >= segmentList[i].start * 1000 && seekTime < segmentList[i].end * 1000) {
            index = i
            break
          }
        }
        if (index === -1) {
          index = segmentList.length - 1
        }
      }
      resource.segmentIndex = index + (mediaList[resource.selectedIndex].initSegment ? 1 : 0)
      let initSegment = ''
      if (resource.type === AVMediaType.AVMEDIA_TYPE_VIDEO) {
        initSegment = this.mediaPlayList.mediaList.video[resource.selectedIndex].initSegment
      }
      else if (resource.type === AVMediaType.AVMEDIA_TYPE_AUDIO) {
        initSegment = this.mediaPlayList.mediaList.audio[resource.selectedIndex].initSegment
      }
      else if (resource.type === AVMediaType.AVMEDIA_TYPE_SUBTITLE) {
        initSegment = this.mediaPlayList.mediaList.subtitle[resource.selectedIndex].initSegment
      }
      if (initSegment && initSegment === currentSegment) {
        resource.initSegmentPadding = initSegment
      }
    }
  }

  public async seek(timestamp: int64, options: {
    mediaType: AVMediaType
  }) {

    if (options.mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO && this.audioResource.loader) {
      await this.seekResource(timestamp, this.audioResource)
    }
    if (options.mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO && this.videoResource.loader) {
      await this.seekResource(timestamp, this.videoResource)
    }
    if (options.mediaType === AVMediaType.AVMEDIA_TYPE_SUBTITLE && this.subtitleResource.loader) {
      await this.seekResource(timestamp, this.subtitleResource)
    }

    if (this.status === IOLoaderStatus.COMPLETE) {
      this.status = IOLoaderStatus.BUFFERING
    }
    this.aborted = false
    return 0
  }

  public async size() {
    return 0n
  }

  private abortSleep() {
    this.aborted = true
    if (this.videoResource.loader) {
      this.videoResource.loader.abortSleep()
    }
    if (this.videoResource.sleep) {
      this.videoResource.sleep.stop()
      this.videoResource.sleep = null
    }
    if (this.audioResource.loader) {
      this.audioResource.loader.abortSleep()
    }
    if (this.audioResource.sleep) {
      this.audioResource.sleep.stop()
      this.audioResource.sleep = null
    }
    if (this.subtitleResource.loader) {
      this.subtitleResource.loader.abortSleep()
    }
    if (this.subtitleResource.sleep) {
      this.subtitleResource.sleep.stop()
      this.subtitleResource.sleep = null
    }
  }

  public async abort() {
    this.abortSleep()
    if (this.signal) {
      this.signal.abort()
    }
    if (this.videoResource.loader) {
      await this.videoResource.loader.abort()
      this.videoResource.loader = null
    }
    if (this.audioResource.loader) {
      await this.audioResource.loader.abort()
      this.audioResource.loader = null
    }
    if (this.subtitleResource.loader) {
      await this.subtitleResource.loader.abort()
      this.subtitleResource.loader = null
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

  public getVideoList(): IOLoaderVideoStreamInfo {
    if (this.hasVideo()) {
      return {
        list: this.mediaPlayList.mediaList.video.map((media) => {
          return {
            width: media.width,
            height: media.height,
            frameRate: media.frameRate,
            codec: media.codecs,
            bandwidth: media.bandwidth
          }
        }),
        selectedIndex: this.videoResource.selectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public getAudioList(): IOLoaderAudioStreamInfo {
    if (this.hasAudio()) {
      return {
        list: this.mediaPlayList.mediaList.audio.map((media) => {
          return {
            lang: media.lang,
            codec: media.codecs,
            bandwidth: media.bandwidth
          }
        }),
        selectedIndex: this.audioResource.selectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public getSubtitleList(): IOLoaderSubtitleStreamInfo {
    if (this.hasSubtitle()) {
      return {
        list: this.mediaPlayList.mediaList.subtitle.map((media) => {
          return {
            lang: media.lang,
            codec: media.codecs
          }
        }),
        selectedIndex: this.subtitleResource.selectedIndex
      }
    }
    return {
      list: [],
      selectedIndex: 0
    }
  }

  public selectVideo(index: number) {
    if (index !== this.videoResource.selectedIndex
      && this.hasVideo()
      && index >= 0
      && index < this.mediaPlayList.mediaList.video.length
    ) {
      this.videoResource.selectedIndex = index
      const media = this.mediaPlayList.mediaList.video[this.videoResource.selectedIndex]
      if (media.file) {
        this.videoResource.segments = [{
          url: media.file
        }]
      }
      else {
        if (this.options.isLive) {
          let segmentIndex = this.videoResource.segmentIndex
          this.videoResource.segments.find((s, i) => {
            if (s.url === this.videoResource.currentUri) {
              segmentIndex = i
              return true
            }
          })
          this.addHistory(this.videoResource, media.mediaSegments, segmentIndex + 1)
        }
        this.videoResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
          return {
            url: s.url,
            pending: s.pending,
            duration: s.segmentDuration
          }
        }))
        this.videoResource.initSegmentPadding = media.initSegment
      }
      if (media.mediaSegments
        && (this.videoResource.segmentIndex - (media.initSegment ? 1 : 0)) < media.mediaSegments.length - 1
      ) {
        return media.mediaSegments[this.videoResource.segmentIndex + (media.initSegment ? 0 : 1)].start
      }
    }
    return -1
  }

  public selectAudio(index: number) {
    if (index !== this.audioResource.selectedIndex
      && this.hasAudio()
      && index >= 0
      && index < this.mediaPlayList.mediaList.audio.length
    ) {
      this.audioResource.selectedIndex = index
      const media = this.mediaPlayList.mediaList.audio[this.audioResource.selectedIndex]
      if (media.file) {
        this.audioResource.segments = [{
          url: media.file
        }]
      }
      else {
        if (this.options.isLive) {
          let segmentIndex = this.audioResource.segmentIndex
          this.audioResource.segments.find((s, i) => {
            if (s.url === this.audioResource.currentUri) {
              segmentIndex = i
              return true
            }
          })
          this.addHistory(this.audioResource, media.mediaSegments, segmentIndex + 1)
        }
        this.audioResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
          return {
            url: s.url,
            pending: s.pending,
            duration: s.segmentDuration
          }
        }))
        this.audioResource.initSegmentPadding = media.initSegment
      }
      if (media.mediaSegments
        && (this.audioResource.segmentIndex - (media.initSegment ? 1 : 0)) < media.mediaSegments.length - 1
      ) {
        return media.mediaSegments[this.audioResource.segmentIndex + (media.initSegment ? 0 : 1)].start
      }
    }
    return -1
  }

  public selectSubtitle(index: number) {
    if (index !== this.subtitleResource.selectedIndex
      && this.hasSubtitle()
      && index >= 0
      && index < this.mediaPlayList.mediaList.subtitle.length
    ) {
      this.subtitleResource.selectedIndex = index
      const media = this.mediaPlayList.mediaList.subtitle[this.subtitleResource.selectedIndex]
      if (media.file) {
        this.subtitleResource.segments = [{
          url: media.file
        }]
      }
      else {
        if (this.options.isLive) {
          let segmentIndex = this.subtitleResource.segmentIndex
          this.subtitleResource.segments.find((s, i) => {
            if (s.url === this.subtitleResource.currentUri) {
              segmentIndex = i
              return true
            }
          })
          this.addHistory(this.subtitleResource, media.mediaSegments, segmentIndex + 1)
        }
        this.subtitleResource.segments = [{url: media.initSegment}].concat(media.mediaSegments.map((s) => {
          return {
            url: s.url,
            pending: s.pending,
            duration: s.segmentDuration
          }
        }))
        this.subtitleResource.initSegmentPadding = media.initSegment
      }
      if (media.mediaSegments
        && (this.subtitleResource.segmentIndex - (media.initSegment ? 1 : 0)) < media.mediaSegments.length - 1
      ) {
        return media.mediaSegments[this.subtitleResource.segmentIndex + (media.initSegment ? 0 : 1)].start
      }
    }
    return -1
  }

  public getCurrentProtection(mediaType: AVMediaType) {
    if (mediaType === AVMediaType.AVMEDIA_TYPE_AUDIO) {
      const media = this.mediaPlayList.mediaList.audio[this.audioResource.selectedIndex]
      return media.protection
    }
    else if (mediaType === AVMediaType.AVMEDIA_TYPE_VIDEO) {
      const media = this.mediaPlayList.mediaList.video[this.videoResource.selectedIndex]
      return media.protection
    }
  }

  public getMinBuffer() {
    return this.minBuffer
  }
}
