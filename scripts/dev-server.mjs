// SPDX-License-Identifier: LGPL-3.0-or-later

import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import handler from 'serve-handler'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(resolve(root, 'test/serve.json'), 'utf8'))

export function createDevServer({ symlinks = false } = {}) {
  return createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    // serve-handler otherwise drains the whole file even for HEAD. Keep its
    // stat/header/routing logic, but never open a media body for a HEAD request.
    const methods = request.method === 'HEAD'
      ? { createReadStream: () => Readable.from([]) }
      : {}
    handler(request, response, { ...config, public: root, symlinks, etag: false }, methods)
      .catch((error) => {
        console.error(error)
        if (!response.headersSent) {
          response.writeHead(500)
        }
        response.end()
      })
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    port: { type: 'string', short: 'p', default: '8000' },
    host: { type: 'string', default: '127.0.0.1' },
    symlinks: { type: 'boolean', default: false }
  } })
  const server = createDevServer(values)
  server.listen(Number(values.port), values.host, () => {
    console.log(`Dev server: http://${values.host}:${server.address().port}`)
  })
}
