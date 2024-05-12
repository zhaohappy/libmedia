libmedia
======
English | [中文](README.md)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia)

### Introduction
 
libmedia is a tool library for processing multimedia content (such as audio, video, subtitles) on the web platform.

### Background

Currently, if you want to process media data on the Web platform, using the ffmpeg.wasm project is a good choice; but it still has many shortcomings:

1. The first thing to bear the brunt is its efficiency problem. I once tried to convert a 200M file from flv format to mp4 format and it took 10 minutes (the same file only took 1 second using libmedia). This did not involve the conversion of the encoding layer. If you re-encode the video and audio, it will be even slower. This is completely impossible to make a project with a good experience based on it;

2. The API provided by ffmpeg.wasm is based on the native ffmpeg command line and does not have an ffmpeg API level interface, which greatly limits flexibility;

3. The compiled output file is too large, which affects the loading speed and makes it difficult for you to optimize it;

4. It can only be used on pages where SharedArrayBuffer is enabled. Currently, most websites do not support the SharedArrayBuffer environment;

libmedia is designed to try to solve the above problems.

libmedia has typescript module and webAssembly module, and the design concept is dominated by typescript module; we implement the audio and video demux and mux layer in typescript module, so that we can use asynchronous IO to process streams from various sources and avoid ffmpeg's problems caused by synchronous IO. This allows the entire system to run on a non-SharedArrayBuffer environment;

The decoding and encoding modules are put into the webAssembly module. These modules can be compiled from the libavcodec module of ffmpeg, and each decoder and encoder is compiled into a separate wasm module to solve the problem of too large a compiled product. When using it, only You need to load the modules you want to use.

The api design of libmedia refers to the design of ffmpeg. Many data structure concepts are consistent, so you can see data structures such as ```AVStream```, ```AVCodecParameters```, ```AVFormatContext```, ```AVPacket```, ```AVFrame```, etc. As the de facto standard in the audio and video industry, ffmpeg's design is very excellent; following the design, we can directly obtain excellent design patterns, and it also reduces the difficulty for developers to learn and understand. After all, most audio and video developers have learned about ffmpeg; of course, the main reason is that we need to make this data readable and writable in both typescript modules and webAssembly modules. The prerequisite is that its layout in memory is consistent with ffmpeg.

libmedia is designed to run on multi-threads, but can fall back to running on a single thread; so it is more friendly to multi-threaded development; developers can do multi-threaded development based on this very elegantly, after all, multi-threading is used in the audio and video field The experience is definitely much higher.


### Libraries

- ```avformat``` video and audio format libraries(flv、mp4、mpegts、matroska、mp3)
- avcodec Audio and video codec library, mainly Wasm compiled by C/C++ (FFmpeg and other codec projects) and Web platform standard WebCodecs
- ```audioresample``` Audio resampling (compiled by FFmpeg audio resampling module)
- ```audiostretchpitch``` Audio speed change and pitch change processing (compiled by soundtouch)
- ```avnetwork``` Web Platform network file IO related (Fetch, WebSocket, WebTransport, File)
- ```avprotocol``` Audio and video protocols (dash, m3u8)
- ```avrender``` Audio and video rendering (8bit, 10bit, HDR, audioWorklet, WebGL, WebGPU)
- ```avpipeline``` Media task processing pipeline for multi-threaded parallel processing tasks

### Multi-threaded

libmedia supports multi-threading, but the page needs to use SharedArrayBuffer. You can add the following two response headers to the response header of the top-level document:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

To enable the use of SharedArrayBuffer, if multi-threading is not supported, it will fall back to running on the main thread.


### Tools

- AVPlayer is libmedia's audio and video player implementation, supporting soft decoding, hard decoding, and MSE; it supports multiple encapsulation protocols and multiple encoding formats.[online demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)


- AVTranscode is the transcoding tool implementation of libmedia, which is not yet implemented.

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

### Start

If you want to integrate this project for development, it is recommended to use this warehouse as a sub-module. The project uses the [cheap](https://github.com/zhaohappy/cheap) library, which requires you to have some understanding of the use of cheap.

Currently, this project only supports using webpack for compilation and packaging.

Here's how to compile the AVPlayer tool

```shell

# Clone the project and all submodules
git clone git@github.com:zhaohappy/libmedia.git --recursive

# enter libmedia directory
cd libmedia

# Install dependencies
npm install

# Compile AVPlayer with development mode
npm run build-avplayer-dev

# Start local http service
# Any http service will do. If it reports that edp cannot be found, you can install it globally use: npm install edp -g
edp webserver start --port=9000

# use browser access http://localhost:9000/test/avplayer.html

```

To debug the code in multi-threaded Worker from source, set the ```ENABLE_THREADS_SPLIT``` macro in ```tsconfig.json``` to ```true``` and recompile AVPlayer

```json
{
  "cheap": {
    "defined": {
      "ENABLE_THREADS_SPLIT": true
    }
  }
}
```

```tsconfig.json``` can also set other macros to tailor compilation. You can change the relevant settings according to your own needs. For details, see ```tsconfig.json``` -> ```cheap``` -> Configuration in ```defined```

### Example

```examples/demux.ts``` is an example of demux

```examples/mux.ts``` is an example of mux

```examples/decode.ts``` is an example of decode

```test/avplayer.html``` is an example of using AVPlayer and also the implementation of online demo.

```test/avtranscode.html``` is a transcoding example involving the usage of demux and mux

### License

libmedia uses the LGPL open source license. You need to comply with the license requirements. For details, see [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

Copyright (C) 2024-present, Gaoxing Zhao