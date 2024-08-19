[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/util/avbuffer](../README.md) / avbufferCreate

# Function: avbufferCreate()

> **avbufferCreate**(`data`, `size`, `free`, `opaque`, `flags`): `pointer`\<[`AVBufferRef`](../../../struct/avbuffer/classes/AVBufferRef.md)\>

## Parameters

• **data**: `pointer`\<`uint8`\>

• **size**: `int32`

• **free**: `pointer`\<(`opaque`, `data`) => `void`\>= `nullptr`

• **opaque**: `pointer`\<`void`\>= `nullptr`

• **flags**: `int32`= `0`

## Returns

`pointer`\<[`AVBufferRef`](../../../struct/avbuffer/classes/AVBufferRef.md)\>

## Source

[avutil/util/avbuffer.ts:68](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/util/avbuffer.ts#L68)
