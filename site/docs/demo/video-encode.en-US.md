---
nav: Demo
order: 9
group:
  order: 0
---

# Video Encode

## Wasm Encoder

Click ```Start``` to start encoding, and click ```Stop``` to end encoding. You can select a local file before clicking ```Start```. If no file is selected, the test file will be used.

The code will load the encoder, which is hosted on github. Please wait patiently.

Here we extract the video of the file and re-encode it using h264

<code src="./video-encode-wasm.tsx"></code>

## WebCodecs Encoder

Click ```Start``` to start encoding, and click ```Stop``` to end encoding. You can select a local file before clicking ```Start```. If no file is selected, the test file will be used.

Here we extract the video from the file and re-encode it using h264

<code src="./video-encode-webcodecs.tsx"></code>