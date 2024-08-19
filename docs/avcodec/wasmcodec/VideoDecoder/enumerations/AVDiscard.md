[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avcodec/wasmcodec/VideoDecoder](../README.md) / AVDiscard

# Enumeration: AVDiscard

We leave some space between them for extensions (drop some
keyframes for intra-only or drop just some bidir frames).

## Enumeration Members

### AVDISCARD\_ALL

> **AVDISCARD\_ALL**: `48`

discard all

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:80](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L80)

***

### AVDISCARD\_BIDIR

> **AVDISCARD\_BIDIR**: `16`

discard all bidirectional frames

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:68](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L68)

***

### AVDISCARD\_DEFAULT

> **AVDISCARD\_DEFAULT**: `0`

discard useless packets like 0 size packets in avi

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:60](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L60)

***

### AVDISCARD\_NONE

> **AVDISCARD\_NONE**: `-16`

discard nothing

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:56](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L56)

***

### AVDISCARD\_NONINTRA

> **AVDISCARD\_NONINTRA**: `24`

discard all non intra frames

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:72](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L72)

***

### AVDISCARD\_NONKEY

> **AVDISCARD\_NONKEY**: `32`

discard all frames except keyframes

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:76](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L76)

***

### AVDISCARD\_NONREF

> **AVDISCARD\_NONREF**: `8`

discard all non reference

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:64](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avcodec/wasmcodec/VideoDecoder.ts#L64)
