---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 9
---

# AVTranscoder

## Introduction

AVTranscoder is a transcoding tool implemented by libmedia.

[Online demo](https://zhaohappy.github.io/libmedia/test/avtranscoder.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avtranscoder_AVTranscoder.AVTranscoder.html)

## Installation

:::code-group

```bash [npm]
npm install @libmedia/avtranscoder
```

```bash [pnpm]
pnpm add @libmedia/avtranscoder
```

```bash [yarn]
yarn add @libmedia/avtranscoder
```

:::

## Configuration

AVTranscoder package is compiled and packaged, and has some dynamic module files in addition to the main file. You need to configure your build tool to copy these dynamic module files to the output directory.

:::code-group

```javascript [webpack]
// webpack can use the copy-webpack-plugin plugin
// npm install copy-webpack-plugin --save-dev
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env) => {
  return {
    resolve: {
      alias: {
       '@libmedia/avtranscoder': path.resolve(__dirname, 'node_modules/@libmedia/avtranscoder/dist/umd/avtranscoder.js')
      }
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/@libmedia/avtranscoder/dist/esm/[0-9]*.avtranscoder.js',
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
  {
    ...
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@libmedia/avtranscoder/dist/esm/[0-9]*.avtranscoder.js',
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
      { from: './node_modules/@libmedia/avtranscoder/dist/umd/[0-9]*.avtranscoder.js', to: 'static/js/[name][ext]' },
    ],
  },
  resolve: {
    alias: {
      '@libmedia/avtranscoder': './node_modules/@libmedia/avtranscoder/dist/umd/avtranscoder.js',
    },
  },
})
```

:::

## Usage

```javascript

import AVTranscoder from '@libmedia/avtranscoder'
import { AVCodecID } from '@libmedia/avutil/codec'

const player = new AVTranscoder({
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
      case 'encoder': {
        switch (codecId) {
          case AVCodecID.AV_CODEC_ID_AAC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/encode/aac-simd.wasm`
          case AVCodecID.AV_CODEC_ID_MP3:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/encode/mp3-simd.wasm`
          case AVCodecID.AV_CODEC_ID_FLAC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/encode/flac-simd.wasm`
          case AVCodecID.AV_CODEC_ID_H264:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/encode/h264-simd.wasm`
          case AVCodecID.AV_CODEC_ID_HEVC:
            return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/encode/hevc-simd.wasm`
        }
      }
      case 'resampler':
        return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/resample/resample-simd.wasm`
      case 'stretchpitcher':
        return `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/stretchpitch/stretchpitch-simd.wasm`
       case 'scaler':
        return 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist/scale/scale-simd.wasm'
    }
  }
})

await transcoder.ready()

transcoder.on('task-ended', (taskId) => {
  console.log('task', taskId, 'transcode ended')
})

transcoder.addTask({
  input: {
    'https://xxxxx.flv'
  },
  output: {
    file: writeFileHandler,
    format: 'mp4',
    audio: {
      codec: 'copy'
    },
    video: {
      codec: 'copy'
    }
  }
}).then((taskId) => {
  transcoder.startTask(taskId)
})

```

## Notes

- It is recommended to host the wasm file on your own cdn, or you can use the ```cdn.jsdelivr.net``` cdn resources in the example, see [Details](./wasm.md#Use)