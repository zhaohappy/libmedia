const path = require('path');
const { execSync } = require('child_process');
const CheapPlugin = require('./src/cheap/build/webpack/plugin/CheapPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function getVersion() {
  try {
    return execSync('git describe --tags').toString().trim();
  }
  catch (error) {
    return 'n0.0.1';
  }
}

function deDefined() {
  const ts = require('typescript');
  return (context) => {
    return (sourceFile) => {
      function visitor(node) {
        if (ts.isCallExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.escapedText === 'defined'
        ) {
          return context.factory.createNumericLiteral(0);
        }
        return ts.visitEachChild(node, visitor, context);
      }
      return ts.visitNode(sourceFile, visitor);
    };
  };
}

module.exports = (env) => {

  let entry = '';
  let output = '';
  let libraryTarget = env.esm ? 'module' : 'umd';
  let library = '';
  let libraryExport;
  let outputPath = path.resolve(__dirname, './dist');

  if (env.transformer) {
    entry = path.resolve(__dirname, './src/cheap/transformer/index.ts');
    output = 'transformer.js';
    libraryTarget = 'commonjs2';
    library = undefined;
    outputPath = path.resolve(__dirname, './src/cheap/build');
  }
  else if (env.wasm_opt) {
    entry = path.resolve(__dirname, './src/cheap/webassembly/wasm-opt.ts');
    output = 'wasm-opt.js';
    libraryTarget = 'commonjs2';
    library = undefined;
    outputPath = path.resolve(__dirname, './src/cheap/build');
  }
  else if (env.avplayer) {
    if (env.ui) {
      entry = path.resolve(__dirname, './src/ui/avplayer/AVPlayer.ts');
      output = `avplayer.js`;
      library = 'AVPlayer';
      libraryExport = 'default';
      if (env.legacy) {
        outputPath += '/avplayer-ui-legacy';
      }
      else {
        outputPath += '/avplayer-ui';
      }
    }
    else {
      entry = path.resolve(__dirname, './src/avplayer/AVPlayer.ts');
      output = `avplayer.js`;
      library = 'AVPlayer';
      libraryExport = 'default';
      if (env.legacy) {
        outputPath += '/avplayer-legacy';
      }
      else {
        outputPath += '/avplayer';
      }
    }
    
  }
  else if (env.avtranscoder) {
    entry = path.resolve(__dirname, './src/avtranscoder/AVTranscoder.ts');
    output = `avtranscoder.js`;
    library = 'AVTranscoder';
    libraryExport = 'default';

    if (env.legacy) {
      outputPath += '/avtranscoder-legacy';
    }
    else {
      outputPath += '/avtranscoder';
    }
  }
  else if (env.polyfill) {
    entry = path.resolve(__dirname, './src/cheap/polyfill/index.ts');
    output = 'cheap-polyfill.js';
    library = 'CheapPolyfill';
    libraryTarget = 'var';
  }
  else if (env.webassembly_runner) {
    entry = path.resolve(__dirname, './src/cheap/webassembly/WebAssemblyRunner.ts');
    outputPath = path.resolve(__dirname, './src/cheap/webassembly');
    output = 'WebAssemblyRunnerWorker.js'
    library = '__CHeap_WebAssemblyRunner__';
    libraryTarget = 'var';
  }
  else if (env.pcm_worklet_processor) {
    entry = {
      'AudioSourceWorkletProcessor': path.resolve(__dirname, './src/avrender/pcm/AudioSourceWorkletProcessor.ts'),
      'AudioSourceWorkletProcessor2': path.resolve(__dirname, './src/avrender/pcm/AudioSourceWorkletProcessor2.ts')
    };
    output = '[name].js';
    library = 'processor';
    libraryTarget = 'var';
  }
  else {
    return;
  }

  const config = {
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
      outputModule: env.esm ? true : undefined,
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
      alias: {
        avcodec: path.resolve(__dirname, 'src/avcodec/'),
        avformat: path.resolve(__dirname, 'src/avformat/'),
        avnetwork: path.resolve(__dirname, 'src/avnetwork/'),
        avplayer: path.resolve(__dirname, 'src/avplayer/'),
        avprotocol: path.resolve(__dirname, 'src/avprotocol/'),
        avrender: path.resolve(__dirname, 'src/avrender/'),
        audiostretchpitch: path.resolve(__dirname, 'src/audiostretchpitch/'),
        audioresample: path.resolve(__dirname, 'src/audioresample/'),
        avpipeline: path.resolve(__dirname, 'src/avpipeline/'),
        avtranscode: path.resolve(__dirname, 'src/avtranscode/'),
        avutil: path.resolve(__dirname, 'src/avutil/'),
        videoscale: path.resolve(__dirname, 'src/videoscale/'),
        avfilter: path.resolve(__dirname, 'src/avfilter/'),

        cheap: path.resolve(__dirname, 'src/cheap/'),
        common: path.resolve(__dirname, 'src/common/')
      }
    },
    externals: {
      typescript: 'typescript',
      'child_process': 'child_process',
      'fs': 'fs',
      'path': 'path',
      'os': 'os'
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
                getCustomTransformers: env.transformer ? function() {
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
            'raw-loader',
          ]
        },
        {
          test: /\.wgsl$/,
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
        },
      ],
    },
    plugins: [
      // new BundleAnalyzerPlugin()
    ]
  };

  if (!env.transformer) {
    config.plugins.push(
      new CheapPlugin({
        name: 'libmedia',
        env: 'browser',
        cheapPacketName: 'cheap',
        projectPath: __dirname,
        tmpPath: path.resolve(__dirname, './dist'),
        exclude: /__test__/,
        // 配置线程模块中有动态导入的模块，需要给动态导入的模块重新处理依赖，因为线程模块可能没有动态导入模块的依赖模块
        threadFiles: [
          {
            file: path.resolve(__dirname, 'src/avpipeline/DemuxPipeline.ts')
          },
          {
            file: path.resolve(__dirname, 'src/avpipeline/MuxPipeline.ts')
          },
          {
            file: path.resolve(__dirname, 'src/avpipeline/IOPipeline.ts')
          }
        ],
        defined: {
          VERSION: getVersion()
        }
      })
    );
  }
  return config;
};
