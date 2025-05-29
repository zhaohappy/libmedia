---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 9
---

# 转码器

## 介绍

AVTranscoder 是 libmedia 的转码工具实现。

[在线 demo](https://zhaohappy.github.io/libmedia/test/avtranscoder.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avtranscoder_AVTranscoder.AVTranscoder.html)

## 安装

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

## 配置

AVTranscoder 包是经过打包编译的，除了主文件还拥有一些动态模块文件。你需要配置你的构建工具将这些动态模块文件拷贝到输出目录。

:::code-group

```javascript [webpack]
// webpack 可以使用 copy-webpack-plugin 插件
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

// vite 可以使用 vite-plugin-static-copy 插件
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

## 使用

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

## 注意事项

- wasm 文件建议托管到自己的 cdn 上，也可以使用示例里面的 ```cdn.jsdelivr.net``` cdn 的资源，查看[详情](./wasm.md#使用)