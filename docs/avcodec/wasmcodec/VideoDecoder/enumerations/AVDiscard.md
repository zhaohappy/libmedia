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

[avcodec/wasmcodec/VideoDecoder.ts:73](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L73)

***

### AVDISCARD\_BIDIR

> **AVDISCARD\_BIDIR**: `16`

discard all bidirectional frames

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:61](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L61)

***

### AVDISCARD\_DEFAULT

> **AVDISCARD\_DEFAULT**: `0`

discard useless packets like 0 size packets in avi

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:53](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L53)

***

### AVDISCARD\_NONE

> **AVDISCARD\_NONE**: `-16`

discard nothing

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:49](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L49)

***

### AVDISCARD\_NONINTRA

> **AVDISCARD\_NONINTRA**: `24`

discard all non intra frames

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:65](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L65)

***

### AVDISCARD\_NONKEY

> **AVDISCARD\_NONKEY**: `32`

discard all frames except keyframes

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:69](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L69)

***

### AVDISCARD\_NONREF

> **AVDISCARD\_NONREF**: `8`

discard all non reference

#### Source

[avcodec/wasmcodec/VideoDecoder.ts:57](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avcodec/wasmcodec/VideoDecoder.ts#L57)
