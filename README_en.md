libmedia
======
English | [中文](README.md) | [Document](https://zhaohappy.github.io/libmedia/docs)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia) [![npm](https://img.shields.io/npm/v/@libmedia/avutil.svg?style=flat)](https://www.npmjs.com/settings/libmedia/packages)

### Introduction
 
libmedia is a utility library for processing multimedia content—such as audio, video, and subtitles—on the web platform.

It consists of both a TypeScript module and a WebAssembly module, following a design principle where the TypeScript module orchestrates the overall logic. The media demuxing and muxing components are implemented in TypeScript, enabling asynchronous I/O for handling streams from any source. This architecture allows the system to run even in environments that do not support SharedArrayBuffer or Worker.

The decoding and encoding components reside in the WebAssembly module. These can be compiled from FFmpeg’s libavcodec module, with each codec (encoder or decoder) compiled into a separate .wasm module to avoid the problem of oversized C/C++ binaries. At runtime, you only need to load the specific codec modules required. Additionally, the codec layer can leverage the browser’s native WebCodecs API for performance and compatibility.

The API design of libmedia draws inspiration from FFmpeg. Many of its data structures—such as AVStream, AVCodecParameters, AVFormatContext, AVPacket, and AVFrame—are modeled after FFmpeg's conventions. This not only ensures familiarity for most developers in the audio/video domain but also adopts the proven and efficient architecture of an industry-standard framework. More importantly, it ensures that memory layout remains consistent between TypeScript and WebAssembly, enabling direct sharing of data structures across the two.

libmedia is designed with multi-threading in mind but can gracefully fall back to main-thread execution if necessary. This makes it well-suited for concurrent processing, which is especially beneficial for audio and video workloads. Developers can easily build multi-threaded workflows on top of it, improving overall performance and user experience.


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

Codecs are compiled into individual WebAssembly modules, with decoders located in the dist/decode directory and encoders in the dist/encode directory. Each codec is provided in four versions: baseline, atomic, simd, and 64.

The baseline version corresponds to the MVP (Minimum Viable Product) feature set of WebAssembly, with the requirement for mutable globals support. It offers the widest compatibility across environments but comes with the lowest performance.

The atomic version adds support for atomic operations and the bulk memory instruction set, enabling better multithreading capabilities.

The simd version introduces SIMD vector instruction support, offering the highest performance among the available builds. Currently, SIMD optimization is handled automatically by the compiler, and the performance gains vary depending on the codec. As of now, there are no known codec implementations that have been manually optimized for WebAssembly SIMD, so further performance improvements may require custom tuning.

The 64 version uses the 64-bit WebAssembly instruction set (wasm64) and includes support for both atomic operations and SIMD. This version requires a runtime environment with wasm64 support, and libmedia must also be compiled in 64-bit mode. The other three versions are based on the standard 32-bit WebAssembly (wasm32) architecture.


#### Compatibility support status of four versions and Webcodecs

| environment    | baseline     | atomic     | simd         | 64          | webcodecs            |
| -----------    | -----------  |----------- | -----------  | ----------- | -----------          |
| Chrome         | 74+          | 75+        | 91+          | 133+        |94+                   |
| Firefox        | 61+          | 79+        | 89+          | N/A         |130+                  |
| Safari         | 13.4+        | 15+        | 16.4+        | N/A         |16.4+(video only)     |
| Wasmtime       | 0.20+        | 15+        | 15+          | N/A         |N/A                   |
| Wasmer         | 0.7+         | N/A        | N/A          | N/A         |N/A                   |
| Node.js        | 12.0+        | 16.4+      | 16.4+        | N/A         |N/A                   |
| Deno           | 0.1+         | 1.9+       | 1.9+         | N/A         |N/A                   |
| wasm2c         | 1.0.1+       | N/A        | N/A          | N/A         |N/A                   |


#### Supported decode codecs status

| codec       | baseline   | atomic     | simd        | 64            |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------   | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅            | ✅ (hardware only) |
| vvc         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| av1         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mpeg1       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| mpeg2       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| mpeg4       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| theora      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| opus        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| flac        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| speex       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| dts         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ✅            | ❌                 |

#### Supported encode codecs status

| codec       | baseline   | atomic     | simd        | 64            |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------   | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| hevc        | ❌         | ✅          | ✅          | ✅            | ❌                 |
| vvc         | ❌         | ❌          | ❌          | ❌            | ❌                 |
| av1         | ❌         | ✅          | ✅          | ✅            | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mpeg4       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| theora      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| opus        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| flac        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| speex       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| dts         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ✅            | ❌                 |

> X265 wasm encoder is special and cannot run in a non-multi-threaded environment

### License

libmedia uses the LGPL open source license. You need to comply with the license requirements. For details, see [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

But some dependent libraries are under GPL license. If you use these dependent libraries, libmedia will be infected with GPL license. These dependent libraries are used by the following components:

 - dist/encoder/x264.wasm
 - dist/encoder/x264-atomic.wasm
 - dist/encoder/x264-simd.wasm
 - dist/encoder/x264-64.wasm
 - dist/encoder/x265-atomic.wasm
 - dist/encoder/x265-simd.wasm
 - dist/encoder/x265-64.wasm

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