# AVI and RM/RMVB browser diagnostics

Use this loopback harness to check HTTP Range playback and seeking in AVPlayer with a local AVI or RM/RMVB. The seek checks expect a file with both audio and video. For the end and rate checks, use a file long enough to leave several seconds of playback after each seek.

## Setup

Build the non-UI AVPlayer ESM bundle from the repository root after installing the project dependencies.

```sh
npm run build:avplayer:single
```

Set `LIBMEDIA_TEST_MEDIA` to a local AVI or RM/RMVB. Store local inputs and captured reports outside the checkout or under the Git-ignored `test/material/` directory.

```sh
LIBMEDIA_TEST_MEDIA=test/material/sample.avi npm run test:avi:browser
```

The server binds to `127.0.0.1:18774`. It serves the diagnostic page, bundle, WebAssembly files, and the media paths configured for this run.

| Environment variable | Effect |
| --- | --- |
| `LIBMEDIA_TEST_MEDIA` | Required local AVI or RM/RMVB path. Select `source=rm` for RM/RMVB. |
| `LIBMEDIA_TEST_CONTROL` | Optional local H.264/AAC MP4 path for the control check. |
| `LIBMEDIA_TEST_BUNDLE` | Overrides the ESM bundle at `dist/avplayer-single/avplayer.js`. |
| `LIBMEDIA_TEST_WASM_DIR` | Overrides the checked-in WebAssembly files with a flat local directory. |
| `LIBMEDIA_TEST_PORT` | Overrides port 18774. Use 0 to select a free port and read it from the startup message. |
| `LIBMEDIA_TEST_MODE` | `shared` sends COOP and COEP headers, which allow SharedArrayBuffer in supporting browsers. `ordinary` omits those headers. |
| `LIBMEDIA_TEST_THROTTLE` | Set to `1` for 80 ms latency per media GET and an aggregate rate of 1 MiB/s across media responses. |
| `LIBMEDIA_TEST_FAIL_IDX1` | Set to `1` for the fallback case. The server walks the RIFF headers to find the top-level `idx1` and responds with HTTP 503 to the first background Range probe after the 64 KiB entry prefix. |

## Browser runs

Open the page in Chromium using a fresh tab or navigation for each run. If autoplay blocks the audio context, add `manual=1` and click **Run diagnostic**, or launch a dedicated Chromium instance with `--autoplay-policy=no-user-gesture-required`.

| Query | Check |
| --- | --- |
| `?scenario=startup` | Load, play, and observe advancing audio and video clocks. |
| `?scenario=cold` | Seek immediately after initial playback starts and verify that audio and video advance near the target. |
| `?scenario=matrix` | Run 20 forward and backward seeks and then the edge checks. |
| `?scenario=paused-seek` | Repeat six paused forward/backward seeks; check target clocks, no clock movement while paused, and resumed playback. Use `preload=0` and throttling to reduce queued media. |
| `?scenario=edges` | Seek while paused and resume, seek to EOF and back, replay after the natural end, and verify 2× playback. |
| `?scenario=destroy` | Destroy after initial playback starts. |
| `?scenario=cancel-load` | Destroy while loading and verify the pending load settles. |
| `?scenario=cancel-seek` | Destroy while seeking and verify the pending seek settles. |
| `?scenario=fallback` | Complete a cold seek after an injected HTTP 503 and confirm that an ordinary read covered the failed index region. Use an AVI large enough to issue an index probe and enable `LIBMEDIA_TEST_FAIL_IDX1`. |
| `?scenario=startup&source=control` | Run the startup check against the optional MP4. |

The default seek targets are derived from the media duration. Set `target` for cold, fallback, and cancellation seeks. Set comma-separated `targets` for the matrix. For edge cases, override `pausedTarget`, `backTarget`, `replayTarget`, or `rateTarget`. Targets use integer milliseconds. `cancelAfter` is the delay before destroying during load or seek, in milliseconds. Enable throttling when testing cancellation so the operation is still pending.

The report includes event and timing data, stream durations, audio and video timestamps and counters, and snapshots of HTTP Range metrics. `network.startup` captures requests made through initial playback, `network.firstSeek` captures requests through the first seek resolution, and `network.final` records a bounded check for quiet media requests after cleanup. Destroy and cancellation cases also check the destroyed state and requests or bytes added after destroy. Cancellation waits for an actual in-flight media request and rejects unexpected JavaScript errors. `loadMs` and `playMs` include bundle fetch, import, and player initialization. `seekMs` measures resolution of `seek()`; subsequent clock checks independently confirm playback resumes. Compare the startup and first-seek snapshots when measuring bytes fetched or seek latency. The per-request `bytes` field counts data handed to the HTTP response. Check `isolated` to verify the browser mode.

