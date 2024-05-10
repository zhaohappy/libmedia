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

[avutil/util/avbuffer.ts:40](https://github.com/zhaohappy/libmedia/blob/b4bb608d2b1c00d036d73fc8d222b1a97be53694/src/avutil/util/avbuffer.ts#L40)
