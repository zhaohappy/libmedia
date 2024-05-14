
libmedia
======
中文 | [English](README_en.md)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia)

### 介绍
 
libmedia 是一个用于在 Web 平台上处理多媒体内容（如音频、视频、字幕）的工具库。

### 背景

目前想在 Web 平台上处理音视频使用 ffmpeg.wasm 项目是一个不错的选择；但其还是有很多缺陷：

1. 首当其冲的是其效率问题，我曾经试过使用 ffmpeg.wasm 将一个 200M 的文件从 flv 格式转成 mp4 格式使用了 10 分钟（同样的文件使用 libmedia 只需要 1 秒），这还不涉及编码层的转换，若是重新解码编码那更慢了。这完全无法基于其做出一个体验很好的项目；

2. ffmpeg.wasm 提供的 API 基于 native ffmpeg 命令行，没有 ffmpeg API 级别的接口，大大限制了灵活性；

3. 编译输出文件太大，影响加载速度并且你很难去优化它；

4. 只能在开启 SharedArrayBuffer 的页面上使用，目前绝大多数网站都是没有支持 SharedArrayBuffer 环境的；


libmedia 就是为了尝试解决上面的问题而设计的。

libmedia 有 TypeScript 模块和 WebAssembly 模块，并且设计理念上以 TypeScript 模块为主导；我们将音视频的封装解封装层放在 TypeScript 模块实现，这样就能使用异步 IO 来处理各种来源的流，规避 ffmpeg 中的同步 IO 所带来的问题。这样可以让整个系统在非 SharedArrayBuffer 环境上运行；

解码编码模块放入 WebAssembly 模块中，这些模块可以从 ffmpeg 的 libavcodec 模块中编译而来，并且将每种解码器和编码器编译成单独的 wasm 模块，解决编译产物太大的问题，使用的时候只需要去加载要使用的模块。

libmedia 的 API 设计上参照 ffmpeg 设计，很多数据结构概念都是一致的，所以你能看见诸如 ```AVStream```、```AVCodecParameters```、```AVFormatContext```、```AVPacket```、```AVFrame``` 等数据结构。ffmpeg 作为音视频行业事实上的标准，其设计是非常优秀的；照着设计直接得到优秀的设计模式，还减少开发者学习理解的难度，毕竟做音视频开发的多少都对 ffmpeg 学习过；当然最主要的原因是我们需要让这些数据可以在 TypeScript 模块和 WebAssembly 模块中都可以进行读写操作，其在内存上的布局和 ffmpeg 保持一致是前提。

libmedia 是设计在多线程上的，只是可以回退到单线程上运行；所以对多线程开发比较亲和；开发者可以很优雅的基于此做多线程的开发，毕竟在音视频领域使用多线程带来的体验绝对要高出很多。


### 库

- ```avformat``` 音视频封装解封装库（flv、mp4、mpegts、matroska、mp3）
- ```avcodec``` 音视频编解码库，主要是 C/C++(FFmpeg 和其他编解码项目) 编译的 Wasm 和 Web 平台标准 WebCodecs
- ```audioresample``` 音频重采样（FFmpeg 音频重采样模块编译）
- ```audiostretchpitch``` 音频变速、变调处理（soundtouch 编译）
- ```avnetwork``` Web 平台网络文件 IO 相关（Fetch、WebSocket、WebTransport、File）
- ```avprotocol``` 音视频协议（dash、m3u8）
- ```avrender``` 音视频渲染（8bit、10bit、HDR、audioWorklet、WebGL、WebGPU）
- ```avpipeline``` 媒体任务处理管线，用于多线程并行化处理任务

### 多线程

libmedia 支持多线程，但需要页面可以使用 SharedArrayBuffer，你可以通过在顶层文档的响应头上添加以下两个响应头:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

来开启使用 SharedArrayBuffer，若不支持多线程将回退到主线程上运行。


### 工具

- AVPlayer 是 libmedia 的音视频播放器实现，支持软解、硬解、MSE；支持多种封装协议、多种编码格式。[在线 demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)


- AVTranscode 是 libmedia 的转码工具实现，目前还未实现

### API

#### avformat

- [AVStream ](./docs/avformat/AVStream/README.md)
- [AVFormatContext](./docs/avformat/AVFormatContext/README.md)
- [demux](./docs/avformat/demux/README.md)
- [mux](./docs/avformat/mux/README.md)

- IFormat
  - [IFlvFormat](./docs/avformat/formats/IFlvFormat/README.md)
  - [IIvfFormat](./docs/avformat/formats/IIvfFormat/README.md)
  - [IMatroskaFormat](./docs/avformat/formats/IMatroskaFormat/README.md)
  - [IMovFormat](./docs/avformat/formats/IMovFormat/README.md)
  - [IMp3Format](./docs/avformat/formats/IMp3Format/README.md)
  - [IMpegtsFormat](./docs/avformat/formats/IMpegtsFormat/README.md)
  - [IOggsFormat](./docs/avformat/formats/IOggsFormat/README.md)

