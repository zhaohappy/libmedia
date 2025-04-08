
libmedia
======
中文 | [English](README_en.md) | [文档](https://zhaohappy.github.io/libmedia/docs)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia) [![npm](https://img.shields.io/npm/v/@libmedia/avutil.svg?style=flat)](https://www.npmjs.com/settings/libmedia/packages)

### 介绍
 
libmedia 是一个用于在 Web 平台上处理多媒体内容（如音频、视频、字幕）的工具库。

libmedia 有 TypeScript 模块和 WebAssembly 模块，并且设计理念上以 TypeScript 模块为主导；我们将音视频的封装解封装层放在 TypeScript 模块实现，这样就能使用异步 IO 来处理各种来源的流，可以让整个系统在非 SharedArrayBuffer 和非 Worker 环境上运行。

解码编码模块放入 WebAssembly 模块中，这些模块可以从 FFmpeg 的 libavcodec 模块中编译而来，并且将每种解码器和编码器编译成单独的 wasm 模块，解决编译产物太大的问题，使用的时候只需要去加载要使用的模块。同时编解码模块可以使用 WebCodecs。

libmedia 的 API 设计上参照 FFmpeg 设计，很多数据结构概念都是一致的，所以你能看见诸如 ```AVStream```、```AVCodecParameters```、```AVFormatContext```、```AVPacket```、```AVFrame``` 等数据结构。FFmpeg 作为音视频行业事实上的标准，其设计是非常优秀的；照着设计直接得到优秀的设计模式，还减少开发者学习理解的难度，毕竟做音视频开发的多少都对 FFmpeg 学习过；当然最主要的原因是我们需要让这些数据可以在 TypeScript 模块和 WebAssembly 模块中都可以进行读写操作，其在内存上的布局和 FFmpeg 保持一致是前提。

libmedia 是设计在多线程上的，只是可以回退到单线程上运行；所以对多线程开发比较亲和；开发者可以很优雅的基于此做多线程的开发，毕竟在音视频领域使用多线程带来的体验绝对要高出很多。


### 库

- ```avformat``` 音视频封装解封装库（flv、mp4、mpegts、matroska、ogg、mp3）
- ```avcodec``` 音视频编解码库，主要是 C/C++(FFmpeg 和其他编解码项目) 编译的 Wasm 和 Web 平台标准 WebCodecs
- ```audioresample``` 音频重采样（FFmpeg 音频重采样模块编译）
- ```audiostretchpitch``` 音频变速、变调处理（soundtouch 编译）
- ```videoscale``` 视频缩放，格式转换（FFmpeg libswscale 模块编译）
- ```avnetwork``` Web 平台网络文件 IO 相关（Fetch、WebSocket、WebTransport、File）
- ```avprotocol``` 音视频协议（dash、m3u8、rtp、rtsp、rtmp）
- ```avrender``` 音视频渲染（8bit、10bit、HDR、audioWorklet、WebGL、WebGPU）
- ```avpipeline``` 媒体任务处理管线，用于多线程并行化处理任务

### 多线程

libmedia 支持多线程，但需要页面可以使用 SharedArrayBuffer，你可以通过在顶层文档的响应头上添加以下两个响应头:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

来开启使用 SharedArrayBuffer，若不支持多线程将回退到主线程上运行。


### 工具

- AVPlayer 是 libmedia 的音视频播放器实现，支持软解、硬解、MSE；支持多种封装协议、多种编码格式。
[在线 demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)
[在线本地播放器](https://zhaohappy.github.io/libmedia/product/player/player.html)


- AVTranscoder 是 libmedia 的转码工具实现 
[在线 demo](https://zhaohappy.github.io/libmedia/test/avtranscoder.html)

### 当前支持的封装格式

| Format   | Input   | Output    |
| ---------| --------|-----------|
| flv      | ✅       | ✅        |
| mov      | ✅       | ✅        |
| mp4      | ✅       | ✅        |
| mpegts   | ✅       | ✅        |
| mpegps   | ✅       | ❌        |
| matroska | ✅       | ✅        |
| webm     | ✅       | ✅        |
| h264 裸流 | ✅       | ❌        |
| hevc 裸流 | ✅       | ❌        |
| vvc  裸流 | ✅       | ❌        |
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

### 当前支持的音视频协议

| Protocol | Input   | Output    |
| ---------| --------|-----------|
| hls      | ✅       | ❌        |
| dash     | ✅       | ❌        |
| rtmp     | ✅       | ❌        |
| rtsp     | ✅       | ❌        |


### 编解码器

编解码器被编译成了单独的 wasm 模块，解码器在 ```dist/decode``` 目录下，编码器在 ```dist/encode``` 目录下。编解码器的 wasm 模块有四个版本分别为 baseline、atomic、simd、64。baseline 版本是基准版本，指令集对应到 WebAssembly 的 MVP 版本，但需要支持 Mutable Globals，兼容性最高，性能最低；atomic 增加了 atomic 原子操作指令集和 Bulk Memory 指令集；simd 增加了 simd 向量加速指令集，性能最高。目前的 simd 版本是靠编译器自动优化的，不同的编解码器实现效果不同（目前没有看见过有针对 wasm 指令集做加速优化的开源项目，如果想要更高的加速效果需要自己优化，当前只有 h264 的 simd 解码器是手动优化的，也是性能最好的一个 wasm 模块）；64 是 64 位指令集，前面的三个版本都是 32 位，64 位指令集也包括 atomic 和 simd 指令集，需要在支持 wasm64 的环境下运行，并且 libmedia 也需要使用对应的 64 位编译的版本。

#### 四个版本和 webcodecs 的兼容性支持情况

| 环境            | baseline     | atomic     | simd         | 64          | webcodecs            |
| -----------    | -----------  |----------- | -----------  | ----------- | -----------          |
| Chrome         | 74+          | 75+        | 91+          | 133+        |94+                   |
| Firefox        | 61+          | 79+        | 89+          | N/A         |130+                  |
| Safari         | 13.4+        | 15+        | 16.4+        | N/A         |16.4+(video only)     |
| Wasmtime       | 0.20+        | 15+        | 15+          | N/A         |N/A                   |
| Wasmer         | 0.7+         | N/A        | N/A          | N/A         |N/A                   |
| Node.js        | 12.0+        | 16.4+      | 16.4+        | N/A         |N/A                   |
| Deno           | 0.1+         | 1.9+       | 1.9+         | N/A         |N/A                   |
| wasm2c         | 1.0.1+       | N/A        | N/A          | N/A         |N/A                   |


#### 目前支持的解码 codecs 支持情况

| codec       | baseline   | atomic     | simd        | 64            |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------   | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅            | ✅ (只支持硬解)      |
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

#### 目前支持的编码 codecs 支持情况

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

> x265 wasm 编码器比较特殊，无法在非多线程环境下运行

### 相关文章

[下一代 Web 音视频技术会是什么样的](./articles/下一代%20Web%20音视频技术会是什么样的.md)


### 开源协议

libmedia 使用 LGPL 开源协议，你需要遵守协议要求，详情查看 [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

但某些依赖库是 GPL 协议，如果你使用了这些依赖库则 libmedia 将被传染为 GPL 协议。这些依赖库使用在下面的组件:

 - dist/encoder/x264.wasm
 - dist/encoder/x264-atomic.wasm
 - dist/encoder/x264-simd.wasm
 - dist/encoder/x264-64.wasm
 - dist/encoder/x265-atomic.wasm
 - dist/encoder/x265-simd.wasm
 - dist/encoder/x265-64.wasm


#### 依赖库开源协议
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

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao

### 赞助作者

如果该项目对你有帮助，可以扫描二维码赞助作者:

<img src="./site/public/img/alipay-qcode.png" width=200 />
<img src="./site/public/img/wechat-qcode.png" width=200 />

加微信 ```zhaohappy_``` 备注 libmedia 加作者微信，后面人数到达一定数量之后会拉群交流。