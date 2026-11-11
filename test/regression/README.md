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

Synthetic inputs cover declared bitrate preservation (including WMA decoding parameters), missing bitrate estimation, video decoder replacement and asynchronous capability checks, in-band AVI H.264 SPS/PPS discovery, malformed NAL lengths, sequential HTTP 200 prefix skipping, strict 206 ranges, single-byte/EOF boundaries, overlapping latest-target seeks, failed-seek events, unequal track EOF, clearing stale PCM in both worklet modes without advancing paused clocks, partial final stereo PCM and stretch drain padding, framing, buffer padding, timestamp resets, seek cancellation, EOF replay, independent range I/O, partial AVI indexes and paused PCM requests. No application checkout or private media is needed. To compare another checkout, set `LIBMEDIA_TEST_SOURCE` to that checkout; positional arguments to `test:regression` select test filenames only.

### ISO regressions

```sh
npm run test:regression -- iso.test.ts iso-seek.test.ts dvdnav.test.ts iso-packets.mjs iso-cancel.mjs mpegps-timestamps.mjs read-at.mjs format-probe.test.ts
```

- `iso.test.ts` covers synthetic ISO9660/UDF filesystems, large offsets, fragmented extents, metadata partitions, invalid references, title selection and chapters. Blu-ray cases select STC sequences with reset clocks; DVD cases compile register-driven chapter selection and menu calls into title cells, and reject unsupported navigation.
- `iso-seek.test.ts` bounds startup requests for a 40-cell DVD and HTTP Range requests for long cells beyond 4 GiB, checks lazy NAV clock initialization, NAV-verified interpolation and binary fallback with uneven VOBU durations, and verifies timestamp reuse without retaining cancelled probes. These budgets cover metadata and index lookup; playback also reads and decodes the target GOP.
- `dvdnav.test.ts` covers deterministic command execution, register arithmetic, conditions, Goto/Break, instruction limits, default menu buttons and malformed PCI data. `dvdNavigationFiles()` supplies original synthetic VMGM/VTS menu chains and title cells without private media.
- `iso-packets.mjs` covers clip trimming, decoder preroll, timestamp normalization and title-relative seeking.
- `iso-cancel.mjs` checks that seeking cancels a pending read before waiting for demux to stop, drops stale packets, retains pending decoder requests and reports cancellation to the child demuxer as an abort. It also checks that DVD clip headers are read at the target NAV while Blu-ray retains its opening transport tables. `iso.test.ts` verifies that completed byte-cache blocks survive seek while aborted blocks are retried; the cache remains bounded to 4 MiB.
- `iso-reuse.mjs` checks same-segment TS/PS demuxer reuse across forward/backward and EOF seeks: transport maps and codec parameters survive, while queued output, audio filters, pending PES and EOF/abort state are reset. Crossing segments or retrying a failed/cancelled reuse rebuilds the child and reads its header normally.
- `mpegps-timestamps.mjs` covers sparse DVD PES timestamps, B-frame ordering and a fresh final GOP without a following PES, including rational frame rates and sequence extensions.
- `read-at.mjs` checks HTTP Range validation and cancellation/reuse through both message-channel implementations. `format-probe.test.ts` checks signature probing when a filename has the wrong extension.

ISO frame seeks first check the unread compressed-packet queues plus a bounded
history of delivered/skipped packets (32 MiB accounted buffer/side-data bytes and
packet overhead, at most 8192 references). Complete active audio/video coverage
from a preceding video keyframe through 100 ms beyond the target enables an
atomic queue adjustment, without cancelling I/O or moving the demux cursor.
H.264/HEVC/VVC use the decoder's bitstream RAP check rather than relying on
container key flags. Delivering a codec configuration change clears old history.
Decoders and render synchronization still reset normally. Missing keyframes,
gaps, configuration changes within preroll, active subtitle queues, unsupported
seek flags and live inputs use the existing seek path. Real seeks, track changes,
queue cropping and teardown release history. Source EOF remains at the unchanged
demux tail when replaying cached packets.

`buffered-seek.test.ts` covers admission and history ownership/budgets;
`buffered-seek-pipeline.mjs` covers forward/backward hits, in-flight tail appends,
Worker buffer transfers, EOF and atomic fallback through the actual pipeline.

ISO media reads opt into a separate HTTP streaming channel: 5 MiB requests,
at most 8 MiB of owned media cache, and prefetch of the next window when the
consumer is within 1 MiB of the current end. Each caller still receives at most
1 MiB, as soon as those bytes arrive. Physical extents and clip boundaries limit
read-ahead; metadata remains on the exact-read path with its separate 4 MiB disc
cache. Seek cancellation preserves received media bytes while rejecting pending
reads and late responses; stop/reopen clears the media cache.

During title discovery only, metadata cache misses read ahead at least 256 KiB
(clipped at image EOF) to combine nearby directory/index requests. The metadata
cache stays within 4 MiB, and discovery completion restores the usual 64 KiB
minimum before opening media or performing seeks. `iso.test.ts` covers request
reduction, large offsets, EOF, cache reuse/eviction and cancellation in this mode.
The initial sequential probe also supplies up to 1 MiB of prefix data (bounded
by IOReader capacity and file size), avoiding duplicate requests for volume and
directory blocks. Cached prefix blocks own their bytes; incomplete blocks are
only retained at physical EOF.

