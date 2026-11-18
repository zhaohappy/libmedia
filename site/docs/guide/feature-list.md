---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 6
---

# 功能清单

## 前言

libmedia 除了提供低级的 API 还提供了播放器工具和转码工具。详情查看[播放器](./player.md)、[转码](./transcode.md)。
libmedia 可以完成以下功能:

- 媒体文件解封装
- 音视频封装成文件
- 音视频解码
- 音视频编码
- 音视频渲染
- 音频重采样
- 音频变速变调
- 视频缩放
- 视频颜色格式转换
- 媒体封装格式转换
- 媒体数据编码转码
- 媒体文件音视频播放
- 媒体文件裁剪

## 封装格式

| Format   | Input   | Output    |
| ---------| --------|-----------|
| flv      | ✅       | ✅        |
| mov      | ✅       | ✅        |
| mp4      | ✅       | ✅        |
| mpegts   | ✅       | ✅        |
| mpegps   | ✅       | ❌        |
| iso (Blu-ray / DVD) | ✅ | ❌ |
| matroska | ✅       | ✅        |
| webm     | ✅       | ✅        |
| avi      | ✅       | ❌        |
| rm/rmvb  | ✅       | ❌        |
| asf / wmv / wma | ✅ | ❌ |
| h264 裸流 | ✅       | ✅        |
| hevc 裸流 | ✅       | ✅        |
| vvc  裸流 | ✅       | ✅        |
| mp3      | ✅       | ✅        |
| ogg      | ✅       | ✅        |
| ivf      | ✅       | ✅        |
| aac      | ✅       | ✅        |
| flac     | ✅       | ✅        |
| wav      | ✅       | ✅        |
| webvtt   | ✅       | ❌        |
| srt      | ✅       | ❌        |
| ass      | ✅       | ❌        |
| ssa      | ✅       | ❌        |
| ttml     | ✅       | ❌        |
| avif     | ✅       | ❌        |
| heif     | ✅       | ❌        |

RM/RMVB 支持播放及转码输入：RV10–RV40 视频，Cook、SIPR、AAC、AC-3 音频。支持本地文件和 HTTP Range 跳转；不支持 RM 输出、独立 `.ra`、Real 专用流媒体协议或其他 RealAudio 编码。

ASF 支持未加密的输入，不包含 DRM、MMS 或 WMV Image。部署与播放说明见[播放器](./player.md)。

ISO 支持未加密蓝光/DVD 标题和可确定路径的 DVD 默认按钮导航；网络来源必须支持 Range。不支持交互式菜单、BD-J 或解密。标题 API 与兼容范围见 [ISO 播放](./player.md#iso-播放)。

## 音视频协议

| Protocol | Input   | Output    |
| ---------| --------|-----------|
| hls      | ✅       | ❌        |
| dash     | ✅       | ❌        |
| rtmp     | ✅       | ❌        |
| rtsp     | ✅       | ❌        |

在浏览器环境中由于无法使用 tcp 和 udp，rtmp 和 rtsp 需要使用 Websocket 或 WebTransport 服务来代理 tcp 或 udp 服务。

## 解码器

| codec       | baseline   | atomic     | simd        |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅ (只支持硬解)      |
| vvc         | ✅         | ✅          | ✅          | ❌                 |
| av1         | ✅         | ✅          | ✅          | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅                 |
| mpeg1       | ✅         | ✅          | ✅          | ❌                 |
| mpeg2       | ✅         | ✅          | ✅          | ❌                 |
| mpeg4       | ✅         | ✅          | ✅          | ❌                 |
| theora      | ✅         | ✅          | ✅          | ❌                 |
| rv10–rv40   | ✅         | ✅          | ✅          | ❌                 |
| cook        | ✅         | ✅          | ✅          | ❌                 |
| sipr        | ✅         | ✅          | ✅          | ❌                 |
| wmv1/2/3 / vc1 | ✅      | ✅          | ✅          | ❌                 |
| wma         | ✅         | ✅          | ✅          | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅                 |
| opus        | ✅         | ✅          | ✅          | ✅                 |
| flac        | ✅         | ✅          | ✅          | ✅                 |
| speex       | ✅         | ✅          | ✅          | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ❌                 |
| dts         | ✅         | ✅          | ✅          | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ❌                 |

## 编码器

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
