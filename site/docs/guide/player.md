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

## 点播跳转

加载媒体后，使用 `seek(timestamp)` 跳转，时间戳为毫秒单位的 `bigint`。应等待返回的 Promise，并处理失败：

```javascript
try {
  await player.seek(10_000n)
} catch (error) {
  console.error('跳转失败', error)
}
```

跳转尚未完成时可以再次调用 `seek()`；正在执行的跳转会继续，尚未执行的目标只保留最新一个。同一批调用的 Promise 在该批跳转结束后完成，不保证逐一到达所有中间目标。暂停时跳转仍保持暂停；播放结束后回跳到有效位置会恢复播放。

实际跳转失败时，Promise 会拒绝并触发 `ERROR`，该次失败不会触发 `SEEKED`。跳转中调用 `stop()` 会取消剩余目标，因此 Promise 完成也可能表示操作已停止，不能仅据此判断已到达目标。直播不支持跳转。

## HTTP 文件与 Range

HTTP 点播文件通过 `FetchIOLoader` 读取。服务器支持 Range 时，应返回有效的 `206 Partial Content` 和与请求范围匹配的 `Content-Range`，其中总长度必须是确定且一致的字节数。加载器会拒绝无效的范围响应，以及带非 `identity` 内容编码的 `206` 响应。跨域服务需允许浏览器读取 `Content-Range` 响应头。

服务器忽略 Range 并返回完整 `200 OK` 响应时，加载器会退回顺序读取，在跳转后重新从文件开头读取并丢弃目标之前的字节。此方式仍受封装格式和索引可用性的限制，而且可能显著增加流量和等待时间；需要高效跳转时，应让源站或 CDN 正确支持 Range。

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

- AVPlayer 的接口绝大多数都是异步的，通常应等待当前操作完成后再调用其他接口。跳转期间支持继续调用 `seek()` 更新目标，或调用 `stop()` 停止；连续跳转的语义见上文。

- wasm 文件建议托管到自己的 cdn 上，也可以使用示例里面的 ```cdn.jsdelivr.net``` cdn 的资源。查看[详情](./wasm.md#使用)
