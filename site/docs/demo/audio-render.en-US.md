---
nav: Demo
order: 5
group:
  order: 0
---

# Audio Render

## Wasm Decode Render

Click ```Start``` to start playing audio, and click ```Stop``` to end playing. You can select a local file before clicking ```Start```. If no file is selected, the test file will be used.

The code will load the decoder, which is hosted on github. Please be patient.

<code src="./audio-render-avframe.tsx"></code>

## WebCodecs Decode Render

Click ```Start``` to start playing the audio, and click ```Stop``` to end it. You can select a local file before clicking ```Start```. If no file is selected, a test file will be used.

<code src="./audio-render-audiodata.tsx"></code>