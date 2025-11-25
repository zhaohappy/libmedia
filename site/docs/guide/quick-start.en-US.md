---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 2
---

# Quick Start

Check out the [build configuration examples](https://github.com/zhaohappy/libmedia-example) to find references for your specific build tool and quickly learn how to integrate libmedia into your project.

## Preparation

libmedia is developed based on the cheap library. Before using it, you need to have some knowledge of [cheap](https://github.com/zhaohappy/cheap); you need to be able to understand the development ideas of cheap and master the use of pointers. If you have learned C language, it will be very easy to get started.

## Install Dependencies

:::code-group

```bash [npm]
npm install @libmedia/common @libmedia/cheap @libmedia/avutil @libmedia/avformat @libmedia/avcodec @libmedia/avnetwork
```

```bash [pnpm]
pnpm add @libmedia/common @libmedia/cheap @libmedia/avutil @libmedia/avformat @libmedia/avcodec @libmedia/avnetwork
```

```bash [yarn]
yarn add @libmedia/common @libmedia/cheap @libmedia/avutil @libmedia/avformat @libmedia/avcodec @libmedia/avnetwork
```

:::

Check [package](./package.md) to get the packages under ```@libmedia```. You can install them according to your needs. The version numbers of the five packages ```@libmedia/common```, ```@libmedia/cheap``` ```@libmedia/avplayer``` ```@libmedia/avplayer-ui``` ```@libmedia/avtranscoder``` are released separately; the version numbers of the remaining packages will remain consistent when released. If the project depends on multiple packages under ```@libmedia/*``` except the five packages listed above, be sure to keep their version numbers consistent.

Each package has both es6 modules and commonjs modules; es6 modules are used for browser environments, and commonjs modules are used for Node environments. When you use import to import es6 modules, use require to import commonjs modules. If your running environment is Node environment and the source code is developed using es6 modules, you need to compile it into commonjs module code to run in Node.

## Compilation Configuration

Libmedia is recommended to use TypeScript for development; if the project is developed using JavaScript, the pointer type in libmedia cannot be accessed. At this time, you need to use some [tricks](./javascript.md) to access the pointer data.

Using TypeScript for development requires configuring the compilation and packaging tool. The core is to configure tsc to use the cheap transformer plug-in.

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
import * as transformer from '@libmedia/cheap/build/transformer';

export default defineConfig({
  ...
  plugins: [
    typescript({
      // configure the tsconfig.json configuration file used
      // setting of "include" must to include the files need to compile
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
import * as transformer from '@libmedia/cheap/build/transformer'

export default {
  ...
  plugins: [
    typescript({
      // configure the tsconfig.json configuration file used
      // setting of "include" must to include the files need to compile
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

**`` `vite``` and` `` `rollup``` may depended on the ```tslib``` library which is dependency of ```@rollup/plugin-typescript```, you can install it when need**

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

Vite uses esbuild by default to compile TypeScript, but since esbuild does not support transformers, you need to use tsc to compile the modules that make use of the libmedia API.

You can control which files are processed with the cheap transformer by configuring the include option in ts-loader’s tsconfig. It’s recommended to put the relevant files in a dedicated directory. This way, files not included will still be handled by the existing toolchain, while ts-loader (with the transformer) will only process the intended ones.
Make sure that ts-loader has the highest priority, so the cheap transformer runs first.

If your build setup has Module Federation enabled, configure it to ignore modules under the @libmedia package. If you absolutely need modules under @libmedia to participate in Module Federation, you must explicitly include them, since some of these modules may not be discoverable during static analysis.
```
include: [
  '@libmedia/cheap/heap',
  '@libmedia/cheap/symbol',
  '@libmedia/cheap/ctypeEnumRead',
  '@libmedia/cheap/ctypeEnumWrite',
  '@libmedia/cheap/thread/atomics'
]
```

## Webpack Plugin

Cheap currently has a webpack plugin available. If your build tool uses webpack, it is recommended that you use the plugin. Usage is as follows:

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

## Node Compilation

When developing Node projects, you often only need to compile without packaging, so you generally don't need to use build tools such as webpack or vite; you only need to use the tsc compilation tool, but the official tsc command cannot use transformers. In this case, you need to write code to compile.

```javascript

const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const transformer = require('@libmedia/cheap/build/transformer')

// Read the tsconfig.json configuration and change it to your own tsconfig.json path
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
// log error
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

## babel

The compilation target of all packages in libmedia is esnext. If you need to support older browsers, you’ll need to apply your own transformation using tools like Babel. In most cases, only syntax transformation is necessary, as libmedia does not use any special ES APIs.
