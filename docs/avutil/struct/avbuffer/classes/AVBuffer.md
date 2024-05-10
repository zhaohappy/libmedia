[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avbuffer](../README.md) / AVBuffer

# Class: AVBuffer

## Constructors

### new AVBuffer()

> **new AVBuffer**(): [`AVBuffer`](AVBuffer.md)

#### Returns

[`AVBuffer`](AVBuffer.md)

## Properties

### data

> **data**: `pointer`\<`uint8`\> = `nullptr`

data described by this buffer

#### Source

[avutil/struct/avbuffer.ts:39](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L39)

***

### flags

> **flags**: [`AVBufferFlags`](../enumerations/AVBufferFlags.md) = `AVBufferFlags.NONE`

A combination of AV_BUFFER_FLAG_*

#### Source

[avutil/struct/avbuffer.ts:64](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L64)

***

### flagsInternal

> **flagsInternal**: `int32` = `0`

A combination of BUFFER_FLAG_*

#### Source

[avutil/struct/avbuffer.ts:69](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L69)

***

### free

> **free**: `pointer`\<(`opaque`, `data`) => `void`\> = `nullptr`

a callback for freeing the data

#### Source

[avutil/struct/avbuffer.ts:54](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L54)

***

### opaque

> **opaque**: `pointer`\<`void`\> = `nullptr`

an opaque pointer, to be used by the freeing callback

#### Source

[avutil/struct/avbuffer.ts:59](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L59)

***

### refcount

> **refcount**: `atomic_uint32` = `0`

number of existing AVBufferRef instances referring to this buffer

#### Source

[avutil/struct/avbuffer.ts:49](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L49)

***

### size

> **size**: `int32` = `0`

size of data in bytes

#### Source

[avutil/struct/avbuffer.ts:44](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/struct/avbuffer.ts#L44)
