[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avbuffer](../README.md) / AVBufferPool

# Class: AVBufferPool

## Constructors

### new AVBufferPool()

> **new AVBufferPool**(): [`AVBufferPool`](AVBufferPool.md)

#### Returns

[`AVBufferPool`](AVBufferPool.md)

## Properties

### alloc

> **alloc**: `pointer`\<(`size`) => [`AVBufferRef`](AVBufferRef.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:113](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L113)

***

### alloc2

> **alloc2**: `pointer`\<(`opaque`, `size`) => [`AVBufferRef`](AVBufferRef.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:114](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L114)

***

### mutex

> **mutex**: `Mutex`

#### Source

[avutil/struct/avbuffer.ts:95](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L95)

***

### opaque

> **opaque**: `pointer`\<`void`\> = `nullptr`

an opaque pointer, to be used by the freeing callback

#### Source

[avutil/struct/avbuffer.ts:112](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L112)

***

### pool

> **pool**: `pointer`\<[`BufferPoolEntry`](BufferPoolEntry.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:97](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L97)

***

### poolFree

> **poolFree**: `pointer`\<(`opaque`) => `void`\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:115](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L115)

***

### refcount

> **refcount**: `atomic_uint32` = `0`

number of existing AVBufferRef instances referring to this buffer

#### Source

[avutil/struct/avbuffer.ts:102](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L102)

***

### size

> **size**: `int32` = `0`

Size of data in bytes.

#### Source

[avutil/struct/avbuffer.ts:107](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L107)
