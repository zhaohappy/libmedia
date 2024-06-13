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

[avutil/struct/avbuffer.ts:78](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avbuffer.ts#L78)

***

### data

> **data**: `pointer`\<`uint8`\> = `nullptr`

The data buffer. It is considered writable if and only if
this is the only reference to the buffer, in which case
av_buffer_is_writable() returns 1.

#### Source

[avutil/struct/avbuffer.ts:85](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avbuffer.ts#L85)

***

### size

> **size**: `int32` = `0`

Size of data in bytes.

#### Source

[avutil/struct/avbuffer.ts:90](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avbuffer.ts#L90)
