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

[avutil/struct/avpcmbuffer.ts:69](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avpcmbuffer.ts#L69)

***

### release()

> **release**: (`buffer`) => `void`

#### Parameters

• **buffer**: `pointer`\<[`AVPCMBufferRef`](../classes/AVPCMBufferRef.md)\>

#### Returns

`void`

#### Source

[avutil/struct/avpcmbuffer.ts:70](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avpcmbuffer.ts#L70)
