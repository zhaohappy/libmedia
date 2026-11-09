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

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avtranscoder_src_AVTranscoder.AVTranscoder.html)

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

const transcoder = new AVTranscoder({
  wasmBaseUrl: 'https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@latest/dist'
})

await transcoder.ready()

transcoder.on('task-ended', (taskId) => {
  console.log('task', taskId, 'transcode ended')
})

transcoder.addTask({
  input: {
    file: 'https://example.com/video.rmvb'
  },
  output: {
    file: writeFileHandler,
    format: 'mp4',
    audio: {
      codec: 'aac'
    },
    video: {
      codec: 'h264'
    }
  }
}).then((taskId) => {
  transcoder.startTask(taskId)
})

```

`wasmBaseUrl` is the root containing resource directories such as `decode`, `encode` and `resample`. The default resolver selects the WASM variant for the environment. You can omit this option to use the library's default versioned URL; use resources matching the library version in production. RV10–RV40 use `decode/rv*.wasm`, and Cook/SIPR use `decode/ra*.wasm`. A custom `getWasm` must cover these codecs as well as AAC and AC-3, rather than only H.264/AAC.

RM/RMVB accepts local files and HTTP URLs with RV10–RV40 video and Cook, SIPR, AAC or AC-3 audio. HTTP seeking requires server support for Range requests; nonseekable inputs support sequential playback only. If indexes are unavailable or do not cover the target, an initial distant seek may scan forward from a trusted position and has no fixed latency guarantee.

This example transcodes RMVB to H.264/AAC MP4. Supply `writeFileHandler` to write the output file. RM/RMVB is input-only; RM output is not supported. Re-encode RV/Cook/SIPR when converting to MP4 instead of using `copy`.

## Notes

- It is recommended to host the wasm file on your own cdn, or you can use the ```cdn.jsdelivr.net``` cdn resources in the example, see [Details](./wasm.md#Use)