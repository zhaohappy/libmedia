import type { Configuration } from 'webpack'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface Argv {
  mode?: 'development' | 'production'
  [k: string]: any;
}

interface Env {
  esm: boolean
  avplayer: boolean
  ui: boolean
  legacy: boolean
  avtranscoder: boolean
  polyfill: boolean
  webassembly_runner: boolean
  pcm_worklet_processor: boolean
  thread_entry: boolean
  transformer: boolean
  release: boolean
  dist: string
}

function getVersion() {
  try {
    return execSync('git describe --tags').toString().trim()
  }
  catch (error) {
    return 'n0.0.1'
  }
}

function deDefined(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      function visitor(node: ts.Node) {
        if (ts.isCallExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.escapedText === 'defined'
        ) {
          return context.factory.createNumericLiteral(0)
        }
        return ts.visitEachChild(node, visitor, context)
      }
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile
    }
  }
}

export default async (env: Env, argv: Argv): Promise<Configuration> => {

  let entry: string | Record<string, string> = ''
  let output = ''
  let libraryTarget = env.esm ? 'module' : 'umd'
  let library = ''
  let libraryExport
  let outputPath = path.resolve(__dirname, './dist')

  if (env.avplayer) {
    if (env.ui) {
      entry = path.resolve(__dirname, './packages/ui/avplayer/src/AVPlayer.ts')
      output = 'avplayer.js'
      library = 'AVPlayer'
      libraryExport = 'default'
      if (env.legacy) {
        outputPath += '/avplayer-ui-legacy'
      }
      else {
        outputPath += '/avplayer-ui'
      }
    }
    else {
      entry = path.resolve(__dirname, './packages/avplayer/src/AVPlayer.ts')
      output = 'avplayer.js'
      library = 'AVPlayer'
      libraryExport = 'default'
      if (env.legacy) {
        outputPath += '/avplayer-legacy'
      }
      else {
        outputPath += '/avplayer'
      }
    }

  }
  else if (env.avtranscoder) {
    entry = path.resolve(__dirname, './packages/avtranscoder/src/AVTranscoder.ts')
    output = 'avtranscoder.js'
    library = 'AVTranscoder'
    libraryExport = 'default'

    if (env.legacy) {
      outputPath += '/avtranscoder-legacy'
    }
    else {
      outputPath += '/avtranscoder'
    }
  }
  else if (env.polyfill) {
    entry = path.resolve(__dirname, './packages/cheap/src/polyfill/index.ts')
    output = 'cheap-polyfill.js'
    library = 'CheapPolyfill'
    libraryTarget = 'var'
  }
  else if (env.webassembly_runner) {
    entry = path.resolve(__dirname, './packages/cheap/src/webassembly/WebAssemblyRunner.ts')
    outputPath = path.resolve(__dirname, './packages/cheap/src/webassembly')
    output = 'WebAssemblyRunnerWorker.js'
    library = '__CHeap_WebAssemblyRunner__'
    libraryTarget = 'var'
  }
  else if (env.pcm_worklet_processor) {
    entry = {
      'AudioSourceWorkletProcessor': path.resolve(__dirname, './packages/avrender/src/pcm/AudioSourceWorkletProcessor.ts'),
      'AudioSourceWorkletProcessor2': path.resolve(__dirname, './packages/avrender/src/pcm/AudioSourceWorkletProcessor2.ts')
    }
    output = '[name].js'
    library = 'processor'
    libraryTarget = 'var'
  }
  else if (env.thread_entry) {
    entry = path.resolve(__dirname, './packages/cheap/src/webassembly/runThread.ts')
    outputPath = path.resolve(__dirname, './packages/cheap/src/webassembly')
    output = 'threadEntry.js'
    library = '__CHeap_ThreadEntry__'
    libraryTarget = 'var'
  }
  else {
    return {}
  }

  const config: Configuration = {
    stats: {
      assets: false,
      builtAt: true,
      source: false,
      chunks: false,
      timings: false,
      errors: true,
      warnings: true,
      children: true
    },
    experiments: {
      outputModule: env.esm ? true : undefined
    },
    watchOptions: {
      aggregateTimeout: 1000,
      ignored: /node_modules|output/
    },
    ...((env.transformer || env.webassembly_runner) ? {
      node: {
        __dirname: false
      }
    } : {}),
    resolve: {
      extensions: ['.js', '.ts', '.json'],
      modules: [
        'node_modules'
      ],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, './tsconfig.json')
        })
      ]
    },
    externals: {
      typescript: 'typescript',
      'child_process': 'child_process',
      'fs': 'fs',
      'path': 'path',
      'os': 'os',
      'commander': 'commander',
      'url': 'url'
    },
    devtool: +env.release ? false : 'source-map',
    mode: +env.release ? 'production' : 'development',
    optimization: {
      sideEffects: !!(+env.release),
      usedExports: true,
      // minimize: true,
      // release 下编译会报错，关掉这个优化
      concatenateModules: false
    },
    entry: entry,
    output: {
      filename: output,
      path: env.dist || outputPath,
      library: {
        name: env.esm ? undefined : library,
        type: libraryTarget,
        export: env.esm ? undefined : libraryExport
      }
    },
    module: {
      rules: [
        {
          test: /\.ts?$/,
          exclude: /__test__|WorkletProcessor2?(Base)?.ts$/,
          use: [
            +env.release ? {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                presets: [
                  ['@babel/preset-env', {
                    targets: env.legacy ? {
                      'browsers': [
                        'last 2 versions',
                        'ie >= 10'
                      ]
                    } : {
                      chrome: '69'
                    }
                  }]
                ]
              }
            } : null
          ]
        },
        {
          test: /WorkletProcessor2?(Base)?.ts$/,
          use: [
            +env.release ? {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                presets: [
                  ['@babel/preset-env', {
                    targets: {
                      chrome: env.legacy ? '49' : '69'
                    }
                  }]
                ]
              }
            } : null
          ]
        },
        {
          test: /\.ts?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, './tsconfig.json'),
                getCustomTransformers: env.transformer ? function () {
                  return {
                    before: [deDefined()]
                  }
                } : undefined
              }
            }
          ]
        },
        {
          test: /\.(glsl|vert|frag)$/,
          use: [
            'raw-loader'
          ]
        },
        {
          test: /\.wgsl$/,
          use: [
            'raw-loader'
          ]
        },
        {
          test: /\.css$/,
          use: [
            'raw-loader'
          ]
        },
        {
          test: /\.styl(us)?$/,
          use: [
            {
              loader: path.resolve(__dirname, './build/webpack/loader/stylus-loader.js'),
              options: {
                paths: [
                  __dirname,
                  path.join(__dirname, './demo')
                ],
                release: true
              }
            }
          ]
        },
        {
          test: /\.hbs$/,
          use: [
            {
              loader: path.resolve(__dirname, './build/webpack/loader/hbs-loader.js')
            }
          ]
        }
      ]
    },
    plugins: [
      // new BundleAnalyzerPlugin()
    ]
  }

  if (!env.transformer) {

    const CheapPlugin = (await import('./packages/cheap/build/webpack/plugin/CheapPlugin')).default

    const defined: Record<string, any> = {
      VERSION: getVersion()
    }

    const exclude = [/__test__/]

    if (env.thread_entry) {
      defined.ENV_NODE = false
      defined.ENV_CSP = true
    }
    if (env.webassembly_runner) {
      defined.ENV_NODE = false
      defined.ENV_CSP = false,
      defined.ENV_WEBPACK = false
      defined.USE_WORKER_SELF_URL = true
      exclude.push(/packages\/avplayer/)
      exclude.push(/packages\/avtranscoder/)
    }

    (config.plugins as any[]).push(new CheapPlugin({
      name: 'libmedia',
      env: 'browser',
      projectPath: __dirname,
      cheapSourcePath: path.resolve(__dirname, './packages/cheap/src'),
      tmpPath: path.resolve(__dirname, './dist'),
      exclude,
      // 配置线程模块中有动态导入的模块，需要给动态导入的模块重新处理依赖，因为线程模块可能没有动态导入模块的依赖模块
      threadFiles: [
        {
          file: path.resolve(__dirname, 'packages/avpipeline/src/DemuxPipeline.ts')
        },
        {
          file: path.resolve(__dirname, 'packages/avpipeline/src/MuxPipeline.ts')
        },
        {
          file: path.resolve(__dirname, 'packages/avpipeline/src/IOPipeline.ts')
        }
      ],
      defined
    }))
  }
  return config
}
