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

const player = new AVPlayer({
  container: document.querySelector('#player'),
  wasmBaseUrl: 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist'
})
await player.load('https://xxxxxxx')
await player.play()

```

`wasmBaseUrl` 指向包含 `decode`、`encode`、`resample` 等资源子目录的根路径，默认资源解析会选择匹配环境的 WASM 变体。也可以省略此选项，使用库默认的版本地址；生产部署请使用与库版本匹配的资源。RV10–RV40 使用 `decode/rv*.wasm`，Cook/SIPR 使用 `decode/ra*.wasm`。如果自定义 `getWasm`，需要覆盖这些编码以及 AAC、AC-3，不能只提供 H.264/AAC 分支。

RM/RMVB 支持 RV10–RV40 视频和 Cook、SIPR、AAC、AC-3 音频，可作为本地文件或 HTTP URL 输入。HTTP 跳转需要服务端支持 Range；不可定位的输入只能顺序播放。没有可用索引或目标超出索引覆盖范围时，首次远距离跳转可能需要从可信位置扫描补齐，不保证固定耗时。

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
播放器使用该回调而不使用 `wasmBaseUrl`，返回空值也不会自动回退。自定义回调需要将
`AV_CODEC_ID_WMV1`、`AV_CODEC_ID_WMV2`、`AV_CODEC_ID_WMV3`、`AV_CODEC_ID_VC1`
映射到 `wmv*.wasm`，WMA 系列映射到 `wma*.wasm`，并覆盖所需的音频处理组件。
部署这些文件时按运行环境选择对应版本；VC-1 没有单独的 `vc1.wasm`。
播放器 JS 和 WMV 组件需配套更新，旧组件可能不包含 VC-1；四种版本的构建方式见[编译文档](./compile-wasm.md)。

## ISO 播放

支持未加密的蓝光/DVD ISO，通过现有 `load()`、`play()`、`pause()`、`seek()` 和音轨切换 API 播放。本地 `File` 的 `.iso` 后缀忽略大小写；无后缀 HTTP(S) 链接使用 `ext: 'iso'`。不新增标题选择界面。

```javascript
// source 为 File 或 URL；鉴权等配置放在同一个 options.http 中。
const options = { ext: 'iso' }
await player.load(source, options)
const disc = player.getDiscInfo()
const chapters = player.getChapters()
await player.play()

// 指定另一标题时，保留原加载配置，重新加载同一来源后播放。
const nextTitle = disc?.titles.find((title) => title.id !== disc.titleId)
if (nextTitle) {
  await player.load(source, { ...options, iso: { titleId: nextTitle.id } })
  await player.play()
}
```

`getDiscInfo()` 返回 `{ type: 'bluray' | 'dvd', titleId, titles }`，其中每个标题包含 `id`、`name`、毫秒 `bigint` 时长 `duration` 和 `chapterCount`；非 ISO 返回 `null`。蓝光标题 ID 是五位 MPLS 编号（如 `00000`），DVD 标题 ID 是从 1 开始的编号字符串。章节使用 `getChapters()`，跳转使用毫秒 `bigint`（如 `await player.seek(60_000n)`）。

未指定标题时，对播放顺序和入出点完全相同的标题去重，选择有效视频标题中时长最长者，同长按编号升序。仍可显式选择重复标题的 ID。此规则不保证识别所有多版本光盘的正片。

DVD 支持单 PGC 标题和可解析的确定性导航：执行受支持的寄存器、条件及标题内跳转命令，菜单调用通过默认按钮命令解析回标题。按钮优先级为强制激活、强制选择、当前高亮、按钮 1；菜单语言使用第一个语言单元，不显示菜单画面。标题末尾返回菜单或转入另一标题视为结束。加载时将路径固定为有限片段序列并计算章节、时长，后续跳转不重放菜单命令。无法确定有限路径、不支持的指令或越界引用会明确报错。

读取层支持 ISO9660、UDF 1.02/2.50/2.60 的物理和元数据分区、非连续文件区段；按需读取，单次读取不超过 1 MiB，数据缓存上限 4 MiB，单个目录或导航文件限 16 MiB。支持多 M2TS、多 VOB/Cell、蓝光入出点裁剪及索引跳转。蓝光使用第一角度；不支持 DVD 交错角度单元、随机/多 PGC 标题、标题静止画面、交互式菜单、BD-J、解密、普通数据 ISO 浏览，以及 UDF 虚拟/可重映射分区和稀疏文件。跨片段轨道布局或编码类型变化也会报错。

网络 ISO **必须支持 HTTP Range**，返回匹配请求的 `206`、`Content-Range` 和确定且一致的总长度；不支持退回 `200 OK` 顺序下载。跨域响应需通过 `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges` 暴露响应头，预检需允许 `Range` 及调用方请求头。沿用 `http.headers`、`http.credentials`；携带凭据时服务端需允许具体来源及凭据。响应不能使用 gzip/br 等内容编码。无效标题、损坏、加密或不支持的结构会报错，不改播最大文件。调用方应处理 `load()`/`play()` 的拒绝及播放器 `error` 事件。

源码构建保留默认开启的 `ENABLE_DEMUXER_ISO`。ISO 使用解码/渲染管线，支持主线程、普通 Worker 和共享内存 Worker；音视频与字幕沿用已有能力，不新增图形字幕渲染器。部署更新后的播放器 JS 和对应编码所需的现有解码组件即可，无需额外 ISO Wasm 模块。

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

以下顺序读取回退不适用于 ISO；ISO 缺少 Range 能力会直接报错，不下载完整镜像。

其他输入中，服务器忽略 Range 并返回完整 `200 OK` 响应时，加载器会退回顺序读取，在跳转后重新从文件开头读取并丢弃目标之前的字节。此方式仍受封装格式和索引可用性的限制，而且可能显著增加流量和等待时间；需要高效跳转时，应让源站或 CDN 正确支持 Range。

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
