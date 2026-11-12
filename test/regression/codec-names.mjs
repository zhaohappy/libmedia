import assert from 'node:assert/strict'
import { evaluate, functionSource, getClass, readSource, ts } from './helpers/source.mjs'
import { test } from './helpers/test.mjs'

function loadEnum(path, name) {
  const source = readSource(path)
  const node = source.statements.find((node) => ts.isEnumDeclaration(node) && node.name.text === name)
  assert.ok(node, `Missing enum ${name}`)
  return evaluate(`${node.getText(source).replace(/^export /, '')}\nreturn ${name}`)
}

function loadValue(source, name, env) {
  const node = source.statements.filter(ts.isVariableStatement)
    .flatMap((node) => [...node.declarationList.declarations])
    .find((node) => node.name.getText(source) === name)
  assert.ok(node?.initializer, `Missing value ${name}`)
  return evaluate(`return ${node.initializer.getText(source)}`, env)
}

function loadFunction(path, name, env) {
  const source = functionSource(readSource(path), [name]).replace(/^default /, '')
  return evaluate(`${source}\nreturn ${name}`, env)
}

const AVCodecID = loadEnum('avutil/src/codec.ts', 'AVCodecID')
const mktagle = loadFunction('avformat/src/function/mktagle.ts', 'mktagle', { logger: { warn() {} } })
const codecBmpTags = loadValue(readSource('avformat/src/formats/riff/riff.ts'), 'codecBmpTags', { mktagle, AVCodecID })

test('AVI recognizes both uppercase and lowercase Xvid FourCC as MPEG-4 Part 2', () => {
  for (const tag of ['XVID', 'xvid']) {
    const header = Buffer.from(tag, 'ascii')
    assert.equal(codecBmpTags[header.readUInt32LE()], AVCodecID.AV_CODEC_ID_MPEG4, tag)
  }
  assert.equal(codecBmpTags[Buffer.from('H264').readUInt32LE()], AVCodecID.AV_CODEC_ID_H264)
  assert.equal(codecBmpTags[Buffer.from('zzzz').readUInt32LE()], undefined)
})

const AVMediaType = loadEnum('avutil/src/codec.ts', 'AVMediaType')
const AVDisposition = loadEnum('avutil/src/AVStream.ts', 'AVDisposition')
const namesSource = readSource('avutil/src/stringEnum.ts')
const CodecId2MimeType = loadValue(namesSource, 'CodecId2MimeType', { AVCodecID })
const stringEnum = Object.fromEntries(['Audio', 'Video', 'Subtitle'].map((type) => {
  const name = `${type}CodecString2CodecId`
  return [name, loadValue(namesSource, name, { AVCodecID })]
}))
const each = loadFunction('common/src/util/object.ts', 'each', { constant: { FALSE: false } })
const dumpCodecName = evaluate(
  `${functionSource(readSource('avformat/src/dump.ts'), ['dumpKey', 'dumpCodecName'])}\nreturn dumpCodecName`,
  { AVMediaType, stringEnum, object: { each } }
)
const toString = loadFunction('common/src/function/toString.ts', 'toString', {
  constant: { NULL: null, UNDEFINED: undefined, EMPTY_STRING: '' }
})
const format = loadFunction('common/src/util/string.ts', 'format', { toString })
const getAudioCodec = loadFunction('avutil/src/function/getAudioCodec.ts', 'getAudioCodec', { AVCodecID, CodecId2MimeType })
const getVideoCodec = loadFunction('avutil/src/function/getVideoCodec.ts', 'getVideoCodec', {
  AVCodecID, CodecId2MimeType, nullptr: 0, string: { format },
  H264Profile: loadEnum('avutil/src/codecs/h264.ts', 'H264Profile'),
  NOPTS_VALUE: loadValue(readSource('avutil/src/constant.ts'), 'NOPTS_VALUE')
})

