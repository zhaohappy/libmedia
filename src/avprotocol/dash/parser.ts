/**
 * from https://github.com/bytedance/xgplayer/blob/main/packages/xgplayer-dash/src/m4s/mpd.js
 * MIT license 
 */

import xml2Json from 'common/util/xml2Json'
import { MPD, MPDMediaList, SegmentTemplate } from './type'
import { Data } from 'common/types/type'
import * as is from 'common/util/is'
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
  let Hours = 0
  let Minutes = 0
  let Seconds = 0
  value = value.slice(value.indexOf('PT') + 2)
  if (value.indexOf('H') > -1 && value.indexOf('M') > -1 && value.indexOf('S') > -1) {
    Hours = parseFloat(value.slice(0, value.indexOf('H')))
    Minutes = parseFloat(value.slice(value.indexOf('H') + 1, value.indexOf('M')))
    Seconds = parseFloat(value.slice(value.indexOf('M') + 1, value.indexOf('S')))
  }
  else if (value.indexOf('H') < 0 && value.indexOf('M') > 0 && value.indexOf('S') > -1) {
    Minutes = parseFloat(value.slice(0, value.indexOf('M')))
    Seconds = parseFloat(value.slice(value.indexOf('M') + 1, value.indexOf('S')))
  }
  else if (value.indexOf('H') < 0 && value.indexOf('M') < 0 && value.indexOf('S') > -1) {
    Seconds = parseFloat(value.slice(0, value.indexOf('S')))
  }
  return Hours * 3600 + Minutes * 60 + Seconds
}

function preFixInteger(num: number, n: number) {
  return (Array(n).join('0') + num).slice(-n)
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

export default function parser(xml: string, url: string) {
  const list: MPDMediaList = {
    source: xml,
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
    timestamp: getTimestamp()
  }

  const repID = []

  const result = parseMPD(xml).MPD
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
    list.minimumUpdatePeriod = durationConvert(result.minimumUpdatePeriod)
  }
  if (result.mediaPresentationDuration) {
    list.duration = durationConvert(result.mediaPresentationDuration)
  }
  let MpdBaseURL = ''
  if (result.BaseURL) {
    MpdBaseURL = is.string(result.BaseURL) ? result.BaseURL : result.BaseURL.value
  }
  const Period = is.array(result.Period) ? result.Period[0] : result.Period
  if (!list.duration && Period && Period.duration) {
    list.duration = durationConvert(Period.duration)
  }

  const AdaptationSet = is.array(Period.AdaptationSet) ? Period.AdaptationSet : [Period.AdaptationSet]

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
    if (asItem.BaseURL) {
      adaptationSetBaseUrl += asItem.BaseURL
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

    const Representation = is.array(asItem.Representation) ? asItem.Representation : [asItem.Representation]

    Representation.forEach((rItem, rIndex: number) => {
      if (repID.indexOf(rItem.id) > -1) {
        rItem.id = (parseInt(repID[repID.length - 1]) + 1).toString()
      }
      repID.push(rItem.id)
      let initSegment = ''
      const mediaSegments = []
      let timescale = 0
      let duration = 0
      let baseURL = url.slice(0, url.lastIndexOf('/') + 1) + adaptationSetBaseUrl
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
        baseURL += is.string(rItem.BaseURL) ? rItem.BaseURL : rItem.BaseURL.value
      }
      let encrypted = false
      if (asItem.ContentProtection || rItem.ContentProtection) {
        encrypted = true
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
            encrypted
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
            encrypted,
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
            encrypted,
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
          const start = parseInt(ST.startNumber)
          initSegment = ST.initialization
          timescale = parseFloat(ST.timescale || '1')

          if (ST.duration && !ST.SegmentTimeline) {
            duration = parseFloat(ST.duration)
            let segmentDuration = duration / timescale
            const end = start + Math.ceil((list.duration || segmentDuration) / segmentDuration) - 1
            for (let i = start; i <= end; i++) {
              const startTime = segmentDuration * (i - start)
              let endTime = segmentDuration * (i - start + 1)
              if (i === end) {
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
                segmentDuration
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
                startTime = parseFloat(S[0].t)
              }

              let r = 1
              if (S[i].r) {
                r = parseInt(S[i].r) + 1
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
            encrypted
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
            encrypted,
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
            encrypted,
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
