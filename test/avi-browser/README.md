# AVI browser diagnostics

Use this loopback harness to check HTTP Range playback and seeking in AVPlayer with a local AVI. The seek checks expect an interleaved AVI with audio and video. For the end and rate checks, use a file long enough to leave several seconds of playback after each seek.

## Setup

Build the non-UI AVPlayer ESM bundle from the repository root after installing the project dependencies.

```sh
npm run build:avplayer:single
```

Set `LIBMEDIA_TEST_MEDIA` to a local AVI. Store local inputs and captured reports outside the checkout or under the Git-ignored `test/material/` directory.

```sh
LIBMEDIA_TEST_MEDIA=test/material/sample.avi npm run test:avi:browser
```

The server binds to `127.0.0.1:18774`. It serves the diagnostic page, bundle, WebAssembly files, and the media paths configured for this run.

| Environment variable | Effect |
| --- | --- |
| `LIBMEDIA_TEST_MEDIA` | Required local AVI path. |
| `LIBMEDIA_TEST_CONTROL` | Optional local H.264/AAC MP4 path for the control check. |
| `LIBMEDIA_TEST_BUNDLE` | Overrides the ESM bundle at `dist/avplayer-single/avplayer.js`. |
| `LIBMEDIA_TEST_WASM_DIR` | Overrides the checked-in WebAssembly files with a flat local directory. |
| `LIBMEDIA_TEST_PORT` | Overrides port 18774. Use 0 to select a free port and read it from the startup message. |
| `LIBMEDIA_TEST_MODE` | `shared` sends COOP and COEP headers, which allow SharedArrayBuffer in supporting browsers. `ordinary` omits those headers. |
| `LIBMEDIA_TEST_THROTTLE` | Set to `1` for 80 ms latency per media GET and an aggregate rate of 1 MiB/s across media responses. |
| `LIBMEDIA_TEST_IGNORE_RANGE` | Set to `1` to ignore media Range headers and return the full body with HTTP 200. Cold and rapid seeks must still reach the requested position; this fallback transfers the prefix again. |
| `LIBMEDIA_TEST_FAIL_IDX1` | Set to `1` for the fallback case. The server walks the RIFF headers to find the top-level `idx1` and responds with HTTP 503 to the first background Range probe after the 64 KiB entry prefix. |

## Browser runs

Open the page in Chromium using a fresh tab or navigation for each run. If autoplay blocks the audio context, add `manual=1` and click **Run diagnostic**, or launch a dedicated Chromium instance with `--autoplay-policy=no-user-gesture-required`.

| Query | Check |
| --- | --- |
| `?scenario=startup` | Load, play, and observe advancing audio and video clocks. |
| `?scenario=full` | Play through the natural end and verify audio/video render counters advance. |
| `?scenario=rapid` | Issue five overlapping seeks while paused, check the latest target within 500 ms, then resume. |
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

Read `window.report` in the browser console or use your automation runner to wait for completion. The result is JSON-serializable and is also printed on the page.

```js
await page.waitForFunction(() => window.report?.done, null, { timeout: 120_000 })
const report = await page.evaluate(() => window.report)
if (!report.ok) {
  throw new Error(JSON.stringify(report))
}
```

Use `decoder=wasm` to disable WebCodecs and hardware decoding, or `decoder=default` for the normal path. Use `input=file` to load a File after fetching the sample; Range metrics then describe the fixture download, not player I/O. The default is `input=http`. Run both worker modes and both decoder settings. Clock and frame counters alone do not prove audible output; capture PCM separately when validating audio fidelity.

## Interpreting results

- `full` checks natural completion and advancing render counters. It does not compare PCM, verify every rendered frame, or prove continuous audio/video synchronization. Ordinary Worker statistics can lag; use separate output captures when those measurements are required.
- The background-index fault requires an eligible AVI index larger than the 64 KiB prefix and an actual suffix request. For a smaller index, mark that fault case not applicable. A fault that never fires is not a passing recovery test. Faults on ordinary media requests require separate injection; `LIBMEDIA_TEST_FAIL_IDX1` only targets the index probe.
- `LIBMEDIA_TEST_IGNORE_RANGE=1` checks the HTTP 200 fallback. Check actual response statuses in the network metrics. Seeking can retransfer the file prefix, so this does not demonstrate efficient random access.
- Under throttling, compare media bitrate at the selected playback rate with the 1 MiB/s budget. A 2× rate can exhaust that budget even when 1× playback succeeds. Recheck rate failures without throttling before attributing them to the player.
- Report the browser, decoder and worker mode, input type, and server configuration. Local server results do not establish behavior on other browsers or CDNs.
