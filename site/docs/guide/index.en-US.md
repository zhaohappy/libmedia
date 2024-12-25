---
nav: Guide
order: 1
group:
  title: Start
  order: 1
---

# Introduction

libmedia is a tool library for processing multimedia content (such as audio, video, subtitles) on the web platform.

libmedia has typescript module and webAssembly module, and the design concept is all things dominated by typescript module; we implemented the module of media demux and mux in typescript, so that we can use asynchronous IO to process stream from anywhere. This allows the entire system to run on a non-SharedArrayBuffer or non-Worker environment.

The decoding and encoding modules are put into the webAssembly module. These modules can be compiled from the libavcodec module of FFmpeg, and each decoder and encoder is compiled into a separate wasm module to solve the problem of too large of compiled c/c++ product. When using it, you only need to load the modules you want to use. At the same time, the codec module also can use web's WebCodecs.

The api design of libmedia refers to the FFmpeg. Many data structure concepts are consistent, so you can see data structures such as ```AVStream```, ```AVCodecParameters```, ```AVFormatContext```, ```AVPacket```, ```AVFrame``` etc. As the de facto standards in the media industry, FFmpeg's design is very excellent, following the design, we can directly obtain excellent design patterns, and it also reduces the difficulty for developers to learn and understand. After all, most audio and video developers have learned about FFmpeg. Of course, the main reason is that we need to make this data can read and write in both typescript modules and webAssembly modules, the struct layout in memory must is consistent with FFmpeg.

libmedia is designed to run on multi-threads, but can fallback to running on the main thread; so it is more friendly to multi-threaded development; developers can easy do multi-threaded development based on this, After all, processing video and audio with multi-threads will bring a better experience.

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