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

[avutil/struct/avpacket.ts:172](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avpacket.ts#L172)

***

### release()

> **release**: (`avpacket`) => `void`

#### Parameters

• **avpacket**: `pointer`\<[`AVPacketRef`](../classes/AVPacketRef.md)\>

#### Returns

`void`

#### Source

[avutil/struct/avpacket.ts:173](https://github.com/zhaohappy/libmedia/blob/87bf8029d8be58d5035a3f4dc7037c25d1ac371b/src/avutil/struct/avpacket.ts#L173)