`http-prefetch.mjs` checks early delivery before a response completes, request and
cache budgets, backward cache hits, transferred-buffer ownership, cold seeks,
cancellation, and malformed/truncated responses against a loopback HTTP server.
`read-at.mjs` also checks forwarding the read-ahead boundary and cache reuse over
both real and fallback message channels. `iso.test.ts` checks physical extent and
clip limits; `bluray-read.test.ts` exercises small parser reads across extents.

Generate redistributable DVD/Blu-ray media and validate real decoding with the [optical-disc browser fixtures](../avi-browser/README.md#optical-disc-fixtures). Commit the generators and synthetic tests; keep generated ISO/VOB/M2TS files and browser captures under ignored `test/material/` or outside the checkout. Playwright CLI logs in `.playwright-cli/` and captures in `output/playwright/` are also ignored.

`eslint-check` also runs `lint:tests`. The dedicated `lint:tests` command checks regression cases, helpers, fixtures, browser diagnostics, the runner and its lint configuration. It inherits the repository's JavaScript rules with ES2022 syntax enabled and rejects warnings. Use `npm run lint:tests -- --fix` for formatting; do not suppress rules to accommodate a new test.

The single-file command writes an ESM AVPlayer to `dist/avplayer-single/avplayer.js`. The default AVPlayer build remains available separately. Both use the existing decoder WASM files. Keep the upstream release tag reachable: the build uses `git describe --tags` to select the default decoder URL. For this branch, fetch upstream's `v1.3.1` tag if the fork clone did not include it.

## Real-media validation

See [browser diagnostics](../avi-browser/README.md) for the loopback HTTP Range server and Chromium scenarios for AVI, ASF/WMV/WMA, RM/RMVB and ISO. Supply a local sample through `LIBMEDIA_TEST_MEDIA`; put captures under ignored `test/material/` or outside the checkout. Never commit media, source URLs, credentials, or machine-specific media paths.

Run the shared-memory and ordinary Worker modes separately. Compare cold startup and seek medians with a reference bundle through `LIBMEDIA_TEST_BUNDLE`, under the same aggregate bandwidth and request latency. Run each comparison at least three times; investigate regressions exceeding 15% before accepting a migration.

The index optimization deliberately preserves cumulative DTS. It only enables partial indexes for eligible classic two-stream AVI layouts and validates contiguous entries; other layouts or range failures retain full-index handling. Passing these targeted checks is not a claim of compatibility with every AVI variant.

## Manual player demo

The interactive demo at `test/avplayer.html` uses the default AVPlayer build, independently of the single-file diagnostic bundle:

```sh
npm run build-avplayer
npm run server
```

Open `http://localhost:8000/test/avplayer.html`. Select a local file, or copy a sample into ignored `test/material/sample.avi`, enter `./material/sample.avi` in the **url** field, and click **Load**. Loading also starts playback. Use **pause**, **play**, and the progress bar to check pause/resume and forward/backward seeks. URL input exercises HTTP loading; selecting a local file does not.

For rebuilds on source changes, run `npm run build-avplayer-watch` in a separate terminal and refresh the page after compilation completes. Do not run the one-shot and watch builds for the same output concurrently. To use a different server port while retaining the demo's response headers, run `npx serve -l tcp://127.0.0.1:8001 --cors --config ./test/serve.json` from the repository root. Keep recordings and screenshots under `test/material/`; `.playwright-cli/` logs and snapshots are also ignored.

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

## RealMedia regressions

```sh
npm run test:regression -- rm.mjs rm-range.mjs rm-performance.mjs
```

`rm.mjs` covers RM/RMVB probing, RV WASM selection, headers, slice tables, RV30/40
presentation timestamps, Cook/SIPR rearrangement, AAC/AC-3 packets, padded WASM
packet allocation, index fallback, EOF replay and audio preroll after seek.
It also checks that forged audio headers inside payloads cannot be used as seek
anchors, that Cook/SIPR preroll can span multiple video GOPs, and that DATA chains
with intervening INDX objects work on seekable and sequential inputs. Audio seek
anchors come from walking actual packets, not from trusting audio INDX offsets.
`rm-range.mjs` checks real HTTP 206/Content-Range exchanges and both seek directions
with valid, missing and corrupt indexes, including corrupt audio anchors and
DATA chains across indexes. See the browser diagnostic README for
Worker modes, File inputs, throttled cancellation and RM-to-MP4 validation.

`rm-performance.mjs` runs a loopback HTTP Range server with a 64 KiB reader cache.
It bounds startup reads, requests and bytes through the first video packet after
forward/backward seeks, including long GOPs and missing audio indexes. It also
limits stale audio packets emitted before that video packet. Budgets use byte and
request counts rather than machine-dependent elapsed-time thresholds. Each case
prints JSON measurements. Set `LIBMEDIA_RM_DEMUXER` to a saved implementation to
collect a before/after comparison (the old implementation is expected to fail the
budgets). Save benchmark inputs and reports under ignored `test/material/`.

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
