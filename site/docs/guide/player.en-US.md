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

## ISO playback

Unencrypted Blu-ray/DVD ISO images use the existing `load()`, `play()`, `pause()`, `seek()` and audio-track selection APIs. Local `File` extensions are case-insensitive; use `ext: 'iso'` for HTTP(S) URLs without a suffix. No title-selection UI is added.

```javascript
// source is a File or URL; keep authentication settings in options.http.
const options = { ext: 'iso' }
await player.load(source, options)
const disc = player.getDiscInfo()
const chapters = player.getChapters()
await player.play()

// Reload the same source with another title, preserving the original options.
const nextTitle = disc?.titles.find((title) => title.id !== disc.titleId)
if (nextTitle) {
  await player.load(source, { ...options, iso: { titleId: nextTitle.id } })
  await player.play()
}
```

`getDiscInfo()` returns `{ type: 'bluray' | 'dvd', titleId, titles }`. Each title has `id`, `name`, `duration` as a millisecond `bigint`, and `chapterCount`. Non-ISO inputs return `null`. Blu-ray IDs are five-digit MPLS numbers such as `00000`; DVD IDs are title-number strings starting at `1`. Chapters use `getChapters()` and seeks use millisecond `bigint` values, for example `await player.seek(60_000n)`.

Without an explicit title, identical playback sequences and in/out points are deduplicated, then the longest valid video title is selected, with numeric ID order breaking ties. Duplicate title IDs remain available for explicit selection. This rule cannot identify the main feature on every disc with multiple editions.

DVD support covers single-PGC titles and deterministic navigation using supported register operations, conditions and title-local jumps. Menu calls follow default button commands back into the title. Button priority is forced activation, forced selection, current highlight, then button 1; menus use the first language unit and are not displayed. A terminal return to a menu or jump to another title ends the current title. Loading compiles a finite segment sequence, duration and chapters; seeking does not replay menu commands. Indeterminate routes, unsupported instructions and out-of-bounds references fail explicitly.

The reader supports ISO9660 and UDF 1.02/2.50/2.60 physical and metadata partitions, including fragmented files. Reads are on demand, at most 1 MiB each, with a 4 MiB data cache and a 16 MiB limit per directory or navigation file. Multiple M2TS files, VOBs/Cells, Blu-ray in/out trimming and indexed seeking are supported. Blu-ray uses the first angle. DVD interleaved angles, random/multi-PGC titles, title still frames, interactive menus, BD-J, decryption, ordinary data ISO browsing, UDF virtual/sparable partitions and sparse files are unsupported. Changes to track layout or codec across segments also fail explicitly.

Network ISO sources **require HTTP Range** with matching `206` and `Content-Range` responses and a known, consistent total length. There is no sequential `200 OK` fallback. Cross-origin servers must expose headers with `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges` and allow `Range` and caller headers on preflight requests. Existing `http.headers` and `http.credentials` settings are preserved; credentialed requests require an explicit allowed origin and credentials support. Responses must not use gzip/br content encoding. Invalid titles, corruption, encryption and unsupported structures fail instead of selecting the largest file. Handle rejected `load()`/`play()` promises and player `error` events.

Keep the default `ENABLE_DEMUXER_ISO` enabled in source builds. ISO uses the decode/render pipeline in main-thread, ordinary Worker and shared-memory Worker modes. Existing codec and subtitle support applies; no graphical subtitle renderer is added. Deploy the updated player JS with the existing decoder modules required by the disc's codecs; no additional ISO Wasm module is needed.

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

The sequential fallback below does not apply to ISO: missing Range support is an error, and the full image is not downloaded.

For other inputs, if the server ignores Range and returns a complete `200 OK` response, the loader falls back to sequential reading. After a seek, it reads again from the start and discards bytes before the target offset. This still depends on container and index support and can substantially increase traffic and waiting time. Configure the origin or CDN to support Range correctly for efficient seeking.

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