For first-frame timing, use the `FIRST_VIDEO_RENDERED` and `FIRST_AUDIO_RENDERED`
events from a `startup` run. A `cold` run seeks immediately after `play()` resolves,
which can precede the first rendered video frame. Compare the same media, browser,
mode, throttle and query parameters; repeat runs and report medians alongside byte
counts. Keep the before bundle separate so a rebuild cannot change its contents.

Read `window.report` in the browser console or use your automation runner to wait for completion. The result is JSON-serializable and is also printed on the page.

```js
await page.waitForFunction(() => window.report?.done, null, { timeout: 120_000 })
const report = await page.evaluate(() => window.report)
if (!report.ok) {
  throw new Error(JSON.stringify(report))
}
```

## RM / RMVB and HTTP Range

The same server also exposes `LIBMEDIA_TEST_MEDIA` at `/media.rm`. Set it to a local
RM/RMVB and use `?source=rm&scenario=cold&preload=0` for HTTP Range playback or
`?source=rm-file&scenario=paused-seek` for the File loader. The latter downloads a
fixture once to construct a browser `File`; subsequent demux reads are local.
Keep real samples and reports under ignored `test/material/`.

Run both `LIBMEDIA_TEST_MODE=shared` and `ordinary`. Enable
`LIBMEDIA_TEST_THROTTLE=1` for cancellation and startup-byte checks. The `rm`
report verifies actual 206 responses and Content-Range headers, counts nonzero
range starts, and reports startup bytes. A load cancelled before response headers
arrive is recorded as an aborted zero-byte request. Use `cold`, `matrix`,
`paused-seek`, `edges`, `destroy`, `cancel-load`, and `cancel-seek` scenarios.
For no-index coverage, use a file without INDX or a local fixture copy with its
PROP index offset cleared; do not enable AVI-specific `LIBMEDIA_TEST_FAIL_IDX1`.
Rebuild the bundle before starting a browser run; avoid rebuilding during a run.

`npm run test:regression -- rm.mjs rm-range.mjs rm-performance.mjs` tests packet assembly, timestamps,
audio interleaving, seeks and memory padding, plus a real loopback HTTP Range
server with valid, absent and corrupt indexes. It also bounds startup bytes,
seek requests and stale audio output for long GOPs and missing audio indexes.
These tests need no private media.

RM startup does not scan the entire file. Valid video indexes avoid scanning a
whole GOP, while Cook/SIPR preroll is located by walking actual packet boundaries
near the target. Audio INDX offsets alone are not trusted as packet boundaries.
Missing indexes, targets beyond index coverage, or an initial distant seek in an
audio-only file may still require a sequential scan from a trusted position.
HTTP seek tests require Range support; nonseekable inputs only play sequentially.

For transcoding, run `npm run build-avtranscoder`, start the same server, and open
`/transcode.html?duration=5000` (URL input) or append `&file=1` (File input). It
produces H.264/AAC MP4 using WASM codecs, exposes `window.report`, and offers the
result as a download. Verify the downloaded output with ffprobe/ffmpeg and browser
playback. `LIBMEDIA_TEST_CONTROL` can point to that output for the existing
`?source=control&scenario=startup` check.

The RM reader supports RV10–RV40 with Cook, SIPR, AAC and AC-3. Invalid/truncated
media and unsupported RealAudio codecs are errors. RealVideo B frames preceding
a seek's keyframe are discarded; interleaved audio is read from its preceding
block anchor. Public historical samples sometimes contain corrupt frames or
inaccurate DATA sizes; compare failures against FFmpeg and record the actual
codec/sample combinations tested instead of treating all such files as valid.

## Manual dev page and forwarded ports

Run `npm run build-avplayer-watch` and `npm run server` in separate terminals.
The manual page uses the default player bundle, not the single-file bundle above.
Put your own sample at `test/material/sample.rmvb`, then open
`/test/avplayer?url=%2Ftest%2Fmaterial%2Fsample.rmvb` on the dev server and click
**Load**. The relative query value resolves against the page origin, so it follows
port forwarding instead of retaining a hard-coded `127.0.0.1` media port.
Use the URL input to test HTTP Range; choosing a local file tests File input.
For a custom dev-server port, run `npm exec -- serve -l tcp://127.0.0.1:8001 --cors --config ./test/serve.json`.
