import * as cheapConfig from 'cheap/config'
import compile, { WebAssemblyResource } from 'cheap/webassembly/compiler'
import * as is from 'common/util/is'
import browser from 'common/util/browser'

export default async function compileResource(wasmUrl: string | ArrayBuffer | WebAssemblyResource, thread: boolean = false) {
  let resource: WebAssemblyResource

  if (is.string(wasmUrl) || is.arrayBuffer(wasmUrl)) {
    resource = await compile({
      source: wasmUrl
    })
    if (cheapConfig.USE_THREADS && defined(ENABLE_THREADS) && thread) {
      resource.threadModule = await compile(
        {
          // firefox 使用 arraybuffer 会卡主
          source: browser.firefox ? wasmUrl : resource.buffer
        },
        {
          child: true
        }
      )
    }
    delete resource.buffer
  }
  else {
    resource = wasmUrl
  }

  return resource
}
