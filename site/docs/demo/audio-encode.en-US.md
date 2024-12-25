---
nav: Demo
order: 8
group:
  order: 0
---

# Audio Encode

## Wasm Encoder 

Click ```Start``` to start encoding, and click ```Stop``` to end encoding. You can select a local file before clicking ```Start```. If no file is selected, a test file will be used.

The code will load the encoder, which is hosted on github. Please wait patiently.

Here we extract the audio of the file and re-encode it using aac

<code src="./audio-encode-wasm.tsx"></code>

## WebCodecs Encoder

Click ```Start``` to start encoding, and click ```Stop``` to end encoding. You can select a local file before clicking ```Start```. If no file is selected, a test file will be used.

Here we extract the audio of the file and re-encode it using aac

<code src="./audio-encode-webcodecs.tsx"></code>