// Execute the actual load-time assignment with synthetic stream metadata.
// Pointer-backed codec parameters are represented as objects; this does not exercise demuxing or decoding.
const playerSource = readSource('avplayer/src/AVPlayer.ts')
const load = getClass(playerSource, 'AVPlayer').members.find((node) => node.name?.getText(playerSource) === 'load')
assert.ok(load?.body)
const assignment = load.body.statements.filter((node) => ts.isExpressionStatement(node)
  && node.getText(playerSource).includes('this.GlobalData.stats.audiocodec'))
assert.equal(assignment.length, 1, 'Expected one load-time codec statistics assignment')
const collect = evaluate(`return function (formatContext) { ${assignment[0].getText(playerSource)} }`, {
  AVMediaType, AVDisposition, getAudioCodec, getVideoCodec, dumpUtils: { dumpCodecName }
})

function stream(type, codec, params = {}, disposition = 0) {
  const codecId = typeof codec === 'number' ? codec : AVCodecID[`AV_CODEC_ID_${codec}`]
  assert.notEqual(codecId, undefined, `Unknown fixture codec ${codec}`)
  return {
    codecpar: { codecType: type, codecId, profile: 0, level: 0, extradata: 0, extradataSize: 0, ...params },
    disposition
  }
}

function stats(streams) {
  const player = { GlobalData: { stats: {} } }
  collect.call(player, { streams })
  return player.GlobalData.stats
}

const audioCases = [
  ['AAC', 'aac', 'mp4a.40.2', { profile: 2 }],
  ['MP3', 'mp3'], ['OPUS', 'opus'], ['FLAC', 'flac'], ['SPEEX', 'speex'], ['VORBIS', 'vorbis'],
  ['AC3', 'ac3', 'ac-3'], ['EAC3', 'eac3', 'ec-3'], ['DTS', 'dts', 'dtsc'],
  ['WMAV1', 'wmav1'], ['WMAV2', 'wmav2'], ['WMAVOICE', 'wmavoice'], ['WMAPRO', 'wmapro'], ['WMALOSSLESS', 'wmalossless'],
  ['COOK', 'cook'], ['SIPR', 'sipr'], ['RALF', 'ralf'],
  ['PCM_ALAW', 'pcm_alaw', 'alaw'], ['PCM_MULAW', 'pcm_mulaw', 'ulaw'],
  ['PCM_U8', 'pcm_u8', 'pcm-u8'], ['PCM_S16LE', 'pcm_s16le', 'pcm-s16'],
  ['PCM_S24LE', 'pcm_s24le', 'pcm-s24'], ['PCM_S32LE', 'pcm_s32le', 'pcm-s32'],
  ['PCM_S64LE', 'pcm_s64le'], ['PCM_F32LE', 'pcm_f32le', 'pcm-f32'], ['PCM_F64LE', 'pcm_f64le', 'pcm-f64']
]
const videoCases = [
  ['H264', 'h264', 'avc1.640028', { profile: 100, level: 40 }],
  ['HEVC', 'hevc', 'hev1.1.0.L120.0', { profile: 1, level: 120 }],
  ['VVC', 'vvc', 'vvc1.1.L120', { profile: 1, level: 120 }],
  ['AV1', 'av1', 'av01.0.08M.08', { profile: 0, level: 8 }],
  ['VP8', 'vp8', 'vp8.00.10.08', { profile: 0, level: 10 }],
  ['VP9', 'vp9', 'vp09.00.40.08.00', { profile: 0, level: 40 }],
  ['MPEG4', 'mpeg4', 'mp4v'], ['MPEG1VIDEO', 'mpeg1video'], ['MPEG2VIDEO', 'mpeg2video'], ['THEORA', 'theora'],
  ['H261', 'h261'], ['H263', 'h263'], ['H263I', 'h263i'], ['H263P', 'h263p'],
  ['MSMPEG4V1', 'msmpeg4v1'], ['MSMPEG4V2', 'msmpeg4v2'], ['MSMPEG4V3', 'msmpeg4v3'],
  ['RV10', 'rv10'], ['RV20', 'rv20'], ['RV30', 'rv30'], ['RV40', 'rv40'],
  ['WMV1', 'wmv1'], ['WMV2', 'wmv2'], ['WMV3', 'wmv3'], ['VC1', 'vc1'],
  ['MJPEG', 'mjpeg'], ['PNG', 'png'], ['WEBP', 'webp'], ['GIF', 'gif'], ['TIFF', 'tiff'], ['BMP', 'bmp']
]

