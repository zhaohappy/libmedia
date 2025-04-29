---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 5
---

# Enable Threads

## Enable

libmedia supports multi-threading, but the page needs to use SharedArrayBuffer. You can add the following two response headers to the response header of the top-level document to enable use of SharedArrayBuffer:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

if multi-threading is not supported, it will fall back to running on the main thread.

## Usage

Multi-Threads programming requires you to configure worker processing according to your own compilation and packaging tools. The following is an example of @libmedia/avpipeline/DemuxPipeline.ts:

First, we need to create a separate ts file ```worker.ts``` as the entry point of the worker

```javascript
import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'
import runThread from '@libmedia/cheap/thread/runThread'
runThread(DemuxPipeline)
```

Then use it in the main file:

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

If you use vite, you need to add the following configuration for the worker:


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

## Use Multi-Threads in webpack

If you are using webpack to build your project, it is recommended to use a webpack plugin for compilation.  For how to configure it, see [Configuration](./quick-start.md#webpack-plugin). This approach simplifies enabling multi-threading, as it eliminates the need to manually create a separate worker entry file. Additionally, the multi-threaded code is not split into standalone files during compilation. Instead, workers are dynamically created at runtime through code generation.

```javascript

import DemuxPipeline from '@libmedia/avpipeline/DemuxPipeline'

const pipeline = await createThreadFromClass(
  DemuxPipeline
).run()
```