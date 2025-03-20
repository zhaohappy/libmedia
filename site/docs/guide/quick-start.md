---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 2
---

# 快速上手

## 准备

libmedia 基于 cheap 库开发，在使用之前需要你对 [cheap](https://github.com/zhaohappy/cheap) 有所了解；需要能够理解 cheap 的开发思想，掌握指针的用法。如果你学过 C 语言则非常好上手。

## 安装依赖

:::code-group

```bash [npm]
npm install @libmedia/avutil
npm install @libmedia/avformat
npm install @libmedia/avcodec
```

```bash [pnpm]
pnpm add @libmedia/avutil
pnpm add @libmedia/avformat
pnpm add @libmedia/avcodec
```

```bash [yarn]
yarn add @libmedia/avutil
yarn add @libmedia/avformat
yarn add @libmedia/avcodec
```

:::

查看 [package](./package.md) 获取 ```@libmedia``` 下都有哪些包，你可以根据自己的需要进行安装。这其中 ```@libmedia/common```、 ```@libmedia/cheap``` ```@libmedia/avplayer``` ```@libmedia/avplayer-ui``` ```@libmedia/avtranscoder``` 五个包的版本号单独发布；其余包在发布时版本号会保持一致。如果项目依赖多个 ```@libmedia/*``` 下除上面所列的五个包，务必让它们的版本号保持一致。一般情况下 ```@libmedia/common``` 和 ```@libmedia/cheap``` 两个包无需自己安装，它们作为其他包的依赖会自动安装。

每个包都同时拥有 es6 模块和 commonjs 模块；es6 模块给浏览器环境使用，commonjs 模块给 Node 环境使用。当你使用 import 导入的是 es6 模块，使用 require 导入的是 commonjs 模块。若你的运行环境是 Node 环境而源码使用的是 es6 模块开发，需要编译成 commonjs 模块代码在 Node 中运行。

## 设置 tsconfig.json

如果项目使用 TypeScript 开发设置 tsconfig.json 如下:

```json
{
  "baseUrl": "./",
  "paths": {
    ...
    "@libmedia/common/*": ["node_modules/@libmedia/common/dist/esm/*"],
    "@libmedia/cheap/*": ["node_modules/@libmedia/cheap/dist/esm/*"],
    "@libmedia/avcodec/*": ["node_modules/@libmedia/avcodec/dist/esm/*"],
    "@libmedia/avformat/*": ["node_modules/@libmedia/avformat/dist/esm/*"],
    "@libmedia/avnetwork/*": ["node_modules/@libmedia/avnetwork/dist/esm/*"],
    "@libmedia/avplayer/*": ["node_modules/@libmedia/avplayer/dist/esm/*"],
    "@libmedia/avprotocol/*": ["node_modules/@libmedia/avprotocol/dist/esm/*"],
    "@libmedia/avrender/*": ["node_modules/@libmedia/avrender/dist/esm/*"],
    "@libmedia/audiostretchpitch/*": ["node_modules/@libmedia/audiostretchpitch/dist/esm/*"],
    "@libmedia/audioresample/*": ["node_modules/@libmedia/audioresample/dist/esm/*"],
    "@libmedia/avpipeline/*": ["node_modules/@libmedia/avpipeline/dist/esm/*"],
    "@libmedia/avtranscode/*": ["node_modules/@libmedia/avtranscode/dist/esm/*"],
    "@libmedia/avutil/*": ["node_modules/@libmedia/avutil/dist/esm/*"],
    "@libmedia/videoscale/*": ["node_modules/@libmedia/videoscale/dist/esm/*"],
    "@libmedia/avfilter/*": ["node_modules/@libmedia/avfilter/dist/esm/*"]
  },
  "files": [
    "node_modules/@libmedia/cheap/dist/esm/cheapdef.d.ts"
  ]
}
```

主要是 ```paths``` 设置和 ```files``` 设置。```paths``` 根据自己的使用情况配置无需全部配置；

**```isolatedModules``` 不能设置为 true, libmedia 下面有很多 const enum 类型**

## 编译配置

libmedia 推荐使用 TypeScript 开发；若项目使用 JavaScript 开发则不能访问 libmedia 中的指针类型，此时你需要使用到一些[技巧](./javascript.md)来访问指针数据。

使用 TypeScript 开发需要对编译打包工具进行配置。核心是配置 tsc 使用 cheap 的 transformer 插件。

:::code-group

```javascript [webpack]
const path = require('path');
const transformer = require('@libmedia/cheap/build/transformer');
module.exports = (env) => {
  return {
    module: {
      rules: [
        {
          test: /\.ts?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                ...
                getCustomTransformers: function(program) {
                  return {
                    before: [transformer.before(program)]
                  }
                },
                ...
              }
            }
          ]
        }
      ],
    }
  }
}
```

```javascript [vite]

import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import transformer from '@libmedia/cheap/build/transformer';

export default defineConfig({
  ...
  plugins: [
    typescript({
      // 配置使用的 tsconfig.json 配置文件
      // include 中需要包含要处理的文件
      tsconfig: './tsconfig.json',
      ...
      transformers: {
        before: [
          {
            type: 'program',
            factory: (program) => {
              return transformer.before(program)
            }
          }
        ]
      },
      ...
    })
  ],
});
```

```javascript [rollup]

import typescript from '@rollup/plugin-typescript';
import transformer from '@libmedia/cheap/build/transformer'

export default {
  ...
  plugins: [
    typescript({
      // 配置使用的 tsconfig.json 配置文件
      // include 中需要包含要处理的文件
      tsconfig: './tsconfig.json',
      ...
      transformers: {
        before: [
          {
            type: 'program',
            factory: (program) => {
              return transformer.before(program)
            }
          }
        ]
      },
      ...
    }),
  ]
};

```

:::

**```vite``` 和 ```rollup``` 可能还需要依赖 tslib 库，这个是 ```@rollup/plugin-typescript``` 插件的依赖，如果报错需要这个库请自己安装**

:::code-group

```bash [npm]
npm install tslib
```

```bash [pnpm]
pnpm add tslib
```

```bash [yarn]
yarn add tslib
```

:::


> vite 默认使用 esbuild 来编译 ts，但 esbuild 是不支持 transformer 的，所以需要使用 tsc 来编译使用到 libmedia API 的模块。你可以通过设置 typescript 插件的 tsconfig 中 src 配置来控制哪些文件经过 typescript 插件使用 transformer 来编译，建议将相关文件放到一个目录下。

## webpack 插件

cheap 目前有 webpack 插件可以使用，如果你的构建工具使用的是 webpack，推荐你使用插件。用法如下:

```javascript
const path = require('path');
const CheapPlugin = require('@libmedia/cheap/build/webpack/CheapPlugin');
module.exports = (env) => {
  return {
    ...
    rules: [
      {
        test: /\.ts?$/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ],
    plugins: [
      new CheapPlugin({
        env: 'browser',
        projectPath: __dirname
      })
    ]
  }
}
```

## Node 编译

开发 Node 项目往往只需要编译而不用打包，所以一般情况下不需要使用 webpack 或 vite 等构建工具；只需要使用 tsc 编译工具，但官方的 tsc 命令无法使用 transformer。此时需要编写代码来编译。

```javascript

const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const transformer = require('@libmedia/cheap/build/transformer')

// 读取 tsconfig.json 配置，更改为自己的 tsconfig.json 的路径
const configPath = path.resolve(__dirname, './tsconfig.json')
const configText = fs.readFileSync(configPath, 'utf8')
const { config } = ts.parseConfigFileTextToJson(configPath, configText)
const parsedCommandLine = ts.parseJsonConfigFileContent(
  config,
  ts.sys,
  path.dirname(configPath)
)
const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options)
const emitResult = program.emit(undefined, undefined, undefined, undefined, {
  before: [
    transformer.before(program, {
      defined: {
        ENV_NODE: true
      }
    })
  ]
})
// 打印错误
const allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics)

allDiagnostics.forEach((diagnostic) => {
  if (diagnostic.file) {
    const { line, character } =
      diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    );
    console.log(
      `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
    );
  } else {
    console.log(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    );
  }
})
```