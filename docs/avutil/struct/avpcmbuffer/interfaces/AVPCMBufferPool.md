[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpcmbuffer](../README.md) / AVPCMBufferPool

# Interface: AVPCMBufferPool

## Properties

### alloc()

> **alloc**: () => `pointer`\<[`AVPCMBufferRef`](../classes/AVPCMBufferRef.md)\>

#### Returns

`pointer`\<[`AVPCMBufferRef`](../classes/AVPCMBufferRef.md)\>

#### Source

[avutil/struct/avpcmbuffer.ts:65](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpcmbuffer.ts#L65)

***

### release()

> **release**: (`buffer`) => `void`

#### Parameters

• **buffer**: `pointer`\<[`AVPCMBufferRef`](../classes/AVPCMBufferRef.md)\>

#### Returns

`void`

#### Source

[avutil/struct/avpcmbuffer.ts:66](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpcmbuffer.ts#L66)
