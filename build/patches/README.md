# FFmpeg H.264 SIMD correction

`ffmpeg-h264-idct8-simd.patch` fixes the vertical 8×8 inverse transform in
`libavcodec/webassembly/h264dsp_websimd128.c`: `a4 = (l2 >> 1) - l6`, matching
`libavcodec/h264idct_template.c`. The previous addition corrupts decoded pixels
when the 8-bit H.264 SIMD decoder uses an 8×8 transform.

`build-ffmpeg-decoder.sh` applies this patch automatically for H.264 SIMD and
wasm64 builds. Applying it again is harmless; an incompatible source revision
fails before replacing the existing library. Baseline and atomic builds do not
use the manual SIMD implementation.

The checked-in artifacts were rebuilt with Emscripten 3.1.73 and
[zhaohappy/FFmpeg](https://github.com/zhaohappy/FFmpeg), branch `libmedia7.0`,
commit `3a14ab29692763e561610412cdeb1985da4e3cd8`, plus this patch:

```sh
# Optional overrides; by default these are ../FFmpeg and ../emsdk.
export LIBMEDIA_FFMPEG_PATH=/path/to/FFmpeg
export LIBMEDIA_EMSDK_PATH=/path/to/emsdk
bash build/build-ffmpeg-decoder.sh h264 1 1 0
bash build/build-decoder.sh h264 1 1 0
bash build/build-ffmpeg-decoder.sh h264 1 1 1
bash build/build-decoder.sh h264 1 1 1
npm run test:regression -- h264-simd.mjs
```

This updates both `lib/decode/h264-{simd,64}/libavcodec.a` and
`dist/decode/h264-{simd,64}.wasm`. The regression hashes all pixels decoded from a
[synthetic High Profile fixture](../../test/regression/fixtures/h264-idct8/README.md)
and compares them with native FFmpeg output.
