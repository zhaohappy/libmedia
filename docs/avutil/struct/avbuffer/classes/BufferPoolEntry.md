[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avbuffer](../README.md) / BufferPoolEntry

# Class: BufferPoolEntry

## Constructors

### new BufferPoolEntry()

> **new BufferPoolEntry**(): [`BufferPoolEntry`](BufferPoolEntry.md)

#### Returns

[`BufferPoolEntry`](BufferPoolEntry.md)

## Properties

### buffer

> **buffer**: [`AVBuffer`](AVBuffer.md)

#### Source

[avutil/struct/avbuffer.ts:138](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L138)

***

### data

> **data**: `pointer`\<`uint8`\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:120](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L120)

***

### free

> **free**: `pointer`\<(`opaque`, `data`) => `void`\> = `nullptr`

a callback for freeing the data

#### Source

[avutil/struct/avbuffer.ts:129](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L129)

***

### next

> **next**: `pointer`\<[`BufferPoolEntry`](BufferPoolEntry.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:133](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L133)

***

### opaque

> **opaque**: `pointer`\<`void`\> = `nullptr`

an opaque pointer, to be used by the freeing callback

#### Source

[avutil/struct/avbuffer.ts:124](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L124)

***

### pool

> **pool**: `pointer`\<[`AVBufferPool`](AVBufferPool.md)\> = `nullptr`

#### Source

[avutil/struct/avbuffer.ts:131](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avbuffer.ts#L131)
