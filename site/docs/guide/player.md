---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 8
---

# 播放器

## 介绍

AVPlayer 是 libmedia 的音视频播放器实现，支持软解、硬解、MSE；支持多种封装协议、多种编码格式。

播放器有不带 UI 的 [AVPlayer](./package.md#libmediaavplayer) 和带 UI 的 [AVPlayerUI](./package.md#libmediaavplayer-ui)。你可以根据自己的需求选择相应的模块。

[在线 demo](https://zhaohappy.github.io/libmedia/test/avplayer.html)

[在线本地播放器](https://zhaohappy.github.io/libmedia/product/player/player.html)

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avplayer_src_AVPlayer.AVPlayer.html)

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

AVPlayer 和 AVPlayerUI 包是经过打包编译的，除了主文件还拥有一些动态模块文件。你需要配置你的构建工具将这些动态模块文件拷贝到输出目录。注意必须和 avplayer.js 主文件打包所在的那个 js 在同一个目录。

:::code-group

```javascript [webpack]
// webpack 可以使用 copy-webpack-plugin 插件
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
// vite 可以使用 vite-plugin-static-copy 插件
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

AVPlayerUI 配置也同上。

## 使用

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

## WMV / ASF 播放

未加密的 `.wmv`、`.asf` 和 `.wma` 使用现有 `load`、`play`、`pause`、`seek` 接口，
通过 Wasm 解码 WMV1/2/3、VC-1 和 WMA。支持本地 `File` 和 HTTP 输入；HTTP seek
需要服务器支持 Range，不可寻址输入仅支持顺序播放。不支持 DRM、MMS、WMV Image 或 ASF 输出。
从源码裁剪构建时，保留默认开启的 `ENABLE_DEMUXER_ASF`。

将更新后的 Wasm 资源部署到站点的 `/dist`，包括 `decode/wmv*.wasm`、`decode/wma*.wasm`
以及所需的重采样、变速组件。可以使用内置映射自动选择兼容版本：

```javascript
const player = new AVPlayer({
  container: document.querySelector('#player'),
  wasmBaseUrl: '/dist'
})
await player.load('/media/example.wmv') // 也可以传入文件选择器返回的 File
await player.play()
```

`wasmBaseUrl` 指向 `decode` 的父目录，不是 `/dist/decode`。如果配置了 `getWasm`，
播放器使用该回调而不使用 `wasmBaseUrl`，返回空值也不会自动回退。上面的自定义回调示例中，
WMV/VC-1 和 WMA 分别加载本地的 `wmv-simd.wasm` 和 `wma-simd.wasm`；需先部署这些文件，
并按运行环境选择对应版本。VC-1 没有单独的 `vc1.wasm`。
播放器 JS 和 WMV 组件需配套更新，旧组件可能不包含 VC-1；四种版本的构建方式见[编译文档](./compile-wasm.md)。

## rtsp 和 rtmp

rtmp 和 rtsp 需要使用 WebSocket 或 WebTransport 代理 tcp 连接，avplayer 使用如下:

```javascript

const player = new AVPlayer()

// 第一个参数是 Websocket 代理的 rtmp 地址
player.load('rtmp://xxx.xxx.xxx.xxx/xxx/xxx', {
  // uri 是源 rtmp 地址
  uri: 'rtmp://xxx.xxx.xxx.xxx/xxx/xxx'
})
player.play()

player.load('rtsp://xxx.xxx.xxx.xxx/xxx')
player.play()

// 使用 wss 连接
player.load('rtsp://xxx.xxx.xxx.xxx/xxx')
// 使用 ws 连接
player.load('rtsp+ws://xxx.xxx.xxx.xxx/xxx')
// 使用 webtransport 连接
player.load('rtsp+webtransport://xxx.xxx.xxx.xxx/xxx')

```

## 注意事项

- AVPlayer 的接口绝大多数都是异步的，你需要自己确保接口调用时序，不能某个接口还未执行完成就调另一个接口。唯一的例外是 seeking 状态下可以调用 stop 接口。

- wasm 文件建议托管到自己的 cdn 上，也可以使用示例里面的 ```cdn.jsdelivr.net``` cdn 的资源。查看[详情](./wasm.md#使用)
