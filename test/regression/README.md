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
npm run lint:tests
npm run test:regression -- avi-index.mjs read-at.mjs
npm run build:avplayer:single
npm run build-avplayer
```

All regression files register named cases through `helpers/test.mjs`, which uses Node's test API with a default 10-second case timeout. A case may specify a shorter timeout. The runner executes each file serially in its own process with a 30-second parent deadline; a blocked event loop is forcibly terminated and fails the run. Helpers and deliberately failing fixtures are stored in subdirectories and are not discovered as regression entry points. `runner.mjs` verifies rejection of unresolved promises, async timeouts and blocked event loops.

The runner executes the checkout's implementation. Prefer direct imports for ordinary TypeScript, as in `mp3-frames.mjs`. C-like TypeScript and WASM boundaries use explicit adapters:

- `helpers/source.mjs` reads source, checks requested declarations, transpiles and loads selected methods. Missing declarations or syntax diagnostics fail immediately.
- `helpers/packet.mjs` supplies a shared synthetic heap and payload/padding assertions. Allocation, packet attachment and serialization still execute source methods.
- Each test supplies its own decoder, renderer or I/O boundary mocks. These checks do not replace compilation or real Worker/WASM browser validation.

Synthetic inputs cover declared bitrate preservation (including WMA decoding parameters), missing bitrate estimation, framing, buffer padding, timestamp resets, video decoder replacement and asynchronous capability checks, seek cancellation, EOF replay, independent range I/O, partial AVI indexes and paused PCM requests. No application checkout or private media is needed. To compare another checkout, set `LIBMEDIA_TEST_SOURCE` to that checkout; positional arguments to `test:regression` select test filenames only.

`eslint-check` also runs `lint:tests`. The dedicated `lint:tests` command checks regression cases, helpers, fixtures, browser diagnostics, the runner and its lint configuration. It inherits the repository's JavaScript rules with ES2022 syntax enabled and rejects warnings. Use `npm run lint:tests -- --fix` for formatting; do not suppress rules to accommodate a new test.

The single-file command writes an ESM AVPlayer to `dist/avplayer-single/avplayer.js`. The default AVPlayer build remains available separately. Both use the existing decoder WASM files. Keep the upstream release tag reachable: the build uses `git describe --tags` to select the default decoder URL. For this branch, fetch upstream's `v1.3.1` tag if the fork clone did not include it.

## Real-media validation

See [browser diagnostics](../avi-browser/README.md) for the loopback HTTP Range server and Chromium scenarios for AVI and ASF/WMV/WMA. Supply a local sample through `LIBMEDIA_TEST_MEDIA`; put captures under ignored `test/material/` or outside the checkout. Never commit media, source URLs, credentials, or machine-specific media paths.

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


## ASF / WMV regressions

```sh
npm run test:regression -- asf.mjs demux-bitrate.mjs video-track-switch.mjs
```

ASF coverage includes header/GUID validation, WAVEFORMATEX and padding, fragmented
and compressed media objects, multiple payloads, audio spread interleaving,
fixed/variable packet sizes, decode versus presentation timestamps, indexed and
scan-based seeking, index I/O failure, encryption rejection, and truncated input.
Aspect ratio cases cover per-stream metadata, global fallback and malformed
values. DVR timing cases preserve unknown PTS across fragments and exclude it
from seek indexes. Cold unindexed seeks check packet read budgets, timestamp
gaps, sparse keyframes, fragmented objects and multiple streams.
For real WMV1/2/3 and VC-1 packet comparisons, use
`node test/avi-browser/compare-asf.mjs <sample.wmv> [...]` with `ffprobe` on PATH
(or set `FFPROBE`). Browser playback checks are described in the harness README.