- OFormat
  - [OFlvFormat](./docs/avformat/formats/OFlvFormat/README.md)
  - [OIvfFormat](./docs/avformat/formats/OIvfFormat/README.md)
  - [OMatroskaFormat](./docs/avformat/formats/OMatroskaFormat/README.md)
  - [OMovFormat](./docs/avformat/formats/OMovFormat/README.md)
  - [OMp3Format](./docs/avformat/formats/OMp3Format/README.md)
  - [OMpegtsFormat](./docs/avformat/formats/OMpegtsFormat/README.md)
  - [OOggsFormat](./docs/avformat/formats/OOggsFormat/README.md)


#### avcodec

- [WasmAudioDecoder](./docs/avcodec/wasmcodec/AudioDecoder/README.md)
- [WasmVideoDecoder](./docs/avcodec/wasmcodec/VideoDecoder/README.md)
- [WebVideoDecoder](./docs/avcodec/webcodec/VideoDecoder/README.md)

#### avpipeline

- [IOPipeline](./docs/avpipeline/IOPipeline/README.md)
- [DemuxPipeline](./docs/avpipeline/DemuxPipeline/README.md)
- [AudioDecodePipeline](./docs/avpipeline/AudioDecodePipeline/README.md)
- [AudioRenderPipeline](./docs/avpipeline/AudioRenderPipeline/README.md)
- [VideoDecodePipeline](./docs/avpipeline/VideoDecodePipeline/README.md)
- [VideoRenderPipeline](./docs/avpipeline/VideoRenderPipeline/README.md)

#### avnetwork

- [FetchIOLoader](./docs/avnetwork/ioLoader/FetchIOLoader/README.md)
- [FileIOLoader](./docs/avnetwork/ioLoader/FileIOLoader/README.md)
- [DashIOLoader](./docs/avnetwork/ioLoader/DashIOLoader/README.md)
- [HlsIOLoader](./docs/avnetwork/ioLoader/HlsIOLoader/README.md)

#### avplayer

- [AVPlayer](./docs/avplayer/AVPlayer/README.md)

#### avutil

- struct

  - [AVBuffer](./docs/avutil/struct/avbuffer/README.md)
  - [AVCodecParameters](./docs/avutil/struct/avcodecparameters/README.md)
  - [AVFrame](./docs/avutil/struct/avframe/README.md)
  - [AVPacket](./docs/avutil/struct/avpacket/README.md)
  - [AVPCMBuffer](./docs/avutil/struct/avpcmbuffer/README.md)

- util

  - [avbuffer](./docs/avutil/util/avbuffer/README.md)
  - [avframe](./docs/avutil/util/avframe/README.md)
  - [avpacket](./docs/avutil/util/avpacket/README.md)
  - [avcodecparameters](./docs/avutil/util/codecparameters/README.md)

#### io 组件

- [BitReader](./docs/common/io/BitReader/README.md)
- [BitWriter](./docs/common/io/BitWriter/README.md)
- [BufferReader](./docs/common/io/BufferReader/README.md)
- [BufferWriter](./docs/common/io/BufferWriter/README.md)
- [IOReader](./docs/common/io/IOReader/README.md)
- [IOReaderSync](./docs/common/io/IOReaderSync/README.md)
- [IOWriter](./docs/common/io/IOWriter/README.md)
- [IOWriterSync](./docs/common/io/IOWriterSync/README.md)
- [SafeFileIO](./docs/common/io/SafeFileIO/README.md)

### 开发

若你想集成此项目来开发，建议将本仓库作为子模块，项目使用了 [cheap](https://github.com/zhaohappy/cheap) 库，需要你对 cheap 的使用有所了解。凡是使用了 libmedia API 的地方都需要使用 cheap 插件来编译。

当前本项目只支持使用 webpack 进行编译打包

下面介绍如何编译 AVPlayer 工具

```shell

# 克隆项目以及所有子模块
git clone https://github.com/zhaohappy/libmedia.git --recursive

# 进入 libmedia 目录
cd libmedia

# 安装依赖
npm install

# 编译 AVPlayer 开发版
npm run build-avplayer-dev

# 启动本地 http 服务
# 任何一个 http 服务都行，若报 edp 找不到，可以全局安装: npm install edp -g
edp webserver start --port=9000

# 浏览器访问 http://localhost:9000/test/avplayer.html

```

若要源码调试多线程 Worker 中的代码，设置 ```tsconfig.json``` 中```ENABLE_THREADS_SPLIT```宏为 ```true```并重新编译 AVPlayer

```json
{
  "cheap": {
    "defined": {
      "ENABLE_THREADS_SPLIT": true
    }
  }
}
```

```tsconfig.json``` 还可设置其他宏来裁剪编译，你可以根据自己的需要更改相关设置，详情看 ```tsconfig.json``` -> ```cheap``` -> ```defined``` 中的配置

### 示例

```examples/demux.ts``` 是解封装的使用示例

```examples/mux.ts``` 是封装的使用示例

```examples/decode.ts``` 是解码的使用示例

```test/avplayer.html``` 是 AVPlayer 的使用示例，也是在线 demo 的实现

```test/avtranscode.html``` 是一个转码示例，涉及到解封装和封装的用法

### 相关文章

[下一代 Web 音视频技术会是什么样的](./articles/下一代%20Web%20音视频技术会是什么样的.md)


### 开源协议

libmedia 使用 LGPL 开源协议，你需要遵守协议要求，详情查看 [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao
