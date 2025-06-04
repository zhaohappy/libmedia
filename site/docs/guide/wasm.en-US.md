---
nav:
  title: Guide
  order: 2
group:
  title: Start
order: 7
---

# Codecs

## Introduction


Codecs are compiled into individual WebAssembly modules, with decoders located in the dist/decode directory and encoders in the dist/encode directory. Each codec is provided in four versions: baseline, atomic, simd, and 64.

The baseline version corresponds to the MVP (Minimum Viable Product) feature set of WebAssembly, with the requirement for mutable globals support. It offers the widest compatibility across environments but comes with the lowest performance.

The atomic version adds support for atomic operations and the bulk memory instruction set, enabling better multithreading capabilities.

The simd version introduces SIMD vector instruction support, offering the highest performance among the available builds. Currently, SIMD optimization is handled automatically by the compiler, and the performance gains vary depending on the codec. As of now, there are no known codec implementations that have been manually optimized for WebAssembly SIMD, so further performance improvements may require custom tuning.

The 64 version uses the 64-bit WebAssembly instruction set (wasm64) and includes support for both atomic operations and SIMD. This version requires a runtime environment with wasm64 support, and libmedia must also be compiled in 64-bit mode. The other three versions are based on the standard 32-bit WebAssembly (wasm32) architecture.


## Compatibility support status of three versions and Webcodecs

| environment    | baseline     | atomic     | simd         | 64          | webcodecs            |
| -----------    | -----------  |----------- | -----------  | ----------- | -----------          |
| Chrome         | 74+          | 75+        | 91+          | 133+        |94+                   |
| Firefox        | 61+          | 79+        | 89+          | N/A         |130+                  |
| Safari         | 13.4+        | 15+        | 16.4+        | N/A         |16.4+(video only)     |
| Wasmtime       | 0.20+        | 15+        | 15+          | N/A         |N/A                   |
| Wasmer         | 0.7+         | N/A        | N/A          | N/A         |N/A                   |
| Node.js        | 12.0+        | 16.4+      | 16.4+        | N/A         |N/A                   |
| Deno           | 0.1+         | 1.9+       | 1.9+         | N/A         |N/A                   |
| wasm2c         | 1.0.1+       | N/A        | N/A          | N/A         |N/A                   |


## Decode Codecs

| codec       | baseline   | atomic     | simd        | 64            |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------   | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| hevc        | ✅         | ✅          | ✅          | ✅            | ✅ (hardware only) |
| vvc         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| av1         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mpeg1       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| mpeg2       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| mpeg4       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| theora      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| opus        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| flac        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| speex       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| dts         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ✅            | ❌                 |

## Encode Codecs

| codec       | baseline   | atomic     | simd        | 64            |  webcodecs(Chrome) |
| ----------- | -----------|----------- | ----------- | -----------   | -----------        |
| h264        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| hevc        | ❌         | ✅          | ✅          | ✅            | ❌                 |
| vvc         | ❌         | ❌          | ❌          | ❌            | ❌                 |
| av1         | ❌         | ✅          | ✅          | ✅            | ✅                 |
| vp8         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| vp9         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mpeg4       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| theora      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| aac         | ✅         | ✅          | ✅          | ✅            | ✅                 |
| mp3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| opus        | ✅         | ✅          | ✅          | ✅            | ✅                 |
| flac        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| speex       | ✅         | ✅          | ✅          | ✅            | ❌                 |
| vorbis      | ✅         | ✅          | ✅          | ✅            | ❌                 |
| ac3         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| eac3        | ✅         | ✅          | ✅          | ✅            | ❌                 |
| dts         | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 A-law | ✅         | ✅          | ✅          | ✅            | ❌                 |
| G.711 μ-law | ✅         | ✅          | ✅          | ✅            | ❌                 |

> X265 wasm encoder is special and cannot run in a non-multi-threaded environment

## Usage

The decoder modules are located in the project's dist/decode directory, and the encoder modules can be found in dist/encode. Since the WebAssembly modules are not published as an npm package, it is recommended to host the .wasm files on your own CDN for production use. Alternatively, you can use a public CDN to access the files directly from GitHub. For example, the following demonstrates how to do so using cdn.jsdelivr.net:

```javascript
let codecName = 'h264'
let wasmVersion = '-simd'
let libmediaVersion = '0.1.2'

const decoderH264 = `https://cdn.jsdelivr.net/gh/zhaohappy/libmedia@${libmediaVersion}/dist/decode/${codecName}${wasmVersion}.wasm`

```

**libmediaVersion uses the version of the package under libmedia that you depend on. It is not recommended to use the latest version, which may cause problems in the original project due to subsequent upgrades of wasm files**