for (const [type, field, cases] of [
  [AVMediaType.AVMEDIA_TYPE_AUDIO, 'audiocodec', audioCases],
  [AVMediaType.AVMEDIA_TYPE_VIDEO, 'videocodec', videoCases]
]) {
  for (const [codec, diagnostic, expected = diagnostic, params] of cases) {
    test(`${field}: ${codec} exposes its diagnostic and playback names`, () => {
      const input = stream(type, codec, params)
      assert.deepEqual(stats([input]), { [field]: expected })
      assert.equal(dumpCodecName(type, input.codecpar.codecId), diagnostic)
    })
  }
  test(`${field}: unrecognized codecs remain unknown`, () => {
    assert.deepEqual(stats([stream(type, -1)]), { [field]: 'unknown' })
  })
}

test('the matrix covers every explicitly supported audio and video codec', () => {
  const covered = new Set([...audioCases, ...videoCases].map(([name]) => AVCodecID[`AV_CODEC_ID_${name}`]))
  const supported = loadValue(playerSource, 'AVPlayerSupportedCodecs', { AVCodecID })
  const subtitleStart = AVCodecID.AV_CODEC_ID_FIRST_SUBTITLE
  assert.ok(Number.isInteger(subtitleStart))
  for (const codecId of supported.filter((id) => id < subtitleStart)) {
    assert.ok(covered.has(codecId), `Missing audio/video case for codec ${codecId}`)
  }
})

test('AAC profiles retain the detailed codec string instead of the generic name', () => {
  for (const profile of [2, 5, 29]) {
    assert.equal(stats([stream(AVMediaType.AVMEDIA_TYPE_AUDIO, 'AAC', { profile })]).audiocodec, `mp4a.40.${profile}`)
  }
})

test('video profile and level fallbacks retain a usable codec string', () => {
  for (const [codec, params, expected] of [
    ['H264', { profile: 110, level: 41 }, 'avc1.640029'],
    ['VP8', { profile: -1, level: -1 }, 'vp8'],
    ['VP9', { profile: -1, level: -1 }, 'vp09.00.40.08.00']
  ]) {
    assert.equal(stats([stream(AVMediaType.AVMEDIA_TYPE_VIDEO, codec, params)]).videocodec, expected)
  }
})

test('audio and video statistics coexist and cover art never replaces the video codec', () => {
  const audio = stream(AVMediaType.AVMEDIA_TYPE_AUDIO, 'WMAPRO')
  const video = stream(AVMediaType.AVMEDIA_TYPE_VIDEO, 'WMV3')
  const cover = stream(AVMediaType.AVMEDIA_TYPE_VIDEO, 'MJPEG', {}, AVDisposition.ATTACHED_PIC)
  const subtitle = stream(AVMediaType.AVMEDIA_TYPE_SUBTITLE, 'ASS')
  for (const streams of [[cover, audio, video, subtitle], [audio, video, subtitle, cover]]) {
    assert.deepEqual(stats(streams), { audiocodec: 'wmapro', videocodec: 'wmv3' })
  }
  assert.deepEqual(stats([audio, cover]), { audiocodec: 'wmapro' })
  assert.deepEqual(stats([cover, subtitle]), {})
  assert.deepEqual(stats([]), {})
})
