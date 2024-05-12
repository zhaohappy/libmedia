[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpcmbuffer](../README.md) / AVPCMBufferRef

# Class: AVPCMBufferRef

## Extends

- [`AVPCMBuffer`](AVPCMBuffer.md)

## Constructors

### new AVPCMBufferRef()

> **new AVPCMBufferRef**(): [`AVPCMBufferRef`](AVPCMBufferRef.md)

#### Returns

[`AVPCMBufferRef`](AVPCMBufferRef.md)

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`constructor`](AVPCMBuffer.md#constructors)

## Properties

### channels

> **channels**: `int32`

声道数

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`channels`](AVPCMBuffer.md#channels)

#### Source

[avutil/struct/avpcmbuffer.ts:44](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L44)

***

### data

> **data**: `pointer`\<`pointer`\<`uint8`\>\>

pcm 数据
可同时存放多个 channel 数据

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`data`](AVPCMBuffer.md#data)

#### Source

[avutil/struct/avpcmbuffer.ts:32](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L32)

***

### duration

> **duration**: `double`

时长

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`duration`](AVPCMBuffer.md#duration)

#### Source

[avutil/struct/avpcmbuffer.ts:56](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L56)

***

### maxnbSamples

> **maxnbSamples**: `int32`

当前 data 每个 channel 能存放的最大采样点数

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`maxnbSamples`](AVPCMBuffer.md#maxnbsamples)

#### Source

[avutil/struct/avpcmbuffer.ts:40](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L40)

***

### nbSamples

> **nbSamples**: `int32`

当前存放了多少个采样点

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`nbSamples`](AVPCMBuffer.md#nbsamples)

#### Source

[avutil/struct/avpcmbuffer.ts:36](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L36)

***

### refCount

> **refCount**: `atomic_int32`

#### Source

[avutil/struct/avpcmbuffer.ts:61](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L61)

***

### sampleRate

> **sampleRate**: `int32`

采样率

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`sampleRate`](AVPCMBuffer.md#samplerate)

#### Source

[avutil/struct/avpcmbuffer.ts:48](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L48)

***

### timestamp

> **timestamp**: `int64`

pts

#### Inherited from

[`AVPCMBuffer`](AVPCMBuffer.md).[`timestamp`](AVPCMBuffer.md#timestamp)

#### Source

[avutil/struct/avpcmbuffer.ts:52](https://github.com/zhaohappy/libmedia/blob/acbbf6bd75e6ee4c968b9f441fe28c40f42f350d/src/avutil/struct/avpcmbuffer.ts#L52)
