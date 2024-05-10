[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpcmbuffer](../README.md) / AVPCMBuffer

# Class: AVPCMBuffer

## Extended by

- [`AVPCMBufferRef`](AVPCMBufferRef.md)

## Constructors

### new AVPCMBuffer()

> **new AVPCMBuffer**(): [`AVPCMBuffer`](AVPCMBuffer.md)

#### Returns

[`AVPCMBuffer`](AVPCMBuffer.md)

## Properties

### channels

> **channels**: `int32`

声道数

#### Source

[avutil/struct/avpcmbuffer.ts:44](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L44)

***

### data

> **data**: `pointer`\<`pointer`\<`uint8`\>\>

pcm 数据
可同时存放多个 channel 数据

#### Source

[avutil/struct/avpcmbuffer.ts:32](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L32)

***

### duration

> **duration**: `double`

时长

#### Source

[avutil/struct/avpcmbuffer.ts:56](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L56)

***

### maxnbSamples

> **maxnbSamples**: `int32`

当前 data 每个 channel 能存放的最大采样点数

#### Source

[avutil/struct/avpcmbuffer.ts:40](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L40)

***

### nbSamples

> **nbSamples**: `int32`

当前存放了多少个采样点

#### Source

[avutil/struct/avpcmbuffer.ts:36](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L36)

***

### sampleRate

> **sampleRate**: `int32`

采样率

#### Source

[avutil/struct/avpcmbuffer.ts:48](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L48)

***

### timestamp

> **timestamp**: `int64`

pts

#### Source

[avutil/struct/avpcmbuffer.ts:52](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avpcmbuffer.ts#L52)
