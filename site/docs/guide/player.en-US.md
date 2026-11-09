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

const player = new AVPlayer({
  container: document.querySelector('#player'),
  wasmBaseUrl: 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist'
})
await player.load('https://xxxxxxx')
await player.play()

```

`wasmBaseUrl` is the root containing resource directories such as `decode`, `encode` and `resample`. The default resolver selects the WASM variant for the environment. You can omit this option to use the library's default versioned URL; use resources matching the library version in production. RV10–RV40 use `decode/rv*.wasm`, and Cook/SIPR use `decode/ra*.wasm`. A custom `getWasm` must cover these codecs as well as AAC and AC-3, rather than only H.264/AAC.

RM/RMVB accepts local files and HTTP URLs with RV10–RV40 video and Cook, SIPR, AAC or AC-3 audio. HTTP seeking requires server support for Range requests; nonseekable inputs support sequential playback only. If indexes are unavailable or do not cover the target, an initial distant seek may scan forward from a trusted position and has no fixed latency guarantee.

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
not fall back to the built-in mapping. Custom callbacks must map
`AV_CODEC_ID_WMV1`, `AV_CODEC_ID_WMV2`, `AV_CODEC_ID_WMV3` and `AV_CODEC_ID_VC1`
to `wmv*.wasm`, the WMA codecs to `wma*.wasm`, and cover the required audio
processing modules. Deploy the appropriate variants for the runtime. There is no
separate `vc1.wasm`. Update the player JS and WMV modules together, as older modules may
lack VC-1. See the [build guide](./compile-wasm.en-US.md) for all four variants.

## Seeking in on-demand media

After loading media, use `seek(timestamp)` with a `bigint` timestamp in milliseconds. Await the returned Promise and handle failures:

```javascript
try {
  await player.seek(10_000n)
} catch (error) {
  console.error('Seek failed', error)
}
```

You can call `seek()` again while a seek is pending. The active seek continues, and only the latest queued target is retained. Promises for the same batch settle when that batch finishes; intermediate targets are not guaranteed to be visited. Seeking while paused preserves the paused state. Seeking back to a valid position after playback ends resumes playback.

If an actual seek fails, its Promise rejects and `ERROR` fires; the failed seek does not emit `SEEKED`. Calling `stop()` during seeking cancels the remaining targets, so a settled Promise can also mean the operation was stopped. Do not use Promise completion alone as proof that the target was reached. Live streams do not support seeking.

## HTTP files and Range

HTTP on-demand files are read through `FetchIOLoader`. A server supporting Range should return a valid `206 Partial Content` response with a `Content-Range` matching the requested range and a known, consistent total byte length. The loader rejects invalid range responses and `206` responses with a content encoding other than `identity`. Cross-origin servers must expose the `Content-Range` response header to the browser.

If the server ignores Range and returns a complete `200 OK` response, the loader falls back to sequential reading. After a seek, it reads again from the start and discards bytes before the target offset. This still depends on container and index support and can substantially increase traffic and waiting time. Configure the origin or CDN to support Range correctly for efficient seeking.

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

- Most AVPlayer interfaces are asynchronous. Usually, await the current operation before calling another interface. During a seek, you may call `seek()` again to update the target or `stop()` to stop playback. See the overlapping seek behavior above.

- It is recommended to host the wasm file on your own CDN, or you can use the ```cdn.jsdelivr.net``` CDN resources in the example. See [Details](./wasm.en-US.md#usage)
