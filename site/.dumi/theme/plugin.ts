// @ts-nocheck
export default function (api) {
  api.addHTMLHeadScripts(
    () => `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "kudfzh7lis");
  `,
  );

  api.chainWebpack(( memo, { webpack, env}) => {
    const path = require('path')
    const os = require('os')
    const transformer = require('../../../packages/cheap/build/transformer.cjs');
    const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

    memo.module
      .rule('typescript')
      .test(/\.tsx?$/)
      .use('ts-loader')
      .loader('ts-loader')
      .options({
        configFile: path.resolve(__dirname, '../../tsconfig.json'),
        getCustomTransformers: function(program) {
          const before = transformer.before(program, {
            tmpPath: path.resolve(__dirname, '../../dist/'),
            projectPath: path.resolve(__dirname, '../../../'),
            cheapSourcePath: path.resolve(__dirname, '../../../packages/cheap/src'),
            exclude: /__test__/,
            reportError: (message) => {
              console.error(message)
            }
          }); 
          return {
            before: [
              before
            ]
          }
        }
      })

    let wat2wasmPath = path.resolve(__dirname, '../../../packages/cheap/build/asm/ubuntu') + '/wat2wasm'
    if (os.platform() === 'win32') {
      wat2wasmPath = path.resolve(__dirname, '../../../packages/cheap/build/asm/win') + '/wat2wasm.exe'
    }
    else if (os.platform() === 'darwin') {
      wat2wasmPath = path.resolve(__dirname, '../../../packages/cheap/build/asm/macos') + '/wat2wasm'
    }

    memo.module
      .rule('asm')
      .test(/\.asm$/)
      .use(path.resolve(__dirname, '../../../packages/cheap/build/asm/process-loader.js'))
      .loader(path.resolve(__dirname, '../../../packages/cheap/build/asm/process-loader.js'))
      .options({
        tmpPath: path.resolve(__dirname, '../../dist'),
        wat2wasm: wat2wasmPath
      })
    
    memo.resolve.alias
      .set('../glsl/vertex.vert', path.resolve(__dirname, './hook/vertex.vert.ts'))
      .set('./webgpu/wgsl/vertex.wgsl', path.resolve(__dirname, './hook/vertex.wgls.ts'))
      .set('./memory.asm', path.resolve(__dirname, './hook/memory.asm.ts'))
      .set('./libc.asm', path.resolve(__dirname, './hook/libc.asm.ts'))
      .set('./atomics.asm', path.resolve(__dirname, './hook/atomics.asm.ts'))
      .set('./thread.asm', path.resolve(__dirname, './hook/thread.asm.ts'))

    memo.resolve.plugin('tsconfig-paths')
      .use(new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, '../../../tsconfig.json'),
      }))
  })
}
