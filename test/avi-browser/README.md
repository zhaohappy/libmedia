# AVI / ASF browser diagnostics

Use this loopback harness to check HTTP Range playback and seeking in AVPlayer
with local AVI or ASF/WMV/WMA files. Checks follow the audio and video streams
present in the input. For the end and rate checks, use a file long enough to
leave several seconds of playback after each seek.

## Setup

Build the non-UI AVPlayer ESM bundle from the repository root after installing the project dependencies.

```sh
npm run build:avplayer:single
```

Set `LIBMEDIA_TEST_MEDIA` to a local media file. Store local inputs and captured reports outside the checkout or under the Git-ignored `test/material/` directory.

```sh
LIBMEDIA_TEST_MEDIA=test/material/sample.avi npm run test:avi:browser
```

The server binds to `127.0.0.1:18774`. It serves the diagnostic page, bundle, WebAssembly files, and the media paths configured for this run.

| Environment variable | Effect |
| --- | --- |
| `LIBMEDIA_TEST_MEDIA` | Required local AVI or ASF/WMV/WMA path. Use the matching `source` query below. |
| `LIBMEDIA_TEST_CONTROL` | Optional local H.264/AAC MP4 path for the control check. |
| `LIBMEDIA_TEST_BUNDLE` | Overrides the ESM bundle at `dist/avplayer-single/avplayer.js`. |
| `LIBMEDIA_TEST_WASM_DIR` | Overrides the checked-in WebAssembly files with a flat local directory. |
| `LIBMEDIA_TEST_WMV_VARIANT` | Optional `baseline`, `atomic`, `simd`, or `64` WMV decoder override; see ASF / WMV diagnostics below. |
| `LIBMEDIA_TEST_PORT` | Overrides port 18774. Use 0 to select a free port and read it from the startup message. |
| `LIBMEDIA_TEST_MODE` | `shared` sends COOP and COEP headers, which allow SharedArrayBuffer in supporting browsers. `ordinary` omits those headers. |
| `LIBMEDIA_TEST_THROTTLE` | Set to `1` for 80 ms latency per media GET and an aggregate rate of 1 MiB/s across media responses. |
| `LIBMEDIA_TEST_FAIL_IDX1` | Set to `1` for the fallback case. The server walks the RIFF headers to find the top-level `idx1` and responds with HTTP 503 to the first background Range probe after the 64 KiB entry prefix. |

## Original manual test page

Use the existing `/test/avplayer` page for manual playback and track-switch tests:

```sh
npm run build-avplayer
npm run server
# Open http://localhost:8000/test/avplayer
```

Choose a local file or enter a media URL, then click **Load**. For a fixture saved
as `test/material/sample.asf`, use
`http://localhost:8000/test/material/sample.asf`. Test seeks in both directions,
pause/seek/resume, and replay after EOF. For track switching, use a fixture with
two visibly different video tracks and switch using the existing video selector.
No separate sample HTML page is needed.

This page uses `dist/avplayer/avplayer.js` and its dynamic chunks. Rebuilding only
the single-file ESM bundle does not update it. After rebuilding, hard-refresh
the page to load the new bundle and Workers. Keep media and captures in ignored
`test/material/`; Playwright CLI output under `.playwright-cli/` is also ignored.

## Browser runs

Open the page in Chromium using a fresh tab or navigation for each run. If autoplay blocks the audio context, add `manual=1` and click **Run diagnostic**, or launch a dedicated Chromium instance with `--autoplay-policy=no-user-gesture-required`.

| Query | Check |
| --- | --- |
| `?scenario=startup` | Load, play, and observe advancing audio and video clocks. |
| `?scenario=tracks` | Switch between two video tracks while playing and paused; verify resumed frames, clock progress, and no decode errors. Requires a file with two video streams. Add `hardware=0` to disable hardware decoding, or `webcodecs=0` to force Wasm. |
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

Seek checks validate the immediate landing time separately from subsequent clock
progress, accounting for elapsed playback in the observation window. For inputs
that start with undecodable non-key video frames, choose `replayTarget` after the
first video keyframe.

The report includes event and timing data, stream durations, audio and video timestamps and counters, and snapshots of HTTP Range metrics. `network.startup` captures requests made through initial playback, `network.firstSeek` captures requests through the first seek resolution, and `network.final` records a bounded check for quiet media requests after cleanup. Destroy and cancellation cases also check the destroyed state and requests or bytes added after destroy. Cancellation waits for an actual in-flight media request and rejects unexpected JavaScript errors. `loadMs` and `playMs` include bundle fetch, import, and player initialization. `seekMs` measures resolution of `seek()`; subsequent clock checks independently confirm playback resumes. Compare the startup and first-seek snapshots when measuring bytes fetched or seek latency. The per-request `bytes` field counts data handed to the HTTP response. Check `isolated` to verify the browser mode.

Read `window.report` in the browser console or use your automation runner to wait for completion. The result is JSON-serializable and is also printed on the page.

```js
await page.waitForFunction(() => window.report?.done, null, { timeout: 120_000 })
const report = await page.evaluate(() => window.report)
if (!report.ok) {
  throw new Error(JSON.stringify(report))
}
```


## ASF / WMV diagnostics

The same harness accepts ASF/WMV/WMA. Set `LIBMEDIA_TEST_MEDIA` to the input file
and use `source=wmv`, `source=asf`, or `source=wma`. Checks follow the audio/video
streams present in the input, including video-only VC-1 and audio-only WMA.
Add `transport=file` to exercise `FileIOLoader` using a browser `File` containing
the fixture; the default exercises HTTP Range. Use `manual=1` and the Run button
when autoplay requires a user gesture. All startup, matrix, paused-seek, edges,
destroy and cancellation scenarios remain available (cancellation uses HTTP).

`LIBMEDIA_TEST_WMV_VARIANT=baseline|atomic|simd|64` overrides only the WMV decoder
asset for verification. The `64` case requires a separately built `WASM_64` bundle
via `LIBMEDIA_TEST_BUNDLE`. Omit the variable to test automatic module selection.

```sh
LIBMEDIA_TEST_MEDIA=test/material/asf/wmv2.wmv npm run test:avi:browser
# Open /?source=wmv&scenario=matrix&manual=1
# Open /?source=wmv&scenario=edges&transport=file&manual=1
FFPROBE=/path/to/ffprobe node test/avi-browser/compare-asf.mjs test/material/asf/*.wmv
```

Generate WMV1/2 + WMA fixtures with FFmpeg's `testsrc2` and `sine` sources. WMV3 and
VC-1 require existing samples, for example the public FFmpeg sample archive.
Keep downloaded media and browser reports in ignored `test/material/` or outside
the repository. The comparison checks every packet's stream, bytes and timestamp;
browser scenarios additionally verify actual decoding, clocks, seeking and cleanup.
