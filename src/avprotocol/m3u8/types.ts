/**
 * from https://github.com/kuu/hls-parser/blob/master/types.ts
 * MIT license 
 */

import getTimestamp from 'common/function/getTimestamp'

type RenditionType = 'AUDIO' | 'VIDEO' | 'SUBTITLES' | 'CLOSED-CAPTIONS'

class Rendition {
  type: RenditionType
  uri?: string
  groupId: string
  language?: string
  assocLanguage?: string
  name: string
  isDefault: boolean
  autoselect: boolean
  forced: boolean
  instreamId?: string
  characteristics?: string
  channels?: string

  constructor({
    // required
    type,
    // required if type='SUBTITLES'
    uri,
    // required
    groupId,
    language,
    assocLanguage,
    // required
    name,
    isDefault,
    autoselect,
    forced,
    // required if type=CLOSED-CAPTIONS
    instreamId,
    characteristics,
    channels
  }: Rendition) {
    this.type = type
    this.uri = uri
    this.groupId = groupId
    this.language = language
    this.assocLanguage = assocLanguage
    this.name = name
    this.isDefault = isDefault
    this.autoselect = autoselect
    this.forced = forced
    this.instreamId = instreamId
    this.characteristics = characteristics
    this.channels = channels
  }
}

class Variant {
  uri: string
  isIFrameOnly?: boolean
  bandwidth: number
  averageBandwidth?: number
  score: number
  codecs?: string
  resolution?: { width: number, height: number }
  frameRate?: number
  hdcpLevel?: string
  allowedCpc: { format: string, cpcList: string[] }[]
  videoRange: 'SDR' | 'HLG' | 'PQ'
  stableVariantId: string
  programId: any
  audio: Rendition[]
  video: Rendition[]
  subtitles: Rendition[]
  closedCaptions: Rendition[]
  currentRenditions: { audio: number, video: number, subtitles: number, closedCaptions: number }

  constructor({
    // required
    uri,
    isIFrameOnly = false,
    // required
    bandwidth,
    averageBandwidth,
    score,
    // required?
    codecs,
    resolution,
    frameRate,
    hdcpLevel,
    allowedCpc,
    videoRange,
    stableVariantId,
    programId,
    audio = [],
    video = [],
    subtitles = [],
    closedCaptions = [],
    currentRenditions = {audio: 0, video: 0, subtitles: 0, closedCaptions: 0}
  }: any) {
    this.uri = uri
    this.isIFrameOnly = isIFrameOnly
    this.bandwidth = bandwidth
    this.averageBandwidth = averageBandwidth
    this.score = score
    this.codecs = codecs
    this.resolution = resolution
    this.frameRate = frameRate
    this.hdcpLevel = hdcpLevel
    this.allowedCpc = allowedCpc
    this.videoRange = videoRange
    this.stableVariantId = stableVariantId
    this.programId = programId
    this.audio = audio
    this.video = video
    this.subtitles = subtitles
    this.closedCaptions = closedCaptions
    this.currentRenditions = currentRenditions
  }
}

class SessionData {
  id: string
  value?: string
  uri?: string
  language?: string

  constructor({
    // required
    id,
    value,
    uri,
    language
  }: SessionData) {
    this.id = id
    this.value = value
    this.uri = uri
    this.language = language
  }
}

class Key {
  method: string
  uri?: string
  iv?: Uint8Array<ArrayBuffer>
  format?: string
  formatVersion?: string

  constructor({
    // required
    method,
    // required unless method=NONE
    uri,
    iv,
    format,
    formatVersion
  }: Key) {
    this.method = method
    this.uri = uri
    this.iv = iv
    this.format = format
    this.formatVersion = formatVersion
  }
}

export type Byterange = {
  length: number
  offset: number
}

class MediaInitializationSection {
  hint: boolean
  uri: string
  mimeType?: string
  byterange?: Byterange

  constructor({
    hint = false,
    // required
    uri,
    mimeType,
    byterange
  }: Partial<MediaInitializationSection> & {uri: string}) {
    this.hint = hint
    this.uri = uri
    this.mimeType = mimeType
    this.byterange = byterange
  }
}

class DateRange {
  id: string
  classId?: string
  start?: Date
  end?: Date
  duration?: number
  plannedDuration?: number
  endOnNext?: boolean
  attributes: Record<string, any>

  constructor({
    // required
    id,
    // required if endOnNext is true
    classId,
    start,
    end,
    duration,
    plannedDuration,
    endOnNext,
    attributes = {}
  }: DateRange) {
    this.id = id
    this.classId = classId
    this.start = start
    this.end = end
    this.duration = duration
    this.plannedDuration = plannedDuration
    this.endOnNext = endOnNext
    this.attributes = attributes
  }
}

class SpliceInfo {
  type: string
  duration?: number
  tagName?: string
  value?: any

  constructor({
    // required
    type,
    // required if the type is 'OUT'
    duration,
    // required if the type is 'RAW'
    tagName,
    value
  }: SpliceInfo) {
    this.type = type
    this.duration = duration
    this.tagName = tagName
    this.value = value
  }
}

type DataType = 'part' | 'playlist' | 'prefetch' | 'segment'

class Data {
  type: DataType

  constructor(type: DataType) {
    this.type = type
  }
}

class Playlist extends Data {
  isMasterPlaylist: boolean
  uri?: string
  version?: number
  independentSegments: boolean
  start?: { offset: number, precise: boolean }
  source?: string

