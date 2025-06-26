/**
 * from https://github.com/bytedance/xgplayer/blob/main/packages/xgplayer-dash/src/m4s/mpd.js
 * MIT license 
 */

import xml2Json from 'common/util/xml2Json'
import { MPD, MPDMediaList, Period, Protection, SegmentTemplate } from './type'
import { Data } from 'common/types/type'
import * as is from 'common/util/is'
import * as object from 'common/util/object'
import toString from 'common/function/toString'
import getTimestamp from 'common/function/getTimestamp'

function parseMPD(xmlString: string) {
  if (!xmlString) {
    return null
  }
  return xml2Json(xmlString, {
    aloneValueName: 'value'
  }) as {
    MPD: MPD
  }
}

function durationConvert(value: string) {
  const regex = /^PT?(?:(\d+)Y)?(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
  const match = value.match(regex)
  if (!match) {
    throw new Error('Invalid DASH PT duration: ' + value)
  }
  const [, year, day, hours, minutes, seconds] = match
  return (
    (parseInt(year || '0') * 3600 * 24 * 365) +
    (parseInt(day || '0') * 3600 * 24) +
    (parseInt(hours || '0') * 3600) +
    (parseInt(minutes || '0') * 60) +
    parseFloat(seconds || '0')
  )
}

function preFixInteger(num: number, n: number) {
  const str = toString(num)
  return str.length >= n ? str : '0'.repeat(n - str.length) + str
}

function parseRational(value: string) {
  if (!value) {
    return 0
  }
  if (value.indexOf('/') > -1) {
    const rational = value.split('/')
    return parseFloat(rational[0]) / parseFloat(rational[1])
  }
  return parseFloat(value)
}

function uuid2Uint8Array(s: string) {
  s = s.replaceAll('-', '')
  const r: number[] = []
  for (let i = 0; i < s.length; i += 2) {
    r.push(+`0x${s.substring(i, i + 2)}`)
  }
  return new Uint8Array(r)
}

function parseProtection(protection: Data[]) {
  let result: Protection = {}
  protection.forEach((item) => {
    const obj: Data = {}
    object.each(item, (value, key) => {
      obj[key.toLocaleLowerCase()] = value
    })
    if (obj['cenc:default_kid']) {
      result.kid = uuid2Uint8Array(obj['cenc:default_kid'])
      result.scheme = obj.value
    }
    if (obj['schemeiduri']) {
      const url: string[] = obj['schemeiduri'].split(':')
      if (url.length === 3 && url[0] === 'urn' && url[1] === 'uuid') {
        result.systemId = uuid2Uint8Array(url[2])
      }
    }
    if (obj['clearkey:laurl']) {
      result.url = obj['clearkey:laurl'].value
    }
    if (obj['dashif:laurl']) {
      result.url = obj['dashif:laurl'].value
    }
  })
  return result
}

function joinPath(base: string, path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return base + path
}

function parsePeriod(result: MPD, period: Period, url: string) {
  const list: MPDMediaList = {
    mediaList: {
      audio: [],
      video: [],
      subtitle: []
    },
    type: 'live',
    isEnd: false,
    duration: 0,
    minBufferTime: 0,
    maxSegmentDuration: 0,
    minimumUpdatePeriod: 0,
    timeShiftBufferDepth: 0,
    timestamp: getTimestamp()
  }

  const repID = []

  if (result.type === 'static') {
    list.type = 'vod'
    list.isEnd = true
  }

  if (result.minBufferTime) {
    list.minBufferTime = durationConvert(result.minBufferTime)
  }
  if (result.maxSegmentDuration) {
    list.maxSegmentDuration = durationConvert(result.maxSegmentDuration)
  }
  if (result.minimumUpdatePeriod) {
    list.minimumUpdatePeriod = Math.min(durationConvert(result.minimumUpdatePeriod), Math.max(list.maxSegmentDuration, 2) * 30)
  }
  if (result.availabilityStartTime) {
    list.availabilityStartTime = new Date(result.availabilityStartTime).getTime()
  }
  if (result.timeShiftBufferDepth) {
    list.timeShiftBufferDepth = durationConvert(result.timeShiftBufferDepth)
  }
  if (result.mediaPresentationDuration) {
    list.duration = durationConvert(result.mediaPresentationDuration)
  }
  let MpdBaseURL = ''
  if (result.BaseURL) {
    MpdBaseURL = is.array(result.BaseURL) ? result.BaseURL[0].value : (is.string(result.BaseURL) ? result.BaseURL : result.BaseURL.value)
  }
  if (period?.duration) {
    list.duration = durationConvert(period.duration)
  }
  if (period.BaseURL) {
    MpdBaseURL = joinPath(MpdBaseURL, is.string(period.BaseURL) ? period.BaseURL : period.BaseURL.value)
  }

  const AdaptationSet = is.array(period.AdaptationSet) ? period.AdaptationSet : [period.AdaptationSet]

  AdaptationSet.forEach((asItem, asIndex) => {
    let mimeType = ''
    let contentType = ''
    let codecs = ''
    let width = 0
    let height = 0
    let maxWidth = 0
    let maxHeight = 0
    let frameRate = 0
    let sar = '1:1'
    let startWithSAP = '1'
    let bandwidth = 0
    let adaptationSetBaseUrl = MpdBaseURL
    let lang = 'und'
    let protection: Protection
    if (asItem.BaseURL) {
      adaptationSetBaseUrl = joinPath(adaptationSetBaseUrl, is.string(asItem.BaseURL) ? asItem.BaseURL : asItem.BaseURL.value)
    }
    if (asItem.lang) {
      lang = asItem.lang
    }

    if (asItem.mimeType || asItem.contentType) {
      mimeType = asItem.mimeType
      contentType = asItem.contentType
      if (mimeType === 'video/mp4' || contentType === 'video') {
        codecs = asItem.codecs
        width = parseFloat(asItem.width)
        height = parseFloat(asItem.height)
        if (asItem.maxWidth) {
          maxWidth = parseFloat(asItem.maxWidth)
        }
        if (asItem.maxHeight) {
          maxHeight = parseFloat(asItem.maxHeight)
        }
        if (asItem.frameRate) {
          frameRate = parseRational(asItem.frameRate)
        }
        sar = asItem.sar
        startWithSAP = asItem.startWithSAP
        bandwidth = parseFloat(asItem.bandwidth)
      }
      else if (mimeType === 'audio/mp4' || contentType === 'audio') {
        codecs = asItem.codecs
        startWithSAP = asItem.startWithSAP
        bandwidth = parseFloat(asItem.bandwidth)
      }
    }
    else {
      if (asItem.maxWidth) {
        maxWidth = parseFloat(asItem.maxWidth)
      }
      if (asItem.maxHeight) {
        maxHeight = parseFloat(asItem.maxHeight)
      }
      if (asItem.frameRate) {
        frameRate = parseRational(asItem.frameRate)
      }
    }

    if (asItem.ContentProtection) {
      protection = parseProtection(asItem.ContentProtection)
    }

    const Representation = is.array(asItem.Representation) ? asItem.Representation : [asItem.Representation]

    Representation.forEach((rItem, rIndex: number) => {
      if (repID.indexOf(rItem.id) > -1) {
        rItem.id = (parseInt(repID[repID.length - 1]) + 1).toString()
      }
      repID.push(rItem.id)
      let initSegment = ''
      const mediaSegments = []
      let timescale = 0
      let duration = list.duration
      let baseURL = joinPath(url.slice(0, url.lastIndexOf('/') + 1), adaptationSetBaseUrl)
      if (rItem.mimeType) {
        mimeType = rItem.mimeType
      }
      if (mimeType === 'video/mp4' || contentType === 'video') {
        if (rItem.codecs) {
          codecs = rItem.codecs
        }
        if (rItem.width) {
          width = parseFloat(rItem.width)
        }
        if (rItem.height) {
          height = parseFloat(rItem.height)
        }
        if (rItem.maxWidth) {
          maxWidth = parseFloat(rItem.maxWidth)
        }
        if (rItem.maxHeight) {
          maxHeight = parseFloat(rItem.maxHeight)
        }
        if (rItem.frameRate) {
          frameRate = parseFloat(rItem.frameRate)
        }
        if (rItem.sar) {
          sar = rItem.sar
        }
        if (rItem.startWithSAP) {
          startWithSAP = rItem.startWithSAP
        }
        if (rItem.bandwidth) {
          bandwidth = parseFloat(rItem.bandwidth)
        }
      }
      else {
        if (rItem.codecs) {
          codecs = rItem.codecs
        }
        if (rItem.startWithSAP) {
          startWithSAP = rItem.startWithSAP
        }
        if (rItem.bandwidth) {
          bandwidth = parseFloat(rItem.bandwidth)
        }
      }
      if (rItem.BaseURL) {
        baseURL = joinPath(baseURL, is.string(rItem.BaseURL) ? rItem.BaseURL : rItem.BaseURL.value)
      }
      if (rItem.ContentProtection) {
        protection = parseProtection(rItem.ContentProtection)
      }
      if (rItem.SegmentBase) {
        if (mimeType === 'video/mp4' || contentType === 'video') {
          list.mediaList.video.push({
            id: rItem.id,
            file: baseURL,
            mimeType,
            codecs,
            width,
            height,
            maxWidth,
            maxHeight,
            frameRate,
            sar,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection
          })
        }
        else if (mimeType === 'audio/mp4' || contentType === 'audio') {
          list.mediaList.audio.push({
            id: rItem.id,
            file: baseURL,
            mimeType,
            codecs,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection,
            lang
          })
        }
        else if (mimeType === 'application/mp4' || contentType === 'text') {
          list.mediaList.subtitle.push({
            id: rItem.id,
            file: baseURL,
            mimeType,
            codecs,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection,
            lang
          })
        }
      }
      else {
        let ST: SegmentTemplate
        if (asItem.SegmentTemplate) {
          ST = is.array(asItem.SegmentTemplate) ? asItem.SegmentTemplate[0] : asItem.SegmentTemplate
        }
        if (rItem.SegmentTemplate) {
          ST = is.array(rItem.SegmentTemplate) ? rItem.SegmentTemplate[0] : rItem.SegmentTemplate
        }

        if (ST) {
          let start = ST.startNumber ? parseInt(ST.startNumber) : 1
          initSegment = ST.initialization
          timescale = parseFloat(ST.timescale || '1')

          if (ST.duration && !ST.SegmentTimeline) {
            duration = parseFloat(ST.duration)
            let segmentDuration = duration / timescale
            let end = start + Math.ceil((list.duration || segmentDuration) / segmentDuration) - 1
            let generateIndex = end
            if (list.type === 'live' && (is.number(list.availabilityStartTime) || ST.presentationTimeOffset)) {
              const now = list.timestamp || getTimestamp()
              const startTs = list.availabilityStartTime
              const elapsed = ((now - startTs) / 1000) - (ST.presentationTimeOffset ? parseInt(ST.presentationTimeOffset) : 0)
              const segmentOffset = Math.floor(elapsed / segmentDuration)
              end = start + segmentOffset
              if (list.timeShiftBufferDepth) {
                start = end - Math.ceil(list.timeShiftBufferDepth / segmentDuration) + 1
              }
              generateIndex = end
              if (ST.availabilityTimeComplete === 'false' || list.minimumUpdatePeriod > list.minBufferTime * 2) {
                end += Math.ceil(list.minimumUpdatePeriod / segmentDuration)
              }
            }
            for (let i = start; i <= end; i++) {
              const startTime = segmentDuration * (i - start)
              let endTime = segmentDuration * (i - start + 1)
              if (i === end && list.duration) {
                segmentDuration = list.duration - segmentDuration * (end - start)
                endTime = list.duration
              }
              mediaSegments.push({
                idx: i,
                start: startTime,
                end: endTime,
                url: baseURL + ST.media.replace(/\$RepresentationID\$/g, rItem.id).replace(/\$Number(%(\d+)d)?\$/g, (s0, s1, s2) => {
                  if (s2) {
                    return preFixInteger(i, +s2)
                  }
                  return toString(i)
                }),
                segmentDuration,
                pending: i > generateIndex
              })
            }
          }
          else if (ST.SegmentTimeline && ST.SegmentTimeline.S) {
            const S = is.array(ST.SegmentTimeline.S) ? ST.SegmentTimeline.S : [ST.SegmentTimeline.S]
            let startTime = 0
            let index = start
            for (let i = 0; i < S.length; i++) {
              let d = parseFloat(S[i].d)
              if (S[i].t) {
                startTime = parseFloat(S[i].t)
              }

              let r = 1
              if (S[i].r) {
                r = parseInt(S[i].r)
                if (r === -1 && duration) {
                  r = Math.ceil(duration * timescale / d)
                }
                else {
                  r += 1
                }
              }
              for (let j = 0; j < r; j++) {
                mediaSegments.push({
                  idx: index,
                  start: startTime / timescale,
                  end: (startTime + d) / timescale,
                  url: baseURL + ST.media.replace(/\$RepresentationID\$/g, rItem.id)
                    .replace(/\$Number(%(\d+)d)?\$/g, (s0, s1, s2) => {
                      if (s2) {
                        return preFixInteger(index, +s2)
                      }
                      return toString(index)
                    })
                    .replace(/\$Time\$/g, toString(startTime)),
                  segmentDuration: d / timescale
                })
                index++
                startTime += d
              }
            }
          }
        }
        else if (rItem.SegmentList) {
          const segmentList = is.array(rItem.SegmentList.SegmentURL) ? rItem.SegmentList.SegmentURL : [rItem.SegmentList.SegmentURL]
          let startTime = 0
          let duration = parseFloat(rItem.SegmentList.duration)
          for (let i = 0; i < segmentList.length; i++) {
            mediaSegments.push({
              idx: i,
              start: startTime / timescale,
              end: (startTime + duration) / timescale,
              url: baseURL + segmentList[i].media,
              segmentDuration: duration / timescale
            })
            startTime += duration
          }
        }

        if (mimeType === 'video/mp4' || contentType === 'video') {
          list.mediaList.video.push({
            id: rItem.id,
            baseURL,
            initSegment: baseURL + initSegment.replace(/\$RepresentationID\$/g, rItem.id).replace(/\$Bandwidth\$/g, toString(bandwidth)),
            mediaSegments,
            mimeType,
            codecs,
            width,
            height,
            maxWidth,
            maxHeight,
            frameRate,
            sar,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection
          })
        }
        else if (mimeType === 'audio/mp4' || contentType === 'audio') {
          list.mediaList.audio.push({
            id: rItem.id,
            baseURL,
            initSegment: baseURL + initSegment.replace(/\$RepresentationID\$/g, rItem.id).replace(/\$Bandwidth\$/g, toString(bandwidth)),
            mediaSegments,
            mimeType,
            codecs,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection,
            lang
          })
        }
        else if (mimeType === 'application/mp4' || contentType === 'text') {
          list.mediaList.subtitle.push({
            id: rItem.id,
            baseURL,
            initSegment: baseURL + initSegment.replace(/\$RepresentationID\$/g, rItem.id).replace(/\$Bandwidth\$/g, toString(bandwidth)),
            mediaSegments,
            mimeType,
            codecs,
            startWithSAP: startWithSAP === '1',
            bandwidth,
            timescale,
            duration,
            protection,
            lang
          })
        }
      }
    })
  });

  ['video', 'audio'].forEach((mediaType) => {
    list.mediaList[mediaType].sort((a: Data, b: Data) => {
      return a.bandwidth - b.bandwidth
    })
  })

  return list
}

export default function parser(xml: string, url: string) {
  const result = parseMPD(xml).MPD
  if (result.type === 'dynamic') {
    const period = is.array(result.Period) ? result.Period[result.Period.length - 1] : result.Period
    return parsePeriod(result, period, url)
  }
  else {
    const periods = is.array(result.Period) ? result.Period : [result.Period]
    const list = periods.map((period) => {
      return parsePeriod(result, period, url)
    })
    const mediaList: MPDMediaList = list[0]
    for (let i = 1; i < list.length; i++) {
      mediaList.duration += list[i].duration
      list[i].mediaList.video.forEach((video) => {
        const prev = mediaList.mediaList.video.find((p) => {
          return video.initSegment && video.initSegment === p.initSegment || video.id === p.id
        })
        if (prev) {
          if (prev.mediaSegments?.length && video.mediaSegments?.length) {
            video.mediaSegments.forEach((s) => {
              s.start += prev.mediaSegments[prev.mediaSegments.length - 1].end
              s.end += prev.mediaSegments[prev.mediaSegments.length - 1].end
            })
          }
          prev.mediaSegments = (prev.mediaSegments || []).concat(video.mediaSegments || [])
        }
        else {
          mediaList.mediaList.video.push(video)
        }
      })
      list[i].mediaList.audio.forEach((audio) => {
        const prev = mediaList.mediaList.audio.find((p) => {
          return audio.initSegment && audio.initSegment === p.initSegment || audio.id === p.id
        })
        if (prev) {
          if (prev.mediaSegments?.length && audio.mediaSegments?.length) {
            audio.mediaSegments.forEach((s) => {
              s.start += prev.mediaSegments[prev.mediaSegments.length - 1].end
              s.end += prev.mediaSegments[prev.mediaSegments.length - 1].end
            })
          }
          prev.mediaSegments = (prev.mediaSegments || []).concat(audio.mediaSegments || [])
        }
        else {
          mediaList.mediaList.audio.push(audio)
        }
      })
      list[i].mediaList.subtitle.forEach((subtitle) => {
        const prev = mediaList.mediaList.subtitle.find((p) => {
          return subtitle.initSegment && subtitle.initSegment === p.initSegment || subtitle.id === p.id
        })
        if (prev) {
          if (prev.mediaSegments?.length && subtitle.mediaSegments?.length) {
            subtitle.mediaSegments.forEach((s) => {
              s.start += prev.mediaSegments[prev.mediaSegments.length - 1].end
              s.end += prev.mediaSegments[prev.mediaSegments.length - 1].end
            })
          }
          prev.mediaSegments = (prev.mediaSegments || []).concat(subtitle.mediaSegments || [])
        }
        else {
          mediaList.mediaList.subtitle.push(subtitle)
        }
      })
    }
    if (result.mediaPresentationDuration) {
      mediaList.duration = durationConvert(result.mediaPresentationDuration)
    }
    return mediaList
  }
}
