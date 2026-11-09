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

- It is recommended to host the wasm file on your own CDN, or you can use the ```cdn.jsdelivr.net``` CDN resources in the example. See [Details](./wasm.md#Use)