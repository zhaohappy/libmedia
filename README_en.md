libmedia
======
English | [中文](README.md)

![](https://img.shields.io/badge/language-typescript-blue.svg) [![](https://img.shields.io/badge/base-cheap-green.svg)](https://github.com/zhaohappy/cheap) ![](https://img.shields.io/badge/feature-thread-red.svg) ![license](https://img.shields.io/github/license/zhaohappy/libmedia)

### Introduction
 
libmedia is a tool library for processing multimedia content (such as audio, video, subtitles) on the web platform.

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

### Docs

Stay tuned

### Start

If you want to integrate this project for development, it is recommended to use this warehouse as a sub-module. The project uses the [cheap](https://github.com/zhaohappy/cheap) library, which requires you to have some understanding of the use of cheap.

Currently, this project only supports using webpack for compilation and packaging.

Here's how to compile the AVPlayer tool

```shell

# Clone the project and all submodules
git clone git@github.com:zhaohappy/libmedia.git --recursive

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

```test/avplayer.html``` is an example of using AVPlayer and also the implementation of online demo.

```test/avtranscode.html``` is a transcoding example involving the usage of decapsulation and encapsulation

### License

libmedia uses the LGPL open source license. You need to comply with the license requirements. For details, see [LGPL](https://github.com/zhaohappy/libmedia/blob/master/COPYING.LGPLv3)

Copyright (C) 2024-present, Gaoxing Zhao