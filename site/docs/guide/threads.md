---
nav:
  title: 指南
  order: 2
group:
  title: 开始
order: 5
---

# 开启多线程

## 开启

libmedia 支持多线程，但需要页面可以使用 SharedArrayBuffer，你可以通过在顶层文档的响应头上添加以下两个响应头:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

来开启使用 SharedArrayBuffer，若不支持多线程将回退到主线程上运行。

## 使用

多线程编程需要你根据自己的编译打包工具配置 worker 处理，下面以 @libmedia/avpipeline/DemuxPipeline.ts 举个例子:

首先我们需要单独建一个 ts 文件 ```worker.ts``` 作为 worker 的入口

```javascript
import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'
import runThread from '@libmedia/cheap/thread/runThread'
runThread(DemuxPipeline)
```

然后在主文件中使用:

:::code-group

```javascript [vite]

import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'
import DemuxPipelineWorker from './worker?worker'

const pipeline = await createThreadFromClass(
  DemuxPipeline,
  DemuxPipelineWorker
).run()
```

```javascript [webpack]

import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'
import DemuxPipelineWorker from 'worker-loader!./worker'

const pipeline = await createThreadFromClass(
  DemuxPipeline,
  DemuxPipelineWorker
).run()
```


```javascript [node]

import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'
import { Worker } from 'worker_threads'

const pipeline = await createThreadFromClass(
  DemuxPipeline,
  () => new Worker(require.resolve('./worker'))
).run()
```

:::

如果你使用 vite 进行打包，针对 worker 需要添加配置如下:


```javascript [vite]

import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import transformer from '@libmedia/cheap/build/transformer';

export default defineConfig({
  ...
  worker: {
    plugins: () => {
      return [
        typescript({
          ...
          transformers: {
            before: [
              {
                type: 'program',
                factory: (program) => {
                  return transformer.before(program);
                }
              }
            ]
          }
          ...
        }),
      ]
    }
  }
  ...
});
```

## webpack 中使用多线程

如果你是使用的 webpack 来构建项目，推荐使用 webpack 插件来编译，如何配置查看[配置](./quick-start.md#webpack-插件)。这样开启多线程更加简单，不需要单独写一个 worker 的入口文件；并且多线程的代码不会单独分成独立的文件，运行时通过动态生成代码来创建 worker。

```javascript

import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'

const pipeline = await createThreadFromClass(
  DemuxPipeline
).run()
```