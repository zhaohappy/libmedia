---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 8
---

# AVPlayer

## Introduction

AVPlayer is an audio and video player implementation of libmedia, supporting software decoding, hardware decoding, MSE; supporting multiple encapsulation protocols and multiple encoding formats.

The player has [AVPlayer](./package.md#libmediaavplayer) without UI and [AVPlayerUI](./package.md#libmediaavplayer-ui) with UI. You can choose the corresponding module according to your needs.

[Online demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)

[Online local player](https://zhaohappy.github.io/libmedia/product/player/player.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avplayer_src_AVPlayer.AVPlayer.html)

## Installation

:::code-group

```bash [npm]
npm install @libmedia/avplayer
```

```bash [pnpm]
pnpm add @libmedia/avplayer
```

```bash [yarn]
yarn add @libmedia/avplayer
```

:::

:::code-group

```bash [npm]
npm install @libmedia/avplayer-ui
```

```bash [pnpm]
pnpm add @libmedia/avplayer-ui
```

```bash [yarn]
yarn add @libmedia/avplayer-ui
```

:::

## Configuration

AVPlayer and AVPlayerUI packages are compiled and packaged, and have some dynamic module files in addition to the main file. You need to configure your build tool to copy these dynamic module files to the output directory.

:::code-group

```javascript [webpack]
// webpack can use the copy-webpack-plugin plugin
// npm install copy-webpack-plugin --save-dev
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env) => {
  return {
    resolve: {
      alias: {
       '@libmedia/avplayer': path.resolve(__dirname, 'node_modules/@libmedia/avplayer/dist/umd/avplayer.js')
      }
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/@libmedia/avplayer/dist/umd/[0-9]*.avplayer.js',
            to: './[name][ext]'
          }
        ],
      })
    ]
  }
}
```

```javascript [vite]

// vite can use the vite-plugin-static-copy plugin
// npm install vite-plugin-static-copy --save-dev
import { viteStaticCopy } from 'vite-plugin-static-copy'
export default defineConfig((config) => {
  return {
    ...
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@libmedia/avplayer/dist/esm/[0-9]*.avplayer.js',
            dest: config.command === 'serve' ? './node_modules/.vite/deps/' : './assets/',
          },
        ],
      })
    ],
  }
});
```

```javascript [rsbuild]
import { defineConfig } from "@rsbuild/core"

export default defineConfig({
  output: {
    copy: [
      { from: './node_modules/@libmedia/avplayer/dist/umd/[0-9]*.avplayer.js', to: 'static/js/[name][ext]' },
    ],
  },
  resolve: {
    alias: {
      '@libmedia/avplayer': './node_modules/@libmedia/avplayer/dist/umd/avplayer.js',
    },
  },
})
```
:::

AVPlayerUI configuration is also the same as above.

## Usage


```html
<div id="player"></div>
```

```javascript

import AVPlayer from '@libmedia/avplayer'
import { AVCodecID } from '@libmedia/avutil'

const player = new AVPlayer({
  container: document.querySelector('#player'),
  getWasm: (type, codecId, mediaType) => {
    switch (type) {
      case 'decoder': {
        switch (codecId) {
          case AVCodecID.AV_CODEC_ID_AAC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode/aac-simd.wasm`
          case AVCodecID.AV_CODEC_ID_MP3:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode/mp3-simd.wasm`
          case AVCodecID.AV_CODEC_ID_FLAC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode/flac-simd.wasm`
          case AVCodecID.AV_CODEC_ID_H264:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode/h264-simd.wasm`
          case AVCodecID.AV_CODEC_ID_HEVC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/decode/hevc-simd.wasm`
          case AVCodecID.AV_CODEC_ID_WMV1:
          case AVCodecID.AV_CODEC_ID_WMV2:
          case AVCodecID.AV_CODEC_ID_WMV3:
          case AVCodecID.AV_CODEC_ID_VC1:
            return `/dist/decode/wmv-simd.wasm`
          case AVCodecID.AV_CODEC_ID_WMAV1:
          case AVCodecID.AV_CODEC_ID_WMAV2:
          case AVCodecID.AV_CODEC_ID_WMAPRO:
          case AVCodecID.AV_CODEC_ID_WMALOSSLESS:
          case AVCodecID.AV_CODEC_ID_WMAVOICE:
            return `/dist/decode/wma-simd.wasm`
        }
      }
      case 'resampler':
        return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/resample/resample-simd.wasm`
      case 'stretchpitcher':
        return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/stretchpitch/stretchpitch-simd.wasm`
    }
  }
})
await player.load('https://xxxxxxx')
await player.play()

```

## WMV / ASF playback

Unencrypted `.wmv`, `.asf` and `.wma` files use the existing `load`, `play`, `pause`
and `seek` APIs, with Wasm decoding for WMV1/2/3, VC-1 and WMA. Local `File` objects
and HTTP inputs are supported. HTTP seeking requires Range support; non-seekable
inputs support sequential playback only. DRM, MMS, WMV Image and ASF output are
not supported. Keep the default `ENABLE_DEMUXER_ASF` enabled in custom source builds.

Deploy the updated Wasm assets under `/dist`, including `decode/wmv*.wasm`,
`decode/wma*.wasm` and the required resampling and time-stretching modules.
The built-in mapping selects a compatible variant:

```javascript
const player = new AVPlayer({
  container: document.querySelector('#player'),
  wasmBaseUrl: '/dist'
})
await player.load('/media/example.wmv') // Or a File from a file picker
await player.play()
```

`wasmBaseUrl` points to the parent of `decode`, not `/dist/decode`. If `getWasm` is
provided, it takes precedence over `wasmBaseUrl`; returning an empty value does
not fall back to the built-in mapping. The custom callback example above loads
local `wmv-simd.wasm` for WMV/VC-1 and `wma-simd.wasm` for WMA. Deploy those files
first and select the appropriate variant for the runtime. There is no separate
`vc1.wasm`. Update the player JS and WMV modules together, as older modules may
lack VC-1. See the [build guide](./compile-wasm.en-US.md) for all four variants.

## rtsp and rtmp

rtmp and rtsp need to use WebSocket or WebTransport proxy tcp connection, avplayer use as follows:

```javascript

const player = new AVPlayer()

// The first parameter is the rtmp proxy of Websocket Address
player.load('rtmp://xxx.xxx.xxx.xxx/xxx/xxx', {
  // uri is the source rtmp address
  uri: 'rtmp://xxx.xxx.xxx.xxx/xxx/xxx'
})
player.play()

player.load('rtsp://xxx.xxx.xxx.xxx/xxx')
player.play()

// Use wss connection
player.load('rtsp://xxx.xxx.xxx.xxx/xxx')
// Use ws connection
player.load('rtsp+ws://xxx.xxx.xxx.xxx/xxx')
// Use webtransport connection
player.load('rtsp+webtransport://xxx.xxx.xxx.xxx/xxx')

```

## Notes

- Most of AVPlayer's interfaces are asynchronous. You need to ensure the interface call sequence yourself. You cannot call another interface before one interface is executed. The only exception is that the stop interface can be called in the seeking state.

- It is recommended to host the wasm file on your own CDN, or you can use the ```cdn.jsdelivr.net``` CDN resources in the example. See [Details](./wasm.en-US.md#usage)
