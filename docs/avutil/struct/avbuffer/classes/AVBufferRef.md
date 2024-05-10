[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avbuffer](../README.md) / AVBufferRef

# Class: AVBufferRef

## Constructors

### new AVBufferRef()

> **new AVBufferRef**(): [`AVBufferRef`](AVBufferRef.md)

#### Returns

[`AVBufferRef`](AVBufferRef.md)

## Properties

### buffer

> **buffer**: `pointer`\<[`AVBuffer`](AVBuffer.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:78](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L78)

***

### data

> **data**: `pointer`\<`uint8`\> = `nullptr`

The data buffer. It is considered writable if and only if
this is the only reference to the buffer, in which case
av_buffer_is_writable() returns 1.

#### Source

[avutil/struct/avbuffer.ts:85](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L85)

***

### size

> **size**: `int32` = `0`

Size of data in bytes.

#### Source

[avutil/struct/avbuffer.ts:90](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L90)
