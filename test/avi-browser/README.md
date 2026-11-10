# AVI / ASF / RM / ISO browser diagnostics

Use this loopback harness to check HTTP Range playback and seeking in AVPlayer
with local AVI, ASF/WMV/WMA, RM/RMVB or ISO files. Checks follow the audio and video streams
present in the input. For the end and rate checks, use a file long enough to
leave several seconds of playback after each seek.
See [Optical-disc fixtures](#optical-disc-fixtures) for ISO setup and scenarios.

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
| `LIBMEDIA_TEST_MEDIA` | Required local AVI, ASF/WMV/WMA, RM/RMVB or ISO path. Use the matching `source` query below; for ISO use `ext=iso`. |
| `LIBMEDIA_TEST_CONTROL` | Optional local H.264/AAC MP4 path for the control check. |
| `LIBMEDIA_TEST_BUNDLE` | Overrides the ESM bundle at `dist/avplayer-single/avplayer.js`. |
| `LIBMEDIA_TEST_WASM_DIR` | Overrides the checked-in WebAssembly files with a flat local directory. |
| `LIBMEDIA_TEST_WMV_VARIANT` | Optional `baseline`, `atomic`, `simd`, or `64` WMV decoder override; see ASF / WMV diagnostics below. |
| `LIBMEDIA_TEST_PORT` | Overrides port 18774. Use 0 to select a free port and read it from the startup message. |
| `LIBMEDIA_TEST_MODE` | `shared` sends COOP and COEP headers, which allow SharedArrayBuffer in supporting browsers. `ordinary` omits those headers. |
| `LIBMEDIA_TEST_THROTTLE` | Set to `1` for 80 ms latency per media GET and an aggregate rate of 1 MiB/s across media responses. |
| `LIBMEDIA_TEST_IGNORE_RANGE` | Set to `1` to ignore media Range headers and return the full body with HTTP 200. For AVI, cold and rapid seeks must still reach the requested position; this fallback transfers the prefix again. ISO must reject the missing Range support. |
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
| `?scenario=rates&source=control&mse=1` | Require MSE and verify starting at 15×, the 0.3–15× rate bounds, 15→2→4→8→15→1→0.3→1× playback, rendered video frames, paused seeking at 15×, and natural completion. |
| `?scenario=rates&source=control&mse=0&decoder=wasm` | Run the same checks with MSE and WebCodecs disabled, including advancing audio/video clocks and their final difference. Omit `decoder=wasm` to exercise the default non-MSE decoder. |

The `rates` scenario requires an H.264/AAC MP4 of at least 180 seconds in
`LIBMEDIA_TEST_CONTROL`. Use a modest resolution (for example 640×360 at 30 fps
with one-second GOPs) to establish functional support before testing heavier
inputs. It measures media-time progress against wall time, allows 25% timing
variation, and verifies actual rendered video frames (native playback-quality
counters for MSE). It does not establish audio fidelity at 15× or guarantee that
every device can decode every input at that speed. Avoid running builds during
measurements. `mse=1`/`mse=0` require the selected route rather than silently
accepting fallback. Use `manual=1` and the Run button for audio autoplay policy.
The seek check allows up to five seconds to advance 15 seconds of media after
resuming, then measures the steady playback rate independently.

The default seek targets are derived from the media duration. Set `target` for cold, fallback, and cancellation seeks. Set comma-separated `targets` for the matrix. For edge cases, override `pausedTarget`, `backTarget`, `replayTarget`, or `rateTarget`. Targets use integer milliseconds. `cancelAfter` is the delay before destroying during load or seek, in milliseconds. Enable throttling when testing cancellation so the operation is still pending.

Seek checks validate the immediate landing time separately from subsequent clock
progress, accounting for elapsed playback in the observation window. For inputs
that start with undecodable non-key video frames, choose `replayTarget` after the
first video keyframe.

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

Use `decoder=wasm` to disable WebCodecs and hardware decoding, or `decoder=default` for the normal path. Use `input=file` to load a File after fetching the sample; Range metrics then describe the fixture download, not player I/O. The default is `input=http`. `transport=file` remains an alias; an explicit `input` takes precedence. With `decoder=default`, `hardware=0` and `webcodecs=0` retain their existing effect. Run both worker modes and both decoder settings. Clock and frame counters alone do not prove audible output; capture PCM separately when validating audio fidelity.

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

## Interpreting results

- `full` checks natural completion and advancing render counters. It does not compare PCM, verify every rendered frame, or prove continuous audio/video synchronization. Ordinary Worker statistics can lag; use separate output captures when those measurements are required.
- The background-index fault requires an eligible AVI index larger than the 64 KiB prefix and an actual suffix request. For a smaller index, mark that fault case not applicable. A fault that never fires is not a passing recovery test. Faults on ordinary media requests require separate injection; `LIBMEDIA_TEST_FAIL_IDX1` only targets the index probe.
- `LIBMEDIA_TEST_IGNORE_RANGE=1` checks the HTTP 200 fallback for AVI; ISO should fail instead of downloading the full image. Check actual response statuses in the network metrics. For AVI, seeking can retransfer the file prefix, so this does not demonstrate efficient random access.
- Under throttling, compare media bitrate at the selected playback rate with the 1 MiB/s budget. A 2× rate can exhaust that budget even when 1× playback succeeds. Recheck rate failures without throttling before attributing them to the player.
- Report the browser, decoder and worker mode, input type, and server configuration. Local server results do not establish behavior on other browsers or CDNs.

## Optical-disc fixtures

The same harness supports ISO playback with `ext=iso`. Generate original test media outside tracked source using FFmpeg, dvdauthor and genisoimage:

```sh
npx tsx test/avi-browser/create-disc-fixtures.ts /tmp/libmedia-disc-fixtures
LIBMEDIA_TEST_MEDIA=/tmp/libmedia-disc-fixtures/dvd.iso npm run test:avi:browser
```

The generator accepts `FFMPEG`, `DVDAUTHOR` and `GENISOIMAGE` executable overrides. It creates a 12-second UDF DVD with three chapters, an ISO9660 variant split across VOB files, and an 8-second two-clip Blu-ray fixture. It also creates `bluray-stc.iso`, placing two clock sequences with reset timestamps in one M2TS and selecting each through its MPLS STC ID. The Blu-ray fixtures wrap real H.264/AC-3 transport streams in minimal synthetic MPLS/CLPI navigation; it is an integration fixture, not a full Blu-ray authoring tool.

Use `?manual=1&ext=iso&preload=0&scenario=matrix&targets=5000,1000,6500` for the DVD and `targets=4500,1000,5500` for Blu-ray. `input=file` exercises `File` loading, `title=00001` selects the shorter title in `bluray.iso` (`bluray-stc.iso` has only `00000`), and `worker=0` disables Worker dispatch. Run shared and ordinary server modes separately; use ordinary mode plus `worker=0` for main-thread coverage. Reports include disc title metadata and chapter positions. The File setup downloads the fixture before constructing a File; exclude that setup request when assessing player range reads. The internal media URL remains `/media.avi` for both formats; `ext=iso` selects ISO probing. The `fallback` scenario and `LIBMEDIA_TEST_FAIL_IDX1` apply only to AVI.

Also run `startup&settle=6500` across a clip boundary, `paused-seek`, `edges`, `cancel-load`, and `cancel-seek`. Validate advancing audio/video clocks, zero decoding errors, stable duration, correct chapter offsets, no premature end at a clip boundary, and quiet network activity after destruction. Parsing-only synthetic coverage is in `iso.test.ts`; packet timeline and preroll coverage is in `iso-packets.mjs`.

For final-GOP coverage, seek to `durationMs - 200` immediately after startup and check that the remaining video frames render before EOF. Also hold an in-flight ISO Range response while seeking: the old connection must close promptly, the new position must load without waiting for the old response timeout, and no premature ended event may occur.

For navigation-dependent DVDs, verify that a Cell menu call returns through the default button into the expected title chapter. Seek to just before that boundary and let playback cross it, then seek forward, backward, while paused, and from EOF. Check chapter count, duration, advancing audio/video clocks, render counters and decoding errors for both File and HTTP Range inputs. Navigation is compiled once during load, so seeks must not replay opening cells or menus. Interactive menu rendering and arbitrary DVD VM programs remain outside this harness's coverage.
