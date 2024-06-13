[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/util/avbuffer](../README.md) / bufferCreate

# Function: bufferCreate()

> **bufferCreate**(`buf`, `data`, `size`, `free`, `opaque`, `flags`): `pointer`\<[`AVBufferRef`](../../../struct/avbuffer/classes/AVBufferRef.md)\>

## Parameters

• **buf**: `pointer`\<[`AVBuffer`](../../../struct/avbuffer/classes/AVBuffer.md)\>

• **data**: `pointer`\<`uint8`\>

• **size**: `int32`

• **free**: `pointer`\<(`opaque`, `data`) => `void`\>= `nullptr`

• **opaque**: `pointer`\<`void`\>= `nullptr`

• **flags**: `int32`= `0`

## Returns

`pointer`\<[`AVBufferRef`](../../../struct/avbuffer/classes/AVBufferRef.md)\>

## Source

[avutil/util/avbuffer.ts:40](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/util/avbuffer.ts#L40)
