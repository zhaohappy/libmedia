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

[API](https://zhaohappy.github.io/libmedia/docs/libmedia_api/classes/avtranscoder_src_AVTranscoder.AVTranscoder.html)

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

`wasmBaseUrl` 指向包含 `decode`、`encode`、`resample` 等资源子目录的根路径，默认资源解析会选择匹配环境的 WASM 变体。也可以省略此选项，使用库默认的版本地址；生产部署请使用与库版本匹配的资源。RV10–RV40 使用 `decode/rv*.wasm`，Cook/SIPR 使用 `decode/ra*.wasm`。如果自定义 `getWasm`，需要覆盖这些编码以及 AAC、AC-3，不能只提供 H.264/AAC 分支。

RM/RMVB 支持 RV10–RV40 视频和 Cook、SIPR、AAC、AC-3 音频，可作为本地文件或 HTTP URL 输入。HTTP 跳转需要服务端支持 Range；不可定位的输入只能顺序播放。没有可用索引或目标超出索引覆盖范围时，首次远距离跳转可能需要从可信位置扫描补齐，不保证固定耗时。

上例将 RMVB 转为 H.264/AAC MP4；`writeFileHandler` 由调用方提供，用于写入输出文件。RM/RMVB 仅支持输入，不支持输出；RV/Cook/SIPR 转 MP4 时应重新编码，不能直接使用 `copy`。

## 注意事项

- wasm 文件建议托管到自己的 cdn 上，也可以使用示例里面的 ```cdn.jsdelivr.net``` cdn 的资源，查看[详情](./wasm.md#使用)