  constructor({
    // required
    isMasterPlaylist,
    uri,
    version,
    independentSegments = false,
    start,
    source
  }: Partial<Playlist> & { isMasterPlaylist: boolean }) {
    super('playlist')
    this.isMasterPlaylist = isMasterPlaylist
    this.uri = uri
    this.version = version
    this.independentSegments = independentSegments
    this.start = start
    this.source = source
  }
}

class MasterPlaylist extends Playlist {
  variants: Variant[]
  currentVariant?: number
  sessionDataList: SessionData[]
  sessionKeyList: Key[]

  constructor(params: Partial<MasterPlaylist> = {}) {
    super({...params, isMasterPlaylist: true})
    const {
      variants = [],
      currentVariant,
      sessionDataList = [],
      sessionKeyList = []
    } = params
    this.variants = variants
    this.currentVariant = currentVariant
    this.sessionDataList = sessionDataList
    this.sessionKeyList = sessionKeyList
  }
}

type LowLatencyCompatibility = {
  canBlockReload: boolean,
  canSkipUntil: number,
  holdBack: number,
  partHoldBack: number,
}

class MediaPlaylist extends Playlist {
  targetDuration: number
  mediaSequenceBase?: number
  discontinuitySequenceBase?: number
  endlist: boolean
  playlistType?: 'EVENT' | 'VOD'
  isIFrame?: boolean
  segments: Segment[]
  prefetchSegments: PrefetchSegment[]
  lowLatencyCompatibility?: LowLatencyCompatibility
  partTargetDuration?: number
  renditionReports: RenditionReport[]
  skip: number
  hash?: Record<string, any>
  duration: number
  timestamp: number

  constructor(params: Partial<MediaPlaylist> = {}) {
    super({...params, isMasterPlaylist: false})
    const {
      targetDuration,
      mediaSequenceBase = 0,
      discontinuitySequenceBase = 0,
      endlist = false,
      playlistType,
      isIFrame,
      segments = [],
      prefetchSegments = [],
      lowLatencyCompatibility,
      partTargetDuration,
      renditionReports = [],
      skip = 0,
      hash,
      duration = 0
    } = params
    this.targetDuration = targetDuration!
    this.mediaSequenceBase = mediaSequenceBase
    this.discontinuitySequenceBase = discontinuitySequenceBase
    this.endlist = endlist
    this.playlistType = playlistType
    this.isIFrame = isIFrame
    this.segments = segments
    this.prefetchSegments = prefetchSegments
    this.lowLatencyCompatibility = lowLatencyCompatibility
    this.partTargetDuration = partTargetDuration
    this.renditionReports = renditionReports
    this.skip = skip
    this.hash = hash
    this.duration = duration
    this.timestamp = getTimestamp()
  }
}

class Segment extends Data {
  uri: string
  mimeType: string
  data: any
  duration: number
  title?: string
  byterange: Byterange
  discontinuity?: boolean
  mediaSequenceNumber: number
  discontinuitySequence: number
  key?: Key
  map: MediaInitializationSection
  programDateTime?: Date
  dateRange: DateRange
  markers: SpliceInfo[]
  parts: PartialSegment[]

  constructor({
    uri,
    mimeType,
    data,
    duration,
    title,
    byterange,
    discontinuity,
    mediaSequenceNumber = 0,
    discontinuitySequence = 0,
    key,
    map,
    programDateTime,
    dateRange,
    markers = [],
    parts = []
  }: any) {
    super('segment')
    this.uri = uri
    this.mimeType = mimeType
    this.data = data
    this.duration = duration
    this.title = title
    this.byterange = byterange
    this.discontinuity = discontinuity
    this.mediaSequenceNumber = mediaSequenceNumber
    this.discontinuitySequence = discontinuitySequence
    this.key = key
    this.map = map
    this.programDateTime = programDateTime
    this.dateRange = dateRange
    this.markers = markers
    this.parts = parts
  }
}

class PartialSegment extends Data {
  hint: boolean
  uri: string
  duration?: number
  independent?: boolean
  byterange?: Byterange
  gap?: boolean

  constructor({
    hint = false,
    // required
    uri,
    duration,
    independent,
    byterange,
    gap
  }: Omit<PartialSegment, 'type'>) {
    super('part')
    this.hint = hint
    this.uri = uri
    this.duration = duration
    this.independent = independent
    this.duration = duration
    this.byterange = byterange
    this.gap = gap
  }
}

class PrefetchSegment extends Data {
  uri: string
  discontinuity?: boolean
  mediaSequenceNumber: number
  discontinuitySequence: number
  key?: Key | null

  constructor({
    // required
    uri,
    discontinuity,
    mediaSequenceNumber = 0,
    discontinuitySequence = 0,
    key
  }: Omit<PrefetchSegment, 'type'>) {
    super('prefetch')
    this.uri = uri
    this.discontinuity = discontinuity
    this.mediaSequenceNumber = mediaSequenceNumber
    this.discontinuitySequence = discontinuitySequence
    this.key = key
  }
}

class RenditionReport {
  uri: string
  lastMSN?: number
  lastPart: number

  constructor({
    // required
    uri,
    lastMSN,
    lastPart
  }: RenditionReport) {
    this.uri = uri
    this.lastMSN = lastMSN
    this.lastPart = lastPart
  }
}

export {
  Rendition,
  Variant,
  SessionData,
  Key,
  MediaInitializationSection,
  DateRange,
  SpliceInfo,
  Playlist,
  MasterPlaylist,
  MediaPlaylist,
  Segment,
  PartialSegment,
  PrefetchSegment,
  RenditionReport
}
