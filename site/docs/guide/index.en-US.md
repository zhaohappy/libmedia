---
nav: Guide
order: 1
group:
  title: Start
  order: 1
---

# Introduction

libmedia is a utility library for processing multimedia content—such as audio, video, and subtitles—on the web platform.

It consists of both a TypeScript module and a WebAssembly module, following a design principle where the TypeScript module orchestrates the overall logic. The media demuxing and muxing components are implemented in TypeScript, enabling asynchronous I/O for handling streams from any source. This architecture allows the system to run even in environments that do not support SharedArrayBuffer or Worker.

The decoding and encoding components reside in the WebAssembly module. These can be compiled from FFmpeg’s libavcodec module, with each codec (encoder or decoder) compiled into a separate .wasm module to avoid the problem of oversized C/C++ binaries. At runtime, you only need to load the specific codec modules required. Additionally, the codec layer can leverage the browser’s native WebCodecs API for performance and compatibility.

The API design of libmedia draws inspiration from FFmpeg. Many of its data structures—such as AVStream, AVCodecParameters, AVFormatContext, AVPacket, and AVFrame—are modeled after FFmpeg's conventions. This not only ensures familiarity for most developers in the audio/video domain but also adopts the proven and efficient architecture of an industry-standard framework. More importantly, it ensures that memory layout remains consistent between TypeScript and WebAssembly, enabling direct sharing of data structures across the two.

libmedia is designed with multi-threading in mind but can gracefully fall back to main-thread execution if necessary. This makes it well-suited for concurrent processing, which is especially beneficial for audio and video workloads. Developers can easily build multi-threaded workflows on top of it, improving overall performance and user experience.

## Advantages

- Cross Platform: Supports more browsers, mobile browsers, Electron, Node environments
- Low Cost: Almost all calculations are run on the client, greatly reducing server costs
- Privacy and Security: The user's data is read locally without uploading to the server
- High Performance: Designed on multiple threads with no data copy overhead, the overhead of interoperate with Wasm modules is negligible; and supports Webcodecs to use hardware codecs
- Comprehensive Codecs Support: Support video codecs H265, H264, H266, VP9, ​​VP8, AV1 and audio codecs AAC, MP3, FLAC, SPEEX, OPUS, G711
- Extend: Provides low-level APIs that can handle various usage scenarios, and can implement more complex business logic based on these low-level APIs
- Support Multiple Media Formats: Support mp4, mov, mpegts, flv, matroska, webm, mp3, ogg, flac, aac, wav packaging formats
- Support Multiple protocols: Support hls, dash, rtmp, rtsp protocols
- Powerful Tools: The player and transcoder are implemented internally for quick use

## Sponsor Author

If this project is helpful to you, scan the QR code to sponsor the author:

[Paypal.me](https://paypal.me/zhaohappylibmedia)

<img src="../../public/img/alipay-qcode.png" width="200" alt="alipay" />
<img src="../../public/img/wechat-qcode.png" width="200" alt="wechat-pay" />