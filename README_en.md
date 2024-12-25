libmedia
======
English | [中文](README.md) | [Document](https://zhaohappy.github.io/libmedia/docs)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia) [![npm](https://img.shields.io/npm/v/@libmedia/avutil.svg?style=flat)](https://www.npmjs.com/settings/libmedia/packages)

### Introduction
 
libmedia is a tool library for processing multimedia content (such as audio, video, subtitles) on the web platform.

libmedia has typescript module and webAssembly module, and the design concept is all things dominated by typescript module; we implemented the module of media demux and mux in typescript, so that we can use asynchronous IO to process stream from anywhere. This allows the entire system to run on a non-SharedArrayBuffer or non-Worker environment.

The decoding and encoding modules are put into the webAssembly module. These modules can be compiled from the libavcodec module of FFmpeg, and each decoder and encoder is compiled into a separate wasm module to solve the problem of too large of compiled c/c++ product. When using it, you only need to load the modules you want to use. At the same time, the codec module also can use web's WebCodecs.

The api design of libmedia refers to the FFmpeg. Many data structure concepts are consistent, so you can see data structures such as ```AVStream```, ```AVCodecParameters```, ```AVFormatContext```, ```AVPacket```, ```AVFrame``` etc. As the de facto standards in the media industry, FFmpeg's design is very excellent, following the design, we can directly obtain excellent design patterns, and it also reduces the difficulty for developers to learn and understand. After all, most audio and video developers have learned about FFmpeg. Of course, the main reason is that we need to make this data can read and write in both typescript modules and webAssembly modules, the struct layout in memory must is consistent with FFmpeg.

libmedia is designed to run on multi-threads, but can fallback to running on the main thread; so it is more friendly to multi-threaded development; developers can easy do multi-threaded development based on this, After all, processing video and audio with multi-threads will bring a better experience.


### Libraries

- ```avformat``` video and audio format libraries(flv、mp4、mpegts、matroska、ogg、mp3)
- avcodec Audio and video codec library, mainly Wasm compiled by C/C++ (FFmpeg and other codec projects) and Web platform standard WebCodecs
- ```audioresample``` Audio resampling (compiled by FFmpeg audio resampling module)
- ```audiostretchpitch``` Audio speed change and pitch change processing (compiled by soundtouch)
- ```videoscale``` video scale, format transform（compiled by FFmpeg libswscale）
- ```avnetwork``` Web Platform network file IO related (Fetch, WebSocket, WebTransport, File)
- ```avprotocol``` Audio and video protocols (dash, m3u8、rtp、rtsp、rtmp)
- ```avrender``` Audio and video rendering (8bit, 10bit, HDR, audioWorklet, WebGL, WebGPU)
- ```avpipeline``` Media task processing pipeline for multi-threaded parallel processing tasks

### Multi-threads

libmedia supports multi-threading, but the page needs to use SharedArrayBuffer. You can add the following two response headers to the response header of the top-level document to enable use of SharedArrayBuffer:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

if multi-threading is not supported, it will fall back to running on the main thread.


### Tools

- AVPlayer is libmedia's audio and video player implementation, supporting software decoding, hardware decoding, and MSE; it supports multiple encapsulation protocols and multiple encoding formats.
[online demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)
[online player](https://zhaohappy.github.io/libmedia/product/player/player.html)


- AVTranscoder is the transcoding tool implementation of libmedia
[online demo](https://zhaohappy.github.io/libmedia/test/avtranscoder.html)

### Formats

| Format   | Input   | Output    |
| ---------| --------|-----------|
| flv      | ✅       | ✅        |
| mov      | ✅       | ✅        |
| mp4      | ✅       | ✅        |
| mpegts   | ✅       | ✅        |
| mpegps   | ✅       | ❌        |
| matroska | ✅       | ✅        |
| webm     | ✅       | ✅        |
| h264     | ✅       | ❌        |
| hevc     | ✅       | ❌        |
| vvc      | ✅       | ❌        |
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

### Protocol

| Protocol | Input   | Output    |
| ---------| --------|-----------|
| hls      | ✅       | ❌        |
| dash     | ✅       | ❌        |
| rtmp     | ✅       | ❌        |
| rtsp     | ✅       | ❌        |

### Codecs

Codecs are compiled into separate wasm modules, the decoders are in the ```dist/decode``` directory, and the encoders are in the ```dist/encode``` directory. There are three versions of the encoding and decoding wasm module: baseline, atomic, and simd. The baseline version's instruction set corresponds to the MVP version of WebAssembly, but it needs to support Mutable Globals, with the highest compatibility and the lowest performance; atomic version add the atomic operation instruction set and Bulk memory instruction set; simd version add the simd vector acceleration instruction set, has the highest performance. The current simd version is automatically optimized by the compiler, and different codecs have different effects (currently I have not seen any codec projects has optimized for the wasm simd instruction set. If you want higher acceleration effects, you may want to optimize by yourself).


#### Compatibility support status of three versions and Webcodecs

| environment    | baseline     | atomic     | simd         | webcodecs            |
| -----------    | -----------  |----------- | -----------  | -----------          |
| Chrome         | 74+          | 75+        | 91+          |94+                   |
| Firefox        | 61+          | 79+        | 89+          |130+                  |
| Safari         | 13.4+        | 15+        | 16.4+        |16.4+(video only)     |
| Wasmtime       | 0.20+        | 15+        | 15+          |N/A                   |
| Wasmer         | 0.7+         | N/A        | N/A          |N/A                   |
| Node.js        | 12.0+        | 16.4+      | 16.4+        |N/A                   |
| Deno           | 0.1+         | 1.9+       | 1.9+         |N/A                   |
| wasm2c         | 1.0.1+       | N/A        | N/A          |N/A                   |


#### Supported decode codecs status

| codec       | baseline   | atomic     | simd        |  webcodecs(Chrome)|
| ----------- | -----------|----------- | ----------- | -----------       |
| h264        | ✅         | ✅          | ✅          | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅ (hardware only) |
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

#### Supported encode codecs status

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

### License

libmedia uses the LGPL open source license. You need to comply with the license requirements. For details, see [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

But some dependent libraries are under GPL license. If you use these dependent libraries, libmedia will be infected with GPL license. These dependent libraries are used by the following components:

 - dist/encoder/x264.wasm
 - dist/encoder/x264-atomic.wasm
 - dist/encoder/x264-simd.wasm
 - dist/encoder/x265-atomic.wasm
 - dist/encoder/x265-simd.wasm

#### Dependencies Licence
 - [ffmpeg](https://github.com/FFmpeg/FFmpeg): LGPL v2.1+
 - [soundtouch](https://www.surina.net/soundtouch/): LGPL v2.1
 - [openh264](https://github.com/cisco/openh264): BSD-2-Clause
 - [x264](https://www.videolan.org/developers/x264.html): GPL
 - [x265](https://www.videolan.org/developers/x265.html): GPL
 - [theora](https://github.com/xiph/theora): BSD-3-Clause
 - [vorbis](https://xiph.org/vorbis/): based BSD
 - [speex](https://www.speex.org/): revised BSD 
 - [opus](https://opus-codec.org/): BSD-3-Clause
 - [libvpx](https://chromium.googlesource.com/webm/libvpx/): BSD-3-Clause
 - [libogg](https://github.com/gcp/libogg): BSD-3-Clause
 - [lame](https://lame.sourceforge.io/): LGPL
 - [kvazaar](https://github.com/ultravideo/kvazaar): BSD-3-Clause
 - [flac](https://github.com/xiph/flac): BSD-3-Clause
 - [fdkaac](https://www.linuxfromscratch.org/blfs/view/svn/multimedia/fdk-aac.html): based BSD
 - [dav1d](https://code.videolan.org/videolan/dav1d/): BSD-2-Clause
 - [aom](https://aomedia.googlesource.com/aom/): BSD-2-Clause
 - [hls-parser](https://github.com/kuu/hls-parser): MIT
 - [sdp-transform](https://github.com/clux/sdp-transform): MIT
 - [ass.js](https://github.com/weizhenye/ASS): MIT
 - [ass-compiler](https://github.com/weizhenye/ass-compiler): MIT
 - [yox](https://github.com/yoxjs/yox): MIT

Copyright (C) 2024-present, Gaoxing Zhao

### Sponsor Author

If this project is helpful to you, scan the QR code to sponsor the author:

[Paypal.me](https://paypal.me/zhaohappylibmedia)