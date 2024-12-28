---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 7
---

# Player

## Introduction

AVPlayer is an audio and video player implementation of libmedia, supporting software decoding, hardware decoding, MSE; supporting multiple encapsulation protocols and multiple encoding formats.

The player has [AVPlayer](./package.md#libmediaavplayer) without UI and [AVPlayerUI](./package.md#libmediaavplayer-ui) with UI. You can choose the corresponding module according to your needs.

[Online demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)

[Online local player](https://zhaohappy.github.io/libmedia/product/player/player.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avplayer_AVPlayer.AVPlayer.html)

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
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/@libmedia/avplayer/dist/esm/[0-9]*.avplayer.js',
            to: './[name].[ext]'
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
export default defineConfig({
  ...
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@libmedia/avplayer/dist/esm/[0-9]*.avplayer.js',
          dest: './',
        },
      ],
    })
  ],
});
```
:::

AVPlayerUI configuration is also the same as above.

## Usage


```html
<div id="player"></div>
```

```javascript

import AVPlayer from '@libmedia/avplayer'
import { AVCodecID } from '@libmedia/avutil/codec'

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

## Development

```shell

# Clone the project and all submodules
git clone https://github.com/zhaohappy/libmedia.git --recursive

# Enter the libmedia directory
cd libmedia

# Install dependencies
npm install

# Compile AVPlayer development version
npm run build-avplayer-dev

# Start local http service
# Any http service will do. If edp is not found, you can install it globally: npm install edp -g
edp webserver start --port=9000

# Browser access http://localhost:9000/test/avplayer.html

```

To debug the code in multi-threaded Worker, set the ```ENABLE_THREADS_SPLIT``` macro in ```tsconfig.json``` to ```true``` and recompile

```json
{
"cheap": {
  "defined": {
    "ENABLE_THREADS_SPLIT": true
  }
}
}
```

```tsconfig.json``` You can also set other macros to tailor the compilation. You can change the relevant settings according to your needs. For details, see Configuration in ```tsconfig.json``` -> ```cheap``` -> ```defined```

## Notes

- Most of AVPlayer's interfaces are asynchronous. You need to ensure the interface call sequence yourself. You cannot call another interface before one interface is executed. The only exception is that the stop interface can be called in the seeking state.

- It is recommended to host the wasm file on your own CDN, or you can use the ```cdn.jsdelivr.net``` CDN resources in the example. See [Details](./wasm.md#Use)