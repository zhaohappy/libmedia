[**libmedia**](../../../../README.md) • **Docs**

***

[libmedia](../../../../README.md) / [avutil/struct/avpacket](../README.md) / AVPacketPool

# Interface: AVPacketPool

## Properties

### alloc()

> **alloc**: () => `pointer`\<[`AVPacketRef`](../classes/AVPacketRef.md)\>

#### Returns

`pointer`\<[`AVPacketRef`](../classes/AVPacketRef.md)\>

#### Source

[avutil/struct/avpacket.ts:172](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L172)

***

### release()

> **release**: (`avpacket`) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacketRef`](../classes/AVPacketRef.md)\>

#### Returns

`void`

#### Source

[avutil/struct/avpacket.ts:173](https://github.com/zhaohappy/libmedia/blob/83708827f1f74f03ced670ca9bc2d9d1e5e5366a/src/avutil/struct/avpacket.ts#L173)
