# Playback regression development

Use Node.js 24 and initialize the pinned submodules before installing dependencies:

```sh
git submodule update --init --recursive
npm ci --ignore-scripts --no-audit --no-fund
(cd packages/common && npm ci --ignore-scripts --no-audit --no-fund)
(cd packages/cheap && npm install --ignore-scripts --no-package-lock --no-audit --no-fund)
npm exec -- simple-git-hooks
```

The `cheap` submodule currently has a package/lock mismatch. Its install command preserves the checked-in lockfile and submodule revision. Do not update dependencies or submodules merely to run these regressions.

## Source tests and builds

```sh
npm run test:regression
npm run test:regression -- avi-index.mjs read-at.mjs
npm run build:avplayer:single
npm run build-avplayer
```

The regression runner executes the checkout's implementation. The C-like TypeScript and WASM boundaries are adapted in the tests; synthetic inputs exercise framing, buffer padding, timestamp resets, seek cancellation, EOF replay, independent range I/O, and partial AVI indexes. MP3 framing tests use Node's test API. No application checkout or private media is needed.

The single-file command writes an ESM AVPlayer to `dist/avplayer-single/avplayer.js`. The default AVPlayer build remains available separately. Both use the existing decoder WASM files. Keep the upstream release tag reachable: the build uses `git describe --tags` to select the default decoder URL. For this branch, fetch upstream's `v1.3.1` tag if the fork clone did not include it.

## Real-media validation

See [AVI browser diagnostics](../avi-browser/README.md) for the loopback HTTP Range server and Chromium scenarios. Supply a local sample through `LIBMEDIA_TEST_MEDIA`; put captures under ignored `test/material/` or outside the checkout. Never commit media, source URLs, credentials, or machine-specific media paths.

Run the shared-memory and ordinary Worker modes separately. Compare cold startup and seek medians with a reference bundle through `LIBMEDIA_TEST_BUNDLE`, under the same aggregate bandwidth and request latency. Run each comparison at least three times; investigate regressions exceeding 15% before accepting a migration.

The index optimization deliberately preserves cumulative DTS. It only enables partial indexes for eligible classic two-stream AVI layouts and validates contiguous entries; other layouts or range failures retain full-index handling. Passing these targeted checks is not a claim of compatibility with every AVI variant.

## Linked local consumers

The root package exports `libmedia/avplayer` from the single-file build at
`dist/avplayer-single/avplayer.js`. Consumers can import
`libmedia/avplayer?raw` through Vite to keep the bundle intact for page and
Worker loading. Build it before starting a linked consumer.

```sh
npm run build:avplayer:single
npm run watch:avplayer:single
```

Use the watch command in its own terminal. It writes the same output as the
one-shot build; do not run both concurrently. After a successful rebuild,
refresh the consumer page so its player and Workers use the new module.
The root package export is intended for local linking; it does not make the
source repository an automatically built registry or Git dependency.
