# H.264 SIMD IDCT8 regression fixture

`sample.h264` is a synthetic 128×128, four-frame, High Profile YUV420P stream.
It contains intra 8×8 transforms (9.4% according to x264's encoder statistics),
which exercise `ff_h264_idct8_add_8_websimd128`. Each access unit starts with an AUD.
No external media is used.

Generated with FFmpeg 7.0.2 and its bundled libx264:

```sh
ffmpeg -hide_banner -y -f lavfi -i 'testsrc2=size=128x128:rate=4' \
  -frames:v 4 -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p \
  -8x8dct 1 -partitions i8x8 -x264-params 'keyint=1:aud=1:threads=1' \
  -f h264 sample.h264
ffmpeg -v error -i sample.h264 -pix_fmt yuv420p -fps_mode passthrough \
  -f hash -hash sha256 -
```

The reference SHA-256 over all four decoded YUV frames (without stride padding) is
`70a7f2f6c90091441bfa40f340fa0abd4c240cf6ce4dd170447d81a35df5341c`.
Both unpatched shipped SIMD and wasm64 decoders instead produce
`0367bb77b84825ef645c5e791c08a4872c47055f2c42d1e85f73518781e22f34`.

Run `npm run test:regression -- h264-simd.mjs`. The test instantiates the actual
`dist/decode` artifacts, without a compiler or native FFmpeg dependency. Its small
single-thread runtime uses the struct layouts in `lib/ffmpeg/include` and retains
allocations only for this bounded fixture. Node 26 supports both variants;
older engines without memory64 support explicitly skip the wasm64 case.
