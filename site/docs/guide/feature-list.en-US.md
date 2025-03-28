---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 6
---

# Feature List

## Preface

In addition to providing low-level APIs, libmedia also provides player tools and transcoding tools. For details, see [Player](./player.md) and [Transcoding](./transcode.md).

libmedia can complete the following functions:

- Media file demux
- Audio and video mux into files
- Audio and video decoding
- Audio and video encoding
- Audio and video rendering
- Audio resampling
- Audio speed change and pitch change
- Video scaling
- Video color format conversion
- Media mux format conversion
- Media data encoding and transcoding
- Media file playback
- Media file cropping

## Formats

| Format   | Input   | Output    |
| ---------| --------|-----------|
| flv      | ✅       | ✅        |
| mov      | ✅       | ✅        |
| mp4      | ✅       | ✅        |
| mpegts   | ✅       | ✅        |
| mpegps   | ✅       | ❌        |
| matroska | ✅       | ✅        |
| webm     | ✅       | ✅        |
| h264 raw | ✅       | ❌        |
| hevc raw | ✅       | ❌        |
| vvc  raw | ✅       | ❌        |
| mp3      | ✅       | ✅        |
| ogg      | ✅       | ✅        |
| ivf      | ✅       | ✅        |
| aac      | ✅       | ❌        |
| flac     | ✅       | ❌        |
| wav      | ✅       | ❌        |
| webvtt   | ✅       | ❌        |
| srt      | ✅       | ❌        |
| ass      | ✅       | ❌        |
| ssa      | ✅       | ❌        |
| ttml     | ✅       | ❌        |

## Protocols

| Protocol | Input   | Output    |
| ---------| --------|-----------|
| hls      | ✅       | ❌        |
| dash     | ✅       | ❌        |
| rtmp     | ✅       | ❌        |
| rtsp     | ✅       | ❌        |

In the browser environment we cannot be used TCP and UDP, RTMP and RTSP need to use Websocket or WebTransport services to proxy TCP or UDP services.

## Decode Codecs

| codec       | baseline   | atomic     | simd        |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅ (Hardware Only) |
| vvc         | ✅         | ✅          | ✅          | ❌                 |
| av1         | ✅         | ✅          | ✅          | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅                 |
| mpeg1       | ✅         | ✅          | ✅          | ❌                 |
| mpeg2       | ✅         | ✅          | ✅          | ❌                 |
| mpeg4       | ✅         | ✅          | ✅          | ❌                 |
| theora      | ✅         | ✅          | ✅          | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅                 |
| opus        | ✅         | ✅          | ✅          | ✅                 |
| flac        | ✅         | ✅          | ✅          | ❌                 |
| speex       | ✅         | ✅          | ✅          | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ❌                 |
| dts         | ✅         | ✅          | ✅          | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ❌                 |

## Encode Codecs

| codec       | baseline   | atomic     | simd        |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅                 |
| hevc        | ❌         | ✅          | ✅          | ❌                 |
| vvc         | ❌         | ❌          | ❌          | ❌                 |
| av1         | ❌         | ✅          | ✅          | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅                 |
| mpeg4       | ✅         | ✅          | ✅          | ❌                 |
| theora      | ✅         | ✅          | ✅          | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ❌                 |
| opus        | ✅         | ✅          | ✅          | ✅                 |
| flac        | ✅         | ✅          | ✅          | ❌                 |
| speex       | ✅         | ✅          | ✅          | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ❌                 |
| dts         | ✅         | ✅          | ✅          | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ❌                 |