---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 7
---

# 播放器

## 介绍

AVPlayer 是 libmedia 的音视频播放器实现，支持软解、硬解、MSE；支持多种封装协议、多种编码格式。

播放器有不带 UI 的 [AVPlayer](./package.md#libmediaavplayer) 和带 UI 的 [AVPlayerUI](./package.md#libmediaavplayer-ui)。你可以根据自己的需求选择相应的模块。

[在线 demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)

[在线本地播放器](https://zhaohappy.github.io/libmedia/product/player/player.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avplayer_AVPlayer.AVPlayer.html)

## 安装

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

## 配置

AVPlayer 和 AVPlayerUI 包是经过打包编译的，除了主文件还拥有一些动态模块文件。你需要配置你的构建工具将这些动态模块文件拷贝到输出目录。

:::code-group

```javascript [webpack]
// webpack 可以使用 copy-webpack-plugin 插件
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

// vite 可以使用 vite-plugin-static-copy 插件
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

AVPlayerUI 配置也同上。

## 使用

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

## 注意事项

- AVPlayer 的接口绝大多数都是异步的，你需要自己确保接口调用时序，不能某个接口还未执行完成就调另一个接口。唯一的例外是 seeking 状态下可以调用 stop 接口。

- wasm 文件建议托管到自己的 cdn 上，也可以使用示例里面的 ```cdn.jsdelivr.net``` cdn 的资源。查看[详情](./wasm.md#使用)